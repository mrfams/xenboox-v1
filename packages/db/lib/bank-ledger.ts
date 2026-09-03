// ─── Bank Transaction → General Ledger Propagation ─────────────────────────
//
// The missing link in Pipeline 2: categorized bank transactions must reach the
// general ledger. This module owns that transition:
//   - builds the balanced double-entry lines for a bank transaction
//   - resolves the bank account's GL asset account (creating it deterministically
//     when missing)
//   - resolves the category side (rule glAccountId wins, else name-based match)
//
// Conventions locked in Sub-Part B/C:
//   bank_transactions.amount = POSITIVE magnitude
//   bank_transactions.type   = deposit | withdrawal | transfer | fee | interest
//   categories use the canonical Title Case taxonomy (CANONICAL_CATEGORIES)

import type { BankTxType } from "./bank-amount";

export interface BankLedgerLine {
  accountId: string;
  debit: string;
  credit: string;
  description?: string;
}

export interface BankLedgerTx {
  id: string;
  description: string;
  amount: string; // positive magnitude
  type: BankTxType;
  transactionDate: string; // YYYY-MM-DD
}

/** Minimal COA row shape consumed by the resolvers. */
export interface CoaRow {
  id: string;
  code: string;
  name: string;
  type: string;
  subtype: string;
}

/**
 * Build the double-entry lines for a bank transaction.
 *
 *   deposit/interest  → Dr Bank GL  / Cr Category GL   (money in)
 *   withdrawal/fee    → Cr Bank GL  / Dr Category GL   (money out)
 *   transfer          → Cr Bank GL  / Dr Category GL   (between own accounts)
 *
 * Always balanced: debit total === credit total === amount.
 */
export function buildBankJournalLines(
  tx: Pick<BankLedgerTx, "amount" | "type" | "description">,
  bankGlAccountId: string,
  categoryGlAccountId: string,
): BankLedgerLine[] {
  const amount = String(Number(tx.amount).toFixed(2));
  const moneyIn = tx.type === "deposit" || tx.type === "interest";

  return moneyIn
    ? [
        {
          accountId: bankGlAccountId,
          debit: amount,
          credit: "0",
          description: tx.description,
        },
        {
          accountId: categoryGlAccountId,
          debit: "0",
          credit: amount,
          description: tx.description,
        },
      ]
    : [
        {
          accountId: categoryGlAccountId,
          debit: amount,
          credit: "0",
          description: tx.description,
        },
        {
          accountId: bankGlAccountId,
          debit: "0",
          credit: amount,
          description: tx.description,
        },
      ];
}

/**
 * Pick the COA row that represents a bank account, or the template to create
 * one. Deterministic resolution order:
 *   1. named bank_account row for this account
 *   2. any bank_account row (single-bank entities)
 * Returns `{ account }` when found, or `{ toCreate }` describing the row to
 * insert (code derived stably so repeat calls converge).
 */
export function resolveBankGlAccount(
  coa: CoaRow[],
  params: {
    bankAccountName: string;
    bankName?: string | null;
    key?: string | null;
  },
): { account?: CoaRow; toCreate?: CoaRow } {
  const bankRows = coa.filter(
    (a) => a.subtype === "bank_account" && a.type === "asset",
  );

  const named = bankRows.find(
    (a) =>
      a.name.toLowerCase().trim() ===
      params.bankAccountName.toLowerCase().trim(),
  );
  if (named) return { account: named };

  if (bankRows.length > 0) return { account: bankRows[0] };

  // Nothing exists — describe the deterministic row to create.
  const displayName =
    params.bankName &&
    !params.bankAccountName
      .toLowerCase()
      .includes(params.bankName.toLowerCase())
      ? `${params.bankName} - ${params.bankAccountName}`
      : params.bankAccountName;
  return {
    toCreate: {
      id: "", // caller assigns
      code: deriveBankCode(params.key ?? params.bankAccountName),
      name: displayName,
      type: "asset",
      subtype: "bank_account",
    },
  };
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Stable 4-digit COA code derived from a bank identity string. */
export function deriveBankCode(identity: string): string {
  let hash = 0;
  for (let i = 0; i < identity.length; i++) {
    hash = (hash * 31 + identity.charCodeAt(i)) >>> 0;
  }
  // 1020 base + 10..999 range, keeping asset ordering sane.
  return String(1020 + (hash % 900) + 10);
}

/**
 * Resolve the category side of the entry. Explicit rule glAccountId wins.
 * Otherwise match the canonical category name against the entity's COA
 * (expense/revenue accounts) case-insensitively. Returns null when
 * unresolvable — the caller must NOT invent an account.
 */
export function resolveCategoryGlAccount(
  coa: CoaRow[],
  params: {
    category: string | null;
    ruleGlAccountId?: string | null;
  },
): string | null {
  if (params.ruleGlAccountId) return params.ruleGlAccountId;
  if (!params.category || params.category === "Uncategorized") return null;

  const normalized = params.category.toLowerCase().trim();
  // Never map a category to an asset/liability/equity account — the category
  // side of a bank entry is always an income/expense account.
  const usableTypes = new Set([
    "expense",
    "revenue",
    "income",
    "other_income",
    "other_expense",
    "cost_of_goods_sold",
    "payroll_expense",
    "tax_expense",
    "interest_expense",
    "interest_income",
    "sales_revenue",
    "service_revenue",
  ]);
  const usable = coa.filter((a) => usableTypes.has(a.type));
  if (usable.length === 0) return null;

  // Exact name match first (income/expense accounts only).
  const exact = usable.find((a) => a.name.toLowerCase().trim() === normalized);
  if (exact) return exact.id;

  // Substring match on usable account types (e.g. "Bank Fees" → account
  // named "Bank Fees Expense").
  const containsFull = usable.find((a) =>
    a.name.toLowerCase().includes(normalized),
  );
  if (containsFull) return containsFull.id;

  // Token match for compound categories: "Rent & Lease" → "Rent Expense".
  // Structural words (bank/account/expense/revenue/income) are stripped so a
  // generic fragment can't hijack the match ("bank" in "Bank Account" → no
  // match; "Rent & Lease" → "rent" in "Rent Expense" → match).
  const STRUCTURAL_WORDS = new Set([
    "bank",
    "account",
    "expense",
    "revenue",
    "income",
    "fees",
  ]);
  const tokens = normalized
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 4 && !STRUCTURAL_WORDS.has(t))
    .sort((a, b) => b.length - a.length);
  for (const token of tokens) {
    const re = new RegExp(`\\b${escapeRegExp(token)}\\b`);
    const tokenMatch = usable.find((a) => re.test(a.name.toLowerCase()));
    if (tokenMatch) return tokenMatch.id;
  }

  return null;
}
