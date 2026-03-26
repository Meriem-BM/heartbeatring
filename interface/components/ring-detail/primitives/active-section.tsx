import { truncateAddress } from "@/lib/utils/format";

import type { ActiveSectionProps } from "./types";

function HeartbeatPanel({
  busy,
  heartbeatSent,
  inRing,
  isConnected,
  runAction,
  wrongChain,
}: Pick<
  ActiveSectionProps,
  "busy" | "heartbeatSent" | "inRing" | "isConnected" | "runAction" | "wrongChain"
>) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-gray-100">Heartbeat</p>
      <button
        type="button"
        onClick={() => void runAction("heartbeat")}
        disabled={!isConnected || wrongChain || busy || !inRing || heartbeatSent}
        className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-400"
      >
        {heartbeatSent ? "Heartbeat sent ✓" : "Send Heartbeat"}
      </button>
      {!inRing && (
        <p className="text-sm text-gray-500">
          This wallet is not an active participant in the ring.
        </p>
      )}
    </div>
  );
}

function LiquidationPanel({
  busy,
  currentEpoch,
  delinquentAddresses,
  isConnected,
  runAction,
  setTargetAddress,
  targetAddress,
  wrongChain,
}: Pick<
  ActiveSectionProps,
  | "busy"
  | "currentEpoch"
  | "delinquentAddresses"
  | "isConnected"
  | "runAction"
  | "setTargetAddress"
  | "targetAddress"
  | "wrongChain"
>) {
  return (
    <div className="space-y-3 border-t border-gray-800 pt-5">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-gray-100">Liquidate</p>
        <p className="text-sm text-gray-400">
          Current epoch: {currentEpoch.toString()}.
        </p>
      </div>

      <div className="flex flex-col gap-3 md:flex-row">
        <input
          type="text"
          value={targetAddress}
          onChange={(event) => setTargetAddress(event.target.value)}
          placeholder="0x..."
          className="w-full rounded-lg border border-gray-800 bg-gray-800 px-3 py-2 font-mono text-sm text-gray-100 outline-none transition focus:border-amber-500"
        />
        <button
          type="button"
          onClick={() => void runAction("liquidate")}
          disabled={!isConnected || wrongChain || busy || !targetAddress}
          className="rounded-lg border border-amber-500/40 px-4 py-2 text-sm font-medium text-amber-200 transition hover:border-amber-400 hover:text-amber-100 disabled:cursor-not-allowed disabled:border-gray-800 disabled:text-gray-500"
        >
          Liquidate
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {delinquentAddresses.length > 0 ? (
          delinquentAddresses.map((address) => (
            <button
              key={address}
              type="button"
              onClick={() => setTargetAddress(address)}
              className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 font-mono text-xs text-amber-200 transition hover:border-amber-400 hover:text-amber-100"
            >
              {truncateAddress(address)}
            </button>
          ))
        ) : (
          <p className="text-sm text-gray-500">
            No delinquent players available for liquidation.
          </p>
        )}
      </div>
    </div>
  );
}

export function ActiveSection(props: ActiveSectionProps) {
  return (
    <div className="space-y-5 rounded-xl border border-gray-800 bg-gray-950 p-4">
      <HeartbeatPanel {...props} />
      <LiquidationPanel {...props} />
    </div>
  );
}
