"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { getAddress, parseEventLogs } from "viem";
import { useEffect, useState } from "react";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";

import { useWalletContext } from "@/context/wallet-context";
import { factoryABI } from "@/lib/contracts/abi";
import type { CreateRingFormState } from "@/lib/ring/create";
import { buildCreateRingArgs } from "@/lib/ring/create";
import { getErrorMessage } from "@/lib/utils/errors";

type SelectedNetwork = ReturnType<typeof useWalletContext>["selectedNetwork"];

type UseCreateRingCreationProps = {
  formState: CreateRingFormState;
  onCreated: () => void;
  selectedNetwork: SelectedNetwork;
};

export function useCreateRingCreation({
  formState,
  onCreated,
  selectedNetwork,
}: UseCreateRingCreationProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { writeContractAsync, isPending } = useWriteContract();
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { data: receipt, isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      chainId: selectedNetwork.chain.id,
      hash: txHash,
      query: { enabled: Boolean(txHash) },
    });

  useEffect(() => {
    if (!isConfirmed || !receipt) return;

    const createdLog = parseEventLogs({
      abi: factoryABI,
      eventName: "RingCreated",
      logs: receipt.logs,
    })[0];
    const ring = createdLog?.args.ring;

    void queryClient.invalidateQueries();

    if (ring) {
      onCreated();
      router.push(`/ring/${getAddress(ring)}?network=${selectedNetwork.key}`);
    }
  }, [isConfirmed, onCreated, queryClient, receipt, router, selectedNetwork.key]);

  async function submitRingCreation() {
    setSubmitError(null);

    try {
      const hash = await writeContractAsync({
        address: selectedNetwork.factoryAddress,
        abi: factoryABI,
        chainId: selectedNetwork.chain.id,
        functionName: "createRing",
        args: buildCreateRingArgs(formState),
      });

      setTxHash(hash);
    } catch (error) {
      setSubmitError(getErrorMessage(error));
    }
  }

  return {
    busy: isPending || isConfirming,
    isConfirmed,
    submitError,
    submitRingCreation,
    txHash,
  };
}
