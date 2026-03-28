import { parseEther } from "viem";

export type CreateRingFormState = {
  stakeAmount: string;
  epochDuration: string;
  liquidationGracePeriod: string;
  minParticipants: string;
  maxParticipants: string;
  bountyPercent: string;
};

export const DEFAULT_CREATE_RING_FORM_STATE: CreateRingFormState = {
  stakeAmount: "0.001",
  epochDuration: "300",
  liquidationGracePeriod: "60",
  minParticipants: "3",
  maxParticipants: "10",
  bountyPercent: "1",
};

export const MIN_EPOCH_DURATION_SECONDS = 180;

export const EPOCH_DURATION_OPTIONS = [
  { label: "3 min", value: 180 },
  { label: "5 min", value: 300 },
  { label: "15 min", value: 900 },
  { label: "1 hour", value: 3_600 },
  { label: "24 hours", value: 86_400 },
] as const;

export const GRACE_PERIOD_OPTIONS = [
  { label: "30 sec", value: 30 },
  { label: "1 min", value: 60 },
  { label: "2 min", value: 120 },
  { label: "5 min", value: 300 },
  { label: "10 min", value: 600 },
] as const;

export function getGracePeriodOptions(epochDuration: number) {
  return GRACE_PERIOD_OPTIONS.filter((option) => option.value < epochDuration);
}

export function getDefaultGracePeriod(epochDuration: number) {
  return `${getGracePeriodOptions(epochDuration)[0]?.value ?? 30}`;
}

export function buildCreateRingArgs(formState: CreateRingFormState) {
  const selectedEpochDuration = Number(formState.epochDuration);
  const parsedStake = parseEther(formState.stakeAmount);
  const parsedMin = Number(formState.minParticipants);
  const parsedMax = Number(formState.maxParticipants);
  const parsedBounty = Number(formState.bountyPercent);
  const parsedGracePeriod = Number(formState.liquidationGracePeriod);

  if (parsedStake <= 0n) {
    throw new Error("Stake amount must be greater than 0.");
  }

  if (!Number.isFinite(parsedMin) || parsedMin < 3) {
    throw new Error("Minimum participants must be at least 3.");
  }

  if (!Number.isFinite(parsedMax) || parsedMax < parsedMin) {
    throw new Error("Maximum participants must be at least the minimum.");
  }

  if (!Number.isFinite(parsedBounty) || parsedBounty < 0 || parsedBounty > 5) {
    throw new Error("Liquidation bounty must be between 0% and 5%.");
  }

  if (
    !Number.isFinite(selectedEpochDuration) ||
    selectedEpochDuration < MIN_EPOCH_DURATION_SECONDS
  ) {
    throw new Error("Epoch duration must be at least 3 minutes.");
  }

  if (
    !Number.isFinite(parsedGracePeriod) ||
    parsedGracePeriod < 30 ||
    parsedGracePeriod >= selectedEpochDuration
  ) {
    throw new Error(
      "Liquidation grace period must be at least 30 seconds and shorter than the epoch.",
    );
  }

  return [
    parsedStake,
    BigInt(selectedEpochDuration),
    BigInt(parsedGracePeriod),
    BigInt(parsedMin),
    BigInt(parsedMax),
    BigInt(Math.round(parsedBounty * 100)),
  ] as const;
}
