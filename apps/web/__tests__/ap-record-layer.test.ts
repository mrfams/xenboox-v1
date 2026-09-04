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

describe("P4-B: AP posting to the general ledger", () => {
  const c = fs.readFileSync(AP, "utf-8");
  it("bill creation posts best-effort (never blocks on closed period)", () => {
    expect(c).toContain("const postResult = await postApBillToLedger(");
    expect(c).toContain("Bill created but not posted to the ledger");
  });
  it("void reverses the bill journal entry", () => {
    expect(c).toContain("const revResult = await reverseApBillJournal(");
    expect(c).toContain("Voided bill journal not reversed");
  });
  it("payment posting runs before the audit insert and rolls back on failure", () => {
    const payStart = c.indexOf("await postApPaymentToLedger(");
    const audit = c.indexOf('action: "ap.createPayment"');
    expect(payStart).toBeGreaterThan(-1);
    expect(audit).toBeGreaterThan(payStart);
    expect(c).toContain("never leave without also hitting the ledger");
  });
});

describe("P4-B: ap-posting module structure", () => {
  const m = fs.readFileSync(
    path.resolve(__dirname, "../server/ap-posting.ts"),
    "utf-8",
  );
  it("bill JE reference is the idempotency key", () => {
    expect(m).toContain("reference = \`ap-inv-${bill.id}\`");
  });
  it("payment JE reference is the idempotency key", () => {
    expect(m).toContain("reference = \`ap-pay-${payment.id}\`");
  });
  it("void reversal swaps debits and credits and marks reversed", () => {
    expect(m).toContain("debit: line.credit");
    expect(m).toContain("credit: line.debit");
    expect(m).toContain('status: "reversed"');
    expect(m).toContain("ap_bill_void");
  });
  it("payment posting requires the bill to be posted first", () => {
    expect(m).toContain(
      "Bill is not posted to the ledger — post the bill before recording payments",
    );
  });
  it("never redirects a missing line account to AP", () => {
    expect(m).toContain("missing_line_account");
  });
});
