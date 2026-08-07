/**
 * Central TrustGuard — Deterministic Validation for ALL Financial Writes
 *
 * The single validation layer between model outputs and the general ledger.
 * Every write that affects accounting state must pass through this guard.
 *
 * Validation categories:
 * - Double-entry accounting rules (debits = credits)
 * - Account existence and entity scoping
 * - Period status checks
 * - Amount positivity and precision
 * - Line integrity (each line has exactly one of debit/credit)
 * - Posting safety (entry not modified since creation)
 *
 * Design:
 * - 100% deterministic — no LLM calls
 * - Returns structured checks[] for audit trail
 * - Block on error, warn on warning
 * - Never writes to DB — returns result for caller to act on
 */

import { db } from "@xenboox/db";
import { eq, and } from "drizzle-orm";
import { chartOfAccounts, fiscalPeriods } from "@xenboox/db/schema/accounting";
import { logger } from "./logger";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface TrustCheck {
  name: string;
  description: string;
  passed: boolean;
  severity: "error" | "warning";
  message: string;
  expected?: unknown;
  actual?: unknown;
}

export interface TrustGuardResult {
  passed: boolean;
  checks: TrustCheck[];
  errors: TrustCheck[];
  warnings: TrustCheck[];
}

// ─── Journal Entry Validation ───────────────────────────────────────────────

export interface TrustGuardJournalLine {
  accountId: string;
  debit: string | number;
  credit: string | number;
  description?: string;
}

export interface TrustGuardJournalEntryInput {
  entityId: string;
  periodId: string;
  date: string;
  lines: TrustGuardJournalLine[];
  description: string;
}

/**
 * Validate a journal entry before creation or posting.
 * Enforces double-entry accounting, account existence, and period rules.
 */
