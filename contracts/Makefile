SHELL := /bin/bash

ifneq (,$(wildcard .env))
include .env
export
endif

SCRIPT := script/DeployHeartbeatRing.s.sol:DeployHeartbeatRing
FORGE_SCRIPT := forge script $(SCRIPT) --broadcast -vvvv
FORGE_VERIFY_FLAGS := --verify --verifier custom --delay 15 --retries 7

TESTNET_VERIFIER_URL ?= https://be.explorer.testnet.rootstock.io/api/v3/etherscan
MAINNET_VERIFIER_URL ?= https://be.explorer.rootstock.io/api/v3/etherscan

VERIFIER_API_KEY ?= $(ETHERSCAN_API_KEY)
VERIFIER_API_KEY_FLAG :=
ifneq ($(strip $(VERIFIER_API_KEY)),)
VERIFIER_API_KEY_FLAG := --verifier-api-key $(VERIFIER_API_KEY)
endif

.PHONY: help deploy-local deploy-testnet deploy-mainnet require-%

help:
	@echo "Available targets:"
	@echo "  make deploy-local    - Deploy to Local RSK Testnet  (chain id 31)"
	@echo "  make deploy-testnet  - Deploy and verify on Rootstock Testnet (chain id 31)"
	@echo "  make deploy-mainnet  - Deploy and verify on Rootstock Mainnet (chain id 30)"
	@echo "Optional: set VERIFIER_API_KEY (or ETHERSCAN_API_KEY) if required by your verifier."

deploy-local:
	$(FORGE_SCRIPT) --rpc-url http://127.0.0.1:8545 --chain-id 31

deploy-testnet: require-PRIVATE_KEY require-RSK_TESTNET_RPC_URL
	$(FORGE_SCRIPT) --rpc-url rsk_testnet --chain-id 31 $(FORGE_VERIFY_FLAGS) --verifier-url $(TESTNET_VERIFIER_URL) $(VERIFIER_API_KEY_FLAG)

deploy-mainnet: require-PRIVATE_KEY require-RSK_MAINNET_RPC_URL
	$(FORGE_SCRIPT) --rpc-url rsk_mainnet --chain-id 30 $(FORGE_VERIFY_FLAGS) --verifier-url $(MAINNET_VERIFIER_URL) $(VERIFIER_API_KEY_FLAG)

require-%:
	@if [ -z "$($*)" ]; then \
		echo "Missing required environment variable: $*"; \
		echo "Set it in contracts/.env or export it in your shell."; \
		exit 1; \
	fi
