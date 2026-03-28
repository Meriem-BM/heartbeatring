import { getAddress } from "viem";
import type { Address } from "viem";

import { toErrorMessage } from "./error-utils";
import type { Logger } from "./logger";
import type {
  ExecutionReport,
  LiquidationCandidate,
  LiquidatorGateway,
  LiquidatorRunOptions,
  NetworkKey,
  NetworkRuntimeConfig,
  NetworkScanReport,
  RunSummary,
  ScanReport,
} from "./types";

function candidateKey(candidate: LiquidationCandidate) {
  return `${candidate.network}:${candidate.ringAddress.toLowerCase()}:${candidate.targetAddress.toLowerCase()}`;
}

function createNetworkCounters() {
  return {
    mainnet: 0,
    testnet: 0,
  } satisfies Record<NetworkKey, number>;
}

export function applyTxCap(
  candidates: readonly LiquidationCandidate[],
  maxTxPerRun: number,
) {
  const withinCap = candidates.slice(0, maxTxPerRun);

  return {
    skippedByCap: Math.max(0, candidates.length - withinCap.length),
    withinCap,
  };
}

export async function scanNetwork(
  gateway: LiquidatorGateway,
  network: NetworkKey,
  logger: Logger,
): Promise<NetworkScanReport> {
  const rings = (await gateway.getAllRings(network)).map((ring) =>
    getAddress(ring),
  );

  const report: NetworkScanReport = {
    activeRings: 0,
    candidates: [],
    delinquentTargetsFound: 0,
    network,
    ringsScanned: rings.length,
  };

  for (const ringAddress of rings) {
    let phase: number;

    try {
      phase = await gateway.getPhase(network, ringAddress);
    } catch (error) {
      logger.warn(
        `Skipping ring ${ringAddress} on ${network}: phase read failed (${toErrorMessage(error)}).`,
      );
      continue;
    }

    if (phase !== 1) {
      continue;
    }

    report.activeRings += 1;

    let members: Address[];

    try {
      members = (await gateway.getRingMembers(network, ringAddress)).map(
        (member) => getAddress(member),
      );
    } catch (error) {
      logger.warn(
        `Skipping active ring ${ringAddress} on ${network}: getRing failed (${toErrorMessage(error)}).`,
      );
      continue;
    }

    const delinquentResults = await Promise.all(
      members.map(async (member) => {
        try {
          return await gateway.isDelinquent(network, ringAddress, member);
        } catch (error) {
          logger.warn(
            `isDelinquent failed for ${member} in ring ${ringAddress} on ${network}: ${toErrorMessage(error)}.`,
          );
          return false;
        }
      }),
    );

    for (const [index, isDelinquent] of delinquentResults.entries()) {
      if (!isDelinquent) {
        continue;
      }

      const targetAddress = members[index];
      if (!targetAddress) {
        continue;
      }

      report.candidates.push({
        network,
        ringAddress,
        targetAddress,
      });
    }
  }

  report.delinquentTargetsFound = report.candidates.length;

  return report;
}

export async function scanNetworks(
  gateway: LiquidatorGateway,
  networks: readonly NetworkKey[],
  logger: Logger,
): Promise<ScanReport> {
  const perNetwork: NetworkScanReport[] = [];
  const candidates: LiquidationCandidate[] = [];
  const totals = {
    activeRings: 0,
    delinquentTargetsFound: 0,
    ringsScanned: 0,
  };

  for (const network of networks) {
    const report = await scanNetwork(gateway, network, logger);

    perNetwork.push(report);
    candidates.push(...report.candidates);

    totals.ringsScanned += report.ringsScanned;
    totals.activeRings += report.activeRings;
    totals.delinquentTargetsFound += report.delinquentTargetsFound;
  }

  return {
    candidates,
    perNetwork,
    totals,
  };
}

