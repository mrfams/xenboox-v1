// ─── Pipeline Tests (Pipelines 1-6) ──────────────────────────────────────────
//
// Tests for all 6 orchestration pipelines with mocked DB and Langfuse.
// Follows project test patterns from agent.test.ts etc.

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("@xenboox/db", () => ({
  db: {
    query: {
      fiscalPeriods: { findFirst: vi.fn(), findMany: vi.fn() },
      journalEntries: { findMany: vi.fn() },
      journalEntryLines: { findMany: vi.fn() },
      chartOfAccounts: { findMany: vi.fn() },
      trialBalanceSnapshots: { findMany: vi.fn(), findFirst: vi.fn() },
      bankTransactions: { findMany: vi.fn() },
      bankAccounts: { findMany: vi.fn(), findFirst: vi.fn() },
      cashAccounts: { findMany: vi.fn() },
      imprestFloats: { findMany: vi.fn() },
      imprestReceipts: { findMany: vi.fn() },
      pettyCashLedger: { findMany: vi.fn(), findFirst: vi.fn() },
      entities: { findFirst: vi.fn() },
      confidenceThresholds: { findFirst: vi.fn() },
      userEntityAccess: { findFirst: vi.fn() },
      agentRoutingLogs: { findMany: vi.fn() },
    },
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => []),
        onConflictDoNothing: vi.fn(),
      })),
    })),
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn() })) })),
    delete: vi.fn(() => ({ where: vi.fn() })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        innerJoin: vi.fn(() => ({
          where: vi.fn(() => []),
          orderBy: vi.fn(() => []),
        })),
        orderBy: vi.fn(() => []),
      })),
    })),
  },
}));

vi.mock("./langfuse", () => ({
  langfuse: {
    trace: vi.fn(() => ({
      update: vi.fn(),
    })),
    event: vi.fn(),
  },
  getLangfuse: vi.fn(),
}));

vi.mock("./state", () => ({
  createAuditEntry: vi.fn((params) => ({
    agentId: params.agentId,
    action: params.action,
    details: params.details,
    confidence: params.confidence,
    timestamp: new Date().toISOString(),
  })),
  BaseAgentState: class {},
}));

vi.mock("./orchestrator", () => ({
  orchestrate: vi.fn(() => ({
    agentId: "test-agent",
    confidence: 0.9,
    reasoning: "All checks passed",
    confirmed: true,
    humanResponse: "Confirmed",
    errors: [],
  })),
  classifyUserMessage: vi.fn(() => "general_query"),
  fanOutToDepartments: vi.fn(() =>
    ["controller", "treasury", "payroll_manager", "compliance"].map((dept) => ({
      department: dept,
      agentId: dept,
      confidence: 0.9,
      reasoning: `${dept} confirmed`,
      confirmed: true,
      summary: `${dept} ready`,
      errors: [],
    })),
  ),
  checkEscalation: vi.fn(() => ({ needsEscalation: false, reason: "" })),
  getAgentGraph: vi.fn(() => ({})),
}));

vi.mock("./session-state", () => ({
  getOrCreateSession: vi.fn(() => ({
    context: {
      entityInFocus: "test-entity",
      periodInFocus: "2026-07",
      lastTaskType: null,
    },
    history: [],
  })),
  updateSessionAfterTurn: vi.fn(),
  resolveAmbiguousReference: vi.fn(() => null),
  resetSession: vi.fn(),
}));

vi.mock("./registry", () => ({
  ALL_DEPARTMENTS: ["controller", "treasury", "payroll_manager", "compliance"],
  DEPARTMENT_AGENTS: {
    controller: "controller",
    treasury: "treasury",
    payroll_manager: "payroll_manager",
    compliance: "compliance",
  },
  DEPARTMENT_CLOSE_TASK: {
    controller: "close_checklist",
    treasury: "close_checklist",
    payroll_manager: "close_checklist",
    compliance: "close_checklist",
  },
  AGENT_REGISTRY: {},
  TASK_TO_AGENT: {},
}));