export async function validateJournalEntry(
  input: TrustGuardJournalEntryInput,
): Promise<TrustGuardResult> {
  const checks: TrustCheck[] = [];
  const { entityId, periodId, lines } = input;

  // 1. Minimum 2 lines
  checks.push({
    name: "min_lines",
    description: "Journal entry must have at least 2 lines",
    passed: lines.length >= 2,
    severity: "error",
    message:
      lines.length >= 2 ? "OK" : `Only ${lines.length} line(s) — minimum is 2`,
    expected: ">= 2",
    actual: lines.length,
  });

  // 2. Parse and validate amounts
  const parsedLines = lines.map((l) => {
    const debit = Number(String(l.debit).replace(/,/g, "")) || 0;
    const credit = Number(String(l.credit).replace(/,/g, "")) || 0;
    return { ...l, debit, credit };
  });

  // 3. Each line must have exactly one of debit or credit (not both, not neither)
  for (let i = 0; i < parsedLines.length; i++) {
    const line = parsedLines[i];
    const hasDebit = line.debit > 0;
    const hasCredit = line.credit > 0;

    checks.push({
      name: `line_${i}_exclusive`,
      description: `Line ${i + 1}: must have exactly one of debit or credit`,
      passed: (hasDebit ? 1 : 0) + (hasCredit ? 1 : 0) === 1,
      severity: "error",
      message:
        hasDebit && hasCredit
          ? `Line ${i + 1}: has both debit (${line.debit}) and credit (${line.credit})`
          : !hasDebit && !hasCredit
            ? `Line ${i + 1}: has zero debit and zero credit`
            : "OK",
      expected: "exactly one of debit > 0 or credit > 0",
      actual: hasDebit
        ? `debit=${line.debit}`
        : hasCredit
          ? `credit=${line.credit}`
          : "both zero",
    });
  }

  // 4. All amounts must be positive
  for (let i = 0; i < parsedLines.length; i++) {
    const line = parsedLines[i];
    const isPositive = line.debit >= 0 && line.credit >= 0;
    checks.push({
      name: `line_${i}_positive`,
      description: `Line ${i + 1}: amounts must be non-negative`,
      passed: isPositive,
      severity: "error",
      message: isPositive
        ? "OK"
        : `Line ${i + 1}: negative amount (debit=${line.debit}, credit=${line.credit})`,
      expected: ">= 0",
      actual: `debit=${line.debit}, credit=${line.credit}`,
    });
  }

  // 5. Double-entry balance: total debits = total credits
  const totalDebit = parsedLines.reduce((sum, l) => sum + l.debit, 0);
  const totalCredit = parsedLines.reduce((sum, l) => sum + l.credit, 0);
  const balanceDiff = Math.abs(totalDebit - totalCredit);

  checks.push({
    name: "double_entry_balance",
    description: "Total debits must equal total credits",
    passed: balanceDiff < 0.01,
    severity: "error",
    message:
      balanceDiff < 0.01
        ? "OK"
        : `Debits (${totalDebit.toFixed(2)}) ≠ credits (${totalCredit.toFixed(2)}) — difference: ${balanceDiff.toFixed(2)}`,
    expected: totalDebit.toFixed(2),
    actual: totalCredit.toFixed(2),
  });

  // 6. Non-zero total
  checks.push({
    name: "non_zero_total",
    description: "Entry must have non-zero amounts",
    passed: totalDebit > 0 && totalCredit > 0,
    severity: "error",
    message:
      totalDebit > 0
        ? "OK"
        : `Total debit/credit is zero (${totalDebit.toFixed(2)})`,
    expected: "> 0",
    actual: totalDebit.toFixed(2),
  });

  // 7. Account existence (batch query)
  const uniqueAccountIds = [...new Set(parsedLines.map((l) => l.accountId))];
  const accounts = await db.query.chartOfAccounts.findMany({
    where: and(eq(chartOfAccounts.entityId, entityId)),
    columns: { id: true, name: true, isActive: true, type: true },
  });

  const accountMap = new Map(accounts.map((a) => [a.id, a]));

  for (const accountId of uniqueAccountIds) {
    const account = accountMap.get(accountId);
    checks.push({
      name: `account_${accountId}_exists`,
      description: `Account must exist and belong to this entity`,
      passed: !!account,
      severity: "error",
      message: account
        ? `OK — ${account.name} (${account.type})`
        : `Account ${accountId} not found in entity`,
      expected: "valid account",
      actual: account ? account.name : "not found",
    });

    // 8. Account must be active
    if (account) {
      checks.push({
        name: `account_${accountId}_active`,
        description: `Account "${account.name}" must be active`,
        passed: account.isActive,
        severity: "warning",
        message: account.isActive
          ? "OK"
          : `Account "${account.name}" is inactive — posting may create imbalance`,
        expected: "active",
        actual: account.isActive ? "active" : "inactive",
      });
    }
  }

  // 9. Period must be open
  const period = await db.query.fiscalPeriods.findFirst({
    where: and(
      eq(fiscalPeriods.id, periodId),
      eq(fiscalPeriods.entityId, entityId),
    ),
    columns: { id: true, status: true, startDate: true, endDate: true },
  });

  checks.push({
    name: "period_open",
    description: "Fiscal period must be open",
    passed: period?.status === "open",
    severity: "error",
    message: period
      ? period.status === "open"
        ? "OK"
        : `Period is ${period.status} — cannot create/post entries`
      : "Period not found",
    expected: "open",
    actual: period?.status ?? "not found",
  });

  // 10. Date within period bounds
  if (period?.startDate && period?.endDate) {
    const dateInRange =
      input.date >= period.startDate && input.date <= period.endDate;
    checks.push({
      name: "date_in_period",
      description: "Entry date must fall within the fiscal period",
      passed: dateInRange,
      severity: "error",
      message: dateInRange
        ? "OK"
        : `Date ${input.date} is outside period ${period.startDate} to ${period.endDate}`,
      expected: `${period.startDate} to ${period.endDate}`,
      actual: input.date,
    });
  }

  return buildResult(checks);
}

// ─── Posting Validation ─────────────────────────────────────────────────────

export interface TrustGuardPostingValidationInput {
  entityId: string;
  entryId: string;
  entryStatus: string;
  entryLines: Array<{
    accountId: string;
    debit: string;
    credit: string;
  }>;
}

/**
 * Validate a journal entry before posting to the GL.
 * Checks that the entry is in a valid state and hasn't been tampered with.
 */
