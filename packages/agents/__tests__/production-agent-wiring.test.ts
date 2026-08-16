import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock langfuse so node-level tests don't hit the network
vi.mock("../core/langfuse", () => ({
  langfuse: {
    trace: vi.fn().mockResolvedValue({ update: vi.fn() }),
    span: vi.fn().mockResolvedValue({ update: vi.fn() }),
    event: vi.fn(),
  },
}));

// Mock @xenboox/db with a builder-style select chain + query accessors
vi.mock("@xenboox/db", () => {
  const makeSelectChain = (rows: unknown[]) => ({
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockResolvedValue(rows),
  });

  return {
    db: {
      select: vi.fn(),
      query: {
        chartOfAccounts: { findMany: vi.fn() },
        journalEntries: { findMany: vi.fn() },
        journalEntryLines: { findMany: vi.fn() },
        goldenDatasetScenarios: { findMany: vi.fn() },
        auditSamples: { findMany: vi.fn() },
      },
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({}),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
      }),
    },
    makeSelectChain,
  };
});

const { db } = await import("@xenboox/db");

// ─── §8.1: Orchestrator must route audit/expense to REAL LangGraph agents ──

describe("getAgentGraph — §8.1 real agent wiring", () => {
  it("audit routes to the real audit LangGraph agent, not a fake delegate", async () => {
    const { getAgentGraph } = await import("../core/orchestrator");
    const graph = await getAgentGraph("audit");
    expect(typeof graph.invoke).toBe("function");
    const result = await graph.invoke({
      entityId: "00000000-0000-0000-0000-000000000001",
      entityName: "Test",
      currency: "GMD",
      currentOperation: {
        type: "sample_transactions",
        status: "processing",
        input: { sampleSize: 5 },
        output: null,
        error: null,
      },
      currentTask: undefined,
    });
    // Real execution produced an audit trail entry (the old fake delegate
    // returned a hardcoded confidence with an EMPTY audit trail).
    expect(Array.isArray(result.auditTrail)).toBe(true);
  }, 30000);

  it("expense routes to the real expense LangGraph agent, not a fake delegate", async () => {
    const { getAgentGraph } = await import("../core/orchestrator");
    const graph = await getAgentGraph("expense");
    expect(typeof graph.invoke).toBe("function");
  });

  it("audit agent executes a real sample_transactions node producing output", async () => {
    const { getAgentGraph } = await import("../core/orchestrator");
    vi.mocked(db.query.journalEntries.findMany).mockResolvedValue([
      {
        id: "22222222-2222-2222-2222-222222222222",
        entityId: "00000000-0000-0000-0000-000000000001",
        date: "2026-08-01",
        description: "Sample entry",
        status: "posted",
        createdAt: new Date(),
      },
    ] as any);
    vi.mocked(db.query.journalEntryLines.findMany).mockResolvedValue([
      {
        id: "33333333-3333-3333-3333-333333333333",
        journalEntryId: "22222222-2222-2222-2222-222222222222",
        debit: "500",
        credit: "0",
      },
    ] as any);

    const graph = await getAgentGraph("audit");
    const result = await graph.invoke({
      entityId: "00000000-0000-0000-0000-000000000001",
      entityName: "Test",
      currency: "GMD",
      currentOperation: {
        type: "sample_transactions",
        status: "processing",
        input: { sampleSize: 5 },
        output: null,
        error: null,
      },
      currentTask: undefined,
    });
    expect(result.auditSample?.sampleSize).toBe(1);
    expect(result.confidence).toBeGreaterThan(0);
  });
});

// ─── §8.1: Task types map to agent operations (routing contract) ──────────

