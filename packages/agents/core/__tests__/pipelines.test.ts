// ─── Pipeline Tests (Pipelines 1-6) ──────────────────────────────────────────
//
// Tests for all 6 orchestration pipelines with mocked DB and Langfuse.
// Follows project test patterns from agent.test.ts etc.

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ───────────────────────────────────────────────────────────────────

// Helper to create a mock tx object mirroring the db mock structure
function createMockTx() {
  const mkQuery = (methods: string[] = ["findFirst", "findMany"]) => {
    const obj: Record<string, ReturnType<typeof vi.fn>> = {};
    for (const m of methods) obj[m] = vi.fn();
    return obj;
  };

  return {
    query: {
      fiscalPeriods: mkQuery(),
      journalEntries: mkQuery(),
      journalEntryLines: mkQuery(),
      chartOfAccounts: mkQuery(),
      trialBalanceSnapshots: mkQuery(),
      bankTransactions: mkQuery(),
      bankAccounts: mkQuery(),
      cashAccounts: mkQuery(),
      imprestFloats: mkQuery(),
      imprestReceipts: mkQuery(),
      pettyCashLedger: mkQuery(),
      entities: mkQuery(),
      confidenceThresholds: mkQuery(),
      userEntityAccess: mkQuery(),
      agentRoutingLogs: mkQuery(),
      // Onboarding Pipeline tables
      dataConnections: mkQuery(),
      coaTemplates: mkQuery(),
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
  };
}

// Mock userEntityAccess table object so security.ts can use it
const mockUserEntityAccessTable = {
  userId: "user_id",
  entityId: "entity_id",
  role: "role",
} as const;

// Mock table definition objects for all schema tables used by pipeline source files.
// These are imported from @xenboox/db barrel by onboarding-pipeline.ts.
const mockOnboardingSession = {
  id: "id",
  orgId: "org_id",
  currentStep: "current_step",
  status: "status",
  routingAnswer: "routing_answer",
  completedSteps: "completed_steps",
  startedAt: "started_at",
  completedAt: "completed_at",
  timeToFirstValueSeconds: "time_to_first_value_seconds",
  createdAt: "created_at",
  updatedAt: "updated_at",
} as const;

const mockEntity = {
  id: "id",
  name: "name",
  organizationId: "organization_id",
  currency: "currency",
  isActive: "is_active",
} as const;

const mockChartOfAccount = {
  id: "id",
  entityId: "entity_id",
  code: "code",
  name: "name",
  type: "type",
  subtype: "subtype",
  isActive: "is_active",
} as const;

const mockFiscalPeriod = {
  id: "id",
  entityId: "entity_id",
  year: "year",
  month: "month",
  status: "status",
  startDate: "start_date",
  endDate: "end_date",
  closedAt: "closed_at",
  closedBy: "closed_by",
} as const;

const mockDataConnection = {
  id: "id",
  entityId: "entity_id",
  type: "type",
  status: "status",
  recordsProcessed: "records_processed",
  failureReason: "failure_reason",
  fallbackOffered: "fallback_offered",
  createdAt: "created_at",
  updatedAt: "updated_at",
} as const;

const mockHistoricalPull = {
  id: "id",
  entityId: "entity_id",
  dateRangeStart: "date_range_start",
  dateRangeEnd: "date_range_end",
  status: "status",
  exceeds12Months: "exceeds_12_months",
  permissionRequestedAt: "permission_requested_at",
  permissionGrantedAt: "permission_granted_at",
  createdAt: "created_at",
  updatedAt: "updated_at",
} as const;

const mockCoaTemplate = {
  id: "id",
  name: "name",
  segment: "segment",
  country: "country",
  accountList: "account_list",
  isDefault: "is_default",
  createdAt: "created_at",
  updatedAt: "updated_at",
} as const;

vi.mock("@xenboox/db", () => {
  const tx = createMockTx();
  return {
    db: {
      ...tx,
      // transaction wraps the callback with a mock tx as the argument
      transaction: vi.fn(async (cb: (tx: any) => Promise<void>) => {
        await cb(createMockTx());
      }),
    },
    userEntityAccess: mockUserEntityAccessTable,
    entities: mockEntity,
    chartOfAccounts: mockChartOfAccount,
    fiscalPeriods: mockFiscalPeriod,
    onboardingSessions: mockOnboardingSession,
    dataConnections: mockDataConnection,
    historicalPullJobs: mockHistoricalPull,
    coaTemplates: mockCoaTemplate,
  };
});

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

const mockCheckEntityAccess = vi.hoisted(() =>
  vi.fn().mockResolvedValue({
    hasAccess: true,
    role: "finance_director",
  }),
);

vi.mock("./security", () => ({
  checkEntityAccess: mockCheckEntityAccess,
}));

// Mock all @xenboox/db/schema/* subpath imports used by pipeline source files.
// Without these, vitest struggles to resolve workspace subpath packages
// due to the `import * as schema from "./schema"` directory import pattern.

vi.mock("@xenboox/db/schema/accounting", () => ({
  chartOfAccounts: {
    id: "id",
    entityId: "entity_id",
    code: "code",
    name: "name",
    type: "type",
    subtype: "subtype",
    isActive: "is_active",
  },
  fiscalPeriods: {
    id: "id",
    entityId: "entity_id",
    year: "year",
    month: "month",
    status: "status",
    startDate: "start_date",
    endDate: "end_date",
    closedAt: "closed_at",
    closedBy: "closed_by",
  },
  journalEntries: {
    id: "id",
    entityId: "entity_id",
    periodId: "period_id",
    status: "status",
  },
  journalEntryLines: {
    id: "id",
    journalEntryId: "journal_entry_id",
    accountId: "account_id",
    debit: "debit",
    credit: "credit",
  },
  trialBalanceSnapshots: {
    id: "id",
    entityId: "entity_id",
    periodId: "period_id",
    accountId: "account_id",
    debitTotal: "debit_total",
    creditTotal: "credit_total",
    balance: "balance",
  },
}));

vi.mock("@xenboox/db/schema/treasury", () => ({
  bankAccounts: {
    id: "id",
    entityId: "entity_id",
    accountName: "account_name",
    currency: "currency",
    currentBalance: "current_balance",
    isActive: "is_active",
  },
  bankTransactions: {
    id: "id",
    entityId: "entity_id",
    bankAccountId: "bank_account_id",
    amount: "amount",
    description: "description",
    date: "date",
    isReconciled: "is_reconciled",
  },
  reconciliations: {
    id: "id",
    entityId: "entity_id",
    status: "status",
    createdAt: "created_at",
  },
  reconciliationItems: {
    id: "id",
    reconciliationId: "reconciliation_id",
    bankTransactionId: "bank_transaction_id",
    status: "status",
    matchedAmount: "matched_amount",
  },
}));

vi.mock("@xenboox/db/schema/cash", () => ({
  cashAccounts: {
    id: "id",
    entityId: "entity_id",
    name: "name",
    currency: "currency",
    currentBalance: "current_balance",
    isActive: "is_active",
  },
  imprestFloats: {
    id: "id",
    entityId: "entity_id",
    cashAccountId: "cash_account_id",
    assigneeName: "assignee_name",
    amount: "amount",
    remainingBalance: "remaining_balance",
    status: "status",
    issuedDate: "issued_date",
    settleByDate: "settle_by_date",
  },
  imprestReceipts: {
    id: "id",
    imprestFloatId: "imprest_float_id",
    amount: "amount",
    description: "description",
    receiptDate: "receipt_date",
  },
  pettyCashLedger: {
    id: "id",
    cashAccountId: "cash_account_id",
    balance: "balance",
    createdAt: "created_at",
  },
}));

vi.mock("@xenboox/db/schema/chat", () => ({
  conversations: { id: "id", entityId: "entity_id", createdAt: "created_at" },
  chatMessages: {
    id: "id",
    conversationId: "conversation_id",
    role: "role",
    content: "content",
    createdAt: "created_at",
  },
}));

vi.mock("@xenboox/db/schema/agents", () => ({
  confidenceThresholds: {
    orgId: "org_id",
    agentId: "agent_id",
    transactionType: "transaction_type",
    amountBand: "amount_band",
    minConfidence: "min_confidence",
  },
  agentRoutingLogs: {
    entityId: "entity_id",
    userId: "user_id",
    sessionId: "session_id",
    conversationId: "conversation_id",
    intentType: "intent_type",
    inputSummary: "input_summary",
    agentsInvolved: "agents_involved",
    confidence: "confidence",
    thresholdUsed: "threshold_used",
    decision: "decision",
    escalationReason: "escalation_reason",
    taskId: "task_id",
    durationMs: "duration_ms",
    metadata: "metadata",
    createdAt: "created_at",
  },
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

    // Override the mock for this test case
    mockCheckEntityAccess.mockResolvedValueOnce({
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
    expect(summaries[1].status).toBe("blocked");
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

    db.query.onboardingSessions = {
      findFirst: vi.fn(),
    };

    db.query.chartOfAccounts.findMany.mockResolvedValue([]);
    db.query.fiscalPeriods.findMany.mockResolvedValue([]);
    db.query.coaTemplates = {
      findFirst: vi.fn().mockResolvedValue(null),
    };
    db.query.dataConnections = {
      findMany: vi.fn().mockResolvedValue([]),
    };
    db.query.historicalPullJobs = {
      findMany: vi.fn().mockResolvedValue([]),
    };

    // Default insert returns a valid result
    db.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: "mock-id-1" }]),
        onConflictDoNothing: vi.fn(),
      }),
    });

    // Default update returns chains
    db.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    });
  });

  // ── Session Management ───────────────────────────────────────────────────

  describe("createOnboardingSession", () => {
    it("should create a new session when none exists", async () => {
      const { db } = require("@xenboox/db");
      db.query.onboardingSessions.findFirst.mockResolvedValue(null);

      const { createOnboardingSession } =
        await import("../onboarding-pipeline");
      const result = await createOnboardingSession("org-1");

      expect(result.sessionId).toBe("mock-id-1");
      expect(db.insert).toHaveBeenCalled();
    });

    it("should return existing session when one exists", async () => {
      const { db } = require("@xenboox/db");
      db.query.onboardingSessions.findFirst.mockResolvedValue({
        id: "existing-session-id",
        orgId: "org-1",
        currentStep: "data_connections",
        status: "in_progress",
      });

      const { createOnboardingSession } =
        await import("../onboarding-pipeline");
      const result = await createOnboardingSession("org-1");

      expect(result.sessionId).toBe("existing-session-id");
      expect(db.insert).not.toHaveBeenCalled();
    });
  });

  describe("updateRoutingAnswer", () => {
    it("should update session with valid routing answer", async () => {
      const { db } = require("@xenboox/db");
      db.query.onboardingSessions.findFirst = vi.fn();
      db.transaction.mockImplementation(async (cb: any) => {
        const tx = createMockTx();
        tx.query.coaTemplates.findFirst = vi.fn().mockResolvedValue(null);
        await cb(tx);
      });

      const { updateRoutingAnswer } = await import("../onboarding-pipeline");
      await expect(
        updateRoutingAnswer("session-1", "quickbooks"),
      ).resolves.not.toThrow();
    });

    it("should accept all valid routing answers", async () => {
      const { db } = require("@xenboox/db");
      db.query.onboardingSessions.findFirst = vi.fn();
      db.transaction.mockImplementation(async (cb: any) => {
        await cb(createMockTx());
      });

      const { updateRoutingAnswer } = await import("../onboarding-pipeline");
      const answers = [
        "excel",
        "quickbooks",
        "xero",
        "nothing",
        "other",
      ] as const;

      for (const answer of answers) {
        await expect(
          updateRoutingAnswer("session-1", answer),
        ).resolves.not.toThrow();
      }
    });
  });

  // ── Data Connection Hub ─────────────────────────────────────────────────

  describe("getFallbackForFailure", () => {
    it("should return manual_entry fallback for bank connections", async () => {
      const { getFallbackForFailure } = await import("../onboarding-pipeline");

      const bankApi = getFallbackForFailure("bank_api");
      expect(bankApi?.fallbackType).toBe("manual_entry");
      expect(bankApi?.message).toContain("Manual");

      const bankPdf = getFallbackForFailure("bank_pdf");
      expect(bankPdf?.fallbackType).toBe("manual_entry");
    });

    it("should return csv fallback for mobile money", async () => {
      const { getFallbackForFailure } = await import("../onboarding-pipeline");

      const result = getFallbackForFailure("mobile_money");
      expect(result?.fallbackType).toBe("csv");
      expect(result?.message).toContain("CSV");
    });

    it("should return csv fallback for QuickBooks and Xero", async () => {
      const { getFallbackForFailure } = await import("../onboarding-pipeline");

      const qb = getFallbackForFailure("quickbooks");
      expect(qb?.fallbackType).toBe("csv");

      const xero = getFallbackForFailure("xero");
      expect(xero?.fallbackType).toBe("csv");
    });

    it("should return manual_entry fallback for file uploads", async () => {
      const { getFallbackForFailure } = await import("../onboarding-pipeline");

      expect(getFallbackForFailure("excel")?.fallbackType).toBe("manual_entry");
      expect(getFallbackForFailure("csv")?.fallbackType).toBe("manual_entry");
    });

    it("should return null for unknown connection types", async () => {
      const { getFallbackForFailure } = await import("../onboarding-pipeline");
      expect(getFallbackForFailure("manual_entry")).toBeNull();
    });

    it("should have a defined fallback for every connection type in the spec", async () => {
      const { getFallbackForFailure } = await import("../onboarding-pipeline");
      // Every connection type in the enum must have a mapped fallback
      const types = [
        "bank_api",
        "bank_pdf",
        "mobile_money",
        "quickbooks",
        "xero",
        "excel",
        "csv",
      ] as const;
      for (const t of types) {
        expect(getFallbackForFailure(t)).not.toBeNull();
      }
    });
  });

  describe("createDataConnection", () => {
    it("should create a pending data connection", async () => {
      const { createDataConnection } = await import("../onboarding-pipeline");
      const result = await createDataConnection("entity-1", "bank_api");

      expect(result.type).toBe("bank_api");
      expect(result.status).toBe("pending");
      expect(result.recordsProcessed).toBe(0);
      expect(result.failureReason).toBeNull();
      expect(result.fallbackOffered).toBeNull();
    });

    it("should create connection for all data source types", async () => {
      const { createDataConnection } = await import("../onboarding-pipeline");
      const types = [
        "bank_api",
        "bank_pdf",
        "mobile_money",
        "quickbooks",
        "xero",
        "excel",
        "csv",
        "manual_entry",
      ] as const;

      for (const type of types) {
        const result = await createDataConnection("entity-1", type);
        expect(result.type).toBe(type);
        expect(result.status).toBe("pending");
      }
    });
  });

  describe("updateDataConnectionStatus", () => {
    it("should update connection status to connected", async () => {
      const { updateDataConnectionStatus } =
        await import("../onboarding-pipeline");
      await expect(
        updateDataConnectionStatus("conn-1", "connected"),
      ).resolves.not.toThrow();
    });

    it("should update with failure reason and fallback", async () => {
      const { updateDataConnectionStatus } =
        await import("../onboarding-pipeline");
      await expect(
        updateDataConnectionStatus("conn-1", "failed", {
          failureReason: "API timeout",
          fallbackOffered: "csv",
        }),
      ).resolves.not.toThrow();
    });

    it("should track records processed", async () => {
      const { updateDataConnectionStatus } =
        await import("../onboarding-pipeline");
      await expect(
        updateDataConnectionStatus("conn-1", "processing", {
          recordsProcessed: 847,
        }),
      ).resolves.not.toThrow();
    });
  });

  // ── Historical Data Pull ────────────────────────────────────────────────

  describe("startHistoricalPull", () => {
    it("should create a pull job for data within 12 months", async () => {
      const { startHistoricalPull } = await import("../onboarding-pipeline");
      const result = await startHistoricalPull(
        "entity-1",
        "2026-01-01",
        "2026-07-01",
      );

      expect(result.jobId).toBe("mock-id-1");
      expect(result.needsPermission).toBe(false);
    });

    it("should flag jobs exceeding 12 months for permission", async () => {
      const { startHistoricalPull } = await import("../onboarding-pipeline");
      const result = await startHistoricalPull(
        "entity-1",
        "2022-01-01",
        "2026-07-01",
      );

      expect(result.jobId).toBe("mock-id-1");
      expect(result.needsPermission).toBe(true);
    });

    it("should handle data exactly at the 12-month boundary", async () => {
      const { startHistoricalPull } = await import("../onboarding-pipeline");
      // Exactly 12 months: Jan 1 2025 to Jan 1 2026
      const result = await startHistoricalPull(
        "entity-1",
        "2025-01-01",
        "2026-01-01",
      );

      expect(result.needsPermission).toBe(false);
    });

    it("should handle data at 13 months requiring permission", async () => {
      const { startHistoricalPull } = await import("../onboarding-pipeline");
      const result = await startHistoricalPull(
        "entity-1",
        "2024-11-01",
        "2026-01-01",
      );

      expect(result.needsPermission).toBe(true);
    });
  });

  describe("approveHistoricalPull", () => {
    it("should mark job as pulling when approved", async () => {
      const { approveHistoricalPull } = await import("../onboarding-pipeline");
      await expect(approveHistoricalPull("job-1", true)).resolves.not.toThrow();
    });

    it("should mark job as denied when rejected", async () => {
      const { approveHistoricalPull } = await import("../onboarding-pipeline");
      await expect(
        approveHistoricalPull("job-1", false),
      ).resolves.not.toThrow();
    });
  });

  describe("requestHistoricalPullPermission", () => {
    it("should set permission requested timestamp", async () => {
      const { requestHistoricalPullPermission } =
        await import("../onboarding-pipeline");
      await expect(
        requestHistoricalPullPermission("job-1"),
      ).resolves.not.toThrow();
    });
  });

  // ── Chart of Accounts ───────────────────────────────────────────────────

  describe("getSuggestedCoA", () => {
    it("should find exact segment+country match", async () => {
      const { db } = require("@xenboox/db");
      db.query.coaTemplates.findFirst.mockResolvedValue({
        id: "trading-gm",
        segment: "trading",
        country: "GM",
        accountList: [
          {
            code: "1010",
            name: "Cash",
            type: "asset",
            subtype: "bank_account",
            isActive: true,
          },
          {
            code: "4010",
            name: "Sales",
            type: "revenue",
            subtype: "sales_revenue",
            isActive: true,
          },
        ],
      });

      const { getSuggestedCoA } = await import("../onboarding-pipeline");
      const result = await getSuggestedCoA("trading", "GM");

      expect(result.templateId).toBe("trading-gm");
      expect(result.accounts).toHaveLength(2);
    });

    it("should fall back to default template when exact match not found", async () => {
      const { db } = require("@xenboox/db");
      db.query.coaTemplates.findFirst
        .mockResolvedValueOnce(null) // exact match
        .mockResolvedValueOnce({
          id: "default-trading",
          segment: "trading",
          country: null,
          accountList: [
            {
              code: "1010",
              name: "Cash",
              type: "asset",
              subtype: "bank_account",
              isActive: true,
            },
          ],
        }); // fallback

      const { getSuggestedCoA } = await import("../onboarding-pipeline");
      const result = await getSuggestedCoA("trading", "SN");

      expect(result.templateId).toBe("default-trading");
      expect(result.accounts.length).toBeGreaterThan(0);
    });

    it("should return empty accounts when no template matches", async () => {
      const { db } = require("@xenboox/db");
      db.query.coaTemplates.findFirst.mockResolvedValue(null);

      const { getSuggestedCoA } = await import("../onboarding-pipeline");
      const result = await getSuggestedCoA("unknown_segment", "XX");

      expect(result.templateId).toBeNull();
      expect(result.accounts).toHaveLength(0);
    });
  });

  describe("confirmCoA", () => {
    it("should throw when template not found", async () => {
      const { db } = require("@xenboox/db");
      db.query.coaTemplates.findFirst.mockResolvedValue(null);

      const { confirmCoA } = await import("../onboarding-pipeline");
      await expect(confirmCoA("entity-1", "nonexistent")).rejects.toThrow();
    });

    it("should skip insertion when accounts already exist", async () => {
      const { db } = require("@xenboox/db");
      db.query.coaTemplates.findFirst.mockResolvedValue({
        id: "trading-gm",
        segment: "trading",
        country: "GM",
        accountList: [
          {
            code: "1010",
            name: "Cash",
            type: "asset",
            subtype: "bank_account",
            isActive: true,
          },
        ],
      });
      db.query.chartOfAccounts.findMany.mockResolvedValue([
        { id: "acct-1", code: "1010" },
      ]);

      const { confirmCoA } = await import("../onboarding-pipeline");
      const result = await confirmCoA("entity-1", "trading-gm");

      expect(result.accountCount).toBe(1);
    });
  });

  // ── Step Progression ────────────────────────────────────────────────────

  describe("setupEntity", () => {
    it("should advance session to data_connections step", async () => {
      const { db } = require("@xenboox/db");
      db.query.onboardingSessions.findFirst.mockResolvedValue({
        id: "session-1",
        completedSteps: ["signup", "routing"],
      });

      const { setupEntity } = await import("../onboarding-pipeline");
      await expect(setupEntity("session-1", "entity-1")).resolves.not.toThrow();
    });
  });

  describe("markDataConnectionsStepComplete", () => {
    it("should advance to historical_pull step", async () => {
      const { db } = require("@xenboox/db");
      db.query.onboardingSessions.findFirst.mockResolvedValue({
        id: "session-1",
        completedSteps: ["signup", "routing", "entity_setup"],
      });

      const { markDataConnectionsStepComplete } =
        await import("../onboarding-pipeline");
      await expect(
        markDataConnectionsStepComplete("session-1"),
      ).resolves.not.toThrow();
    });

    it("should handle missing session gracefully", async () => {
      const { db } = require("@xenboox/db");
      db.query.onboardingSessions.findFirst.mockResolvedValue(null);

      const { markDataConnectionsStepComplete } =
        await import("../onboarding-pipeline");
      await expect(
        markDataConnectionsStepComplete("nonexistent"),
      ).resolves.not.toThrow();
    });
  });

  describe("markCoAComplete", () => {
    it("should advance to first_look step and include coa_review", async () => {
      const { db } = require("@xenboox/db");
      db.query.onboardingSessions.findFirst.mockResolvedValue({
        id: "session-1",
        completedSteps: [
          "signup",
          "routing",
          "entity_setup",
          "data_connections",
          "historical_pull",
        ],
      });

      const { markCoAComplete } = await import("../onboarding-pipeline");
      await expect(markCoAComplete("session-1")).resolves.not.toThrow();
    });
  });

  // ── Activation / Completion ───────────────────────────────────────────

  describe("completeOnboarding", () => {
    it("should throw when session not found", async () => {
      const { db } = require("@xenboox/db");
      db.query.onboardingSessions.findFirst.mockResolvedValue(null);

      const { completeOnboarding } = await import("../onboarding-pipeline");
      await expect(completeOnboarding("nonexistent")).rejects.toThrow(
        "Onboarding session not found",
      );
    });

    it("should finish onboarding and log time-to-first-value", async () => {
      const { db } = require("@xenboox/db");
      const startedAt = new Date();
      startedAt.setMinutes(startedAt.getMinutes() - 5); // 5 min ago

      db.query.onboardingSessions.findFirst.mockResolvedValue({
        id: "session-1",
        startedAt,
        completedSteps: [
          "signup",
          "routing",
          "entity_setup",
          "data_connections",
          "historical_pull",
          "coa_review",
        ],
      });

      const { completeOnboarding } = await import("../onboarding-pipeline");
      const result = await completeOnboarding("session-1");

      expect(result.timeToFirstValueSeconds).toBeGreaterThan(0);
      expect(result.timeToFirstValueSeconds).toBeLessThan(600); // < 10 min
    });
  });

  // ── Status & Readiness ──────────────────────────────────────────────────

  describe("getOnboardingStatus", () => {
    it("should return null when no session exists", async () => {
      const { db } = require("@xenboox/db");
      db.query.onboardingSessions.findFirst.mockResolvedValue(null);

      const { getOnboardingStatus } = await import("../onboarding-pipeline");
      const result = await getOnboardingStatus("org-nonexistent");

      expect(result).toBeNull();
    });

    it("should return full status for an in-progress session", async () => {
      const { db } = require("@xenboox/db");
      db.query.onboardingSessions.findFirst.mockResolvedValue({
        id: "session-1",
        orgId: "org-1",
        currentStep: "data_connections",
        status: "in_progress",
        completedSteps: ["signup", "routing", "entity_setup"],
        startedAt: new Date(),
        completedAt: null,
        timeToFirstValueSeconds: null,
      });

      const { getOnboardingStatus } = await import("../onboarding-pipeline");
      const result = await getOnboardingStatus("org-1");

      expect(result).not.toBeNull();
      expect(result!.currentStep).toBe("data_connections");
      expect(result!.completeness).toBeGreaterThan(0);
      expect(result!.steps.length).toBeGreaterThan(0);
      expect(Array.isArray(result!.nextActions)).toBe(true);
      expect(Array.isArray(result!.failureRecovery)).toBe(true);
    });

    it("should mark completed session as success", async () => {
      const { db } = require("@xenboox/db");
      db.query.onboardingSessions.findFirst.mockResolvedValue({
        id: "session-1",
        orgId: "org-1",
        currentStep: "complete",
        status: "completed",
        completedSteps: [
          "signup",
          "routing",
          "entity_setup",
          "data_connections",
          "historical_pull",
          "coa_review",
          "first_look",
          "complete",
        ],
        startedAt: new Date(),
        completedAt: new Date(),
        timeToFirstValueSeconds: 320,
      });

      const { getOnboardingStatus } = await import("../onboarding-pipeline");
      const result = await getOnboardingStatus("org-1");

      expect(result!.success).toBe(true);
      expect(result!.timeToFirstValueSeconds).toBe(320);
    });
  });

  // ── End-to-End Pipeline ────────────────────────────────────────────────

  describe("runOnboardingPipeline (end-to-end)", () => {
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
      db.query.fiscalPeriods.findMany.mockResolvedValue([
        {
          id: "period-1",
          entityId: "entity-1",
          year: 2026,
          month: 7,
          status: "open",
        },
      ]);

      const { runOnboardingPipeline } = await import("../onboarding-pipeline");
      const result = await runOnboardingPipeline("entity-1", "Existing Entity");

      expect(result.success).toBe(true);
      expect(result.steps.some((s) => s.status === "skipped")).toBe(true);
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
});
