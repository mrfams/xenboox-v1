/**
 * Bank Import Batch Dedup — TDD Tests
 *
 * Tests the batched deduplication logic for bank transaction imports.
 * Covers: transaction capping, batch dedup, batch insertion.
 */

import { describe, it, expect } from "vitest";

// ─── Test the pure logic (extracted from bank-import.ts) ────────────────────

const MAX_TRANSACTIONS = 10_000;
const CHUNK_SIZE = 500;
const BATCH_SIZE = 100;

type ParsedTransaction = {
  date: string;
  description: string;
  amount: number;
  type: "credit" | "debit";
  reference?: string;
  balance?: number;
  category?: string;
  valueDate?: string;
};

/**
 * Pure function: cap transactions to prevent memory/DB exhaustion
 */
function capTransactions(transactions: ParsedTransaction[]): ParsedTransaction[] {
  return transactions.slice(0, MAX_TRANSACTIONS);
}

/**
 * Pure function: collect references for batch dedup
 */
function collectReferences(transactions: ParsedTransaction[]): string[] {
  return transactions
    .filter((tx) => tx.reference)
    .map((tx) => tx.reference!);
}

/**
 * Pure function: split array into chunks
 */
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Pure function: filter out duplicates based on existing references
 */
function filterDuplicates(
  transactions: ParsedTransaction[],
  existingRefs: Set<string>,
): { toInsert: ParsedTransaction[]; skippedCount: number } {
  const toInsert: ParsedTransaction[] = [];
  let skippedCount = 0;

  for (const tx of transactions) {
    if (tx.reference && existingRefs.has(tx.reference)) {
      skippedCount++;
      continue;
    }
    toInsert.push(tx);
  }

  return { toInsert, skippedCount };
}

/**
 * Pure function: batch insert values
 */
function buildInsertValues(
  transactions: ParsedTransaction[],
  entityId: string,
  bankAccountId: string,
): Record<string, unknown>[] {
  return transactions.map((tx) => ({
    entityId,
    bankAccountId,
    transactionDate: tx.date,
    valueDate: tx.valueDate,
    description: tx.description,
    reference: tx.reference,
    amount: String(tx.amount),
    type: tx.type === "credit" ? "deposit" : "withdrawal",
    balance: tx.balance ? String(tx.balance) : undefined,
    source: "bank_statement",
    metadata: {
      category: tx.category,
      confidence: "1.0",
    },
  }));
}

