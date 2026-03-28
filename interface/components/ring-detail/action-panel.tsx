"use client";

import {
  ActionAlerts,
  ActiveSection,
  CompletedSection,
  PendingBountySection,
  RegistrationSection,
} from "./primitives";
import { useRingActions } from "@/hooks/ring/useRingActions";
import type { RingAddressProps } from "@/lib/types/ring";

export function ActionPanel({ ringAddress }: RingAddressProps) {
  const actionState = useRingActions({ ringAddress });

  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-medium text-gray-100">Action Panel</h2>
        <p className="text-sm text-gray-400">
          Register, pulse your heartbeat, liquidate delinquent players, or
          claim when the ring completes.
        </p>
      </div>

      <ActionAlerts
        actionError={actionState.actionError}
        busy={actionState.busy}
        isConnected={actionState.isConnected}
        networkLabel={actionState.networkLabel}
        successMessage={actionState.successMessage}
        wrongChain={actionState.wrongChain}
      />

      <div className="mt-6 space-y-6">
        {actionState.phase === 0 && (
          <RegistrationSection
            busy={actionState.busy}
            inRing={actionState.inRing}
            isConnected={actionState.isConnected}
            minParticipants={actionState.minParticipants}
            registrationExpired={actionState.registrationExpired}
            runAction={actionState.runAction}
            stakeAmount={actionState.stakeAmount}
            tokenSymbol={actionState.tokenSymbol}
            totalParticipants={actionState.totalParticipants}
            wrongChain={actionState.wrongChain}
          />
        )}

        {actionState.phase === 1 && (
          <ActiveSection
            busy={actionState.busy}
            currentEpoch={actionState.currentEpoch}
            delinquentAddresses={actionState.delinquentAddresses}
            heartbeatGraceRemainingSeconds={
              actionState.heartbeatGraceRemainingSeconds
            }
            heartbeatLiquidatableNow={actionState.heartbeatLiquidatableNow}
            heartbeatSent={actionState.heartbeatSent}
            inRing={actionState.inRing}
            isConnected={actionState.isConnected}
            lastHeartbeatEpoch={actionState.lastHeartbeatEpoch}
            runAction={actionState.runAction}
            setTargetAddress={actionState.setTargetAddress}
            targetAddress={actionState.targetAddress}
            wrongChain={actionState.wrongChain}
          />
        )}

        {actionState.phase === 2 && (
          <CompletedSection
            busy={actionState.busy}
            inRing={actionState.inRing}
            isConnected={actionState.isConnected}
            tokenSymbol={actionState.tokenSymbol}
            runAction={actionState.runAction}
            walletStake={actionState.walletStake}
            wrongChain={actionState.wrongChain}
          />
        )}

        <PendingBountySection
          busy={actionState.busy}
          isConnected={actionState.isConnected}
          tokenSymbol={actionState.tokenSymbol}
          pendingBounty={actionState.pendingBounty}
          runAction={actionState.runAction}
          wrongChain={actionState.wrongChain}
        />
      </div>
    </section>
  );
}
