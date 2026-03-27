# HeartbeatRing Liquidator

One-shot CLI for HeartbeatRing liquidation. It scans rings from the configured factory, finds delinquent members, and can submit `liquidate(target)` transactions.

## Requirements

- Bun `1.3+`
- Rootstock RPC URL(s) for the network(s) you want to run
- Factory address per network
- Private key per network for live runs (not required for `--dry-run`)

## Setup

1. Install dependencies:

```bash
cd liquidator
bun install
```

2. Create your env file:

```bash
cp .env.example .env
```

3. Set required values in `.env`:

- `LIQUIDATOR_TESTNET_RPC_URL`
- `LIQUIDATOR_TESTNET_FACTORY_ADDRESS`
- `LIQUIDATOR_TESTNET_PRIVATE_KEY` (required unless using `--dry-run`)
- `LIQUIDATOR_MAINNET_RPC_URL`
- `LIQUIDATOR_MAINNET_FACTORY_ADDRESS`
- `LIQUIDATOR_MAINNET_PRIVATE_KEY` (required unless using `--dry-run`)
- `LIQUIDATOR_MAX_TX_PER_RUN` (optional, default: `5`)

## Test Workflow

1. Run tests from repo root:

```bash
bun run liquidator:test
```

2. Confirm all tests pass (`7 pass`, `0 fail`).

## Run Workflow

1. Start with a dry run (safe, no transactions):

```bash
bun run liquidator --network testnet --dry-run
```

2. Review logs and JSON summary output.

3. Run live liquidation:

```bash
bun run liquidator --network testnet
```

4. Optional: override max transactions for one run:

```bash
bun run liquidator --network testnet --max-tx 10
```

5. Optional: run both networks in one execution:

```bash
bun run liquidator --network both --max-tx 5
```

## CLI Options

- `--network testnet|mainnet|both` (default: `testnet`)
- `--max-tx N` (overrides `LIQUIDATOR_MAX_TX_PER_RUN`)
- `--dry-run` (scan and report only)
- `--help`

## Runtime Notes

- Only active rings are scanned (`phase == 1`).
- Candidates are processed in deterministic order.
- The transaction cap is always enforced per run.
- A failed liquidation does not stop the remaining run.
