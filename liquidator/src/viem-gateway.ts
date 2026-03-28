import {
  createPublicClient,
  createWalletClient,
  getAddress,
  http,
  webSocket,
} from "viem";
import type { Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";

import { factoryAbi, heartbeatRingAbi } from "./abi";
import type {
  LiquidatorGateway,
  NewHeadHandlers,
  NewHeadSubscriber,
  NetworkKey,
  NetworkRuntimeConfig,
  TxStatus,
} from "./types";

type NetworkClients = {
  publicClient: ReturnType<typeof createPublicClient>;
  walletClient?: ReturnType<typeof createWalletClient>;
};

function clientsOrThrow(
  clientsByNetwork: Map<NetworkKey, NetworkClients>,
  network: NetworkKey,
) {
  const clients = clientsByNetwork.get(network);

  if (!clients) {
    throw new Error(`No clients configured for ${network}.`);
  }

  return clients;
}

export function createViemGateway(
  networkConfigs: readonly NetworkRuntimeConfig[],
): LiquidatorGateway {
  const clientsByNetwork = new Map<NetworkKey, NetworkClients>();
  const factoryByNetwork = new Map<NetworkKey, Address>();

  for (const config of networkConfigs) {
    const publicClient = createPublicClient({
      chain: config.chain,
      transport: http(config.rpcUrl),
    });

    const walletClient = config.privateKey
      ? createWalletClient({
          account: privateKeyToAccount(config.privateKey),
          chain: config.chain,
          transport: http(config.rpcUrl),
        })
      : undefined;

    clientsByNetwork.set(config.key, { publicClient, walletClient });
    factoryByNetwork.set(config.key, config.factoryAddress);
  }

  return {
    async getAllRings(network) {
      const { publicClient } = clientsOrThrow(clientsByNetwork, network);
      const factoryAddress = factoryByNetwork.get(network);

      if (!factoryAddress) {
        throw new Error(`No factory configured for ${network}.`);
      }

      const rings = (await publicClient.readContract({
        abi: factoryAbi,
        address: factoryAddress,
        functionName: "getAllRings",
      })) as Address[];

      return rings.map((ring) => getAddress(ring));
    },

    async getPhase(network, ringAddress) {
      const { publicClient } = clientsOrThrow(clientsByNetwork, network);
      const phaseRaw = (await publicClient.readContract({
        abi: heartbeatRingAbi,
        address: ringAddress,
        functionName: "phase",
      })) as number | bigint;

      return typeof phaseRaw === "bigint" ? Number(phaseRaw) : phaseRaw;
    },

    async getRingMembers(network, ringAddress) {
      const { publicClient } = clientsOrThrow(clientsByNetwork, network);
      const members = (await publicClient.readContract({
        abi: heartbeatRingAbi,
        address: ringAddress,
        functionName: "getRing",
      })) as Address[];

      return members.map((member) => getAddress(member));
    },

    async isDelinquent(network, ringAddress, participant) {
      const { publicClient } = clientsOrThrow(clientsByNetwork, network);

      return (await publicClient.readContract({
        abi: heartbeatRingAbi,
        address: ringAddress,
        functionName: "isDelinquent",
        args: [participant],
      })) as boolean;
    },

    async liquidate(network, ringAddress, target) {
      const { walletClient } = clientsOrThrow(clientsByNetwork, network);

      if (!walletClient) {
        throw new Error(
          `No signer configured for ${network}. Provide the network private key or use --dry-run.`,
        );
      }
      const account = walletClient.account;
      if (!account) {
        throw new Error(`Wallet account is missing for ${network}.`);
      }

      return walletClient.writeContract({
        abi: heartbeatRingAbi,
        address: ringAddress,
        functionName: "liquidate",
        args: [target],
        account,
        chain: undefined,
      });
    },

    async waitForReceipt(network, txHash) {
      const { publicClient } = clientsOrThrow(clientsByNetwork, network);
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

      return receipt.status as TxStatus;
    },
  };
}

export function createViemNewHeadSubscriber(
  networkConfigs: readonly NetworkRuntimeConfig[],
): NewHeadSubscriber {
  const wsRpcByNetwork = new Map<NetworkKey, string>();

  for (const config of networkConfigs) {
    if (config.wsRpcUrl) {
      wsRpcByNetwork.set(config.key, config.wsRpcUrl);
    }
  }

  return (network: NetworkKey, handlers: NewHeadHandlers) => {
    const wsRpcUrl = wsRpcByNetwork.get(network);

    if (!wsRpcUrl) {
      throw new Error(`No WebSocket RPC configured for ${network}.`);
    }

    const publicClient = createPublicClient({
      transport: webSocket(wsRpcUrl, { retryCount: 0 }),
    });

    return publicClient.watchBlockNumber({
      emitOnBegin: false,
      onBlockNumber: handlers.onBlock,
      onError: handlers.onError,
    });
  };
}
