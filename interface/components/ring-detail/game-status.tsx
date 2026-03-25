"use client";

import { useSelectedNetwork } from "@/hooks/useSelectedNetwork";
import { useRingStatus } from "@/hooks/useRingStatus";
import { formatCountdown, formatToken } from "@/lib/utils/format";
import type { RingAddressProps } from "@/lib/types/ring";

export function GameStatus({ ringAddress }: RingAddressProps) {
  const selectedNetwork = useSelectedNetwork();
  const {
    currentEpoch,
    displayCountdown,
    phase,
    phaseMeta,
    ringSize,
    stakeAmount,
    totalParticipants,
  } = useRingStatus({ ringAddress });

  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`rounded-full px-3 py-1 text-sm font-medium ${phaseMeta.badgeClass}`}
          >
            {phaseMeta.label}
          </span>
          <span className="font-mono text-sm text-gray-300">
            Epoch {currentEpoch.toString()}
          </span>
          <span className="font-mono text-sm text-gray-300">
            {ringSize.toString()} alive / {totalParticipants.toString()} registered
          </span>
          <span className="font-mono text-sm text-gray-300">
            {formatToken(
              stakeAmount,
              selectedNetwork.chain.nativeCurrency.symbol,
            )}
          </span>
        </div>

        <div className="rounded-xl border border-gray-800 bg-gray-950 px-4 py-3 text-right">
          <p className="text-xs uppercase tracking-[0.2em] text-gray-500">
            Next Epoch
          </p>
          <p className="mt-1 font-mono text-lg text-gray-100">
            {phase === 1 ? formatCountdown(displayCountdown) : "--:--"}
          </p>
        </div>
      </div>

      <p className="mt-4 text-sm text-gray-400">{phaseMeta.footer}</p>
    </section>
  );
}
