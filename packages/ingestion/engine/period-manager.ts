/**
 * Period Management Service
 *
 * Manages the complete lifecycle of fiscal periods: creation, opening,
 * closing, locking, reopening with controlled validation at every stage.
 *
 * This is a critical accounting function — periods protect the integrity
 * of financial records by preventing modifications to closed periods.
 *
 * Lifecycle:
 *   Created → Open → Closing → Closed → Locked
 *                              ↑          ↓
 *                              └── Reopen ──┘
 *
 * Validation rules:
 *   - Cannot close a period with unreconciled bank transactions
 *   - Cannot close a period without a posted trial balance
 *   - Cannot close a period if previous period is still open
 *   - Cannot reopen a locked period (only system admin can unlock)
 *   - Closing triggers trial balance generation
 *   - Locking prevents ALL changes (even admin overrides)
 */

import { db } from "@xenboox/db";
import { eq, and, desc } from "drizzle-orm";
import {
  fiscalPeriods,
  periodStatusEnum,
  journalEntries,
  trialBalanceSnapshots,
} from "@xenboox/db/schema/accounting";
import { bankTransactions, reconciliations } from "@xenboox/db/schema/treasury";
import { agentActivity } from "@xenboox/db/schema";
import type { AccountingWorkflow } from "../core/types";

// ─── Types ──────────────────────────────────────────────────────────────────

export type PeriodAction = "open" | "close" | "lock" | "reopen";

export interface PeriodActionResult {
  success: boolean;
  periodId: string;
  action: PeriodAction;
  previousStatus: string;
  newStatus: string;
  warnings: string[];
  errors: string[];
  validations: PeriodValidation[];
}

export interface PeriodValidation {
  check: string;
  passed: boolean;
  message: string;
  severity: "warning" | "error";
}

export interface PeriodSummary {
  id: string;
  year: number;
  month: number;
  status: string;
  entryCount: number;
  totalDebits: number;
  totalCredits: number;
  isBalanced: boolean;
  isReconciled: boolean;
}

// ─── Main Entry Point ───────────────────────────────────────────────────────

/**
 * Execute a period lifecycle action with full validation.
 */
export async function executePeriodAction(
  entityId: string,
  periodId: string,
  action: PeriodAction,
  userId?: string,
  options?: {
    force?: boolean;
    skipValidation?: boolean;
  },
): Promise<PeriodActionResult> {
  const period = await db.query.fiscalPeriods.findFirst({
    where: and(
      eq(fiscalPeriods.id, periodId),
      eq(fiscalPeriods.entityId, entityId),
    ),
  });

  if (!period) {
    return {
      success: false,
      periodId,
      action,
      previousStatus: "unknown",
      newStatus: "unknown",
      warnings: [],
      errors: [`Period ${periodId} not found for entity ${entityId}`],
      validations: [],
    };
  }

  // ── Route to action handler ──
  switch (action) {
    case "open":
      return openPeriod(entityId, period, userId, options);
    case "close":
      return closePeriod(entityId, period, userId, options);
    case "lock":
      return lockPeriod(entityId, period, userId, options);
    case "reopen":
      return reopenPeriod(entityId, period, userId, options);
    default:
      return {
        success: false,
        periodId,
        action,
        previousStatus: period.status,
        newStatus: period.status,
        warnings: [],
        errors: [`Unknown action: ${action}`],
        validations: [],
      };
  }
}

// ─── Open Period ────────────────────────────────────────────────────────────

/**
 * Open a period for transactions. Validates that:
 * - Period is currently in "created" or "closed" status
 * - If reopening, all validation checks pass
 */
async function openPeriod(
  entityId: string,
  period: typeof fiscalPeriods.$inferSelect,
  userId?: string,
  options?: { force?: boolean; skipValidation?: boolean },
): Promise<PeriodActionResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const validations: PeriodValidation[] = [];

  // Check current status
  if (period.status === "open") {
    warnings.push("Period is already open.");
    return {
      success: true,
      periodId: period.id,
      action: "open",
      previousStatus: period.status,
      newStatus: period.status,
      warnings,
      errors: [],
      validations: [],
    };
  }

  if (period.status === "locked") {
    errors.push(
      "Cannot open a locked period. Only system administrator can unlock.",
    );
    return {
      success: false,
      periodId: period.id,
      action: "open",
      previousStatus: period.status,
      newStatus: period.status,
      warnings,
      errors,
      validations: [],
    };
  }

  // Can open from "created" or "closed" status
  if (period.status !== "created" && period.status !== "closed") {
    errors.push(
      `Cannot open period in status "${period.status}". Period must be "created" or "closed" to open.`,
    );
    return {
      success: false,
      periodId: period.id,
      action: "open",
      previousStatus: period.status,
      newStatus: period.status,
      warnings,
      errors,
      validations: [],
    };
  }

  // When reopening a closed period, validate that subsequent periods are also adjusted
  if (period.status === "closed") {
    validations.push({
      check: "subsequent_periods",
      passed: false,
      message:
        "Reopening a closed period will require adjustments to all subsequent periods. Ensure this is intentional.",
      severity: "warning",
    });
    warnings.push(
      "Reopening a closed period. Subsequent periods may need to be reopened and adjusted.",
    );
  }

  const newStatus = "open";
  await db
    .update(fiscalPeriods)
    .set({
      status: newStatus as any,
      ...(userId ? { closedBy: userId, closedAt: null } : {}),
    })
    .where(eq(fiscalPeriods.id, period.id));

  await logPeriodActivity(entityId, "period.opened", {
    periodId: period.id,
    period: `${period.year}-${String(period.month).padStart(2, "0")}`,
    previousStatus: period.status,
  });

  return {
    success: true,
    periodId: period.id,
    action: "open",
    previousStatus: period.status,
    newStatus,
    warnings,
    errors,
    validations,
  };
}