describe("bank-import-dedup", () => {
  describe("capTransactions", () => {
    it("returns all transactions under limit", () => {
      const txs: ParsedTransaction[] = Array.from({ length: 100 }, (_, i) => ({
        date: `2026-01-${String(i + 1).padStart(2, "0")}`,
        description: `TX ${i}`,
        amount: i * 10,
        type: "credit" as const,
        reference: `REF-${i}`,
      }));

      const result = capTransactions(txs);
      expect(result).toHaveLength(100);
    });

    it("caps at MAX_TRANSACTIONS", () => {
      const txs: ParsedTransaction[] = Array.from({ length: 15_000 }, (_, i) => ({
        date: `2026-01-01`,
        description: `TX ${i}`,
        amount: i * 10,
        type: "credit" as const,
        reference: `REF-${i}`,
      }));

      const result = capTransactions(txs);
      expect(result).toHaveLength(MAX_TRANSACTIONS);
    });

    it("handles empty array", () => {
      const result = capTransactions([]);
      expect(result).toHaveLength(0);
    });
  });

  describe("collectReferences", () => {
    it("collects references from transactions", () => {
      const txs: ParsedTransaction[] = [
        { date: "2026-01-01", description: "TX1", amount: 100, type: "credit", reference: "REF-1" },
        { date: "2026-01-02", description: "TX2", amount: 200, type: "debit", reference: "REF-2" },
        { date: "2026-01-03", description: "TX3", amount: 300, type: "credit" },
      ];

      const refs = collectReferences(txs);
      expect(refs).toEqual(["REF-1", "REF-2"]);
    });

    it("handles empty references", () => {
      const txs: ParsedTransaction[] = [
        { date: "2026-01-01", description: "TX1", amount: 100, type: "credit" },
      ];

      const refs = collectReferences(txs);
      expect(refs).toHaveLength(0);
    });
  });

  describe("chunkArray", () => {
    it("splits into correct chunks", () => {
      const arr = [1, 2, 3, 4, 5, 6, 7];
      const chunks = chunkArray(arr, 3);
      expect(chunks).toEqual([[1, 2, 3], [4, 5, 6], [7]]);
    });

    it("handles exact chunk size", () => {
      const arr = [1, 2, 3, 4, 5, 6];
      const chunks = chunkArray(arr, 3);
      expect(chunks).toEqual([[1, 2, 3], [4, 5, 6]]);
    });

    it("handles empty array", () => {
      const chunks = chunkArray([], 3);
      expect(chunks).toHaveLength(0);
    });
  });

  describe("filterDuplicates", () => {
    it("filters out duplicate references", () => {
      const txs: ParsedTransaction[] = [
        { date: "2026-01-01", description: "TX1", amount: 100, type: "credit", reference: "REF-1" },
        { date: "2026-01-02", description: "TX2", amount: 200, type: "debit", reference: "REF-2" },
        { date: "2026-01-03", description: "TX3", amount: 300, type: "credit", reference: "REF-1" },
      ];

      const existingRefs = new Set(["REF-1"]);
      const { toInsert, skippedCount } = filterDuplicates(txs, existingRefs);

      expect(toInsert).toHaveLength(1);
      expect(skippedCount).toBe(2);
      expect(toInsert.map((tx) => tx.reference)).toEqual(["REF-2"]);
    });

    it("inserts all when no duplicates", () => {
      const txs: ParsedTransaction[] = [
        { date: "2026-01-01", description: "TX1", amount: 100, type: "credit", reference: "REF-1" },
        { date: "2026-01-02", description: "TX2", amount: 200, type: "debit", reference: "REF-2" },
      ];

      const existingRefs = new Set<string>();
      const { toInsert, skippedCount } = filterDuplicates(txs, existingRefs);

      expect(toInsert).toHaveLength(2);
      expect(skippedCount).toBe(0);
    });

    it("handles transactions without references", () => {
      const txs: ParsedTransaction[] = [
        { date: "2026-01-01", description: "TX1", amount: 100, type: "credit" },
        { date: "2026-01-02", description: "TX2", amount: 200, type: "debit" },
      ];

      const existingRefs = new Set(["REF-1"]);
      const { toInsert, skippedCount } = filterDuplicates(txs, existingRefs);

      expect(toInsert).toHaveLength(2);
      expect(skippedCount).toBe(0);
    });
  });

  describe("buildInsertValues", () => {
    it("builds correct insert values", () => {
      const txs: ParsedTransaction[] = [
        {
          date: "2026-01-01",
          description: "Payment from Customer",
          amount: 1500,
          type: "credit",
          reference: "INV-001",
          balance: 5000,
          category: "revenue",
        },
      ];

      const values = buildInsertValues(txs, "entity-1", "account-1");
      expect(values).toHaveLength(1);
      expect(values[0]).toMatchObject({
        entityId: "entity-1",
        bankAccountId: "account-1",
        transactionDate: "2026-01-01",
        description: "Payment from Customer",
        amount: "1500",
        type: "deposit",
        source: "bank_statement",
      });
    });

    it("maps credit to deposit and debit to withdrawal", () => {
      const txs: ParsedTransaction[] = [
        { date: "2026-01-01", description: "Credit", amount: 100, type: "credit" },
        { date: "2026-01-02", description: "Debit", amount: 200, type: "debit" },
      ];

      const values = buildInsertValues(txs, "entity-1", "account-1");
      expect(values[0].type).toBe("deposit");
      expect(values[1].type).toBe("withdrawal");
    });
  });
});
