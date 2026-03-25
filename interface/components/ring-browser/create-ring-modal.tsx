"use client";

import { useQueryClient } from "@tanstack/react-query";
import { parseEventLogs, getAddress } from "viem";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";

import { ConnectWallet } from "@/components/layout/connect-wallet";
import { useWalletContext } from "@/context/wallet-context";
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork";
import { factoryABI } from "@/lib/contracts/abi";
import {
  buildCreateRingArgs,
  DEFAULT_CREATE_RING_FORM_STATE,
  EPOCH_DURATION_OPTIONS,
  getDefaultGracePeriod,
  getGracePeriodOptions,
  type CreateRingFormState,
} from "@/lib/ring/create";
import { getErrorMessage } from "@/lib/utils/errors";

type CreateRingModalProps = {
  open: boolean;
  onClose: () => void;
};

export function CreateRingModal({
  open,
  onClose,
}: CreateRingModalProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const selectedNetwork = useSelectedNetwork();
  const {
    isConnected,
    isChainMatched,
    isSwitchingNetwork,
    switchNetworkError,
    switchWalletChain,
  } = useWalletContext();
  const { writeContractAsync, isPending } = useWriteContract();

  const [formState, setFormState] = useState<CreateRingFormState>(
    DEFAULT_CREATE_RING_FORM_STATE,
  );
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { data: receipt, isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      chainId: selectedNetwork.chain.id,
      hash: txHash,
      query: { enabled: Boolean(txHash) },
    });

  const selectedEpochDuration = Number(formState.epochDuration);
  const graceOptions = getGracePeriodOptions(selectedEpochDuration);

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
      onClose();
      router.push(`/ring/${getAddress(ring)}?network=${selectedNetwork.key}`);
    }
  }, [isConfirmed, onClose, queryClient, receipt, router, selectedNetwork.key]);

  if (!open) return null;

  const wrongChain = isConnected && !isChainMatched(selectedNetwork.chain.id);
  const busy = isPending || isConfirming;

  function updateField<Key extends keyof CreateRingFormState>(
    key: Key,
    value: CreateRingFormState[Key],
  ) {
    setFormState((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleEpochDurationChange(value: string) {
    const nextGraceOptions = getGracePeriodOptions(Number(value));

    setFormState((current) => ({
      ...current,
      epochDuration: value,
      liquidationGracePeriod: nextGraceOptions.some(
        (option) => `${option.value}` === current.liquidationGracePeriod,
      )
        ? current.liquidationGracePeriod
        : getDefaultGracePeriod(Number(value)),
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl border border-gray-800 bg-gray-900 p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-gray-500">
              Factory
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-gray-50">
              Create Ring
            </h2>
            <p className="mt-2 text-sm text-gray-400">
              Launch a new coordination ring on {selectedNetwork.longLabel}.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-700 px-3 py-2 text-sm text-gray-300 hover:border-gray-600 hover:text-gray-100"
          >
            Close
          </button>
        </div>

        {!selectedNetwork.hasFactory ? (
          <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            Set{" "}
            <code className="font-mono">{selectedNetwork.factoryEnvLabel}</code>{" "}
            to create or browse rings on {selectedNetwork.label.toLowerCase()}.
          </div>
        ) : !isConnected ? (
          <div className="mt-6 space-y-4 rounded-xl border border-gray-800 bg-gray-950 p-5">
            <p className="text-sm text-gray-300">
              Connect a wallet to create a ring. Browsing remains available
              without a wallet.
            </p>
            <ConnectWallet />
          </div>
        ) : (
          <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium text-gray-200">
                  Stake Amount
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.0001"
                  value={formState.stakeAmount}
                  onChange={(event) =>
                    updateField("stakeAmount", event.target.value)
                  }
                  className="w-full rounded-lg border border-gray-800 bg-gray-800 px-3 py-2 text-sm text-gray-100 outline-none transition focus:border-emerald-500"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-gray-200">
                  Epoch Duration
                </span>
                <select
                  value={formState.epochDuration}
                  onChange={(event) =>
                    handleEpochDurationChange(event.target.value)
                  }
                  className="w-full rounded-lg border border-gray-800 bg-gray-800 px-3 py-2 text-sm text-gray-100 outline-none transition focus:border-emerald-500"
                >
                  {EPOCH_DURATION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-gray-200">
                  Liquidation Grace Period
                </span>
                <select
                  value={formState.liquidationGracePeriod}
                  onChange={(event) =>
                    updateField("liquidationGracePeriod", event.target.value)
                  }
                  className="w-full rounded-lg border border-gray-800 bg-gray-800 px-3 py-2 text-sm text-gray-100 outline-none transition focus:border-emerald-500"
                >
                  {graceOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-gray-200">
                  Liquidation Bounty (%)
                </span>
                <input
                  type="number"
                  min="0"
                  max="5"
                  step="0.1"
                  value={formState.bountyPercent}
                  onChange={(event) =>
                    updateField("bountyPercent", event.target.value)
                  }
                  className="w-full rounded-lg border border-gray-800 bg-gray-800 px-3 py-2 text-sm text-gray-100 outline-none transition focus:border-emerald-500"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-gray-200">
                  Min Participants
                </span>
                <input
                  type="number"
                  min="3"
                  step="1"
                  value={formState.minParticipants}
                  onChange={(event) =>
                    updateField("minParticipants", event.target.value)
                  }
                  className="w-full rounded-lg border border-gray-800 bg-gray-800 px-3 py-2 text-sm text-gray-100 outline-none transition focus:border-emerald-500"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-gray-200">
                  Max Participants
                </span>
                <input
                  type="number"
                  min={formState.minParticipants}
                  step="1"
                  value={formState.maxParticipants}
                  onChange={(event) =>
                    updateField("maxParticipants", event.target.value)
                  }
                  className="w-full rounded-lg border border-gray-800 bg-gray-800 px-3 py-2 text-sm text-gray-100 outline-none transition focus:border-emerald-500"
                />
              </label>
            </div>

            {wrongChain && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-3 text-sm text-amber-200">
                <p>
                  Switch your wallet to {selectedNetwork.longLabel} before
                  creating a ring.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => void switchWalletChain(selectedNetwork.chain.id)}
                    disabled={isSwitchingNetwork}
                    className="rounded-lg border border-amber-500/40 px-3 py-2 text-sm text-amber-100 transition hover:border-amber-400 hover:text-white disabled:cursor-not-allowed disabled:border-gray-700 disabled:text-gray-500"
                  >
                    {isSwitchingNetwork ? "Switching..." : "Switch Wallet"}
                  </button>
                  {switchNetworkError && (
                    <p className="text-xs text-red-200">{switchNetworkError}</p>
                  )}
                </div>
              </div>
            )}

            {submitError && (
              <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {submitError}
              </p>
            )}

            {txHash && !isConfirmed && (
              <p className="rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-300">
                Transaction submitted. Waiting for confirmation...
              </p>
            )}

            {isConfirmed && (
              <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
                Ring created. Redirecting to the new ring...
              </p>
            )}

            <div className="flex items-center justify-end">
              <button
                type="submit"
                disabled={busy || wrongChain}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-400"
              >
                {busy ? "Creating..." : "Create Ring"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