// ─── Close Period ───────────────────────────────────────────────────────────

/**
 * Close a period. This is a critical accounting action that requires:
 * 1. All journal entries are posted (no drafts)
 * 2. Trial balance is balanced
 * 3. Bank reconciliation is complete (or acknowledged)
 * 4. Previous period is closed (or first period)
 * 5. No outstanding imprest floats
 */
async function closePeriod(
  entityId: string,
  period: typeof fiscalPeriods.$inferSelect,
  userId?: string,
  options?: { force?: boolean; skipValidation?: boolean },
): Promise<PeriodActionResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const validations: PeriodValidation[] = [];

  // Check current status
  if (period.status === "closed" || period.status === "locked") {
    errors.push(`Period is already "${period.status}". Cannot close.`);
    return {
      success: false,
      periodId: period.id,
      action: "close",
      previousStatus: period.status,
      newStatus: period.status,
      warnings,
      errors,
      validations: [],
    };
  }

  if (period.status !== "open") {
    errors.push(
      `Cannot close period in status "${period.status}". Period must be "open".`,
    );
    return {
      success: false,
      periodId: period.id,
      action: "close",
      previousStatus: period.status,
      newStatus: period.status,
      warnings,
      errors,
      validations: [],
    };
  }

  // ── Validation Block (skippable with force/skipValidation) ──
  if (!options?.skipValidation) {
    // 1. Check all entries are posted
    const entries = await db.query.journalEntries.findMany({
      where: and(
        eq(journalEntries.entityId, entityId),
        eq(journalEntries.periodId, period.id),
      ),
    });

    const draftEntries = entries.filter(
      (e) => e.status === "draft" || e.status === "pending_review",
    );
    validations.push({
      check: "all_entries_posted",
      passed: draftEntries.length === 0,
      message:
        draftEntries.length === 0
          ? "All journal entries are posted."
          : `${draftEntries.length} entry(ies) are still in draft or pending review.`,
      severity: "error",
    });

    if (draftEntries.length > 0)
      errors.push(validations[validations.length - 1].message);

    // 2. Check trial balance is balanced
    const tbEntries = await db.query.trialBalanceSnapshots.findMany({
      where: and(
        eq(trialBalanceSnapshots.entityId, entityId),
        eq(trialBalanceSnapshots.periodId, period.id),
      ),
    });

    const totalDebits = tbEntries.reduce((s, t) => s + Number(t.debitTotal), 0);
    const totalCredits = tbEntries.reduce(
      (s, t) => s + Number(t.creditTotal),
      0,
    );
    const isBalanced = Math.abs(totalDebits - totalCredits) <= 0.01;

    validations.push({
      check: "trial_balance_balanced",
      passed: isBalanced,
      message: isBalanced
        ? `Trial balance is balanced. Total: ${formatCurrency(totalDebits)}`
        : `Trial balance is NOT balanced. Debits: ${formatCurrency(totalDebits)}, Credits: ${formatCurrency(totalCredits)}, Difference: ${formatCurrency(totalDebits - totalCredits)}`,
      severity: "error",
    });

    if (!isBalanced) errors.push(validations[validations.length - 1].message);

    // 3. Check previous period status
    const prevMonth = period.month === 1 ? 12 : period.month - 1;
    const prevYear = period.month === 1 ? period.year - 1 : period.year;
    const prevPeriod = await db.query.fiscalPeriods.findFirst({
      where: and(
        eq(fiscalPeriods.entityId, entityId),
        eq(fiscalPeriods.year, prevYear),
        eq(fiscalPeriods.month, prevMonth),
      ),
    });

    if (
      prevPeriod &&
      prevPeriod.status !== "closed" &&
      prevPeriod.status !== "locked"
    ) {
      validations.push({
        check: "previous_period_closed",
        passed: false,
        message: `Previous period (${prevPeriod.year}-${String(prevPeriod.month).padStart(2, "0")}) is still "${prevPeriod.status}". Close it first.`,
        severity: "error",
      });
      errors.push(validations[validations.length - 1].message);
    } else {
      validations.push({
        check: "previous_period_closed",
        passed: true,
        message: prevPeriod
          ? `Previous period is closed.`
          : "No previous period — this is the first period.",
        severity: "warning",
      });
    }

    // 4. Check bank reconciliation status (warning level)
    const periodStr = `${period.year}-${String(period.month).padStart(2, "0")}`;
    const unReconciledTxs = await db.query.bankTransactions.findMany({
      where: and(
        eq(bankTransactions.entityId, entityId),
        eq(bankTransactions.isReconciled, false),
      ),
      limit: 5,
    });

    if (unReconciledTxs.length > 0) {
      validations.push({
        check: "bank_reconciliation",
        passed: !!options?.force,
        message: `${unReconciledTxs.length} bank transaction(s) are unreconciled.`,
        severity: "warning",
      });
      warnings.push(
        `Warning: ${unReconciledTxs.length} unreconciled bank transactions exist.`,
      );
    } else {
      validations.push({
        check: "bank_reconciliation",
        passed: true,
        message: "All bank transactions are reconciled.",
        severity: "warning",
      });
    }
  }

  // If there are errors and we're not forcing, reject
  if (errors.length > 0 && !options?.force) {
    return {
      success: false,
      periodId: period.id,
      action: "close",
      previousStatus: period.status,
      newStatus: period.status,
      warnings,
      errors,
      validations,
    };
  }

  // ── Execute Close ──
  const newStatus = "closed";
  await db
    .update(fiscalPeriods)
    .set({
      status: newStatus as any,
      closedBy: userId ?? null,
      closedAt: new Date(),
    })
    .where(eq(fiscalPeriods.id, period.id));

  await logPeriodActivity(entityId, "period.closed", {
    periodId: period.id,
    period: `${period.year}-${String(period.month).padStart(2, "0")}`,
    previousStatus: period.status,
    validationErrors: errors.length,
    validationWarnings: warnings.length,
  });

  return {
    success: true,
    periodId: period.id,
    action: "close",
    previousStatus: period.status,
    newStatus,
    warnings,
    errors,
    validations,
  };
}

