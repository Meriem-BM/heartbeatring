import { getAddress, isAddress, isHex } from "viem";

import { chainByNetwork } from "./chains";
import { parsePositiveInteger } from "./parse-utils";
import type {
  NetworkKey,
  NetworkRuntimeConfig,
  ParsedCliOptions,
} from "./types";

export const DEFAULT_MAX_TX_PER_RUN = 5;

export type LoadedRuntimeConfig = {
  maxTxPerRun: number;
  networks: NetworkRuntimeConfig[];
};

type EnvMap = Record<string, string | undefined>;

const envKeysByNetwork = {
  mainnet: {
    factory: "LIQUIDATOR_MAINNET_FACTORY_ADDRESS",
    privateKey: "LIQUIDATOR_MAINNET_PRIVATE_KEY",
    rpcUrl: "LIQUIDATOR_MAINNET_RPC_URL",
    wsRpcUrl: "LIQUIDATOR_MAINNET_WS_RPC_URL",
  },
  testnet: {
    factory: "LIQUIDATOR_TESTNET_FACTORY_ADDRESS",
    privateKey: "LIQUIDATOR_TESTNET_PRIVATE_KEY",
    rpcUrl: "LIQUIDATOR_TESTNET_RPC_URL",
    wsRpcUrl: "LIQUIDATOR_TESTNET_WS_RPC_URL",
  },
} as const satisfies Record<
  NetworkKey,
  { factory: string; privateKey: string; rpcUrl: string; wsRpcUrl: string }
>;

function isValidPrivateKey(raw: string) {
  return isHex(raw) && raw.length === 66;
}

function isValidWsRpcUrl(raw: string) {
  try {
    const parsed = new URL(raw);
    return parsed.protocol === "ws:" || parsed.protocol === "wss:";
  } catch {
    return false;
  }
}

function readEnv(
  env: EnvMap,
  key: string,
) {
  const value = env[key];
  return value ? value.trim() : "";
}

function selectedNetworks(network: ParsedCliOptions["network"]): NetworkKey[] {
  if (network === "both") {
    return ["testnet", "mainnet"];
  }

  return [network];
}

export function loadRuntimeConfig(
  env: EnvMap,
  options: ParsedCliOptions,
): LoadedRuntimeConfig {
  const maxTxPerRun =
    options.maxTxOverride ??
    (() => {
      const raw = readEnv(env, "LIQUIDATOR_MAX_TX_PER_RUN");
      if (!raw) {
        return DEFAULT_MAX_TX_PER_RUN;
      }

      return parsePositiveInteger(raw, "LIQUIDATOR_MAX_TX_PER_RUN");
    })();

  const networkConfigs: NetworkRuntimeConfig[] = [];
  const issues: string[] = [];

  for (const key of selectedNetworks(options.network)) {
    const envKeys = envKeysByNetwork[key];
    const rpcUrl = readEnv(env, envKeys.rpcUrl);
    const wsRpcUrl = readEnv(env, envKeys.wsRpcUrl);
    const factoryRaw = readEnv(env, envKeys.factory);
    const privateKeyRaw = readEnv(env, envKeys.privateKey);
    const networkIssues: string[] = [];

    if (!rpcUrl) {
      networkIssues.push(`${envKeys.rpcUrl} is required.`);
    }

    if (!factoryRaw) {
      networkIssues.push(`${envKeys.factory} is required.`);
    } else if (!isAddress(factoryRaw)) {
      networkIssues.push(`${envKeys.factory} must be a valid EVM address.`);
    }

    if (!options.dryRun && !privateKeyRaw) {
      networkIssues.push(
        `${envKeys.privateKey} is required unless --dry-run is enabled.`,
      );
    }

    if (privateKeyRaw && !isValidPrivateKey(privateKeyRaw)) {
      networkIssues.push(
        `${envKeys.privateKey} must be a 32-byte hex private key (0x + 64 hex chars).`,
      );
    }

    if (wsRpcUrl && !isValidWsRpcUrl(wsRpcUrl)) {
      networkIssues.push(`${envKeys.wsRpcUrl} must be a valid ws:// or wss:// URL.`);
    }

    if (networkIssues.length > 0) {
      issues.push(...networkIssues.map((message) => `${key}: ${message}`));
      continue;
    }

    networkConfigs.push({
      chain: chainByNetwork[key],
      factoryAddress: getAddress(factoryRaw),
      key,
      privateKey: privateKeyRaw ? (privateKeyRaw as `0x${string}`) : undefined,
      rpcUrl,
      wsRpcUrl: wsRpcUrl || undefined,
    });
  }

  if (issues.length > 0) {
    throw new Error(
      [
        "Invalid liquidator configuration:",
        ...issues.map((issue) => `- ${issue}`),
      ].join("\n"),
    );
  }

  return {
    maxTxPerRun,
    networks: networkConfigs,
  };
}