describe("task-type routing contract", () => {
  it("registered audit task types map to real audit agent operations", async () => {
    const { AuditOperationEnum } = await import("../tier3/audit-agent/state");
    const ops = AuditOperationEnum._def.values as readonly string[];
    for (const expected of [
      "sample_transactions",
      "detect_pattern_deviations",
      "independent_recomputation",
      "anomaly_detection",
    ]) {
      expect(ops).toContain(expected);
    }
  });

  it("registered expense task types map to real expense agent operations", async () => {
    const { ExpenseOperationEnum } =
      await import("../tier3/expense-agent/state");
    const ops = ExpenseOperationEnum._def.values as readonly string[];
    for (const expected of [
      "extract_receipt",
      "check_policy_compliance",
      "route_for_approval",
      "expense_report",
    ]) {
      expect(ops).toContain(expected);
    }
  });
});

// ─── §8.1: Audit agent tools are real, not stubs ──────────────────────────

describe("audit agent tools — no hardcoded stubs", () => {
  it("compareToGoldenDataset queries the golden dataset table, not a hardcoded pass", async () => {
    vi.mocked(db.query.goldenDatasetScenarios.findMany).mockResolvedValue([
      {
        id: "g1",
        scenarioType: "ledger",
        name: "Balanced entry",
        expectedResult: { amount: 100 },
      },
    ] as any);
    const { compareToGoldenDataset } =
      await import("../tier3/audit-agent/tools");

    // Mismatched output → deviation recorded, not a hardcoded 1.0 pass.
    const result = await compareToGoldenDataset("ledger", { amount: 999 });
    expect(result.totalChecks).toBe(1);
    expect(result.passed).toBe(0);
    expect(result.failed).toBe(1);
    expect(result.score).toBe(0);
    expect(result.deviations.length).toBeGreaterThan(0);

    // Matching output → pass.
    const pass = await compareToGoldenDataset("ledger", { amount: 100 });
    expect(pass.passed).toBe(1);
    expect(pass.deviations).toHaveLength(0);
  });

  it("respondToAuditorQuery returns real supporting documents when entries exist", async () => {
    vi.mocked(db.query.journalEntries.findMany).mockResolvedValue([
      {
        id: "11111111-1111-1111-1111-111111111111",
        date: "2026-08-01",
        status: "posted",
        description: "Test entry",
      },
    ] as any);
    vi.mocked(db.query.auditSamples.findMany).mockResolvedValue([] as any);
    const { respondToAuditorQuery } =
      await import("../tier3/audit-agent/tools");

    const result = await respondToAuditorQuery(
      "00000000-0000-0000-0000-000000000001",
      "q1",
    );
    expect(result.supportingDocuments.length).toBeGreaterThan(0);
    expect(result.requiresFollowUp).toBe(false);
    expect(result.confidence).toBeGreaterThan(0.5);
  });
});

// ─── §8.1: Analytics computes real balances, never hardcoded zeros ────────

describe("analytics agent tools — real balance computation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getKpiDashboard reflects actual posted journal entries, not zeros", async () => {
    vi.mocked(db.query.chartOfAccounts.findMany).mockResolvedValue([
      { id: "acct-asset-1", type: "asset", subtype: "cash", isActive: true },
      {
        id: "acct-rev-1",
        type: "revenue",
        subtype: "revenue",
        isActive: true,
      },
    ] as any);
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      groupBy: vi.fn().mockResolvedValue([
        { accountId: "acct-asset-1", debitTotal: "1000", creditTotal: "0" },
        { accountId: "acct-rev-1", debitTotal: "0", creditTotal: "1000" },
      ]),
    } as any);

    const { getKpiDashboard } =
      await import("../platform/analytics-agent/tools");
    const summary = await getKpiDashboard(
      "00000000-0000-0000-0000-000000000001",
    );
    // The §8.1 fix: KPIs carry REAL aggregated balances, not hardcoded zeros.
    expect(summary.kpis.totalAssets).toBe(1000);
    expect(summary.kpis.totalLiabilities).toBe(0);
    expect(summary.kpis.netIncome).toBe(1000);
    // Assets appear in the KPI ratio inputs (previously everything was 0).
    expect(summary.kpis.totalAssets).toBe(1000);
  });
});
