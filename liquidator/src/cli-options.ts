import { parsePositiveInteger } from "./parse-utils";
import type { CliNetworkOption, ParsedCliOptions } from "./types";

function parseNetwork(raw: string): CliNetworkOption {
  if (raw === "testnet" || raw === "mainnet" || raw === "both") {
    return raw;
  }

  throw new Error("--network must be one of: testnet, mainnet, both.");
}

export function parseCliOptions(argv: string[]): ParsedCliOptions {
  const options: ParsedCliOptions = {
    dryRun: false,
    help: false,
    network: "testnet",
    watch: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (!arg) {
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }

    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (arg === "--watch") {
      options.watch = true;
      continue;
    }

    if (arg === "--network") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("Missing value for --network.");
      }

      options.network = parseNetwork(value);
      index += 1;
      continue;
    }

    if (arg.startsWith("--network=")) {
      const value = arg.slice("--network=".length);
      options.network = parseNetwork(value);
      continue;
    }

    if (arg === "--max-tx") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("Missing value for --max-tx.");
      }

      options.maxTxOverride = parsePositiveInteger(value, "--max-tx");
      index += 1;
      continue;
    }

    if (arg.startsWith("--max-tx=")) {
      const value = arg.slice("--max-tx=".length);
      options.maxTxOverride = parsePositiveInteger(value, "--max-tx");
      continue;
    }

    throw new Error(`Unknown flag: ${arg}`);
  }

  return options;
}

export function helpText() {
  return [
    "HeartbeatRing liquidator",
    "",
    "Usage:",
    "  bun run liquidator [--network testnet|mainnet|both] [--max-tx N] [--dry-run] [--watch]",
    "",
    "Flags:",
    "  --network    Network scope. Defaults to testnet.",
    "  --max-tx     Override LIQUIDATOR_MAX_TX_PER_RUN for this run.",
    "  --dry-run    Detect and report candidates without sending transactions.",
    "  --watch      Continuous mode: run once at startup, then on each new block via polling.",
    "  --help       Show this help output.",
  ].join("\n");
}
