# HeartbeatRing

HeartbeatRing is an on-chain accountability protocol on Rootstock. This repo contains contracts, a web interface, a liquidator bot, and a subgraph.

## Use Cases

- Habit/accountability groups with stake-backed check-ins
- DAO/team liveness tracking with clear inactivity penalties
- Community experiments with periodic on-chain participation rules

## Repo Structure

- `contracts/` - Foundry contracts and deployment scripts
- `interface/` - Next.js app
- `liquidator/` - liquidation bot CLI
- `heartbeatring/` - The Graph subgraph

## Requirements

- Bun `1.3+`
- Foundry (`forge`, `cast`, `anvil`)
- Rootstock RPC access

## Quick Setup

1. Clone and init submodules:

```bash
git clone <your-repo-url>
cd heartbeatring
git submodule update --init --recursive
```

2. Install dependencies:

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

4. Fill required values in each env file.

## Typical Dev Flow

1. Build/test/deploy contracts in `contracts/`.
2. Configure `interface/.env.local` with deployed addresses.
3. Run the interface from `interface/`.
4. Run the subgraph from `heartbeatring/` (optional but recommended).
5. Run the liquidator from `liquidator/`.

## Component Docs

- [contracts/README.md](contracts/README.md)
- [interface/README.md](interface/README.md)
- [liquidator/README.md](liquidator/README.md)
