/**
 * Bank Statement Deterministic Validation
 *
 * Pure, DB-agnostic checks that catch garbage extraction BEFORE rows are
 * written to the ledger. These are the TrustGuard for statement imports:
 * we never trust extracted rows just because the parser "found" them —
 * the numbers must reconcile.
 *
 * Two complementary checks:
 *  1. balanceEquationError — the gold standard: when a statement declares
 *     opening/closing balances, `opening + credits - debits` must equal the
 *     closing balance (within tolerance).
 *  2. runningBalanceIssues — the fallback when opening/closing are absent:
 *     each row's running balance must equal the previous row's ± its amount.
 */

export interface BalanceRow {
  amount: number;
  type: "credit" | "debit";
  balance?: number;
}

const toleranceFor = (balance: number): number =>
  Math.max(0.01, Math.abs(balance) * 0.001); // ≥ 1 cent, or 0.1% of balance

/**
 * Returns an error message when the statement's declared balances don't
 * reconcile with the extracted rows, or undefined when they do (or when
 * opening/closing balances aren't available to check).
 */
export function balanceEquationError(opts: {
  openingBalance?: number;
  closingBalance?: number;
  totalCredits: number;
  totalDebits: number;
}): string | undefined {
  const { openingBalance, closingBalance, totalCredits, totalDebits } = opts;
  if (openingBalance === undefined || closingBalance === undefined) {
    return undefined;
  }

  const expectedClosing = openingBalance + totalCredits - totalDebits;
  const diff = Math.abs(expectedClosing - closingBalance);

  if (diff > toleranceFor(closingBalance)) {
    return (
      `Balance equation mismatch: opening (${openingBalance}) + credits (${totalCredits}) - debits (${totalDebits}) = ${expectedClosing.toFixed(2)}, ` +
      `but closing balance is ${closingBalance}. Difference: ${diff.toFixed(2)}`
    );
  }
  return undefined;
}

/**
 * Checks the internal running-balance consistency of consecutive rows.
 *
 * Returns:
 *  - fatal:   an inconsistency RATE above 10% — extraction is likely garbage.
 *  - warnings: a few inconsistent rows — review, but not block-worthy.
 */
export function runningBalanceIssues(rows: BalanceRow[]): {
  fatal: string[];
  warnings: string[];
} {
  const fatal: string[] = [];
  const warnings: string[] = [];

  let withBalance = 0;
  let inconsistent = 0;

  for (let i = 1; i < rows.length; i++) {
    const prev = rows[i - 1]!;
    const cur = rows[i]!;
    if (prev.balance === undefined || cur.balance === undefined) continue;
    withBalance++;

    const expected =
      cur.type === "debit"
        ? prev.balance - cur.amount
        : prev.balance + cur.amount;
    const diff = Math.abs(expected - cur.balance);

    if (diff > toleranceFor(cur.balance)) inconsistent++;
  }

  if (withBalance > 0 && inconsistent > 0) {
    const rate = inconsistent / withBalance;
    const detail =
      `Running balance is inconsistent in ${inconsistent} of ${withBalance} consecutive rows ` +
      `(${(rate * 100).toFixed(0)}%) — the extracted amounts may be wrong.`;
    if (rate > 0.1) {
      fatal.push(detail);
    } else {
      warnings.push(detail + " Please review before posting.");
    }
  }

  return { fatal, warnings };
}
