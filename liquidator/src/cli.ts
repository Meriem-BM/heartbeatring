import { parseCliOptions, helpText } from "./cli-options";
import { loadRuntimeConfig } from "./config";
import { consoleLogger } from "./logger";
import { runLiquidator } from "./runner";
import { createViemGateway } from "./viem-gateway";

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

  consoleLogger.info(
    `Starting one-shot run (network=${options.network}, dryRun=${options.dryRun}, maxTxPerRun=${runtimeConfig.maxTxPerRun}).`,
  );

  const gateway = createViemGateway(runtimeConfig.networks);

  const summary = await runLiquidator(
    gateway,
    runtimeConfig.networks,
    {
      dryRun: options.dryRun,
      maxTxPerRun: runtimeConfig.maxTxPerRun,
    },
    consoleLogger,
  );

  printSummary(summary);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[liquidator] Fatal: ${message}`);
  process.exit(1);
});
