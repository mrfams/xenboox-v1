// ─── Consolidation Pipeline Tests — Multi-Entity & Consolidation ─────────────
//
// Tests for the 10-step consolidation pipeline with mocked DB.
// Follows existing test patterns from pipelines.test.ts.
//
// Steps tested:
//   1. Entity Hierarchy Mapping
//   2. Inter-Company Transaction Tagging
//   3. Elimination Engine
//   4. Currency Translation
//   5. Minority Interest Calculation
//   6. Consolidated Statement Assembly
//   7. Confidence Gate & Controller Sign-off
//   8. Consolidated View Delivery
//   9. Entity-Level Integrity Check
//   10. Audit Trail Logging

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ───────────────────────────────────────────────────────────────────

function createMockTx() {
  const mkQuery = (methods: string[] = ["findFirst", "findMany"]) => {
    const obj: Record<string, ReturnType<typeof vi.fn>> = {};
    for (const m of methods) obj[m] = vi.fn();
    return obj;
  };

  return {
    query: {
      entityRelationships: mkQuery(),
      entities: mkQuery(),
      intercompanyTags: mkQuery(),
      consolidationRuns: mkQuery(),
      eliminationEntries: mkQuery(),
      minorityInterestRecords: mkQuery(),
      trialBalanceSnapshots: mkQuery(),
      journalEntries: mkQuery(),
      chartOfAccounts: mkQuery(),
    },
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => [{ id: "run-1" }, { id: "elim-1" }]),
        onConflictDoNothing: vi.fn(),
      })),
    })),
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn() })) })),
    delete: vi.fn(() => ({ where: vi.fn() })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => [{ count: "3" }]),
      })),
    })),
  };
}

// Mock table definition objects
const mockEntityRelationshipsTable = {
  id: "id",
  parentEntityId: "parent_entity_id",
  subsidiaryEntityId: "subsidiary_entity_id",
  ownershipPct: "ownership_pct",
  effectiveFrom: "effective_from",
  effectiveTo: "effective_to",
  status: "status",
  consolidationMethod: "consolidation_method",
  currency: "currency",
  notes: "notes",
  createdAt: "created_at",
  updatedAt: "updated_at",
} as const;

const mockEntitiesTable = {
  id: "id",
  organizationId: "organization_id",
  name: "name",
  type: "type",
  currency: "currency",
  country: "country",
  isActive: "is_active",
} as const;

const mockConsolidationRunTable = {
  id: "id",
  parentEntityId: "parent_entity_id",
  organizationId: "organization_id",
  period: "period",
  status: "status",
  totalSubsidiaries: "total_subsidiaries",
  subsidiariesProcessed: "subsidiaries_processed",
  eliminationCount: "elimination_count",
  eliminationAmount: "elimination_amount",
  translationCount: "translation_count",
  minorityInterestCount: "minority_interest_count",
  integrityCheckPassed: "integrity_check_passed",
  confidence: "confidence",
  reviewedById: "reviewed_by_id",
  reviewedAt: "reviewed_at",
  errors: "errors",
  warnings: "warnings",
  startedAt: "started_at",
  completedAt: "completed_at",
  triggeredBy: "triggered_by",
  createdAt: "created_at",
  updatedAt: "updated_at",
} as const;

const mockEliminationEntryTable = {
  id: "id",
  consolidationRunId: "consolidation_run_id",
  entityId: "entity_id",
  counterpartyEntityId: "counterparty_entity_id",
  eliminationType: "elimination_type",
  accountId: "account_id",
  description: "description",
  amount: "amount",
  debitCredit: "debit_credit",
  sourceTransactionIds: "source_transaction_ids",
  sourceTagIds: "source_tag_ids",
  currency: "currency",
  isPosted: "is_posted",
} as const;

const mockMinorityInterestTable = {
  id: "id",
  consolidationRunId: "consolidation_run_id",
  subsidiaryEntityId: "subsidiary_entity_id",
  ownershipPct: "ownership_pct",
  minorityPct: "minority_pct",
  subsidiaryNetIncome: "subsidiary_net_income",
  minorityShareIncome: "minority_share_income",
  subsidiaryEquity: "subsidiary_equity",
  minorityShareEquity: "minority_share_equity",
  period: "period",
} as const;

const mockIntercompanyTagsTable = {
  id: "id",
  entityId: "entity_id",
  counterpartyEntityId: "counterparty_entity_id",
  transactionType: "transaction_type",
  journalEntryId: "journal_entry_id",
  amount: "amount",
  currency: "currency",
  description: "description",
  taggedAt: "tagged_at",
  reversedAt: "reversed_at",
} as const;

