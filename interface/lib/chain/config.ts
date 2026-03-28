import {
  createPublicClient,
  defineChain,
  fallback,
  getAddress,
  http,
  zeroAddress,
} from "viem";
import type { Address, Chain } from "viem";

const DEFAULT_ROOTSTOCK_TESTNET_RPC_URL = "https://public-node.testnet.rsk.co";
const DEFAULT_ROOTSTOCK_MAINNET_RPC_URL = "https://public-node.rsk.co";
const CLIENT_TESTNET_RPC_PROXY_PATH = "/api/rpc/testnet";
const CLIENT_MAINNET_RPC_PROXY_PATH = "/api/rpc/mainnet";

function resolveUrl(value: string | undefined, fallback: string) {
  const candidate = value?.trim();
  return candidate && candidate.length > 0 ? candidate : fallback;
}

function uniqueRpcUrls(values: readonly string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function createRpcTransport(urls: readonly string[]) {
  const transports = urls.map((url) => http(url));
  return transports.length > 1 ? fallback(transports) : transports[0];
}

function resolveServerRpcUrl(networkKey: HeartbeatNetworkKey) {
  if (networkKey === "mainnet") {
    return resolveUrl(
      process.env.ROOTSTOCK_RPC_URL_MAINNET?.trim() ||
        process.env.ROOTSTOCK_RPC_URL?.trim(),
      DEFAULT_ROOTSTOCK_MAINNET_RPC_URL,
    );
  }

  return resolveUrl(
    process.env.ROOTSTOCK_RPC_URL_TESTNET?.trim() ||
      process.env.ROOTSTOCK_RPC_URL?.trim(),
    DEFAULT_ROOTSTOCK_TESTNET_RPC_URL,
  );
}

function getClientRpcProxyPath(networkKey: HeartbeatNetworkKey) {
  return networkKey === "mainnet"
    ? CLIENT_MAINNET_RPC_PROXY_PATH
    : CLIENT_TESTNET_RPC_PROXY_PATH;
}

export const rootstockTestnet = defineChain({
  id: 31,
  name: "Rootstock Testnet",
  nativeCurrency: { name: "tRBTC", symbol: "tRBTC", decimals: 18 },
  rpcUrls: {
    default: {
      http: [DEFAULT_ROOTSTOCK_TESTNET_RPC_URL],
    },
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
    default: {
      http: [DEFAULT_ROOTSTOCK_MAINNET_RPC_URL],
    },
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
  key: HeartbeatNetworkKey;
  label: string;
  longLabel: string;
  subgraphUrl: string | null;
};

export const HEARTBEAT_NETWORK_SEARCH_PARAM = "network";
export const DEFAULT_HEARTBEAT_NETWORK_KEY: HeartbeatNetworkKey = "testnet";
export const DEFAULT_TESTNET_FACTORY_ADDRESS = getAddress(
  "0xf3e5fe303E01546a6Cc04380e18288ce6D30E002",
);
export const DEFAULT_MAINNET_FACTORY_ADDRESS = zeroAddress;

const heartbeatNetworkMap = {
  mainnet: {
    chain: rootstockMainnet,
    factoryAddress: DEFAULT_MAINNET_FACTORY_ADDRESS,
    key: "mainnet",
    label: "Mainnet",
    longLabel: "Rootstock Mainnet",
    subgraphUrl:
      process.env.NEXT_PUBLIC_HEARTBEAT_SUBGRAPH_URL_MAINNET?.trim() ||
      process.env.NEXT_PUBLIC_HEARTBEAT_SUBGRAPH_URL?.trim() ||
      null,
  },
  testnet: {
    chain: rootstockTestnet,
    factoryAddress: DEFAULT_TESTNET_FACTORY_ADDRESS,
    key: "testnet",
    label: "Testnet",
    longLabel: "Rootstock Testnet",
    subgraphUrl:
      process.env.NEXT_PUBLIC_HEARTBEAT_SUBGRAPH_URL_TESTNET?.trim() ||
      process.env.NEXT_PUBLIC_HEARTBEAT_SUBGRAPH_URL?.trim() ||
      null,
  },
} as const satisfies Record<HeartbeatNetworkKey, HeartbeatNetworkDefinition>;

export function resolveHeartbeatNetworkKey(
  value: string | string[] | null | undefined,
): HeartbeatNetworkKey {
  const candidate = Array.isArray(value) ? value[0] : value;

  if (candidate === "mainnet") {
    return "mainnet";
  }

  return DEFAULT_HEARTBEAT_NETWORK_KEY;
}

export function resolveHeartbeatNetworkKeyFromChainId(
  chainId: number | null | undefined,
): HeartbeatNetworkKey | null {
  if (chainId === rootstockMainnet.id) {
    return "mainnet";
  }

  if (chainId === rootstockTestnet.id) {
    return "testnet";
  }

  return null;
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
  const rpcUrls =
    typeof window === "undefined"
      ? uniqueRpcUrls([
          resolveServerRpcUrl(network.key),
          ...network.chain.rpcUrls.default.http,
        ])
      : uniqueRpcUrls([
          getClientRpcProxyPath(network.key),
          ...network.chain.rpcUrls.default.http,
        ]);

  return createPublicClient({
    chain: network.chain,
    transport: createRpcTransport(rpcUrls),
  });
}

export function createLogsPublicClientForNetwork(
  networkKey?: HeartbeatNetworkKey | string | string[] | null,
) {
  return createPublicClientForNetwork(networkKey);
}
