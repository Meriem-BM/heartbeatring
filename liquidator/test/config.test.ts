import { describe, expect, test } from "bun:test";

import { loadRuntimeConfig } from "../src/config";
import type { ParsedCliOptions } from "../src/types";

const TEST_PRIVATE_KEY = `0x${"11".repeat(32)}`;

function baseEnv() {
  return {
    LIQUIDATOR_TESTNET_FACTORY_ADDRESS: "0xf3e5fe303E01546a6Cc04380e18288ce6D30E002",
    LIQUIDATOR_TESTNET_PRIVATE_KEY: TEST_PRIVATE_KEY,
    LIQUIDATOR_TESTNET_RPC_URL: "https://public-node.testnet.rsk.co",
  };
}

function options(overrides: Partial<ParsedCliOptions> = {}): ParsedCliOptions {
  return {
    dryRun: false,
    help: false,
    network: "testnet",
    watch: false,
    ...overrides,
  };
}

describe("runtime config", () => {
  test("one-shot mode loads without optional extras", () => {
    const runtime = loadRuntimeConfig(baseEnv(), options({ watch: false }));
    expect(runtime.networks.length).toBe(1);
  });

  test("watch mode uses the same runtime config surface", () => {
    const runtime = loadRuntimeConfig(baseEnv(), options({ watch: true }));
    expect(runtime.networks.length).toBe(1);
  });
});
