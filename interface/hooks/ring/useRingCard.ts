"use client";

import { getAddress } from "viem";
import { useReadContracts } from "wagmi";

import { useWalletContext } from "@/context/wallet-context";
import { heartbeatRingABI } from "@/lib/contracts/abi";
import { RING_CARD_PHASE_META } from "@/lib/ring/ui";
import { formatDuration, formatToken } from "@/lib/utils/format";
import { CONTRACT_POLL_INTERVAL_MS } from "@/lib/utils/query";
import { pickResult } from "@/lib/utils/read-results";

type UseRingCardProps = {
  address: string;
};

type RingCardMetricItem = {
  detail: string;
  label: string;
  value: string;
};

export function useRingCard({ address }: UseRingCardProps) {
  const { selectedNetwork } = useWalletContext();
  const ringAddress = getAddress(address);

  const contractBase = {
    address: ringAddress,
    abi: heartbeatRingABI,
    chainId: selectedNetwork.chain.id,
  } as const;

  const { data, isPending } = useReadContracts({
    allowFailure: true,
    contracts: [
      { ...contractBase, functionName: "phase" },
      { ...contractBase, functionName: "stakeAmount" },
      { ...contractBase, functionName: "epochDuration" },
      { ...contractBase, functionName: "totalParticipants" },
      { ...contractBase, functionName: "ringSize" },
      { ...contractBase, functionName: "minParticipants" },
      { ...contractBase, functionName: "maxParticipants" },
      { ...contractBase, functionName: "currentEpoch" },
    ],
    query: { refetchInterval: CONTRACT_POLL_INTERVAL_MS },
  });

  const phase = Number(pickResult(data, 0, 0)) as keyof typeof RING_CARD_PHASE_META;
  const stakeAmount = pickResult(data, 1, 0n);
  const epochDuration = pickResult(data, 2, 0n);
  const totalParticipants = pickResult(data, 3, 0n);
  const ringSize = pickResult(data, 4, 0n);
  const minParticipants = pickResult(data, 5, 0n);
  const maxParticipants = pickResult(data, 6, 0n);
  const currentEpoch = pickResult(data, 7, 0n);
  const phaseMeta = RING_CARD_PHASE_META[phase] ?? RING_CARD_PHASE_META[0];
  const epochLength = formatDuration(epochDuration);

  const metricItems = [
    {
      label: "Stake",
      value: formatToken(stakeAmount, selectedNetwork.chain.nativeCurrency.symbol),
      detail: "Entry amount",
    },
    {
      label: "Players",
      value: `${totalParticipants.toString()} registered`,
      detail: `${minParticipants.toString()}-${maxParticipants.toString()} slots`,
    },
    {
      label: "Alive",
      value: `${ringSize.toString()} players`,
      detail: "Current ring size",
    },
    {
      label: "Epoch",
      value:
        phase === 1
          ? `Epoch ${currentEpoch.toString()}`
          : phase === 0
            ? "Not started"
            : "Complete",
      detail: `Every ${epochLength}`,
    },
  ] as const satisfies readonly RingCardMetricItem[];

  return {
    epochLength,
    href: {
      pathname: `/ring/${ringAddress}`,
      query: { network: selectedNetwork.key },
    },
    isCompleted: phase === 2,
    isPending,
    metricItems,
    phaseMeta,
    ringAddress,
    totalParticipantsLabel: `${totalParticipants.toString()} participants total`,
  };
}
