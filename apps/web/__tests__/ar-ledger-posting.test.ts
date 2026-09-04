import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import {
  resolveArReceivableAccount,
  resolvePaymentReceiptAccount,
  buildArInvoiceLines,
  buildArPaymentLines,
  type ArCoaRow,
} from "../../../packages/db/lib/ar-ledger";

const AR_ROUTER = path.resolve(__dirname, "../server/routers/ar.ts");
const AR_POSTING = path.resolve(__dirname, "../server/ar-posting.ts");

const coa = (rows: Partial<ArCoaRow>[]): ArCoaRow[] =>
  rows.map((r, i) => ({
    id: r.id ?? `acc-${i}`,
    code: r.code ?? `C${i}`,
    name: r.name ?? `Account ${i}`,
    type: r.type ?? "asset",
    subtype: r.subtype ?? "bank_account",
  }));

describe("P3-B: AR account resolvers", () => {
  it("resolves an existing AR account and describes the canonical 1100 row when absent", () => {
    const withAr = coa([
      { name: "Trade Debtors", subtype: "accounts_receivable" },
    ]);
    expect(resolveArReceivableAccount(withAr).account?.id).toBe("acc-0");

    const empty = coa([{ name: "Bank", subtype: "bank_account" }]);
    const missing = resolveArReceivableAccount(empty);
    expect(missing.account).toBeUndefined();
    expect(missing.toCreate).toMatchObject({
      code: "1100",
      subtype: "accounts_receivable",
    });
  });

  it("routes cash payments to cash and other methods to bank accounts", () => {
    const c = coa([
      { id: "bank", name: "Main Bank", subtype: "bank_account" },
      { id: "cashbox", name: "Petty Cash", subtype: "cash" },
    ]);
    expect(resolvePaymentReceiptAccount(c, "cash").account?.id).toBe("cashbox");
    expect(resolvePaymentReceiptAccount(c, "bank_transfer").account?.id).toBe(
      "bank",
    );
    expect(resolvePaymentReceiptAccount(c, "mobile_money").account?.id).toBe(
      "bank",
    );
    expect(resolvePaymentReceiptAccount(c, "card").account?.id).toBe("bank");

    const cashOnly = resolvePaymentReceiptAccount(coa([]), "cash");
    expect(cashOnly.toCreate).toMatchObject({
      code: "1010",
      name: "Cash on Hand",
    });
    const bankOnly = resolvePaymentReceiptAccount(coa([]), "check");
    expect(bankOnly.toCreate).toMatchObject({
      code: "1020",
      name: "Bank Account",
    });
  });
});

describe("P3-B: AR journal line builders", () => {
  it("invoice lines balance: Dr AR total = sum of Cr line accounts", () => {
    const lines = buildArInvoiceLines("ar", [
      { accountId: "rev1", cents: 12550, description: "Consulting" },
      { accountId: "rev2", cents: 4999, description: "Expenses" },
    ]);
    const debit = lines.reduce((s, l) => s + parseFloat(l.debit), 0);
    const credit = lines.reduce((s, l) => s + parseFloat(l.credit), 0);
    expect(debit).toBeCloseTo(credit, 2);
    expect(debit).toBeCloseTo(175.49, 2);
    // First line is the AR Dr for the full amount.
    expect(lines[0]).toMatchObject({
      accountId: "ar",
      debit: "175.49",
      credit: "0",
    });
  });

  it("payment lines balance Dr receipt = Cr AR", () => {
    const lines = buildArPaymentLines("bank", "ar", 8750, "Payment");
    const debit = lines.reduce((s, l) => s + parseFloat(l.debit), 0);
    const credit = lines.reduce((s, l) => s + parseFloat(l.credit), 0);
    expect(debit).toBeCloseTo(credit, 2);
    expect(lines[0]).toMatchObject({
      accountId: "bank",
      debit: "87.50",
      credit: "0",
    });
    expect(lines[1]).toMatchObject({
      accountId: "ar",
      debit: "0",
      credit: "87.50",
    });
  });
});

