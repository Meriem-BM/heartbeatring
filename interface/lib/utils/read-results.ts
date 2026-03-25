import type { ReadResult } from "@/lib/types/ring";

export function pickResult<T>(
  results: readonly unknown[] | undefined,
  index: number,
  fallback: T,
) {
  const item = results?.[index] as ReadResult<T> | undefined;
  return item?.status === "success" ? (item.result as T) : fallback;
}
