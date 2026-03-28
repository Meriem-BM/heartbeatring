import { parseCliOptions, helpText } from "./cli-options";
import { loadRuntimeConfig } from "./config";
import { consoleLogger } from "./logger";
import { runLiquidator } from "./runner";
import { createViemGateway, createViemNewHeadSubscriber } from "./viem-gateway";
import { runWatchMode } from "./watcher";

function printSummary(summary: Awaited<ReturnType<typeof runLiquidator>>) {
  console.log(
    JSON.stringify(
      {
        type: "liquidator-summary",
        generatedAt: new Date().toISOString(),
        ...summary,
      },
      null,
      2,
    ),
  );
}

async function main() {
  const options = parseCliOptions(process.argv.slice(2));

  if (options.help) {
    console.log(helpText());
    return;
  }

  const runtimeConfig = loadRuntimeConfig(process.env, options);

  const gateway = createViemGateway(runtimeConfig.networks);
  const runOptions = {
    dryRun: options.dryRun,
    maxTxPerRun: runtimeConfig.maxTxPerRun,
  };

  if (options.watch) {
    consoleLogger.info(
      `Starting watch mode (network=${options.network}, dryRun=${options.dryRun}, maxTxPerRun=${runtimeConfig.maxTxPerRun}).`,
    );

    const subscriber = createViemNewHeadSubscriber(runtimeConfig.networks);
    const abortController = new AbortController();

    const handleShutdown = () => {
      if (abortController.signal.aborted) {
        return;
      }

      consoleLogger.info("Shutdown signal received. Stopping watchers...");
      abortController.abort();
    };

    process.once("SIGINT", handleShutdown);
    process.once("SIGTERM", handleShutdown);

    try {
      await runWatchMode(
        runtimeConfig.networks,
        async (networkConfig) => {
          const summary = await runLiquidator(
            gateway,
            [networkConfig],
            runOptions,
            consoleLogger,
          );

          consoleLogger.info(
            `[watch:${networkConfig.key}] Summary: ringsScanned=${summary.ringsScanned}, activeRings=${summary.activeRings}, delinquent=${summary.delinquentTargetsFound}, txAttempted=${summary.txAttempted}, txSucceeded=${summary.txSucceeded}, txFailed=${summary.txFailed}.`,
          );
        },
        subscriber,
        consoleLogger,
        { signal: abortController.signal },
      );
    } finally {
      process.removeListener("SIGINT", handleShutdown);
      process.removeListener("SIGTERM", handleShutdown);
    }

    return;
  }

  consoleLogger.info(
    `Starting one-shot run (network=${options.network}, dryRun=${options.dryRun}, maxTxPerRun=${runtimeConfig.maxTxPerRun}).`,
  );

  const summary = await runLiquidator(
    gateway,
    runtimeConfig.networks,
    runOptions,
    consoleLogger,
  );

  printSummary(summary);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[liquidator] Fatal: ${message}`);
  process.exit(1);
});
