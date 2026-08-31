// ─── Pipeline Tests (Pipelines 1-6) ──────────────────────────────────────────
//
// Tests for all 6 orchestration pipelines with mocked DB and Langfuse.
// Follows project test patterns from agent.test.ts etc.

import { describe, it, expect, vi, beforeEach } from "vitest";
// The db import is mocked by vi.mock("@xenboox/db") — cast to any so the
// mock methods (mockResolvedValue etc.) typecheck against the mock surface.
import { db as dbTyped } from "@xenboox/db";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = dbTyped as any;
import { clearIdempotencyCache } from "../retry";
import { fanOutToDepartments as mockFanOutToDepartments } from "../orchestrator";

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
      onboardingSessions: mkQuery(),
      dataConnections: mkQuery(),
      coaTemplates: mkQuery(),
      historicalPullJobs: mkQuery(),
      // Reconciliation Pipeline tables
      statementLines: mkQuery(),
      matchRecords: mkQuery(),
      reconciliationSessions: mkQuery(),
      reconciliations: mkQuery(),
      mobileMoneyAccounts: mkQuery(),
      // Cash & Imprest Pipeline tables
      cashLocations: mkQuery(),
      cashTransactions: mkQuery(),
      discrepancyFlags: mkQuery(),
      // Close Pipeline (Pipeline 2) tables
      closeSessions: mkQuery(),
      closeConfirmations: mkQuery(),
      closeVersions: mkQuery(),
      reopenRequests: mkQuery(),
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

const mocks = vi.hoisted(() => {
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
  return {
    mockUserEntityAccessTable,
    mockOnboardingSession,
    mockEntity,
    mockChartOfAccount,
    mockFiscalPeriod,
    mockDataConnection,
    mockHistoricalPull,
    mockCoaTemplate,
  };
});

vi.mock("@xenboox/db", () => {
  const tx = createMockTx();
  return {
    db: {
      ...tx,
      // transaction wraps the callback with a mock tx as the argument
      transaction: vi.fn(async (cb: (tx: any) => Promise<void>) => {
        const mockTx = createMockTx();
        // Default: journal entry lines exist inside the tx so the close
        // pipeline can build trial balance snapshots.
        mockTx.query.journalEntryLines.findMany.mockResolvedValue([
          {
            id: "line-1",
            journalEntryId: "je-1",
            accountId: "acct-1",
            debit: "1000",
            credit: "0",
          },
          {
            id: "line-2",
            journalEntryId: "je-2",
            accountId: "acct-2",
            debit: "0",
            credit: "1000",
          },
        ]);
        // Simulate the period-close update: mark the current period closed.
        mockTx.update.mockReturnValue({
          set: vi.fn(() => ({
            where: vi.fn(() => {
              (globalThis as any).__closePeriodClosed = true;
            }),
          })),
        });
        await cb(mockTx);
      }),
    },
    userEntityAccess: mocks.mockUserEntityAccessTable,
    entities: mocks.mockEntity,
    chartOfAccounts: mocks.mockChartOfAccount,
    fiscalPeriods: mocks.mockFiscalPeriod,
    onboardingSessions: mocks.mockOnboardingSession,
    dataConnections: mocks.mockDataConnection,
    historicalPullJobs: mocks.mockHistoricalPull,
    coaTemplates: mocks.mockCoaTemplate,
    // Reconciliation Pipeline table defs
    statementLines: { id: "id", entityId: "entity_id" } as const,
    matchRecords: { id: "id", entityId: "entity_id" } as const,
    reconciliationSessions: {
      id: "id",
      entityId: "entity_id",
      periodStart: "period_start",
      periodEnd: "period_end",
      status: "status",
      accountsIncluded: "accounts_included",
      matchedCount: "matched_count",
      unmatchedCount: "unmatched_count",
      totalCount: "total_count",
      overallConfidence: "overall_confidence",
      reviewedBy: "reviewed_by",
      reviewedAt: "reviewed_at",
      closedAt: "closed_at",
      notes: "notes",
    } as const,
    mobileMoneyAccounts: {
      id: "id",
      entityId: "entity_id",
      isActive: "is_active",
    } as const,
    cashLocations: {
      id: "id",
      entityId: "entity_id",
      name: "name",
      isActive: "is_active",
    } as const,
    reportSnapshots: {
      id: "id",
      entityId: "entity_id",
      periodId: "period_id",
    } as const,
    reportRequests: {
      id: "id",
      entityId: "entity_id",
      requestType: "request_type",
    } as const,
    statementVersions: {
      id: "id",
      entityId: "entity_id",
      snapshotId: "snapshot_id",
      statementType: "statement_type",
      isLatest: "is_latest",
    } as const,
    cashTransactions: {
      id: "id",
      entityId: "entity_id",
      cashLocationId: "cash_location_id",
      amount: "amount",
      type: "type",
    } as const,
    discrepancyFlags: {
      id: "id",
      entityId: "entity_id",
      flagType: "flag_type",
      status: "status",
    } as const,
  };
});

vi.mock("@xenboox/models", () => {
  const callModel = vi.fn();
  callModel.mockImplementation(
    async (params: { messages?: Array<{ content?: string }> }) => {
      const content = params.messages?.[0]?.content ?? "";
      let intent = "query";
      if (/Run payroll|post|record|create|transfer/i.test(content))
        intent = "instruction";
      else if (/wrong|error|mistake|off/i.test(content))
        intent = "correction_dispute";
      else if (/approve|reject|proceed/i.test(content))
        intent = "approval_response";
      else if (/escalat|flag/i.test(content)) intent = "agent_escalation";
      return {
        toolCalls: [
          {
            name: "classify_intent",
            arguments: {
              intent,
              confidence: 0.92,
              reasoning: `Model classified as ${intent}`,
              entities: [],
              period: null,
              amount: null,
            },
          },
        ],
      };
    },
  );
  return {
    callModel,
    generateText: vi.fn(),
    langfuse: {
      trace: vi.fn(() => ({
        update: vi.fn(),
      })),
      event: vi.fn(),
    },
    getLangfuse: vi.fn(),
  };
});

vi.mock("../langfuse", () => ({
  langfuse: {
    trace: vi.fn(() => ({
      update: vi.fn(),
    })),
    event: vi.fn(),
  },
  getLangfuse: vi.fn(),
}));

vi.mock("../state", () => ({
  createAuditEntry: vi.fn((params) => ({
    agentId: params.agentId,
    action: params.action,
    details: params.details,
    confidence: params.confidence,
    timestamp: new Date().toISOString(),
  })),
  BaseAgentState: class {},
}));

vi.mock("../orchestrator", () => ({
  orchestrate: vi.fn(() => ({
    agentId: "test-agent",
    confidence: 0.9,
    reasoning: "All checks passed",
    confirmed: true,
    humanResponse: "Confirmed",
    errors: [],
  })),
  classifyUserMessage: vi.fn(() => "general_query"),
  fanOutToDepartments: vi.fn((params: any) => {
    const result = [
      "controller",
      "treasury",
      "payroll_manager",
      "compliance",
    ].map((dept) => ({
      department: dept,
      agentId: dept,
      confidence: 0.9,
      reasoning: `${dept} confirmed`,
      confirmed: true,
      summary: `${dept} ready`,
      errors: [],
    }));
    return Promise.resolve(result);
  }),
  checkEscalation: vi.fn(() => ({ needsEscalation: false, reason: "" })),
  getAgentGraph: vi.fn(() => ({})),
}));

