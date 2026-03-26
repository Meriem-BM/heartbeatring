"use client";

import { useEffect, useMemo, useState } from "react";
import { getAddress, zeroAddress } from "viem";
import type { Address } from "viem";
import { usePublicClient, useReadContracts } from "wagmi";

import { useWalletContext } from "@/context/wallet-context";
import { createLogsPublicClientForNetwork } from "@/lib/chain/config";
import { heartbeatRingABI } from "@/lib/contracts/abi";
import { getRegisteredAddressesFromLogs } from "@/lib/ring/logs";
import type { ParticipantData, RingAddressProps } from "@/lib/types/ring";
import { getErrorMessage, LOGS_UNAVAILABLE_MESSAGE } from "@/lib/utils/errors";
import { CONTRACT_POLL_INTERVAL_MS, LOGS_FROM_BLOCK } from "@/lib/utils/query";
import { pickResult } from "@/lib/utils/read-results";

export function useRegisteredRingAddresses({
  ringAddress,
}: RingAddressProps) {
  const normalizedAddress = getAddress(ringAddress);
  const { selectedNetwork } = useWalletContext();
  const publicClient = usePublicClient({ chainId: selectedNetwork.chain.id });
  const logsClient = useMemo(
    () => createLogsPublicClientForNetwork(selectedNetwork.key),
    [selectedNetwork.key],
  );
  const { data: registrationReads } = useReadContracts({
    allowFailure: true,
    contracts: [
      {
        address: normalizedAddress,
        abi: heartbeatRingABI,
        chainId: selectedNetwork.chain.id,
        functionName: "phase",
      },
      {
        address: normalizedAddress,
        abi: heartbeatRingABI,
        chainId: selectedNetwork.chain.id,
        functionName: "ringHead",
      },
      {
        address: normalizedAddress,
        abi: heartbeatRingABI,
        chainId: selectedNetwork.chain.id,
        functionName: "totalParticipants",
      },
    ],
    query: {
      refetchInterval: CONTRACT_POLL_INTERVAL_MS,
    },
  });
  const [registrationAddresses, setRegistrationAddresses] = useState<Address[]>([]);
  const [historicalAddresses, setHistoricalAddresses] = useState<Address[]>([]);

  const phase = Number(pickResult(registrationReads, 0, 0));
  const ringHead = pickResult<Address>(registrationReads, 1, zeroAddress);
  const totalParticipants = Number(pickResult(registrationReads, 2, 0n));

  useEffect(() => {
    setRegistrationAddresses([]);
    setHistoricalAddresses([]);
  }, [normalizedAddress, selectedNetwork.key]);

  useEffect(() => {
    let cancelled = false;
    let interval: number | undefined;

    async function loadRegisteredPlayers() {
      if (!publicClient || phase !== 0) {
        return;
      }

      if (ringHead === zeroAddress || totalParticipants === 0) {
        if (!cancelled) {
          setRegistrationAddresses([]);
        }
        return;
      }

      try {
        const addresses: Address[] = [];
        let cursor = ringHead;
        let remaining = totalParticipants;

        // Reconstruct registration order from the temporary linked list.
        while (cursor !== zeroAddress && remaining > 0) {
          addresses.push(cursor);

          const participant = (await publicClient.readContract({
            address: normalizedAddress,
            abi: heartbeatRingABI,
            functionName: "participants",
            args: [cursor],
          })) as ParticipantData;

          cursor = participant[0] === zeroAddress ? zeroAddress : getAddress(participant[0]);
          remaining -= 1;
        }

        if (!cancelled) {
          setRegistrationAddresses(addresses);
        }
      } catch {
        if (!cancelled) {
          setRegistrationAddresses([]);
        }
      }
    }

    void loadRegisteredPlayers();

    if (publicClient && phase === 0) {
      interval = window.setInterval(() => {
        void loadRegisteredPlayers();
      }, CONTRACT_POLL_INTERVAL_MS);
    }

    return () => {
      cancelled = true;

      if (interval) {
        window.clearInterval(interval);
      }
    };
  }, [
    normalizedAddress,
    phase,
    publicClient,
    ringHead,
    selectedNetwork.chain.id,
    totalParticipants,
  ]);

  useEffect(() => {
    let cancelled = false;
    let logsUnavailable = false;
    let lastProcessedBlock: bigint | null = null;

    async function loadRegisteredFromLogs() {
      if (logsUnavailable) return;

      try {
        const latestBlock = await logsClient.getBlockNumber();
        const fromBlock =
          lastProcessedBlock === null ? LOGS_FROM_BLOCK : lastProcessedBlock + 1n;

        if (fromBlock > latestBlock) {
          lastProcessedBlock = latestBlock;
          return;
        }

        const logs = await logsClient.getLogs({
          address: normalizedAddress,
          fromBlock,
          toBlock: latestBlock,
        });
        const nextAddresses = getRegisteredAddressesFromLogs(logs);

        if (!cancelled && nextAddresses.length > 0) {
          setHistoricalAddresses((current) => {
            if (current.length === 0) return nextAddresses;

            const seen = new Set(current.map((address) => address.toLowerCase()));
            const merged = [...current];

            for (const address of nextAddresses) {
              const normalized = getAddress(address);
              const key = normalized.toLowerCase();

              if (!seen.has(key)) {
                seen.add(key);
                merged.push(normalized);
              }
            }

            return merged;
          });
        }

        lastProcessedBlock = latestBlock;
      } catch (error) {
        if (getErrorMessage(error) === LOGS_UNAVAILABLE_MESSAGE) {
          logsUnavailable = true;
        }
      }
    }

    void loadRegisteredFromLogs();

    const interval = window.setInterval(() => {
      void loadRegisteredFromLogs();
    }, CONTRACT_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [logsClient, normalizedAddress]);

  if (phase === 0) {
    return registrationAddresses;
  }

  if (historicalAddresses.length > 0) {
    return historicalAddresses;
  }

  return registrationAddresses;
}
