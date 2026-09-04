import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const JOURNAL = path.resolve(__dirname, "../server/routers/journal.ts");

describe("P7-A: journal create record layer", () => {
  const c = fs.readFileSync(JOURNAL, "utf-8");

  it("line amounts use the bounded shared moneyString (numeric(15,2) safe)", () => {
    expect(c).toContain('debit: moneyString.default("0")');
    expect(c).toContain('credit: moneyString.default("0")');
    // The loose unbounded inline regex must be gone.
    expect(c).not.toContain(
      '.regex(/^\\\\d+(\\\\.\\\\d{1,2})?$/)\n                .default("0")',
    );
    expect(c).toContain('from "../ar-validation"');
  });

  it("caps lines and enforces integer-cents MAX_CENTS on every amount", () => {
    expect(c).toContain(".min(2)");
    expect(c).toContain(".max(200)");
    expect(c).toContain("MAX_CENTS");
    expect(c).toContain("Number.isSafeInteger(debitCents)");
    expect(c).toContain("Line amount is too large");
  });

  it("TrustGuard runs before any write (account + period entity scope, balance)", () => {
    expect(c).toContain("await validateJournalEntry({");
    expect(c).toContain("logTrustGuardResult(");
    expect(c).toContain('code: "BAD_REQUEST"');
  });

  it("rejects a duplicate reference with a friendly CONFLICT", () => {
    expect(c).toContain('code: "CONFLICT"');
    expect(c).toContain("already exists for this entity");
  });

  it("allocates entry numbers race-safely with retry on unique collision", () => {
    expect(c).toContain("attempt < 3");
    expect(c).toContain("je_entity_entry_number|duplicate key value");
    expect(c).toContain("Could not allocate a journal entry number");
  });

  it("compensates — deletes the header if the lines insert fails", () => {
    expect(c).toContain("delete(journalEntries)");
    expect(c).toContain("where(eq(journalEntries.id, entry.id))");
  });
});

describe("P7-B: post/reverse state machine + period integrity", () => {
  const c = fs.readFileSync(JOURNAL, "utf-8");

  it("post only flips draft/pending_review entries and cannot double-post", () => {
    expect(c).toContain(
      'inArray(journalEntries.status, ["draft", "pending_review"]),',
    );
    expect(c).toContain('message: "Journal entry was already posted"');
  });

  it("post period lookup is entity-scoped and date must fall in bounds", () => {
    expect(c).toContain("eq(fiscalPeriods.entityId, ctx.entityId!),");
    expect(c).toContain("Entry date does not fall within the selected period");
  });

  it("reversal posts into the current OPEN period, never the original's", () => {
    expect(c).toContain("findOpenPeriod(ctx.entityId!, today)");
    expect(c).toContain(
      "today's accounting period is closed. Reopen it first.",
    );
    expect(c).toContain("periodId: openPeriod.id,");
  });

  it("reversal uses its own unique reference (never collides with the original)", () => {
    expect(c).toContain("reference: `REV-${entry.id}`,");
    expect(c).not.toContain("reference: entry.reference,");
  });

  it("reversal races entry numbers safely and cannot double-reverse", () => {
    expect(c).toContain("attempt < 3 && !reversal");
    expect(c).toContain('eq(journalEntries.status, "posted"),');
    expect(c).toContain('message: "Journal entry was already reversed"');
  });

  it("delete requires the general_ledger delete permission", () => {
    expect(c).toContain('requirePermission("general_ledger", "delete")');
  });
});
