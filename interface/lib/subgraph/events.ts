import { getAddress } from "viem";

import { EVENT_LOG_LIMIT } from "@/lib/ring/ui";
import type { EventEntry } from "@/lib/types/ring";
import { formatToken, truncateAddress } from "@/lib/utils/format";

const RING_EVENTS_QUERY = `
  query RingEvents($ring: Bytes!, $limit: Int!) {
    ringEvents(
      first: $limit
      orderBy: blockNumber
      orderDirection: desc
      where: { ring: $ring }
    ) {
      id
      name
      participant
      target
      survivor
      liquidator
      creator
      epoch
      amount
      totalPool
      participants
      ringSize
      blockNumber
      logIndex
      transactionHash
    }
  }
`;

type SubgraphRingEvent = {
  amount?: string | null;
  blockNumber: string;
  creator?: string | null;
  epoch?: string | null;
  id: string;
  liquidator?: string | null;
  logIndex: string;
  name: string;
  participant?: string | null;
  participants?: string | null;
  ringSize?: string | null;
  survivor?: string | null;
  target?: string | null;
  totalPool?: string | null;
  transactionHash: string;
};

type RingEventsQueryResult = {
  ringEvents?: SubgraphRingEvent[];
};

type GraphQlPayload = {
  data?: RingEventsQueryResult;
  errors?: Array<{ message?: string }>;
};

type FetchRingEventsFromSubgraphParams = {
  endpoint: string;
  ringAddress: string;
  tokenSymbol: string;
};

function sortEntries(entries: readonly EventEntry[]) {
  return [...entries].sort((left, right) => {
    if (left.blockNumber !== right.blockNumber) {
      return left.blockNumber > right.blockNumber ? -1 : 1;
    }

    return right.logIndex - left.logIndex;
  });
}

function toBigInt(value: string | null | undefined) {
  if (!value) return 0n;

  try {
    return BigInt(value);
  } catch {
    return 0n;
  }
}

function toNumber(value: string | null | undefined) {
  const parsed = Number(toBigInt(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

function toShortAddress(value: string | null | undefined) {
  if (!value) return null;

  try {
    return truncateAddress(getAddress(value));
  } catch {
    return null;
  }
}

function resolveColorClass(name: string) {
  switch (name) {
    case "Registered":
    case "Heartbeat":
    case "Claimed":
    case "BountyWithdrawn":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
    case "Liquidated":
    case "RegistrationRefunded":
      return "border-red-500/30 bg-red-500/10 text-red-200";
    default:
      return "border-yellow-500/30 bg-yellow-500/10 text-yellow-100";
  }
}

function buildMessage(event: SubgraphRingEvent, tokenSymbol: string) {
  switch (event.name) {
    case "Registered": {
      const participant = toShortAddress(event.participant);
      return participant ? `${participant} joined the ring.` : null;
    }
    case "RegistrationRefunded": {
      const participant = toShortAddress(event.participant);
      return participant ? `${participant} received a registration refund.` : null;
    }
    case "RingFormed":
      return `Ring formed with ${toBigInt(event.participants).toString()} participants.`;
    case "Heartbeat": {
      const participant = toShortAddress(event.participant);
      return participant
        ? `${participant} sent heartbeat for epoch ${toBigInt(event.epoch).toString()}.`
        : null;
    }
    case "Liquidated": {
      const target = toShortAddress(event.target);
      return target
        ? `${target} was liquidated in epoch ${toBigInt(event.epoch).toString()}.`
        : null;
    }
    case "RingRelinked":
      return `Ring relinked. ${toBigInt(event.ringSize).toString()} players remain alive.`;
    case "GameOver":
      return `Game over. Pool ${formatToken(toBigInt(event.totalPool), tokenSymbol)}.`;
    case "Claimed": {
      const survivor = toShortAddress(event.survivor);
      return survivor
        ? `${survivor} claimed ${formatToken(toBigInt(event.amount), tokenSymbol)}.`
        : null;
    }
    case "BountyAccrued": {
      const liquidator = toShortAddress(event.liquidator);
      return liquidator
        ? `${liquidator} earned ${formatToken(toBigInt(event.amount), tokenSymbol)} bounty.`
        : null;
    }
    case "BountyWithdrawn": {
      const liquidator = toShortAddress(event.liquidator);
      return liquidator
        ? `${liquidator} withdrew ${formatToken(toBigInt(event.amount), tokenSymbol)} bounty.`
        : null;
    }
    case "Initialized": {
      const creator = toShortAddress(event.creator);
      return creator ? `Ring initialized by ${creator}.` : null;
    }
    default:
      return null;
  }
}

function toEventEntry(event: SubgraphRingEvent, tokenSymbol: string): EventEntry | null {
  const message = buildMessage(event, tokenSymbol);

  if (!message) return null;

  return {
    blockNumber: toBigInt(event.blockNumber),
    colorClass: resolveColorClass(event.name),
    id: event.id || `${event.transactionHash}-${event.logIndex}-${event.name}`,
    logIndex: toNumber(event.logIndex),
    message,
  };
}

export async function fetchRingEventEntriesFromSubgraph({
  endpoint,
  ringAddress,
  tokenSymbol,
}: FetchRingEventsFromSubgraphParams) {
  const response = await fetch(endpoint, {
    body: JSON.stringify({
      query: RING_EVENTS_QUERY,
      variables: {
        limit: EVENT_LOG_LIMIT,
        ring: ringAddress.toLowerCase(),
      },
    }),
    cache: "no-store",
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Subgraph request failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as GraphQlPayload;

  if (payload.errors && payload.errors.length > 0) {
    const message = payload.errors
      .map((error) => error.message?.trim())
      .filter(Boolean)
      .join(" ");

    throw new Error(message || "Subgraph query failed.");
  }

  const events = payload.data?.ringEvents ?? [];

  return sortEntries(
    events
      .map((event) => toEventEntry(event, tokenSymbol))
      .filter((entry): entry is EventEntry => entry !== null),
  ).slice(0, EVENT_LOG_LIMIT);
}
