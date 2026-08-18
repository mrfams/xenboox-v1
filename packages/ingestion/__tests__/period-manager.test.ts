/**
 * Period Manager Test Suite
 *
 * Tests the complete period lifecycle: open, close, lock, reopen with
 * all validation rules. Uses the actual Drizzle schema but mocks the
 * database connection for isolation.
 *
 * Run: pnpm --filter @xenboox/ingestion exec vitest run -- __tests__/period-manager.test.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock the database ──────────────────────────────────────────────────────

vi.mock("@xenboox/db", () => ({
  db: {
    query: {
      fiscalPeriods: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      journalEntries: {
        findMany: vi.fn(),
      },
      trialBalanceSnapshots: {
        findMany: vi.fn(),
      },
      bankTransactions: {
        findMany: vi.fn(),
      },
    },
    insert: vi.fn(() => ({
      values: vi.fn(() => ({ returning: vi.fn() })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({ where: vi.fn() })),
    })),
  },
}));

import { db } from "@xenboox/db";
import {
  executePeriodAction,
  getPeriodSummary,
} from "../engine/period-manager";
import type { FiscalPeriod } from "./test-types";

// ─── Test Data ──────────────────────────────────────────────────────────────

const mockPeriod = (overrides: Partial<FiscalPeriod> = {}): FiscalPeriod => ({
  id: "period-1",
  entityId: "entity-1",
  year: 2026,
  month: 6,
  startDate: "2026-06-01",
  endDate: "2026-06-30",
  status: "open",
  closedBy: null,
  closedAt: null,
  createdAt: new Date("2026-06-01"),
  updatedAt: new Date("2026-06-01"),
  ...overrides,
});

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("Period Manager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("executePeriodAction", () => {
    describe("open", () => {
      it("should no-op successfully when the period is already open", async () => {
        // Periods are born with status "open" (the schema default) — there
        // is no "created" state. Opening an already-open period is a safe
        // no-op that returns success with a warning.
        const period = mockPeriod({ status: "open" });
        vi.mocked(db.query.fiscalPeriods.findFirst).mockResolvedValue(period);

        const result = await executePeriodAction(
          "entity-1",
          "period-1",
          "open",
          "user-1",
        );

        expect(result.success).toBe(true);
        expect(result.action).toBe("open");
        expect(result.newStatus).toBe("open");
        expect(result.errors).toHaveLength(0);
        expect(result.warnings).toContainEqual(
          expect.stringContaining("already open"),
        );
      });

      it("should reopen a closed period with warning", async () => {
        const period = mockPeriod({ status: "closed" });
        vi.mocked(db.query.fiscalPeriods.findFirst).mockResolvedValue(period);

        const result = await executePeriodAction(
          "entity-1",
          "period-1",
          "open",
          "user-1",
        );

        expect(result.success).toBe(true);
        expect(result.action).toBe("open");
        expect(result.newStatus).toBe("open");
        expect(result.warnings).toContainEqual(
          expect.stringContaining("Reopening a closed period"),
        );
      });

      it("should reject opening a locked period", async () => {
        const period = mockPeriod({ status: "locked" });
        vi.mocked(db.query.fiscalPeriods.findFirst).mockResolvedValue(period);

        const result = await executePeriodAction(
          "entity-1",
          "period-1",
          "open",
          "user-1",
        );

        expect(result.success).toBe(false);
        expect(result.errors).toContainEqual(expect.stringContaining("locked"));
      });

      it("should reject opening a period in invalid status", async () => {
        const period = mockPeriod({ status: "closing" });
        vi.mocked(db.query.fiscalPeriods.findFirst).mockResolvedValue(period);

        const result = await executePeriodAction(
          "entity-1",
          "period-1",
          "open",
          "user-1",
        );

        expect(result.success).toBe(false);
      });
    });

    describe("close", () => {
      it("should close an open period with validations", async () => {
        const period = mockPeriod({ status: "open" });
        // First findFirst resolves the period itself; the second is the
        // previous-period check and must return null (no prior period) so
        // the close validation passes.
        vi.mocked(db.query.fiscalPeriods.findFirst)
          .mockResolvedValueOnce(period)
          .mockResolvedValueOnce(null);
        vi.mocked(db.query.journalEntries.findMany).mockResolvedValue([
          { id: "je-1", status: "posted" },
        ]);
        vi.mocked(db.query.trialBalanceSnapshots.findMany).mockResolvedValue([
          { debitTotal: "1000", creditTotal: "1000", accountId: "acct-1" },
        ]);
        vi.mocked(db.query.bankTransactions.findMany).mockResolvedValue([]);

        const result = await executePeriodAction(
          "entity-1",
          "period-1",
          "close",
          "user-1",
        );

        expect(result.success).toBe(true);
        expect(result.action).toBe("close");
        expect(result.newStatus).toBe("closed");
      });

      it("should reject closing with draft entries", async () => {
        const period = mockPeriod({ status: "open" });
        vi.mocked(db.query.fiscalPeriods.findFirst).mockResolvedValue(period);
        vi.mocked(db.query.journalEntries.findMany).mockResolvedValue([
          { id: "je-1", status: "draft" },
        ]);

        const result = await executePeriodAction(
          "entity-1",
          "period-1",
          "close",
          "user-1",
          {
            skipValidation: false,
          },
        );

        expect(result.success).toBe(false);
        expect(result.errors).toContainEqual(expect.stringContaining("draft"));
      });

      it("should reject closing an already closed period", async () => {
        const period = mockPeriod({ status: "closed" });
        vi.mocked(db.query.fiscalPeriods.findFirst).mockResolvedValue(period);

        const result = await executePeriodAction(
          "entity-1",
          "period-1",
          "close",
          "user-1",
        );

        expect(result.success).toBe(false);
        expect(result.errors).toContainEqual(
          expect.stringContaining("already"),
        );
      });

      it("should force-close with warnings when invalid but forced", async () => {
        const period = mockPeriod({ status: "open" });
        vi.mocked(db.query.fiscalPeriods.findFirst).mockResolvedValue(period);
        vi.mocked(db.query.journalEntries.findMany).mockResolvedValue([
          { id: "je-1", status: "draft" },
        ]);
        vi.mocked(db.query.trialBalanceSnapshots.findMany).mockResolvedValue([
          { debitTotal: "500", creditTotal: "1000", accountId: "acct-1" },
        ]);

        const result = await executePeriodAction(
          "entity-1",
          "period-1",
          "close",
          "user-1",
          {
            force: true,
          },
        );

        expect(result.success).toBe(true);
        expect(result.newStatus).toBe("closed");
      });
    });

    describe("lock", () => {
      it("should lock a closed period", async () => {
        const period = mockPeriod({ status: "closed" });
        vi.mocked(db.query.fiscalPeriods.findFirst).mockResolvedValue(period);

        const result = await executePeriodAction(
          "entity-1",
          "period-1",
          "lock",
          "user-1",
        );

        expect(result.success).toBe(true);
        expect(result.newStatus).toBe("locked");
      });

      it("should reject locking an open period", async () => {
        const period = mockPeriod({ status: "open" });
        vi.mocked(db.query.fiscalPeriods.findFirst).mockResolvedValue(period);

        const result = await executePeriodAction(
          "entity-1",
          "period-1",
          "lock",
          "user-1",
        );

        expect(result.success).toBe(false);
      });
    });

    describe("reopen", () => {
      it("should reopen a closed period", async () => {
        const period = mockPeriod({ status: "closed" });
        vi.mocked(db.query.fiscalPeriods.findFirst).mockResolvedValue(period);
        vi.mocked(db.query.fiscalPeriods.findMany).mockResolvedValue([]);

        const result = await executePeriodAction(
          "entity-1",
          "period-1",
          "reopen",
          "user-1",
          {
            force: true,
          },
        );

        expect(result.success).toBe(true);
        expect(result.newStatus).toBe("open");
      });

      it("should warn about subsequent periods", async () => {
        const period = mockPeriod({ status: "closed" });
        vi.mocked(db.query.fiscalPeriods.findFirst).mockResolvedValue(period);
        vi.mocked(db.query.fiscalPeriods.findMany).mockResolvedValue([
          mockPeriod({
            id: "period-2",
            year: 2026,
            month: 7,
            status: "closed",
          }),
        ]);

        const result = await executePeriodAction(
          "entity-1",
          "period-1",
          "reopen",
          "user-1",
        );

        expect(result.success).toBe(false);
        expect(result.warnings).toContainEqual(
          expect.stringContaining("subsequent"),
        );
      });

      it("should reject reopening a locked period", async () => {
        const period = mockPeriod({ status: "locked" });
        vi.mocked(db.query.fiscalPeriods.findFirst).mockResolvedValue(period);

        const result = await executePeriodAction(
          "entity-1",
          "period-1",
          "reopen",
          "user-1",
        );

        expect(result.success).toBe(false);
      });
    });
  });

  describe("getPeriodSummary", () => {
    it("should return null for non-existent period", async () => {
      vi.mocked(db.query.fiscalPeriods.findFirst).mockResolvedValue(null);

      const result = await getPeriodSummary("entity-1", "non-existent");

      expect(result).toBeNull();
    });

    it("should return period summary with balances", async () => {
      vi.mocked(db.query.fiscalPeriods.findFirst).mockResolvedValue(
        mockPeriod({ status: "open" }),
      );
      vi.mocked(db.query.journalEntries.findMany).mockResolvedValue([
        { id: "je-1" },
        { id: "je-2" },
      ]);
      vi.mocked(db.query.trialBalanceSnapshots.findMany).mockResolvedValue([
        { debitTotal: "1000", creditTotal: "500", accountId: "acct-1" },
        { debitTotal: "200", creditTotal: "700", accountId: "acct-2" },
      ]);

      const result = await getPeriodSummary("entity-1", "period-1");

      expect(result).not.toBeNull();
      expect(result!.entryCount).toBe(2);
      expect(result!.totalDebits).toBe(1200);
      expect(result!.totalCredits).toBe(1200);
      expect(result!.isBalanced).toBe(true);
    });
  });
});

// Types are inferred through the mocked imports above