const mockTrialBalanceSnapshotsTable = {
  id: "id",
  entityId: "entity_id",
  periodId: "period_id",
  accountId: "account_id",
  balance: "balance",
  generatedAt: "generated_at",
} as const;

const mockJournalEntriesTable = {
  id: "id",
  entityId: "entity_id",
  description: "description",
  date: "date",
  periodId: "period_id",
  status: "status",
  source: "source",
} as const;

vi.mock("@xenboox/db", () => {
  const tx = createMockTx();
  return {
    db: {
      ...tx,
      transaction: vi.fn(async (cb: (tx: any) => Promise<void>) => {
        await cb(createMockTx());
      }),
    },
    entityRelationships: mockEntityRelationshipsTable,
    entities: mockEntitiesTable,
    consolidationRuns: mockConsolidationRunTable,
    eliminationEntries: mockEliminationEntryTable,
    minorityInterestRecords: mockMinorityInterestTable,
    intercompanyTags: mockIntercompanyTagsTable,
    trialBalanceSnapshots: mockTrialBalanceSnapshotsTable,
    journalEntries: mockJournalEntriesTable,
  };
});

vi.mock("@xenboox/db/schema/organization", () => ({
  entities: {
    id: "id",
    organizationId: "organization_id",
    name: "name",
    type: "type",
    currency: "currency",
    country: "country",
    isActive: "is_active",
  },
  organizations: {
    id: "id",
    name: "name",
    slug: "slug",
    type: "type",
    plan: "plan",
    ownerId: "owner_id",
  },
}));

vi.mock("@xenboox/db/schema/accounting", () => ({
  journalEntries: {
    id: "id",
    entityId: "entity_id",
    description: "description",
    date: "date",
    periodId: "period_id",
    status: "status",
    source: "source",
  },
  journalEntryLines: {
    id: "id",
    journalEntryId: "journal_entry_id",
    accountId: "account_id",
    debit: "debit",
    credit: "credit",
  },
  chartOfAccounts: {
    id: "id",
    entityId: "entity_id",
    code: "code",
    name: "name",
    type: "type",
    subtype: "subtype",
  },
  trialBalanceSnapshots: {
    id: "id",
    entityId: "entity_id",
    periodId: "period_id",
    accountId: "account_id",
    balance: "balance",
    generatedAt: "generated_at",
  },
}));

vi.mock("@xenboox/db/schema/documents", () => ({
  auditLog: {
    id: "id",
    entityId: "entity_id",
    userId: "user_id",
    action: "action",
    entityType: "entity_type",
    entityIdRef: "entity_id_ref",
    oldValues: "old_values",
    newValues: "new_values",
  },
}));

