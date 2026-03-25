"use client";

import { useSearchParams } from "next/navigation";

import {
  getHeartbeatNetwork,
  HEARTBEAT_NETWORK_SEARCH_PARAM,
} from "@/lib/chain/config";

export function useSelectedNetwork() {
  const searchParams = useSearchParams();

  return getHeartbeatNetwork(
    searchParams.get(HEARTBEAT_NETWORK_SEARCH_PARAM),
  );
}
