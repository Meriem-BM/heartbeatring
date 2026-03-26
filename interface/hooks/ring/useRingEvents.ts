"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useRef } from "react";
import { getAddress } from "viem";

import { useWalletContext } from "@/context/wallet-context";
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
  const { selectedNetwork } = useWalletContext();
  const publicClient = useMemo(
    () => createLogsPublicClientForNetwork(selectedNetwork.key),
    [selectedNetwork.key],
  );
  const lastProcessedBlockRef = useRef<bigint | null>(null);
  const logsUnavailableRef = useRef(false);
  const accumulatedEntriesRef = useRef<EventEntry[]>([]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["ringEvents", normalizedAddress, selectedNetwork.key],
    queryFn: async () => {
      if (logsUnavailableRef.current) {
        return accumulatedEntriesRef.current;
      }

      const latestBlock = await publicClient.getBlockNumber();
      const fromBlock =
        lastProcessedBlockRef.current === null
          ? LOGS_FROM_BLOCK
          : lastProcessedBlockRef.current + 1n;

      if (fromBlock > latestBlock) {
        lastProcessedBlockRef.current = latestBlock;
        return accumulatedEntriesRef.current;
      }

      const logs = await publicClient.getLogs({
        address: normalizedAddress,
        fromBlock,
        toBlock: latestBlock,
      });

      const nextEntries = buildEventEntries(
        logs as RawLog[],
        selectedNetwork.chain.nativeCurrency.symbol,
      );

      const merged = mergeEventEntries(
        accumulatedEntriesRef.current,
        nextEntries,
      );

      lastProcessedBlockRef.current = latestBlock;
      accumulatedEntriesRef.current = merged;
      return merged;
    },
    refetchInterval: CONTRACT_POLL_INTERVAL_MS,
    meta: {
      onSettled: (_data: unknown, queryError: unknown) => {
        if (
          queryError &&
          getErrorMessage(queryError) === LOGS_UNAVAILABLE_MESSAGE
        ) {
          logsUnavailableRef.current = true;
        }
      },
    },
  });

  const loadError =
    error && !logsUnavailableRef.current
      ? getErrorMessage(error, "Failed to load events.")
      : null;

  return {
    entries: data ?? accumulatedEntriesRef.current,
    loadError,
    loading: isLoading,
  };
}
