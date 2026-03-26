"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { useWalletContext } from "@/context/wallet-context";
import {
  HEARTBEAT_NETWORK_SEARCH_PARAM,
  resolveHeartbeatNetworkKeyFromChainId,
} from "@/lib/chain/config";

export function ConnectWallet() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { chainId, isConnected } = useWalletContext();

  useEffect(() => {
    if (!isConnected) return;

    const networkKey = resolveHeartbeatNetworkKeyFromChainId(chainId);

    if (!networkKey) return;
    if (searchParams.get(HEARTBEAT_NETWORK_SEARCH_PARAM) === networkKey) return;

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set(HEARTBEAT_NETWORK_SEARCH_PARAM, networkKey);
    router.replace(`${pathname}?${nextParams.toString()}`);
  }, [chainId, isConnected, pathname, router, searchParams]);

  return (
    <ConnectButton.Custom>
      {({
        account,
        authenticationStatus,
        chain,
        mounted,
        openAccountModal,
        openChainModal,
        openConnectModal,
      }) => {
        const ready = mounted && authenticationStatus !== "loading";
        const connected =
          ready &&
          Boolean(account) &&
          Boolean(chain) &&
          (!authenticationStatus || authenticationStatus === "authenticated");

        if (!connected || !account || !chain) {
          return (
            <div
              className="flex items-center"
              aria-hidden={!ready}
              style={{
                opacity: ready ? 1 : 0,
                pointerEvents: ready ? "auto" : "none",
                userSelect: ready ? "auto" : "none",
              }}
            >
              <button
                type="button"
                onClick={openConnectModal}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500"
              >
                Connect Wallet
              </button>
            </div>
          );
        }

        return (
          <div
            className="flex items-center"
            aria-hidden={!ready}
            style={{
              opacity: ready ? 1 : 0,
              pointerEvents: ready ? "auto" : "none",
              userSelect: ready ? "auto" : "none",
            }}
          >
            {chain.unsupported ? (
              <button
                type="button"
                onClick={openChainModal}
                className="rounded-xl border border-red-500/50 bg-red-500/15 px-4 py-2 text-sm font-medium text-red-100 transition hover:border-red-400 hover:text-white"
              >
                Wrong Network
              </button>
            ) : (
              <div className="flex items-center gap-2 p-1">
                <button
                  type="button"
                  onClick={openChainModal}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-200 transition hover:border-gray-600 hover:text-white"
                >
                  {chain.hasIcon && chain.iconUrl ? (
                    <span
                      className="h-4 w-4 rounded-full bg-cover bg-center"
                      style={{
                        backgroundColor: chain.iconBackground,
                        backgroundImage: `url(${chain.iconUrl})`,
                      }}
                    />
                  ) : null}
                  <span className="hidden sm:inline">{chain.name ?? "Network"}</span>
                  <span className="sm:hidden">Chain</span>
                </button>

                <button
                  type="button"
                  onClick={openAccountModal}
                  className="rounded-lg border border-gray-700 px-3 py-2 text-sm font-medium text-gray-100 transition hover:border-gray-600 hover:text-white"
                >
                  {account.displayName}
                </button>
              </div>
            )}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