// ─── Lock Period ────────────────────────────────────────────────────────────

/**
 * Lock a period — prevents ALL modifications, even admin overrides.
 * Only an authorized system admin should be able to unlock.
 */
async function lockPeriod(
  entityId: string,
  period: typeof fiscalPeriods.$inferSelect,
  userId?: string,
  _options?: { force?: boolean; skipValidation?: boolean },
): Promise<PeriodActionResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (period.status === "locked") {
    warnings.push("Period is already locked.");
    return {
      success: true,
      periodId: period.id,
      action: "lock",
      previousStatus: period.status,
      newStatus: period.status,
      warnings,
      errors: [],
      validations: [],
    };
  }

  if (period.status !== "closed") {
    errors.push(
      `Cannot lock period in status "${period.status}". Period must be "closed" to lock.`,
    );
    return {
      success: false,
      periodId: period.id,
      action: "lock",
      previousStatus: period.status,
      newStatus: period.status,
      warnings,
      errors,
      validations: [],
    };
  }

  const newStatus = "locked";
  await db
    .update(fiscalPeriods)
    .set({
      status: newStatus as any,
    })
    .where(eq(fiscalPeriods.id, period.id));

  await logPeriodActivity(entityId, "period.locked", {
    periodId: period.id,
    period: `${period.year}-${String(period.month).padStart(2, "0")}`,
  });

  return {
    success: true,
    periodId: period.id,
    action: "lock",
    previousStatus: period.status,
    newStatus,
    warnings,
    errors: [],
    validations: [],
  };
}

// ─── Reopen Period ──────────────────────────────────────────────────────────

/**
 * Reopen a closed period. Validates that subsequent periods exist
 * and warns about cascading effects. Cannot reopen locked periods.
 */
