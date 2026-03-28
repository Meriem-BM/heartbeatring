import { describe, expect, test } from "bun:test";

import { helpText, parseCliOptions } from "../src/cli-options";

describe("cli options", () => {
  test("parses watch with other flags", () => {
    const parsed = parseCliOptions([
      "--watch",
      "--network",
      "both",
      "--dry-run",
      "--max-tx",
      "12",
    ]);

    expect(parsed.watch).toBe(true);
    expect(parsed.network).toBe("both");
    expect(parsed.dryRun).toBe(true);
    expect(parsed.maxTxOverride).toBe(12);
  });

  test("defaults remain one-shot when watch is omitted", () => {
    const parsed = parseCliOptions([]);

    expect(parsed.watch).toBe(false);
    expect(parsed.network).toBe("testnet");
    expect(parsed.dryRun).toBe(false);
  });

  test("help text includes watch mode guidance", () => {
    const help = helpText();

    expect(help.includes("--watch")).toBe(true);
  });
});
