// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {HeartbeatRing} from "../../src/HeartbeatRing.sol";

contract RevertingReceiver {
    receive() external payable {
        revert("NO_ETH");
    }
}

/**
 * @dev Harness for testing internal/state edge branches that are unreachable
 *      in normal game flow without synthetic state setup.
 */
contract HeartbeatRingHarness is HeartbeatRing {
    /**
     * @dev Forces a participant's stake and alive state.
     * @param who The address of the participant to force.
     * @param stake The stake to force.
     * @param alive The alive state to force.
     */
    function forceParticipant(address who, uint128 stake, bool alive) external {
        participants[who].stake = stake;
        participants[who].alive = alive;
    }

    /**
     * @dev Forces the phase of the ring.
     * @param _phase The phase to force.
     */
    function forcePhase(Phase _phase) external {
        phase = _phase;
    }

    /**
     * @dev Forces the ring size, total participants, ring head, and ring tail.
     * @param _ringSize The ring size to force.
     * @param _totalParticipants The total participants to force.
     * @param _ringHead The ring head to force.
     * @param _ringTail The ring tail to force.
     */
    function forceRingMeta(uint256 _ringSize, uint256 _totalParticipants, address _ringHead, address _ringTail)
        external
    {
        ringSize = _ringSize;
        totalParticipants = _totalParticipants;
        ringHead = _ringHead;
        ringTail = _ringTail;
    }

    /**
     * @dev Exposes the addStake function for testing purposes.
     * @param who The address of the participant to add stake to.
     * @param amount The amount of stake to add.
     */
    function exposedAddStake(address who, uint256 amount) external {
        _addStake(who, amount);
    }
}
