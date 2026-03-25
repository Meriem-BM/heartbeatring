"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Address } from "viem";
import { useAccount, useChainId, useSwitchChain } from "wagmi";

import { getErrorMessage } from "@/lib/utils/errors";

type WalletContextValue = {
  address: Address | undefined;
  chainId: number | undefined;
  clearSwitchError: () => void;
  isChainMatched: (targetChainId: number) => boolean;
  isConnected: boolean;
  isSwitchingNetwork: boolean;
  switchNetworkError: string | null;
  switchWalletChain: (targetChainId: number) => Promise<boolean>;
};

const WalletContext = createContext<WalletContextValue | null>(null);

type WalletProviderProps = {
  children: ReactNode;
};

export function WalletProvider({ children }: WalletProviderProps) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync, isPending: isSwitchingNetwork } = useSwitchChain();
  const [switchNetworkError, setSwitchNetworkError] = useState<string | null>(null);

  const clearSwitchError = useCallback(() => {
    setSwitchNetworkError(null);
  }, []);

  const isChainMatched = useCallback(
    (targetChainId: number) => chainId !== undefined && chainId === targetChainId,
    [chainId],
  );

  const switchWalletChain = useCallback(async (targetChainId: number) => {
    if (!isConnected) return false;

    if (chainId === targetChainId) {
      setSwitchNetworkError(null);
      return true;
    }

    try {
      await switchChainAsync({ chainId: targetChainId });
      setSwitchNetworkError(null);
      return true;
    } catch (error) {
      setSwitchNetworkError(getErrorMessage(error, "Failed to switch wallet network."));
      return false;
    }
  }, [chainId, isConnected, switchChainAsync]);

  const value = useMemo(
    () => ({
      address,
      chainId,
      clearSwitchError,
      isChainMatched,
      isConnected,
      isSwitchingNetwork,
      switchNetworkError,
      switchWalletChain,
    }),
    [
      address,
      chainId,
      clearSwitchError,
      isChainMatched,
      isConnected,
      isSwitchingNetwork,
      switchNetworkError,
      switchWalletChain,
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