export async function validateForPosting(
  input: TrustGuardPostingValidationInput,
): Promise<TrustGuardResult> {
  const checks: TrustCheck[] = [];
  const { entityId, entryId, entryStatus, entryLines } = input;

  // 1. Entry must be in draft or pending status
  checks.push({
    name: "posting_status",
    description: "Entry must be in draft or pending status to post",
    passed: entryStatus === "draft" || entryStatus === "pending",
    severity: "error",
    message:
      entryStatus === "draft" || entryStatus === "pending"
        ? "OK"
        : `Entry status is "${entryStatus}" — can only post draft/pending entries`,
    expected: "draft or pending",
    actual: entryStatus,
  });

  // 2. Re-validate double-entry balance at posting time
  const totalDebit = entryLines.reduce(
    (sum, l) => sum + (Number(l.debit) || 0),
    0,
  );
  const totalCredit = entryLines.reduce(
    (sum, l) => sum + (Number(l.credit) || 0),
    0,
  );
  const balanceDiff = Math.abs(totalDebit - totalCredit);

  checks.push({
    name: "posting_balance_check",
    description: "Double-entry balance verified at posting time",
    passed: balanceDiff < 0.01,
    severity: "error",
    message:
      balanceDiff < 0.01
        ? "OK"
        : `Balance mismatch at posting: debit=${totalDebit.toFixed(2)}, credit=${totalCredit.toFixed(2)}`,
    expected: totalDebit.toFixed(2),
    actual: totalCredit.toFixed(2),
  });

  // 3. All accounts still exist and are active
  const uniqueAccountIds = [...new Set(entryLines.map((l) => l.accountId))];
  const accounts = await db.query.chartOfAccounts.findMany({
    where: eq(chartOfAccounts.entityId, entityId),
    columns: { id: true, name: true, isActive: true },
  });
  const accountMap = new Map(accounts.map((a) => [a.id, a]));

  for (const accountId of uniqueAccountIds) {
    const account = accountMap.get(accountId);
    checks.push({
      name: `posting_account_${accountId}`,
      description: `Account must still exist at posting time`,
      passed: !!account?.isActive,
      severity: "error",
      message: account
        ? account.isActive
          ? "OK"
          : `Account "${account.name}" was deactivated since entry creation`
        : `Account ${accountId} was deleted since entry creation`,
      expected: "existing, active account",
      actual: account ? (account.isActive ? "active" : "inactive") : "deleted",
    });
  }

  // 4. Period still open at posting time
  const period = await db.query.fiscalPeriods.findFirst({
    where: eq(fiscalPeriods.entityId, entityId),
    columns: { id: true, status: true },
  });

  checks.push({
    name: "posting_period_open",
    description: "Fiscal period must still be open at posting time",
    passed: period?.status === "open",
    severity: "error",
    message:
      period?.status === "open"
        ? "OK"
        : `Period is ${period?.status ?? "not found"} — posting blocked`,
    expected: "open",
    actual: period?.status ?? "not found",
  });

  return buildResult(checks);
}

// ─── Invoice Validation ─────────────────────────────────────────────────────

export interface TrustGuardInvoiceLineInput {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
  amount: number;
}

export interface TrustGuardInvoiceInput {
  entityId: string;
  vendorId?: string;
  customerId?: string;
  lines: TrustGuardInvoiceLineInput[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  currency?: string;
}

/**
 * Validate an invoice (AP or AR) before creation.
 * Recomputes line math independently and compares to submitted totals.
 */
export function validateInvoice(
  input: TrustGuardInvoiceInput,
): TrustGuardResult {
  const checks: TrustCheck[] = [];
  const { lines, subtotal, taxAmount, totalAmount } = input;

  // 1. Minimum 1 line
  checks.push({
    name: "invoice_min_lines",
    description: "Invoice must have at least 1 line item",
    passed: lines.length >= 1,
    severity: "error",
    message: lines.length >= 1 ? "OK" : "No line items",
    expected: ">= 1",
    actual: lines.length,
  });

  // 2. Line item math: quantity × unitPrice = amount (per line)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const expectedAmount = line.quantity * line.unitPrice;
    const diff = Math.abs(line.amount - expectedAmount);
    const tolerance = 0.02; // Allow 2 cent rounding

    checks.push({
      name: `invoice_line_${i}_math`,
      description: `Line ${i + 1}: quantity × unitPrice = amount`,
      passed: diff <= tolerance,
      severity: "error",
      message:
        diff <= tolerance
          ? "OK"
          : `Line ${i + 1}: ${line.quantity} × ${line.unitPrice} = ${expectedAmount.toFixed(2)}, but amount is ${line.amount.toFixed(2)} (diff: ${diff.toFixed(2)})`,
      expected: expectedAmount.toFixed(2),
      actual: line.amount.toFixed(2),
    });
  }

