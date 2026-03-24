// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Script, console2} from "forge-std/Script.sol";

import {MinimalProxyHRFactory} from "../src/MinimalProxyHRFactory.sol";

contract DeployHeartbeatRing is Script {
    uint256 internal constant RSK_MAINNET_CHAIN_ID = 30;
    uint256 internal constant RSK_TESTNET_CHAIN_ID = 31;

    struct DeploymentConfig {
        uint256 stakeAmount;
        uint256 epochDuration;
        uint256 liquidationGracePeriod;
        uint256 minParticipants;
        uint256 maxParticipants;
        uint256 liquidationBountyBps;
    }

    error UnsupportedChain(uint256 chainId);

    function run() external returns (MinimalProxyHRFactory factory, address initialRing) {
        uint256 chainId = block.chainid;
        _requireSupportedChain(chainId);

        uint256 privateKey = vm.envUint("PRIVATE_KEY");
        bool createInitialRing = vm.envOr("CREATE_INITIAL_RING", false);
        DeploymentConfig memory cfg = _loadConfig(chainId);

        vm.startBroadcast(privateKey);
        factory = new MinimalProxyHRFactory();
        if (createInitialRing) {
            initialRing = factory.createRing(
                cfg.stakeAmount,
                cfg.epochDuration,
                cfg.liquidationGracePeriod,
                cfg.minParticipants,
                cfg.maxParticipants,
                cfg.liquidationBountyBps
            );
        }
        vm.stopBroadcast();

        console2.log("MinimalProxyHRFactory deployed:", address(factory));
        console2.log("HeartbeatRing implementation:", factory.implementation());
        console2.log("Chain ID:", chainId);
        if (createInitialRing) {
            console2.log("Initial ring deployed:", initialRing);
            console2.log("Stake Amount:", cfg.stakeAmount);
            console2.log("Epoch Duration:", cfg.epochDuration);
            console2.log("Liquidation Grace Period:", cfg.liquidationGracePeriod);
            console2.log("Min Participants:", cfg.minParticipants);
            console2.log("Max Participants:", cfg.maxParticipants);
            console2.log("Bounty BPS:", cfg.liquidationBountyBps);
        }
    }

    function _loadConfig(uint256 chainId) internal view returns (DeploymentConfig memory cfg) {
        cfg.stakeAmount = _envOrByChain("STAKE_AMOUNT", chainId, 0.01 ether);
        cfg.epochDuration = _envOrByChain("EPOCH_DURATION", chainId, 1 days);
        cfg.liquidationGracePeriod = _envOrByChain("LIQUIDATION_GRACE_PERIOD", chainId, 10 minutes);
        cfg.minParticipants = _envOrByChain("MIN_PARTICIPANTS", chainId, 3);
        cfg.maxParticipants = _envOrByChain("MAX_PARTICIPANTS", chainId, 10);
        cfg.liquidationBountyBps = _envOrByChain("LIQUIDATION_BOUNTY_BPS", chainId, 100);
    }

    function _envOrByChain(string memory key, uint256 chainId, uint256 defaultValue) internal view returns (uint256) {
        string memory prefix;

        if (chainId == RSK_TESTNET_CHAIN_ID) {
            prefix = "TESTNET_";
        } else if (chainId == RSK_MAINNET_CHAIN_ID) {
            prefix = "MAINNET_";
        } else {
            revert UnsupportedChain(chainId);
        }

        return vm.envOr(string.concat(prefix, key), vm.envOr(key, defaultValue));
    }

    function _requireSupportedChain(uint256 chainId) internal pure {
        if (
            chainId != RSK_TESTNET_CHAIN_ID && chainId != RSK_MAINNET_CHAIN_ID
        ) {
            revert UnsupportedChain(chainId);
        }
    }
}