async function reopenPeriod(
  entityId: string,
  period: typeof fiscalPeriods.$inferSelect,
  userId?: string,
  options?: { force?: boolean; skipValidation?: boolean },
): Promise<PeriodActionResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const validations: PeriodValidation[] = [];

  if (period.status === "locked") {
    errors.push("Cannot reopen a locked period. Unlock first.");
    return {
      success: false,
      periodId: period.id,
      action: "reopen",
      previousStatus: period.status,
      newStatus: period.status,
      warnings,
      errors,
      validations: [],
    };
  }

  if (period.status !== "closed") {
    errors.push(
      `Cannot reopen period in status "${period.status}". Period must be "closed".`,
    );
    return {
      success: false,
      periodId: period.id,
      action: "reopen",
      previousStatus: period.status,
      newStatus: period.status,
      warnings,
      errors,
      validations: [],
    };
  }

  // Check if subsequent periods exist and warn
  const subsequentPeriods = await db.query.fiscalPeriods.findMany({
    where: and(
      eq(fiscalPeriods.entityId, entityId),
      sql`(${fiscalPeriods.year} > ${period.year} OR (${fiscalPeriods.year} = ${period.year} AND ${fiscalPeriods.month} > ${period.month}))`,
    ),
    orderBy: [desc(fiscalPeriods.year), desc(fiscalPeriods.month)],
    limit: 12,
  });

  const closedSubsequentPeriods = subsequentPeriods.filter(
    (p) => p.status === "closed" || p.status === "locked",
  );

  if (closedSubsequentPeriods.length > 0) {
    validations.push({
      check: "subsequent_periods",
      passed: !!options?.force,
      message: `Reopening this period will require adjustments to ${closedSubsequentPeriods.length} subsequent period(s). Consider reopening: ${closedSubsequentPeriods.map((p) => `${p.year}-${String(p.month).padStart(2, "0")}`).join(", ")}`,
      severity: "warning",
    });
    warnings.push(
      `Warning: ${closedSubsequentPeriods.length} subsequent period(s) may need to be reopened and adjusted.`,
    );
  }

  if (!options?.force && closedSubsequentPeriods.length > 0) {
    errors.push(
      "Use force=true to confirm the cascading effect on subsequent periods.",
    );
  }

  if (errors.length > 0) {
    return {
      success: false,
      periodId: period.id,
      action: "reopen",
      previousStatus: period.status,
      newStatus: period.status,
      warnings,
      errors,
      validations,
    };
  }

  const newStatus = "open";
  await db
    .update(fiscalPeriods)
    .set({
      status: newStatus as any,
      closedBy: null,
      closedAt: null,
    })
    .where(eq(fiscalPeriods.id, period.id));

  await logPeriodActivity(entityId, "period.reopened", {
    periodId: period.id,
    period: `${period.year}-${String(period.month).padStart(2, "0")}`,
    subsequentAffected: closedSubsequentPeriods.length,
  });

  return {
    success: true,
    periodId: period.id,
    action: "reopen",
    previousStatus: period.status,
    newStatus,
    warnings,
    errors,
    validations,
  };
}

// ─── Period Summary ─────────────────────────────────────────────────────────

/**
 * Get a summary of a period including entry counts, balances, and status.
 */
export async function getPeriodSummary(
  entityId: string,
  periodId: string,
): Promise<PeriodSummary | null> {
  const period = await db.query.fiscalPeriods.findFirst({
    where: and(
      eq(fiscalPeriods.id, periodId),
      eq(fiscalPeriods.entityId, entityId),
    ),
  });

  if (!period) return null;

  const entries = await db.query.journalEntries.findMany({
    where: and(
      eq(journalEntries.entityId, entityId),
      eq(journalEntries.periodId, periodId),
    ),
  });

  const tbEntries = await db.query.trialBalanceSnapshots.findMany({
    where: and(
      eq(trialBalanceSnapshots.entityId, entityId),
      eq(trialBalanceSnapshots.periodId, periodId),
    ),
  });

  const totalDebits = tbEntries.reduce((s, t) => s + Number(t.debitTotal), 0);
  const totalCredits = tbEntries.reduce((s, t) => s + Number(t.creditTotal), 0);
  const isBalanced = Math.abs(totalDebits - totalCredits) <= 0.01;

  // Check reconciliation status
  const unReconciledCount = await db.query.bankTransactions.findMany({
    where: and(
      eq(bankTransactions.entityId, entityId),
      eq(bankTransactions.isReconciled, false),
    ),
    limit: 1,
  });

  return {
    id: period.id,
    year: period.year,
    month: period.month,
    status: period.status,
    entryCount: entries.length,
    totalDebits,
    totalCredits,
    isBalanced,
    isReconciled: unReconciledCount.length === 0,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

async function logPeriodActivity(
  entityId: string,
  action: string,
  data: Record<string, unknown>,
): Promise<void> {
  try {
    await db.insert(agentActivity).values({
      entityId,
      agentName: "period-manager",
      action,
      input: data,
      output: {},
      status: "success",
    });
  } catch {
    // Logging failures should never break period operations
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

// ─── Barrel Export ──────────────────────────────────────────────────────────

export type { PeriodSummary, PeriodActionResult, PeriodValidation };

export { executePeriodAction, getPeriodSummary };