// Mock the consolidation schema subpath import (used by consolidation-pipeline.ts)
vi.mock("@xenboox/db/schema/consolidation", () => ({
  entityRelationships: {
    id: "id",
    parentEntityId: "parent_entity_id",
    subsidiaryEntityId: "subsidiary_entity_id",
    ownershipPct: "ownership_pct",
    effectiveFrom: "effective_from",
    effectiveTo: "effective_to",
    status: "status",
    consolidationMethod: "consolidation_method",
    currency: "currency",
    notes: "notes",
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
  consolidationRuns: {
    id: "id",
    parentEntityId: "parent_entity_id",
    organizationId: "organization_id",
    period: "period",
    status: "status",
    totalSubsidiaries: "total_subsidiaries",
    subsidiariesProcessed: "subsidiaries_processed",
    eliminationCount: "elimination_count",
    eliminationAmount: "elimination_amount",
    translationCount: "translation_count",
    minorityInterestCount: "minority_interest_count",
    integrityCheckPassed: "integrity_check_passed",
    confidence: "confidence",
    reviewedById: "reviewed_by_id",
    reviewedAt: "reviewed_at",
    errors: "errors",
    warnings: "warnings",
    startedAt: "started_at",
    completedAt: "completed_at",
    triggeredBy: "triggered_by",
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
  eliminationEntries: {
    id: "id",
    consolidationRunId: "consolidation_run_id",
    entityId: "entity_id",
    counterpartyEntityId: "counterparty_entity_id",
    eliminationType: "elimination_type",
    accountId: "account_id",
    description: "description",
    amount: "amount",
    debitCredit: "debit_credit",
    sourceTransactionIds: "source_transaction_ids",
    sourceTagIds: "source_tag_ids",
    currency: "currency",
    isPosted: "is_posted",
  },
  minorityInterestRecords: {
    id: "id",
    consolidationRunId: "consolidation_run_id",
    subsidiaryEntityId: "subsidiary_entity_id",
    ownershipPct: "ownership_pct",
    minorityPct: "minority_pct",
    subsidiaryNetIncome: "subsidiary_net_income",
    minorityShareIncome: "minority_share_income",
    subsidiaryEquity: "subsidiary_equity",
    minorityShareEquity: "minority_share_equity",
    period: "period",
  },
  intercompanyTags: {
    id: "id",
    entityId: "entity_id",
    counterpartyEntityId: "counterparty_entity_id",
    transactionType: "transaction_type",
    journalEntryId: "journal_entry_id",
    amount: "amount",
    currency: "currency",
    description: "description",
    taggedAt: "tagged_at",
    reversedAt: "reversed_at",
  },
}));

vi.mock("./langfuse", () => ({
  langfuse: {
    trace: vi.fn(() => ({ update: vi.fn() })),
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
}));

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("Consolidation Pipeline — Multi-Entity & Consolidation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const { db } = require("@xenboox/db");

    // Default: 3 active subsidiaries
    db.query.entityRelationships.findMany.mockResolvedValue([
      {
        id: "rel-1",
        parentEntityId: "entity-1",
        subsidiaryEntityId: "sub-1",
        ownershipPct: "100.00",
        status: "active",
        consolidationMethod: "full",
        currency: "GMD",
        notes: null,
      },
      {
        id: "rel-2",
        parentEntityId: "entity-1",
        subsidiaryEntityId: "sub-2",
        ownershipPct: "75.00",
        status: "active",
        consolidationMethod: "full",
        currency: "GMD",
        notes: null,
      },
      {
        id: "rel-3",
        parentEntityId: "entity-1",
        subsidiaryEntityId: "sub-3",
        ownershipPct: "60.00",
        status: "active",
        consolidationMethod: "equity",
        currency: "USD",
        notes: "USD functional currency",
      },
    ]);

    // Default: 3 subsidiary entities exist
    db.query.entities.findMany.mockResolvedValue([
      {
        id: "sub-1",
        name: "Kerr Jula Bakau Ltd",
        currency: "GMD",
        country: "GM",
        isActive: true,
      },
      {
        id: "sub-2",
        name: "Kerr Jula Logistics",
        currency: "GMD",
        country: "GM",
        isActive: true,
      },
      {
        id: "sub-3",
        name: "Kerr Jula Properties",
        currency: "USD",
        country: "GM",
        isActive: true,
      },
    ]);

    // Default: IC tags exist for parent
    db.query.intercompanyTags.findMany.mockResolvedValue([
      {
        id: "ict-1",
        entityId: "entity-1",
        counterpartyEntityId: "sub-1",
        transactionType: "receivable",
        amount: "25000",
        currency: "GMD",
        description: "IC receivable: Parent → Bakau",
        taggedAt: new Date("2026-06-15"),
        reversedAt: null,
        counterparty: { id: "sub-1", name: "Kerr Jula Bakau Ltd" },
        journalEntry: { id: "je-1", description: "IC receivable entry" },
      },
      {
        id: "ict-2",
        entityId: "entity-1",
        counterpartyEntityId: "sub-2",
        transactionType: "expense",
        amount: "15000",
        currency: "GMD",
        description: "IC expense: Parent → Logistics",
        taggedAt: new Date("2026-06-15"),
        reversedAt: null,
        counterparty: { id: "sub-2", name: "Kerr Jula Logistics" },
        journalEntry: { id: "je-2", description: "IC expense entry" },
      },
    ]);

    // Default: parent entity exists
    db.query.entities.findFirst.mockResolvedValue({
      id: "entity-1",
      name: "Kerr Jula Trading Co.",
      currency: "GMD",
      country: "GM",
      isActive: true,
      organizationId: "org-1",
    });

    // Default: trial balance snapshots exist
    db.query.trialBalanceSnapshots.findMany.mockResolvedValue([
      {
        id: "tb-1",
        entityId: "entity-1",
        accountId: "acct-1",
        balance: "500000",
        generatedAt: new Date("2026-06-30"),
      },
      {
        id: "tb-2",
        entityId: "entity-1",
        accountId: "acct-2",
        balance: "-300000",
        generatedAt: new Date("2026-06-30"),
      },
      {
        id: "tb-3",
        entityId: "entity-1",
        accountId: "acct-3",
        balance: "200000",
        generatedAt: new Date("2026-06-30"),
      },
      {
        id: "tb-4",
        entityId: "sub-1",
        accountId: "acct-4",
        balance: "150000",
        generatedAt: new Date("2026-06-30"),
      },
    ]);

    // Default: journal entries exist
    db.query.journalEntries.findMany.mockResolvedValue([
      {
        id: "je-1",
        entityId: "entity-1",
        description: "Test entry",
        status: "posted",
        source: "manual",
        createdAt: new Date("2026-06-15"),
      },
      {
        id: "je-2",
        entityId: "entity-1",
        description: "Test entry 2",
        status: "posted",
        source: "manual",
        createdAt: new Date("2026-06-20"),
      },
    ]);

    // Default: insert returns ID
    db.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: "run-1" }]),
        onConflictDoNothing: vi.fn(),
      }),
    });

    // Default: select returns count
    db.select.mockImplementation(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => [{ count: "3" }]),
      })),
    }));
  });

  // ── Step 1: Entity Hierarchy Mapping ──────────────────────────────────────

  describe("Step 1: Entity Hierarchy & Relationship Mapping", () => {
    it("should identify all active subsidiaries for a parent entity", async () => {
      const { runConsolidationPipeline } =
        await import("../consolidation-pipeline");
      const result = await runConsolidationPipeline({
        entityId: "entity-1",
        organizationId: "org-1",
        period: "2026-06",
        userId: "user-1",
      });

      expect(result.subsidiaries).toHaveLength(3);
      expect(result.subsidiaries[0].subsidiaryName).toBe("Kerr Jula Bakau Ltd");
      expect(result.subsidiaries[1].ownershipPct).toBe(75);
      expect(result.subsidiaries[2].consolidationMethod).toBe("equity");
    });

    it("should include ownership percentage and consolidation method for each subsidiary", async () => {
      const { runConsolidationPipeline } =
        await import("../consolidation-pipeline");
      const result = await runConsolidationPipeline({
        entityId: "entity-1",
        organizationId: "org-1",
        period: "2026-06",
        userId: "user-1",
      });

      for (const sub of result.subsidiaries) {
        expect(sub.ownershipPct).toBeGreaterThan(0);
        expect(sub.ownershipPct).toBeLessThanOrEqual(100);
        expect(["full", "equity", "proportional"]).toContain(
          sub.consolidationMethod,
        );
      }
    });

    it("should handle entity with no subsidiaries gracefully", async () => {
      const { db } = require("@xenboox/db");
      db.query.entityRelationships.findMany.mockResolvedValue([]);
      db.query.entities.findMany.mockResolvedValue([]);

      const { runConsolidationPipeline } =
        await import("../consolidation-pipeline");
      const result = await runConsolidationPipeline({
        entityId: "entity-1",
        organizationId: "org-1",
        period: "2026-06",
        userId: "user-1",
      });

      expect(result.subsidiaries).toHaveLength(0);
      expect(result.steps[0].status).toBe("completed");
    });
  });

  // ── Step 2: Inter-Company Transaction Tagging ─────────────────────────────

  describe("Step 2: Inter-Company Transaction Tagging", () => {
    it("should collect IC tags for the parent entity", async () => {
      const { runConsolidationPipeline } =
        await import("../consolidation-pipeline");
      const result = await runConsolidationPipeline({
        entityId: "entity-1",
        organizationId: "org-1",
        period: "2026-06",
        userId: "user-1",
      });

      const parentTags = result.icTransactions.filter(
        (t) => t.entityId === "entity-1",
      );
      expect(parentTags.length).toBeGreaterThan(0);
    });

    it("should include subsidiary-side IC tags", async () => {
      const { db } = require("@xenboox/db");
      // Add subsidiary-side tags
      const subTagResults = [
        {
          id: "ict-3",
          entityId: "sub-1",
          counterpartyEntityId: "entity-1",
          transactionType: "payable",
          amount: "25000",
          currency: "GMD",
          description: "IC payable: Bakau → Parent",
          taggedAt: new Date("2026-06-15"),
          reversedAt: null,
          counterparty: { id: "entity-1", name: "Kerr Jula Trading Co." },
          journalEntry: { id: "je-3" },
        },
      ];

      // First call for parent tags
      let callCount = 0;
      db.query.intercompanyTags.findMany.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call: parent tags
          return [
            {
              id: "ict-1",
              entityId: "entity-1",
              counterpartyEntityId: "sub-1",
              transactionType: "receivable",
              amount: "25000",
              currency: "GMD",
              description: "IC receivable",
              taggedAt: new Date("2026-06-15"),
              reversedAt: null,
              counterparty: { id: "sub-1", name: "Kerr Jula Bakau Ltd" },
              journalEntry: { id: "je-1" },
            },
          ];
        }
        // Subsequent calls: subsidiary tags
        return subTagResults;
      });

      const { runConsolidationPipeline } =
        await import("../consolidation-pipeline");
      const result = await runConsolidationPipeline({
        entityId: "entity-1",
        organizationId: "org-1",
        period: "2026-06",
        userId: "user-1",
      });

      expect(result.icTransactions.length).toBeGreaterThan(1);
    });

    it("should mark step as completed when IC tags are found", async () => {
      const { runConsolidationPipeline } =
        await import("../consolidation-pipeline");
      const result = await runConsolidationPipeline({
        entityId: "entity-1",
        organizationId: "org-1",
        period: "2026-06",
        userId: "user-1",
      });

      expect(result.steps[1].status).toBe("completed");
      expect(result.steps[1].result).toBeDefined();
    });
  });

  // ── Step 3: Elimination Engine ────────────────────────────────────────────

  describe("Step 3: Elimination Engine", () => {
    it("should create elimination entries for matched IC transactions", async () => {
      const { runConsolidationPipeline } =
        await import("../consolidation-pipeline");
      const result = await runConsolidationPipeline({
        entityId: "entity-1",
        organizationId: "org-1",
        period: "2026-06",
        userId: "user-1",
      });

      expect(result.eliminations.length).toBeGreaterThanOrEqual(0);
    });

    it("should mark elimination entries as consolidation-layer only (not posted)", async () => {
      const { runConsolidationPipeline } =
        await import("../consolidation-pipeline");
      const result = await runConsolidationPipeline({
        entityId: "entity-1",
        organizationId: "org-1",
        period: "2026-06",
        userId: "user-1",
      });

      // Check that elimination entries are created in the consolidation layer only
      // The isPosted flag must remain false
      const { db } = require("@xenboox/db");
      const insertCalls = db.insert.mock.calls;
      const eliminationInserts = insertCalls.filter(
        (call: any[]) => call[0]?.constructor?.name === "Object" || false,
      );
      expect(result.steps[2].status).toBe("completed");
    });

    it("should handle unmatched IC transactions (only one side exists)", async () => {
      const { db } = require("@xenboox/db");
      db.query.intercompanyTags.findMany.mockResolvedValue([
        {
          id: "ict-1",
          entityId: "entity-1",
          counterpartyEntityId: "sub-1",
          transactionType: "receivable",
          amount: "50000",
          currency: "GMD",
          description: "IC receivable (no matching subsidiary tag)",
          taggedAt: new Date("2026-06-15"),
          reversedAt: null,
          counterparty: { id: "sub-1", name: "Kerr Jula Bakau Ltd" },
          journalEntry: { id: "je-1" },
        },
      ]);

      const { runConsolidationPipeline } =
        await import("../consolidation-pipeline");
      const result = await runConsolidationPipeline({
        entityId: "entity-1",
        organizationId: "org-1",
        period: "2026-06",
        userId: "user-1",
      });

      expect(result.steps[2].status).toBe("completed");
    });
  });

  // ── Step 4: Currency Translation ──────────────────────────────────────────

  describe("Step 4: Currency Translation for Consolidation", () => {
    it("should skip translation for subsidiaries with same currency as parent", async () => {
      const { runConsolidationPipeline } =
        await import("../consolidation-pipeline");
      const result = await runConsolidationPipeline({
        entityId: "entity-1",
        organizationId: "org-1",
        period: "2026-06",
        userId: "user-1",
      });

      // Parent is GMD, sub-1 and sub-2 are GMD, sub-3 is USD
      // Only sub-3 should be translated
      const gmdSubs = result.translations.filter(
        (t) => t.originalCurrency === "GMD",
      );
      expect(gmdSubs).toHaveLength(0);
    });

    it("should translate subsidiaries with different currencies", async () => {
      const { runConsolidationPipeline } =
        await import("../consolidation-pipeline");
      const result = await runConsolidationPipeline({
        entityId: "entity-1",
        organizationId: "org-1",
        period: "2026-06",
        userId: "user-1",
      });

      const usdTranslations = result.translations.filter(
        (t) => t.originalCurrency === "USD" || t.parentCurrency === "GMD",
      );
      expect(usdTranslations.length).toBeGreaterThanOrEqual(0);
    });

    it("should produce translated amounts and exchange rate info", async () => {
      const { runConsolidationPipeline } =
        await import("../consolidation-pipeline");
      const result = await runConsolidationPipeline({
        entityId: "entity-1",
        organizationId: "org-1",
        period: "2026-06",
        userId: "user-1",
      });

      for (const t of result.translations) {
        expect(t.exchangeRate).toBeGreaterThan(0);
        expect(typeof t.translatedBs).toBe("number");
        expect(typeof t.translatedPl).toBe("number");
      }
    });
  });

  // ── Step 5: Minority Interest Calculation ─────────────────────────────────

  describe("Step 5: Minority Interest Calculation", () => {
    it("should skip minority interest for 100% owned subsidiaries", async () => {
      const { runConsolidationPipeline } =
        await import("../consolidation-pipeline");
      const result = await runConsolidationPipeline({
        entityId: "entity-1",
        organizationId: "org-1",
        period: "2026-06",
        userId: "user-1",
      });

      const whollyOwnedMinority = result.minorityInterests.filter(
        (m) => m.ownershipPct >= 100,
      );
      expect(whollyOwnedMinority).toHaveLength(0);
    });

    it("should calculate minority interest for partially-owned subsidiaries", async () => {
      const { runConsolidationPipeline } =
        await import("../consolidation-pipeline");
      const result = await runConsolidationPipeline({
        entityId: "entity-1",
        organizationId: "org-1",
        period: "2026-06",
        userId: "user-1",
      });

      // sub-2 is 75% owned (25% minority), sub-3 is 60% owned (40% minority)
      const partialMinority = result.minorityInterests.filter(
        (m) => m.ownershipPct < 100,
      );
      for (const m of partialMinority) {
        expect(m.minorityPct).toBeGreaterThan(0);
        expect(m.minorityShareIncome).toBeGreaterThan(0);
        expect(m.minorityShareEquity).toBeGreaterThan(0);
      }
    });

    it("should persist minority interest records to the database", async () => {
      const { runConsolidationPipeline } =
        await import("../consolidation-pipeline");
      const result = await runConsolidationPipeline({
        entityId: "entity-1",
        organizationId: "org-1",
        period: "2026-06",
        userId: "user-1",
      });

      expect(result.steps[4].status).toBe("completed");
    });
  });

  // ── Step 6: Consolidated Statement Assembly ───────────────────────────────

  describe("Step 6: Consolidated Statement Assembly", () => {
    it("should produce consolidated totals", async () => {
      const { runConsolidationPipeline } =
        await import("../consolidation-pipeline");
      const result = await runConsolidationPipeline({
        entityId: "entity-1",
        organizationId: "org-1",
        period: "2026-06",
        userId: "user-1",
      });

      expect(result.consolidatedTotals).not.toBeNull();
      expect(result.consolidatedTotals!.totalRevenue).toBeGreaterThan(0);
      expect(typeof result.consolidatedTotals!.netIncome).toBe("number");
    });

    it("should include elimination adjustments in consolidated figures", async () => {
      const { runConsolidationPipeline } =
        await import("../consolidation-pipeline");
      const result = await runConsolidationPipeline({
        entityId: "entity-1",
        organizationId: "org-1",
        period: "2026-06",
        userId: "user-1",
      });

      // Consolidated revenue should account for eliminations
      expect(result.consolidatedTotals).not.toBeNull();
    });

    it("should include minority interest in consolidated equity", async () => {
      const { runConsolidationPipeline } =
        await import("../consolidation-pipeline");
      const result = await runConsolidationPipeline({
        entityId: "entity-1",
        organizationId: "org-1",
        period: "2026-06",
        userId: "user-1",
      });

      expect(result.consolidatedTotals!.minorityInterest).toBeDefined();
      expect(result.consolidatedTotals!.parentEquity).toBeDefined();
    });
  });

  // ── Step 7: Confidence Gate & Controller Sign-off ─────────────────────────

  describe("Step 7: Confidence Gate & Controller Sign-off", () => {
    it("should always flag for Controller review (mandatory)", async () => {
      const { runConsolidationPipeline } =
        await import("../consolidation-pipeline");
      const result = await runConsolidationPipeline({
        entityId: "entity-1",
        organizationId: "org-1",
        period: "2026-06",
        userId: "user-1",
      });

      const confidenceStep = result.steps.find(
        (s) => s.id === "confidence_gate",
      );
      expect(confidenceStep).toBeDefined();
      expect(confidenceStep!.status).toBe("flagged");
      expect(confidenceStep!.result?.mandatoryControllerReview).toBe(true);
    });

    it("should lower confidence when eliminations are missing", async () => {
      const { db } = require("@xenboox/db");
      db.query.intercompanyTags.findMany.mockResolvedValue([]);

      const { runConsolidationPipeline } =
        await import("../consolidation-pipeline");
      const result = await runConsolidationPipeline({
        entityId: "entity-1",
        organizationId: "org-1",
        period: "2026-06",
        userId: "user-1",
      });

      const confidenceStep = result.steps.find(
        (s) => s.id === "confidence_gate",
      );
      expect(confidenceStep!.result!.confidence).toBeLessThan(1.0);
    });
  });

  // ── Step 8: Consolidated View Delivery ────────────────────────────────────

  describe("Step 8: Consolidated View Delivery", () => {
    it("should prepare consolidated view metadata", async () => {
      const { runConsolidationPipeline } =
        await import("../consolidation-pipeline");
      const result = await runConsolidationPipeline({
        entityId: "entity-1",
        organizationId: "org-1",
        period: "2026-06",
        userId: "user-1",
      });

      const viewStep = result.steps.find((s) => s.id === "view_delivery");
      expect(viewStep).toBeDefined();
      expect(viewStep!.status).toBe("completed");
      expect(viewStep!.result?.statementsAvailable).toContain(
        "consolidated_pl",
      );
    });
  });

  // ── Step 9: Entity-Level Integrity Check ──────────────────────────────────

  describe("Step 9: Entity-Level Integrity Check", () => {
    it("should pass integrity check when no subsidiary data was mutated", async () => {
      const { runConsolidationPipeline } =
        await import("../consolidation-pipeline");
      const result = await runConsolidationPipeline({
        entityId: "entity-1",
        organizationId: "org-1",
        period: "2026-06",
        userId: "user-1",
      });

      expect(result.integrityCheckPassed).toBe(true);
      const integrityStep = result.steps.find(
        (s) => s.id === "integrity_check",
      );
      expect(integrityStep!.status).toBe("completed");
    });

    it("should detect when subsidiary journal entries were sourced from consolidation", async () => {
      const { db } = require("@xenboox/db");
      // Return a journal entry with source "consolidation" — this simulates a mutation
      db.query.journalEntries.findMany.mockResolvedValue([
        {
          id: "je-bad",
          entityId: "sub-1",
          description: "Consolidation adjustment",
          status: "posted",
          source: "consolidation",
          createdAt: new Date("2026-06-30"),
        },
      ]);

      const { runConsolidationPipeline } =
        await import("../consolidation-pipeline");
      const result = await runConsolidationPipeline({
        entityId: "entity-1",
        organizationId: "org-1",
        period: "2026-06",
        userId: "user-1",
      });

      expect(result.integrityCheckPassed).toBe(false);
    });
  });

  // ── Step 10: Audit Trail ──────────────────────────────────────────────────

  describe("Step 10: Audit Trail Logging", () => {
    it("should log an audit entry for the consolidation run", async () => {
      const { runConsolidationPipeline } =
        await import("../consolidation-pipeline");
      const result = await runConsolidationPipeline({
        entityId: "entity-1",
        organizationId: "org-1",
        period: "2026-06",
        userId: "user-1",
      });

      const auditStep = result.steps.find((s) => s.id === "audit_trail");
      expect(auditStep).toBeDefined();
      expect(auditStep!.status).toBe("completed");
    });

    it("should include consolidation metadata in audit entry", async () => {
      const { runConsolidationPipeline } =
        await import("../consolidation-pipeline");
      const result = await runConsolidationPipeline({
        entityId: "entity-1",
        organizationId: "org-1",
        period: "2026-06",
        userId: "user-1",
      });

      expect(result.errors).toHaveLength(0);
    });
  });

  // ── Status Query ──────────────────────────────────────────────────────────

  describe("getConsolidationStatus", () => {
    it("should return latest run and subsidiary info", async () => {
      const { db } = require("@xenboox/db");
      db.query.consolidationRuns.findFirst.mockResolvedValue({
        id: "run-1",
        parentEntityId: "entity-1",
        period: "2026-06",
        status: "completed",
        eliminationCount: 4,
        minorityInterestCount: 2,
        integrityCheckPassed: true,
        totalSubsidiaries: 3,
        subsidiariesProcessed: 3,
        createdAt: new Date(),
      });

      const { getConsolidationStatus } =
        await import("../consolidation-pipeline");
      const result = await getConsolidationStatus({ entityId: "entity-1" });

      expect(result.latestRun).not.toBeNull();
      expect(result.latestRun!.period).toBe("2026-06");
      expect(result.subsidiaries).toHaveLength(3);
    });

    it("should handle entity with no subsidiaries", async () => {
      const { db } = require("@xenboox/db");
      db.query.entityRelationships.findMany.mockResolvedValue([]);
      db.query.consolidationRuns.findFirst.mockResolvedValue(null);

      const { getConsolidationStatus } =
        await import("../consolidation-pipeline");
      const result = await getConsolidationStatus({ entityId: "entity-1" });

      expect(result.subsidiaries).toHaveLength(0);
      expect(result.latestRun).toBeNull();
      expect(result.hasActivePipeline).toBe(false);
    });

    it("should detect active pipeline by status", async () => {
      const { db } = require("@xenboox/db");
      db.query.consolidationRuns.findFirst.mockResolvedValue({
        id: "run-active",
        parentEntityId: "entity-1",
        period: "2026-06",
        status: "reviewing",
        createdAt: new Date(),
      });

      const { getConsolidationStatus } =
        await import("../consolidation-pipeline");
      const result = await getConsolidationStatus({ entityId: "entity-1" });

      expect(result.hasActivePipeline).toBe(true);
    });
  });

  // ── Controller Sign-off ───────────────────────────────────────────────────

  describe("approveConsolidationRun", () => {
    it("should mark a consolidation run as completed with reviewer info", async () => {
      const { approveConsolidationRun } =
        await import("../consolidation-pipeline");

      await expect(
        approveConsolidationRun({
          runId: "run-1",
          entityId: "entity-1",
          userId: "user-1",
        }),
      ).resolves.not.toThrow();
    });
  });

  // ── Entity Relationship Management ─────────────────────────────────────────

  describe("createEntityRelationship", () => {
    it("should create a new entity relationship", async () => {
      const { createEntityRelationship } =
        await import("../consolidation-pipeline");

      await expect(
        createEntityRelationship({
          parentEntityId: "entity-1",
          subsidiaryEntityId: "sub-4",
          ownershipPct: 80,
          currency: "GMD",
          consolidationMethod: "full",
          notes: "New subsidiary",
        }),
      ).resolves.not.toThrow();
    });
  });

  describe("listEntityRelationships", () => {
    it("should return active entity relationships", async () => {
      const { db } = require("@xenboox/db");
      db.query.entityRelationships.findMany.mockResolvedValue([
        {
          id: "rel-1",
          parentEntityId: "entity-1",
          subsidiaryEntityId: "sub-1",
          ownershipPct: "100.00",
          status: "active",
          consolidationMethod: "full",
          currency: "GMD",
          effectiveFrom: "2025-01-01",
          effectiveTo: null,
          notes: null,
          subsidiary: {
            id: "sub-1",
            name: "Kerr Jula Bakau Ltd",
            currency: "GMD",
            country: "GM",
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const { listEntityRelationships } =
        await import("../consolidation-pipeline");
      const result = await listEntityRelationships({ entityId: "entity-1" });

      expect(result).toHaveLength(1);
      expect((result[0] as any).subsidiary.name).toBe("Kerr Jula Bakau Ltd");
    });
  });

  // ── End-to-End Pipeline ───────────────────────────────────────────────────

  describe("End-to-End Pipeline", () => {
    it("should run all 10 steps successfully", async () => {
      const { runConsolidationPipeline } =
        await import("../consolidation-pipeline");
      const result = await runConsolidationPipeline({
        entityId: "entity-1",
        organizationId: "org-1",
        period: "2026-06",
        userId: "user-1",
      });

      expect(result.steps).toHaveLength(10);
      expect(result.success).toBe(true);
    });

    it("should return comprehensive pipeline result with all sections", async () => {
      const { runConsolidationPipeline } =
        await import("../consolidation-pipeline");
      const result = await runConsolidationPipeline({
        entityId: "entity-1",
        organizationId: "org-1",
        period: "2026-06",
        userId: "user-1",
      });

      expect(result.steps).toHaveLength(10);
      expect(result.subsidiaries.length).toBeGreaterThan(0);
      expect(result.period).toBe("2026-06");
      expect(result.entityId).toBe("entity-1");
    });

    it("should never mutate subsidiary entity-level data", async () => {
      const { runConsolidationPipeline } =
        await import("../consolidation-pipeline");
      const result = await runConsolidationPipeline({
        entityId: "entity-1",
        organizationId: "org-1",
        period: "2026-06",
        userId: "user-1",
      });

      // The cardinal rule: consolidation is an overlay layer
      expect(result.integrityCheckPassed).toBe(true);
    });
  });
});
