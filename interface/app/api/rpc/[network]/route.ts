import type { NextRequest } from "next/server";

const DEFAULT_RPC_URL_BY_NETWORK = {
  mainnet: "https://public-node.rsk.co",
  testnet: "https://public-node.testnet.rsk.co",
} as const;

type SupportedNetwork = keyof typeof DEFAULT_RPC_URL_BY_NETWORK;

function uniqueUrls(values: readonly string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function isSupportedNetwork(value: string): value is SupportedNetwork {
  return value === "testnet" || value === "mainnet";
}

function resolvePrimaryRpcUrl(network: SupportedNetwork) {
  if (network === "mainnet") {
    return (
      process.env.ROOTSTOCK_RPC_URL_MAINNET?.trim() ||
      process.env.ROOTSTOCK_RPC_URL?.trim() ||
      DEFAULT_RPC_URL_BY_NETWORK.mainnet
    );
  }

  return (
    process.env.ROOTSTOCK_RPC_URL_TESTNET?.trim() ||
    process.env.ROOTSTOCK_RPC_URL?.trim() ||
    DEFAULT_RPC_URL_BY_NETWORK.testnet
  );
}

function resolveRpcUrls(network: SupportedNetwork) {
  return uniqueUrls([
    resolvePrimaryRpcUrl(network),
    DEFAULT_RPC_URL_BY_NETWORK[network],
  ]);
}

function isValidRpcPayload(value: unknown) {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return true;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ network: string }> },
) {
  const { network } = await context.params;

  if (!isSupportedNetwork(network)) {
    return new Response(
      JSON.stringify({ error: "Unsupported network." }),
      {
        headers: { "content-type": "application/json" },
        status: 400,
      },
    );
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON payload." }),
      {
        headers: { "content-type": "application/json" },
        status: 400,
      },
    );
  }

  if (!isValidRpcPayload(payload)) {
    return new Response(
      JSON.stringify({ error: "JSON-RPC payload must be an object or non-empty array." }),
      {
        headers: { "content-type": "application/json" },
        status: 400,
      },
    );
  }

  const serializedPayload = JSON.stringify(payload);
  const rpcUrls = resolveRpcUrls(network);
  let lastStatus = 502;
  let lastBody = "";

  for (const rpcUrl of rpcUrls) {
    try {
      const upstreamResponse = await fetch(rpcUrl, {
        body: serializedPayload,
        cache: "no-store",
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const responseBody = await upstreamResponse.text();

      if (!upstreamResponse.ok) {
        lastStatus = upstreamResponse.status;
        lastBody = responseBody;
        continue;
      }

      return new Response(responseBody, {
        headers: {
          "content-type":
            upstreamResponse.headers.get("content-type") ??
            "application/json; charset=utf-8",
        },
        status: upstreamResponse.status,
      });
    } catch {
      lastStatus = 502;
    }
  }

  return new Response(
    JSON.stringify({
      error:
        lastBody || "All configured RPC upstreams failed for this request.",
    }),
    {
      headers: { "content-type": "application/json; charset=utf-8" },
      status: lastStatus,
    },
  );
}
