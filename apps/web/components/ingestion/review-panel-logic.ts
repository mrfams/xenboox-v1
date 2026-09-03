/**
 * Pure logic for the ingestion review panel — extracted so the gating
 * behavior (totals + balance check that enable/disable "Approve & Post")
 * is unit-testable without rendering React.
 */

export interface ReviewLine {
  debit: number;
  credit: number;
}

export function computeLineTotals(lines: ReviewLine[]): {
  totalDebit: number;
  totalCredit: number;
} {
  return lines.reduce(
    (acc, l) => ({
      totalDebit: acc.totalDebit + (l.debit || 0),
      totalCredit: acc.totalCredit + (l.credit || 0),
    }),
    { totalDebit: 0, totalCredit: 0 },
  );
}

/**
 * A double-entry entry is balanced when debits equal credits within a
 * one-cent tolerance (absorbs floating-point drift like 0.1 + 0.2).
 */
export function isBalanced(totalDebit: number, totalCredit: number): boolean {
  return Math.abs(totalDebit - totalCredit) <= 0.01;
}
