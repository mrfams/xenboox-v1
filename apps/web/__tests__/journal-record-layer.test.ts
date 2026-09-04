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
