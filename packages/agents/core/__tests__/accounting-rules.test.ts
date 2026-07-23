import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@xenboox/db", () => ({
  db: {
    query: {
      journalEntries: { findMany: vi.fn(), findFirst: vi.fn() },
      journalEntryLines: { findMany: vi.fn() },
    },
  },
}));

import { db } from "@xenboox/db";
import { matchReconciliation } from "../accounting-rules";

const ENTITY_ID = "entity-1";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("matchReconciliation", () => {
  const tx = {
    amount: 5000,
    date: "2026-07-15",
    description: "Payment from ABC Corp",
  };

  it("matches entry with exact amount and same date", async () => {
    vi.mocked(db.query.journalEntries.findMany).mockResolvedValue([
      {
        id: "entry-1",
        date: "2026-07-15",
        description: "Payment from ABC Corp",
      },
    ] as any);
    vi.mocked(db.query.journalEntryLines.findMany).mockResolvedValue([
      {
        id: "line-1",
        journalEntryId: "entry-1",
        accountId: "cash-1",
        debit: "0",
        credit: "5000",
      },
    ] as any);

    const result = await matchReconciliation(tx, ENTITY_ID);

    expect(result.matched).toBe(true);
    expect(result.confidence).toBeGreaterThanOrEqual(0.8);
    expect(result.matchCandidates).toHaveLength(1);
    expect(result.matchCandidates[0].score).toBeGreaterThanOrEqual(1.0);
  });

  it("returns no match when no entries exist in date window", async () => {
    vi.mocked(db.query.journalEntries.findMany).mockResolvedValue([] as any);

    const result = await matchReconciliation(tx, ENTITY_ID);

    expect(result.matched).toBe(false);
    expect(result.confidence).toBe(0);
    expect(result.matchCandidates).toHaveLength(0);
    expect(result.unmatchedReasons).toHaveLength(1);
  });

  it("uses batch query pattern (single findMany, no per-line findFirst)", async () => {
    vi.mocked(db.query.journalEntries.findMany).mockResolvedValue([
      {
        id: "entry-1",
        date: "2026-07-15",
        description: "Payment from ABC Corp",
      },
    ] as any);
    vi.mocked(db.query.journalEntryLines.findMany).mockResolvedValue([
      {
        id: "line-1",
        journalEntryId: "entry-1",
        accountId: "cash-1",
        debit: "0",
        credit: "5000",
      },
      {
        id: "line-2",
        journalEntryId: "entry-1",
        accountId: "rev-1",
        debit: "5000",
        credit: "0",
      },
    ] as any);

    await matchReconciliation(tx, ENTITY_ID);

    expect(
      vi.mocked(db.query.journalEntries.findMany).mock.calls.length,
    ).toBeLessThanOrEqual(1);
    expect(vi.mocked(db.query.journalEntries.findFirst).mock.calls.length).toBe(
      0,
    );
  });

  it("matches with date tolerance when dates are near", async () => {
    vi.mocked(db.query.journalEntries.findMany).mockResolvedValue([
      { id: "entry-2", date: "2026-07-14", description: "ABC payment" },
    ] as any);
    vi.mocked(db.query.journalEntryLines.findMany).mockResolvedValue([
      {
        id: "line-3",
        journalEntryId: "entry-2",
        accountId: "cash-1",
        debit: "0",
        credit: "5000",
      },
    ] as any);

    const result = await matchReconciliation(
      { ...tx, date: "2026-07-15" },
      ENTITY_ID,
      { dateToleranceDays: 3 },
    );

    expect(result.matched).toBe(true);
    expect(result.confidence).toBeGreaterThanOrEqual(0.6);
  });
});
