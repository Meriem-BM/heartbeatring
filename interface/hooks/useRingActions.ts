"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getAddress, isAddress } from "viem";
import type { Address } from "viem";
import {
  useReadContract,
  useReadContracts,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";

import { useWalletContext } from "@/context/wallet-context";
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork";
import { heartbeatRingABI } from "@/lib/contracts/abi";
import { ACTION_SUCCESS_MESSAGES, type ActionKind } from "@/lib/ring/ui";
import type { ParticipantData, RingAddressProps } from "@/lib/types/ring";
import { getErrorMessage } from "@/lib/utils/errors";
import { CONTRACT_POLL_INTERVAL_MS } from "@/lib/utils/query";
import { pickResult } from "@/lib/utils/read-results";

type UseRingActionsResult = {
  actionError: string | null;
  busy: boolean;
  currentEpoch: bigint;
  delinquentAddresses: Address[];
  heartbeatSent: boolean;
  inRing: boolean;
  isConnected: boolean;
  minParticipants: bigint;
  pendingBounty: bigint;
  phase: number;
  registrationExpired: boolean;
  runAction: (action: ActionKind) => Promise<void>;
  networkLabel: string;
  setTargetAddress: (value: string) => void;
  stakeAmount: bigint;
  successMessage: string | null;
  targetAddress: string;
  totalParticipants: bigint;
  tokenSymbol: string;
  walletStake: bigint;
  wrongChain: boolean;
};

export function useRingActions({
  ringAddress,
}: RingAddressProps): UseRingActionsResult {
  const normalizedAddress = getAddress(ringAddress);
  const queryClient = useQueryClient();
  const selectedNetwork = useSelectedNetwork();
  const { address: connectedAddress, isChainMatched, isConnected } =
    useWalletContext();
  const { writeContractAsync, isPending: isWriting } = useWriteContract();

  const [targetAddress, setTargetAddress] = useState("");
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [activeAction, setActiveAction] = useState<ActionKind | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      chainId: selectedNetwork.chain.id,
      hash: txHash,
      query: {
        enabled: Boolean(txHash),
      },
    });

  const { data: coreReads } = useReadContracts({
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
        functionName: "stakeAmount",
      },
      {
        address: normalizedAddress,
        abi: heartbeatRingABI,
        chainId: selectedNetwork.chain.id,
        functionName: "totalParticipants",
      },
      {
        address: normalizedAddress,
        abi: heartbeatRingABI,
        chainId: selectedNetwork.chain.id,
        functionName: "minParticipants",
      },
      {
        address: normalizedAddress,
        abi: heartbeatRingABI,
        chainId: selectedNetwork.chain.id,
        functionName: "currentEpoch",
      },
      {
        address: normalizedAddress,
        abi: heartbeatRingABI,
        chainId: selectedNetwork.chain.id,
        functionName: "registrationDeadline",
      },
    ],
    query: {
      refetchInterval: CONTRACT_POLL_INTERVAL_MS,
    },
  });

  const { data: ringMembers } = useReadContract({
    address: normalizedAddress,
    abi: heartbeatRingABI,
    chainId: selectedNetwork.chain.id,
    functionName: "getRing",
    query: {
      refetchInterval: CONTRACT_POLL_INTERVAL_MS,
    },
  });

  const { data: participantData } = useReadContract({
    address: normalizedAddress,
    abi: heartbeatRingABI,
    chainId: selectedNetwork.chain.id,
    functionName: "participants",
    args: connectedAddress ? [connectedAddress] : undefined,
    query: {
      enabled: Boolean(connectedAddress),
      refetchInterval: CONTRACT_POLL_INTERVAL_MS,
    },
  });

  const { data: pendingBountyData } = useReadContract({
    address: normalizedAddress,
    abi: heartbeatRingABI,
    chainId: selectedNetwork.chain.id,
    functionName: "pendingBounties",
    args: connectedAddress ? [connectedAddress] : undefined,
    query: {
      enabled: Boolean(connectedAddress),
      refetchInterval: CONTRACT_POLL_INTERVAL_MS,
    },
  });

  const ringMembersList = ((ringMembers ?? []) as Address[]).map((member) =>
    getAddress(member),
  );

  const { data: delinquentReads } = useReadContracts({
    allowFailure: true,
    contracts: ringMembersList.map((member) => ({
      address: normalizedAddress,
      abi: heartbeatRingABI,
      chainId: selectedNetwork.chain.id,
      functionName: "isDelinquent" as const,
      args: [member],
    })),
    query: {
      enabled: ringMembersList.length > 0,
      refetchInterval: CONTRACT_POLL_INTERVAL_MS,
    },
  });

  useEffect(() => {
    if (!isConfirmed || !activeAction) return;

    setSuccessMessage(ACTION_SUCCESS_MESSAGES[activeAction]);
    setActionError(null);

    if (activeAction === "liquidate") {
      setTargetAddress("");
    }

    void queryClient.invalidateQueries();
  }, [activeAction, isConfirmed, queryClient]);

  const phase = Number(pickResult(coreReads, 0, 0));
  const stakeAmount = pickResult(coreReads, 1, 0n);
  const totalParticipants = pickResult(coreReads, 2, 0n);
  const minParticipants = pickResult(coreReads, 3, 0n);
  const currentEpoch = pickResult(coreReads, 4, 0n);
  const registrationDeadline = pickResult(coreReads, 5, 0n);
  const participant = participantData as ParticipantData | undefined;
  const pendingBounty = (pendingBountyData ?? 0n) as bigint;
  const walletStake = participant?.[2] ?? 0n;
  const lastBeat = participant?.[3] ?? 0n;
  const inRing = participant?.[4] ?? false;
  const registrationExpired =
    phase === 0 &&
    registrationDeadline > 0n &&
    BigInt(Math.floor(Date.now() / 1000)) > registrationDeadline;
  const delinquentAddresses = ringMembersList.filter((_member, index) =>
    Boolean(pickResult(delinquentReads, index, false)),
  );
  const heartbeatSent = phase === 1 && currentEpoch > 0n && lastBeat >= currentEpoch;
  const wrongChain = isConnected && !isChainMatched(selectedNetwork.chain.id);
  const busy = isWriting || isConfirming;

  async function runAction(action: ActionKind) {
    setActionError(null);
    setSuccessMessage(null);

    try {
      if (!isConnected) {
        throw new Error("Connect your wallet before sending transactions.");
      }

      if (wrongChain) {
        throw new Error(`Switch your wallet to ${selectedNetwork.longLabel}.`);
      }

      let hash: `0x${string}`;

      switch (action) {
        case "register":
          hash = await writeContractAsync({
            address: normalizedAddress,
            abi: heartbeatRingABI,
            chainId: selectedNetwork.chain.id,
            functionName: "register",
            value: stakeAmount,
          });
          break;
        case "startGame":
          hash = await writeContractAsync({
            address: normalizedAddress,
            abi: heartbeatRingABI,
            chainId: selectedNetwork.chain.id,
            functionName: "startGame",
          });
          break;
        case "heartbeat":
          hash = await writeContractAsync({
            address: normalizedAddress,
            abi: heartbeatRingABI,
            chainId: selectedNetwork.chain.id,
            functionName: "heartbeat",
          });
          break;
        case "liquidate":
          if (!isAddress(targetAddress)) {
            throw new Error("Enter a valid target address.");
          }

          hash = await writeContractAsync({
            address: normalizedAddress,
            abi: heartbeatRingABI,
            chainId: selectedNetwork.chain.id,
            functionName: "liquidate",
            args: [getAddress(targetAddress)],
          });
          break;
        case "claim":
          hash = await writeContractAsync({
            address: normalizedAddress,
            abi: heartbeatRingABI,
            chainId: selectedNetwork.chain.id,
            functionName: "claim",
          });
          break;
        case "withdrawBounty":
          hash = await writeContractAsync({
            address: normalizedAddress,
            abi: heartbeatRingABI,
            chainId: selectedNetwork.chain.id,
            functionName: "withdrawBounty",
          });
          break;
        case "refundRegistration":
          hash = await writeContractAsync({
            address: normalizedAddress,
            abi: heartbeatRingABI,
            chainId: selectedNetwork.chain.id,
            functionName: "refundRegistration",
          });
          break;
      }

      setActiveAction(action);
      setTxHash(hash);
    } catch (error) {
      setActionError(getErrorMessage(error));
    }
  }

  return {
    actionError,
    busy,
    currentEpoch,
    delinquentAddresses,
    heartbeatSent,
    inRing,
    isConnected,
    minParticipants,
    networkLabel: selectedNetwork.longLabel,
    pendingBounty,
    phase,
    registrationExpired,
    runAction,
    setTargetAddress,
    stakeAmount,
    successMessage,
    targetAddress,
    totalParticipants,
    tokenSymbol: selectedNetwork.chain.nativeCurrency.symbol,
    walletStake,
    wrongChain,
  };
}
