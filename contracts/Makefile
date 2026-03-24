SHELL := /bin/bash

ifneq (,$(wildcard .env))
include .env
export
endif

SCRIPT := script/DeployHeartbeatRing.s.sol:DeployHeartbeatRing
FORGE_SCRIPT := forge script $(SCRIPT) --broadcast -vvvv

.PHONY: help deploy-testnet deploy-mainnet require-%

help:
	@echo "Available targets:"
	@echo "  make deploy-local    - Deploy to Local RSK Testnet  (chain id 31)"
	@echo "  make deploy-testnet  - Deploy to Rootstock Testnet  (chain id 31)"
	@echo "  make deploy-mainnet  - Deploy to Rootstock Mainnet  (chain id 30)"

deploy-local:
	$(FORGE_SCRIPT) --rpc-url http://127.0.0.1:8545 --chain-id 31

deploy-testnet: require-PRIVATE_KEY require-RSK_TESTNET_RPC_URL
	$(FORGE_SCRIPT) --rpc-url rsk_testnet --chain-id 31

deploy-mainnet: require-PRIVATE_KEY require-RSK_MAINNET_RPC_URL
	$(FORGE_SCRIPT) --rpc-url rsk_mainnet --chain-id 30

require-%:
	@if [ -z "$($*)" ]; then \
		echo "Missing required environment variable: $*"; \
		echo "Set it in contracts/.env or export it in your shell."; \
		exit 1; \
	fi
