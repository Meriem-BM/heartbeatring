// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Test} from "forge-std/Test.sol";

import {HeartbeatRing} from "../src/HeartbeatRing.sol";
import {MinimalProxyHRFactory} from "../src/MinimalProxyHRFactory.sol";

contract MinimalProxyHRFactoryTest is Test {
    uint256 internal constant STAKE = 1 ether;
    uint256 internal constant EPOCH = 1 days;
    uint256 internal constant GRACE = 10 minutes;
    uint256 internal constant MIN = 3;
    uint256 internal constant MAX = 5;
    uint256 internal constant BOUNTY_BPS = 100;

    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");

    MinimalProxyHRFactory internal factory;

    function setUp() external {
        factory = new MinimalProxyHRFactory();
    }

    function test_createRing_setsCallerAsCreator() external {
        address implementation = factory.implementation();
        assertTrue(implementation != address(0));

        vm.prank(alice);
        address ringAddr = factory.createRing(STAKE, EPOCH, GRACE, MIN, MAX, BOUNTY_BPS);

        HeartbeatRing ring = HeartbeatRing(ringAddr);
        assertEq(ring.creator(), alice);
        assertEq(ring.liquidationGracePeriod(), GRACE);
        assertTrue(factory.isRing(ringAddr));
        assertEq(factory.totalRings(), 1);
        assertTrue(ringAddr != implementation);
        assertEq(ringAddr.code.length, 45); // EIP-1167 minimal proxy runtime size
        assertGt(implementation.code.length, ringAddr.code.length);

        address[] memory aliceRings = factory.getRingsByCreator(alice);
        assertEq(aliceRings.length, 1);
        assertEq(aliceRings[0], ringAddr);

        vm.expectRevert(HeartbeatRing.AlreadyInitialized.selector);
        ring.initialize(STAKE, EPOCH, GRACE, MIN, MAX, BOUNTY_BPS, alice);
    }

    function test_implementation_rejectsExternalInitialization() external {
        HeartbeatRing impl = HeartbeatRing(factory.implementation());
        vm.expectRevert(HeartbeatRing.UnauthorizedInitializer.selector);
        impl.initialize(STAKE, EPOCH, GRACE, MIN, MAX, BOUNTY_BPS, alice);
    }

    function test_createRing_supportsMultipleCreators() external {
        vm.prank(alice);
        address ringA = factory.createRing(STAKE, EPOCH, GRACE, MIN, MAX, BOUNTY_BPS);

        vm.prank(bob);
        address ringB = factory.createRing(STAKE * 2, EPOCH * 2, GRACE, MIN, MAX + 1, 50);

        assertEq(factory.totalRings(), 2);

        address[] memory all = factory.getAllRings();
        assertEq(all.length, 2);
        assertEq(all[0], ringA);
        assertEq(all[1], ringB);

        assertEq(HeartbeatRing(ringA).creator(), alice);
        assertEq(HeartbeatRing(ringB).creator(), bob);

        address[] memory aliceRings = factory.getRingsByCreator(alice);
        address[] memory bobRings = factory.getRingsByCreator(bob);
        assertEq(aliceRings.length, 1);
        assertEq(bobRings.length, 1);
        assertEq(aliceRings[0], ringA);
        assertEq(bobRings[0], ringB);
    }

    function test_getRings_returnsPaginatedResults() external {
        vm.prank(alice);
        address ring0 = factory.createRing(STAKE, EPOCH, GRACE, MIN, MAX, BOUNTY_BPS);

        vm.prank(alice);
        address ring1 = factory.createRing(STAKE, EPOCH, GRACE, MIN, MAX, BOUNTY_BPS);

        vm.prank(alice);
        address ring2 = factory.createRing(STAKE, EPOCH, GRACE, MIN, MAX, BOUNTY_BPS);

        address[] memory page = factory.getRings(1, 5);
        assertEq(page.length, 2);
        assertEq(page[0], ring1);
        assertEq(page[1], ring2);

        address[] memory outOfBounds = factory.getRings(10, 2);
        assertEq(outOfBounds.length, 0);

        address[] memory firstOnly = factory.getRings(0, 1);
        assertEq(firstOnly.length, 1);
        assertEq(firstOnly[0], ring0);
    }

    function test_getRings_handlesVeryLargeLimitWithoutOverflow() external {
        vm.prank(alice);
        address ring0 = factory.createRing(STAKE, EPOCH, GRACE, MIN, MAX, BOUNTY_BPS);
        vm.prank(alice);
        address ring1 = factory.createRing(STAKE, EPOCH, GRACE, MIN, MAX, BOUNTY_BPS);

        address[] memory page = factory.getRings(0, type(uint256).max);
        assertEq(page.length, 2);
        assertEq(page[0], ring0);
        assertEq(page[1], ring1);
    }

    function test_getRingsByCreator_returnsPaginatedResults() external {
        vm.prank(alice);
        address ring0 = factory.createRing(STAKE, EPOCH, GRACE, MIN, MAX, BOUNTY_BPS);
        vm.prank(alice);
        address ring1 = factory.createRing(STAKE, EPOCH, GRACE, MIN, MAX, BOUNTY_BPS);
        vm.prank(alice);
        address ring2 = factory.createRing(STAKE, EPOCH, GRACE, MIN, MAX, BOUNTY_BPS);
        vm.prank(bob);
        factory.createRing(STAKE, EPOCH, GRACE, MIN, MAX, BOUNTY_BPS);

        address[] memory page = factory.getRingsByCreator(alice, 1, 5);
        assertEq(page.length, 2);
        assertEq(page[0], ring1);
        assertEq(page[1], ring2);

        address[] memory firstOnly = factory.getRingsByCreator(alice, 0, 1);
        assertEq(firstOnly.length, 1);
        assertEq(firstOnly[0], ring0);

        address[] memory outOfBounds = factory.getRingsByCreator(alice, 10, 2);
        assertEq(outOfBounds.length, 0);
    }

    function test_createRing_bubblesHeartbeatRingValidationReverts() external {
        vm.expectRevert(HeartbeatRing.InvalidStakeAmount.selector);
        factory.createRing(0, EPOCH, GRACE, MIN, MAX, BOUNTY_BPS);

        vm.expectRevert(HeartbeatRing.InvalidParticipantBounds.selector);
        factory.createRing(STAKE, EPOCH, GRACE, 2, MAX, BOUNTY_BPS);

        vm.expectRevert(HeartbeatRing.InvalidBountyBps.selector);
        factory.createRing(STAKE, EPOCH, GRACE, MIN, MAX, 600);

        vm.expectRevert(HeartbeatRing.InvalidLiquidationGracePeriod.selector);
        factory.createRing(STAKE, EPOCH, 29, MIN, MAX, BOUNTY_BPS);
    }

    function test_createRing_emitsRingCreatedEvent() external {
        vm.expectEmit(false, true, false, true);
        emit MinimalProxyHRFactory.RingCreated(
            address(0), // ring address unknown ahead of time
            alice,
            STAKE, EPOCH, GRACE, MIN, MAX, BOUNTY_BPS
        );

        vm.prank(alice);
        factory.createRing(STAKE, EPOCH, GRACE, MIN, MAX, BOUNTY_BPS);
    }
}
