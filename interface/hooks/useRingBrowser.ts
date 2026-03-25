"use client";

import { useMemo } from "react";
import { useReadContract, useReadContracts } from "wagmi";

import { useSelectedNetwork } from "@/hooks/useSelectedNetwork";
import { factoryABI, heartbeatRingABI } from "@/lib/contracts/abi";
import { normalizeRingAddresses, sortRingAddressesByPhase } from "@/lib/ring/browser";
import { getQueryErrorMessage } from "@/lib/utils/errors";
import { CONTRACT_POLL_INTERVAL_MS } from "@/lib/utils/query";

export function useRingBrowser() {
  const selectedNetwork = useSelectedNetwork();
  const {
    data: ringsData,
    error,
    isLoading,
  } = useReadContract({
    address: selectedNetwork.factoryAddress,
    abi: factoryABI,
    chainId: selectedNetwork.chain.id,
    functionName: "getAllRings",
    query: {
      enabled: selectedNetwork.hasFactory,
      refetchInterval: CONTRACT_POLL_INTERVAL_MS,
    },
  });

  const ringAddresses = useMemo(
    () => normalizeRingAddresses(ringsData),
    [ringsData],
  );

  const { data: phaseReads } = useReadContracts({
    allowFailure: true,
    contracts: ringAddresses.map((ringAddress) => ({
      address: ringAddress,
      abi: heartbeatRingABI,
      chainId: selectedNetwork.chain.id,
      functionName: "phase" as const,
    })),
    query: {
      enabled: ringAddresses.length > 0,
      refetchInterval: CONTRACT_POLL_INTERVAL_MS,
    },
  });

  const sortedRingAddresses = useMemo(
    () => sortRingAddressesByPhase(ringAddresses, phaseReads),
    [phaseReads, ringAddresses],
  );

  return {
    errorMessage: error ? getQueryErrorMessage(error, "Failed to load rings.") : null,
    isLoading,
    ringAddresses,
    sortedRingAddresses,
  };
}
