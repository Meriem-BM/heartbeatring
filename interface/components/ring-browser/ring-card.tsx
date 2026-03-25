"use client";

import Link from "next/link";
import { getAddress } from "viem";
import { useReadContracts } from "wagmi";

import { useSelectedNetwork } from "@/hooks/useSelectedNetwork";
import { heartbeatRingABI } from "@/lib/contracts/abi";
import { RING_CARD_PHASE_META } from "@/lib/ring/ui";
import { formatDuration, formatToken, truncateAddress } from "@/lib/utils/format";
import { CONTRACT_POLL_INTERVAL_MS } from "@/lib/utils/query";
import { pickResult } from "@/lib/utils/read-results";

type RingCardProps = {
  address: string;
};

export function RingCard({ address }: RingCardProps) {
  const selectedNetwork = useSelectedNetwork();
  const ringAddress = getAddress(address);
  const { data, isPending } = useReadContracts({
    allowFailure: true,
    contracts: [
      {
        address: ringAddress,
        abi: heartbeatRingABI,
        chainId: selectedNetwork.chain.id,
        functionName: "phase",
      },
      {
        address: ringAddress,
        abi: heartbeatRingABI,
        chainId: selectedNetwork.chain.id,
        functionName: "stakeAmount",
      },
      {
        address: ringAddress,
        abi: heartbeatRingABI,
        chainId: selectedNetwork.chain.id,
        functionName: "epochDuration",
      },
      {
        address: ringAddress,
        abi: heartbeatRingABI,
        chainId: selectedNetwork.chain.id,
        functionName: "totalParticipants",
      },
      {
        address: ringAddress,
        abi: heartbeatRingABI,
        chainId: selectedNetwork.chain.id,
        functionName: "ringSize",
      },
      {
        address: ringAddress,
        abi: heartbeatRingABI,
        chainId: selectedNetwork.chain.id,
        functionName: "minParticipants",
      },
      {
        address: ringAddress,
        abi: heartbeatRingABI,
        chainId: selectedNetwork.chain.id,
        functionName: "maxParticipants",
      },
      {
        address: ringAddress,
        abi: heartbeatRingABI,
        chainId: selectedNetwork.chain.id,
        functionName: "currentEpoch",
      },
    ],
    query: {
      refetchInterval: CONTRACT_POLL_INTERVAL_MS,
    },
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

  return (
    <Link
      href={{ pathname: `/ring/${ringAddress}`, query: { network: selectedNetwork.key } }}
      className="block"
    >
      <article
        className={`rounded-xl border border-gray-800 bg-gray-900 p-4 transition-colors hover:border-gray-700 ${phaseMeta.borderClass} border-l-4 ${
          phase === 2 ? "opacity-75" : ""
        }`}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${phaseMeta.badgeClass}`}
              >
                {phaseMeta.label}
              </span>
              <span className="font-mono text-sm text-gray-300">
                {truncateAddress(ringAddress)}
              </span>
              <span className="text-xs text-gray-500">{phaseMeta.hint}</span>
            </div>

            <div className="grid gap-3 text-sm text-gray-300 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-lg bg-gray-950 px-3 py-2">
                <p className="text-xs uppercase tracking-[0.18em] text-gray-500">
                  Stake
                </p>
                <p className="mt-1 font-mono text-gray-100">
                  {formatToken(
                    stakeAmount,
                    selectedNetwork.chain.nativeCurrency.symbol,
                  )}
                </p>
              </div>

              <div className="rounded-lg bg-gray-950 px-3 py-2">
                <p className="text-xs uppercase tracking-[0.18em] text-gray-500">
                  Players
                </p>
                <p className="mt-1 font-mono text-gray-100">
                  {totalParticipants.toString()} / {minParticipants.toString()}-
                  {maxParticipants.toString()}
                </p>
              </div>

              <div className="rounded-lg bg-gray-950 px-3 py-2">
                <p className="text-xs uppercase tracking-[0.18em] text-gray-500">
                  Alive
                </p>
                <p className="mt-1 font-mono text-gray-100">
                  {ringSize.toString()} alive
                </p>
              </div>

              <div className="rounded-lg bg-gray-950 px-3 py-2">
                <p className="text-xs uppercase tracking-[0.18em] text-gray-500">
                  Epoch
                </p>
                <p className="mt-1 font-mono text-gray-100">
                  {phase === 1
                    ? `Ep. ${currentEpoch.toString()}`
                    : formatDuration(epochDuration)}
                </p>
              </div>
            </div>
          </div>

          <div className="min-w-44 text-sm text-gray-400">
            <p>{formatDuration(epochDuration)} epochs</p>
            <p>{totalParticipants.toString()} registered</p>
            {isPending && <p className="text-gray-500">Loading ring data...</p>}
          </div>
        </div>
      </article>
    </Link>
  );
}
