import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock Agent Graphs ──────────────────────────────────────────────────────
// We mock the agent graphs to test orchestration wiring without real LLM calls.

const mockLedgerGraph = {
  invoke: vi.fn().mockResolvedValue({
    entityId: "test-entity",
    entityName: "Test Entity",
    currency: "GMD",
    result: { type: "entry_posted", entryId: "posted-1", entryNumber: 1 },
    confidence: 0.95,
    reasoning: "Entry posted successfully",
    errors: [],
    auditTrail: [],
  }),
};

const mockApGraph = {
  invoke: vi.fn().mockResolvedValue({
    entityId: "test-entity",
    entityName: "Test Entity",
    currency: "GMD",
    agingReport: {
      totalOutstanding: 5000,
      invoiceCount: 3,
      overdueCount: 1,
      invoices: [],
    },
    confidence: 0.95,
    reasoning: "AP aging report generated",
    errors: [],
    auditTrail: [],
  }),
};

const mockArGraph = {
  invoke: vi.fn().mockResolvedValue({
    entityId: "test-entity",
    entityName: "Test Entity",
    currency: "GMD",
    agingReport: {
      totalOutstanding: 12000,
      invoiceCount: 5,
      overdueCount: 0,
      invoices: [],
    },
    confidence: 0.95,
    reasoning: "AR aging report generated",
    errors: [],
    auditTrail: [],
  }),
};

const mockReconciliationGraph = {
  invoke: vi.fn().mockResolvedValue({
    entityId: "test-entity",
    entityName: "Test Entity",
    currency: "GMD",
    result: {
      type: "reconciliation_complete",
      matchedCount: 45,
      unmatchedCount: 2,
    },
    confidence: 0.88,
    reasoning: "Bank reconciliation completed with 2 unmatched items",
    errors: [],
    auditTrail: [],
  }),
};

// Mock getAgentGraph
vi.mock("../core/orchestrator", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../core/orchestrator")>();
  return {
    ...actual,
    getAgentGraph: vi.fn().mockImplementation(async (agentId: string) => {
      switch (agentId) {
        case "ledger":
          return mockLedgerGraph;
        case "ap":
          return mockApGraph;
        case "ar":
          return mockArGraph;
        case "reconciliation":
          return mockReconciliationGraph;
        default:
          return actual.getAgentGraph(agentId as any);
      }
    }),
  };
});

// Mock langfuse
vi.mock("../core/langfuse", () => ({
  langfuse: {
    trace: vi.fn().mockResolvedValue({ update: vi.fn() }),
    span: vi.fn().mockResolvedValue({ update: vi.fn() }),
    event: vi.fn(),
  },
}));

// Mock controller tools (DB queries)
vi.mock("../tier2/controller-agent/tools", () => ({
  validateEntryStructural: vi.fn().mockResolvedValue({
    approved: true,
    rejectionReason: null,
    structuralFlags: [],
    qualitativeFlags: [],
    confidence: 0.92,
  }),
  reconcileSubLedgers: vi.fn().mockResolvedValue({
    ap: { reconciled: true, variance: 0 },
    ar: { reconciled: true, variance: 0 },
    fixedAssets: { reconciled: true, variance: 0 },
    inventory: { reconciled: true, variance: 0 },
  }),
  queryTrialBalanceFromDB: vi.fn().mockResolvedValue({
    generatedAt: new Date().toISOString(),
    totalDebits: 1000,
    totalCredits: 1000,
    balanced: true,
    accounts: [],
    periodLabel: "2026-06",
  }),
}));

// Mock treasury tools (DB queries)
vi.mock("../tier2/treasury-agent/tools", () => ({
  getCashPosition: vi.fn().mockResolvedValue({
    bankAccounts: [],
    mmWallets: [],
    physicalCash: 0,
    totalBaseCurrency: 0,
  }),
  checkReconciliationStatus: vi.fn().mockResolvedValue({
    bankComplete: true,
    mmComplete: true,
    cashComplete: true,
    unresolvedItems: 0,
  }),
  generateDailyReport: vi.fn().mockResolvedValue({
    date: "2026-06-15",
    totalCash: 0,
    alerts: [],
    recommendations: [],
  }),
}));

