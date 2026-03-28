"use client";

import Link from "next/link";

import { useWalletContext } from "@/context/wallet-context";

export function BrandLink() {
  const { selectedNetwork } = useWalletContext();

  return (
    <Link
      href={{ pathname: "/", query: { network: selectedNetwork.key } }}
      className="text-lg font-semibold tracking-tight text-gray-50"
    >
      HeartbeatRing
    </Link>
  );
}
