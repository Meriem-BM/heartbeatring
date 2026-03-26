// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Test} from "forge-std/Test.sol";
import {Clones} from "openzeppelin-contracts/contracts/proxy/Clones.sol";

import {HeartbeatRing} from "../../src/HeartbeatRing.sol";

contract HeartbeatRingFuzzTest is Test {
    using Clones for address;

    uint256 internal constant STAKE = 1 ether;
    uint256 internal constant EPOCH = 1 days;
    uint256 internal constant GRACE = 10 minutes;
    uint256 internal constant MIN = 3;
    uint256 internal constant BOUNTY_BPS = 100;

    address internal liquidator = makeAddr("liquidator");
    address[] internal actors;

    function setUp() external {
        actors.push(makeAddr("actor_0"));
        actors.push(makeAddr("actor_1"));
        actors.push(makeAddr("actor_2"));
        actors.push(makeAddr("actor_3"));
        actors.push(makeAddr("actor_4"));
        actors.push(makeAddr("actor_5"));

        vm.deal(liquidator, 1_000 ether);
        for (uint256 i = 0; i < actors.length; i++) {
            vm.deal(actors[i], 1_000 ether);
        }
    }

    function testFuzz_initialize_setsValidConfig(
        uint256 stakeSeed,
        uint256 epochSeed,
        uint256 graceSeed,
        uint256 minSeed,
        uint256 maxSeed,
        uint256 bountySeed
    ) external {
        HeartbeatRing ring = _deployUninitializedClone();

        uint256 maxParticipants = bound(maxSeed, 3, ring.MAX_PARTICIPANTS_LIMIT());
        uint256 minParticipants = bound(minSeed, 3, maxParticipants);
        uint256 boundedStake = bound(stakeSeed, 1, type(uint128).max / maxParticipants);
        uint256 epochDuration = bound(epochSeed, 60, 30 days);
        uint256 gracePeriod = bound(graceSeed, ring.MIN_LIQUIDATION_GRACE_PERIOD(), epochDuration - 1);
        uint256 bountyBps = bound(bountySeed, 0, 500);

        ring.initialize(
            boundedStake, epochDuration, gracePeriod, minParticipants, maxParticipants, bountyBps, address(this)
        );

        assertEq(uint256(ring.phase()), uint256(HeartbeatRing.Phase.Registration));
        assertEq(ring.stakeAmount(), boundedStake);
        assertEq(ring.epochDuration(), epochDuration);
        assertEq(ring.liquidationGracePeriod(), gracePeriod);
        assertEq(ring.minParticipants(), minParticipants);
        assertEq(ring.maxParticipants(), maxParticipants);
        assertEq(ring.liquidationBountyBps(), bountyBps);
    }

    function testFuzz_registerAndStartGame_buildsExpectedRing(uint8 participantCountSeed) external {
        uint256 participantCount = bound(uint256(participantCountSeed), 3, actors.length);
        HeartbeatRing ring = _deployRingWithConfig(STAKE, EPOCH, GRACE, MIN, actors.length, BOUNTY_BPS);

        _registerFirstN(ring, participantCount);
        ring.startGame();

        assertEq(ring.ringSize(), participantCount);
        assertEq(ring.totalParticipants(), participantCount);
        assertEq(uint256(ring.phase()), uint256(HeartbeatRing.Phase.Active));

        address[] memory members = ring.getRing();
        assertEq(members.length, participantCount);
        for (uint256 i = 0; i < participantCount; i++) {
            assertEq(members[i], actors[i]);
        }
    }

    function testFuzz_heartbeat_setsEpochBeforeLiquidationWindow(uint64 epochSeed, uint256 secondsBeforeWindowSeed)
        external
    {
        HeartbeatRing ring = _deployRingWithConfig(STAKE, EPOCH, GRACE, MIN, actors.length, BOUNTY_BPS);
        _registerFirstN(ring, MIN);
        ring.startGame();

        uint256 epoch = bound(uint256(epochSeed), 1, 1000);
        uint256 secondsBeforeWindow = bound(secondsBeforeWindowSeed, 1, ring.liquidationGracePeriod());
        uint256 liquidationTime = ring.gameStartTime() + (epoch * ring.epochDuration()) + ring.liquidationGracePeriod();

        vm.warp(liquidationTime - secondsBeforeWindow);
        vm.prank(actors[0]);
        ring.heartbeat();

        (,,, uint64 lastBeat,) = ring.participants(actors[0]);
        assertEq(uint256(lastBeat), epoch);
    }

    function testFuzz_liquidate_distributesStakeAndBounty(uint16 bountySeed, uint8 targetIndexSeed) external {
        uint256 bountyBps = bound(uint256(bountySeed), 0, 500);
        HeartbeatRing ring = _deployRingWithConfig(STAKE, EPOCH, GRACE, MIN, 3, bountyBps);
        _registerFirstN(ring, 3);
        ring.startGame();

        uint256 targetIndex = bound(uint256(targetIndexSeed), 0, 2);
        address target = actors[targetIndex];
        address leftBeneficiary = actors[targetIndex == 0 ? 2 : targetIndex - 1];
        address rightBeneficiary = actors[(targetIndex + 1) % 3];

        vm.warp(ring.gameStartTime() + EPOCH + ring.liquidationGracePeriod());
        vm.prank(liquidator);
        ring.liquidate(target);

        uint256 expectedBounty = (STAKE * bountyBps) / 10_000;
        uint256 leftShare = (STAKE - expectedBounty) / 2;
        uint256 rightShare = (STAKE - expectedBounty) - leftShare;

        assertEq(ring.pendingBounties(liquidator), expectedBounty);
        assertEq(ring.ringSize(), 2);
        assertEq(ring.ringHead(), targetIndex == 0 ? rightBeneficiary : actors[0]);
        assertEq(ring.ringTail(), targetIndex == 2 ? leftBeneficiary : actors[2]);

        {
            (address leftNext,, uint128 leftStake,, bool leftAlive) = ring.participants(leftBeneficiary);
            assertTrue(leftAlive);
            assertEq(leftNext, rightBeneficiary);
            assertEq(uint256(leftStake), STAKE + leftShare);
        }

        {
            (, address rightPrev, uint128 rightStake,, bool rightAlive) = ring.participants(rightBeneficiary);
            assertTrue(rightAlive);
            assertEq(rightPrev, leftBeneficiary);
            assertEq(uint256(rightStake), STAKE + rightShare);
        }

        {
            (,, uint128 targetStake,, bool targetAlive) = ring.participants(target);
            assertFalse(targetAlive);
            assertEq(uint256(targetStake), 0);
        }
    }

    function testFuzz_liquidate_toCompletedAndClaim(
        uint16 bountySeed,
        uint8 firstTargetIndexSeed,
        uint8 secondTargetIndexSeed
    ) external {
        uint256 bountyBps = bound(uint256(bountySeed), 0, 500);
        HeartbeatRing ring = _deployRingWithConfig(STAKE, EPOCH, GRACE, MIN, 3, bountyBps);
        _registerFirstN(ring, 3);
        ring.startGame();

        uint256 firstTargetIndex = bound(uint256(firstTargetIndexSeed), 0, 2);
        vm.warp(ring.gameStartTime() + EPOCH + ring.liquidationGracePeriod());
        vm.prank(liquidator);
        ring.liquidate(actors[firstTargetIndex]);

        assertEq(ring.ringSize(), 2);
        assertEq(uint256(ring.phase()), uint256(HeartbeatRing.Phase.Active));

        address[] memory survivors = ring.getRing();
        uint256 secondTargetIndex = bound(uint256(secondTargetIndexSeed), 0, survivors.length - 1);
        address secondTarget = survivors[secondTargetIndex];

        vm.warp(ring.gameStartTime() + (2 * EPOCH) + ring.liquidationGracePeriod());
        vm.prank(liquidator);
        ring.liquidate(secondTarget);

        assertEq(ring.ringSize(), 1);
        assertEq(uint256(ring.phase()), uint256(HeartbeatRing.Phase.Completed));

        address survivor = ring.ringHead();
        assertEq(survivor, ring.ringTail());

        (,, uint128 claimable,, bool survivorAlive) = ring.participants(survivor);
        assertTrue(survivorAlive);
        assertGt(uint256(claimable), 0);

        uint256 survivorBalanceBefore = survivor.balance;
        uint256 ringBalanceBefore = address(ring).balance;

        vm.prank(survivor);
        ring.claim();

        assertEq(survivor.balance - survivorBalanceBefore, uint256(claimable));
        assertEq(ringBalanceBefore - address(ring).balance, uint256(claimable));
        assertEq(ring.ringSize(), 0);
        assertEq(ring.ringHead(), address(0));
        assertEq(ring.ringTail(), address(0));

        (,, uint128 stakeAfterClaim,, bool aliveAfterClaim) = ring.participants(survivor);
        assertEq(uint256(stakeAfterClaim), 0);
        assertFalse(aliveAfterClaim);
    }

    function testFuzz_withdrawBounty_transfersBalanceAndResetsState(uint16 bountySeed, uint8 targetIndexSeed) external {
        uint256 bountyBps = bound(uint256(bountySeed), 1, 500);
        HeartbeatRing ring = _deployRingWithConfig(STAKE, EPOCH, GRACE, MIN, 3, bountyBps);
        _registerFirstN(ring, 3);
        ring.startGame();

        uint256 targetIndex = bound(uint256(targetIndexSeed), 0, 2);
        vm.warp(ring.gameStartTime() + EPOCH + ring.liquidationGracePeriod());
        vm.prank(liquidator);
        ring.liquidate(actors[targetIndex]);

        uint256 pending = ring.pendingBounties(liquidator);
        uint256 liquidatorBalanceBefore = liquidator.balance;
        uint256 ringBalanceBefore = address(ring).balance;

        vm.prank(liquidator);
        ring.withdrawBounty();

        assertEq(liquidator.balance - liquidatorBalanceBefore, pending);
        assertEq(ringBalanceBefore - address(ring).balance, pending);
        assertEq(ring.pendingBounties(liquidator), 0);
    }

    function testFuzz_refundRegistrationFor_reducesParticipants(uint8 participantCountSeed, uint8 refundIndexSeed)
        external
    {
        uint256 participantCount = bound(uint256(participantCountSeed), 1, actors.length);
        HeartbeatRing ring = _deployRingWithConfig(STAKE, EPOCH, GRACE, MIN, actors.length, BOUNTY_BPS);
        _registerFirstN(ring, participantCount);

        uint256 refundIndex = bound(uint256(refundIndexSeed), 0, participantCount - 1);
        address target = actors[refundIndex];
        uint256 balanceBefore = target.balance;

        vm.warp(ring.registrationDeadline() + 1);
        vm.prank(liquidator);
        ring.refundRegistrationFor(target);

        assertEq(target.balance - balanceBefore, STAKE);
        assertEq(ring.totalParticipants(), participantCount - 1);

        (,, uint128 stakeAfter,, bool aliveAfter) = ring.participants(target);
        assertEq(uint256(stakeAfter), 0);
        assertFalse(aliveAfter);
    }

    function _deployUninitializedClone() internal returns (HeartbeatRing) {
        HeartbeatRing implementation = new HeartbeatRing();
        return HeartbeatRing(address(implementation).clone());
    }

    function _deployRingWithConfig(
        uint256 _stakeAmount,
        uint256 _epochDuration,
        uint256 _gracePeriod,
        uint256 _minParticipants,
        uint256 _maxParticipants,
        uint256 _bountyBps
    ) internal returns (HeartbeatRing) {
        HeartbeatRing ring = _deployUninitializedClone();
        ring.initialize(
            _stakeAmount, _epochDuration, _gracePeriod, _minParticipants, _maxParticipants, _bountyBps, address(this)
        );
        return ring;
    }

    function _registerFirstN(HeartbeatRing ring, uint256 count) internal {
        for (uint256 i = 0; i < count; i++) {
            vm.prank(actors[i]);
            ring.register{value: STAKE}();
        }
    }
}