export async function executeCandidates(
  gateway: LiquidatorGateway,
  candidates: readonly LiquidationCandidate[],
  options: LiquidatorRunOptions,
  logger: Logger,
): Promise<ExecutionReport> {
  const { withinCap, skippedByCap } = applyTxCap(candidates, options.maxTxPerRun);
  const txFailedByNetwork = createNetworkCounters();
  const txSucceededByNetwork = createNetworkCounters();

  if (options.dryRun) {
    for (const candidate of withinCap) {
      logger.info(
        `[dry-run] ${candidate.network} ring=${candidate.ringAddress} target=${candidate.targetAddress}`,
      );
    }

    return {
      skippedByCap,
      txAttempted: 0,
      txFailed: 0,
      txFailedByNetwork,
      txSucceeded: 0,
      txSucceededByNetwork,
    };
  }

  let txAttempted = 0;
  let txSucceeded = 0;
  let txFailed = 0;

  for (const candidate of withinCap) {
    txAttempted += 1;

    try {
      const txHash = await gateway.liquidate(
        candidate.network,
        candidate.ringAddress,
        candidate.targetAddress,
      );

      logger.info(
        `Submitted liquidation tx ${txHash} for target ${candidate.targetAddress} in ring ${candidate.ringAddress} (${candidate.network}).`,
      );

      const status = await gateway.waitForReceipt(candidate.network, txHash);

      if (status === "success") {
        txSucceeded += 1;
        txSucceededByNetwork[candidate.network] += 1;
        logger.info(
          `Confirmed liquidation tx ${txHash} for ${candidate.targetAddress} (${candidate.network}).`,
        );
      } else {
        txFailed += 1;
        txFailedByNetwork[candidate.network] += 1;
        logger.warn(
          `Liquidation tx ${txHash} reverted for ${candidate.targetAddress} (${candidate.network}).`,
        );
      }
    } catch (error) {
      txFailed += 1;
      txFailedByNetwork[candidate.network] += 1;
      logger.warn(
        `Liquidation failed for target ${candidate.targetAddress} in ring ${candidate.ringAddress} (${candidate.network}): ${toErrorMessage(error)}.`,
      );
    }
  }

  return {
    skippedByCap,
    txAttempted,
    txFailed,
    txFailedByNetwork,
    txSucceeded,
    txSucceededByNetwork,
  };
}

function mergeExecutionReports(
  left: ExecutionReport,
  right: ExecutionReport,
): ExecutionReport {
  return {
    skippedByCap: left.skippedByCap + right.skippedByCap,
    txAttempted: left.txAttempted + right.txAttempted,
    txFailed: left.txFailed + right.txFailed,
    txFailedByNetwork: {
      mainnet:
        left.txFailedByNetwork.mainnet + right.txFailedByNetwork.mainnet,
      testnet:
        left.txFailedByNetwork.testnet + right.txFailedByNetwork.testnet,
    },
    txSucceeded: left.txSucceeded + right.txSucceeded,
    txSucceededByNetwork: {
      mainnet:
        left.txSucceededByNetwork.mainnet + right.txSucceededByNetwork.mainnet,
      testnet:
        left.txSucceededByNetwork.testnet + right.txSucceededByNetwork.testnet,
    },
  };
}

export async function runLiquidator(
  gateway: LiquidatorGateway,
  networkConfigs: readonly NetworkRuntimeConfig[],
  options: LiquidatorRunOptions,
  logger: Logger,
): Promise<RunSummary> {
  const networks = networkConfigs.map((config) => config.key);
  const scanReport = await scanNetworks(gateway, networks, logger);
  let executionReport = await executeCandidates(
    gateway,
    scanReport.candidates,
    options,
    logger,
  );

  if (!options.dryRun && executionReport.txAttempted < options.maxTxPerRun) {
    const seenCandidateKeys = new Set(scanReport.candidates.map(candidateKey));

    while (executionReport.txAttempted < options.maxTxPerRun) {
      const remainingTx = options.maxTxPerRun - executionReport.txAttempted;
      const refreshScan = await scanNetworks(gateway, networks, logger);
      const refreshCandidates = refreshScan.candidates.filter((candidate) => {
        const key = candidateKey(candidate);

        if (seenCandidateKeys.has(key)) {
          return false;
        }

        seenCandidateKeys.add(key);
        return true;
      });

      if (refreshCandidates.length === 0) {
        break;
      }

      logger.info(
        `Refresh scan found ${refreshCandidates.length} additional candidate(s); ${remainingTx} tx slot(s) remaining in this run.`,
      );

      const refreshExecution = await executeCandidates(
        gateway,
        refreshCandidates,
        {
          ...options,
          maxTxPerRun: remainingTx,
        },
        logger,
      );
      executionReport = mergeExecutionReports(executionReport, refreshExecution);
    }
  }

  return {
    activeRings: scanReport.totals.activeRings,
    delinquentTargetsFound: scanReport.totals.delinquentTargetsFound,
    dryRun: options.dryRun,
    maxTxPerRun: options.maxTxPerRun,
    networks,
    perNetwork: scanReport.perNetwork.map((scan) => ({
      activeRings: scan.activeRings,
      delinquentTargetsFound: scan.delinquentTargetsFound,
      network: scan.network,
      ringsScanned: scan.ringsScanned,
      txFailed: executionReport.txFailedByNetwork[scan.network],
      txSucceeded: executionReport.txSucceededByNetwork[scan.network],
    })),
    ringsScanned: scanReport.totals.ringsScanned,
    skippedByCap: executionReport.skippedByCap,
    txAttempted: executionReport.txAttempted,
    txFailed: executionReport.txFailed,
    txSucceeded: executionReport.txSucceeded,
  };
}
