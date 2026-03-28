import { formatEther } from "viem";

export function trimDecimal(value: string) {
  if (!value.includes(".")) return value;
  return value.replace(/\.?0+$/, "");
}

export function truncateAddress(value: string) {
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export function formatToken(value: bigint, symbol = "tRBTC") {
  return `${trimDecimal(formatEther(value))} ${symbol}`;
}

export function formatTokenValue(value: bigint) {
  return trimDecimal(formatEther(value));
}

export function formatDuration(value: bigint | number) {
  const seconds = Number(value);

  if (seconds % 86_400 === 0) {
    const days = seconds / 86_400;
    return `${days} day${days === 1 ? "" : "s"}`;
  }

  if (seconds % 3_600 === 0) {
    const hours = seconds / 3_600;
    return `${hours} hour${hours === 1 ? "" : "s"}`;
  }

  if (seconds % 60 === 0) {
    const minutes = seconds / 60;
    return `${minutes} min`;
  }

  return `${seconds}s`;
}

export function formatCountdown(totalSeconds: number) {
  const safeSeconds = Math.max(totalSeconds, 0);
  const days = Math.floor(safeSeconds / 86_400);
  const remainingAfterDays = safeSeconds % 86_400;
  const hours = Math.floor(remainingAfterDays / 3_600);
  const remainingAfterHours = remainingAfterDays % 3_600;
  const minutes = Math.floor(remainingAfterHours / 60);
  const seconds = remainingAfterHours % 60;

  if (days > 0) {
    return `${days}d ${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  }

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
