import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const AP = path.resolve(__dirname, "../server/routers/ap.ts");
const BILLS = path.resolve(__dirname, "../server/routers/bills.ts");

describe("P4-A: AP validation boundary (B2)", () => {
  const c = fs.readFileSync(AP, "utf-8");
  it("PO/invoice money + dates are validated with the shared schemas", () => {
    expect(c).toContain("unitPrice: moneyString");
    expect(c).toContain("dueDate: isoDateString");
    expect(c).toContain("orderDate: isoDateString");
    expect(c).toContain("amount: positiveMoneyString");
    expect(c).toContain("paymentDate: isoDateString");
    expect(c).toContain("Number.isSafeInteger(lineCents)");
    expect(c).toContain("MAX_CENTS");
  });

  it("due/expected date ordering is enforced", () => {
    expect(c).toContain("Expected date cannot be before the order date");
    expect(c).toContain("Due date cannot be before the invoice date");
  });
});

describe("P4-A: entity scope + compensation (B3/B4)", () => {
  const c = fs.readFileSync(AP, "utf-8");
  it("line accounts are entity-scoped on PO and invoice", () => {
    expect(c).toContain("One or more line accounts are not in this entity");
  });

  it("createInvoice validates supplier and requires an approved-or-beyond PO", () => {
    expect(c).toContain("Supplier not found for this entity");
    expect(c).toContain(
      "A bill can only be linked to an approved (or received) purchase order",
    );
  });

  it("duplicate numbers get a friendly 409 pre-check + race mapping", () => {
    expect(c).toContain("already exists for this entity");
    expect(c).toContain("ap_invoice_entity_number");
  });

  it("creates compensate on failure instead of the silent tx shim", () => {
    const createSections = c.slice(
      c.indexOf("createPO:"),
      c.indexOf("updatePO:"),
    );
    expect(createSections).not.toContain("db.transaction");
    expect(createSections).toContain(".catch(() => {})");
  });
});

describe("P4-A: state machines + delete guards (B5/B7/B8)", () => {
  const c = fs.readFileSync(AP, "utf-8");
  it("updateInvoice is void-only (no totalAmount/status forgery)", () => {
    expect(c).toContain('status: z.literal("voided").optional()');
    expect(c).not.toContain("totalAmount: z.string().optional()");
    expect(c).toContain('action: "ap.voidInvoice"');
    expect(c).toContain("reverse them before voiding");
  });

  it("updatePO locks supplier/status once approved", () => {
    expect(c).toContain("Supplier is locked once a purchase order is approved");
    expect(c).toContain("Status is managed by the approval/receipt workflow");
  });

  it("delete guards surface clear conflicts (supplier/PO/invoice/payment)", () => {
    expect(c).toContain("deactivate them instead of deleting");
    expect(c).toContain("Purchase order is linked to bills");
    expect(c).toContain("Invoice is in the ledger — void it instead");
    expect(c).toContain("reverse the payments before deleting");
    expect(c).toContain(
      "Payment is posted to the ledger — reverse its journal entry before deleting",
    );
  });

  it("deletePayment restores bill paid/balance from remaining payments", () => {
    expect(c).toContain(
      "COALESCE(SUM(${paymentsAp.amount}::numeric), 0)::text",
    );
  });
});

describe("P4-A: payment atomicity (B6)", () => {
  const c = fs.readFileSync(AP, "utf-8");
  it("payments use compare-and-set, not the tx shim", () => {
    expect(c).toContain("Invoice balance changed — refresh and try again");
    expect(c).toContain("gte(");
    expect(c).not.toContain("return await db.transaction(async (tx) => {");
  });
});

describe("P4-A: bill numbering (B9)", () => {
  it("getNextBillNumber is max-sequence based", () => {
    const c = fs.readFileSync(BILLS, "utf-8");
    expect(c).toContain("maxSeq");
    expect(c).toContain("parseInt(suffix, 10)");
    expect(c).not.toContain("const sequence = (result?.count ?? 0) + 1;");
  });
});
