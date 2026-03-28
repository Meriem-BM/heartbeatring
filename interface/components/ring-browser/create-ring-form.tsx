"use client";

import type { FormEvent } from "react";

import { Notice } from "@/components/ui/notice";
import {
  EPOCH_DURATION_OPTIONS,
  type CreateRingFormState,
} from "@/lib/ring/create";

type CreateRingFormProps = {
  busy: boolean;
  formState: CreateRingFormState;
  graceOptions: readonly { label: string; value: number }[];
  isConfirmed: boolean;
  networkLabel: string;
  onSubmit: () => Promise<void>;
  submitError: string | null;
  txHash: `0x${string}` | undefined;
  updateField: (key: keyof CreateRingFormState, value: string) => void;
  wrongChain: boolean;
};

export function CreateRingForm({
  busy,
  formState,
  graceOptions,
  isConfirmed,
  networkLabel,
  onSubmit,
  submitError,
  txHash,
  updateField,
  wrongChain,
}: CreateRingFormProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void onSubmit();
  }

  return (
    <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-medium text-gray-200">Stake Amount</span>
          <input
            type="number"
            min="0"
            step="0.0001"
            value={formState.stakeAmount}
            onChange={(event) => updateField("stakeAmount", event.target.value)}
            className="w-full rounded-lg border border-gray-800 bg-gray-800 px-3 py-2 text-sm text-gray-100 outline-none transition focus:border-emerald-500"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-gray-200">Epoch Duration</span>
          <select
            value={formState.epochDuration}
            onChange={(event) => updateField("epochDuration", event.target.value)}
            className="w-full rounded-lg border border-gray-800 bg-gray-800 px-3 py-2 text-sm text-gray-100 outline-none transition focus:border-emerald-500"
          >
            {EPOCH_DURATION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500">
            Minimum 3 minutes. Very short epochs can cause liquidation timing edge
            cases across blocks.
          </p>
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
          <p className="text-xs text-gray-500">
            Deadline is epoch start + grace. Example: 2m epoch + 30s grace means
            liquidation can start 30s into each epoch.
          </p>
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
            onChange={(event) => updateField("bountyPercent", event.target.value)}
            className="w-full rounded-lg border border-gray-800 bg-gray-800 px-3 py-2 text-sm text-gray-100 outline-none transition focus:border-emerald-500"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-gray-200">Min Participants</span>
          <input
            type="number"
            min="3"
            step="1"
            value={formState.minParticipants}
            onChange={(event) => updateField("minParticipants", event.target.value)}
            className="w-full rounded-lg border border-gray-800 bg-gray-800 px-3 py-2 text-sm text-gray-100 outline-none transition focus:border-emerald-500"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-gray-200">Max Participants</span>
          <input
            type="number"
            min={formState.minParticipants}
            step="1"
            value={formState.maxParticipants}
            onChange={(event) => updateField("maxParticipants", event.target.value)}
            className="w-full rounded-lg border border-gray-800 bg-gray-800 px-3 py-2 text-sm text-gray-100 outline-none transition focus:border-emerald-500"
          />
        </label>
      </div>

      {wrongChain && (
        <Notice tone="warning" className="rounded-lg px-3 py-3">
          Switch your wallet to {networkLabel} before creating a ring from the
          header network selector.
        </Notice>
      )}

      {submitError && (
        <Notice tone="error" className="rounded-lg px-3 py-2">
          {submitError}
        </Notice>
      )}

      {txHash && !isConfirmed && (
        <Notice tone="default" className="rounded-lg border-gray-700 px-3 py-2">
          Transaction submitted. Waiting for confirmation...
        </Notice>
      )}

      {isConfirmed && (
        <Notice tone="success" className="rounded-lg px-3 py-2">
          Ring created. Redirecting to the new ring...
        </Notice>
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
  );
}
