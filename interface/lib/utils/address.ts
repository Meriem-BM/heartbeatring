import { getAddress } from "viem";
import type { Address } from "viem";

/**
 * Merges two address arrays with deduplication by normalized address.
 * Preserves insertion order: base addresses first, then unique additions.
 */
export function mergeUniqueAddresses(base: Address[], additions: Address[]): Address[] {
  if (base.length === 0) return additions.map((a) => getAddress(a));

  const seen = new Set(base.map((a) => a.toLowerCase()));
  const merged = [...base];

  for (const address of additions) {
    const normalized = getAddress(address);
    if (!seen.has(normalized.toLowerCase())) {
      seen.add(normalized.toLowerCase());
      merged.push(normalized);
    }
  }

  return merged;
}
