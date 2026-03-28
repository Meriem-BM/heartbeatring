import { decodeEventLog, getAddress } from "viem";
import type { Address, Hex } from "viem";

import { heartbeatRingABI } from "@/lib/contracts/abi";
import { formatToken, truncateAddress } from "@/lib/utils/format";
import { EVENT_LOG_LIMIT } from "@/lib/ring/ui";
import type { EventEntry, RawLog } from "@/lib/types/ring";

function resolveAddress(args: Record<string, unknown>, field: string) {
  if (typeof args[field] !== "string") return null;
  return truncateAddress(getAddress(args[field]));
}

function sortEntries(entries: readonly EventEntry[]) {
  return [...entries].sort((left, right) => {
    if (left.blockNumber !== right.blockNumber) {
      return Number(right.blockNumber - left.blockNumber);
    }

    return right.logIndex - left.logIndex;
  });
}

export function buildEventEntries(logs: readonly RawLog[], tokenSymbol: string) {
  return sortEntries(
    logs.flatMap((log) => {
      try {
        const decoded = decodeEventLog({
          abi: heartbeatRingABI,
          data: log.data,
          topics: [...log.topics] as [Hex, ...Hex[]],
          strict: false,
        });

        const args = decoded.args as Record<string, unknown>;
        const base = {
          blockNumber: log.blockNumber ?? 0n,
          id: `${log.transactionHash ?? "pending"}-${log.logIndex ?? 0}-${decoded.eventName}`,
          logIndex: log.logIndex ?? 0,
        };

        switch (decoded.eventName) {
          case "Registered": {
            const addr = resolveAddress(args, "participant");
            if (!addr) return [];
            return [{ ...base, colorClass: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200", message: `${addr} joined the ring.` }];
          }
          case "RingFormed":
            return [
              {
                ...base,
                colorClass:
                  "border-yellow-500/30 bg-yellow-500/10 text-yellow-100",
                message: `Ring formed with ${(args.participants as bigint).toString()} participants.`,
              },
            ];
          case "Heartbeat": {
            const addr = resolveAddress(args, "participant");
            if (!addr) return [];
            return [{ ...base, colorClass: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200", message: `${addr} sent heartbeat for epoch ${(args.epoch as bigint).toString()}.` }];
          }
          case "Liquidated": {
            const addr = resolveAddress(args, "target");
            if (!addr) return [];
            return [{ ...base, colorClass: "border-red-500/30 bg-red-500/10 text-red-200", message: `${addr} was liquidated in epoch ${(args.epoch as bigint).toString()}.` }];
          }
          case "RingRelinked":
            return [
              {
                ...base,
                colorClass:
                  "border-yellow-500/30 bg-yellow-500/10 text-yellow-100",
                message: `Ring relinked. ${(args.ringSize as bigint).toString()} players remain alive.`,
              },
            ];
          case "GameOver":
            return [
              {
                ...base,
                colorClass:
                  "border-yellow-500/30 bg-yellow-500/10 text-yellow-100",
                message: `Game over. Pool ${formatToken(args.totalPool as bigint, tokenSymbol)}.`,
              },
            ];
          case "Claimed": {
            const addr = resolveAddress(args, "survivor");
            if (!addr) return [];
            return [{ ...base, colorClass: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200", message: `${addr} claimed ${formatToken(args.amount as bigint, tokenSymbol)}.` }];
          }
          case "BountyAccrued": {
            const addr = resolveAddress(args, "liquidator");
            if (!addr) return [];
            return [{ ...base, colorClass: "border-yellow-500/30 bg-yellow-500/10 text-yellow-100", message: `${addr} earned ${formatToken(args.amount as bigint, tokenSymbol)} bounty.` }];
          }
          case "BountyWithdrawn": {
            const addr = resolveAddress(args, "liquidator");
            if (!addr) return [];
            return [{ ...base, colorClass: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200", message: `${addr} withdrew ${formatToken(args.amount as bigint, tokenSymbol)} bounty.` }];
          }
          case "RegistrationRefunded": {
            const addr = resolveAddress(args, "participant");
            if (!addr) return [];
            return [{ ...base, colorClass: "border-red-500/30 bg-red-500/10 text-red-200", message: `${addr} received a registration refund.` }];
          }
          case "Initialized": {
            const addr = resolveAddress(args, "creator");
            if (!addr) return [];
            return [{ ...base, colorClass: "border-yellow-500/30 bg-yellow-500/10 text-yellow-100", message: `Ring initialized by ${addr}.` }];
          }
          default:
            return [];
        }
      } catch {
        return [];
      }
    }),
  ).slice(0, EVENT_LOG_LIMIT);
}

export function mergeEventEntries(
  currentEntries: readonly EventEntry[],
  nextEntries: readonly EventEntry[],
) {
  const combined = new Map<string, EventEntry>();

  for (const entry of [...nextEntries, ...currentEntries]) {
    combined.set(entry.id, entry);
  }

  return sortEntries([...combined.values()]).slice(0, EVENT_LOG_LIMIT);
}

export function getRegisteredAddressesFromLogs(logs: readonly RawLog[]) {
  return logs
    .flatMap((log) => {
      try {
        const decoded = decodeEventLog({
          abi: heartbeatRingABI,
          data: log.data as Hex,
          topics: [...log.topics] as [Hex, ...Hex[]],
          strict: false,
        });

        if (decoded.eventName !== "Registered") return [];

        const args = decoded.args as {
          participant?: string;
          position?: bigint;
        };

        if (!args.participant || args.position === undefined) return [];

        return [
          {
            address: getAddress(args.participant),
            position: Number(args.position),
          },
        ];
      } catch {
        return [];
      }
    })
    .sort((left, right) => left.position - right.position)
    .map((entry) => entry.address as Address);
}