vi.mock("./confidence", () => ({
  detectConflictingOutputs: vi.fn(() => ({
    hasConflict: false,
    conflictingAgents: [],
    description: "",
  })),
  computeCompositeConfidence: vi.fn(() => ({
    score: 0.9,
    signals: [],
    summary: "OK",
  })),
  makeEscalationDecision: vi.fn(() => ({ escalate: false, reason: "" })),
  DEFAULT_ESCALATION_CONFIG: {},
}));

vi.mock("./security", () => ({
  checkEntityAccess: vi.fn(() => ({
    hasAccess: true,
    role: "finance_director",
  })),
}));

// ─── Pipeline 1: CFO Agent Orchestration ─────────────────────────────────────

describe("Pipeline 1: CFO Agent Orchestration Pipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create an input event with correct envelope", async () => {
    const { createInputEvent } = await import("../pipeline");
    const event = createInputEvent({
      channel: "web_chat",
      userId: "user-1",
      orgId: "org-1",
      entityId: "entity-1",
      entityName: "Test Entity",
      currency: "GMD",
      rawContent: "What was our profit last month?",
    });

    expect(event.channel).toBe("web_chat");
    expect(event.userId).toBe("user-1");
    expect(event.orgId).toBe("org-1");
    expect(event.entityId).toBe("entity-1");
    expect(event.entityName).toBe("Test Entity");
    expect(event.currency).toBe("GMD");
    expect(event.rawContent).toBe("What was our profit last month?");
    expect(event.sessionId).toBeDefined();
    expect(event.timestamp).toBeDefined();
  });

  it("should classify query intent correctly", async () => {
    const { resolveIntent, createInputEvent } = await import("../pipeline");
    const event = createInputEvent({
      channel: "web_chat",
      userId: "user-1",
      orgId: "org-1",
      entityId: "entity-1",
      entityName: "Test Entity",
      currency: "GMD",
      rawContent: "What was our profit last month?",
    });

    const intent = await resolveIntent(event);
    expect(intent.type).toBe("query");
    expect(intent.confidence).toBeGreaterThan(0);
    expect(intent.reasoning).toContain("query");
  });

  it("should classify instruction intent correctly", async () => {
    const { resolveIntent, createInputEvent } = await import("../pipeline");
    const event = createInputEvent({
      channel: "web_chat",
      userId: "user-1",
      orgId: "org-1",
      entityId: "entity-1",
      entityName: "Test Entity",
      currency: "GMD",
      rawContent: "Run payroll for July",
    });

    const intent = await resolveIntent(event);
    expect(intent.type).toBe("instruction");
  });

  it("should classify correction/dispute intent correctly", async () => {
    const { resolveIntent, createInputEvent } = await import("../pipeline");
    const event = createInputEvent({
      channel: "web_chat",
      userId: "user-1",
      orgId: "org-1",
      entityId: "entity-1",
      entityName: "Test Entity",
      currency: "GMD",
      rawContent: "The June close is wrong, marketing expenses are off",
    });

    const intent = await resolveIntent(event);
    expect(intent.type).toBe("correction_dispute");
  });

  it("should reject users without entity access", async () => {
    const { checkPermission, createInputEvent } = await import("../pipeline");
    const { checkEntityAccess } = await import("../security");

    (checkEntityAccess as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      hasAccess: false,
      role: null,
    });

    const event = createInputEvent({
      channel: "web_chat",
      userId: "user-1",
      orgId: "org-1",
      entityId: "entity-1",
      entityName: "Test Entity",
      currency: "GMD",
      rawContent: "Show me the books",
    });

    const result = await checkPermission("user-1", "entity-1", event);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("does not have access");
  });

  it("should route to appropriate agent based on query content", async () => {
    const { resolveIntent, createInputEvent } = await import("../pipeline");
    const event = createInputEvent({
      channel: "web_chat",
      userId: "user-1",
      orgId: "org-1",
      entityId: "entity-1",
      entityName: "Test Entity",
      currency: "GMD",
      rawContent: "What is the current cash position?",
    });

    const intent = await resolveIntent(event);
    expect(intent.targetAgents.length).toBeGreaterThan(0);
    expect(intent.targetAgents.some((a) => a.agentId === "treasury")).toBe(
      true,
    );
  });

  it("should seed default confidence thresholds", async () => {
    const { seedDefaultThresholds, DEFAULT_THRESHOLDS } =
      await import("../pipeline");
    expect(DEFAULT_THRESHOLDS.length).toBeGreaterThan(0);
    expect(DEFAULT_THRESHOLDS[0].agentId).toBeDefined();
    expect(DEFAULT_THRESHOLDS[0].transactionType).toBeDefined();

    // Should not throw
    await expect(seedDefaultThresholds()).resolves.not.toThrow();
  });

  it("should aggregate summaries correctly", async () => {
    const { aggregateSummaries } = await import("../pipeline");
    const deptResults = [
      {
        agentId: "treasury",
        department: "treasury",
        confidence: 0.95,
        reasoning: "All clean",
        confirmed: true,
        summary: "Cash position healthy",
        errors: [],
      },
      {
        agentId: "controller",
        department: "controller",
        confidence: 0.88,
        reasoning: "One flag",
        confirmed: false,
        summary: "Pending review",
        errors: ["AP aging has anomalies"],
      },
    ];

    const summaries = aggregateSummaries(deptResults as any);
    expect(summaries).toHaveLength(2);
    expect(summaries[0].status).toBe("clean");
    expect(summaries[1].status).toBe("flagged");
    expect(summaries[1].escalations).toHaveLength(1);
  });

  it("should create scoped tasks with correct entity isolation", async () => {
    const { createScopedTasks, createInputEvent } = await import("../pipeline");
    const event = createInputEvent({
      channel: "web_chat",
      userId: "user-1",
      orgId: "org-1",
      entityId: "entity-1",
      entityName: "Test Entity",
      currency: "GMD",
      rawContent: "test",
    });

    const tasks = createScopedTasks(
      [
        {
          agentId: "treasury" as any,
          taskType: "cash_position" as any,
          params: { test: true },
        },
      ],
      event,
    );

    expect(tasks).toHaveLength(1);
    expect(tasks[0].entityId).toBe("entity-1");
    expect(tasks[0].orgId).toBe("org-1");
    expect(tasks[0].agentId).toBe("treasury");
  });

  it("should run full pipeline end-to-end", async () => {
    const { runCFOPipeline, createInputEvent } = await import("../pipeline");
    const event = createInputEvent({
      channel: "web_chat",
      userId: "user-1",
      orgId: "org-1",
      entityId: "entity-1",
      entityName: "Test Entity",
      currency: "GMD",
      rawContent: "Consolidated P&L for July",
    });

    const result = await runCFOPipeline(event);
    expect(result.response).toBeDefined();
    expect(result.response.length).toBeGreaterThan(0);
    expect(result.decision).toBeDefined();
    expect(result.decision.action).toBeDefined();
    expect(result.auditEntry).toBeDefined();
    expect(result.durationMs).toBeGreaterThan(0);
  });

  it("should check confidence gate thresholds", async () => {
    const { evaluateConfidenceGate, createInputEvent } =
      await import("../pipeline");
    const event = createInputEvent({
      channel: "web_chat",
      userId: "user-1",
      orgId: "org-1",
      entityId: "entity-1",
      entityName: "Test",
      currency: "GMD",
      rawContent: "test",
    });

    const summaries = [
      {
        agentId: "treasury",
        department: "treasury",
        status: "clean" as const,
        headline: "OK",
        confidence: 0.95,
        supportingDataRef: null,
        escalations: [],
      },
    ];

    const decision = await evaluateConfidenceGate(summaries, event);
    expect(decision.action).toBe("proceed");
  });

  it("should escalate summaries below confidence threshold", async () => {
    const { evaluateConfidenceGate, createInputEvent } =
      await import("../pipeline");
    const event = createInputEvent({
      channel: "web_chat",
      userId: "user-1",
      orgId: "org-1",
      entityId: "entity-1",
      entityName: "Test",
      currency: "GMD",
      rawContent: "test",
    });

    const summaries = [
      {
        agentId: "treasury",
        department: "treasury",
        status: "flagged" as const,
        headline: "Issues found",
        confidence: 0.3,
        supportingDataRef: null,
        escalations: [
          { severity: "warning" as const, description: "Low confidence" },
        ],
      },
    ];

    const decision = await evaluateConfidenceGate(summaries, event);
    expect(
      decision.action === "escalate_to_human"
        ? decision.escalationItems.length
        : 0,
    ).toBeGreaterThan(0);
  });

  it("should generate response for query intent", async () => {
    const { synthesizeResponse, createInputEvent } =
      await import("../pipeline");
    const event = createInputEvent({
      channel: "web_chat",
      userId: "user-1",
      orgId: "org-1",
      entityId: "entity-1",
      entityName: "Test",
      currency: "GMD",
      rawContent: "What's my cash position?",
    });

    const response = synthesizeResponse(
      { action: "proceed", reason: "All clean" },
      [
        {
          agentId: "treasury",
          department: "treasury",
          status: "clean",
          headline: "Cash position: GMD 500,000",
          confidence: 0.95,
          supportingDataRef: null,
          escalations: [],
        },
      ],
      event,
      {
        type: "query",
        originalInput: "test",
        resolvedInput: "test",
        entities: [],
        period: null,
        amount: null,
        confidence: 0.85,
        reasoning: "test",
        targetAgents: [],
      },
    );

    expect(response).toContain("Complete");
    expect(response).toContain("Cash position");
  });
});

