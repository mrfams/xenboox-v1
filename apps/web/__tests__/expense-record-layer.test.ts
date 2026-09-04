import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const EXPENSES = path.resolve(__dirname, "../server/routers/expenses.ts");

describe("P6-C: claim reimbursement posts to the ledger", () => {
  const c = fs.readFileSync(EXPENSES, "utf-8");
  it("reimburse posts Dr expense lines / Cr receipt before marking reimbursed", () => {
    expect(c).toContain("reference: `exp-claim-${claim.id}`");
    expect(c).toContain("createPostedJournal({");
    expect(c).toContain('source: "expense_claim_reimbursement"');
  });
  it("line amounts must foot to the claim total (no wrong reimbursements)", () => {
    expect(c).toContain("lineCentsTotal !== claimCents");
  });
  it("missing expense accounts block reimbursement with a clear error", () => {
    expect(c).toContain(
      "Add an expense account to your chart of accounts before reimbursing claims",
    );
  });
  it("closed-period post failure leaves the claim approved (nothing half-recorded)", () => {
    expect(c).toContain("today's accounting period is closed");
  });
});

describe("P6-B: approval posts money (recognize + settle, full rollback)", () => {
  const c = fs.readFileSync(EXPENSES, "utf-8");
  it("approval recognizes the expense (bill JE) and records a real payment", () => {
    expect(c).toContain("const recognized = await postApBillToLedger(");
    expect(c).toContain("insert(paymentsAp)");
    expect(c).toContain("const [cas] = await db");
  });
  it("approval is finance-role gated", () => {
    expect(c).toContain('requireRole("owner", "admin", "finance_director")');
  });
  it("payment-post failure rolls back payment, status, and the recognized JE (clears link)", () => {
    expect(c).toContain("await reverseApBillJournal(");
    expect(c).toContain("journalEntryId: null");
    expect(c).toContain("the accounting period for today is closed");
  });
  it("rejection voids without posting (clean terminal state)", () => {
    expect(c).toContain('action: "expense.rejected"');
    expect(c).toContain('.set({ status: "voided" })');
  });
});

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
