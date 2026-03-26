import type { RingPhase } from "@/lib/types/ring";

export type ActionKind =
  | "register"
  | "startGame"
  | "heartbeat"
  | "liquidate"
  | "claim"
  | "withdrawBounty"
  | "refundRegistration";

export const GAME_STATUS_PHASE_META = {
  0: {
    label: "Registration",
    badgeClass:
      "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    footer: "Registration is open.",
  },
  1: {
    label: "Active",
    badgeClass: "border border-amber-500/30 bg-amber-500/10 text-amber-300",
    footer: "Heartbeats are live.",
  },
  2: {
    label: "Completed",
    badgeClass: "border border-gray-700 bg-gray-800 text-gray-300",
    footer: "Claims are open.",
  },
} as const satisfies Record<
  RingPhase,
  {
    label: string;
    badgeClass: string;
    footer: string;
  }
>;

export const RING_CARD_PHASE_META = {
  0: {
    label: "Registration",
    badgeClass:
      "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    hint: "Join now",
  },
  1: {
    label: "Active",
    badgeClass: "border border-amber-500/30 bg-amber-500/10 text-amber-300",
    hint: "Epoch live",
  },
  2: {
    label: "Completed",
    badgeClass: "border border-gray-700 bg-gray-800 text-gray-300",
    hint: "Game over",
  },
} as const satisfies Record<
  RingPhase,
  {
    label: string;
    badgeClass: string;
    hint: string;
  }
>;

export const ACTION_SUCCESS_MESSAGES: Record<ActionKind, string> = {
  register: "Registration submitted",
  startGame: "Game started",
  heartbeat: "Heartbeat sent",
  liquidate: "Liquidation submitted",
  claim: "Claim submitted",
  withdrawBounty: "Bounty withdrawn",
  refundRegistration: "Refund submitted",
};

export const EVENT_LOG_LIMIT = 50;
