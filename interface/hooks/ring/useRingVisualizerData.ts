"use client";

import { useMemo } from "react";
import { getAddress } from "viem";
import type { Address } from "viem";
import { useReadContract, useReadContracts } from "wagmi";

import { useWalletContext } from "@/context/wallet-context";
import { useRegisteredRingAddresses } from "@/hooks/ring/useRegisteredRingAddresses";
import { heartbeatRingABI } from "@/lib/contracts/abi";
import type { RingNode } from "@/lib/ring/visualizer";
import type { ParticipantData, RingAddressProps } from "@/lib/types/ring";
import { mergeUniqueAddresses } from "@/lib/utils/address";
import { CONTRACT_POLL_INTERVAL_MS } from "@/lib/utils/query";
import { pickResult } from "@/lib/utils/read-results";

export function useRingVisualizerData({ ringAddress }: RingAddressProps) {
  const normalizedAddress = getAddress(ringAddress);
  const { selectedNetwork } = useWalletContext();
  const registeredAddresses = useRegisteredRingAddresses({ ringAddress });

  const contractBase = {
    address: normalizedAddress,
    abi: heartbeatRingABI,
    chainId: selectedNetwork.chain.id,
  } as const;

  const { data: phaseData } = useReadContract({
    ...contractBase,
    functionName: "phase",
    query: { refetchInterval: CONTRACT_POLL_INTERVAL_MS },
  });

  const { data: aliveRing } = useReadContract({
    ...contractBase,
    functionName: "getRing",
    query: { refetchInterval: CONTRACT_POLL_INTERVAL_MS },
  });

  const orderedAddresses = useMemo(() => {
    const aliveAddresses = ((aliveRing ?? []) as Address[]).map((a) => getAddress(a));
    return mergeUniqueAddresses(registeredAddresses, aliveAddresses);
  }, [aliveRing, registeredAddresses]);

  const { data: participantReads } = useReadContracts({
    allowFailure: true,
    contracts: orderedAddresses.map((address) => ({
      ...contractBase,
      functionName: "participants" as const,
      args: [address],
    })),
    query: {
      enabled: orderedAddresses.length > 0,
      refetchInterval: CONTRACT_POLL_INTERVAL_MS,
    },
  });

  const { data: delinquentReads } = useReadContracts({
    allowFailure: true,
    contracts: orderedAddresses.map((address) => ({
      ...contractBase,
      functionName: "isDelinquent" as const,
      args: [address],
    })),
    query: {
      enabled: orderedAddresses.length > 0,
      refetchInterval: CONTRACT_POLL_INTERVAL_MS,
    },
  });

  const phase = Number(phaseData ?? 0);

  const nodes = useMemo(
    () =>
      orderedAddresses.map((address, index) => {
        const participant = pickResult<ParticipantData | undefined>(
          participantReads,
          index,
          undefined,
        );

        return {
          address,
          alive: participant?.[4] ?? false,
          stake: participant?.[2] ?? 0n,
          delinquent: Boolean(pickResult(delinquentReads, index, false)),
        } satisfies RingNode;
      }),
    [delinquentReads, orderedAddresses, participantReads],
  );

  const activeNodes = useMemo(
    () => nodes.filter((node) => node.alive),
    [nodes],
  );

  return {
    activeNodes,
    nodes,
    phase,
  };
}
