import Link from "next/link";
import { getAddress, isAddress } from "viem";

import { ActionPanel } from "@/components/ring-detail/action-panel";
import { EventLog } from "@/components/ring-detail/event-log";
import { GameStatus } from "@/components/ring-detail/game-status";
import { RingVisualizer } from "@/components/ring-detail/ring-visualizer";
import { Notice } from "@/components/ui/notice";
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
        description={`Factory is not configured yet for ${selectedNetwork.label.toLowerCase()}. Open a testnet ring instead.`}
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
    <div className="space-y-5">
      <section className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
        <Link
          href={{ pathname: "/", query: { network: selectedNetwork.key } }}
          className="inline-flex text-sm text-gray-400 transition hover:text-gray-200"
        >
          ← Back to Rings
        </Link>

        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.22em] text-gray-500">Ring Detail</p>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-50">
              Ring {truncateAddress(ringAddress)}
            </h1>
            <p className="break-all font-mono text-xs text-gray-500">{ringAddress}</p>
          </div>

          <div className="rounded-lg border border-gray-800 bg-gray-950 px-3 py-2">
            <p className="text-[11px] uppercase tracking-[0.2em] text-gray-500">Network</p>
            <p className="mt-1 text-sm text-gray-200">{selectedNetwork.longLabel}</p>
          </div>
        </div>
      </section>

      <GameStatus ringAddress={ringAddress} />

      <div className="grid gap-6 xl:grid-cols-2">
        <RingVisualizer ringAddress={ringAddress} />
        <EventLog ringAddress={ringAddress} />
      </div>

      <ActionPanel ringAddress={ringAddress} />
    </div>
  );
}

function RingPageState({
  description,
  networkKey,
  title,
  tone = "default",
}: RingPageStateProps) {
  const noticeTone = tone === "error" ? "error" : "default";

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
        <Link
          href={{ pathname: "/", query: { network: networkKey } }}
          className="inline-flex text-sm text-gray-400 transition hover:text-gray-200"
        >
          ← Back to Rings
        </Link>

        <Notice tone={noticeTone} title={title} className="mt-4">
          {description}
        </Notice>
      </section>
    </div>
  );
}