describe("P3-B: posting wiring (A1 — invoices/payments reach the ledger)", () => {
  it("ar router auto-posts on invoice create, payment record and void reversal", () => {
    const c = fs.readFileSync(AR_ROUTER, "utf-8");
    expect(c).toContain("postArInvoiceToLedger");
    expect(c).toContain("postArPaymentToLedger");
    expect(c).toContain("reverseArInvoiceJournal");
    expect(c).toContain('"[ar] Invoice created but not posted to the ledger"');
  });

  it("deletePayment blocks posted payments (ledger first, then delete)", () => {
    const c = fs.readFileSync(AR_ROUTER, "utf-8");
    expect(c).toContain(
      "Payment is posted to the ledger — reverse its journal entry before deleting",
    );
    expect(c).toContain("existing.journalEntryId");
  });

  it("posting module enforces idempotency, TrustGuard and open-period rules", () => {
    const c = fs.readFileSync(AR_POSTING, "utf-8");
    expect(c).toContain("validateJournalEntry");
    expect(c).toContain("eq(journalEntries.reference, reference)");
    expect(c).toContain("`ar-inv-${invoice.id}`");
    expect(c).toContain("`ar-pay-${payment.id}`");
    expect(c).toContain("`ar-inv-rev-${invoice.id}`");
    expect(c).toContain('source: "ar_invoice"');
    expect(c).toContain('source: "ar_payment"');
    expect(c).toContain('period?.status !== "open"');
    expect(c).toContain("cleanupJournal");
  });
});

describe("P3-C: posted-state UI surface", () => {
  const DETAIL = path.resolve(
    __dirname,
    "../components/finance/invoice-detail-panel.tsx",
  );
  const LIST = path.resolve(
    __dirname,
    "../components/finance/invoices-view.tsx",
  );
  const INVOICING = path.resolve(__dirname, "../server/routers/invoicing.ts");

  it("ar router exposes retryPostInvoice with plain-English reasons", () => {
    const c = fs.readFileSync(AR_ROUTER, "utf-8");
    expect(c).toContain("retryPostInvoice");
    expect(c).toContain("journal_skipped");
  });

  it("list + detail queries expose journalEntryId so the UI can show posted state", () => {
    const c = fs.readFileSync(INVOICING, "utf-8");
    expect(c).toContain("journalEntryId: salesInvoices.journalEntryId");
    expect(c).toContain("journalEntryId: invoice.journalEntryId ?? null");
  });

  it("detail panel surfaces unposted invoices and blocks payments until posted", () => {
    const c = fs.readFileSync(DETAIL, "utf-8");
    expect(c).toContain("retryPostInvoice");
    expect(c).toContain("Post to ledger");
    expect(c).toContain(
      "Post this invoice to the ledger before recording payments",
    );
  });

  it("invoice list marks not-in-ledger rows", () => {
    const c = fs.readFileSync(LIST, "utf-8");
    expect(c).toContain("journalEntryId");
    expect(c).toContain("Not in ledger");
  });
});

describe("P3-D: overdue job hardening", () => {
  const REMINDERS = path.resolve(
    __dirname,
    "../../../packages/jobs/reminders.ts",
  );

  it("ISO-date guard — legacy garbage due dates are never blindly marked overdue", () => {
    const c = fs.readFileSync(REMINDERS, "utf-8");
    const matches =
      c.match(/~ '\^\[0-9\]\{4\}-\[0-9\]\{2\}-\[0-9\]\{2\}\$'/g) ?? [];
    expect(matches.length).toBe(2); // AR + AP scans
  });

  it("notifies finance-capable roles, not just owners", () => {
    const c = fs.readFileSync(REMINDERS, "utf-8");
    expect(c).toContain("inArray(userEntityAccess.role, [");
    expect(c).toContain('"finance_director"');
    expect(c).toContain('"accountant"');
    expect(c).not.toContain('eq(userEntityAccess.role, "owner")');
  });

  it("per-entity failure isolation — one entity never aborts the scan", () => {
    const c = fs.readFileSync(REMINDERS, "utf-8");
    expect(c).toContain("Failed to notify for newly overdue invoices");
    expect(c).toContain("Failed to send monthly bank reminder");
  });
});
