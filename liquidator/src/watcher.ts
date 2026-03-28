import type { Logger } from "./logger";
import type {
  NetworkRuntimeConfig,
  NewHeadSubscriber,
} from "./types";

const DEFAULT_INITIAL_RECONNECT_DELAY_MS = 1_000;
const DEFAULT_MAX_RECONNECT_DELAY_MS = 30_000;

type SleepFn = (ms: number) => Promise<void>;
type RunNetworkFn = (networkConfig: NetworkRuntimeConfig) => Promise<void>;

type WatchModeOptions = {
  initialReconnectDelayMs?: number;
  maxReconnectDelayMs?: number;
  signal?: AbortSignal;
  sleep?: SleepFn;
};

function toErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return String(error);
}

function abortPromise(signal?: AbortSignal) {
  if (!signal) {
    return new Promise<void>(() => undefined);
  }

  if (signal.aborted) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    const onAbort = () => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    };

    signal.addEventListener("abort", onAbort, { once: true });
  });
}

async function sleepWithAbort(
  ms: number,
  signal: AbortSignal | undefined,
  sleep: SleepFn,
) {
  if (!signal) {
    await sleep(ms);
    return;
  }

  if (signal.aborted) {
    return;
  }

  await Promise.race([sleep(ms), abortPromise(signal)]);
}

async function watchSingleNetwork(
  networkConfig: NetworkRuntimeConfig,
  runNetwork: RunNetworkFn,
  subscribeNewHeads: NewHeadSubscriber,
  logger: Logger,
  options: Required<Pick<WatchModeOptions, "initialReconnectDelayMs" | "maxReconnectDelayMs" | "sleep">> & {
    signal?: AbortSignal;
  },
) {
  let runningPromise: Promise<void> | null = null;
  let queuedFollowUp = false;
  let reconnectDelayMs = options.initialReconnectDelayMs;

  const enqueueRun = (reason: string) => {
    if (options.signal?.aborted) {
      return;
    }

    if (runningPromise) {
      queuedFollowUp = true;
      logger.info(
        `[watch:${networkConfig.key}] Run already in progress; queued follow-up (${reason}).`,
      );
      return;
    }

    runningPromise = (async () => {
      let runReason = reason;

      do {
        queuedFollowUp = false;
        try {
          logger.info(
            `[watch:${networkConfig.key}] Starting liquidation run (${runReason}).`,
          );
          await runNetwork(networkConfig);
        } catch (error) {
          logger.warn(
            `[watch:${networkConfig.key}] Liquidation run failed: ${toErrorMessage(error)}.`,
          );
        }

        runReason = "coalesced-follow-up";
      } while (queuedFollowUp && !options.signal?.aborted);
    })().finally(() => {
      const hadLateQueuedFollowUp = queuedFollowUp;
      runningPromise = null;

      if (hadLateQueuedFollowUp && !options.signal?.aborted) {
        queuedFollowUp = false;
        enqueueRun("coalesced-follow-up");
      }
    });
  };

  enqueueRun("startup");

  while (!options.signal?.aborted) {
    let closeSubscription!: () => void;
    const subscriptionClosed = new Promise<void>((resolve) => {
      closeSubscription = resolve;
    });

    let closed = false;
    let unsubscribe: (() => void) | null = null;

    const closeOnce = () => {
      if (closed) {
        return;
      }
      closed = true;
      closeSubscription();
    };

    try {
      unsubscribe = subscribeNewHeads(networkConfig.key, {
        onBlock: (blockNumber) => {
          enqueueRun(`new-head:${blockNumber.toString()}`);
        },
        onError: (error) => {
          logger.warn(
            `[watch:${networkConfig.key}] Subscription error: ${toErrorMessage(error)}.`,
          );
          closeOnce();
        },
      });

      logger.info(
        `[watch:${networkConfig.key}] Subscribed to new block headers.`,
      );
      reconnectDelayMs = options.initialReconnectDelayMs;

      await Promise.race([
        subscriptionClosed,
        abortPromise(options.signal),
      ]);
    } catch (error) {
      logger.warn(
        `[watch:${networkConfig.key}] Subscription setup failed: ${toErrorMessage(error)}.`,
      );
    } finally {
      if (unsubscribe) {
        try {
          unsubscribe();
        } catch {
          // Ignore teardown errors during reconnect/shutdown.
        }
      }
    }

    if (options.signal?.aborted) {
      break;
    }

    logger.warn(
      `[watch:${networkConfig.key}] Reconnecting in ${reconnectDelayMs}ms.`,
    );
    await sleepWithAbort(reconnectDelayMs, options.signal, options.sleep);
    reconnectDelayMs = Math.min(
      reconnectDelayMs * 2,
      options.maxReconnectDelayMs,
    );
  }

  if (runningPromise) {
    await runningPromise;
  }

  logger.info(`[watch:${networkConfig.key}] Watcher stopped.`);
}

export async function runWatchMode(
  networkConfigs: readonly NetworkRuntimeConfig[],
  runNetwork: RunNetworkFn,
  subscribeNewHeads: NewHeadSubscriber,
  logger: Logger,
  options: WatchModeOptions = {},
) {
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  }));

  const initialReconnectDelayMs =
    options.initialReconnectDelayMs ?? DEFAULT_INITIAL_RECONNECT_DELAY_MS;
  const maxReconnectDelayMs =
    options.maxReconnectDelayMs ?? DEFAULT_MAX_RECONNECT_DELAY_MS;

  await Promise.all(
    networkConfigs.map((networkConfig) =>
      watchSingleNetwork(networkConfig, runNetwork, subscribeNewHeads, logger, {
        initialReconnectDelayMs,
        maxReconnectDelayMs,
        signal: options.signal,
        sleep,
      }),
    ),
  );
}
