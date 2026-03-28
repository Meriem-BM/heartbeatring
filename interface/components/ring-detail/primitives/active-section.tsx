import { formatCountdown, truncateAddress } from "@/lib/utils/format";

import type { ActiveSectionProps } from "./types";

function HeartbeatPanel({
  busy,
  currentEpoch,
  heartbeatGraceRemainingSeconds,
  heartbeatLiquidatableNow,
  heartbeatSent,
  inRing,
  isConnected,
  lastHeartbeatEpoch,
  runAction,
  wrongChain,
}: Pick<
  ActiveSectionProps,
  | "busy"
  | "currentEpoch"
  | "heartbeatGraceRemainingSeconds"
  | "heartbeatLiquidatableNow"
  | "heartbeatSent"
  | "inRing"
  | "isConnected"
  | "lastHeartbeatEpoch"
  | "runAction"
  | "wrongChain"
>) {
  const heartbeatRequiredThisEpoch = inRing && currentEpoch > 0n;
  const heartbeatPendingThisEpoch =
    heartbeatRequiredThisEpoch && lastHeartbeatEpoch < currentEpoch;

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-gray-100">Heartbeat</p>
      <p className="text-sm text-gray-400">
        Current epoch: {currentEpoch.toString()}.
      </p>
      <p className="text-sm text-gray-400">
        Last on-chain heartbeat epoch: {lastHeartbeatEpoch.toString()}.
      </p>
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
      {inRing && currentEpoch === 0n && (
        <p className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-sm text-sky-100">
          Epoch 0 is warm-up. You must still send again in epoch 1 before grace
          ends.
        </p>
      )}
      {heartbeatPendingThisEpoch && currentEpoch > 0n && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          Heartbeat for epoch {currentEpoch.toString()} is still pending.{" "}
          {heartbeatLiquidatableNow
            ? "You are liquidatable now."
            : `You become liquidatable in ${formatCountdown(
                heartbeatGraceRemainingSeconds,
              )}.`}
        </p>
      )}
      <p className="text-xs text-gray-500">
        Heartbeats are per-epoch. Sending in epoch 0 does not carry into epoch 1.
      </p>
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

      <p className="text-xs text-gray-500">
        Liquidations settle one transaction at a time. On short epochs, a target can
        move in or out of the liquidation window between blocks.
      </p>
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
