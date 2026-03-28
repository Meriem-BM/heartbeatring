"use client";

import { Notice } from "@/components/ui/notice";
import { useWalletContext } from "@/context/wallet-context";

export function NetworkSupportWarning() {
  const { selectedNetwork } = useWalletContext();

  if (selectedNetwork.key !== "mainnet") {
    return null;
  }

  return (
    <Notice tone="warning" variant="banner">
      Mainnet is not supported yet. Switch to Rootstock Testnet from the
      header network selector.
    </Notice>
  );
}
