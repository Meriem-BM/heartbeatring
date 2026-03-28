"use client";

import { getAddress } from "viem";
import { useReadContracts } from "wagmi";

import { useWalletContext } from "@/context/wallet-context";
import { useCountdown } from "@/hooks/common/useCountdown";
import { heartbeatRingABI } from "@/lib/contracts/abi";
import { GAME_STATUS_PHASE_META } from "@/lib/ring/ui";
import type { RingAddressProps } from "@/lib/types/ring";
import { CONTRACT_POLL_INTERVAL_MS } from "@/lib/utils/query";
import { pickResult } from "@/lib/utils/read-results";

export function useRingStatus({ ringAddress }: RingAddressProps) {
  const normalizedAddress = getAddress(ringAddress);
  const { selectedNetwork } = useWalletContext();

  const contractBase = {
    address: normalizedAddress,
    abi: heartbeatRingABI,
    chainId: selectedNetwork.chain.id,
  } as const;

  const { data, refetch } = useReadContracts({
    allowFailure: true,
    contracts: [
      { ...contractBase, functionName: "phase" },
      { ...contractBase, functionName: "currentEpoch" },
      { ...contractBase, functionName: "ringSize" },
      { ...contractBase, functionName: "totalParticipants" },
      { ...contractBase, functionName: "stakeAmount" },
      { ...contractBase, functionName: "timeUntilEpochEnd" },
      { ...contractBase, functionName: "registrationDeadline" },
    ],
    query: { refetchInterval: CONTRACT_POLL_INTERVAL_MS },
  });

  const phase =
    Number(pickResult(data, 0, 0)) as keyof typeof GAME_STATUS_PHASE_META;
  const currentEpoch = pickResult(data, 1, 0n);
  const ringSize = pickResult(data, 2, 0n);
  const totalParticipants = pickResult(data, 3, 0n);
  const stakeAmount = pickResult(data, 4, 0n);
  const epochCountdown = Number(pickResult(data, 5, 0n));
  const registrationDeadline = pickResult(data, 6, 0n);
  const now = BigInt(Math.floor(Date.now() / 1_000));
  const registrationCountdown = Number(
    registrationDeadline > now ? registrationDeadline - now : 0n,
  );
  const countdownValue =
    phase === 0 ? registrationCountdown : phase === 1 ? epochCountdown : 0;
  const displayCountdown = useCountdown({
    enabled: phase === 0 || phase === 1,
    onElapsed: () => {
      void refetch();
    },
    value: countdownValue,
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