vi.mock("../session-state", () => ({
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

vi.mock("../registry", () => ({
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

vi.mock("../confidence", () => ({
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

vi.mock("../security", () => ({
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
    name: "name",
    bankName: "bank_name",
    accountName: "account_name",
    currency: "currency",
    currentBalance: "current_balance",
    openingBalance: "opening_balance",
    isActive: "is_active",
  },
  bankTransactions: {
    id: "id",
    entityId: "entity_id",
    bankAccountId: "bank_account_id",
    amount: "amount",
    description: "description",
    transactionDate: "transaction_date",
    reference: "reference",
    isReconciled: "is_reconciled",
  },
  reconciliations: {
    id: "id",
    entityId: "entity_id",
    bankAccountId: "bank_account_id",
    statementDate: "statement_date",
    statementBalance: "statement_balance",
    bookBalance: "book_balance",
    difference: "difference",
    status: "status",
    createdAt: "created_at",
    closedAt: "closed_at",
  },
  reconciliationItems: {
    id: "id",
    reconciliationId: "reconciliation_id",
    bankTransactionId: "bank_transaction_id",
    status: "status",
    matchedAmount: "matched_amount",
  },
}));

vi.mock("@xenboox/db/schema/mobile-money", () => ({
  mobileMoneyAccounts: {
    id: "id",
    entityId: "entity_id",
    bankAccountId: "bank_account_id",
    provider: "provider",
    phoneNumber: "phone_number",
    isActive: "is_active",
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

vi.mock("@xenboox/db/schema/close", () => ({
  closeSessions: {
    id: "id",
    entityId: "entity_id",
    fiscalPeriodId: "fiscal_period_id",
    periodLabel: "period_label",
    status: "status",
    triggeredBy: "triggered_by",
    triggeredByUserId: "triggered_by_user_id",
    openedAt: "opened_at",
    closedAt: "closed_at",
    lockedAt: "locked_at",
    overallConfidence: "overall_confidence",
    errors: "errors",
    warnings: "warnings",
    metadata: "metadata",
  },
  closeConfirmations: {
    id: "id",
    closeSessionId: "close_session_id",
    agentId: "agent_id",
    status: "status",
    confidence: "confidence",
    openItems: "open_items",
    summary: "summary",
    details: "details",
    collectedAt: "collected_at",
    createdAt: "created_at",
  },
  closeVersions: {
    id: "id",
    closeSessionId: "close_session_id",
    versionNumber: "version_number",
    packageRef: "package_ref",
    isCorrection: "is_correction",
    correctionReason: "correction_reason",
    supersededBy: "superseded_by",
    createdAt: "created_at",
  },
  reopenRequests: {
    id: "id",
    closeSessionId: "close_session_id",
    raisedByUserId: "raised_by_user_id",
    raisedVia: "raised_via",
    description: "description",
    classification: "classification",
    affectedPeriods: "affected_periods",
    approvedAt: "approved_at",
    resolvedAt: "resolved_at",
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
    const { seedDefaultThresholds, DEFAULT_THRESHOLDS } = await import(
      "../pipeline"
    );
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
    const { evaluateConfidenceGate, createInputEvent } = await import(
      "../pipeline"
    );
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
    const { evaluateConfidenceGate, createInputEvent } = await import(
      "../pipeline"
    );
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
    const { synthesizeResponse, createInputEvent } = await import(
      "../pipeline"
    );
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
    clearIdempotencyCache();

    // Mock an open fiscal period. The prev-period query (year 2026, month 6)
    // returns a CLOSED period so the close validation passes. Once the close
    // pipeline's tx.update() closes the current period, the id-based query
    // returns "closed" so post-close verification passes.
    let periodClosed = false;
    (globalThis as any).__closePeriodClosed = false;
    db.query.fiscalPeriods.findFirst.mockImplementation(async (args?: any) => {
      const whereJson = JSON.stringify(args?.where, (k, v) =>
        typeof v === "bigint" ? String(v) : v,
      );
      // Prev-period query filters on year+month columns (not id). It must be
      // closed for the close validation to pass.
      if (whereJson.includes("year") || whereJson.includes("month")) {
        return {
          id: "period-0",
          entityId: "entity-1",
          year: 2026,
          month: 6,
          status: "closed",
          closedAt: new Date("2026-07-01"),
          closedBy: "system",
        };
      }
      return {
        id: "period-1",
        entityId: "entity-1",
        year: 2026,
        month: 7,
        status: (globalThis as any).__closePeriodClosed ? "closed" : "open",
        closedAt: (globalThis as any).__closePeriodClosed ? new Date() : null,
        closedBy: (globalThis as any).__closePeriodClosed ? "user-1" : null,
      };
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

    // Mock select queries returning aggregate data. Rows include both the
    // aggregate columns (totalDebit/totalCredit for the TB-balance check)
    // and the entry id (for the period-close snapshot builder).
    db.select.mockImplementation(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => [
          { id: "je-1", totalDebit: "1500", totalCredit: "1500" },
        ]),
        innerJoin: vi.fn(() => ({
          where: vi.fn(() => [
            { id: "je-1", totalDebit: "1500", totalCredit: "1500" },
          ]),
          orderBy: vi.fn(() => []),
        })),
        orderBy: vi.fn(() => []),
      })),
    }));
  });

  it("should execute close pipeline successfully", async () => {
    const { executeClosePipeline } = await import("../close-pipeline");
    const { closeState } = await executeClosePipeline({
      entityId: "entity-1",
      entityName: "Test Entity",
      currency: "GMD",
      periodId: "period-1",
      userId: "user-1",
    });

    expect(closeState.status).toBe("completed");
    expect(closeState.overallConfidence).toBeGreaterThan(0.9);
    expect(closeState.completedAt).toBeDefined();
  });

  it("should fail validation for already closed period", async () => {
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
    const { closeState } = await executeClosePipeline({
      entityId: "entity-1",
      entityName: "Test",
      currency: "GMD",
      periodId: "period-1",
      userId: "user-1",
    });

    expect(closeState.status).toBe("failed");
    expect(closeState.errors.length).toBeGreaterThan(0);
  });

  it("should report close status correctly", async () => {
    const { getCloseStatus } = await import("../close-pipeline");
    const result = await getCloseStatus("entity-1", "period-1");

    expect(result.currentPeriod).toBe("2026-07");
    expect(result.steps).toHaveLength(7);
    expect(result.entryCount).toBeGreaterThan(0);
  });

  it("should return error state for missing period", async () => {
    db.query.fiscalPeriods.findFirst.mockResolvedValue(null);

    const { executeClosePipeline } = await import("../close-pipeline");
    const { closeState } = await executeClosePipeline({
      entityId: "entity-1",
      entityName: "Test",
      currency: "GMD",
      periodId: "nonexistent",
      userId: "user-1",
    });

    expect(closeState.status).toBe("failed");
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Enhanced 12-Step Close Flow
  // ────────────────────────────────────────────────────────────────────────────

  describe("Enhanced 12-Step Close Flow", () => {
    beforeEach(() => {
      vi.clearAllMocks();

      // Mock closeSessions queries
      db.query.closeSessions.findFirst.mockResolvedValue({
        id: "session-1",
        entityId: "entity-1",
        fiscalPeriodId: "period-1",
        periodLabel: "2026-07",
        status: "in_progress",
        triggeredBy: "manual",
        openedAt: new Date(),
        lockedAt: null,
        closedAt: null,
        createdAt: new Date(),
      });

      db.query.closeSessions.findMany.mockResolvedValue([
        {
          id: "session-1",
          entityId: "entity-1",
          fiscalPeriodId: "period-1",
          periodLabel: "2026-07",
          status: "in_progress",
          triggeredBy: "manual",
          openedAt: new Date(),
          lockedAt: null,
          closedAt: null,
          createdAt: new Date(),
        },
      ]);

      // Mock closeConfirmations
      db.query.closeConfirmations.findMany.mockResolvedValue([]);

      // Mock closeVersions
      db.query.closeVersions.findMany.mockResolvedValue([]);

      // Mock reopenRequests
      db.query.reopenRequests.findFirst.mockResolvedValue(null);
      db.query.reopenRequests.findMany.mockResolvedValue([]);

      // Mock insert returning ID
      db.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: "session-1" }]),
          onConflictDoNothing: vi.fn(),
        }),
      });

      // Mock update chaining
      db.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      // Mock transaction
      db.transaction.mockImplementation(async (cb: any) => {
        await cb(createMockTx());
      });
    });

    // ── openCloseSession ───────────────────────────────────────────────────

    describe("openCloseSession (Step 1)", () => {
      it("should create a close session", async () => {
        const { openCloseSession } = await import("../close-pipeline");
        const result = await openCloseSession({
          entityId: "entity-1",
          fiscalPeriodId: "period-1",
          periodLabel: "2026-07",
          triggeredBy: "manual",
          triggeredByUserId: "user-1",
        });

        expect(result.sessionId).toBe("session-1");
      });
    });

    // ── collectCloseConfirmations ───────────────────────────────────────────

    describe("collectCloseConfirmations (Step 2)", () => {
      it("should collect and persist confirmations", async () => {
        const { collectCloseConfirmations } = await import("../close-pipeline");
        const result = await collectCloseConfirmations({
          closeSessionId: "session-1",
          entityId: "entity-1",
          entityName: "Test Entity",
          currency: "GMD",
          periodLabel: "2026-07",
        });

        expect(result.confirmations).toHaveLength(4); // 4 departments
        expect(result.allConfirmed).toBe(true);
        expect(result.overallConfidence).toBeGreaterThan(0);
      });

      it("should handle blocked departments", async () => {
        // Override orchestrator mock for this test
        (mockFanOutToDepartments as any).mockResolvedValueOnce(
          ["controller", "treasury", "payroll_manager", "compliance"].map(
            (dept, i) => ({
              department: dept,
              agentId: dept,
              confidence: i === 1 ? 0.5 : 0.9,
              reasoning:
                i === 1 ? "Treasury has open items" : `${dept} confirmed`,
              confirmed: i !== 1, // treasury not confirmed
              summary: i === 1 ? "Open items exist" : `${dept} ready`,
              errors: i === 1 ? ["Reconciliation incomplete"] : [],
            }),
          ),
        );

        const { collectCloseConfirmations } = await import("../close-pipeline");
        const result = await collectCloseConfirmations({
          closeSessionId: "session-1",
          entityId: "entity-1",
          entityName: "Test Entity",
          currency: "GMD",
          periodLabel: "2026-07",
        });

        expect(result.allConfirmed).toBe(false);
        expect(
          result.confirmations.find((c: any) => c.agentId === "treasury")
            ?.status,
        ).toBe("blocked");
      });
    });

    // ── evaluateCloseGate ──────────────────────────────────────────────────

    describe("evaluateCloseGate (Step 3)", () => {
      it("should allow close when all confirmed", async () => {
        const { evaluateCloseGate } = await import("../close-pipeline");
        const confirmations = [
          {
            agentId: "controller",
            status: "confirmed" as const,
            confidence: 0.95,
            openItems: [],
            summary: "All good",
          },
          {
            agentId: "treasury",
            status: "confirmed" as const,
            confidence: 0.92,
            openItems: [],
            summary: "Clean",
          },
        ];

        const result = await evaluateCloseGate(confirmations);
        expect(result.canClose).toBe(true);
        expect(result.blockingAgents).toHaveLength(0);
      });

      it("should block close when any department is blocked", async () => {
        const { evaluateCloseGate } = await import("../close-pipeline");
        const confirmations = [
          {
            agentId: "controller",
            status: "confirmed" as const,
            confidence: 0.95,
            openItems: [],
            summary: "All good",
          },
          {
            agentId: "treasury",
            status: "blocked" as const,
            confidence: 0.5,
            openItems: [
              {
                item: "Reconciliation incomplete",
                severity: "blocking" as const,
              },
            ],
            summary: "Has open items",
          },
        ];

        const result = await evaluateCloseGate(confirmations);
        expect(result.canClose).toBe(false);
        expect(result.blockingAgents).toHaveLength(1);
        expect(result.blockingAgents[0]).toContain("treasury");
      });

      it("should block close when confidence below threshold", async () => {
        const { evaluateCloseGate } = await import("../close-pipeline");
        const confirmations = [
          {
            agentId: "controller",
            status: "confirmed" as const,
            confidence: 0.3,
            openItems: [],
            summary: "Low confidence",
          },
        ];

        const result = await evaluateCloseGate(confirmations, 0.7);
        expect(result.canClose).toBe(false);
        expect(result.blockingAgents).toHaveLength(1);
        expect(result.overallConfidence).toBe(0.3);
      });
    });

    // ── generateClosePackage ────────────────────────────────────────────────

    describe("generateClosePackage (Step 5)", () => {
      it("should generate and persist a close package", async () => {
        const { generateClosePackage } = await import("../close-pipeline");
        const result = await generateClosePackage({
          closeSessionId: "session-1",
          entityName: "Test Entity",
          narrativeSummary: "All departments confirmed. Period closed cleanly.",
          packageData: { netIncome: 150000 },
        });

        expect(result.versionNumber).toBe(1);
        expect(result.narrativeSummary).toContain("closed cleanly");
      });
    });

    // ── notifyCloseOwner ────────────────────────────────────────────────────

    describe("notifyCloseOwner (Step 6 - Hard Rule)", () => {
      it("should notify owner and update session status", async () => {
        const { notifyCloseOwner } = await import("../close-pipeline");
        const result = await notifyCloseOwner({
          closeSessionId: "session-1",
          entityId: "entity-1",
          entityName: "Test Entity",
          periodLabel: "2026-07",
          narrativeSummary: "Period closed",
          recipientUserId: "user-1",
        });

        expect(result.notified).toBe(true);
        expect(result.notificationTimestamp).toBeDefined();
      });
    });

    // ── processPassiveApproval ───────────────────────────────────────────────

    describe("processPassiveApproval (Step 7)", () => {
      it("should approve and lock when no flag raised", async () => {
        const { processPassiveApproval } = await import("../close-pipeline");
        const result = await processPassiveApproval({
          closeSessionId: "session-1",
          entityId: "entity-1",
        });

        expect(result.approved).toBe(true);
        expect(result.flagged).toBe(false);
        expect(result.lockedAt).toBeDefined();
      });

      it("should flag when reopen request exists", async () => {
        db.query.reopenRequests.findFirst.mockResolvedValue({
          id: "reopen-1",
          closeSessionId: "session-1",
          description: "Revenue figures are incorrect",
          createdAt: new Date(),
        });

        const { processPassiveApproval } = await import("../close-pipeline");
        const result = await processPassiveApproval({
          closeSessionId: "session-1",
          entityId: "entity-1",
        });

        expect(result.approved).toBe(false);
        expect(result.flagged).toBe(true);
        expect(result.lockedAt).toBeNull();
      });
    });

    // ── reopenPeriodWithRecovery ─────────────────────────────────────────────

    describe("reopenPeriodWithRecovery (Step 9)", () => {
      it("should create reopen request for simple correction", async () => {
        db.query.closeSessions.findFirst.mockResolvedValue({
          id: "session-1",
          fiscalPeriodId: "period-1",
        });

        const { reopenPeriodWithRecovery } = await import("../close-pipeline");
        const result = await reopenPeriodWithRecovery({
          closeSessionId: "session-1",
          entityId: "entity-1",
          raisedByUserId: "user-1",
          raisedVia: "dashboard",
          description: "Wrong expense categorization",
          classification: "simple_correction",
        });

        expect(result.reopenRequestId).toBeDefined();
        expect(result.recoveryPath).toContain("Simple correction");
      });

      it("should create reopen request for cascading error", async () => {
        db.query.closeSessions.findFirst.mockResolvedValue({
          id: "session-1",
          fiscalPeriodId: "period-1",
        });

        const { reopenPeriodWithRecovery } = await import("../close-pipeline");
        const result = await reopenPeriodWithRecovery({
          closeSessionId: "session-1",
          entityId: "entity-1",
          raisedByUserId: "user-1",
          raisedVia: "chat",
          description: "FX rates used incorrectly across all of Q2",
          classification: "cascading_error",
          affectedPeriods: ["2026-04", "2026-05", "2026-06"],
        });

        expect(result.recoveryPath).toContain("Cascading error");
        expect(result.recoveryPath).toContain("3 affected");
      });
    });

    // ── getReopenDepthGovernant ──────────────────────────────────────────────

    describe("getReopenDepthGovernor (Step 10)", () => {
      it("should allow immediate recovery for recent periods (< 3 months)", async () => {
        const { getReopenDepthGovernor } = await import("../close-pipeline");
        const now = new Date();
        const recentLabel = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

        const result = await getReopenDepthGovernor(recentLabel);
        expect(result.allowed).toBe(true);
        expect(result.requiresApproval).toBe(false);
        expect(result.warning).toContain("Immediate");
      });

      it("should require approval for periods 3-12 months back", async () => {
        const { getReopenDepthGovernor } = await import("../close-pipeline");
        // Use a fixed label well inside the 3-12 month window to avoid
        // date-overflow edge cases with setMonth on month-end dates.
        const result = await getReopenDepthGovernor("2026-02");
        expect(result.allowed).toBe(true);
        expect(result.requiresApproval).toBe(true);
        expect(result.warning).toContain("months back");
      });

      it("should require scope assessment for periods beyond 12 months", async () => {
        const { getReopenDepthGovernor } = await import("../close-pipeline");
        const oldDate = new Date();
        oldDate.setFullYear(oldDate.getFullYear() - 2);
        const oldLabel = `${oldDate.getFullYear()}-${String(oldDate.getMonth() + 1).padStart(2, "0")}`;

        const result = await getReopenDepthGovernor(oldLabel);
        expect(result.allowed).toBe(true);
        expect(result.requiresApproval).toBe(true);
        expect(result.warning).toContain("scope assessment");
        expect(result.depthMonths).toBeGreaterThan(12);
      });
    });

    // ── getCloseAuditTrail ───────────────────────────────────────────────────

    describe("getCloseAuditTrail (Step 11)", () => {
      it("should retrieve complete audit trail", async () => {
        const { getCloseAuditTrail } = await import("../close-pipeline");
        const result = await getCloseAuditTrail("session-1");

        expect(result.session).toBeDefined();
        expect(result.session!.id).toBe("session-1");
        expect(result.versions).toBeDefined();
        expect(result.confirmations).toBeDefined();
        expect(result.reopenRequests).toBeDefined();
      });
    });

    // ── getCloseSessionStatus ───────────────────────────────────────────────

    describe("getCloseSessionStatus", () => {
      it("should return full close session status", async () => {
        const { getCloseSessionStatus } = await import("../close-pipeline");
        const result = await getCloseSessionStatus("entity-1", "2026-07");

        expect(result.sessionId).toBe("session-1");
        expect(result.period).toBe("2026-07");
        expect(result.isLocked).toBe(false);
        expect(result.confirmations).toBeDefined();
        expect(result.versions).toBeDefined();
        expect(result.reopenRequests).toBeDefined();
      });

      it("should return empty state when no session exists", async () => {
        db.query.closeSessions.findFirst.mockResolvedValue(null);

        const { getCloseSessionStatus } = await import("../close-pipeline");
        const result = await getCloseSessionStatus("entity-999", "2026-07");

        expect(result.sessionId).toBeNull();
        expect(result.isLocked).toBe(false);
        expect(result.confirmations).toHaveLength(0);
      });
    });
  });
});

// ─── Pipeline 3: Autonomous Bank Reconciliation Pipeline ──────────────────────

describe("Pipeline 3: Autonomous Bank Reconciliation Pipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearIdempotencyCache();

    // Default mock: 2 active accounts
    db.query.bankAccounts.findMany.mockResolvedValue([
      {
        id: "ba-1",
        entityId: "entity-1",
        name: "Operating Account",
        bankName: "Trust Bank",
        currency: "GMD",
        currentBalance: "500000",
        openingBalance: "450000",
        isActive: true,
      },
      {
        id: "ba-2",
        entityId: "entity-1",
        name: "Savings Account",
        bankName: "Ecobank",
        currency: "GMD",
        currentBalance: "1000000",
        openingBalance: "950000",
        isActive: true,
      },
    ]);

    // Default mock: 2 unreconciled transactions for ba-1
    db.query.bankTransactions.findMany.mockImplementation(
      async ({ where }: any) => {
        const whereJson = JSON.stringify(where ?? {}, (k, v) =>
          typeof v === "bigint" ? String(v) : v,
        );
        // Return transactions only for main account (the drizzle SQL object
        // serializes column names + literal values into queryChunks).
        if (whereJson.includes("ba-1")) {
          return [
            {
              id: "tx-1",
              bankAccountId: "ba-1",
              amount: "15000",
              transactionDate: "2026-07-15",
              description: "Customer payment - Invoice INV-001",
              reference: "INV-001",
              isReconciled: false,
            },
            {
              id: "tx-2",
              bankAccountId: "ba-1",
              amount: "-5000",
              transactionDate: "2026-07-16",
              description: "Supplier payment",
              reference: null,
              isReconciled: false,
            },
          ];
        }
        return [];
      },
    );

    // Default: no matching journal entries
    db.query.journalEntries.findMany.mockResolvedValue([]);
    db.query.journalEntryLines.findMany.mockResolvedValue([]);

    // Default: no existing reconciliation for these accounts
    db.query.reconciliations.findFirst.mockResolvedValue(null);
    db.query.reconciliationSessions.findFirst.mockResolvedValue(null);

    // Default: no mobile money accounts
    db.query.mobileMoneyAccounts.findMany.mockResolvedValue([]);

    // Default insert returns a valid ID
    db.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: "recon-1" }]),
        onConflictDoNothing: vi.fn(),
      }),
    });

    // Default update returns chain
    db.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    });

    // Default transaction
    db.transaction.mockImplementation(async (cb: any) => {
      await cb(createMockTx());
    });
  });

  // ── scoreMatch ────────────────────────────────────────────────────────────

  describe("scoreMatch", () => {
    it("should return exact tier for exact amount + date + reference match", async () => {
      const { scoreMatch } = await import("../reconciliation-pipeline");
      const result = scoreMatch(
        {
          amount: 15000,
          date: new Date("2026-07-15"),
          reference: "INV-001",
          description: "Customer payment",
        },
        {
          amount: 15000,
          date: "2026-07-15",
          description: "Sale INV-001",
          reference: "INV-001",
        },
      );

      expect(result.tier).toBe("exact");
      expect(result.totalScore).toBeGreaterThanOrEqual(0.95);
      expect(result.amountScore).toBe(1);
      expect(result.referenceScore).toBe(1);
    });

    it("should return strong tier for amount + date match with description similarity", async () => {
      const { scoreMatch } = await import("../reconciliation-pipeline");
      const result = scoreMatch(
        {
          amount: 15000,
          date: new Date("2026-07-14"),
          reference: "",
          description: "Customer payment INV-001",
        },
        {
          amount: 15000,
          date: "2026-07-15",
          description: "Customer payment INV-001",
          reference: null,
        },
      );

      expect(result.tier).toBe("strong");
      expect(result.totalScore).toBeGreaterThanOrEqual(0.8);
      expect(result.totalScore).toBeLessThan(0.95);
    });

    it("should return weak tier for partial matches", async () => {
      const { scoreMatch } = await import("../reconciliation-pipeline");
      const result = scoreMatch(
        {
          amount: 15000,
          date: new Date("2026-07-10"),
          reference: "",
          description: "Customer payment",
        },
        {
          amount: 15000,
          date: "2026-07-15",
          description: "Invoice payment",
          reference: null,
        },
      );

      expect(result.tier).toBe("weak");
      expect(result.totalScore).toBeGreaterThanOrEqual(0.6);
      expect(result.totalScore).toBeLessThan(0.8);
    });

    it("should score below threshold for no match", async () => {
      const { scoreMatch } = await import("../reconciliation-pipeline");
      const result = scoreMatch(
        {
          amount: 15000,
          date: new Date("2026-07-01"),
          reference: "",
          description: "Customer payment",
        },
        {
          amount: 500,
          date: "2026-06-01",
          description: "Bank fees",
          reference: null,
        },
      );

      expect(result.totalScore).toBeLessThan(0.6);
    });

    it("should give higher score for exact reference match", async () => {
      const { scoreMatch } = await import("../reconciliation-pipeline");
      const refResult = scoreMatch(
        {
          amount: 10000,
          date: new Date("2026-07-15"),
          reference: "REF-123",
          description: "Payment",
        },
        {
          amount: 10000,
          date: "2026-07-15",
          description: "Payment",
          reference: "REF-123",
        },
      );

      const noRefResult = scoreMatch(
        {
          amount: 10000,
          date: new Date("2026-07-15"),
          reference: "",
          description: "Payment",
        },
        {
          amount: 10000,
          date: "2026-07-15",
          description: "Payment",
          reference: null,
        },
      );

      expect(refResult.totalScore).toBeGreaterThan(noRefResult.totalScore);
    });
  });

  // ── detectDuplicates ─────────────────────────────────────────────────────

  describe("detectDuplicates", () => {
    it("should return not duplicate when no existing session", async () => {
      db.query.reconciliationSessions.findFirst.mockResolvedValue(null);

      const { detectDuplicates } = await import("../reconciliation-pipeline");
      const result = await detectDuplicates("entity-1", "ba-1", "2026-07-31");

      expect(result.isDuplicate).toBe(false);
    });

    it("should detect duplicate when session exists for same account+period", async () => {
      db.query.reconciliationSessions.findFirst.mockResolvedValue({
        id: "existing-session",
        entityId: "entity-1",
        status: "open",
      });

      const { detectDuplicates } = await import("../reconciliation-pipeline");
      const result = await detectDuplicates("entity-1", "ba-1", "2026-07-31");

      expect(result.isDuplicate).toBe(true);
      expect(result.existingSessionId).toBe("existing-session");
    });
  });

  // ── classifyPendingSettlement ─────────────────────────────────────────────

  describe("classifyPendingSettlement", () => {
    it("should return false for non-mobile-money accounts", async () => {
      const { classifyPendingSettlement } = await import(
        "../reconciliation-pipeline"
      );
      const result = classifyPendingSettlement(
        new Date().toISOString().split("T")[0]!,
        1000,
        false,
      );
      expect(result).toBe(false);
    });

    it("should return true for recent mobile money transactions (< 3 days)", async () => {
      const { classifyPendingSettlement } = await import(
        "../reconciliation-pipeline"
      );
      const today = new Date().toISOString().split("T")[0]!;
      const result = classifyPendingSettlement(today, 1000, true);
      expect(result).toBe(true);
    });

    it("should return false for old mobile money transactions", async () => {
      const { classifyPendingSettlement } = await import(
        "../reconciliation-pipeline"
      );
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10);
      const result = classifyPendingSettlement(
        oldDate.toISOString().split("T")[0]!,
        1000,
        true,
      );
      expect(result).toBe(false);
    });
  });

  // ── determineUnmatchedDetail ──────────────────────────────────────────────

  describe("determineUnmatchedDetail", () => {
    it("should return pending_settlement reason when flagged", async () => {
      const { determineUnmatchedDetail } = await import(
        "../reconciliation-pipeline"
      );
      const result = determineUnmatchedDetail([], true);
      expect(result.reason).toBe("pending_settlement");
      expect(result.suggestedAction).toContain("settlement");
    });

    it("should return no_candidate when no candidates exist", async () => {
      const { determineUnmatchedDetail } = await import(
        "../reconciliation-pipeline"
      );
      const result = determineUnmatchedDetail([], false);
      expect(result.reason).toBe("no_candidate");
      expect(result.suggestedAction).toContain("No matching");
    });

    it("should return multiple_candidates when > 1 candidates", async () => {
      const { determineUnmatchedDetail } = await import(
        "../reconciliation-pipeline"
      );
      const result = determineUnmatchedDetail(
        [
          { journalEntryId: "je-1", amount: 1000, totalScore: 0.9 },
          { journalEntryId: "je-2", amount: 1000, totalScore: 0.7 },
        ],
        false,
      );
      expect(result.reason).toBe("multiple_candidates");
      expect(result.candidates).toHaveLength(2);
    });

    it("should return below_confidence when single candidate below threshold", async () => {
      const { determineUnmatchedDetail } = await import(
        "../reconciliation-pipeline"
      );
      const result = determineUnmatchedDetail(
        [{ journalEntryId: "je-1", amount: 1000, totalScore: 0.4 }],
        false,
      );
      expect(result.reason).toBe("below_confidence");
      expect(result.candidates).toHaveLength(1);
      expect(result.candidates![0].id).toBe("je-1");
    });

    it("should return amount_mismatch as default catch-all", async () => {
      const { determineUnmatchedDetail } = await import(
        "../reconciliation-pipeline"
      );
      const result = determineUnmatchedDetail(
        [{ journalEntryId: "je-1", amount: 1000, totalScore: 0.7 }],
        false,
      );
      expect(result.reason).toBe("amount_mismatch");
    });
  });

  // ── getReconciliationConfidenceThreshold ──────────────────────────────────

  describe("getReconciliationConfidenceThreshold", () => {
    it("should return default threshold when no DB entry found", async () => {
      db.query.confidenceThresholds.findFirst.mockResolvedValue(null);

      const { getReconciliationConfidenceThreshold } = await import(
        "../reconciliation-pipeline"
      );
      const result = await getReconciliationConfidenceThreshold(
        "entity-1",
        500,
      );

      expect(result.threshold).toBe(0.85);
      expect(result.source).toBe("default");
    });

    it("should return DB threshold when found", async () => {
      db.query.confidenceThresholds.findFirst.mockResolvedValue({
        minConfidence: "0.75",
        agentId: "reconciliation-agent",
        transactionType: "reconciliation_match",
        amountBand: "100-1000",
      });

      const { getReconciliationConfidenceThreshold } = await import(
        "../reconciliation-pipeline"
      );
      const result = await getReconciliationConfidenceThreshold(
        "entity-1",
        500,
      );

      expect(result.threshold).toBe(0.75);
      expect(result.source).toBe("db");
    });

    it("should use correct amount band for small transactions", async () => {
      db.query.confidenceThresholds.findFirst.mockResolvedValue({
        minConfidence: "0.9",
        agentId: "reconciliation-agent",
        transactionType: "reconciliation_match",
        amountBand: "<100",
      });

      const { getReconciliationConfidenceThreshold } = await import(
        "../reconciliation-pipeline"
      );
      const result = await getReconciliationConfidenceThreshold("entity-1", 50);

      expect(result.threshold).toBe(0.9);
      expect(result.source).toBe("db");
    });
  });

  // ── reviewReconciliationSession ───────────────────────────────────────────

  describe("reviewReconciliationSession", () => {
    it("should approve and close session when no unmatched items", async () => {
      db.query.reconciliationSessions.findFirst.mockResolvedValue({
        id: "session-1",
        unmatchedCount: "0",
        status: "review_pending",
      });

      const { reviewReconciliationSession } = await import(
        "../reconciliation-pipeline"
      );
      const result = await reviewReconciliationSession(
        "session-1",
        "treasury-agent",
        true,
      );

      expect(result.success).toBe(true);
      expect(result.status).toBe("clean");
    });

    it("should reject close when unmatched items exist (hard rule)", async () => {
      db.query.reconciliationSessions.findFirst.mockResolvedValue({
        id: "session-1",
        unmatchedCount: "3",
        status: "review_pending",
      });

      const { reviewReconciliationSession } = await import(
        "../reconciliation-pipeline"
      );
      const result = await reviewReconciliationSession(
        "session-1",
        "treasury-agent",
        true,
      );

      expect(result.success).toBe(false);
      expect(result.status).toBe("review_pending");
    });

    it("should keep session in review_pending when rejected", async () => {
      db.query.reconciliationSessions.findFirst.mockResolvedValue({
        id: "session-1",
        unmatchedCount: "0",
        status: "review_pending",
      });

      const { reviewReconciliationSession } = await import(
        "../reconciliation-pipeline"
      );
      const result = await reviewReconciliationSession(
        "session-1",
        "treasury-agent",
        false,
      );

      expect(result.success).toBe(false);
      expect(result.status).toBe("review_pending");
    });

    it("should throw on non-existent session", async () => {
      db.query.reconciliationSessions.findFirst.mockResolvedValue(null);

      const { reviewReconciliationSession } = await import(
        "../reconciliation-pipeline"
      );
      await expect(
        reviewReconciliationSession("nonexistent", "treasury-agent", true),
      ).rejects.toThrow("not found");
    });
  });

  // ── retrieveLedgerCandidates ─────────────────────────────────────────────

  describe("retrieveLedgerCandidates", () => {
    it("should return empty array when no journal entries found", async () => {
      db.query.journalEntries.findMany.mockResolvedValue([]);

      const { retrieveLedgerCandidates } = await import(
        "../reconciliation-pipeline"
      );
      const result = await retrieveLedgerCandidates(
        "entity-1",
        "2026-07-15",
        1000,
        false,
      );

      expect(result).toHaveLength(0);
    });

    it("should widen date window for mobile money accounts", async () => {
      db.query.journalEntries.findMany.mockResolvedValue([
        {
          id: "je-1",
          entityId: "entity-1",
          status: "posted",
          date: "2026-07-12",
          description: "Test entry",
          reference: null,
        },
      ]);
      db.query.journalEntryLines.findMany.mockResolvedValue([
        {
          id: "jel-1",
          journalEntryId: "je-1",
          accountId: "acct-1",
          debit: "1000",
          credit: "0",
        },
      ]);

      const { retrieveLedgerCandidates } = await import(
        "../reconciliation-pipeline"
      );
      const result = await retrieveLedgerCandidates(
        "entity-1",
        "2026-07-15",
        1000,
        true, // mobile money
      );

      // Should find candidate because ±5 day window covers July 12
      expect(result.length).toBeGreaterThan(0);
    });
  });

  // ── normalizeStatementLine ───────────────────────────────────────────────

  describe("normalizeStatementLine", () => {
    it("should insert a new statement line", async () => {
      const { normalizeStatementLine } = await import(
        "../reconciliation-pipeline"
      );
      const result = await normalizeStatementLine({
        entityId: "entity-1",
        bankAccountId: "ba-1",
        provider: "bank",
        providerName: "Trust Bank",
        date: "2026-07-15",
        amount: "15000",
        currency: "GMD",
        description: "Customer payment",
        reference: "INV-001",
        source: "csv_import",
      });

      expect(result.lineId).toBeDefined();
    });
  });

  // ── runReconciliationPipeline (End-to-End Scenarios) ─────────────────────

  describe("runReconciliationPipeline (end-to-end)", () => {
    it("should return empty result when no accounts exist", async () => {
      db.query.bankAccounts.findMany.mockResolvedValue([]);

      const { runReconciliationPipeline } = await import(
        "../reconciliation-pipeline"
      );
      const result = await runReconciliationPipeline("entity-1");

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(0);
      expect(result.sessionClosed).toBe(true);
    });

    it("should run for all active accounts by default", async () => {
      const { runReconciliationPipeline } = await import(
        "../reconciliation-pipeline"
      );
      const result = await runReconciliationPipeline("entity-1");

      expect(result.results).toHaveLength(2); // ba-1, ba-2
      expect(result.totalTransactions).toBe(2); // tx-1, tx-2 for ba-1 only
    });

    it("should filter to specific accounts when requested", async () => {
      const { runReconciliationPipeline } = await import(
        "../reconciliation-pipeline"
      );
      const result = await runReconciliationPipeline("entity-1", ["ba-1"]);

      expect(result.results).toHaveLength(1);
      expect(result.results[0].accountId).toBe("ba-1");
    });

    it("should handle mobile money account detection", async () => {
      // Link ba-2 to mobile money
      db.query.mobileMoneyAccounts.findMany.mockResolvedValue([
        {
          id: "mm-1",
          entityId: "entity-1",
          bankAccountId: "ba-2",
          provider: "Wave",
          isActive: true,
        },
      ]);

      const { runReconciliationPipeline } = await import(
        "../reconciliation-pipeline"
      );
      const result = await runReconciliationPipeline("entity-1");

      expect(result.success).toBe(true);
      expect(result.totalTransactions).toBe(2);
    });

    it("should return pipeline metadata", async () => {
      const { runReconciliationPipeline } = await import(
        "../reconciliation-pipeline"
      );
      const result = await runReconciliationPipeline("entity-1");

      expect(result.auditEntries).toBeDefined();
      expect(result.durationMs).toBeGreaterThan(0);
      expect(result.overallMatchRate).toBeDefined();
    });

    it("should handle pipeline errors gracefully", async () => {
      db.query.bankAccounts.findMany.mockRejectedValue(
        new Error("Database timeout"),
      );

      const { runReconciliationPipeline } = await import(
        "../reconciliation-pipeline"
      );
      const result = await runReconciliationPipeline("entity-1");

      expect(result.success).toBe(false);
      expect(result.auditEntries.length).toBeGreaterThan(0);
    });
  });

  // ── getReconciliationStatus ───────────────────────────────────────────────

  describe("getReconciliationStatus", () => {
    it("should return per-account status", async () => {
      const { getReconciliationStatus } = await import(
        "../reconciliation-pipeline"
      );
      const result = await getReconciliationStatus("entity-1");

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
      expect(result[0].accountId).toBeDefined();
      expect(result[0].accountName).toBeDefined();
      expect(result[0].unreconciledCount).toBeDefined();
    });

    it("should include last reconciliation data", async () => {
      db.query.reconciliations.findFirst.mockResolvedValue({
        id: "recon-1",
        entityId: "entity-1",
        bankAccountId: "ba-1",
        statementDate: "2026-06-30",
        status: "closed",
        createdAt: new Date(),
      });

      const { getReconciliationStatus } = await import(
        "../reconciliation-pipeline"
      );
      const result = await getReconciliationStatus("entity-1");

      const ba1Status = result.find((r) => r.accountId === "ba-1");
      expect(ba1Status?.lastReconciledDate).toBe("2026-06-30");
      expect(ba1Status?.lastReconciliationStatus).toBe("closed");
    });
  });

  // ── Hard Rule: No Close With Unresolved Items ─────────────────────────────

  describe("Hard Rule: No Close With Unresolved Items", () => {
    it("should enforce hard rule - unmatched items prevent close", async () => {
      // No matching journal entries → unmatched items
      db.query.journalEntries.findMany.mockResolvedValue([]);
      db.query.journalEntryLines.findMany.mockResolvedValue([]);

      const { runReconciliationPipeline } = await import(
        "../reconciliation-pipeline"
      );
      const result = await runReconciliationPipeline("entity-1");

      // ba-1 has 2 unmatched transactions → hard rule prevents close
      const ba1Result = result.results.find((r) => r.accountId === "ba-1");
      expect(ba1Result?.status).toBe("review_pending");
      expect(ba1Result?.unmatchedCount).toBe(2);
      expect(result.sessionClosed).toBe(false);
    });

    it("should show escalation reason for hard rule violation", async () => {
      db.query.journalEntries.findMany.mockResolvedValue([]);
      db.query.journalEntryLines.findMany.mockResolvedValue([]);

      const { runReconciliationPipeline } = await import(
        "../reconciliation-pipeline"
      );
      const result = await runReconciliationPipeline("entity-1");

      const ba1Result = result.results.find((r) => r.accountId === "ba-1");
      expect(ba1Result?.escalationReason).toContain("Hard rule");
    });

    it("should produce unmatched details with specific reasons", async () => {
      db.query.journalEntries.findMany.mockResolvedValue([]);
      db.query.journalEntryLines.findMany.mockResolvedValue([]);

      const { runReconciliationPipeline } = await import(
        "../reconciliation-pipeline"
      );
      const result = await runReconciliationPipeline("entity-1");

      const ba1Result = result.results.find((r) => r.accountId === "ba-1");
      expect(ba1Result?.unmatchedDetails.length).toBeGreaterThan(0);
      expect(ba1Result?.unmatchedDetails[0].reason).toBeDefined();
      expect(ba1Result?.unmatchedDetails[0].suggestedAction).toBeDefined();
    });
  });

  // ── Multi-Account Aggregation ─────────────────────────────────────────────

  describe("Multi-Account Aggregation", () => {
    it("should aggregate results across all accounts", async () => {
      const { runReconciliationPipeline } = await import(
        "../reconciliation-pipeline"
      );
      const result = await runReconciliationPipeline("entity-1");

      expect(result.results.length).toBeGreaterThan(0);
      expect(result.totalMatched).toBeGreaterThanOrEqual(0);
      expect(result.totalUnmatched).toBeGreaterThanOrEqual(0);
      expect(result.closedAccounts + result.reviewPendingAccounts).toBe(
        result.results.length,
      );
    });
  });
});