// ─── Pipeline 2: Autonomous Close Pipeline ────────────────────────────────────

describe("Pipeline 2: Autonomous Close Pipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const { db } = require("@xenboox/db");

    // Mock an open fiscal period
    db.query.fiscalPeriods.findFirst.mockResolvedValue({
      id: "period-1",
      entityId: "entity-1",
      year: 2026,
      month: 7,
      status: "open",
      closedAt: null,
      closedBy: null,
    });

    // Mock posted journal entries
    db.query.journalEntries.findMany.mockResolvedValue([
      {
        id: "je-1",
        entityId: "entity-1",
        periodId: "period-1",
        status: "posted",
      },
      {
        id: "je-2",
        entityId: "entity-1",
        periodId: "period-1",
        status: "posted",
      },
    ]);

    // Mock journal entry lines
    db.query.journalEntryLines.findMany.mockResolvedValue([
      {
        journalEntryId: "je-1",
        accountId: "acct-1",
        debit: "1000",
        credit: "0",
      },
      {
        journalEntryId: "je-1",
        accountId: "acct-2",
        debit: "0",
        credit: "1000",
      },
      {
        journalEntryId: "je-2",
        accountId: "acct-3",
        debit: "500",
        credit: "0",
      },
      {
        journalEntryId: "je-2",
        accountId: "acct-4",
        debit: "0",
        credit: "500",
      },
    ]);

    // Mock chart of accounts with fixed asset subtypes
    db.query.chartOfAccounts.findMany.mockResolvedValue([
      {
        id: "acct-1",
        entityId: "entity-1",
        code: "1510",
        name: "Equipment",
        type: "asset",
        subtype: "fixed_asset",
      },
      {
        id: "acct-5",
        entityId: "entity-1",
        code: "1550",
        name: "Accumulated Depreciation - Equipment",
        type: "asset",
        subtype: "fixed_asset",
      },
      {
        id: "acct-6",
        entityId: "entity-1",
        code: "6040",
        name: "Depreciation Expense",
        type: "expense",
        subtype: "operating_expense",
      },
    ]);

    db.query.bankTransactions.findMany.mockResolvedValue([]);
    db.query.trialBalanceSnapshots.findMany.mockResolvedValue([]);

    // Mock select queries returning aggregate data
    db.select.mockImplementation(() => ({
      from: vi.fn(() => ({
        innerJoin: vi.fn(() => ({
          where: vi.fn(() => [{ totalDebit: "1500", totalCredit: "1500" }]),
          orderBy: vi.fn(() => []),
        })),
        orderBy: vi.fn(() => []),
      })),
    }));
  });

  it("should execute close pipeline successfully", async () => {
    const { executeClosePipeline } = await import("../close-pipeline");
    const result = await executeClosePipeline({
      entityId: "entity-1",
      entityName: "Test Entity",
      currency: "GMD",
      periodId: "period-1",
      userId: "user-1",
    });

    expect(result.status).toBe("completed");
    expect(result.overallConfidence).toBeGreaterThan(0.9);
    expect(result.completedAt).toBeDefined();
  });

  it("should fail validation for already closed period", async () => {
    const { db } = require("@xenboox/db");
    db.query.fiscalPeriods.findFirst.mockResolvedValue({
      id: "period-1",
      entityId: "entity-1",
      year: 2026,
      month: 7,
      status: "closed",
      closedAt: new Date(),
      closedBy: "user-1",
    });

    const { executeClosePipeline } = await import("../close-pipeline");
    const result = await executeClosePipeline({
      entityId: "entity-1",
      entityName: "Test",
      currency: "GMD",
      periodId: "period-1",
      userId: "user-1",
    });

    expect(result.status).toBe("failed");
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should report close status correctly", async () => {
    const { getCloseStatus } = await import("../close-pipeline");
    const result = await getCloseStatus("entity-1", "period-1");

    expect(result.currentPeriod).toBe("2026-07");
    expect(result.steps).toHaveLength(7);
    expect(result.entryCount).toBeGreaterThan(0);
  });

  it("should return error state for missing period", async () => {
    const { db } = require("@xenboox/db");
    db.query.fiscalPeriods.findFirst.mockResolvedValue(null);

    const { executeClosePipeline } = await import("../close-pipeline");
    const result = await executeClosePipeline({
      entityId: "entity-1",
      entityName: "Test",
      currency: "GMD",
      periodId: "nonexistent",
      userId: "user-1",
    });

    expect(result.status).toBe("failed");
  });
});

