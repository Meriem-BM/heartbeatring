"use client";

import { getAddress } from "viem";
import { useReadContracts } from "wagmi";

import { useSelectedNetwork } from "@/hooks/useSelectedNetwork";
import { heartbeatRingABI } from "@/lib/contracts/abi";
import { GAME_STATUS_PHASE_META } from "@/lib/ring/ui";
import type { RingAddressProps } from "@/lib/types/ring";
import { useCountdown } from "@/hooks/useCountdown";
import { CONTRACT_POLL_INTERVAL_MS } from "@/lib/utils/query";
import { pickResult } from "@/lib/utils/read-results";

export function useRingStatus({ ringAddress }: RingAddressProps) {
  const normalizedAddress = getAddress(ringAddress);
  const selectedNetwork = useSelectedNetwork();
  const { data, refetch } = useReadContracts({
    allowFailure: true,
    contracts: [
      {
        address: normalizedAddress,
        abi: heartbeatRingABI,
        chainId: selectedNetwork.chain.id,
        functionName: "phase",
      },
      {
        address: normalizedAddress,
        abi: heartbeatRingABI,
        chainId: selectedNetwork.chain.id,
        functionName: "currentEpoch",
      },
      {
        address: normalizedAddress,
        abi: heartbeatRingABI,
        chainId: selectedNetwork.chain.id,
        functionName: "ringSize",
      },
      {
        address: normalizedAddress,
        abi: heartbeatRingABI,
        chainId: selectedNetwork.chain.id,
        functionName: "totalParticipants",
      },
      {
        address: normalizedAddress,
        abi: heartbeatRingABI,
        chainId: selectedNetwork.chain.id,
        functionName: "stakeAmount",
      },
      {
        address: normalizedAddress,
        abi: heartbeatRingABI,
        chainId: selectedNetwork.chain.id,
        functionName: "timeUntilEpochEnd",
      },
    ],
    query: {
      refetchInterval: CONTRACT_POLL_INTERVAL_MS,
    },
  });

  const phase =
    Number(pickResult(data, 0, 0)) as keyof typeof GAME_STATUS_PHASE_META;
  const currentEpoch = pickResult(data, 1, 0n);
  const ringSize = pickResult(data, 2, 0n);
  const totalParticipants = pickResult(data, 3, 0n);
  const stakeAmount = pickResult(data, 4, 0n);
  const epochCountdown = Number(pickResult(data, 5, 0n));
  const displayCountdown = useCountdown({
    enabled: phase === 1,
    onElapsed: () => {
      void refetch();
    },
    value: epochCountdown,
  });
  const phaseMeta = GAME_STATUS_PHASE_META[phase] ?? GAME_STATUS_PHASE_META[0];

  return {
    currentEpoch,
    displayCountdown,
    phase,
    phaseMeta,
    ringSize,
    stakeAmount,
    totalParticipants,
  };
}
