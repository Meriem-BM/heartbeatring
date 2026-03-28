import { formatToken } from "@/lib/utils/format";

import type { RegistrationSectionProps } from "./types";

export function RegistrationSection({
  busy,
  inRing,
  isConnected,
  minParticipants,
  registrationExpired,
  runAction,
  stakeAmount,
  tokenSymbol,
  totalParticipants,
  wrongChain,
}: RegistrationSectionProps) {
  return (
    <div className="space-y-4 rounded-xl border border-gray-800 bg-gray-950 p-4">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-gray-100">Registration</p>
        <p className="text-sm text-gray-400">
          Stake is fixed at {formatToken(stakeAmount, tokenSymbol)} for every
          player.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void runAction("register")}
          disabled={!isConnected || wrongChain || busy || inRing}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-400"
        >
          {inRing ? "Registered" : "Register"}
        </button>

        {totalParticipants >= minParticipants && !registrationExpired && (
          <button
            type="button"
            onClick={() => void runAction("startGame")}
            disabled={!isConnected || wrongChain || busy}
            className="rounded-lg border border-gray-700 px-4 py-2 text-sm font-medium text-gray-200 transition hover:border-gray-600 hover:text-white disabled:cursor-not-allowed disabled:border-gray-800 disabled:text-gray-500"
          >
            Start Game
          </button>
        )}

        {registrationExpired && inRing && (
          <button
            type="button"
            onClick={() => void runAction("refundRegistration")}
            disabled={!isConnected || wrongChain || busy}
            className="rounded-lg border border-red-500/40 px-4 py-2 text-sm font-medium text-red-200 transition hover:border-red-400 hover:text-red-100 disabled:cursor-not-allowed disabled:border-gray-800 disabled:text-gray-500"
          >
            Refund Stake
          </button>
        )}
      </div>

      {!registrationExpired && totalParticipants < minParticipants && (
        <p className="text-sm text-gray-400">
          Waiting for {(minParticipants - totalParticipants).toString()} more
          player{minParticipants - totalParticipants === 1n ? "" : "s"}...
        </p>
      )}

      {registrationExpired && (
        <p className="text-sm text-amber-200">
          Registration window has expired. Registered players can refund if the
          game never started.
        </p>
      )}
    </div>
  );
}