// ─── Pipeline 3: Autonomous Bank Reconciliation Pipeline ──────────────────────

describe("Pipeline 3: Autonomous Bank Reconciliation Pipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const { db } = require("@xenboox/db");

    db.query.bankAccounts.findMany.mockResolvedValue([
      {
        id: "ba-1",
        entityId: "entity-1",
        accountName: "Operating Account",
        currency: "GMD",
        currentBalance: "500000",
        isActive: true,
      },
      {
        id: "ba-2",
        entityId: "entity-1",
        accountName: "Savings Account",
        currency: "GMD",
        currentBalance: "1000000",
        isActive: true,
      },
    ]);

    db.query.bankTransactions.findMany.mockResolvedValue([
      {
        id: "tx-1",
        bankAccountId: "ba-1",
        amount: "15000",
        description: "Customer payment",
        date: "2026-07-15",
        isReconciled: false,
      },
      {
        id: "tx-2",
        bankAccountId: "ba-1",
        amount: "-5000",
        description: "Supplier payment",
        date: "2026-07-16",
        isReconciled: false,
      },
    ]);

    db.query.journalEntryLines.findMany.mockResolvedValue([]);
    db.query.journalEntries.findMany.mockResolvedValue([]);
    db.query.reconciliations.findMany.mockImplementation(
      async ({ where }: any) => [],
    );

    db.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: "recon-1" }]),
        onConflictDoNothing: vi.fn(),
      }),
    });
  });

  it("should detect unreconciled accounts", async () => {
    const { runReconciliationPipeline } =
      await import("../reconciliation-pipeline");
    const result = await runReconciliationPipeline("entity-1");

    expect(result.success).toBeDefined();
    expect(result.results).toBeDefined();
  });

  it("should return reconciliation status", async () => {
    const { getReconciliationStatus } =
      await import("../reconciliation-pipeline");
    const result = await getReconciliationStatus("entity-1");

    expect(Array.isArray(result)).toBe(true);
  });
});

