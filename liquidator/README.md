# HeartbeatRing Liquidator

One-shot liquidator bot for HeartbeatRing. It scans all rings from the configured factory, finds delinquent players, and submits `liquidate(target)` transactions up to a run cap.

## Setup

1. Install dependencies:

```bash
cd liquidator
bun install
```

2. Configure environment:

```bash
cp .env.example .env
```

3. Fill required values for your target network(s):

- `LIQUIDATOR_TESTNET_RPC_URL`
- `LIQUIDATOR_TESTNET_FACTORY_ADDRESS`
- `LIQUIDATOR_TESTNET_PRIVATE_KEY`
- `LIQUIDATOR_MAINNET_RPC_URL`
- `LIQUIDATOR_MAINNET_FACTORY_ADDRESS`
- `LIQUIDATOR_MAINNET_PRIVATE_KEY`
- Optional: `LIQUIDATOR_MAX_TX_PER_RUN` (default `5`)

## CLI

From `liquidator/`:

```bash
bun run liquidator
```

From repo root:

```bash
bun run liquidator
```

Flags:

- `--network testnet|mainnet|both` (default: `testnet`)
- `--max-tx <n>` (override `LIQUIDATOR_MAX_TX_PER_RUN`)
- `--dry-run` (detect/report only, no transactions)
- `--help`

Examples:

```bash
bun run liquidator --network testnet --dry-run
bun run liquidator --network testnet --max-tx 10
bun run liquidator --network both --max-tx 5
```

## Behavior

- Ring source: `getAllRings()` on the configured factory.
- Ring filter: only `phase == Active` (`1`).
- Candidate detection: `getRing()` members + `isDelinquent(member)` checks.
- Queue ordering: deterministic by factory ring order, then ring member order.
- Execution: processes candidates up to `MAX_TX_PER_RUN`.
- Failure handling: reverts/race conditions are logged and the run continues.
- Bounty handling: this tool does **not** call `withdrawBounty`.

## Scheduled Runs

Use any scheduler that can run a one-shot command.

Example cron entry (every 5 minutes on testnet):

```cron
*/5 * * * * cd /path/to/heartbeatring/liquidator && /usr/local/bin/bun run liquidator --network testnet >> /var/log/heartbeatring-liquidator.log 2>&1
```

## Testing

```bash
cd liquidator
bun test
```

## Manual Acceptance (Testnet)

1. `--dry-run` shows expected delinquent targets.
2. Live run submits liquidation txs and respects `MAX_TX_PER_RUN`.
3. Next run no longer targets already-liquidated addresses.
