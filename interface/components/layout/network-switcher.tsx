"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { startTransition } from "react";

import { useWalletContext } from "@/context/wallet-context";
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork";
import {
  HEARTBEAT_NETWORK_OPTIONS,
  HEARTBEAT_NETWORK_SEARCH_PARAM,
  resolveHeartbeatNetworkKey,
} from "@/lib/chain/config";

export function NetworkSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedNetwork = useSelectedNetwork();
  const {
    clearSwitchError,
    isChainMatched,
    isConnected,
    isSwitchingNetwork,
    switchNetworkError,
    switchWalletChain,
  } = useWalletContext();

  const wrongChain = isConnected && !isChainMatched(selectedNetwork.chain.id);

  function handleNetworkChange(nextValue: string) {
    const nextKey = resolveHeartbeatNetworkKey(nextValue);
    const nextParams = new URLSearchParams(searchParams.toString());

    nextParams.set(HEARTBEAT_NETWORK_SEARCH_PARAM, nextKey);
    clearSwitchError();

    startTransition(() => {
      router.replace(`${pathname}?${nextParams.toString()}`);
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <label className="flex items-center gap-2 text-sm text-gray-300">
          <span className="text-xs uppercase tracking-[0.22em] text-gray-500">
            Network
          </span>
          <select
            value={selectedNetwork.key}
            onChange={(event) => handleNetworkChange(event.target.value)}
            className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-100 outline-none transition focus:border-emerald-500"
          >
            {HEARTBEAT_NETWORK_OPTIONS.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {wrongChain && (
          <button
            type="button"
            onClick={() => void switchWalletChain(selectedNetwork.chain.id)}
            disabled={isSwitchingNetwork}
            className="rounded-lg border border-amber-500/40 px-3 py-2 text-sm text-amber-200 transition hover:border-amber-400 hover:text-amber-100 disabled:cursor-not-allowed disabled:border-gray-800 disabled:text-gray-500"
          >
            {isSwitchingNetwork ? "Switching..." : "Switch Wallet"}
          </button>
        )}
      </div>

      {switchNetworkError && (
        <p className="max-w-xs text-right text-xs text-red-300">
          {switchNetworkError}
        </p>
      )}
    </div>
  );
}