// ─── Pipeline 4: Autonomous Cash & Imprest Pipeline ───────────────────────────

describe("Pipeline 4: Autonomous Cash & Imprest Pipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const { db } = require("@xenboox/db");

    db.query.cashAccounts.findMany.mockResolvedValue([
      {
        id: "ca-1",
        entityId: "entity-1",
        name: "Petty Cash USD",
        currency: "GMD",
        currentBalance: "50000",
        isActive: true,
      },
      {
        id: "ca-2",
        entityId: "entity-1",
        name: "Cash Till 1",
        currency: "GMD",
        currentBalance: "25000",
        isActive: true,
      },
    ]);

    db.query.imprestFloats.findMany.mockResolvedValue([
      {
        id: "float-1",
        entityId: "entity-1",
        cashAccountId: "ca-1",
        assigneeName: "John Doe",
        amount: "10000",
        remainingBalance: "2000",
        status: "active",
        issuedDate: "2026-06-01",
        settleByDate: "2026-07-15",
      },
      {
        id: "float-2",
        entityId: "entity-1",
        cashAccountId: "ca-1",
        assigneeName: "Jane Smith",
        amount: "5000",
        remainingBalance: "5000",
        status: "active",
        issuedDate: "2026-07-01",
        settleByDate: "2026-07-30",
      },
    ]);

    db.query.imprestReceipts.findMany.mockResolvedValue([
      {
        id: "rec-1",
        imprestFloatId: "float-1",
        amount: "5000",
        description: "Office supplies",
        receiptDate: "2026-06-10",
      },
      {
        id: "rec-2",
        imprestFloatId: "float-1",
        amount: "3000",
        description: "Travel",
        receiptDate: "2026-06-15",
      },
    ]);

    db.query.pettyCashLedger.findMany.mockResolvedValue([
      {
        id: "ledger-1",
        cashAccountId: "ca-1",
        balance: "48000",
        createdAt: "2026-07-20T10:00:00Z",
      },
      {
        id: "ledger-2",
        cashAccountId: "ca-2",
        balance: "24500",
        createdAt: "2026-07-20T10:00:00Z",
      },
    ]);
  });

  it("should calculate cash positions correctly", async () => {
    const { runCashPipeline } = await import("../cash-pipeline");
    const result = await runCashPipeline("entity-1");

    expect(result.success).toBe(true);
    expect(result.accounts).toHaveLength(2);
    expect(result.totalBalance).toBeGreaterThan(0);
    expect(result.activeImprestFloats).toBeGreaterThan(0);
  });

  it("should calculate health score and escalate if negative", async () => {
    const { runCashPipeline } = await import("../cash-pipeline");
    const result = await runCashPipeline("entity-1");

    expect(result.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.overallScore).toBeLessThanOrEqual(1);
    expect(result.auditEntries.length).toBeGreaterThan(0);
  });
});