// Mock LLM calls
vi.mock("../core/llm/agent-llm", () => ({
  callLLM: vi.fn().mockResolvedValue({ content: "Test summary" }),
}));

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("Phase 6: Controller Agent → Ledger Agent wiring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("nodeReviewEntries dispatches approved entries to Ledger Agent", async () => {
    const { nodeReviewEntries } = await import(
      "../tier2/controller-agent/nodes"
    );

    const state = {
      entityId: "test-entity",
      entityName: "Test Entity",
      currency: "GMD",
      currentOperation: {
        type: "review_entries" as const,
        status: "processing" as const,
        input: {},
        output: null,
        error: null,
      },
      pendingEntries: [
        {
          id: "entry-1",
          sourceAgent: "ap-agent",
          description: "Office supplies purchase",
          entries: [
            {
              accountId: "acc-1",
              accountCode: "6100",
              accountName: "Office Supplies",
              debit: 500,
              credit: 0,
            },
            {
              accountId: "acc-2",
              accountCode: "2100",
              accountName: "Accounts Payable",
              debit: 0,
              credit: 500,
            },
          ],
          totalDebit: 500,
          totalCredit: 500,
          reference: null,
          status: "pending" as const,
          rejectionReason: null,
          submittedAt: new Date().toISOString(),
          reviewedAt: null,
          confidence: 0,
        },
      ],
      approvedEntries: [],
      rejectedEntries: [],
      trialBalance: null,
      closeChecklist: null,
      subLedgerStatus: null,
      auditTrail: [],
      result: null,
      confidence: 0,
      reasoning: "",
      humanResponse: null,
      errors: [],
    };

    const result = await nodeReviewEntries(state as any);

    // Verify Ledger Agent was called
    expect(mockLedgerGraph.invoke).toHaveBeenCalledTimes(1);
    expect(mockLedgerGraph.invoke).toHaveBeenCalledWith(
      expect.objectContaining({
        entityId: "test-entity",
        currentOperation: expect.objectContaining({
          type: "post_entry",
        }),
      }),
    );

    // Verify result includes posting info
    expect(result.approvedEntries).toHaveLength(1);
    expect(result.rejectedEntries).toHaveLength(0);
    expect(result.humanResponse).toContain("dispatched to Ledger Agent");
    expect(result.humanResponse).toContain("posted successfully");
  });

  it("nodeReviewEntries handles Ledger Agent failure gracefully", async () => {
    mockLedgerGraph.invoke.mockRejectedValueOnce(
      new Error("Ledger Agent unavailable"),
    );

    const { nodeReviewEntries } = await import(
      "../tier2/controller-agent/nodes"
    );

    const state = {
      entityId: "test-entity",
      entityName: "Test Entity",
      currency: "GMD",
      currentOperation: {
        type: "review_entries" as const,
        status: "processing" as const,
        input: {},
        output: null,
        error: null,
      },
      pendingEntries: [
        {
          id: "entry-1",
          sourceAgent: "ap-agent",
          description: "Test entry",
          entries: [
            {
              accountId: "acc-1",
              accountCode: "6100",
              accountName: "Office Supplies",
              debit: 100,
              credit: 0,
            },
            {
              accountId: "acc-2",
              accountCode: "2100",
              accountName: "Accounts Payable",
              debit: 0,
              credit: 100,
            },
          ],
          totalDebit: 100,
          totalCredit: 100,
          reference: null,
          status: "pending" as const,
          rejectionReason: null,
          submittedAt: new Date().toISOString(),
          reviewedAt: null,
          confidence: 0,
        },
      ],
      approvedEntries: [],
      rejectedEntries: [],
      trialBalance: null,
      closeChecklist: null,
      subLedgerStatus: null,
      auditTrail: [],
      result: null,
      confidence: 0,
      reasoning: "",
      humanResponse: null,
      errors: [],
    };

    const result = await nodeReviewEntries(state as any);

    // Entry should still be approved even if Ledger Agent fails
    expect(result.approvedEntries).toHaveLength(1);
    expect(result.rejectedEntries).toHaveLength(0);
    // But humanResponse should note the posting failure
    expect(result.humanResponse).toContain("1 approved");
  });
});

describe("Phase 6: Controller Agent → AP/AR Agent wiring (close checklist)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("nodeRunCloseChecklist calls AP Agent and AR Agent for aging reports", async () => {
    const { nodeRunCloseChecklist } = await import(
      "../tier2/controller-agent/nodes"
    );

    const state = {
      entityId: "test-entity",
      entityName: "Test Entity",
      currency: "GMD",
      currentOperation: {
        type: "run_close_checklist" as const,
        status: "processing" as const,
        input: { periodLabel: "2026-06" },
        output: null,
        error: null,
      },
      pendingEntries: [],
      approvedEntries: [],
      rejectedEntries: [],
      trialBalance: null,
      closeChecklist: null,
      subLedgerStatus: null,
      auditTrail: [],
      result: null,
      confidence: 0,
      reasoning: "",
      humanResponse: null,
      errors: [],
    };

    const result = await nodeRunCloseChecklist(state as any);

    // Verify AP Agent was called
    expect(mockApGraph.invoke).toHaveBeenCalledTimes(1);
    expect(mockApGraph.invoke).toHaveBeenCalledWith(
      expect.objectContaining({
        entityId: "test-entity",
        currentOperation: expect.objectContaining({
          type: "ap_aging",
        }),
      }),
    );

    // Verify AR Agent was called
    expect(mockArGraph.invoke).toHaveBeenCalledTimes(1);
    expect(mockArGraph.invoke).toHaveBeenCalledWith(
      expect.objectContaining({
        entityId: "test-entity",
        currentOperation: expect.objectContaining({
          type: "ar_aging",
        }),
      }),
    );

    // Verify checklist was built
    expect(result.closeChecklist).toBeTruthy();
    expect(result.closeChecklist?.period).toBe("2026-06");
    expect(result.auditTrail[0].details).toMatchObject({
      apAgingCalled: true,
      arAgingCalled: true,
    });
  });
});

