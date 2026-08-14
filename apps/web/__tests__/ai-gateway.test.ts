import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  AiGateway,
  AiBudgetExceededError,
  estimateCostUsd,
  aiGateway,
} from "@xenboox/models";

describe("AI gateway — per-tenant budgets (§22.1)", () => {
  let gateway: AiGateway;

  beforeEach(() => {
    vi.stubEnv("AI_KILL_SWITCH", "");
    vi.stubEnv("AI_BUDGET_DAILY_TOKENS", "");
    vi.stubEnv("AI_BUDGET_DAILY_COST_USD", "");
    gateway = new AiGateway(1_000, 1.0); // tiny ceilings for deterministic tests
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("allows calls under the ceiling", () => {
    gateway.recordUsage("entity-1", "claude-haiku-4-5", 500, 200); // ~0.0008 USD
    expect(() => gateway.assertBudgetAllowed("entity-1")).not.toThrow();
  });

  it("blocks calls once the token ceiling is exceeded", () => {
    gateway.recordUsage("entity-1", "claude-haiku-4-5", 900, 300); // 1200 tokens > 1000
    expect(() => gateway.assertBudgetAllowed("entity-1")).toThrow(
      AiBudgetExceededError,
    );
    try {
      gateway.assertBudgetAllowed("entity-1");
    } catch (e) {
      const err = e as AiBudgetExceededError;
      expect(err.reason).toBe("tokens");
      expect(err.entityId).toBe("entity-1");
      expect(err.limit).toBe(1_000);
    }
  });

  it("blocks calls once the cost ceiling is exceeded", () => {
    // token ceiling high enough that only the COST check can trip:
    // sonnet $3/M in, $15/M out → 200K in + 60K out = $1.50 > $1.00
    const big = new AiGateway(10_000_000, 1.0);
    big.recordUsage("entity-1", "claude-sonnet-4-6", 200_000, 60_000);
    expect(() => big.assertBudgetAllowed("entity-1")).toThrow(
      AiBudgetExceededError,
    );
    try {
      big.assertBudgetAllowed("entity-1");
    } catch (e) {
      expect((e as AiBudgetExceededError).reason).toBe("cost");
    }
  });

  it("isolates budgets per entity (multi-tenant)", () => {
    gateway.recordUsage("entity-a", "claude-haiku-4-5", 2_000, 0);
    expect(() => gateway.assertBudgetAllowed("entity-a")).toThrow(
      AiBudgetExceededError,
    );
    // entity-b untouched by entity-a's spend
    expect(() => gateway.assertBudgetAllowed("entity-b")).not.toThrow();
  });

  it("resets daily counters (fresh day / ops reset)", () => {
    gateway.recordUsage("entity-1", "claude-haiku-4-5", 2_000, 0);
    expect(() => gateway.assertBudgetAllowed("entity-1")).toThrow();
    gateway.reset("entity-1");
    expect(() => gateway.assertBudgetAllowed("entity-1")).not.toThrow();
  });
});

describe("AI gateway — kill-switch", () => {
  it("blocks ALL calls when AI_KILL_SWITCH=true (even under budget)", () => {
    vi.stubEnv("AI_KILL_SWITCH", "true");
    const gateway = new AiGateway(1_000_000, 100);
    expect(() => gateway.assertBudgetAllowed("any-entity")).toThrow(
      AiBudgetExceededError,
    );
    vi.unstubAllEnvs();
  });
});

describe("AI gateway — spend alerts", () => {
  it("fires once per threshold per entity, deduped", () => {
    const alerts: string[] = [];
    const gateway = new AiGateway(1_000, 1.0, [0.5, 1.0]);
    gateway.onAlert((a) =>
      alerts.push(`${a.kind}:${a.thresholdPct}:${a.entityId}`),
    );

    // 600 tokens → 60% crosses the 50% threshold once
    gateway.recordUsage("entity-1", "claude-haiku-4-5", 600, 0);
    // More usage, still under 100% — no new alert for 50%
    gateway.recordUsage("entity-1", "claude-haiku-4-5", 200, 0);
    // 1000 total → crosses 100%
    gateway.recordUsage("entity-1", "claude-haiku-4-5", 200, 0);

    expect(alerts).toContain("tokens:0.5:entity-1");
    expect(alerts).toContain("tokens:1:entity-1");
    expect(alerts).toHaveLength(2); // deduped — 50% never fires again
  });
});

describe("estimateCostUsd", () => {
  it("computes cost from per-million pricing", () => {
    // claude-haiku-4-5: $0.8/M in, $4/M out
    const cost = estimateCostUsd("claude-haiku-4-5", 1_000_000, 250_000);
    expect(cost).toBeCloseTo(0.8 + 1.0, 5);
  });

  it("honors env price overrides", () => {
    // model id sanitized: [^a-zA-Z0-9_-] → _ ; `-` is kept ⇒ CLAUDE-HAIKU-4-5
    vi.stubEnv("AI_PRICE_CLAUDE-HAIKU-4-5_INPUT", "10");
    expect(estimateCostUsd("claude-haiku-4-5", 1_000_000, 0)).toBeCloseTo(
      10,
      5,
    );
    vi.unstubAllEnvs();
  });
});

describe("singleton gateway", () => {
  it("is exported and usable", () => {
    expect(aiGateway).toBeInstanceOf(AiGateway);
    expect(() => aiGateway.assertBudgetAllowed("entity-x")).not.toThrow();
  });
});
