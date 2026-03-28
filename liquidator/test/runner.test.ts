import { describe, expect, test } from "bun:test";
import { getAddress } from "viem";
import type { Address, Hex } from "viem";

import { silentLogger } from "../src/logger";
import {
  executeCandidates,
  runLiquidator,
  scanNetworks,
} from "../src/runner";
import { rootstockTestnet } from "../src/chains";
import type {
  LiquidationCandidate,
  LiquidatorGateway,
  NetworkKey,
  NetworkRuntimeConfig,
  TxStatus,
} from "../src/types";

function toAddress(seed: number): Address {
  return getAddress(`0x${seed.toString(16).padStart(40, "0")}`);
}

function candidateKey(candidate: LiquidationCandidate) {
  return `${candidate.network}:${candidate.ringAddress}:${candidate.targetAddress}`;
}

function pairKey(ringAddress: Address, targetAddress: Address) {
  return `${ringAddress.toLowerCase()}::${targetAddress.toLowerCase()}`;
}

type MockGatewayState = {
  delayByParticipantMs?: Map<string, number>;
  delinquentPairs?: Set<string>;
  liquidatePlan?: Map<string, { receiptStatus?: TxStatus; throwError?: string }>;
  membersByRing?: Map<string, Address[]>;
  phasesByRing?: Map<string, number>;
  ringsByNetwork?: Partial<Record<NetworkKey, Address[]>>;
};

function createMockGateway(state: MockGatewayState = {}) {
  const txStatusByHash = new Map<Hex, TxStatus>();
  const liquidateCalls: Array<{
    network: NetworkKey;
    ringAddress: Address;
    target: Address;
  }> = [];
  let txCounter = 1;

  const gateway: LiquidatorGateway = {
    async getAllRings(network) {
      return state.ringsByNetwork?.[network] ?? [];
    },

    async getPhase(_network, ringAddress) {
      return state.phasesByRing?.get(ringAddress.toLowerCase()) ?? 0;
    },

    async getRingMembers(_network, ringAddress) {
      return state.membersByRing?.get(ringAddress.toLowerCase()) ?? [];
    },

    async isDelinquent(_network, ringAddress, participant) {
      const delay =
        state.delayByParticipantMs?.get(participant.toLowerCase()) ?? 0;

      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      return (
        state.delinquentPairs?.has(pairKey(ringAddress, participant)) ?? false
      );
    },

    async liquidate(network, ringAddress, target) {
      liquidateCalls.push({ network, ringAddress, target });

      const plan = state.liquidatePlan?.get(pairKey(ringAddress, target));
      if (plan?.throwError) {
        throw new Error(plan.throwError);
      }

      const txHash = `0x${txCounter.toString(16).padStart(64, "0")}` as Hex;
      txCounter += 1;

      txStatusByHash.set(txHash, plan?.receiptStatus ?? "success");
      return txHash;
    },

    async waitForReceipt(_network, txHash) {
      return txStatusByHash.get(txHash) ?? "success";
    },
  };

  return { gateway, liquidateCalls };
}

const TESTNET_CONFIG: NetworkRuntimeConfig = {
  chain: rootstockTestnet,
  factoryAddress: toAddress(5000),
  key: "testnet",
  privateKey: `0x${"11".repeat(32)}` as Hex,
  rpcUrl: "http://localhost:8545",
};

