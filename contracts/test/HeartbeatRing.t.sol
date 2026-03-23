// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";

import {HeartbeatRing} from "../src/HeartbeatRing.sol";
import {HeartbeatRingHarness, RevertingReceiver} from "./helpers/HeartbeatRingTestHelpers.sol";

contract HeartbeatRingTest is Test {
    uint256 internal constant STAKE = 1 ether;
    uint256 internal constant EPOCH = 1 days;
    uint256 internal constant MIN = 3;
    uint256 internal constant MAX = 5;
    uint256 internal constant BOUNTY_BPS = 100; // 1%

    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");
    address internal carol = makeAddr("carol");
    address internal dave = makeAddr("dave");
    address internal liquidator = makeAddr("liquidator");

    function setUp() public {
        vm.deal(alice, 100 ether);
        vm.deal(bob, 100 ether);
        vm.deal(carol, 100 ether);
        vm.deal(dave, 100 ether);
        vm.deal(liquidator, 100 ether);
    }

    // ------------------------------------------------------------
    // --------------------- Constructor Tests --------------------
    // ------------------------------------------------------------

    function test_constructor_setsDefaults() external {
        HeartbeatRing ring = _deployDefault();

        assertEq(uint256(ring.phase()), uint256(HeartbeatRing.Phase.Registration));
        assertEq(ring.creator(), address(this));
        assertEq(ring.stakeAmount(), STAKE);
        assertEq(ring.epochDuration(), EPOCH);
        assertEq(ring.minParticipants(), MIN);
        assertEq(ring.maxParticipants(), MAX);
        assertEq(ring.liquidationBountyBps(), BOUNTY_BPS);
        assertEq(ring.registrationDeadline(), block.timestamp + ring.REGISTRATION_WINDOW());
    }

    function test_constructor_revertsOnInvalidInputs() external {
        vm.expectRevert(HeartbeatRing.InvalidStakeAmount.selector);
        new HeartbeatRing(0, EPOCH, MIN, MAX, BOUNTY_BPS);

        vm.expectRevert(HeartbeatRing.InvalidStakeAmount.selector);
        new HeartbeatRing(uint256(type(uint128).max) + 1, EPOCH, MIN, MAX, BOUNTY_BPS);

        vm.expectRevert(HeartbeatRing.InvalidParticipantBounds.selector);
        new HeartbeatRing(STAKE, EPOCH, 2, MAX, BOUNTY_BPS);

        vm.expectRevert(HeartbeatRing.InvalidParticipantBounds.selector);
        new HeartbeatRing(STAKE, EPOCH, 5, 4, BOUNTY_BPS);

        vm.expectRevert(HeartbeatRing.MaxParticipantsTooHigh.selector);
        new HeartbeatRing(STAKE, EPOCH, MIN, 1001, BOUNTY_BPS);

        vm.expectRevert(HeartbeatRing.InvalidBountyBps.selector);
        new HeartbeatRing(STAKE, EPOCH, MIN, MAX, 501);

        vm.expectRevert(HeartbeatRing.InvalidEpochDuration.selector);
        new HeartbeatRing(STAKE, 59, MIN, MAX, BOUNTY_BPS);

        uint256 overflowingStake = uint256(type(uint128).max) / 1000 + 1;
        vm.expectRevert(HeartbeatRing.StakeOverflow.selector);
        new HeartbeatRing(overflowingStake, EPOCH, MIN, 1000, BOUNTY_BPS);
    }

    // ------------------------------------------------------------
    // ------------------- Registration / Start -------------------
    // ------------------------------------------------------------

    function test_register_linksParticipantsAndEmitsPosition() external {
        HeartbeatRing ring = _deployDefault();

        vm.expectEmit(true, false, false, true);
        emit HeartbeatRing.Registered(alice, 1);
        _register(ring, alice);

        vm.expectEmit(true, false, false, true);
        emit HeartbeatRing.Registered(bob, 2);
        _register(ring, bob);

        vm.expectEmit(true, false, false, true);
        emit HeartbeatRing.Registered(carol, 3);
        _register(ring, carol);

        assertEq(ring.ringHead(), alice);
        assertEq(ring.ringTail(), carol);
        assertEq(ring.totalParticipants(), 3);

        (address bobNext, address bobPrev,,,) = ring.participants(bob);
        assertEq(bobNext, carol);
        assertEq(bobPrev, alice);
    }

    function test_register_revertsOnPhaseAndGuards() external {
        HeartbeatRing ring = _deployDefault();

        vm.prank(alice);
        vm.expectRevert(HeartbeatRing.IncorrectStake.selector);
        ring.register{value: STAKE - 1}();

        _register(ring, alice);

        vm.prank(alice);
        vm.expectRevert(HeartbeatRing.AlreadyRegistered.selector);
        ring.register{value: STAKE}();

        vm.warp(ring.registrationDeadline() + 1);
        vm.prank(bob);
        vm.expectRevert(HeartbeatRing.RegistrationClosed.selector);
        ring.register{value: STAKE}();

        HeartbeatRing small = new HeartbeatRing(STAKE, EPOCH, 3, 3, BOUNTY_BPS);
        _register(small, alice);
        _register(small, bob);
        _register(small, carol);

        vm.prank(dave);
        vm.expectRevert(HeartbeatRing.RingIsFull.selector);
        small.register{value: STAKE}();

        vm.prank(alice);
        small.startGame();

        vm.prank(dave);
        vm.expectRevert(
            abi.encodeWithSelector(
                HeartbeatRing.WrongPhase.selector, HeartbeatRing.Phase.Registration, HeartbeatRing.Phase.Active
            )
        );
        small.register{value: STAKE}();
    }

    function test_startGame_revertsAndFormsCircularRing() external {
        HeartbeatRing ring = _deployDefault();

        vm.expectRevert(HeartbeatRing.RingNotReady.selector);
        ring.startGame();

        _register(ring, alice);
        vm.warp(ring.registrationDeadline() + 1);
        vm.expectRevert(HeartbeatRing.RegistrationClosed.selector);
        ring.startGame();

        ring = _deployDefault();
        _register3(ring);

        vm.expectEmit(false, false, false, true);
        emit HeartbeatRing.RingFormed(3, EPOCH);
        ring.startGame();

        assertEq(uint256(ring.phase()), uint256(HeartbeatRing.Phase.Active));
        assertEq(ring.ringSize(), 3);

        (address aliceNext, address alicePrev,,,) = ring.participants(alice);
        (address carolNext, address carolPrev,,,) = ring.participants(carol);

        assertEq(alicePrev, carol);
        assertEq(carolNext, alice);
        assertEq(carolPrev, bob);
        assertEq(aliceNext, bob);
    }

    // ------------------------------------------------------------
    // ------------------- Heartbeat / Liquidation ----------------
    // ------------------------------------------------------------

    function test_heartbeat_revertsOnWrongPhaseDeadAndOverflow() external {
        HeartbeatRing ring = _deployDefault();

        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(
                HeartbeatRing.WrongPhase.selector, HeartbeatRing.Phase.Active, HeartbeatRing.Phase.Registration
            )
        );
        ring.heartbeat();

        _register3(ring);
        ring.startGame();

        vm.warp(ring.gameStartTime() + EPOCH + ring.LIQUIDATION_GRACE_PERIOD());
        vm.prank(liquidator);
        ring.liquidate(bob);

        vm.prank(bob);
        vm.expectRevert(HeartbeatRing.AlreadyDead.selector);
        ring.heartbeat();

        uint256 overflowingEpoch = uint256(type(uint64).max) + 1;
        vm.warp(ring.gameStartTime() + overflowingEpoch * EPOCH);
        vm.prank(alice);
        vm.expectRevert(HeartbeatRing.EpochOverflow.selector);
        ring.heartbeat();
    }

    function test_heartbeat_setsLastBeat() external {
        HeartbeatRing ring = _deployDefault();
        _register3(ring);
        ring.startGame();

        vm.warp(ring.gameStartTime() + EPOCH + ring.LIQUIDATION_GRACE_PERIOD());

        vm.expectEmit(true, true, false, true);
        emit HeartbeatRing.Heartbeat(alice, 1);
        vm.prank(alice);
        ring.heartbeat();

        (,,, uint64 lastBeat,) = ring.participants(alice);
        assertEq(lastBeat, 1);
    }

    function test_liquidate_revertsOnPhaseAndStateGuards() external {
        HeartbeatRing ring = _deployDefault();

        vm.prank(liquidator);
        vm.expectRevert(
            abi.encodeWithSelector(
                HeartbeatRing.WrongPhase.selector, HeartbeatRing.Phase.Active, HeartbeatRing.Phase.Registration
            )
        );
        ring.liquidate(alice);

        _register3(ring);
        ring.startGame();

        vm.prank(liquidator);
        vm.expectRevert(HeartbeatRing.NotDelinquent.selector);
        ring.liquidate(alice);

        vm.warp(ring.gameStartTime() + EPOCH + ring.LIQUIDATION_GRACE_PERIOD() - 1);
        vm.prank(liquidator);
        vm.expectRevert(HeartbeatRing.GracePeriodActive.selector);
        ring.liquidate(alice);

        vm.warp(ring.gameStartTime() + EPOCH + ring.LIQUIDATION_GRACE_PERIOD());
        vm.prank(alice);
        ring.heartbeat();

        vm.prank(liquidator);
        vm.expectRevert(HeartbeatRing.NotDelinquent.selector);
        ring.liquidate(alice);

        vm.prank(liquidator);
        ring.liquidate(bob);

        vm.prank(liquidator);
        vm.expectRevert(HeartbeatRing.AlreadyDead.selector);
        ring.liquidate(bob);
    }

    function test_liquidate_distributesBountyRelinksAndCompletes() external {
        HeartbeatRing ring = _deployDefault();
        _register3(ring);
        ring.startGame();

        vm.warp(ring.gameStartTime() + EPOCH + ring.LIQUIDATION_GRACE_PERIOD());
        vm.prank(liquidator);
        ring.liquidate(bob);

        uint256 bounty1 = (STAKE * BOUNTY_BPS) / 10_000;
        uint256 distributable1 = STAKE - bounty1;
        uint256 leftShare1 = distributable1 / 2;
        uint256 rightShare1 = distributable1 - leftShare1;

        assertEq(ring.pendingBounties(liquidator), bounty1);
        assertEq(ring.ringSize(), 2);

        {
            (,, uint128 aliceStake,, bool aliceAlive) = ring.participants(alice);
            (,, uint128 bobStake,, bool bobAlive) = ring.participants(bob);
            (,, uint128 carolStake,, bool carolAlive) = ring.participants(carol);

            assertTrue(aliceAlive);
            assertTrue(carolAlive);
            assertFalse(bobAlive);
            assertEq(aliceStake, STAKE + leftShare1);
            assertEq(carolStake, STAKE + rightShare1);
            assertEq(bobStake, 0);
        }

        {
            (address aliceNext, address alicePrev,,,) = ring.participants(alice);
            (address bobNext, address bobPrev,,,) = ring.participants(bob);
            (address carolNext, address carolPrev,,,) = ring.participants(carol);

            assertEq(aliceNext, carol);
            assertEq(alicePrev, carol);
            assertEq(carolPrev, alice);
            assertEq(carolNext, alice);
            assertEq(bobNext, address(0));
            assertEq(bobPrev, address(0));
        }

        uint256 epoch2 = 2;
        vm.warp(ring.gameStartTime() + (epoch2 * EPOCH) + ring.LIQUIDATION_GRACE_PERIOD());
        vm.prank(liquidator);
        ring.liquidate(alice);

        uint256 aliceStakeBeforeSecond = STAKE + leftShare1;
        uint256 bounty2 = (aliceStakeBeforeSecond * BOUNTY_BPS) / 10_000;
        uint256 mergedShare = aliceStakeBeforeSecond - bounty2;

        assertEq(ring.pendingBounties(liquidator), bounty1 + bounty2);
        assertEq(ring.ringSize(), 1);
        assertEq(uint256(ring.phase()), uint256(HeartbeatRing.Phase.Completed));
        assertEq(ring.ringHead(), carol);
        assertEq(ring.ringTail(), carol);

        (,, uint128 finalCarolStake,, bool finalCarolAlive) = ring.participants(carol);
        assertTrue(finalCarolAlive);
        assertEq(finalCarolStake, STAKE + rightShare1 + mergedShare);
    }

    function test_liquidate_updatesRingTailWhenTailIsLiquidated() external {
        HeartbeatRing ring = _deployDefault();
        _register3(ring);
        ring.startGame();

        vm.warp(ring.gameStartTime() + EPOCH + ring.LIQUIDATION_GRACE_PERIOD());
        vm.prank(liquidator);
        ring.liquidate(carol);

        assertEq(ring.ringHead(), alice);
        assertEq(ring.ringTail(), bob);
    }

    function test_liquidate_withZeroBountyDoesNotAccrue() external {
        HeartbeatRing ring = new HeartbeatRing(STAKE, EPOCH, MIN, MAX, 0);
        _register3(ring);
        ring.startGame();

        vm.warp(ring.gameStartTime() + EPOCH + ring.LIQUIDATION_GRACE_PERIOD());
        vm.prank(liquidator);
        ring.liquidate(bob);

        assertEq(ring.pendingBounties(liquidator), 0);
    }

    // ------------------------------------------------------------
    // ------------------- Claim / Withdraw -----------------------
    // ------------------------------------------------------------

    function test_claim_revertsOnGuards() external {
        HeartbeatRing ring = _deployDefault();
        _register3(ring);
        ring.startGame();

        vm.prank(alice);
        vm.expectRevert(HeartbeatRing.GameNotOver.selector);
        ring.claim();

        _completeToSingleSurvivor(ring);

        vm.prank(bob);
        vm.expectRevert(HeartbeatRing.NothingToClaim.selector);
        ring.claim();

        vm.prank(carol);
        ring.claim();

        vm.prank(carol);
        vm.expectRevert(HeartbeatRing.NothingToClaim.selector);
        ring.claim();
    }

    function test_claimTo_revertsOnInvalidRecipientAndTransferFailure() external {
        HeartbeatRing ring = _deployDefault();
        _register3(ring);
        ring.startGame();
        _completeToSingleSurvivor(ring);

        vm.prank(carol);
        vm.expectRevert(HeartbeatRing.InvalidRecipient.selector);
        ring.claimTo(payable(address(0)));

        RevertingReceiver reject = new RevertingReceiver();

        vm.prank(carol);
        vm.expectRevert(HeartbeatRing.TransferFailed.selector);
        ring.claimTo(payable(address(reject)));

        (,, uint128 stakeAfterFail,, bool aliveAfterFail) = ring.participants(carol);
        assertTrue(aliveAfterFail);
        assertGt(stakeAfterFail, 0);
    }

    function test_claim_successPayoutAndStateUpdates() external {
        HeartbeatRing ring = _deployDefault();
        _register3(ring);
        ring.startGame();
        _completeToSingleSurvivor(ring);

        (,, uint128 claimable,,) = ring.participants(carol);
        uint256 before = carol.balance;

        vm.prank(carol);
        ring.claim();

        assertEq(carol.balance - before, uint256(claimable));
        assertEq(ring.ringSize(), 0);
        assertEq(ring.ringHead(), address(0));
        assertEq(ring.ringTail(), address(0));

        (,, uint128 stakeAfter,, bool aliveAfter) = ring.participants(carol);
        assertEq(stakeAfter, 0);
        assertFalse(aliveAfter);
    }

    function test_claim_revertsWhenAliveButStakeIsZero() external {
        HeartbeatRingHarness ring = new HeartbeatRingHarness(STAKE, EPOCH, MIN, MAX, BOUNTY_BPS);
        ring.forcePhase(HeartbeatRing.Phase.Completed);
        ring.forceParticipant(alice, 0, true);

        vm.prank(alice);
        vm.expectRevert(HeartbeatRing.NothingToClaim.selector);
        ring.claim();
    }

    function test_withdrawBounty_revertsAndSuccess() external {
        HeartbeatRing ring = _deployDefault();

        vm.prank(liquidator);
        vm.expectRevert(HeartbeatRing.NothingToWithdraw.selector);
        ring.withdrawBounty();

        _register3(ring);
        ring.startGame();

        vm.warp(ring.gameStartTime() + EPOCH + ring.LIQUIDATION_GRACE_PERIOD());
        vm.prank(liquidator);
        ring.liquidate(bob);

        uint256 pending = ring.pendingBounties(liquidator);
        uint256 before = liquidator.balance;

        vm.prank(liquidator);
        ring.withdrawBounty();

        assertEq(liquidator.balance - before, pending);
        assertEq(ring.pendingBounties(liquidator), 0);
    }

    function test_withdrawBountyTo_revertsOnInvalidRecipientAndTransferFailure() external {
        HeartbeatRing ring = _deployDefault();
        _register3(ring);
        ring.startGame();

        vm.prank(liquidator);
        vm.expectRevert(HeartbeatRing.InvalidRecipient.selector);
        ring.withdrawBountyTo(payable(address(0)));

        vm.warp(ring.gameStartTime() + EPOCH + ring.LIQUIDATION_GRACE_PERIOD());
        vm.prank(liquidator);
        ring.liquidate(bob);

        uint256 pending = ring.pendingBounties(liquidator);
        RevertingReceiver reject = new RevertingReceiver();

        vm.prank(liquidator);
        vm.expectRevert(HeartbeatRing.TransferFailed.selector);
        ring.withdrawBountyTo(payable(address(reject)));

        assertEq(ring.pendingBounties(liquidator), pending);
    }

    // ------------------------------------------------------------
    // --------------------- Refunds ------------------------------
    // ------------------------------------------------------------

    function test_refundRegistration_revertsOnGuards() external {
        HeartbeatRing ring = _deployDefault();
        _register(ring, alice);

        vm.prank(alice);
        vm.expectRevert(HeartbeatRing.RegistrationStillOpen.selector);
        ring.refundRegistration();

        vm.warp(ring.registrationDeadline() + 1);

        vm.prank(alice);
        vm.expectRevert(HeartbeatRing.InvalidRecipient.selector);
        ring.refundRegistrationTo(payable(address(0)));

        vm.prank(alice);
        ring.refundRegistration();

        vm.prank(alice);
        vm.expectRevert(HeartbeatRing.NothingToClaim.selector);
        ring.refundRegistration();

        ring = _deployDefault();
        _register3(ring);
        ring.startGame();

        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(
                HeartbeatRing.WrongPhase.selector, HeartbeatRing.Phase.Registration, HeartbeatRing.Phase.Active
            )
        );
        ring.refundRegistration();
    }

    function test_refundRegistrationFor_unlinksHeadMiddleTail() external {
        HeartbeatRing ring = _deployDefault();
        _register3(ring); // alice -> bob -> carol

        vm.warp(ring.registrationDeadline() + 1);

        uint256 bobBefore = bob.balance;
        vm.prank(dave);
        ring.refundRegistrationFor(bob);

        assertEq(bob.balance - bobBefore, STAKE);
        assertEq(ring.totalParticipants(), 2);
        assertEq(ring.ringHead(), alice);
        assertEq(ring.ringTail(), carol);

        (address aliceNext,,,,) = ring.participants(alice);
        (, address carolPrev,,,) = ring.participants(carol);
        assertEq(aliceNext, carol);
        assertEq(carolPrev, alice);

        uint256 aliceBefore = alice.balance;
        vm.prank(dave);
        ring.refundRegistrationFor(alice);

        assertEq(alice.balance - aliceBefore, STAKE);
        assertEq(ring.totalParticipants(), 1);
        assertEq(ring.ringHead(), carol);
        assertEq(ring.ringTail(), carol);

        uint256 carolBefore = carol.balance;
        vm.prank(dave);
        ring.refundRegistrationFor(carol);

        assertEq(carol.balance - carolBefore, STAKE);
        assertEq(ring.totalParticipants(), 0);
        assertEq(ring.ringHead(), address(0));
        assertEq(ring.ringTail(), address(0));
    }

    function test_refundRegistrationTo_revertsIfRecipientCannotReceive() external {
        HeartbeatRing ring = _deployDefault();
        _register(ring, alice);

        vm.warp(ring.registrationDeadline() + 1);

        RevertingReceiver reject = new RevertingReceiver();

        vm.prank(alice);
        vm.expectRevert(HeartbeatRing.TransferFailed.selector);
        ring.refundRegistrationTo(payable(address(reject)));
    }

    function test_refundRegistration_revertsWhenAliveButStakeIsZero() external {
        HeartbeatRingHarness ring = new HeartbeatRingHarness(STAKE, EPOCH, MIN, MAX, BOUNTY_BPS);
        ring.forceParticipant(alice, 0, true);

        vm.warp(ring.registrationDeadline() + 1);
        vm.expectRevert(HeartbeatRing.NothingToClaim.selector);
        ring.refundRegistrationFor(alice);
    }

    function test_refundRegistration_hitsFallbackHeadTailUnlinkChecks() external {
        HeartbeatRingHarness ring = new HeartbeatRingHarness(STAKE, EPOCH, MIN, MAX, BOUNTY_BPS);
        address fakePrev = makeAddr("fakePrev");
        address fakeNext = makeAddr("fakeNext");

        // Intentionally inconsistent registration pointers to exercise fallback checks:
        // participant is ringHead/ringTail while still having non-zero prev/next.
        ring.forceParticipant(alice, uint128(STAKE), true);
        ring.forceParticipantLinks(alice, fakeNext, fakePrev);
        ring.forceRingMeta(0, 1, alice, alice);
        vm.deal(address(ring), STAKE);
        vm.warp(ring.registrationDeadline() + 1);

        ring.refundRegistrationFor(alice);

        assertEq(ring.ringHead(), fakeNext);
        assertEq(ring.ringTail(), fakePrev);
    }

    // ------------------------------------------------------------
    // --------------- View functions / edge branches -------------  
    // ------------------------------------------------------------

    function test_viewFunctions_epochDelinquencyAndRing() external {
        HeartbeatRing ring = _deployDefault();

        assertEq(ring.currentEpoch(), 0);
        assertEq(ring.timeUntilEpochEnd(), 0);
        assertFalse(ring.isDelinquent(alice));

        _register3(ring);
        ring.startGame();

        assertEq(ring.currentEpoch(), 0);
        assertEq(ring.timeUntilEpochEnd(), EPOCH);
        assertFalse(ring.isDelinquent(alice));

        address[] memory startRing = ring.getRing();
        assertEq(startRing.length, 3);
        assertEq(startRing[0], alice);
        assertEq(startRing[1], bob);
        assertEq(startRing[2], carol);

        vm.warp(ring.gameStartTime() + EPOCH + ring.LIQUIDATION_GRACE_PERIOD() - 1);
        assertFalse(ring.isDelinquent(bob));

        vm.warp(ring.gameStartTime() + EPOCH + ring.LIQUIDATION_GRACE_PERIOD());
        assertTrue(ring.isDelinquent(bob));

        vm.prank(bob);
        ring.heartbeat();
        assertFalse(ring.isDelinquent(bob));

        vm.warp(ring.gameStartTime() + EPOCH + (EPOCH / 2));
        assertEq(ring.currentEpoch(), 1);
        assertEq(ring.timeUntilEpochEnd(), EPOCH / 2);
    }

    function test_getRing_returnsEmptyWhenRingSizeIsZero() external {
        HeartbeatRing ring = _deployDefault();
        address[] memory addrs = ring.getRing();
        assertEq(addrs.length, 0);
    }

    function test_getRing_revertsWhenInvariantIsBroken() external {
        HeartbeatRingHarness ring = new HeartbeatRingHarness(STAKE, EPOCH, MIN, MAX, BOUNTY_BPS);

        // This synthetic state forces the traversal guard branch.
        ring.forceRingMeta(1, 0, alice, address(0));

        vm.expectRevert(HeartbeatRing.RingInvariantBroken.selector);
        ring.getRing();
    }

    function test_addStake_overflowGuard() external {
        HeartbeatRingHarness ring = new HeartbeatRingHarness(STAKE, EPOCH, MIN, MAX, BOUNTY_BPS);
        ring.forceParticipant(alice, type(uint128).max, true);

        vm.expectRevert(HeartbeatRing.StakeOverflow.selector);
        ring.exposedAddStake(alice, 1);
    }

    // ------------------------------------------------------------
    // --------------------- Helper Functions ---------------------
    // ------------------------------------------------------------

    function _deployDefault() internal returns (HeartbeatRing) {
        return new HeartbeatRing(STAKE, EPOCH, MIN, MAX, BOUNTY_BPS);
    }

    function _register(HeartbeatRing ring, address who) internal {
        vm.prank(who);
        ring.register{value: STAKE}();
    }

    function _register3(HeartbeatRing ring) internal {
        _register(ring, alice);
        _register(ring, bob);
        _register(ring, carol);
    }

    function _completeToSingleSurvivor(HeartbeatRing ring) internal {
        vm.warp(ring.gameStartTime() + EPOCH + ring.LIQUIDATION_GRACE_PERIOD());
        vm.prank(liquidator);
        ring.liquidate(bob);

        vm.warp(ring.gameStartTime() + (2 * EPOCH) + ring.LIQUIDATION_GRACE_PERIOD());
        vm.prank(liquidator);
        ring.liquidate(alice);
    }
}
