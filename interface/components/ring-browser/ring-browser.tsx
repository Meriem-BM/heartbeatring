"use client";

import { useState } from "react";

import { Notice } from "@/components/ui/notice";
import { useWalletContext } from "@/context/wallet-context";
import { useRingBrowser } from "@/hooks/ring/useRingBrowser";

import { CreateRingModal } from "./create-ring-modal";
import { RingCard } from "./ring-card";

export function RingBrowser() {
  const { isConnected, selectedNetwork } = useWalletContext();
  const [createOpen, setCreateOpen] = useState(false);
  const { errorMessage, isLoading, ringAddresses, sortedRingAddresses } =
    useRingBrowser();

  return (
    <>
      <div className="space-y-8">
        <section className="flex flex-col gap-4 rounded-2xl border border-gray-800 bg-gray-900 p-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-gray-500">
              {selectedNetwork.longLabel}
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-gray-50">
              Active Rings
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-gray-400">
              Browse registration lobbies, monitor live games, and deploy a new
              ring from the factory registry.
            </p>
          </div>

          <div className="flex flex-col items-start gap-3 lg:items-end">
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500"
            >
              Create Ring +
            </button>
            {!isConnected && (
              <p className="text-xs text-gray-500">
                Connect a wallet to create rings. Browsing stays read-only.
              </p>
            )}
          </div>
        </section>

        {!selectedNetwork.hasFactory && (
          <Notice tone="error" title="Factory address missing." className="p-5">
            Factory is not configured yet for {selectedNetwork.label.toLowerCase()}.
            Use testnet for now.
          </Notice>
        )}

        {selectedNetwork.hasFactory && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-400">
                {ringAddresses.length} ring
                {ringAddresses.length === 1 ? "" : "s"} on chain
              </p>
              <p className="text-xs uppercase tracking-[0.2em] text-gray-500">
                Chain {selectedNetwork.chain.id}
              </p>
            </div>

            {isLoading && (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-32 animate-pulse rounded-xl border border-gray-800 bg-gray-900"
                  />
                ))}
              </div>
            )}

            {!isLoading && errorMessage && (
              <Notice tone="error" className="p-5">
                Failed to load rings: {errorMessage}
              </Notice>
            )}

            {!isLoading && !errorMessage && sortedRingAddresses.length === 0 && (
              <div className="rounded-xl border border-dashed border-gray-800 bg-gray-900 px-6 py-12 text-center">
                <p className="text-lg font-medium text-gray-200">
                  No rings yet.
                </p>
                <p className="mt-2 text-sm text-gray-500">
                  Create the first one from the factory.
                </p>
              </div>
            )}

            {!isLoading && !errorMessage && sortedRingAddresses.length > 0 && (
              <div className="space-y-3">
                {sortedRingAddresses.map((address) => (
                  <RingCard key={address} address={address} />
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      <CreateRingModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </>
  );
}