describe("scan pipeline", () => {
  test("candidate discovery returns expected targets", async () => {
    const ringA = toAddress(1);
    const ringB = toAddress(2);
    const ringC = toAddress(3);
    const memberA1 = toAddress(11);
    const memberA2 = toAddress(12);
    const memberC1 = toAddress(13);
    const memberC2 = toAddress(14);

    const { gateway } = createMockGateway({
      delinquentPairs: new Set([
        pairKey(ringA, memberA2),
        pairKey(ringC, memberC1),
      ]),
      membersByRing: new Map([
        [ringA.toLowerCase(), [memberA1, memberA2]],
        [ringC.toLowerCase(), [memberC1, memberC2]],
      ]),
      phasesByRing: new Map([
        [ringA.toLowerCase(), 1],
        [ringB.toLowerCase(), 0],
        [ringC.toLowerCase(), 1],
      ]),
      ringsByNetwork: {
        testnet: [ringA, ringB, ringC],
      },
    });

    const scan = await scanNetworks(gateway, ["testnet"], silentLogger);

    expect(scan.totals.ringsScanned).toBe(3);
    expect(scan.totals.activeRings).toBe(2);
    expect(scan.totals.delinquentTargetsFound).toBe(2);
    expect(scan.candidates.map(candidateKey)).toEqual([
      `testnet:${ringA}:${memberA2}`,
      `testnet:${ringC}:${memberC1}`,
    ]);
  });

  test("deterministic ordering is stable", async () => {
    const ring = toAddress(21);
    const first = toAddress(31);
    const second = toAddress(32);
    const third = toAddress(33);

    const { gateway } = createMockGateway({
      delayByParticipantMs: new Map([
        [first.toLowerCase(), 15],
        [second.toLowerCase(), 1],
        [third.toLowerCase(), 5],
      ]),
      delinquentPairs: new Set([
        pairKey(ring, first),
        pairKey(ring, second),
        pairKey(ring, third),
      ]),
      membersByRing: new Map([[ring.toLowerCase(), [first, second, third]]]),
      phasesByRing: new Map([[ring.toLowerCase(), 1]]),
      ringsByNetwork: {
        testnet: [ring],
      },
    });

    const firstScan = await scanNetworks(gateway, ["testnet"], silentLogger);
    const secondScan = await scanNetworks(gateway, ["testnet"], silentLogger);

    expect(firstScan.candidates.map(candidateKey)).toEqual(
      secondScan.candidates.map(candidateKey),
    );
    expect(firstScan.candidates.map((candidate) => candidate.targetAddress)).toEqual(
      [first, second, third],
    );
  });
});

describe("execution pipeline", () => {
  test("MAX_TX_PER_RUN cap is enforced exactly", async () => {
    const ring = toAddress(40);
    const candidates: LiquidationCandidate[] = [
      { network: "testnet", ringAddress: ring, targetAddress: toAddress(401) },
      { network: "testnet", ringAddress: ring, targetAddress: toAddress(402) },
      { network: "testnet", ringAddress: ring, targetAddress: toAddress(403) },
      { network: "testnet", ringAddress: ring, targetAddress: toAddress(404) },
    ];

    const { gateway, liquidateCalls } = createMockGateway();

    const execution = await executeCandidates(
      gateway,
      candidates,
      { dryRun: false, maxTxPerRun: 2 },
      silentLogger,
    );

    expect(execution.txAttempted).toBe(2);
    expect(execution.txSucceeded).toBe(2);
    expect(execution.txFailed).toBe(0);
    expect(execution.skippedByCap).toBe(2);
    expect(liquidateCalls.length).toBe(2);
    expect(liquidateCalls[0]?.target).toBe(candidates[0]?.targetAddress);
    expect(liquidateCalls[1]?.target).toBe(candidates[1]?.targetAddress);
  });

  test("dry-run performs zero writes", async () => {
    const ring = toAddress(50);
    const candidates: LiquidationCandidate[] = [
      { network: "testnet", ringAddress: ring, targetAddress: toAddress(501) },
      { network: "testnet", ringAddress: ring, targetAddress: toAddress(502) },
    ];

    const { gateway, liquidateCalls } = createMockGateway();

    const execution = await executeCandidates(
      gateway,
      candidates,
      { dryRun: true, maxTxPerRun: 5 },
      silentLogger,
    );

    expect(execution.txAttempted).toBe(0);
    expect(execution.txSucceeded).toBe(0);
    expect(execution.txFailed).toBe(0);
    expect(liquidateCalls.length).toBe(0);
  });

  test("reverted liquidation path does not stop the run", async () => {
    const ring = toAddress(60);
    const target1 = toAddress(601);
    const target2 = toAddress(602);
    const target3 = toAddress(603);
    const candidates: LiquidationCandidate[] = [
      { network: "testnet", ringAddress: ring, targetAddress: target1 },
      { network: "testnet", ringAddress: ring, targetAddress: target2 },
      { network: "testnet", ringAddress: ring, targetAddress: target3 },
    ];

    const { gateway, liquidateCalls } = createMockGateway({
      liquidatePlan: new Map([
        [pairKey(ring, target2), { throwError: "NotDelinquent" }],
      ]),
    });

    const execution = await executeCandidates(
      gateway,
      candidates,
      { dryRun: false, maxTxPerRun: 3 },
      silentLogger,
    );

    expect(execution.txAttempted).toBe(3);
    expect(execution.txSucceeded).toBe(2);
    expect(execution.txFailed).toBe(1);
    expect(liquidateCalls.length).toBe(3);
  });

  test("success and failure counters remain accurate", async () => {
    const ring = toAddress(70);
    const target1 = toAddress(701);
    const target2 = toAddress(702);
    const target3 = toAddress(703);
    const candidates: LiquidationCandidate[] = [
      { network: "testnet", ringAddress: ring, targetAddress: target1 },
      { network: "testnet", ringAddress: ring, targetAddress: target2 },
      { network: "testnet", ringAddress: ring, targetAddress: target3 },
    ];

    const { gateway } = createMockGateway({
      liquidatePlan: new Map([
        [pairKey(ring, target1), { receiptStatus: "reverted" }],
        [pairKey(ring, target3), { throwError: "already liquidated" }],
      ]),
    });

    const execution = await executeCandidates(
      gateway,
      candidates,
      { dryRun: false, maxTxPerRun: 3 },
      silentLogger,
    );

    expect(execution.txAttempted).toBe(3);
    expect(execution.txSucceeded).toBe(1);
    expect(execution.txFailed).toBe(2);
    expect(execution.txSucceededByNetwork.testnet).toBe(1);
    expect(execution.txFailedByNetwork.testnet).toBe(2);
  });
});

