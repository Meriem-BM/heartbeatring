import { getAddress } from "viem";

import { pickResult } from "@/lib/utils/read-results";

export function normalizeRingAddresses(ringsData: readonly string[] | undefined) {
  return (ringsData ?? []).map((address) => getAddress(address));
}

export function sortRingAddressesByPhase(
  ringAddresses: readonly string[],
  phaseReads: readonly unknown[] | undefined,
) {
  const phaseByAddress = new Map(
    ringAddresses.map((address, index) => [
      address,
      Number(pickResult(phaseReads, index, 99)),
    ]),
  );

  return [...ringAddresses].sort((left, right) => {
    const leftPhase = phaseByAddress.get(left) ?? 99;
    const rightPhase = phaseByAddress.get(right) ?? 99;

    if (leftPhase !== rightPhase) return leftPhase - rightPhase;
    return left.localeCompare(right);
  });
}
