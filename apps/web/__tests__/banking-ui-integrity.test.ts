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
