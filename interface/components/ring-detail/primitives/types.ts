import type { Address } from "viem";

import type { ActionKind } from "@/lib/ring/ui";

export type RunAction = (action: ActionKind) => Promise<void>;

export type ActionAlertsProps = {
  actionError: string | null;
  busy: boolean;
  isConnected: boolean;
  networkLabel: string;
  successMessage: string | null;
  wrongChain: boolean;
};

export type RegistrationSectionProps = {
  busy: boolean;
  inRing: boolean;
  isConnected: boolean;
  minParticipants: bigint;
  registrationExpired: boolean;
  runAction: RunAction;
  stakeAmount: bigint;
  tokenSymbol: string;
  totalParticipants: bigint;
  wrongChain: boolean;
};

export type ActiveSectionProps = {
  busy: boolean;
  currentEpoch: bigint;
  delinquentAddresses: Address[];
  heartbeatSent: boolean;
  inRing: boolean;
  isConnected: boolean;
  runAction: RunAction;
  setTargetAddress: (value: string) => void;
  targetAddress: string;
  wrongChain: boolean;
};

export type CompletedSectionProps = {
  busy: boolean;
  inRing: boolean;
  isConnected: boolean;
  runAction: RunAction;
  tokenSymbol: string;
  walletStake: bigint;
  wrongChain: boolean;
};

export type PendingBountySectionProps = {
  busy: boolean;
  isConnected: boolean;
  tokenSymbol: string;
  pendingBounty: bigint;
  runAction: RunAction;
  wrongChain: boolean;
};
