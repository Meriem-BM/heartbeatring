import { describe, expect, test } from "bun:test";
import { getAddress } from "viem";

import { rootstockMainnet, rootstockTestnet } from "../src/chains";
import { silentLogger } from "../src/logger";
import type {
  NetworkKey,
  NetworkRuntimeConfig,
  NewHeadHandlers,
  NewHeadSubscriber,
} from "../src/types";
import { runWatchMode } from "../src/watcher";

function networkConfig(key: NetworkKey): NetworkRuntimeConfig {
  return {
    chain: key === "mainnet" ? rootstockMainnet : rootstockTestnet,
    factoryAddress: getAddress("0xf3e5fe303E01546a6Cc04380e18288ce6D30E002"),
    key,
    privateKey: undefined,
    rpcUrl: "https://public-node.testnet.rsk.co",
  };
}

async function waitFor(
  predicate: () => boolean,
  timeoutMs = 2_000,
) {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error("Timed out waiting for condition.");
    }

    await new Promise<void>((resolve) => setTimeout(resolve, 5));
  }
}

describe("watch mode", () => {
  test("new block trigger executes a run", async () => {
    const abortController = new AbortController();
    const handlersByAttempt: NewHeadHandlers[] = [];
    let runs = 0;

    const subscribeNewHeads: NewHeadSubscriber = (_network, next) => {
      handlersByAttempt.push(next);
      return () => undefined;
    };

    const watchPromise = runWatchMode(
      [networkConfig("testnet")],
      async () => {
        runs += 1;
      },
      subscribeNewHeads,
      silentLogger,
      {
        signal: abortController.signal,
        sleep: async () => undefined,
      },
    );

    await waitFor(() => runs === 1 && handlersByAttempt.length >= 1);
    handlersByAttempt[0]?.onBlock(123n);
    await waitFor(() => runs === 2);

    abortController.abort();
    await watchPromise;
  });

  test("coalesces overlapping runs into one queued follow-up", async () => {
    const abortController = new AbortController();
    const handlersByAttempt: NewHeadHandlers[] = [];
    let runs = 0;
    let releaseFirstRun: () => void = () => undefined;

    const subscribeNewHeads: NewHeadSubscriber = (_network, next) => {
      handlersByAttempt.push(next);
      return () => undefined;
    };

    const watchPromise = runWatchMode(
      [networkConfig("testnet")],
      async () => {
        runs += 1;

        if (runs === 1) {
          await new Promise<void>((resolve) => {
            releaseFirstRun = resolve;
          });
        }
      },
      subscribeNewHeads,
      silentLogger,
      {
        signal: abortController.signal,
        sleep: async () => undefined,
      },
    );

    await waitFor(() => runs === 1 && handlersByAttempt.length >= 1);
    handlersByAttempt[0]?.onBlock(200n);
    handlersByAttempt[0]?.onBlock(201n);

    await new Promise<void>((resolve) => setTimeout(resolve, 20));
    expect(runs).toBe(1);

    releaseFirstRun();
    await waitFor(() => runs === 2);

    abortController.abort();
    await watchPromise;
  });

  test("subscription error triggers reconnect and resumes processing", async () => {
    const abortController = new AbortController();
    const handlersByAttempt = new Map<number, NewHeadHandlers>();
    const reconnectSleeps: number[] = [];
    let attempt = 0;
    let runs = 0;

    const subscribeNewHeads: NewHeadSubscriber = (_network, handlers) => {
      attempt += 1;
      handlersByAttempt.set(attempt, handlers);
      return () => undefined;
    };

    const watchPromise = runWatchMode(
      [networkConfig("testnet")],
      async () => {
        runs += 1;
      },
      subscribeNewHeads,
      silentLogger,
      {
        signal: abortController.signal,
        sleep: async (ms) => {
          reconnectSleeps.push(ms);
        },
      },
    );

    await waitFor(() => attempt === 1 && runs === 1);
    handlersByAttempt.get(1)?.onError(new Error("ws dropped"));
    await waitFor(() => attempt === 2);

    handlersByAttempt.get(2)?.onBlock(300n);
    await waitFor(() => runs === 2);

    expect(reconnectSleeps[0]).toBe(1_000);

    abortController.abort();
    await watchPromise;
  });

  test("network watchers stay independent during reconnects", async () => {
    const abortController = new AbortController();
    const handlersByNetwork: Record<NetworkKey, NewHeadHandlers[]> = {
      mainnet: [] as NewHeadHandlers[],
      testnet: [] as NewHeadHandlers[],
    };
    const runCalls: NetworkKey[] = [];

    const subscribeNewHeads: NewHeadSubscriber = (network, handlers) => {
      handlersByNetwork[network].push(handlers);
      return () => undefined;
    };

    const watchPromise = runWatchMode(
      [networkConfig("testnet"), networkConfig("mainnet")],
      async (config) => {
        runCalls.push(config.key);
      },
      subscribeNewHeads,
      silentLogger,
      {
        signal: abortController.signal,
        sleep: async () => undefined,
      },
    );

    await waitFor(
      () =>
        runCalls.filter((key) => key === "testnet").length >= 1 &&
        runCalls.filter((key) => key === "mainnet").length >= 1 &&
        handlersByNetwork.testnet.length >= 1 &&
        handlersByNetwork.mainnet.length >= 1,
    );

    handlersByNetwork.testnet[0]?.onError(new Error("testnet drop"));
    handlersByNetwork.mainnet[0]?.onBlock(401n);

    await waitFor(
      () =>
        runCalls.filter((key) => key === "mainnet").length >= 2 &&
        handlersByNetwork.testnet.length >= 2,
    );

    abortController.abort();
    await watchPromise;
  });
});
