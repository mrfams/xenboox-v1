// Bank Transaction Amount Convention
//
// Canonical storage: `bank_transactions.amount` is a POSITIVE magnitude and
// the `type` column carries direction:
//   deposit / interest  → money in  (+)
//   withdrawal / transfer / fee → money out (−)
//
// This matches every writer (seeds, demo generator, Plaid/Mono sync after the
// direction fix, statement import, treasury manual entry). Readers must NEVER
// infer direction from the sign of the stored amount — derive it from `type`.
//
// This module is the single source of truth for that derivation, shared by
// the web routers, jobs, and agents.

export type BankTxType =
  | "deposit"
  | "withdrawal"
  | "transfer"
  | "fee"
  | "interest";

const MONEY_IN_TYPES = new Set<BankTxType>(["deposit", "interest"]);

/** True when the transaction type represents money flowing into the account. */
export function isMoneyIn(type: string | null | undefined): boolean {
  return MONEY_IN_TYPES.has(type as BankTxType);
}

/**
 * Signed amount for a transaction: positive for money in, negative for money
 * out. Accepts the stored (magnitude) amount string or number.
 */
export function signedBankAmount(
  type: string | null | undefined,
  amount: string | number,
): number {
  const magnitude = Math.abs(Number(amount) || 0);
  return isMoneyIn(type) ? magnitude : -magnitude;
}
