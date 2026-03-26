"use client";

import { useSearchParams } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import type { Address } from "viem";
import { useAccount, useChainId } from "wagmi";

import {
  getHeartbeatNetwork,
  HEARTBEAT_NETWORK_SEARCH_PARAM,
  resolveHeartbeatNetworkKeyFromChainId,
} from "@/lib/chain/config";

type WalletContextValue = {
  address: Address | undefined;
  chainId: number | undefined;
  isChainMatched: (targetChainId: number) => boolean;
  isConnected: boolean;
  selectedNetwork: ReturnType<typeof getHeartbeatNetwork>;
};

const WalletContext = createContext<WalletContextValue | null>(null);

type WalletProviderProps = {
  children: ReactNode;
};

export function WalletProvider({ children }: WalletProviderProps) {
  const searchParams = useSearchParams();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const searchParamNetworkKey = searchParams.get(HEARTBEAT_NETWORK_SEARCH_PARAM);
  const walletNetworkKey = isConnected
    ? resolveHeartbeatNetworkKeyFromChainId(chainId)
    : null;
  const selectedNetwork = useMemo(
    () => getHeartbeatNetwork(walletNetworkKey ?? searchParamNetworkKey),
    [searchParamNetworkKey, walletNetworkKey],
  );

  const isChainMatched = useCallback(
    (targetChainId: number) => chainId !== undefined && chainId === targetChainId,
    [chainId],
  );

  const value = useMemo(
    () => ({
      address,
      chainId,
      isChainMatched,
      isConnected,
      selectedNetwork,
    }),
    [
      address,
      chainId,
      isChainMatched,
      isConnected,
      selectedNetwork,
    ],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWalletContext() {
  const context = useContext(WalletContext);

  if (!context) {
    throw new Error("useWalletContext must be used inside WalletProvider.");
  }

  return context;
}
