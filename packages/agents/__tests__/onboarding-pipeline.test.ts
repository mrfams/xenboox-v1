import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────────
//
// vi.mock factories are hoisted to the top of the file, so every mock the
// factory references MUST live in vi.hoisted(). We spread the real schema
// (pure table definitions, no connection) and swap `db` for a mock so no
// real DB is ever touched.

const mocks = vi.hoisted(() => {
  // tx chain: insert(table).values(obj).onConflictDoUpdate(...)
  const txInsert = vi.fn();
  const txValues = vi.fn();
  const txOnConflict = vi.fn().mockResolvedValue(undefined);
  txValues.mockReturnValue({ onConflictDoUpdate: txOnConflict });
  txInsert.mockReturnValue({ values: txValues });

  const tx = { insert: txInsert, update: vi.fn(), query: {} };

  // db chain: insert(table).values(obj).returning(...)
  const insert = vi.fn();
  const insertValues = vi.fn();
  const insertReturning = vi.fn().mockResolvedValue([{ id: "job-1" }]);
  insertValues.mockReturnValue({ returning: insertReturning });
  insert.mockReturnValue({ values: insertValues });

  // db chain: update(table).set(obj).where(...)
  const update = vi.fn();
  const updateSet = vi.fn();
  const updateWhere = vi.fn().mockResolvedValue(undefined);
  updateSet.mockReturnValue({ where: updateWhere });
  update.mockReturnValue({ set: updateSet });

  const transaction = vi.fn();

  const query = {
    chartOfAccounts: { findMany: vi.fn(), findFirst: vi.fn() },
    coaTemplates: { findFirst: vi.fn() },
    fiscalPeriods: { findMany: vi.fn() },
    dataConnections: { findMany: vi.fn() },
    entities: { findFirst: vi.fn() },
    onboardingSessions: { findFirst: vi.fn() },
    openingBalances: { findMany: vi.fn() },
  };

  return {
    txInsert,
    txValues,
    txOnConflict,
    tx,
    insert,
    insertValues,
    insertReturning,
    update,
    updateSet,
    updateWhere,
    transaction,
    query,
  };
});

vi.mock("@xenboox/db", async () => {
  const schema = await import("@xenboox/db/schema");
  return {
    ...schema,
    db: {
      query: mocks.query,
      insert: mocks.insert,
      update: mocks.update,
      transaction: mocks.transaction,
    },
  };
});

vi.mock("../core/langfuse", () => ({
  langfuse: {
    trace: vi
      .fn()
      .mockResolvedValue({ update: vi.fn().mockResolvedValue(undefined) }),
    event: vi.fn(),
    span: vi.fn(),
  },
}));

import {
  legacyRoutingToSourceType,
  getFirstMessage,
  confirmOpeningBalance,
  confirmOpeningBalanceEscape,
  getOpeningBalanceSummary,
  startHistoricalPull,
  runOnboardingPipeline,
  type OnboardingSourceType,
} from "../core/onboarding-pipeline";
import { historicalPullJobs } from "@xenboox/db";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.transaction.mockImplementation(
    async (cb: (tx: typeof mocks.tx) => unknown) => cb(mocks.tx),
  );
});

// ─── Legacy routing → five-category mapping ──────────────────────────────

describe("legacyRoutingToSourceType — spec §2 migration mapping", () => {
  it("maps accounting software answers to professional_software", () => {
    expect(legacyRoutingToSourceType("quickbooks")).toBe(
      "professional_software",
    );
    expect(legacyRoutingToSourceType("xero")).toBe("professional_software");
  });

  it("maps excel/other to manual_records", () => {
    expect(legacyRoutingToSourceType("excel")).toBe("manual_records");
    expect(legacyRoutingToSourceType("other")).toBe("manual_records");
  });

  it("returns null for 'nothing' — genuinely ambiguous, must re-ask", () => {
    // 'nothing' conflates brand-new with informal-no-records — never guess.
    expect(legacyRoutingToSourceType("nothing")).toBeNull();
  });

  it("returns null for unknown/null input", () => {
    expect(legacyRoutingToSourceType(null)).toBeNull();
    expect(legacyRoutingToSourceType("totally-unknown")).toBeNull();
  });
});

// ─── Per-category CFO first message (spec §3.1/§3.5) ─────────────────────

describe("getFirstMessage — honesty rule: A/E never imply records found", () => {
  it("brand_new: clean slate, no mention of found/processed records", () => {
    const msg = getFirstMessage("brand_new", {
      transactions: 9999,
      flagged: 999,
    });
    expect(msg).toContain("clean slate");
    expect(msg).not.toMatch(/found|processed|categorized/i);
  });

  it("no_records: starts from today with an opening balance", () => {
    const msg = getFirstMessage("no_records");
    expect(msg).toContain("opening balance");
    expect(msg).not.toMatch(/found|categorized/i);
  });

  it("B/C/D: cites the summary specifics", () => {
    const summaryTypes: OnboardingSourceType[] = [
      "professional_software",
      "manual_records",
      "statements_only",
    ];
    for (const t of summaryTypes) {
      const msg = getFirstMessage(t, {
        transactions: 5963,
        flagged: 337,
        months: 12,
      });
      expect(msg).toContain("I've reviewed your records");
      expect(msg).toContain("5963"); // summary numbers pass through as-is
      expect(msg).toContain("337");
    }
  });

  it("null source: defaults to the summary form, never fabricates", () => {
    expect(getFirstMessage(null)).toContain("I've reviewed your records");
    expect(
      getFirstMessage(undefined, { transactions: 0, flagged: 0 }),
    ).toContain("0 transactions");
  });
});

