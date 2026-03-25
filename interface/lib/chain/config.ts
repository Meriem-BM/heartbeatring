import {
  createPublicClient,
  defineChain,
  getAddress,
  http,
  isAddress,
  zeroAddress,
} from "viem";
import type { Address, Chain } from "viem";

export const rootstockTestnet = defineChain({
  id: 31,
  name: "Rootstock Testnet",
  nativeCurrency: { name: "tRBTC", symbol: "tRBTC", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://public-node.testnet.rsk.co"] },
  },
  blockExplorers: {
    default: {
      name: "RSK Explorer",
      url: "https://explorer.testnet.rootstock.io",
    },
  },
  testnet: true,
});

export const rootstockMainnet = defineChain({
  id: 30,
  name: "Rootstock Mainnet",
  nativeCurrency: { name: "RBTC", symbol: "RBTC", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://public-node.rsk.co"] },
  },
  blockExplorers: {
    default: {
      name: "Rootstock Explorer",
      url: "https://explorer.rootstock.io",
    },
  },
});

export type HeartbeatNetworkKey = "testnet" | "mainnet";

type HeartbeatNetworkDefinition = {
  chain: Chain;
  factoryAddress: Address;
  factoryEnvLabel: string;
  key: HeartbeatNetworkKey;
  label: string;
  logsRpcUrl: string;
  longLabel: string;
  rpcUrl: string;
};

export const HEARTBEAT_NETWORK_SEARCH_PARAM = "network";
export const DEFAULT_HEARTBEAT_NETWORK_KEY: HeartbeatNetworkKey = "testnet";
export const DEFAULT_TESTNET_FACTORY_ADDRESS = getAddress(
  "0x52C37e8364290F3A5f293D6D4ef9852B2d7D0542",
);

function normalizeFactoryAddress(
  value: string | undefined,
  fallback: Address = zeroAddress,
) {
  if (value && isAddress(value)) {
    return getAddress(value);
  }

  return fallback;
}

const heartbeatNetworkMap = {
  mainnet: {
    chain: rootstockMainnet,
    factoryAddress: normalizeFactoryAddress(process.env.NEXT_PUBLIC_FACTORY_ADDRESS_MAINNET),
    factoryEnvLabel: "NEXT_PUBLIC_FACTORY_ADDRESS_MAINNET",
    key: "mainnet",
    label: "Mainnet",
    logsRpcUrl:
      process.env.NEXT_PUBLIC_ROOTSTOCK_LOGS_RPC_URL_MAINNET?.trim() ||
      rootstockMainnet.rpcUrls.default.http[0],
    longLabel: "Rootstock Mainnet",
    rpcUrl: rootstockMainnet.rpcUrls.default.http[0],
  },
  testnet: {
    chain: rootstockTestnet,
    factoryAddress: normalizeFactoryAddress(
      process.env.NEXT_PUBLIC_FACTORY_ADDRESS_TESTNET ??
        process.env.NEXT_PUBLIC_FACTORY_ADDRESS,
      DEFAULT_TESTNET_FACTORY_ADDRESS,
    ),
    factoryEnvLabel:
      "NEXT_PUBLIC_FACTORY_ADDRESS_TESTNET or NEXT_PUBLIC_FACTORY_ADDRESS",
    key: "testnet",
    label: "Testnet",
    logsRpcUrl:
      process.env.NEXT_PUBLIC_ROOTSTOCK_LOGS_RPC_URL_TESTNET?.trim() ||
      process.env.NEXT_PUBLIC_ROOTSTOCK_LOGS_RPC_URL?.trim() ||
      rootstockTestnet.rpcUrls.default.http[0],
    longLabel: "Rootstock Testnet",
    rpcUrl: rootstockTestnet.rpcUrls.default.http[0],
  },
} as const satisfies Record<HeartbeatNetworkKey, HeartbeatNetworkDefinition>;

export const HEARTBEAT_NETWORK_OPTIONS = [
  { key: "testnet", label: "Testnet" },
  { key: "mainnet", label: "Mainnet" },
] as const satisfies readonly {
  key: HeartbeatNetworkKey;
  label: string;
}[];

export function resolveHeartbeatNetworkKey(
  value: string | string[] | null | undefined,
): HeartbeatNetworkKey {
  const candidate = Array.isArray(value) ? value[0] : value;

  if (candidate === "mainnet") {
    return "mainnet";
  }

  return DEFAULT_HEARTBEAT_NETWORK_KEY;
}

export function getHeartbeatNetwork(
  value?: HeartbeatNetworkKey | string | string[] | null,
) {
  const key = resolveHeartbeatNetworkKey(value);
  const network = heartbeatNetworkMap[key];

  return {
    ...network,
    hasFactory: network.factoryAddress !== zeroAddress,
  };
}

export function createPublicClientForNetwork(
  networkKey?: HeartbeatNetworkKey | string | string[] | null,
) {
  const network = getHeartbeatNetwork(networkKey);

  return createPublicClient({
    chain: network.chain,
    transport: http(network.rpcUrl),
  });
}

export function createLogsPublicClientForNetwork(
  networkKey?: HeartbeatNetworkKey | string | string[] | null,
) {
  const network = getHeartbeatNetwork(networkKey);

  return createPublicClient({
    chain: network.chain,
    transport: http(network.logsRpcUrl),
  });
}
