// ─── §2.3 Log levels per environment ────────────────────────────────────────
//
// resolveLogLevel: explicit LOG_LEVEL wins (validated), otherwise an
// environment-appropriate default — debug in dev, silent in tests, info in
// production.

import { describe, it, expect } from "vitest";
import { resolveLogLevel } from "@/lib/logger";

describe("resolveLogLevel", () => {
  it("defaults to info in production", () => {
    expect(resolveLogLevel({ NODE_ENV: "production" })).toBe("info");
  });

  it("defaults to debug in development", () => {
    expect(resolveLogLevel({ NODE_ENV: "development" })).toBe("debug");
  });

  it("defaults to silent under test", () => {
    expect(resolveLogLevel({ NODE_ENV: "test" })).toBe("silent");
  });

  it("honors an explicit valid LOG_LEVEL", () => {
    expect(
      resolveLogLevel({ NODE_ENV: "production", LOG_LEVEL: "debug" }),
    ).toBe("debug");
    expect(
      resolveLogLevel({ NODE_ENV: "development", LOG_LEVEL: "error" }),
    ).toBe("error");
  });

  it("ignores an invalid LOG_LEVEL and falls back to the env default", () => {
    expect(
      resolveLogLevel({ NODE_ENV: "production", LOG_LEVEL: "chatty" }),
    ).toBe("info");
    expect(
      resolveLogLevel({ NODE_ENV: "development", LOG_LEVEL: "verbose" }),
    ).toBe("debug");
  });

  it("defaults to info when NODE_ENV is unset (defensive)", () => {
    expect(resolveLogLevel({})).toBe("info");
  });
});