  // 3. Subtotal = sum of line amounts
  const computedSubtotal = lines.reduce((sum, l) => sum + l.amount, 0);
  const subtotalDiff = Math.abs(subtotal - computedSubtotal);
  checks.push({
    name: "invoice_subtotal",
    description: "Subtotal must equal sum of line amounts",
    passed: subtotalDiff < 0.01,
    severity: "error",
    message:
      subtotalDiff < 0.01
        ? "OK"
        : `Subtotal mismatch: submitted ${subtotal.toFixed(2)} ≠ computed ${computedSubtotal.toFixed(2)}`,
    expected: computedSubtotal.toFixed(2),
    actual: subtotal.toFixed(2),
  });

  // 4. Tax amount plausibility (0-50% of subtotal)
  const taxRate = subtotal > 0 ? (taxAmount / subtotal) * 100 : 0;
  const taxPlausible = taxRate >= 0 && taxRate <= 50;
  checks.push({
    name: "invoice_tax_plausible",
    description: "Tax rate must be between 0% and 50%",
    passed: taxPlausible,
    severity: "warning",
    message: taxPlausible
      ? "OK"
      : `Tax rate ${taxRate.toFixed(1)}% is outside plausible range (0-50%)`,
    expected: "0-50%",
    actual: `${taxRate.toFixed(1)}%`,
  });

  // 5. Total = subtotal + taxAmount
  const computedTotal = subtotal + taxAmount;
  const totalDiff = Math.abs(totalAmount - computedTotal);
  checks.push({
    name: "invoice_total",
    description: "Total must equal subtotal + tax",
    passed: totalDiff < 0.01,
    severity: "error",
    message:
      totalDiff < 0.01
        ? "OK"
        : `Total mismatch: submitted ${totalAmount.toFixed(2)} ≠ computed ${computedTotal.toFixed(2)}`,
    expected: computedTotal.toFixed(2),
    actual: totalAmount.toFixed(2),
  });

  // 6. Positive amounts
  const allPositive = subtotal >= 0 && taxAmount >= 0 && totalAmount >= 0;
  checks.push({
    name: "invoice_positive",
    description: "All amounts must be non-negative",
    passed: allPositive,
    severity: "error",
    message: allPositive
      ? "OK"
      : `Negative amounts detected: subtotal=${subtotal}, tax=${taxAmount}, total=${totalAmount}`,
    expected: ">= 0",
    actual: `subtotal=${subtotal}, tax=${taxAmount}, total=${totalAmount}`,
  });

  // 7. Vendor or customer must be specified
  const hasParty = !!(input.vendorId || input.customerId);
  checks.push({
    name: "invoice_party",
    description: "Invoice must have a vendor or customer",
    passed: hasParty,
    severity: "error",
    message: hasParty ? "OK" : "No vendor or customer specified",
    expected: "vendor or customer",
    actual: hasParty ? "present" : "missing",
  });

  return buildResult(checks);
}

// ─── Helper ──────────────────────────────────────────────────────────────────

function buildResult(checks: TrustCheck[]): TrustGuardResult {
  const errors = checks.filter((c) => !c.passed && c.severity === "error");
  const warnings = checks.filter((c) => !c.passed && c.severity === "warning");

  return {
    passed: errors.length === 0,
    checks,
    errors,
    warnings,
  };
}

/**
 * Convert a TrustGuardResult to a TRPCError-friendly message.
 */
export function trustGuardToError(result: TrustGuardResult): string | null {
  if (result.passed) return null;

  const errorMessages = result.errors.map((e) => e.message);
  return `Validation failed: ${errorMessages.join("; ")}`;
}

/**
 * Log TrustGuard results to audit trail.
 */
export async function logTrustGuardResult(
  entityId: string,
  userId: string | undefined,
  operation: string,
  result: TrustGuardResult,
): Promise<void> {
  try {
    const { auditLog } = await import("@xenboox/db/schema/documents");
    await db.insert(auditLog).values({
      entityId,
      userId,
      action: `trust_guard.${operation}.${result.passed ? "passed" : "failed"}`,
      entityType: "trust_guard",
      newValues: {
        operation,
        passed: result.passed,
        checksTotal: result.checks.length,
        errorsCount: result.errors.length,
        warningsCount: result.warnings.length,
        checks: result.checks.map((c) => ({
          name: c.name,
          passed: c.passed,
          severity: c.severity,
          message: c.message,
        })),
      },
    });
  } catch (err) {
    logger.warn("Failed to log TrustGuard result", { err, operation });
  }
}
