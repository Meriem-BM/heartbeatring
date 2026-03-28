// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {HeartbeatRing} from "./HeartbeatRing.sol";
import {Clones} from "openzeppelin-contracts/contracts/proxy/Clones.sol";

/**
 * @title MinimalProxyHRFactory
 * @notice Deploys and indexes HeartbeatRing game instances via EIP-1167 minimal proxies.
 *         Anyone can create a ring with custom parameters and becomes that ring's creator.
 * @dev Keeps a simple on-chain registry so frontends can discover rings globally or per creator.
 */
contract MinimalProxyHRFactory {
    using Clones for address;

    // ------------------------------------------------------------
    //                           State
    // ------------------------------------------------------------

    address public immutable implementation;
    address[] public rings; // all rings ever created
    mapping(address => bool) public isRing; // ring address -> whether deployed by this factory
    mapping(address => address[]) public creatorRings; // creator -> their rings

    // ------------------------------------------------------------
    //                           Events
    // ------------------------------------------------------------

    event RingCreated(
        address indexed ring,
        address indexed creator,
        uint256 stakeAmount,
        uint256 epochDuration,
        uint256 liquidationGracePeriod,
        uint256 minParticipants,
        uint256 maxParticipants,
        uint256 bountyBps
    );
    event ImplementationDeployed(address indexed implementation);

    // ------------------------------------------------------------
    //                   External Functions
    // ------------------------------------------------------------

    constructor() {
        implementation = address(new HeartbeatRing());
        emit ImplementationDeployed(implementation);
    }

    /**
     * @notice Deploy a new HeartbeatRing game with custom parameters.
     * @param _stakeAmount      Wei required to join
     * @param _epochDuration    Seconds per epoch
     * @param _liquidationGracePeriod Seconds of grace after epoch rollover before liquidation
     * @param _minParticipants  Minimum players to start (≥ 3)
     * @param _maxParticipants  Maximum ring size
     * @param _bountyBps        Liquidation bounty in basis points (max 500 = 5%)
     * @return ring             Address of the newly deployed HeartbeatRing
     */
    function createRing(
        uint256 _stakeAmount,
        uint256 _epochDuration,
        uint256 _liquidationGracePeriod,
        uint256 _minParticipants,
        uint256 _maxParticipants,
        uint256 _bountyBps
    ) external returns (address ring) {
        ring = implementation.clone();
        HeartbeatRing(ring)
            .initialize(
                _stakeAmount,
                _epochDuration,
                _liquidationGracePeriod,
                _minParticipants,
                _maxParticipants,
                _bountyBps,
                msg.sender
            );
        rings.push(ring);
        isRing[ring] = true;
        creatorRings[msg.sender].push(ring);

        emit RingCreated(
            ring,
            msg.sender,
            _stakeAmount,
            _epochDuration,
            _liquidationGracePeriod,
            _minParticipants,
            _maxParticipants,
            _bountyBps
        );
    }

    // ------------------------------------------------------------
    //                   View Functions
    // ------------------------------------------------------------

    /**
     * @notice Total number of rings ever created.
     */
    function totalRings() external view returns (uint256) {
        return rings.length;
    }

    /**
     * @notice Get all ring addresses (for off-chain listing).
     * @dev Avoid calling this from on-chain contexts for large registries.
     */
    function getAllRings() external view returns (address[] memory) {
        return rings;
    }

    /**
     * @notice Get paginated rings (for large registries).
     * @param offset Starting index
     * @param limit  Max results to return
     */
    function getRings(uint256 offset, uint256 limit) external view returns (address[] memory result) {
        uint256 total = rings.length;
        if (offset >= total) return new address[](0);

        uint256 count = limit;
        uint256 remaining = total - offset;
        if (count > remaining) count = remaining;

        result = new address[](count);
        for (uint256 i = 0; i < count;) {
            result[i] = rings[offset + i];
            unchecked {
                i++;
            }
        }
    }

    /**
     * @notice Get all rings created by a specific address (off-chain convenience).
     * @dev Avoid calling this from on-chain contexts for large creator histories.
     */
    function getRingsByCreator(address creator) external view returns (address[] memory) {
        return creatorRings[creator];
    }

    /**
     * @notice Get paginated rings created by a specific address.
     * @param creator Address that created the rings
     * @param offset  Starting index in creator's ring list
     * @param limit   Max results to return
     */
    function getRingsByCreator(address creator, uint256 offset, uint256 limit)
        external
        view
        returns (address[] memory result)
    {
        address[] storage creatorList = creatorRings[creator];
        uint256 total = creatorList.length;
        if (offset >= total) return new address[](0);

        uint256 count = limit;
        uint256 remaining = total - offset;
        if (count > remaining) count = remaining;

        result = new address[](count);
        for (uint256 i = 0; i < count;) {
            result[i] = creatorList[offset + i];
            unchecked {
                i++;
            }
        }
    }
}
