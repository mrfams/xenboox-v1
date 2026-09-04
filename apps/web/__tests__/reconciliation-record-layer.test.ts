import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const REC = path.resolve(__dirname, "../server/routers/reconciliation.ts");
const BANKING = path.resolve(__dirname, "../server/routers/banking.ts");
const VIEW = path.resolve(
  __dirname,
  "../components/operations/banking-view.tsx",
);

describe("P5-A: mounted router exposes the UI-facing procedures", () => {
  const c = fs.readFileSync(REC, "utf-8");
  it("has all four procedures the view calls", () => {
    expect(c).toContain("getReconciliationData: rlsProtectedProcedure");
    expect(c).toContain("getAiMatches: rlsProtectedProcedure");
    expect(c).toContain("reconcileTransaction: rlsMutateProcedure");
    expect(c).toContain("unreconcileTransaction: rlsMutateProcedure");
  });
  it("reconcileTransaction validates the journal entry (exists, entity, posted)", () => {
    expect(c).toContain("Only posted journal entries can be reconciled");
    expect(c).toContain("eq(journalEntries.entityId, entityId)");
    expect(c).toContain('status !== "posted"');
  });
  it("cannot silently re-point an already-linked transaction", () => {
    expect(c).toContain("unreconcile it first");
  });
  it("no phantom journalEntries.bankTransactionId update (the 500 source)", () => {
    // The old block updated journalEntries with an `as any` cast on a column
    // that never existed in the schema — that update failed at runtime.
    expect(c).not.toContain(".set({\n            bankTransactionId:");
    expect(c).not.toContain("as any");
  });
  it("reconcile/unreconcile write audit trail entries", () => {
    expect(c).toContain('action: "reconciliation.reconcileTransaction"');
    expect(c).toContain('action: "reconciliation.unreconcileTransaction"');
  });
  it("uuid-validates transaction and journal entry ids", () => {
    expect(c).toContain("bankTransactionId: z.string().uuid()");
    expect(c).toContain("journalEntryId: z.string().uuid().optional()");
  });
});

describe("P5-A: dead banking.ts reconciliation block removed", () => {
  const b = fs.readFileSync(BANKING, "utf-8");
  it("no duplicate reconciliationRouter definition remains", () => {
    expect(b).not.toContain("Extended Banking Router");
    expect(b).not.toContain("export const reconciliationRouter = router({");
  });
  it("does not import the now-unused reconciliations table", () => {
    expect(b).not.toContain("  reconciliations,\n");
  });
});

describe("P5-A: reconciliation view is reachable (mounted tab)", () => {
  const v = fs.readFileSync(VIEW, "utf-8");
  it("banking surface has a Reconcile tab rendering the view", () => {
    expect(v).toContain('id: "reconciliation"');
    expect(v).toContain("<ReconciliationView />");
  });
});

describe("P5-E: hardened every public mutation + input validation", () => {
  const c = fs.readFileSync(REC, "utf-8");
  it("matchTransaction has the same JE/posted/re-point guards as reconcileTransaction", () => {
    expect(c).toContain('action: "reconciliation.matchTransaction"');
    // Guards appear twice (both procedures)
    expect(
      c.match(/unreconcile it first/g)?.length ?? 0,
    ).toBeGreaterThanOrEqual(2);
    expect(
      c.match(/Only posted journal entries can be reconciled/g)?.length ?? 0,
    ).toBeGreaterThanOrEqual(2);
  });
  it("finalize + autoReconcile validate ISO dates and money format", () => {
    expect(c).toContain(
      "statementDate: z.string().regex(/^\\d{4}-\\d{2}-\\d{2}$/",
    );
    expect(c).toContain(
      "statementBalance: z.string().regex(/^-?\\d+(\\.\\d{1,2})?$/",
    );
    expect(c).toContain("startDate: z.string().regex(/^\\d{4}-\\d{2}-\\d{2}$/");
  });
});

describe("P5-D: reconciliation UI surface", () => {
  const v = fs.readFileSync(
    path.resolve(__dirname, "../components/finance/reconciliation-view.tsx"),
    "utf-8",
  );
  it("finalize flow is present (statement date + balance + button)", () => {
    expect(v).toContain("finalizeReconciliation.useMutation");
    expect(v).toContain("Finalize Reconciliation");
    expect(v).toContain("statementBalance: balance.toFixed(2)");
  });
  it("mutations surface errors instead of failing silently", () => {
    expect(v).toContain("onError: (err) => toast.error(err.message)");
  });
  it("history icons treat closed as success", () => {
    expect(v).toContain('recon.status === "closed"');
  });
  it("toast is imported", () => {
    expect(v).toContain('import { toast } from "sonner";');
  });
});

describe("P5-C: GL-integrity book balance", () => {
  const c = fs.readFileSync(REC, "utf-8");
  it("finalize computes book from the linked GL account (not bank currentBalance)", () => {
    expect(c).toContain("computeBookBalance(");
    expect(c).toContain("glAccountId: true");
    expect(c).toContain("sum(debit) − sum(credit)");
  });
  it("book balance helper sums posted lines up to the statement date, entity-scoped", () => {
    expect(c).toContain('eq(journalEntries.status, "posted")');
    expect(c).toContain("lte(journalEntries.date, asOfDate)");
    expect(c).toContain("eq(journalEntryLines.accountId, glAccountId)");
  });
  it("center summary uses opening (last closed) + reconciled net, not all period txs", () => {
    expect(c).toContain("openingBalance");
    expect(c).toContain("last closed statement balance");
    expect(c).toContain("reconciledNet");
  });
  it("reconciliations table is still entity-scoped in the summary query", () => {
    expect(c).toContain("eq(reconciliations.bankAccountId, selectedAccountId)");
  });
});

describe("P5-B: matching engine integrity", () => {
  const c = fs.readFileSync(REC, "utf-8");
  it("already-linked journal entries are never candidates (one-to-one)", () => {
    expect(c).toContain("one entry ↔ one transaction");
    expect(c).toContain("SELECT journal_entry_id FROM bank_transactions");
  });
  it("amount tolerance is proportional, not a flat $5", () => {
    expect(c).toContain("Math.max(0.5, amount * 0.02)");
    expect(c).not.toContain("amountDiff > 5");
  });
  it("auto-links are audit-trailed with confidence + reason", () => {
    expect(c).toContain('action: "reconciliation.autoLink"');
    expect(c).toContain("confidence: m.confidence");
  });
});
