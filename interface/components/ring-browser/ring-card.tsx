"use client";

import Link from "next/link";

import { useRingCard } from "@/hooks/ring/useRingCard";
import { truncateAddress } from "@/lib/utils/format";

type RingCardProps = {
  address: string;
};

export function RingCard({ address }: RingCardProps) {
  const {
    epochLength,
    href,
    isCompleted,
    isPending,
    metricItems,
    phaseMeta,
    ringAddress,
    totalParticipantsLabel,
  } = useRingCard({ address });

  return (
    <Link href={href} className="block">
      <article
        className={`rounded-xl border border-gray-800 bg-gray-900 p-5 transition-colors hover:border-gray-700 hover:bg-gray-900/90 ${
          isCompleted ? "opacity-75" : ""
        }`}
      >
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-[11px] uppercase tracking-[0.22em] text-gray-500">
                Heartbeat Ring
              </p>
              <p className="font-mono text-sm text-gray-200">
                {truncateAddress(ringAddress)}
              </p>
              <p className="text-xs text-gray-500">{phaseMeta.hint}</p>
            </div>

            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${phaseMeta.badgeClass}`}
            >
              {phaseMeta.label}
            </span>
          </div>

          <dl className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
            {metricItems.map((item) => (
              <div
                key={item.label}
                className="rounded-lg border border-gray-800 bg-gray-950/70 px-3 py-2.5"
              >
                <dt className="text-[11px] uppercase tracking-[0.18em] text-gray-500">
                  {item.label}
                </dt>
                <dd className="mt-1 font-mono text-sm text-gray-100">{item.value}</dd>
                <p className="mt-1 text-xs text-gray-500">{item.detail}</p>
              </div>
            ))}
          </dl>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-800 pt-3 text-xs text-gray-400">
            <p>Epoch length: {epochLength}</p>
            <p>{totalParticipantsLabel}</p>
            {isPending && <p className="text-gray-500">Refreshing ring data...</p>}
          </div>
        </div>
      </article>
    </Link>
  );
}
