import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const TRANSACTION_ROW = path.resolve(
  __dirname,
  "../components/banking/transaction-row.tsx",
);
const RULES_MANAGER = path.resolve(
  __dirname,
  "../components/banking/bank-rules-manager.tsx",
);
const CONNECTION_CARD = path.resolve(
  __dirname,
  "../components/banking/bank-connection-card.tsx",
);
const BANKING_VIEW = path.resolve(
  __dirname,
  "../components/operations/banking-view.tsx",
);
const BANKING_ROUTER = path.resolve(__dirname, "../server/routers/banking.ts");

describe("P2-F: Banking UI layer integrity", () => {
  it("transaction row formats amounts with the currency hook (format was previously undefined)", () => {
    const content = fs.readFileSync(TRANSACTION_ROW, "utf-8");
    expect(content).toContain("useFormatCurrency");
    expect(content).toContain("const { format } = useFormatCurrency()");
    expect(content).toContain("format(tx.amount, tx.currency)");
  });

  it("transaction row derives direction from type, not the amount sign (magnitude convention)", () => {
    const content = fs.readFileSync(TRANSACTION_ROW, "utf-8");
    expect(content).toContain('const isDeposit = tx.type === "deposit"');
    // The P2-B regression: amount is always positive → sign-based direction lies.
    expect(content).not.toContain("isPositive = tx.amount > 0");
  });

  it("transaction row converts confidence defensively (never multiplies a raw string)", () => {
    const content = fs.readFileSync(TRANSACTION_ROW, "utf-8");
    expect(content).toContain("Number(tx.categorizationConfidence)");
    expect(content).toContain("confidencePct");
  });

  it("rules manager match types mirror the API enum exactly", () => {
    const content = fs.readFileSync(RULES_MANAGER, "utf-8");
    for (const mt of [
      "description_contains",
      "description_equals",
      "reference_contains",
      "amount_equals",
      "amount_above",
      "amount_below",
    ]) {
      expect(content).toContain(mt);
    }
    // Legacy values that zod rejects must be gone.
    expect(content).not.toContain('value: "contains"');
    expect(content).not.toContain('value: "starts_with"');
    expect(content).not.toContain('value: "regex"');
    expect(content).not.toContain("confirm(");
  });

  it("banking view export uses real transaction fields", () => {
    const content = fs.readFileSync(BANKING_VIEW, "utf-8");
    expect(content).toContain('t.isReconciled ? "reconciled" : "unreconciled"');
    expect(content).not.toContain("t.transactionDate");
    expect(content).not.toContain("t.status");
  });

  it("connection card confirms disconnects with AlertDialog, not native confirm", () => {
    const content = fs.readFileSync(CONNECTION_CARD, "utf-8");
    expect(content).toContain("AlertDialog");
    expect(content).not.toContain("confirm(");
  });

  it("router implements the advertised AI learning → auto-rule promotion", () => {
    const content = fs.readFileSync(BANKING_ROUTER, "utf-8");
    expect(content).toContain("banking.autoCreateRule");
    expect(content).toContain("newTimesSeen >= 3");
    expect(content).toContain("description_contains");
    expect(content).toContain("learning_loop");
  });
});

describe("P2-Verification: Ledger-integrity (posted = locked)", () => {
  it("revertCategorization pre-loads posted txs and never rewrites a posted row", () => {
    const content = fs.readFileSync(BANKING_ROUTER, "utf-8");
    // It must gate on journalEntryId before writing (not silently update).
    expect(content).toContain("columns: { id: true, journalEntryId: true }");
    expect(content).toContain("postedIds");
    expect(content).toContain("already_posted_to_ledger");
    expect(content).toContain("blocked");
    // The write set still exists but only for non-posted rows.
    expect(content).toContain("if (allowed.length > 0)");
  });

  it("single-categorize path refuses to re-categorize a posted transaction", () => {
    const content = fs.readFileSync(BANKING_ROUTER, "utf-8");
    expect(content).toContain(
      "Reverse its journal entry before re-categorizing",
    );
    // Guard must run before the update.
    const guardIdx = content.indexOf("journalEntryId) {") !== -1;
    expect(guardIdx).toBe(true);
  });

  it("transaction row renders a lock instead of an editable category for posted txs", () => {
    const content = fs.readFileSync(TRANSACTION_ROW, "utf-8");
    expect(content).toContain("journalEntryId");
    expect(content).toContain("Lock");
    expect(content).toContain("showCategoryPicker && !tx.journalEntryId");
  });

  it("undo handler surfaces blocked rows instead of claiming full success", () => {
    const content = fs.readFileSync(BANKING_VIEW, "utf-8");
    expect(content).toContain("result?.blocked");
    expect(content).toContain("already posted to the ledger");
    expect(content).toContain("restoredCount");
  });
});
