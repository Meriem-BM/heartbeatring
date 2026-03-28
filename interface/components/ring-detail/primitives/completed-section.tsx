import { formatToken } from "@/lib/utils/format";

import type { CompletedSectionProps } from "./types";

export function CompletedSection({
  busy,
  inRing,
  isConnected,
  runAction,
  tokenSymbol,
  walletStake,
  wrongChain,
}: CompletedSectionProps) {
  return (
    <div className="space-y-4 rounded-xl border border-gray-800 bg-gray-950 p-4">
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-100">Claim</p>
        <p className="text-sm text-gray-400">
          Claimable on this wallet: {formatToken(walletStake, tokenSymbol)}.
        </p>
      </div>

      <button
        type="button"
        onClick={() => void runAction("claim")}
        disabled={!isConnected || wrongChain || busy || !inRing || walletStake <= 0n}
        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-400"
      >
        Claim Winnings
      </button>
    </div>
  );
}
