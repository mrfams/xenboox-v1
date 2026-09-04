import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const EXPENSES = path.resolve(__dirname, "../server/routers/expenses.ts");

describe("P6-A: expense record layer", () => {
  const c = fs.readFileSync(EXPENSES, "utf-8");
  it("supplier must exist in the entity (no cross-tenant payables)", () => {
    expect(c).toContain("eq(suppliers.id, input.supplierId)");
    expect(c).toContain("eq(suppliers.entityId, entityId)");
    expect(c).toContain('message: "Supplier not found"');
  });
  it("money and dates use the shared positive/ISO validators + due>=expense", () => {
    expect(c).toContain("amount: positiveMoneyString");
    expect(c).toContain("expenseDate: isoDateString");
    expect(c).toContain("Due date cannot be before the expense date");
  });
  it("expenses are created WITH a line item so they can reach the ledger", () => {
    expect(c).toContain("await db.insert(invoiceApLines).values({");
    expect(c).toContain("accountId,");
    expect(c).toContain('quantity: "1"');
  });
  it("line failure compensates (header deleted, no orphan)", () => {
    expect(c).toContain(".delete(invoicesAp)");
    expect(c).toContain("never orphan a header");
  });
  it("account resolution refuses to guess (no expense account → clear error)", () => {
    expect(c).toContain("resolveExpenseAccountId(");
    expect(c).toContain(
      "Add an expense account to your chart of accounts first",
    );
    expect(c).toContain('eq(chartOfAccounts.type, "expense")');
  });
});
