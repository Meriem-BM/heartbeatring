# HeartbeatRing

HeartbeatRing is a Rootstock project with three parts:

- `contracts/`: Solidity contracts and deployment scripts (Foundry)
- `interface/`: Next.js web app
- `liquidator/`: one-shot CLI liquidator bot
- `subgraph/`: Graph indexer for ring event history

## What This Project Is

HeartbeatRing is an on-chain accountability game built around recurring check-ins ("heartbeats").
Participants join a ring with a fixed stake and must submit a heartbeat each epoch.
If a participant misses the allowed window, they become delinquent and can be liquidated.
The interface is used to create and interact with rings, and the liquidator automates delinquency enforcement.

## Use Cases

- Habit and accountability groups that want crypto-backed commitment.
- Small communities that need automatic liveness checks and fair penalty rules.
- DAO or team experiments where members must periodically prove activity.

## Requirements

- Git
- Bun `1.3+`
- Foundry (`forge`, `cast`, `anvil`) for contract build/test/deploy
- Rootstock RPC endpoint(s)
- Private key for deployments and live liquidator runs

## First-Time Setup

1. Clone and initialize submodules:

```bash
git clone <your-repo-url>
cd heartbeatring
git submodule update --init --recursive
```

2. Install app dependencies:

```bash
bun --cwd interface install
bun --cwd liquidator install
```

3. Create env files:

```bash
cp contracts/.env.example contracts/.env
cp interface/.env.example interface/.env.local
cp liquidator/.env.example liquidator/.env
```

4. Fill secrets and network values in each env file.

## Contracts Workflow (`contracts/`)

1. Build contracts:

```bash
cd contracts
forge build
```

2. Run tests:

```bash
cd contracts
forge test
```

3. Deploy to testnet:

```bash
cd contracts
make deploy-testnet
```

4. Deploy to mainnet:

```bash
cd contracts
make deploy-mainnet
```

Required deploy env keys include:

- `PRIVATE_KEY`
- `RSK_TESTNET_RPC_URL` and/or `RSK_MAINNET_RPC_URL`

After deployment, save the factory address for the interface and liquidator configs.

## Interface Workflow (`interface/`)

1. Ensure `interface/.env.local` is configured.

2. Run development server:

```bash
bun --cwd interface run dev
```

3. Open `http://localhost:3000`.

4. Run lint:

```bash
bun --cwd interface run lint
```

5. Build and run production server:

```bash
bun --cwd interface run build
bun --cwd interface run start
```

## Liquidator Workflow (`liquidator/`)

1. Ensure `liquidator/.env` is configured for the target network(s).

2. Run tests from repo root:

```bash
bun run liquidator:test
```

3. Run a safe dry run first:

```bash
bun run liquidator --network testnet --dry-run
```

4. Run live liquidation:

```bash
bun run liquidator --network testnet
```

Common options:

- `--network testnet|mainnet|both`
- `--max-tx N`
- `--dry-run`
- `--help`

## Recommended End-to-End Flow

1. Deploy or confirm factory contracts in `contracts/`.
2. Set factory addresses in `interface/.env.local` and `liquidator/.env`.
3. Start the interface and verify ring creation/interaction.
4. Run liquidator in `--dry-run` mode.
5. Run liquidator live when dry-run results are correct.

## Component Docs

- [contracts/README.md](contracts/README.md)
- [interface/README.md](interface/README.md)
- [liquidator/README.md](liquidator/README.md)
- [subgraph/README.md](subgraph/README.md)