describe("end-to-end runner summary", () => {
  test("runLiquidator aggregates scan and execution metrics", async () => {
    const ring = toAddress(80);
    const target1 = toAddress(801);
    const target2 = toAddress(802);

    const { gateway } = createMockGateway({
      delinquentPairs: new Set([
        pairKey(ring, target1),
        pairKey(ring, target2),
      ]),
      membersByRing: new Map([[ring.toLowerCase(), [target1, target2]]]),
      phasesByRing: new Map([[ring.toLowerCase(), 1]]),
      ringsByNetwork: {
        testnet: [ring],
      },
    });

    const summary = await runLiquidator(
      gateway,
      [TESTNET_CONFIG],
      { dryRun: true, maxTxPerRun: 1 },
      silentLogger,
    );

    expect(summary.ringsScanned).toBe(1);
    expect(summary.activeRings).toBe(1);
    expect(summary.delinquentTargetsFound).toBe(2);
    expect(summary.skippedByCap).toBe(1);
    expect(summary.txAttempted).toBe(0);
    expect(summary.perNetwork[0]?.network).toBe("testnet");
  });

  test("runLiquidator rescans when tx slots remain and captures new delinquent target", async () => {
    const ring = toAddress(90);
    const target1 = toAddress(901);
    const target2 = toAddress(902);
    const members = [target1, target2];
    const txStatusByHash = new Map<Hex, TxStatus>();
    const liquidatedTargets: Address[] = [];
    let txCounter = 1;
    let scanPass = 0;

    const gateway: LiquidatorGateway = {
      async getAllRings() {
        return [ring];
      },

      async getPhase() {
        return 1;
      },

      async getRingMembers() {
        scanPass += 1;
        return members;
      },

      async isDelinquent(_network, _ringAddress, participant) {
        if (scanPass === 1) {
          return participant.toLowerCase() === target1.toLowerCase();
        }

        return participant.toLowerCase() === target2.toLowerCase();
      },

      async liquidate(_network, _ringAddress, target) {
        liquidatedTargets.push(target);
        const txHash = `0x${txCounter.toString(16).padStart(64, "0")}` as Hex;
        txCounter += 1;
        txStatusByHash.set(txHash, "success");
        return txHash;
      },

      async waitForReceipt(_network, txHash) {
        return txStatusByHash.get(txHash) ?? "success";
      },
    };

    const summary = await runLiquidator(
      gateway,
      [TESTNET_CONFIG],
      { dryRun: false, maxTxPerRun: 2 },
      silentLogger,
    );

    expect(summary.txAttempted).toBe(2);
    expect(summary.txSucceeded).toBe(2);
    expect(liquidatedTargets).toEqual([target1, target2]);
  });
});
