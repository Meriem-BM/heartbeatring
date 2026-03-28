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
  test("one-shot mode does not require ws rpc url", () => {
    const runtime = loadRuntimeConfig(baseEnv(), options({ watch: false }));
    expect(runtime.networks.length).toBe(1);
    expect(runtime.networks[0]?.wsRpcUrl).toBeUndefined();
  });

  test("watch mode requires ws rpc url for selected network", () => {
    expect(() =>
      loadRuntimeConfig(baseEnv(), options({ watch: true })),
    ).toThrow("LIQUIDATOR_TESTNET_WS_RPC_URL is required when --watch is enabled.");
  });

  test("invalid ws rpc url is rejected", () => {
    expect(() =>
      loadRuntimeConfig(
        {
          ...baseEnv(),
          LIQUIDATOR_TESTNET_WS_RPC_URL: "https://not-websocket.example.com",
        },
        options({ watch: true }),
      ),
    ).toThrow("LIQUIDATOR_TESTNET_WS_RPC_URL must be a valid ws:// or wss:// URL.");
  });

  test("watch mode accepts valid ws rpc url", () => {
    const runtime = loadRuntimeConfig(
      {
        ...baseEnv(),
        LIQUIDATOR_TESTNET_WS_RPC_URL: "wss://public-node.testnet.rsk.co/ws",
      },
      options({ watch: true }),
    );

    expect(runtime.networks[0]?.wsRpcUrl).toBe("wss://public-node.testnet.rsk.co/ws");
  });
});
