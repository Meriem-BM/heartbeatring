"use client";

import { useRingEvents } from "@/hooks/useRingEvents";
import { EVENT_LOG_LIMIT } from "@/lib/ring/ui";
import type { RingAddressProps } from "@/lib/types/ring";

export function EventLog({ ringAddress }: RingAddressProps) {
  const { entries, loadError, loading } = useRingEvents({ ringAddress });

  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-lg font-medium text-gray-100">Event Log</p>
          <p className="mt-2 text-sm text-gray-400">
            Live contract activity, newest first.
          </p>
        </div>
        <span className="rounded-full border border-gray-800 bg-gray-950 px-2 py-1 text-xs text-gray-500">
          max {EVENT_LOG_LIMIT}
        </span>
      </div>

      <div className="mt-5 max-h-[30rem] space-y-2 overflow-y-auto pr-1">
        {loading && entries.length === 0 && (
          <div className="rounded-lg border border-gray-800 bg-gray-950 px-3 py-4 text-sm text-gray-400">
            Loading events...
          </div>
        )}

        {loadError && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-4 text-sm text-red-200">
            {loadError}
          </div>
        )}

        {!loading && !loadError && entries.length === 0 && (
          <div className="rounded-lg border border-gray-800 bg-gray-950 px-3 py-4 text-sm text-gray-400">
            No events yet.
          </div>
        )}

        {entries.map((entry) => (
          <article
            key={entry.id}
            className={`rounded-lg border px-3 py-3 text-sm ${entry.colorClass}`}
          >
            {entry.message}
          </article>
        ))}
      </div>
    </section>
  );
}
