"use client";

import Link from "next/link";

import { useSelectedNetwork } from "@/hooks/useSelectedNetwork";

export function BrandLink() {
  const selectedNetwork = useSelectedNetwork();

  return (
    <Link
      href={{ pathname: "/", query: { network: selectedNetwork.key } }}
      className="text-lg font-semibold tracking-tight text-gray-50"
    >
      HeartbeatRing
    </Link>
  );
}