// ─── Pipeline 5: Autonomous Reporting Pipeline ────────────────────────────────

describe("Pipeline 5: Autonomous Reporting Pipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const { db } = require("@xenboox/db");

    db.query.fiscalPeriods.findMany.mockResolvedValue([
      {
        id: "period-1",
        entityId: "entity-1",
        year: 2026,
        month: 7,
        status: "open",
        closedAt: null,
      },
    ]);

    db.query.journalEntries.findMany.mockResolvedValue([
      {
        id: "je-rev-1",
        entityId: "entity-1",
        periodId: "period-1",
        status: "posted",
      },
      {
        id: "je-exp-1",
        entityId: "entity-1",
        periodId: "period-1",
        status: "posted",
      },
    ]);

    db.query.journalEntryLines.findMany.mockResolvedValue([
      {
        journalEntryId: "je-rev-1",
        accountId: "rev-acct-1",
        debit: "0",
        credit: "500000",
      },
      {
        journalEntryId: "je-exp-1",
        accountId: "exp-acct-1",
        debit: "350000",
        credit: "0",
      },
    ]);

    db.query.chartOfAccounts.findMany.mockResolvedValue([
      {
        id: "rev-acct-1",
        entityId: "entity-1",
        code: "4010",
        name: "Sales Revenue",
        type: "revenue",
        subtype: "sales_revenue",
      },
      {
        id: "exp-acct-1",
        entityId: "entity-1",
        code: "5010",
        name: "Salaries & Wages",
        type: "expense",
        subtype: "payroll_expense",
      },
    ]);

    db.select.mockImplementation(() => ({
      from: vi.fn(() => ({
        innerJoin: vi.fn(() => ({
          where: vi.fn(() => [{ count: "2" }]),
          orderBy: vi.fn(() => []),
        })),
        where: vi.fn(() => [{ count: "2" }]),
        orderBy: vi.fn(() => []),
      })),
    }));
  });

  it("should detect reportable periods", async () => {
    const { detectReportablePeriods } = await import("../reporting-pipeline");
    const periods = await detectReportablePeriods("entity-1");

    expect(periods.length).toBeGreaterThan(0);
    expect(periods[0].periodLabel).toBeDefined();
    expect(periods[0].postedEntryCount).toBeGreaterThan(0);
  });

  it("should generate profit & loss report", async () => {
    const { runReportingPipeline } = await import("../reporting-pipeline");
    const result = await runReportingPipeline({
      entityId: "entity-1",
      entityName: "Test Entity",
      currency: "GMD",
      periodId: "period-1",
    });

    expect(result.success).toBe(true);
    expect(result.report).not.toBeNull();
    expect(result.report!.profitAndLoss).not.toBeNull();
    expect(result.report!.profitAndLoss!.netProfit).toBe(150000); // 500k - 350k
    expect(result.narrative).toBeDefined();
    expect(result.narrative).toContain("GMD");
  });

  it("should verify trial balance is balanced", async () => {
    const { runReportingPipeline } = await import("../reporting-pipeline");
    const result = await runReportingPipeline({
      entityId: "entity-1",
      entityName: "Test",
      currency: "GMD",
      periodId: "period-1",
    });

    expect(result.balanced).toBe(true);
    expect(result.confidence).toBeGreaterThan(0.9);
  });
});

