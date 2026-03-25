"use client";

import { useEffect, useMemo, useState } from "react";
import { getAddress } from "viem";

import { useSelectedNetwork } from "@/hooks/useSelectedNetwork";
import { createLogsPublicClientForNetwork } from "@/lib/chain/config";
import { buildEventEntries, mergeEventEntries } from "@/lib/ring/logs";
import type { EventEntry, RawLog, RingAddressProps } from "@/lib/types/ring";
import {
  getErrorMessage,
  LOGS_UNAVAILABLE_MESSAGE,
} from "@/lib/utils/errors";
import { CONTRACT_POLL_INTERVAL_MS, LOGS_FROM_BLOCK } from "@/lib/utils/query";

export function useRingEvents({ ringAddress }: RingAddressProps) {
  const normalizedAddress = getAddress(ringAddress);
  const selectedNetwork = useSelectedNetwork();
  const publicClient = useMemo(
    () => createLogsPublicClientForNetwork(selectedNetwork.key),
    [selectedNetwork.key],
  );
  const [entries, setEntries] = useState<EventEntry[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setEntries([]);
    setLoadError(null);
    setLoading(true);

    let cancelled = false;
    let logsUnavailable = false;
    let initialized = false;
    let lastProcessedBlock: bigint | null = null;

    async function loadEvents() {
      if (!initialized && !cancelled) {
        setLoading(true);
      }

      try {
        const latestBlock = await publicClient.getBlockNumber();
        const fromBlock =
          lastProcessedBlock === null ? LOGS_FROM_BLOCK : lastProcessedBlock + 1n;

        if (fromBlock > latestBlock) {
          lastProcessedBlock = latestBlock;
          return;
        }

        const logs = await publicClient.getLogs({
          address: normalizedAddress,
          fromBlock,
          toBlock: latestBlock,
        });

        if (!cancelled) {
          const nextEntries = buildEventEntries(
            logs as RawLog[],
            selectedNetwork.chain.nativeCurrency.symbol,
          );
          setEntries((current) => mergeEventEntries(current, nextEntries));
          setLoadError(null);
        }

        lastProcessedBlock = latestBlock;
      } catch (error) {
        const nextError = getErrorMessage(error, "Failed to load events.");

        if (nextError === LOGS_UNAVAILABLE_MESSAGE) {
          logsUnavailable = true;
        }

        if (!cancelled) {
          setLoadError(nextError);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }

        initialized = true;
      }
    }

    void loadEvents();

    const interval = window.setInterval(() => {
      if (!logsUnavailable) {
        void loadEvents();
      }
    }, CONTRACT_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;

      window.clearInterval(interval);
    };
  }, [normalizedAddress, publicClient, selectedNetwork.chain.nativeCurrency.symbol]);

  return {
    entries,
    loadError,
    loading,
  };
}