// ─── Opening balances (spec §4.1/§6) ─────────────────────────────────────

describe("confirmOpeningBalance — owner-confirmed, idempotent, atomic", () => {
  const ACCOUNTS = [
    { id: "a-1010", code: "1010", entityId: "entity-1" },
    { id: "a-1100", code: "1100", entityId: "entity-1" },
    { id: "a-2010", code: "2010", entityId: "entity-1" },
  ];

  beforeEach(() => {
    mocks.query.chartOfAccounts.findMany.mockResolvedValue(ACCOUNTS);
  });

  it("writes source=owner_confirmed with the confirming user", async () => {
    const result = await confirmOpeningBalance(
      "entity-1",
      [
        { code: "1010", amount: 15000 },
        { code: "2010", amount: -3000 },
      ],
      "user-1",
    );

    expect(result.saved).toBe(2);
    expect(mocks.transaction).toHaveBeenCalledTimes(1);

    const inserts = mocks.txInsert.mock.calls;
    expect(inserts).toHaveLength(2);
    expect(inserts[0]![0]).toBeDefined();

    const valuesCall1 = mocks.txValues.mock.calls[0]![0] as Record<
      string,
      unknown
    >;
    expect(valuesCall1.source).toBe("owner_confirmed");
    expect(valuesCall1.confirmedByUserId).toBe("user-1");
    expect(valuesCall1.amount).toBe("15000");
    expect(valuesCall1.currency).toBe("GMD");

    const valuesCall2 = mocks.txValues.mock.calls[1]![0] as Record<
      string,
      unknown
    >;
    expect(valuesCall2.amount).toBe("-3000");
  });

  it("upserts idempotently keyed on (entityId, accountId)", async () => {
    await confirmOpeningBalance(
      "entity-1",
      [{ code: "1010", amount: 500 }],
      "user-1",
    );
    // Double-submit simulation: same row, same key → onConflictDoUpdate
    await confirmOpeningBalance(
      "entity-1",
      [{ code: "1010", amount: 800 }],
      "user-1",
    );

    const onConflictCalls = mocks.txOnConflict.mock.calls;
    expect(onConflictCalls).toHaveLength(2);
    // onConflictDoUpdate receives a single { target, set } object
    const arg = onConflictCalls[0]![0] as {
      target: unknown[];
      set: Record<string, unknown>;
    };
    expect(arg.target).toHaveLength(2); // (entityId, accountId) key
    expect(arg.set.amount).toBe("500");
  });

  it("rejects a batch containing an unknown account code — atomic, nothing written", async () => {
    // 1100 is referenced by the batch but missing from the entity's CoA
    mocks.query.chartOfAccounts.findMany.mockResolvedValue(
      ACCOUNTS.filter((a) => a.code !== "1100"),
    );

    await expect(
      confirmOpeningBalance(
        "entity-1",
        [
          { code: "1010", amount: 100 },
          { code: "1100", amount: 200 },
        ],
        "user-1",
      ),
    ).rejects.toThrow("Account not found for this entity");

    // The transaction never runs → nothing persisted (rollback by construction)
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("returns saved=0 for an empty batch", async () => {
    await expect(
      confirmOpeningBalance("entity-1", [], "user-1"),
    ).resolves.toEqual({ saved: 0 });
  });
});

describe("confirmOpeningBalanceEscape — spec §3.5 'I don't know yet'", () => {
  it("flags the entity for a later reconciliation pass", async () => {
    mocks.query.entities.findFirst.mockResolvedValue({
      id: "entity-1",
      settings: {},
    });

    await confirmOpeningBalanceEscape("entity-1");

    const setCall = mocks.updateSet.mock.calls[0]![0] as Record<
      string,
      unknown
    >;
    const settings = setCall.settings as Record<string, unknown>;
    expect(settings.openingBalanceNeedsReconciliation).toBe(true);
    expect(mocks.updateWhere).toHaveBeenCalledTimes(1);
  });
});

describe("getOpeningBalanceSummary", () => {
  it("returns source-tagged balances, total, and the escape flag", async () => {
    mocks.query.entities.findFirst.mockResolvedValue({
      id: "entity-1",
      onboardingSourceType: "no_records",
      businessStartDate: "2026-08-01",
      settings: {},
    });
    mocks.query.openingBalances.findMany.mockResolvedValue([
      {
        accountId: "a-1010",
        amount: "15000",
        currency: "GMD",
        source: "owner_confirmed",
        confirmedAt: new Date("2026-08-01T09:00:00Z"),
      },
    ]);
    mocks.query.chartOfAccounts.findMany.mockResolvedValue([
      { id: "a-1010", code: "1010" },
    ]);

    const summary = await getOpeningBalanceSummary("entity-1");

    expect(summary.sourceType).toBe("no_records");
    expect(summary.businessStartDate).toBe("2026-08-01");
    expect(summary.total).toBe(15000);
    expect(summary.balances[0]!.accountCode).toBe("1010");
    expect(summary.balances[0]!.source).toBe("owner_confirmed");
    expect(summary.escaped).toBe(false);
  });

  it("surfaces the escape flag when set", async () => {
    mocks.query.entities.findFirst.mockResolvedValue({
      id: "entity-1",
      onboardingSourceType: "no_records",
      businessStartDate: null,
      settings: { openingBalanceNeedsReconciliation: true },
    });
    mocks.query.openingBalances.findMany.mockResolvedValue([]);

    const summary = await getOpeningBalanceSummary("entity-1");
    expect(summary.escaped).toBe(true);
    expect(summary.total).toBe(0);
  });
});

// ─── Historical pull depth (spec §4.2) ───────────────────────────────────

describe("startHistoricalPull — detail depth + >12-month gate", () => {
  it("persists the selected detail depth on the job", async () => {
    const result = await startHistoricalPull(
      "entity-1",
      "2024-01-01",
      "2025-12-31",
      "full_history",
    );

    expect(mocks.insert).toHaveBeenCalledTimes(1);
    expect(mocks.insert).toHaveBeenCalledWith(historicalPullJobs);
    const values = mocks.insertValues.mock.calls[0]![0] as Record<
      string,
      unknown
    >;
    expect(values.detailDepth).toBe("full_history");
    expect(values.entityId).toBe("entity-1");
    expect(result.jobId).toBe("job-1");
  });

  it("defaults depth to last_12_months and flags >12-month ranges for permission", async () => {
    // 24-month range
    const over = await startHistoricalPull(
      "entity-1",
      "2024-01-01",
      "2026-01-01",
    );
    expect(over.needsPermission).toBe(true);
    expect(mocks.insertValues.mock.calls[0]![0]).toMatchObject({
      detailDepth: "last_12_months",
      exceeds12Months: true,
      status: "permission_required",
    });

    // Exactly 12 months → no gate
    const within = await startHistoricalPull(
      "entity-1",
      "2025-01-01",
      "2026-01-01",
    );
    expect(within.needsPermission).toBe(false);
    expect(mocks.insertValues.mock.calls[1]![0]).toMatchObject({
      exceeds12Months: false,
      status: "pulling",
    });
  });
});

// ─── Category A: pipeline seeds CoA/periods, never a pull job ────────────

describe("runOnboardingPipeline — Category A behavior", () => {
  it("seeds chart of accounts + fiscal periods and never creates a pull job", async () => {
    // CoA check: empty first, present at final readiness
    const accountsAfter = Array.from({ length: 12 }, (_, i) => ({
      id: `acct-${i}`,
      entityId: "entity-1",
      code: `${1000 + i}`,
    }));
    let accountsCalls = 0;
    mocks.query.chartOfAccounts.findMany.mockImplementation(async () => {
      accountsCalls += 1;
      return accountsCalls === 1 ? [] : accountsAfter;
    });

    // No matching COA template → inline standard seed path
    mocks.query.coaTemplates.findFirst.mockResolvedValue(null);

    let periodsCalls = 0;
    const periodsAfter = Array.from({ length: 12 }, (_, i) => ({
      id: `p-${i}`,
      entityId: "entity-1",
      month: i + 1,
    }));
    mocks.query.fiscalPeriods.findMany.mockImplementation(async () => {
      periodsCalls += 1;
      return periodsCalls === 1 ? [] : periodsAfter;
    });

    mocks.query.dataConnections.findMany.mockResolvedValue([]);

    const result = await runOnboardingPipeline(
      "entity-1",
      "A Brand New Business",
    );

    expect(result.success).toBe(true);

    // Seeded the standard CoA via the inline fallback transaction
    const steps = result.steps.map((s) => `${s.id}:${s.details}`);
    expect(
      steps.some((s) => s.includes("coa_review") && s.includes("Created")),
    ).toBe(true);
    // Created the 12 fiscal periods
    expect(
      steps.some(
        (s) => s.includes("historical_pull") && s.includes("12 fiscal periods"),
      ),
    ).toBe(true);

    // THE Category A guarantee: runOnboardingPipeline never inserts a pull job.
    // Pull jobs are created only via startHistoricalPull (wizard, B/C/D only).
    const insertTables = mocks.insert.mock.calls.map((c) => c[0]);
    expect(insertTables.some((t) => t === historicalPullJobs)).toBe(false);

    // Readiness: 12 accounts + 12 periods
    expect(
      result.steps.some((s) =>
        s.details.includes("12 accounts, 12 periods ready"),
      ),
    ).toBe(true);
  });
});
