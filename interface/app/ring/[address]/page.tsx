import Link from "next/link";
import { getAddress, isAddress } from "viem";

import { ActionPanel } from "@/components/ring-detail/action-panel";
import { EventLog } from "@/components/ring-detail/event-log";
import { GameStatus } from "@/components/ring-detail/game-status";
import { RingVisualizer } from "@/components/ring-detail/ring-visualizer";
import {
  createPublicClientForNetwork,
  getHeartbeatNetwork,
  type HeartbeatNetworkKey,
} from "@/lib/chain/config";
import { factoryABI } from "@/lib/contracts/abi";
import { truncateAddress } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

type RingPageProps = {
  params: Promise<{ address: string }>;
  searchParams: Promise<{ network?: HeartbeatNetworkKey | HeartbeatNetworkKey[] }>;
};

type RingPageStateProps = {
  description: string;
  networkKey: HeartbeatNetworkKey;
  title: string;
  tone?: "default" | "error";
};

export default async function RingPage({ params, searchParams }: RingPageProps) {
  const { address } = await params;
  const { network } = await searchParams;
  const selectedNetwork = getHeartbeatNetwork(network);

  if (!selectedNetwork.hasFactory) {
    return (
      <RingPageState
        description={`Set ${selectedNetwork.factoryEnvLabel} before opening ${selectedNetwork.label.toLowerCase()} ring detail pages.`}
        networkKey={selectedNetwork.key}
        title="Factory address missing"
        tone="error"
      />
    );
  }

  if (!isAddress(address)) {
    return (
      <RingPageState
        description="The provided ring address is not valid."
        networkKey={selectedNetwork.key}
        title="Ring not found"
      />
    );
  }

  const ringAddress = getAddress(address);
  const publicClient = createPublicClientForNetwork(selectedNetwork.key);

  let isRing = false;

  try {
    isRing = await publicClient.readContract({
      address: selectedNetwork.factoryAddress,
      abi: factoryABI,
      functionName: "isRing",
      args: [ringAddress],
    });
  } catch {
    isRing = false;
  }

  if (!isRing) {
    return (
      <RingPageState
        description={`This address is not registered in the ${selectedNetwork.longLabel} HeartbeatRing factory.`}
        networkKey={selectedNetwork.key}
        title="Ring not found"
      />
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
        <Link
          href={{ pathname: "/", query: { network: selectedNetwork.key } }}
          className="text-sm text-gray-400 hover:text-gray-200"
        >
          ← Back to Rings
        </Link>
        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-gray-500">
              Ring Detail · {selectedNetwork.longLabel}
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-gray-50">
              Ring {truncateAddress(ringAddress)}
            </h1>
            <p className="mt-2 break-all font-mono text-sm text-gray-500">
              {ringAddress}
            </p>
          </div>
        </div>
      </section>

      <GameStatus ringAddress={ringAddress} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <div className="order-1">
          <RingVisualizer ringAddress={ringAddress} />
        </div>
        <div className="order-3 xl:order-2">
          <EventLog ringAddress={ringAddress} />
        </div>
        <div className="order-2 xl:order-3 xl:col-span-2">
          <ActionPanel ringAddress={ringAddress} />
        </div>
      </div>
    </div>
  );
}

function RingPageState({
  description,
  networkKey,
  title,
  tone = "default",
}: RingPageStateProps) {
  const toneClass =
    tone === "error"
      ? "border-red-500/30 bg-red-500/10 text-red-200"
      : "border-gray-800 bg-gray-900 text-gray-400";

  return (
    <div className="space-y-6">
      <Link
        href={{ pathname: "/", query: { network: networkKey } }}
        className="text-sm text-gray-400 hover:text-gray-200"
      >
        ← Back to Rings
      </Link>
      <div className={`rounded-2xl border p-6 ${toneClass}`}>
        <h1 className="text-2xl font-semibold text-gray-50">{title}</h1>
        <p className="mt-2 text-sm">{description}</p>
      </div>
    </div>
  );
}
