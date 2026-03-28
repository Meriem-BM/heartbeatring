import { formatToken } from "@/lib/utils/format";

import type { PendingBountySectionProps } from "./types";

export function PendingBountySection({
  busy,
  isConnected,
  tokenSymbol,
  pendingBounty,
  runAction,
  wrongChain,
}: PendingBountySectionProps) {
  if (pendingBounty <= 0n) return null;

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-950 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-medium text-gray-100">Pending Bounty</p>
          <p className="mt-1 text-sm text-gray-400">
            {formatToken(pendingBounty, tokenSymbol)} ready to withdraw.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void runAction("withdrawBounty")}
          disabled={!isConnected || wrongChain || busy}
          className="rounded-lg border border-gray-700 px-4 py-2 text-sm font-medium text-gray-200 transition hover:border-gray-600 hover:text-white disabled:cursor-not-allowed disabled:border-gray-800 disabled:text-gray-500"
        >
          Withdraw Bounty
        </button>
      </div>
    </div>
  );
}
