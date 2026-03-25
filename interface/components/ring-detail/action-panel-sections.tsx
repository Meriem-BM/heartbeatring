import type { Address } from "viem";

import { formatToken, truncateAddress } from "@/lib/utils/format";
import type { ActionKind } from "@/lib/ring/ui";

type ActionAlertsProps = {
  actionError: string | null;
  busy: boolean;
  isConnected: boolean;
  networkLabel: string;
  successMessage: string | null;
  wrongChain: boolean;
};

type RegistrationSectionProps = {
  busy: boolean;
  inRing: boolean;
  isConnected: boolean;
  minParticipants: bigint;
  registrationExpired: boolean;
  runAction: (action: ActionKind) => Promise<void>;
  stakeAmount: bigint;
  tokenSymbol: string;
  totalParticipants: bigint;
  wrongChain: boolean;
};

type ActiveSectionProps = {
  busy: boolean;
  currentEpoch: bigint;
  delinquentAddresses: Address[];
  heartbeatSent: boolean;
  inRing: boolean;
  isConnected: boolean;
  runAction: (action: ActionKind) => Promise<void>;
  setTargetAddress: (value: string) => void;
  targetAddress: string;
  wrongChain: boolean;
};

type CompletedSectionProps = {
  busy: boolean;
  inRing: boolean;
  isConnected: boolean;
  runAction: (action: ActionKind) => Promise<void>;
  tokenSymbol: string;
  walletStake: bigint;
  wrongChain: boolean;
};

type PendingBountySectionProps = {
  busy: boolean;
  isConnected: boolean;
  tokenSymbol: string;
  pendingBounty: bigint;
  runAction: (action: ActionKind) => Promise<void>;
  wrongChain: boolean;
};

export function ActionAlerts({
  actionError,
  busy,
  isConnected,
  networkLabel,
  successMessage,
  wrongChain,
}: ActionAlertsProps) {
  return (
    <div className="mt-5 space-y-4">
      {!isConnected && (
        <p className="rounded-lg border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-300">
          Connect a wallet to interact with this ring.
        </p>
      )}

      {wrongChain && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          Switch your wallet to {networkLabel} before sending transactions.
        </p>
      )}

      {busy && (
        <p className="rounded-lg border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-300">
          Transaction pending...
        </p>
      )}

      {successMessage && (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
          {successMessage}
        </p>
      )}

      {actionError && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {actionError}
        </p>
      )}
    </div>
  );
}

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

export function ActiveSection({
  busy,
  currentEpoch,
  delinquentAddresses,
  heartbeatSent,
  inRing,
  isConnected,
  runAction,
  setTargetAddress,
  targetAddress,
  wrongChain,
}: ActiveSectionProps) {
  return (
    <div className="space-y-5 rounded-xl border border-gray-800 bg-gray-950 p-4">
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
    </div>
  );
}

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
