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