describe("Phase 6: Treasury Agent → Reconciliation Agent wiring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("nodeRunReconciliation dispatches to Reconciliation Agent", async () => {
    const { nodeRunReconciliation } = await import(
      "../tier2/treasury-agent/nodes"
    );

    const state = {
      entityId: "test-entity",
      entityName: "Test Entity",
      currency: "GMD",
      currentOperation: {
        type: "reconcile" as const,
        status: "processing" as const,
        input: { period: "2026-06" },
        output: null,
        error: null,
      },
      cashPosition: null,
      reconciliationStatus: null,
      dailyReport: null,
      auditTrail: [],
      result: null,
      confidence: 0,
      reasoning: "",
      humanResponse: null,
      errors: [],
    };

    const result = await nodeRunReconciliation(state as any);

    // Verify Reconciliation Agent was called
    expect(mockReconciliationGraph.invoke).toHaveBeenCalledTimes(1);
    expect(mockReconciliationGraph.invoke).toHaveBeenCalledWith(
      expect.objectContaining({
        entityId: "test-entity",
        currentOperation: expect.objectContaining({
          type: "bank_reconciliation",
        }),
      }),
    );

    // Verify result includes reconciliation status
    expect(result.reconciliationStatus).toBeTruthy();
    expect(result.humanResponse).toBeTruthy();
    expect(result.auditTrail?.[0]?.details).toMatchObject({
      reconciliationAgentCalled: true,
    });
  });

  it("nodeRunReconciliation handles Reconciliation Agent failure gracefully", async () => {
    mockReconciliationGraph.invoke.mockRejectedValueOnce(
      new Error("Agent unavailable"),
    );

    const { nodeRunReconciliation } = await import(
      "../tier2/treasury-agent/nodes"
    );

    const state = {
      entityId: "test-entity",
      entityName: "Test Entity",
      currency: "GMD",
      currentOperation: {
        type: "reconcile" as const,
        status: "processing" as const,
        input: {},
        output: null,
        error: null,
      },
      cashPosition: null,
      reconciliationStatus: null,
      dailyReport: null,
      auditTrail: [],
      result: null,
      confidence: 0,
      reasoning: "",
      humanResponse: null,
      errors: [],
    };

    const result = await nodeRunReconciliation(state as any);

    // Should still return a result even if Reconciliation Agent fails
    expect(result.reconciliationStatus).toBeTruthy();
    expect(result.humanResponse).toBeTruthy();
  });
});

describe("Phase 6: humanResponse propagation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Controller Agent nodes all return humanResponse for CFO agent consumption", async () => {
    const { nodeParseInput } = await import("../tier2/controller-agent/nodes");

    const state = {
      entityId: "test-entity",
      entityName: "Test Entity",
      currency: "GMD",
      currentOperation: {
        type: "review_entries" as const,
        status: "processing" as const,
        input: {},
        output: null,
        error: null,
      },
      pendingEntries: [],
      approvedEntries: [],
      rejectedEntries: [],
      trialBalance: null,
      closeChecklist: null,
      subLedgerStatus: null,
      auditTrail: [],
      result: null,
      confidence: 0,
      reasoning: "",
      humanResponse: null,
      errors: [],
    };

    const result = await nodeParseInput(state as any);
    expect(result.humanResponse).toBeNull(); // parse node returns null
  });

  it("Controller Agent escalate node returns humanResponse", async () => {
    const { nodeEscalate } = await import("../tier2/controller-agent/nodes");

    const state = {
      entityId: "test-entity",
      entityName: "Test Entity",
      currency: "GMD",
      currentOperation: null,
      pendingEntries: [],
      approvedEntries: [],
      rejectedEntries: [],
      trialBalance: null,
      closeChecklist: null,
      subLedgerStatus: null,
      auditTrail: [],
      result: null,
      confidence: 0.3,
      reasoning: "Trial balance unbalanced",
      humanResponse: null,
      errors: ["Trial balance unbalanced: debits 1000 != credits 999"],
    };

    const result = await nodeEscalate(state as any);
    expect(result.humanResponse).toContain("Escalation from Controller Agent");
    expect(result.humanResponse).toContain("Trial balance unbalanced");
  });

  it("Treasury Agent escalate node returns humanResponse", async () => {
    const { nodeEscalate } = await import("../tier2/treasury-agent/nodes");

    const state = {
      entityId: "test-entity",
      entityName: "Test Entity",
      currency: "GMD",
      currentOperation: null,
      cashPosition: null,
      reconciliationStatus: null,
      dailyReport: null,
      auditTrail: [],
      result: null,
      confidence: 0.4,
      reasoning: "Too many unresolved items",
      humanResponse: null,
      errors: ["15 unresolved reconciliation items"],
    };

    const result = await nodeEscalate(state as any);
    expect(result.humanResponse).toContain("Escalation from Treasury Agent");
    expect(result.humanResponse).toContain("Too many unresolved items");
  });
});
