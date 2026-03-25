"use client";

import { useMemo } from "react";
import { getAddress } from "viem";
import type { Address } from "viem";
import { useReadContract, useReadContracts } from "wagmi";

import { useSelectedNetwork } from "@/hooks/useSelectedNetwork";
import { useRegisteredRingAddresses } from "@/hooks/useRegisteredRingAddresses";
import { heartbeatRingABI } from "@/lib/contracts/abi";
import type { RingNode } from "@/lib/ring/visualizer";
import type { ParticipantData, RingAddressProps } from "@/lib/types/ring";
import { CONTRACT_POLL_INTERVAL_MS } from "@/lib/utils/query";
import { pickResult } from "@/lib/utils/read-results";

export function useRingVisualizerData({ ringAddress }: RingAddressProps) {
  const normalizedAddress = getAddress(ringAddress);
  const selectedNetwork = useSelectedNetwork();
  const registeredAddresses = useRegisteredRingAddresses({ ringAddress });

  const { data: phaseData } = useReadContract({
    address: normalizedAddress,
    abi: heartbeatRingABI,
    chainId: selectedNetwork.chain.id,
    functionName: "phase",
    query: {
      refetchInterval: CONTRACT_POLL_INTERVAL_MS,
    },
  });

  const { data: aliveRing } = useReadContract({
    address: normalizedAddress,
    abi: heartbeatRingABI,
    chainId: selectedNetwork.chain.id,
    functionName: "getRing",
    query: {
      refetchInterval: CONTRACT_POLL_INTERVAL_MS,
    },
  });

  const orderedAddresses = useMemo(
    () => {
      const aliveAddresses = ((aliveRing ?? []) as Address[]).map((address) =>
        getAddress(address),
      );

      if (registeredAddresses.length === 0) {
        return aliveAddresses;
      }

      const seen = new Set(
        registeredAddresses.map((address) => address.toLowerCase()),
      );
      const merged = [...registeredAddresses];

      for (const address of aliveAddresses) {
        const key = address.toLowerCase();

        if (!seen.has(key)) {
          seen.add(key);
          merged.push(address);
        }
      }

      return merged;
    },
    [aliveRing, registeredAddresses],
  );

  const { data: participantReads } = useReadContracts({
    allowFailure: true,
    contracts: orderedAddresses.map((address) => ({
      address: normalizedAddress,
      abi: heartbeatRingABI,
      chainId: selectedNetwork.chain.id,
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
      address: normalizedAddress,
      abi: heartbeatRingABI,
      chainId: selectedNetwork.chain.id,
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
