// ─── AR → General Ledger Propagation ────────────────────────────────────────
//
// Pipeline 3 (Invoice Flow) Sub-Part B. The AR module previously recorded
// invoices/payments with ZERO general-ledger impact — financial reports read
// posted journal entries only, so revenue was never recognized, AR never
// appeared on the balance sheet, and bank receipts never landed.
//
// This module owns the AR → GL transition, mirroring the locked conventions
// of bank-ledger.ts:
//   - deterministic resolvers (return the existing COA row or the exact row
//     to create, never guessing)
//   - balanced double-entry line builders (debits === credits)
//   - money as fixed decimal strings, computed in integer cents upstream
//
// Posting semantics (accrual):
//   invoice created  → Dr Accounts Receivable / Cr line revenue accounts
//   payment received → Dr receipt account (cash/bank by method) / Cr AR
//   invoice voided   → reversal entry (mirrored lines) of the invoice JE
//
// Journal entries reference-linked (`ar-inv-{id}`, `ar-pay-{id}`) so the
// unique (entityId, reference) index makes double-posting impossible.

/** Minimal COA row shape consumed by the resolvers (mirrors bank-ledger). */
export interface ArCoaRow {
  id: string;
  code: string;
  name: string;
  type: string;
  subtype: string;
}

export interface ArLedgerLine {
  accountId: string;
  debit: string;
  credit: string;
  description?: string;
}

/**
 * Resolve the entity's Accounts Receivable asset account. Deterministic:
 * named AR row wins, else any accounts_receivable row, else describe the
 * canonical row to create (code 1100 — the conventional AR slot).
 */
export function resolveArReceivableAccount(coa: ArCoaRow[]): {
  account?: ArCoaRow;
  toCreate?: ArCoaRow;
} {
  const arRows = coa.filter(
    (a) => a.subtype === "accounts_receivable" && a.type === "asset",
  );
  if (arRows.length > 0) return { account: arRows[0] };
  return {
    toCreate: {
      id: "",
      code: "1100",
      name: "Accounts Receivable",
      type: "asset",
      subtype: "accounts_receivable",
    },
  };
}

/**
 * Resolve the Dr side of an AR payment by method:
 *   cash            → cash subtype (else create "Cash on Hand" 1010)
 *   bank/mobile/…   → bank_account subtype (else create "Bank Account" 1020)
 * Card settlements live in the bank account until a payout is recorded.
 */
export function resolvePaymentReceiptAccount(
  coa: ArCoaRow[],
  method: string,
): { account?: ArCoaRow; toCreate?: ArCoaRow } {
  const wantsCash = method === "cash";
  const usable = coa.filter(
    (a) =>
      a.type === "asset" &&
      (wantsCash ? a.subtype === "cash" : a.subtype === "bank_account"),
  );
  if (usable.length > 0) return { account: usable[0] };
  return {
    toCreate: {
      id: "",
      code: wantsCash ? "1010" : "1020",
      name: wantsCash ? "Cash on Hand" : "Bank Account",
      type: "asset",
      subtype: wantsCash ? "cash" : "bank_account",
    },
  };
}

/**
 * Build the balanced lines for a sales invoice:
 *   Dr AR (invoice total) / Cr each line account (line amount).
 * `lines` = [{ accountId, cents, description }] — cents are integer, so the
 * stored strings are exact and the entry always balances to the cent.
 */
export function buildArInvoiceLines(
  arAccountId: string,
  lines: Array<{ accountId: string; cents: number; description: string }>,
): ArLedgerLine[] {
  const totalCents = lines.reduce((s, l) => s + l.cents, 0);
  const total = (totalCents / 100).toFixed(2);
  const out: ArLedgerLine[] = [
    {
      accountId: arAccountId,
      debit: total,
      credit: "0",
      description: "Invoice total",
    },
  ];
  for (const line of lines) {
    const amount = (line.cents / 100).toFixed(2);
    out.push({
      accountId: line.accountId,
      debit: "0",
      credit: amount,
      description: line.description,
    });
  }
  return out;
}

/**
 * Build the balanced lines for an AR payment:
 *   Dr receipt account (payment amount) / Cr AR (payment amount).
 */
export function buildArPaymentLines(
  receiptAccountId: string,
  arAccountId: string,
  amountCents: number,
  description: string,
): ArLedgerLine[] {
  const amount = (amountCents / 100).toFixed(2);
  return [
    {
      accountId: receiptAccountId,
      debit: amount,
      credit: "0",
      description,
    },
    { accountId: arAccountId, debit: "0", credit: amount, description },
  ];
}
