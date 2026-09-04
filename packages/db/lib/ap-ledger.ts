// ─── AP → General Ledger Propagation ────────────────────────────────────────
//
// Pipeline 4 (Bill Flow) Sub-Part B. Mirrors ar-ledger.ts but for payables:
//   bill created    → Dr line expense/asset accounts / Cr Accounts Payable
//   payment made    → Dr AP / Cr receipt account (bank/cash by method)
//   bill voided     → reversal of the bill JE
//
// Journal entries reference-linked (`ap-inv-{id}`, `ap-pay-{id}`) so the
// unique (entityId, reference) index makes double-posting impossible.
// Receipt-account resolution (bank/cash by payment method) is shared with
// AR via ar-ledger's resolvePaymentReceiptAccount.

// Receipt-account resolution (bank/cash by payment method) is shared with AR
// — ap-posting imports resolvePaymentReceiptAccount from ar-ledger directly.
import type { ArCoaRow } from "./ar-ledger";

export type { ArCoaRow as ApCoaRow };

export interface ApLedgerLine {
  accountId: string;
  debit: string;
  credit: string;
  description?: string;
}

/**
 * Resolve the entity's Accounts Payable liability account. Deterministic:
 * named AP row wins, else any accounts_payable row, else describe the
 * canonical row to create (code 2100 — the conventional AP slot).
 */
export function resolveApPayableAccount(coa: ArCoaRow[]): {
  account?: ArCoaRow;
  toCreate?: ArCoaRow;
} {
  const apRows = coa.filter(
    (a) => a.subtype === "accounts_payable" && a.type === "liability",
  );
  if (apRows.length > 0) return { account: apRows[0] };
  return {
    toCreate: {
      id: "",
      code: "2100",
      name: "Accounts Payable",
      type: "liability",
      subtype: "accounts_payable",
    },
  };
}

/**
 * Build the balanced lines for a purchase bill:
 *   Dr each line account / Cr AP (bill total).
 * `lines` = [{ accountId, cents, description }] — integer cents, exact.
 */
export function buildApInvoiceLines(
  apAccountId: string,
  lines: Array<{ accountId: string; cents: number; description: string }>,
): ApLedgerLine[] {
  const totalCents = lines.reduce((s, l) => s + l.cents, 0);
  const total = (totalCents / 100).toFixed(2);
  const out: ApLedgerLine[] = [
    {
      accountId: apAccountId,
      debit: "0",
      credit: total,
      description: "Bill total",
    },
  ];
  for (const line of lines) {
    const amount = (line.cents / 100).toFixed(2);
    out.push({
      accountId: line.accountId,
      debit: amount,
      credit: "0",
      description: line.description,
    });
  }
  return out;
}

/**
 * Build the balanced lines for an AP payment:
 *   Dr AP (payment amount) / Cr receipt account (payment amount).
 */
export function buildApPaymentLines(
  apAccountId: string,
  receiptAccountId: string,
  amountCents: number,
  description: string,
): ApLedgerLine[] {
  const amount = (amountCents / 100).toFixed(2);
  return [
    { accountId: apAccountId, debit: amount, credit: "0", description },
    {
      accountId: receiptAccountId,
      debit: "0",
      credit: amount,
      description,
    },
  ];
}
