import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  evaluateAutonomy,
  resolveAutonomyLevel,
  autonomyLevelLabel,
  type AutonomyLevel,
} from "../autonomy-policy";

function setLevel(level: AutonomyLevel | "") {
  vi.stubEnv("XENBOOX_AUTONOMY_LEVEL", level);
}

describe("resolveAutonomyLevel", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("defaults to suggest", () => {
    vi.stubEnv("XENBOOX_AUTONOMY_LEVEL", "");
    expect(resolveAutonomyLevel()).toBe("suggest");
  });

  it("resolves valid levels and rejects garbage", () => {
    vi.stubEnv("XENBOOX_AUTONOMY_LEVEL", "full");
    expect(resolveAutonomyLevel()).toBe("full");
    vi.stubEnv("XENBOOX_AUTONOMY_LEVEL", "nuclear");
    expect(resolveAutonomyLevel()).toBe("suggest");
  });
});

describe("evaluateAutonomy — money movement (§22.3 hard rule)", () => {
  beforeEach(() => vi.stubEnv("XENBOOX_AUTONOMY_LEVEL", "full"));
  afterEach(() => vi.unstubAllEnvs());

  it("hard-denies money-movement tools at EVERY autonomy level, even full", () => {
    for (const level of [
      "suggest",
      "low",
      "standard",
      "full",
    ] as AutonomyLevel[]) {
      vi.stubEnv("XENBOOX_AUTONOMY_LEVEL", level);
      const verdict = evaluateAutonomy({
        entityId: "e1",
        agentName: "treasury-agent",
        risk: "sensitive_write",
        action: "bank_transfer",
        amountMinorUnits: 100,
        confidence: 0.99,
      });
      expect(verdict.decision).toBe("deny");
      expect(verdict.reason).toMatch(/money-movement deny-list/i);
    }
  });

  it("denies the money_movement risk class even for a non-listed action name", () => {
    const verdict = evaluateAutonomy({
      entityId: "e1",
      agentName: "cash-agent",
      risk: "money_movement",
      action: "some_new_tool",
      amountMinorUnits: 50,
    });
    expect(verdict.decision).toBe("deny");
  });
});

describe("evaluateAutonomy — reads and safe writes", () => {
  beforeEach(() => vi.stubEnv("XENBOOX_AUTONOMY_LEVEL", "standard"));
  afterEach(() => vi.unstubAllEnvs());

  it("always allows reads regardless of level", () => {
    vi.stubEnv("XENBOOX_AUTONOMY_LEVEL", "suggest");
    const verdict = evaluateAutonomy({
      entityId: "e1",
      agentName: "cfo",
      risk: "read",
      action: "get_account_balance",
    });
    expect(verdict.decision).toBe("allow");
  });

  it("safe writes auto-approve at standard+, review below", () => {
    const standard = evaluateAutonomy({
      entityId: "e1",
      agentName: "journal-agent",
      risk: "safe_write",
      action: "tag_document",
      confidence: 0.95,
    });
    expect(standard.decision).toBe("allow");

    vi.stubEnv("XENBOOX_AUTONOMY_LEVEL", "low");
    const low = evaluateAutonomy({
      entityId: "e1",
      agentName: "journal-agent",
      risk: "safe_write",
      action: "tag_document",
      confidence: 0.95,
    });
    expect(low.decision).toBe("human_review");
  });
});

describe("evaluateAutonomy — sensitive writes (amount-bounded)", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("suggest level never auto-approves sensitive writes", () => {
    vi.stubEnv("XENBOOX_AUTONOMY_LEVEL", "suggest");
    const verdict = evaluateAutonomy({
      entityId: "e1",
      agentName: "expense-agent",
      risk: "sensitive_write",
      action: "approve_expense",
      amountMinorUnits: 1,
      confidence: 0.99,
    });
    expect(verdict.decision).toBe("human_review");
  });

  it("standard level auto-approves under the limit and reviews over it", () => {
    vi.stubEnv("XENBOOX_AUTONOMY_LEVEL", "standard"); // limit 1_000_000
    const under = evaluateAutonomy({
      entityId: "e1",
      agentName: "expense-agent",
      risk: "sensitive_write",
      action: "approve_expense",
      amountMinorUnits: 500_000,
      confidence: 0.99,
    });
    expect(under.decision).toBe("allow");

    const over = evaluateAutonomy({
      entityId: "e1",
      agentName: "expense-agent",
      risk: "sensitive_write",
      action: "approve_expense",
      amountMinorUnits: 5_000_000,
      confidence: 0.99,
    });
    expect(over.decision).toBe("human_review");
    expect(over.reason).toMatch(/exceeds/i);
  });

  it("widest band (full) is still capped — never unlimited", () => {
    vi.stubEnv("XENBOOX_AUTONOMY_LEVEL", "full"); // limit 10_000_000
    const huge = evaluateAutonomy({
      entityId: "e1",
      agentName: "expense-agent",
      risk: "sensitive_write",
      action: "approve_expense",
      amountMinorUnits: 1_000_000_000,
      confidence: 0.99,
    });
    expect(huge.decision).toBe("human_review");
  });
});

describe("evaluateAutonomy — confidence floor", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("never auto-approves below the 0.85 floor, even at full autonomy", () => {
    vi.stubEnv("XENBOOX_AUTONOMY_LEVEL", "full");
    const verdict = evaluateAutonomy({
      entityId: "e1",
      agentName: "expense-agent",
      risk: "sensitive_write",
      action: "approve_expense",
      amountMinorUnits: 100,
      confidence: 0.7,
    });
    expect(verdict.decision).toBe("human_review");
  });
});

describe("evaluateAutonomy — fail closed", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("unclassified risk fails closed to human review", () => {
    vi.stubEnv("XENBOOX_AUTONOMY_LEVEL", "full");
    const verdict = evaluateAutonomy({
      entityId: "e1",
      agentName: "cfo",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      risk: "mystery_risk" as any,
      action: "mystery_tool",
    });
    expect(verdict.decision).toBe("human_review");
  });
});

describe("autonomyLevelLabel", () => {
  it("returns a label for every level", () => {
    expect(autonomyLevelLabel("suggest")).toContain("Suggestions");
    expect(autonomyLevelLabel("full")).toContain("hard deny rules still apply");
  });
});
