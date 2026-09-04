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

describe("P7-C: Ledger UI surface", () => {
  const page = fs.readFileSync(
    path.resolve(__dirname, "../app/dashboard/ledger/page.tsx"),
    "utf-8",
  );

  it("the journal Export button exports real rows (never rows={[]})", () => {
    expect(page).not.toContain("rows={[]}");
    expect(page).toContain("rows={entries.map((e) => ({");
    expect(page).toContain('"Entry #": e.entryNumber ?? ""');
    expect(page).toContain(
      'filename={`journal-${new Date().toISOString().split("T")[0]}.csv`}',
    );
  });

  it("draft entries can be discarded (server delete wired with confirm)", () => {
    expect(page).toContain("trpc.journal.delete.useMutation");
    expect(page).toContain("Discard Draft");
    expect(page).toContain("Confirm Discard");
  });

  it("reversal asks for a required reason and confirms", () => {
    expect(page).toContain("Reason for reversal (required)");
    expect(page).toContain("Confirm Reverse");
    expect(page).toContain("reverseMutation.mutate({");
  });

  it("post/reverse/delete mutations invalidate the journal cache", () => {
    expect(page).toContain("utils.journal.invalidate()");
  });
});

describe("P7-D: posting choke point + Ledger Agent are race-safe", () => {
  const core = fs.readFileSync(
    path.resolve(__dirname, "../server/journal-posting-core.ts"),
    "utf-8",
  );
  const ar = fs.readFileSync(
    path.resolve(__dirname, "../server/ar-posting.ts"),
    "utf-8",
  );
  const ap = fs.readFileSync(
    path.resolve(__dirname, "../server/ap-posting.ts"),
    "utf-8",
  );
  const ledgerTools = fs.readFileSync(
    path.resolve(
      __dirname,
      "../../../packages/agents/tier3/ledger-agent/tools.ts",
    ),
    "utf-8",
  );

  it("createPostedJournal retries entry-number collisions (never races to a 500)", () => {
    expect(core).toContain("attempt < 3");
    expect(core).toContain("je_entity_entry_number|duplicate key value");
  });

  it("AR/AP void reversals retry entry-number collisions", () => {
    expect(ar).toContain("je_entity_entry_number|duplicate key value");
    expect(ap).toContain("je_entity_entry_number|duplicate key value");
  });

  it("Ledger Agent postEntry retries numbering and compensates a failed lines insert", () => {
    expect(ledgerTools).toContain("je_entity_entry_number|duplicate key value");
    expect(ledgerTools).toContain("delete(journalEntries)");
    expect(ledgerTools).toContain("Failed to allocate a journal entry number");
  });
});
