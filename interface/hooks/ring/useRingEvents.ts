"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";
import { getAddress } from "viem";

import { useWalletContext } from "@/context/wallet-context";
import { createLogsPublicClientForNetwork } from "@/lib/chain/config";
import { buildEventEntries, mergeEventEntries } from "@/lib/ring/logs";
import { fetchRingEventEntriesFromSubgraph } from "@/lib/subgraph/events";
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

  useEffect(() => {
    lastProcessedBlockRef.current = null;
    logsUnavailableRef.current = false;
    accumulatedEntriesRef.current = [];
  }, [normalizedAddress, selectedNetwork.key]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["ringEvents", normalizedAddress, selectedNetwork.key],
    queryFn: async () => {
      let subgraphError: unknown = null;
      let subgraphEntries: EventEntry[] | null = null;

      if (selectedNetwork.subgraphUrl) {
        try {
          subgraphEntries = await fetchRingEventEntriesFromSubgraph({
            endpoint: selectedNetwork.subgraphUrl,
            ringAddress: normalizedAddress,
            tokenSymbol: selectedNetwork.chain.nativeCurrency.symbol,
          });
        } catch (error) {
          subgraphError = error;
        }
      }

      const baseEntries =
        subgraphEntries && subgraphEntries.length > 0
          ? mergeEventEntries(accumulatedEntriesRef.current, subgraphEntries)
          : accumulatedEntriesRef.current;

      if (logsUnavailableRef.current) {
        if (baseEntries.length > 0) {
          accumulatedEntriesRef.current = baseEntries;
          return baseEntries;
        }

        if (subgraphError) {
          throw subgraphError;
        }

        if (!selectedNetwork.subgraphUrl) {
          throw new Error(LOGS_UNAVAILABLE_MESSAGE);
        }

        return baseEntries;
      }

      try {
        const latestBlock = await publicClient.getBlockNumber();
        const fromBlock =
          lastProcessedBlockRef.current === null
            ? LOGS_FROM_BLOCK
            : lastProcessedBlockRef.current + 1n;

        if (fromBlock > latestBlock) {
          lastProcessedBlockRef.current = latestBlock;
          accumulatedEntriesRef.current = baseEntries;
          return baseEntries;
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

        const merged = mergeEventEntries(baseEntries, nextEntries);

        lastProcessedBlockRef.current = latestBlock;
        accumulatedEntriesRef.current = merged;
        return merged;
      } catch (error) {
        if (getErrorMessage(error) === LOGS_UNAVAILABLE_MESSAGE) {
          logsUnavailableRef.current = true;

          if (!subgraphError) {
            throw new Error(LOGS_UNAVAILABLE_MESSAGE);
          }
        }

        if (baseEntries.length > 0) {
          accumulatedEntriesRef.current = baseEntries;
          return baseEntries;
        }

        if (subgraphError) {
          const message = getErrorMessage(
            subgraphError,
            "Failed to load events from subgraph.",
          );
          throw new Error(message);
        }

        throw error;
      }
    },
    refetchInterval: CONTRACT_POLL_INTERVAL_MS,
  });

  const loadError = error ? getErrorMessage(error, "Failed to load events.") : null;

  return {
    entries: data ?? accumulatedEntriesRef.current,
    loadError,
    loading: isLoading,
  };
}