// ─── Pipeline 4: Autonomous Cash & Imprest Pipeline ───────────────────────────

describe("Pipeline 4: Autonomous Cash & Imprest Pipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearIdempotencyCache();

    // Cash accounts
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

    // Imprest floats
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

    // Imprest receipts
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

    // Petty cash ledger
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

    // New tables: cashLocations, cashTransactions, discrepancyFlags
    db.query.cashLocations = {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
    };
    db.query.cashTransactions = {
      findMany: vi.fn().mockResolvedValue([]),
    };
    db.query.discrepancyFlags = {
      findMany: vi.fn().mockResolvedValue([]),
    };

    // Default insert returns mock ID
    db.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: "mock-id" }]),
        onConflictDoNothing: vi.fn(),
      }),
    });

    // Default update chaining
    db.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    });

    // Default transaction
    db.transaction.mockImplementation(async (cb: any) => {
      await cb(createMockTx());
    });
  });

  // ── Core Pipeline ────────────────────────────────────────────────────────

  describe("runCashPipeline", () => {
    it("should calculate cash positions correctly", async () => {
      const { runCashPipeline } = await import("../cash-pipeline");
      const result = await runCashPipeline("entity-1");

      expect(result.success).toBe(true);
      expect(result.accounts).toHaveLength(2);
      expect(result.totalBalance).toBeGreaterThan(0);
      expect(result.activeImprestFloats).toBeGreaterThan(0);
    });

    it("should produce daily report output", async () => {
      const { runCashPipeline } = await import("../cash-pipeline");
      const result = await runCashPipeline("entity-1");

      expect(result.dailyReport).toBeDefined();
      expect(result.dailyReport.date).toBeDefined();
      expect(result.dailyReport.overallHealthScore).toBeGreaterThanOrEqual(0);
    });

    it("should return till information", async () => {
      const { runCashPipeline } = await import("../cash-pipeline");
      const result = await runCashPipeline("entity-1");

      expect(Array.isArray(result.tills)).toBe(true);
    });

    it("should calculate health score correctly", async () => {
      const { runCashPipeline } = await import("../cash-pipeline");
      const result = await runCashPipeline("entity-1");

      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(1);
      expect(result.healthStatus).toBeDefined();
    });

    it("should include audit trail entries", async () => {
      const { runCashPipeline } = await import("../cash-pipeline");
      const result = await runCashPipeline("entity-1");

      expect(result.auditEntries.length).toBeGreaterThan(0);
      expect(result.durationMs).toBeGreaterThan(0);
    });

    it("should handle errors gracefully", async () => {
      db.query.cashAccounts.findMany.mockRejectedValue(
        new Error("Database timeout"),
      );

      const { runCashPipeline } = await import("../cash-pipeline");
      const result = await runCashPipeline("entity-1");

      expect(result.success).toBe(false);
      expect(result.healthStatus).toBe("critical");
      expect(result.auditEntries.length).toBeGreaterThan(0);
    });
  });

  // ── Cash Transaction Recording ───────────────────────────────────────────

  describe("recordCashTransaction", () => {
    it("should throw on non-existent location", async () => {
      const { recordCashTransaction } = await import("../cash-pipeline");
      await expect(
        recordCashTransaction({
          entityId: "entity-1",
          locationId: "nonexistent",
          type: "in",
          amount: "1000",
          description: "Cash deposit",
        }),
      ).rejects.toThrow("not found");
    });
  });

  // ── Imprest Retirement ──────────────────────────────────────────────────

  describe("processImprestRetirement", () => {
    it("should throw on non-existent float", async () => {
      db.query.imprestFloats.findFirst.mockResolvedValue(null);

      const { processImprestRetirement } = await import("../cash-pipeline");
      await expect(
        processImprestRetirement("nonexistent", "entity-1"),
      ).rejects.toThrow("not found");
    });

    it("should throw on non-active float", async () => {
      db.query.imprestFloats.findFirst.mockResolvedValue({
        id: "float-1",
        entityId: "entity-1",
        assigneeName: "John",
        amount: "5000",
        status: "settled",
      });

      const { processImprestRetirement } = await import("../cash-pipeline");
      await expect(
        processImprestRetirement("float-1", "entity-1"),
      ).rejects.toThrow("not active");
    });

    it("should calculate retirement for active float", async () => {
      db.query.imprestFloats.findFirst.mockResolvedValue({
        id: "float-1",
        entityId: "entity-1",
        cashAccountId: "ca-1",
        assigneeName: "John Doe",
        amount: "10000",
        remainingBalance: "2000",
        status: "active",
        issuedDate: "2026-06-01",
        settleByDate: "2026-07-15",
      });
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

      const { processImprestRetirement } = await import("../cash-pipeline");
      const result = await processImprestRetirement("float-1", "entity-1");

      expect(result.floatId).toBe("float-1");
      expect(result.amountIssued).toBe(10000);
      expect(result.totalReceipted).toBe(8000);
      expect(result.balanceDue).toBe(2000); // 10000 - 8000
      expect(result.status).toBe("partial_retirement");
      expect(result.confidence).toBe(0.8);
    });

    it("should detect fully retired floats", async () => {
      db.query.imprestFloats.findFirst.mockResolvedValue({
        id: "float-2",
        entityId: "entity-1",
        cashAccountId: "ca-1",
        assigneeName: "Jane Smith",
        amount: "5000",
        remainingBalance: "0",
        status: "active",
        issuedDate: "2026-07-01",
        settleByDate: "2026-07-30",
      });
      db.query.imprestReceipts.findMany.mockResolvedValue([
        {
          id: "rec-3",
          imprestFloatId: "float-2",
          amount: "5000",
          description: "Full retirement",
          receiptDate: "2026-07-20",
        },
      ]);

      const { processImprestRetirement } = await import("../cash-pipeline");
      const result = await processImprestRetirement("float-2", "entity-1");

      expect(result.status).toBe("fully_retired");
      expect(Math.abs(result.balanceDue)).toBeLessThanOrEqual(0.01);
    });
  });

  // ── Discrepancy Flagging ────────────────────────────────────────────────

  describe("flagDiscrepancy", () => {
    it("should throw on non-existent location", async () => {
      db.query.cashLocations.findFirst.mockResolvedValue(null);

      const { flagDiscrepancy } = await import("../cash-pipeline");
      await expect(
        flagDiscrepancy({
          entityId: "entity-1",
          locationId: "nonexistent",
          counted: 45000,
        }),
      ).rejects.toThrow("not found");
    });
  });

  // ── Daily Reconciliation Report ─────────────────────────────────────────

  describe("getDailyReconReport", () => {
    it("should produce report even with no data", async () => {
      const { getDailyReconReport } = await import("../cash-pipeline");
      const result = await getDailyReconReport("entity-1");

      expect(result.date).toBeDefined();
      expect(result.tillCount).toBe(0);
      expect(result.overallHealthScore).toBeGreaterThanOrEqual(0);
    });
  });

  // ── Treasury Review ─────────────────────────────────────────────────────

  describe("reviewCashSession", () => {
    it("should reject when not approved", async () => {
      const { reviewCashSession } = await import("../cash-pipeline");
      const result = await reviewCashSession(
        "entity-1",
        "treasury-agent",
        false,
      );

      expect(result.success).toBe(false);
      expect(result.status).toBe("review_pending");
    });
  });

  // ── Verification Schedule ───────────────────────────────────────────────

  describe("getVerificationSchedule", () => {
    it("should return schedule even with no tills", async () => {
      const { getVerificationSchedule } = await import("../cash-pipeline");
      const result = await getVerificationSchedule("entity-1");

      expect(result.dueForVerification).toBeDefined();
      expect(result.overdueCount).toBe(0);
      expect(result.dueCount).toBe(0);
    });
  });

  // ── Discrepancy Detection ────────────────────────────────────────────────

  describe("Discrepancy Detection", () => {
    it("should detect discrepancies between ledger and accounts", async () => {
      const { runCashPipeline } = await import("../cash-pipeline");
      const result = await runCashPipeline("entity-1");

      expect(result.discrepancyCount).toBeGreaterThanOrEqual(0);
    });
  });
});