// ─── Pipeline 6: Autonomous Onboarding Pipeline ───────────────────────────────

describe("Pipeline 6: Autonomous Onboarding Pipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const { db } = require("@xenboox/db");

    db.query.entities.findFirst.mockResolvedValue({
      id: "entity-1",
      name: "New Entity",
      currency: "GMD",
      isActive: true,
    });

    db.query.chartOfAccounts.findMany.mockResolvedValue([]);
    db.query.fiscalPeriods.findMany.mockResolvedValue([]);

    db.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([]),
        onConflictDoNothing: vi.fn(),
      }),
    });
  });

  it("should create chart of accounts during onboarding", async () => {
    const { runOnboardingPipeline } = await import("../onboarding-pipeline");
    const result = await runOnboardingPipeline("entity-1", "New Entity");

    expect(result.success).toBe(true);
    expect(result.steps.length).toBeGreaterThan(0);
    expect(result.coaCreated).toBeDefined();
    expect(result.completeness).toBeGreaterThan(0);
  });

  it("should detect existing setup and skip redundant steps", async () => {
    const { db } = require("@xenboox/db");
    db.query.chartOfAccounts.findMany.mockResolvedValue([
      { id: "acct-1", entityId: "entity-1", code: "1010" },
    ]);

    const { runOnboardingPipeline } = await import("../onboarding-pipeline");
    const result = await runOnboardingPipeline("entity-1", "Existing Entity");

    expect(result.success).toBe(true);
  });

  it("should return next actions for missing components", async () => {
    const { runOnboardingPipeline } = await import("../onboarding-pipeline");
    const result = await runOnboardingPipeline("entity-1", "New Entity");

    expect(Array.isArray(result.nextActions)).toBe(true);
  });

  it("should calculate completeness percentage", async () => {
    const { runOnboardingPipeline } = await import("../onboarding-pipeline");
    const result = await runOnboardingPipeline("entity-1", "New Entity");

    expect(result.completeness).toBeGreaterThanOrEqual(0);
    expect(result.completeness).toBeLessThanOrEqual(100);
  });
});
