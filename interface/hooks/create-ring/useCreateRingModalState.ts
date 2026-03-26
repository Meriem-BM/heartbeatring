"use client";

import { useWalletContext } from "@/context/wallet-context";

export function useCreateRingModalState() {
  const { isConnected, isChainMatched, selectedNetwork } = useWalletContext();
  const wrongChain = isConnected && !isChainMatched(selectedNetwork.chain.id);

  return {
    isConnected,
    isFactoryAvailable: selectedNetwork.hasFactory,
    selectedNetwork,
    wrongChain,
  };
}