// ─── Pipeline 5: Autonomous Reporting Pipeline ────────────────────────────────

describe("Pipeline 5: Autonomous Reporting Pipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearIdempotencyCache();

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
      // Balancing entry: 150000 debit on a balance-sheet (asset) account so
      // debits = credits (350000 + 150000 = 500000) and the balance gate
      // passes WITHOUT distorting P&L (net profit stays 500000 - 350000).
      {
        journalEntryId: "je-rev-1",
        accountId: "asset-acct-1",
        debit: "150000",
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
      {
        id: "asset-acct-1",
        entityId: "entity-1",
        code: "1020",
        name: "Cash on Hand",
        type: "asset",
        subtype: "cash",
      },
    ]);

    db.select.mockImplementation(() => ({
      from: vi.fn(() => ({
        innerJoin: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve([{ count: "2" }])),
          orderBy: vi.fn(() => []),
        })),
        where: vi.fn(() => Promise.resolve([{ count: "2" }])),
        orderBy: vi.fn(() => []),
      })),
    }));

    // Default: snapshot insert returns an id
    db.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: "snap-1" }]),
        onConflictDoNothing: vi.fn(),
      }),
    });
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
    clearIdempotencyCache();

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
      db.query.onboardingSessions.findFirst.mockResolvedValue(null);

      const { createOnboardingSession } = await import(
        "../onboarding-pipeline"
      );
      const result = await createOnboardingSession("org-1");

      expect(result.sessionId).toBe("mock-id-1");
      expect(db.insert).toHaveBeenCalled();
    });

    it("should return existing session when one exists", async () => {
      db.query.onboardingSessions.findFirst.mockResolvedValue({
        id: "existing-session-id",
        orgId: "org-1",
        currentStep: "data_connections",
        status: "in_progress",
      });

      const { createOnboardingSession } = await import(
        "../onboarding-pipeline"
      );
      const result = await createOnboardingSession("org-1");

      expect(result.sessionId).toBe("existing-session-id");
      expect(db.insert).not.toHaveBeenCalled();
    });
  });

  describe("updateRoutingAnswer", () => {
    it("should update session with valid routing answer", async () => {
      db.query.onboardingSessions.findFirst = vi
        .fn()
        .mockResolvedValue({ id: "session-1", orgId: "org-1" });
      db.transaction.mockImplementation(async (cb: any) => {
        const tx = createMockTx();
        tx.query.coaTemplates.findFirst = vi.fn().mockResolvedValue(null);
        await cb(tx);
      });

      const { updateRoutingAnswer } = await import("../onboarding-pipeline");
      await expect(
        updateRoutingAnswer("session-1", "professional_software"),
      ).resolves.not.toThrow();
    });

    it("should accept all valid routing answers", async () => {
      db.query.onboardingSessions.findFirst = vi
        .fn()
        .mockResolvedValue({ id: "session-1", orgId: "org-1" });
      db.transaction.mockImplementation(async (cb: any) => {
        await cb(createMockTx());
      });

      const { updateRoutingAnswer } = await import("../onboarding-pipeline");
      const answers = [
        "brand_new",
        "professional_software",
        "manual_records",
        "statements_only",
        "no_records",
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
      expect(bankApi?.message).toMatch(/manual/i);

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
      const { updateDataConnectionStatus } = await import(
        "../onboarding-pipeline"
      );
      await expect(
        updateDataConnectionStatus("conn-1", "connected"),
      ).resolves.not.toThrow();
    });

    it("should update with failure reason and fallback", async () => {
      const { updateDataConnectionStatus } = await import(
        "../onboarding-pipeline"
      );
      await expect(
        updateDataConnectionStatus("conn-1", "failed", {
          failureReason: "API timeout",
          fallbackOffered: "csv",
        }),
      ).resolves.not.toThrow();
    });

    it("should track records processed", async () => {
      const { updateDataConnectionStatus } = await import(
        "../onboarding-pipeline"
      );
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
      const { requestHistoricalPullPermission } = await import(
        "../onboarding-pipeline"
      );
      await expect(
        requestHistoricalPullPermission("job-1"),
      ).resolves.not.toThrow();
    });
  });

  // ── Chart of Accounts ───────────────────────────────────────────────────

  describe("getSuggestedCoA", () => {
    it("should find exact segment+country match", async () => {
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
      db.query.coaTemplates.findFirst.mockResolvedValue(null);

      const { getSuggestedCoA } = await import("../onboarding-pipeline");
      const result = await getSuggestedCoA("unknown_segment", "XX");

      expect(result.templateId).toBeNull();
      expect(result.accounts).toHaveLength(0);
    });
  });

  describe("confirmCoA", () => {
    it("should throw when template not found", async () => {
      db.query.coaTemplates.findFirst.mockResolvedValue(null);

      const { confirmCoA } = await import("../onboarding-pipeline");
      await expect(confirmCoA("entity-1", "nonexistent")).rejects.toThrow();
    });

    it("should skip insertion when accounts already exist", async () => {
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
      db.query.onboardingSessions.findFirst.mockResolvedValue({
        id: "session-1",
        completedSteps: ["signup", "routing", "entity_setup"],
      });

      const { markDataConnectionsStepComplete } = await import(
        "../onboarding-pipeline"
      );
      await expect(
        markDataConnectionsStepComplete("session-1"),
      ).resolves.not.toThrow();
    });

    it("should handle missing session gracefully", async () => {
      db.query.onboardingSessions.findFirst.mockResolvedValue(null);

      const { markDataConnectionsStepComplete } = await import(
        "../onboarding-pipeline"
      );
      await expect(
        markDataConnectionsStepComplete("nonexistent"),
      ).resolves.not.toThrow();
    });
  });

  describe("markCoAComplete", () => {
    it("should advance to first_look step and include coa_review", async () => {
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
      db.query.onboardingSessions.findFirst.mockResolvedValue(null);

      const { completeOnboarding } = await import("../onboarding-pipeline");
      await expect(completeOnboarding("nonexistent")).rejects.toThrow(
        "Onboarding session not found",
      );
    });

    it("should finish onboarding and log time-to-first-value", async () => {
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
      db.query.onboardingSessions.findFirst.mockResolvedValue(null);

      const { getOnboardingStatus } = await import("../onboarding-pipeline");
      const result = await getOnboardingStatus("org-nonexistent");

      expect(result).toBeNull();
    });

    it("should return full status for an in-progress session", async () => {
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
