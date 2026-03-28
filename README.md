# HeartbeatRing

HeartbeatRing is a Rootstock project with four parts:

- `contracts/`: Solidity contracts and deployment scripts (Foundry)
- `interface/`: Next.js web app
- `liquidator/`: one-shot CLI liquidator bot
- `heartbeatring/`: Graph subgraph for ring event history (Graph Studio)

## What This Project Is

HeartbeatRing is an on-chain accountability game built around recurring check-ins ("heartbeats").
Participants join a ring with a fixed stake and must submit a heartbeat each epoch.
If a participant misses the allowed window, they become delinquent and can be liquidated.
The interface is used to create and interact with rings, and the liquidator automates delinquency enforcement.

## Rules Enforced By The Protocol

1. Ring creators define game parameters on creation: stake amount, epoch duration, liquidation grace period, min/max participants, and liquidation bounty (bps).
2. Players can only join during registration by depositing the exact stake amount; duplicate joins and over-capacity joins are rejected.
3. A ring only becomes active when participant constraints are satisfied; otherwise participants can be refunded after registration closes.
4. In active phase, each alive participant must submit a heartbeat every epoch before the delinquency window.
5. Delinquent participants can be liquidated by anyone after grace period expiry; liquidation pays a bounty and redistributes remaining stake to ring neighbors.
6. The ring shrinks as participants are liquidated until game over; the final survivor can claim the remaining pool.
7. Contract actions are phase-gated (`Registration`, `Active`, `Completed`) to prevent invalid state transitions.

## Design Choices And Reasoning

- State machine model: explicit phases make lifecycle transitions auditable and reduce edge-case behavior.
- Circular ring structure: neighbor-based redistribution creates local accountability incentives and deterministic liquidation effects.
- Event-first architecture: contracts emit rich events, and the subgraph indexes them for reliable historical activity in the UI.
- Factory + minimal proxies: each ring is an isolated clone deployment, reducing deployment cost while preserving per-ring state separation.
- Operational safety: the dedicated liquidator bot automates delinquency enforcement so game progression does not depend on a single manual actor.

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

To read historical events from the deployed subgraph, set:

```bash
NEXT_PUBLIC_HEARTBEAT_SUBGRAPH_URL_TESTNET=https://api.studio.thegraph.com/query/1717460/heartbeatring/version/latest
```

## Subgraph Workflow (`heartbeatring/`)

1. Build subgraph artifacts:

```bash
cd heartbeatring
bun run codegen
bun run build
```

2. Deploy to Graph Studio:

```bash
cd heartbeatring
graph deploy heartbeatring subgraph.yaml --deploy-key <DEPLOY_KEY> -l v0.0.2
```

3. Use the latest Studio endpoint in the interface env:

```bash
NEXT_PUBLIC_HEARTBEAT_SUBGRAPH_URL_TESTNET=https://api.studio.thegraph.com/query/1717460/heartbeatring/version/latest
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
