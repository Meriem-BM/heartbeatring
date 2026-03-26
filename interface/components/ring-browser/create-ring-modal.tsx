"use client";

import { ConnectWallet } from "@/components/primitives/connect-wallet";
import { Notice } from "@/components/ui/notice";
import { useCreateRingCreation } from "@/hooks/create-ring/useCreateRingCreation";
import { useCreateRingFormState } from "@/hooks/create-ring/useCreateRingFormState";
import { useCreateRingModalState } from "@/hooks/create-ring/useCreateRingModalState";

import { CreateRingForm } from "./create-ring-form";

type CreateRingModalProps = {
  open: boolean;
  onClose: () => void;
};

export function CreateRingModal({
  open,
  onClose,
}: CreateRingModalProps) {
  const {
    isConnected,
    isFactoryAvailable,
    selectedNetwork,
    wrongChain,
  } = useCreateRingModalState();
  const {
    formState,
    graceOptions,
    updateField,
  } = useCreateRingFormState();
  const {
    busy,
    isConfirmed,
    submitError,
    submitRingCreation,
    txHash,
  } = useCreateRingCreation({
    formState,
    onCreated: onClose,
    selectedNetwork,
  });

  if (!open) return null;

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

        {!isFactoryAvailable ? (
          <Notice tone="error" className="mt-6">
            Set{" "}
            <code className="font-mono">{selectedNetwork.factoryEnvLabel}</code>{" "}
            to create or browse rings on {selectedNetwork.label.toLowerCase()}.
          </Notice>
        ) : !isConnected ? (
          <div className="mt-6 space-y-4 rounded-xl border border-gray-800 bg-gray-950 p-5">
            <p className="text-sm text-gray-300">
              Connect a wallet to create a ring. Browsing remains available
              without a wallet.
            </p>
            <ConnectWallet />
          </div>
        ) : (
          <CreateRingForm
            busy={busy}
            formState={formState}
            graceOptions={graceOptions}
            isConfirmed={isConfirmed}
            networkLabel={selectedNetwork.longLabel}
            onSubmit={submitRingCreation}
            submitError={submitError}
            txHash={txHash}
            updateField={updateField}
            wrongChain={wrongChain}
          />
        )}
      </div>
    </div>
  );
}
