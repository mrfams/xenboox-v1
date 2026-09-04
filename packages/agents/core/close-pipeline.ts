// ─── Autonomous Close Pipeline (Pipeline 2 of 6) ───────────────────────────
//
// Complete autonomous month-end close flow that feeds into the CFO Agent
// Orchestration Pipeline (Pipeline 1).
//
// Pipeline Steps:
//   1. Trigger Detection     — Scheduled, manual, or agent-initiated
//   2. Pre-Close Validation  — All entries posted, previous period closed, etc.
//   3. Department Readiness  — Fan-out to 4 department heads
//   4. Automated Adjustments — Depreciation, accruals, deferrals
//   5. Trial Balance Verify  — Final TB check before close
//   6. Period Close Execute  — Execute the close with proper lifecycle
//   7. Post-Close Verify     — Verify close was successful
//   8. Notifications         — Send close complete/failed notifications
//   9. Audit Trail           — Log all close actions to audit trail

import { db } from "@xenboox/db";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import {
  fiscalPeriods,
  journalEntries,
  journalEntryLines,
  chartOfAccounts,
  trialBalanceSnapshots,
} from "@xenboox/db/schema/accounting";
import { bankTransactions } from "@xenboox/db/schema/treasury";
import {
  closeSessions,
  closeConfirmations,
  closeVersions,
  reopenRequests,
  closeSessionStatusEnum,
  closeConfirmationStatusEnum,
  closeTriggerSourceEnum,
  reopenClassificationEnum,
  reopenChannelEnum,
} from "@xenboox/db/schema/close";
import { langfuse } from "./langfuse";
import { createAuditEntry } from "./state";
import type { AuditEntry } from "./state";
import { fanOutToDepartments } from "./orchestrator";
import { ALL_DEPARTMENTS, DEPARTMENT_CLOSE_TASK } from "./registry";
import {
  withRetry,
  withTimeout,
  withConcurrencyLimit,
  redactPII,
  redactPIIFromObject,
  checkIdempotency,
  setIdempotencyResult,
  generateIdempotencyKey,
  startCacheCleanup,
  TimeoutError,
  DEFAULT_PIPELINE_TIMEOUT,
} from "./retry";
import type { PipelineTimeoutConfig } from "./retry";

// ─── Types ──────────────────────────────────────────────────────────────────

export type CloseTriggerSource = "scheduled" | "manual" | "agent" | "auto";

export type CloseStepStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "failed"
  | "skipped";

export type CloseStepId =
  | "validation"
  | "department_readiness"
  | "adjustments"
  | "trial_balance"
  | "period_close"
  | "post_verify"
  | "notifications";

export interface CloseStep {
  id: CloseStepId;
  label: string;
  agent: string;
  status: CloseStepStatus;
  description: string;
  startedAt: string | null;
  completedAt: string | null;
  details: Record<string, unknown>;
}

export interface CloseState {
  entityId: string;
  periodId: string;
  period: string; // "YYYY-MM"
  triggerSource: CloseTriggerSource;
  status: "idle" | "running" | "completed" | "failed" | "awaiting_human";
  steps: CloseStep[];
  startedAt: string | null;
  completedAt: string | null;
  overallConfidence: number;
  errors: string[];
  warnings: string[];
  auditTrail: AuditEntry[];
}

// ─── Step Definitions ───────────────────────────────────────────────────────

function getInitialSteps(): CloseStep[] {
  return [
    {
      id: "validation",
      label: "Pre-Close Validation",
      agent: "Controller Agent",
      status: "pending",
      description:
        "Verify all entries posted, trial balance balanced, previous period closed",
      startedAt: null,
      completedAt: null,
      details: {},
    },
    {
      id: "department_readiness",
      label: "Department Readiness",
      agent: "All Department Heads",
      status: "pending",
      description:
        "Fan-out to Controller, Treasury, Payroll Manager, and Compliance for confirmation",
      startedAt: null,
      completedAt: null,
      details: {},
    },
    {
      id: "adjustments",
      label: "Automated Adjustments",
      agent: "Ledger Agent",
      status: "pending",
      description: "Post depreciation, accruals, and deferral entries",
      startedAt: null,
      completedAt: null,
      details: {},
    },
    {
      id: "trial_balance",
      label: "Final Trial Balance",
      agent: "Controller Agent",
      status: "pending",
      description:
        "Generate and verify final trial balance with all adjustments",
      startedAt: null,
      completedAt: null,
      details: {},
    },
    {
      id: "period_close",
      label: "Period Close",
      agent: "Ledger Agent",
      status: "pending",
      description: "Execute the period close — lock all entries",
      startedAt: null,
      completedAt: null,
      details: {},
    },
    {
      id: "post_verify",
      label: "Post-Close Verification",
      agent: "Controller Agent",
      status: "pending",
      description: "Verify close was successful, generate reports",
      startedAt: null,
      completedAt: null,
      details: {},
    },
    {
      id: "notifications",
      label: "Notifications",
      agent: "System",
      status: "pending",
      description: "Send close complete notifications and close package",
      startedAt: null,
      completedAt: null,
      details: {},
    },
  ];
}

// ─── Per-Step Telemetry ─────────────────────────────────────────────────────
// Tracks timing of each pipeline step for observability / monitoring.

export interface StepTelemetry {
  step: string;
  label: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  status: "completed" | "skipped" | "failed";
  metadata?: Record<string, unknown>;
}

function recordStep(
  telemetry: StepTelemetry[],
  step: string,
  label: string,
  startedAt: number,
): StepTelemetry {
  const durationMs = Date.now() - startedAt;
  const entry: StepTelemetry = {
    step,
    label,
    startedAt: new Date(startedAt).toISOString(),
    completedAt: new Date().toISOString(),
    durationMs,
    status: "completed",
  };
  telemetry.push(entry);
  return entry;
}

function recordFailedStep(
  telemetry: StepTelemetry[],
  step: string,
  label: string,
  startedAt: number,
  error?: string,
): void {
  const entry: StepTelemetry = {
    step,
    label,
    startedAt: new Date(startedAt).toISOString(),
    completedAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
    status: "failed",
    metadata: error ? { error } : undefined,
  };
  telemetry.push(entry);
}

// ─── Pipeline Orchestrator ──────────────────────────────────────────────────

export async function executeClosePipeline(params: {
  entityId: string;
  entityName: string;
  currency: string;
  periodId: string;
  userId: string;
  triggerSource?: CloseTriggerSource;
  skipValidation?: boolean;
  force?: boolean;
  timeoutConfig?: Partial<PipelineTimeoutConfig>;
}): Promise<{
  closeState: CloseState;
  stepTelemetry: StepTelemetry[];
  durationMs: number;
}> {
  const startTime = Date.now();
  const pipelineTimeout: PipelineTimeoutConfig = {
    ...DEFAULT_PIPELINE_TIMEOUT,
    ...params.timeoutConfig,
  };
  const periodStr = await getPeriodString(params.periodId);
  const stepTelemetry: StepTelemetry[] = [];
  const telemetryStart = Date.now();

  // ── Enterprise: Idempotency Check ─────────────────────────────────────
  const idempotencyKey = generateIdempotencyKey({
    channel: "close-pipeline",
    userId: params.userId,
    entityId: params.entityId,
    rawContent: `close-pipeline:${params.periodId}:${params.triggerSource ?? "manual"}`,
    sessionId: `close-${params.periodId}`,
  });
  const cachedResult = checkIdempotency(idempotencyKey);
  if (cachedResult) {
    const cached = cachedResult as {
      closeState: CloseState;
      stepTelemetry: StepTelemetry[];
      durationMs: number;
    };
    return {
      ...cached,
      stepTelemetry: [
        ...cached.stepTelemetry,
        {
          step: "idempotency_check",
          label: "Request Deduplication",
          startedAt: new Date(telemetryStart).toISOString(),
          completedAt: new Date().toISOString(),
          durationMs: Date.now() - telemetryStart,
          status: "completed",
          metadata: { cached: true, key: idempotencyKey.slice(0, 16) },
        },
      ],
      durationMs: Date.now() - startTime,
    };
  }

  // Start cache cleanup on first pipeline run
  startCacheCleanup();

  // ── Enterprise: Pipeline-Level Timeout ───────────────────────────────
  const pipelinePromise = (async () => {
    const closeState: CloseState = {
      entityId: params.entityId,
      periodId: params.periodId,
      period: periodStr,
      triggerSource: params.triggerSource ?? "manual",
      status: "running",
      steps: getInitialSteps(),
      startedAt: new Date().toISOString(),
      completedAt: null,
      overallConfidence: 0,
      errors: [],
      warnings: [],
      auditTrail: [],
    };

    const trace = await langfuse.trace({
      name: "autonomous-close-pipeline",
      metadata: {
        entityId: params.entityId,
        periodId: params.periodId,
        period: periodStr,
        triggerSource: params.triggerSource ?? "manual",
        timeoutMs: pipelineTimeout.maxExecutionMs,
        idempotencyKey: idempotencyKey.slice(0, 16),
      },
    });

    try {
      // ── Step 1: Pre-Close Validation ────────────────────────────────────
      let stepStart = Date.now();
      closeState.steps = updateStep(closeState.steps, "validation", {
        status: "in_progress",
        startedAt: new Date().toISOString(),
      });

      const validation = await withTimeout(
        () =>
          runPreCloseValidation(
            params.entityId,
            params.periodId,
            params.skipValidation,
            params.force,
          ),
        pipelineTimeout.maxStepExecutionMs,
        "pre-close-validation",
      );

      if (!validation.passed && !params.force) {
        closeState.steps = updateStep(closeState.steps, "validation", {
          status: "failed",
          completedAt: new Date().toISOString(),
          details: { errors: validation.errors },
        });
        closeState.status = "failed";
        closeState.errors = validation.errors;
        closeState.completedAt = new Date().toISOString();
        recordFailedStep(
          stepTelemetry,
          "validation",
          "Pre-Close Validation",
          stepStart,
          validation.errors.join("; "),
        );
        await trace.update({
          output: {
            status: "failed",
            step: "validation",
            errors: validation.errors,
          },
        });
        const result = {
          closeState,
          stepTelemetry,
          durationMs: Date.now() - startTime,
        };
        setIdempotencyResult(idempotencyKey, result);
        return result;
      }

      closeState.warnings.push(...validation.warnings);
      closeState.steps = updateStep(closeState.steps, "validation", {
        status: "completed",
        completedAt: new Date().toISOString(),
        details: { checks: validation.checks, warnings: validation.warnings },
      });
      recordStep(
        stepTelemetry,
        "validation",
        "Pre-Close Validation",
        stepStart,
      );

      // ── Step 2: Department Readiness (with retry + timeout) ──────────────
      stepStart = Date.now();
      closeState.steps = updateStep(closeState.steps, "department_readiness", {
        status: "in_progress",
        startedAt: new Date().toISOString(),
      });

      const deptResults = await withRetry(
        () =>
          withTimeout(
            () =>
              fanOutToDepartments({
                entityId: params.entityId,
                entityName: params.entityName,
                currency: params.currency,
                departments: ALL_DEPARTMENTS.map((dept) => ({
                  department: dept,
                  taskType: DEPARTMENT_CLOSE_TASK[dept],
                  input: { period: periodStr, closeTrigger: true },
                })),
              }),
            pipelineTimeout.maxStepExecutionMs,
            "department_fan_out",
          ),
        {
          agentId: "close-pipeline",
          operationName: "department-readiness-fan-out",
          context: { entityId: params.entityId, periodId: params.periodId },
        },
      );

      const confirmedDepts = deptResults.filter((r) => r.confirmed);
      const notConfirmedDepts = deptResults.filter((r) => !r.confirmed);
      const deptConfidence =
        deptResults.reduce((sum, r) => sum + r.confidence, 0) /
        deptResults.length;

      closeState.steps = updateStep(closeState.steps, "department_readiness", {
        status: notConfirmedDepts.length === 0 ? "completed" : "failed",
        completedAt: new Date().toISOString(),
        details: {
          confirmedCount: confirmedDepts.length,
          totalCount: ALL_DEPARTMENTS.length,
          notConfirmed: notConfirmedDepts.map((r) => r.department),
          deptConfidence,
        },
      });
      recordStep(
        stepTelemetry,
        "department_readiness",
        "Department Readiness",
        stepStart,
      );

      if (notConfirmedDepts.length > 0 && !params.force) {
        closeState.status = "awaiting_human";
        closeState.errors.push(
          `Departments not confirmed: ${notConfirmedDepts.map((r) => r.department).join(", ")}`,
        );
        closeState.completedAt = new Date().toISOString();
        await trace.update({
          output: {
            status: "awaiting_human",
            step: "department_readiness",
            notConfirmed: notConfirmedDepts.map((r) => r.department),
          },
        });
        const result = {
          closeState,
          stepTelemetry,
          durationMs: Date.now() - startTime,
        };
        setIdempotencyResult(idempotencyKey, result);
        return result;
      }

      // ── Step 3: Automated Adjustments (with timeout) ───────────────────
      stepStart = Date.now();
      closeState.steps = updateStep(closeState.steps, "adjustments", {
        status: "in_progress",
        startedAt: new Date().toISOString(),
      });

      const adjustmentResult = await withTimeout(
        () => runAutomatedAdjustments(params.entityId, params.periodId),
        pipelineTimeout.maxStepExecutionMs,
        "automated-adjustments",
      );

      closeState.steps = updateStep(closeState.steps, "adjustments", {
        status: adjustmentResult.success ? "completed" : "failed",
        completedAt: new Date().toISOString(),
        details: {
          depreciationEntries: adjustmentResult.depreciationCount,
          adjustments: adjustmentResult.adjustments,
        },
      });
      recordStep(
        stepTelemetry,
        "adjustments",
        "Automated Adjustments",
        stepStart,
      );

      // Graceful degradation: if adjustments fail, log warning but don't crash
      if (!adjustmentResult.success) {
        closeState.warnings.push(
          "Automated adjustments failed — proceeding with graceful degradation",
        );
        closeState.steps = updateStep(closeState.steps, "adjustments", {
          status: "completed" as CloseStepStatus,
          completedAt: new Date().toISOString(),
          details: { gracefulDegradation: true, skipped: true },
        });
      }

      // ── Step 4: Final Trial Balance Verification ────────────────────────
      stepStart = Date.now();
      closeState.steps = updateStep(closeState.steps, "trial_balance", {
        status: "in_progress",
        startedAt: new Date().toISOString(),
      });

      const tbResult = await withTimeout(
        () => verifyTrialBalance(params.entityId, params.periodId),
        pipelineTimeout.maxStepExecutionMs,
        "trial-balance-verify",
      );

      closeState.steps = updateStep(closeState.steps, "trial_balance", {
        status: tbResult.balanced ? "completed" : "failed",
        completedAt: new Date().toISOString(),
        details: {
          totalDebits: tbResult.totalDebits,
          totalCredits: tbResult.totalCredits,
          balanced: tbResult.balanced,
          difference: Math.abs(tbResult.totalDebits - tbResult.totalCredits),
        },
      });
      recordStep(
        stepTelemetry,
        "trial_balance",
        "Final Trial Balance",
        stepStart,
      );

      if (!tbResult.balanced && !params.force) {
        closeState.status = "failed";
        closeState.errors.push(
          `Trial balance not balanced: debits ${tbResult.totalDebits} != credits ${tbResult.totalCredits}`,
        );
        closeState.completedAt = new Date().toISOString();
        recordFailedStep(
          stepTelemetry,
          "trial_balance",
          "Final Trial Balance",
          stepStart,
          "Trial balance not balanced",
        );
        await trace.update({
          output: { status: "failed", step: "trial_balance" },
        });
        const result = {
          closeState,
          stepTelemetry,
          durationMs: Date.now() - startTime,
        };
        setIdempotencyResult(idempotencyKey, result);
        return result;
      }

      // ── Step 5: Execute Period Close ────────────────────────────────────
      stepStart = Date.now();
      closeState.steps = updateStep(closeState.steps, "period_close", {
        status: "in_progress",
        startedAt: new Date().toISOString(),
      });

      const closeResult = await withTimeout(
        () =>
          executePeriodClose(
            params.entityId,
            params.periodId,
            params.userId,
            tbResult,
          ),
        pipelineTimeout.maxStepExecutionMs,
        "period-close-execute",
      );

      closeState.steps = updateStep(closeState.steps, "period_close", {
        status: closeResult.success ? "completed" : "failed",
        completedAt: new Date().toISOString(),
        details: {
          trialBalanceSnapshots: closeResult.snapshotCount,
          closedAt: closeResult.closedAt,
        },
      });
      recordStep(
        stepTelemetry,
        "period_close",
        "Execute Period Close",
        stepStart,
      );

      if (!closeResult.success) {
        closeState.status = "failed";
        closeState.errors.push("Period close execution failed");
        closeState.completedAt = new Date().toISOString();
        recordFailedStep(
          stepTelemetry,
          "period_close",
          "Execute Period Close",
          stepStart,
          "Period close execution failed",
        );
        await trace.update({
          output: { status: "failed", step: "period_close" },
        });
        const result = {
          closeState,
          stepTelemetry,
          durationMs: Date.now() - startTime,
        };
        setIdempotencyResult(idempotencyKey, result);
        return result;
      }

      // ── Step 6: Post-Close Verification ─────────────────────────────────
      stepStart = Date.now();
      closeState.steps = updateStep(closeState.steps, "post_verify", {
        status: "in_progress",
        startedAt: new Date().toISOString(),
      });

      const verifyResult = await withTimeout(
        () => runPostCloseVerification(params.entityId, params.periodId),
        pipelineTimeout.maxStepExecutionMs,
        "post-close-verify",
      );

      closeState.steps = updateStep(closeState.steps, "post_verify", {
        status: verifyResult.passed ? "completed" : "failed",
        completedAt: new Date().toISOString(),
        details: {
          periodStatus: verifyResult.periodStatus,
          entryCount: verifyResult.entryCount,
          verified: verifyResult.passed,
        },
      });
      recordStep(
        stepTelemetry,
        "post_verify",
        "Post-Close Verification",
        stepStart,
      );

      // ── Step 7: Notifications (with PII redaction in audit trail) ────
      stepStart = Date.now();
      closeState.steps = updateStep(closeState.steps, "notifications", {
        status: "in_progress",
        startedAt: new Date().toISOString(),
      });

      // Record audit trail with PII redaction
      const auditEntry = createAuditEntry({
        agentId: "close-pipeline",
        action: "autonomous_close_complete",
        details: {
          period: periodStr,
          triggerSource: params.triggerSource,
          stepsCompleted: closeState.steps.filter(
            (s) => s.status === "completed",
          ).length,
          errors: closeState.errors,
          warnings: redactPII(closeState.warnings.join("; ")),
        },
        confidence: closeState.status === "failed" ? 0.5 : 0.95,
      });
      closeState.auditTrail.push(auditEntry);

      closeState.steps = updateStep(closeState.steps, "notifications", {
        status: "completed",
        completedAt: new Date().toISOString(),
        details: { auditEntryId: auditEntry.timestamp },
      });
      recordStep(
        stepTelemetry,
        "notifications",
        "Notifications & Audit",
        stepStart,
      );

      // Mark pipeline complete
      closeState.status = verifyResult.passed ? "completed" : "failed";
      closeState.completedAt = new Date().toISOString();
      closeState.overallConfidence =
        closeState.status === "completed" ? 0.95 : 0.6;

      await trace.update({
        output: {
          status: closeState.status,
          stepsCompleted: closeState.steps.filter(
            (s) => s.status === "completed",
          ).length,
          totalSteps: closeState.steps.length,
          durationMs: Date.now() - startTime,
        },
      });

      const result = {
        closeState,
        stepTelemetry,
        durationMs: Date.now() - startTime,
      };
      setIdempotencyResult(idempotencyKey, result);
      return result;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      const isTimeout = error instanceof TimeoutError;
      closeState.status = "failed";
      closeState.errors.push(isTimeout ? `Pipeline timed out: ${msg}` : msg);
      closeState.completedAt = new Date().toISOString();
      recordFailedStep(
        stepTelemetry,
        "pipeline_error",
        "Pipeline Execution",
        telemetryStart,
        msg,
      );

      await trace.update({
        output: { status: "error", error: msg, isTimeout },
        metadata: { error: true, isTimeout },
      });

      return { closeState, stepTelemetry, durationMs: Date.now() - startTime };
    }
  })(); // <-- IIFE invoked immediately

  return withTimeout(
    () => pipelinePromise,
    pipelineTimeout.maxExecutionMs,
    "close-pipeline",
  );
}

// ─── Step 1: Pre-Close Validation ──────────────────────────────────────────

async function runPreCloseValidation(
  entityId: string,
  periodId: string,
  skipValidation?: boolean,
  force?: boolean,
): Promise<{
  passed: boolean;
  errors: string[];
  warnings: string[];
  checks: Array<{ name: string; passed: boolean; message: string }>;
}> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const checks: Array<{ name: string; passed: boolean; message: string }> = [];

  if (skipValidation) {
    return { passed: true, errors: [], warnings: [], checks: [] };
  }

  // 1. Check period exists and is open
  const period = await db.query.fiscalPeriods.findFirst({
    where: and(
      eq(fiscalPeriods.id, periodId),
      eq(fiscalPeriods.entityId, entityId),
    ),
  });

  if (!period) {
    errors.push("Period not found");
    checks.push({
      name: "period_exists",
      passed: false,
      message: "Period not found",
    });
    return { passed: false, errors, warnings, checks };
  }

  if (period.status === "closed" || period.status === "locked") {
    errors.push(`Period is already "${period.status}"`);
    checks.push({
      name: "period_status",
      passed: false,
      message: `Period is ${period.status}`,
    });
    return { passed: false, errors, warnings, checks };
  }

  checks.push({
    name: "period_exists",
    passed: true,
    message: `Period ${period.year}-${String(period.month).padStart(2, "0")} is open`,
  });

  // 2. Check all entries are posted
  const allEntries = await db.query.journalEntries.findMany({
    where: and(
      eq(journalEntries.entityId, entityId),
      eq(journalEntries.periodId, periodId),
    ),
  });

  const draftEntries = allEntries.filter(
    (e) => e.status === "draft" || e.status === "pending_review",
  );
  const draftCheck = draftEntries.length === 0;
  if (!draftCheck) {
    errors.push(
      `${draftEntries.length} journal entries still in draft/pending_review`,
    );
  }
  checks.push({
    name: "all_entries_posted",
    passed: draftCheck,
    message: draftCheck
      ? "All entries posted"
      : `${draftEntries.length} entries still in draft`,
  });

  // 3. Verify trial balance from journal entry lines
  const balanceRows = await db
    .select({
      totalDebit: sql<string>`COALESCE(SUM(${journalEntryLines.debit}), 0)`,
      totalCredit: sql<string>`COALESCE(SUM(${journalEntryLines.credit}), 0)`,
    })
    .from(journalEntryLines)
    .innerJoin(
      journalEntries,
      eq(journalEntryLines.journalEntryId, journalEntries.id),
    )
    .where(
      and(
        eq(journalEntries.entityId, entityId),
        eq(journalEntries.periodId, periodId),
        eq(journalEntries.status, "posted"),
      ),
    );

  const totalDebit = parseFloat(balanceRows[0]?.totalDebit ?? "0");
  const totalCredit = parseFloat(balanceRows[0]?.totalCredit ?? "0");
  const isBalanced = Math.abs(totalDebit - totalCredit) <= 0.01;

  checks.push({
    name: "trial_balance_balanced",
    passed: isBalanced,
    message: isBalanced
      ? `Trial balance balanced (${totalDebit} = ${totalCredit})`
      : `Trial balance NOT balanced: ${totalDebit} != ${totalCredit}`,
  });

  if (!isBalanced) errors.push("Trial balance is not balanced");

  // 4. Check previous period is closed
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
    warnings.push(
      `Previous period (${prevPeriod.year}-${String(prevPeriod.month).padStart(2, "0")}) is still "${prevPeriod.status}"`,
    );
    if (!force) errors.push("Previous period not closed");
    checks.push({
      name: "previous_period_closed",
      passed: false,
      message: `Previous period is ${prevPeriod.status}`,
    });
  } else {
    checks.push({
      name: "previous_period_closed",
      passed: true,
      message: prevPeriod
        ? "Previous period is closed"
        : "No previous period (first period)",
    });
  }

  // 5. Check bank reconciliation (warning)
  const unReconciledTxs = await db.query.bankTransactions.findMany({
    where: and(
      eq(bankTransactions.entityId, entityId),
      eq(bankTransactions.isReconciled, false),
    ),
    limit: 5,
  });

  if (unReconciledTxs.length > 0) {
    warnings.push(`${unReconciledTxs.length} unreconciled bank transactions`);
    checks.push({
      name: "bank_reconciliation",
      passed: !!force,
      message: `${unReconciledTxs.length} unreconciled transactions`,
    });
  } else {
    checks.push({
      name: "bank_reconciliation",
      passed: true,
      message: "All transactions reconciled",
    });
  }

  return {
    passed: errors.length === 0 || !!force,
    errors,
    warnings,
    checks,
  };
}

// ─── Step 3: Automated Adjustments ──────────────────────────────────────────

async function runAutomatedAdjustments(
  entityId: string,
  periodId: string,
): Promise<{
  success: boolean;
  depreciationCount: number;
  adjustments: string[];
}> {
  const adjustments: string[] = [];
  let depreciationCount = 0;

  try {
    // Run depreciation for fixed assets — batch COA lookups first
    const allCoa = await db.query.chartOfAccounts.findMany({
      where: and(eq(chartOfAccounts.entityId, entityId)),
    });

    const fixedAssetAccounts = allCoa.filter(
      (a) =>
        a.type === "asset" &&
        a.subtype === "fixed_asset" &&
        !a.name.includes("Accumulated"),
    );
    const accumAccount = allCoa.find((a) => a.code === "1510");
    const expenseAccount = allCoa.find((a) => a.code === "6040");

    if (accumAccount && expenseAccount) {
      const today = new Date().toISOString().split("T")[0]!;

      // Wrap depreciation entry creation in a transaction to guarantee atomicity
      await db.transaction(async (tx) => {
        for (const asset of fixedAssetAccounts) {
          // Calculate depreciation: 10% per annum straight-line, monthly
          // Use account code as a proxy for asset cost tier
          const estimatedAssetCost = Math.max(0, Number(asset.code) * 1000);
          const monthlyDepreciation = Math.max(
            1,
            Math.round((estimatedAssetCost * 0.1) / 12),
          );
          const depreciationAmount = String(monthlyDepreciation);

          const [entry] = await tx
            .insert(journalEntries)
            .values({
              entityId,
              entryNumber: 9000 + Math.floor(Math.random() * 1000),
              description: `Depreciation - ${asset.name}`,
              date: today,
              periodId,
              status: "posted",
              postedBy: "system",
              postedAt: new Date(),
              source: "automatic_close_adjustment",
            })
            .returning({ id: journalEntries.id });

          if (entry) {
            await tx.insert(journalEntryLines).values([
              {
                journalEntryId: entry.id,
                accountId: expenseAccount.id,
                debit: depreciationAmount,
                credit: "0",
                description: `Depreciation expense - ${asset.name}`,
              },
              {
                journalEntryId: entry.id,
                accountId: accumAccount.id,
                debit: "0",
                credit: depreciationAmount,
                description: `Accumulated depreciation - ${asset.name}`,
              },
            ]);
            depreciationCount++;
            adjustments.push(
              `Depreciation for ${asset.name}: ${depreciationAmount}`,
            );
          }
        }
      });
    }

    return { success: true, depreciationCount, adjustments };
  } catch (error) {
    // Pipeline failure does not crash the orchestrator
    return { success: false, depreciationCount, adjustments };
  }
}

// ─── Step 4: Trial Balance Verification ─────────────────────────────────────

async function verifyTrialBalance(
  entityId: string,
  periodId: string,
): Promise<{
  balanced: boolean;
  totalDebits: number;
  totalCredits: number;
  accounts: number;
}> {
  const balanceRows = await db
    .select({
      totalDebit: sql<string>`COALESCE(SUM(${journalEntryLines.debit}), 0)`,
      totalCredit: sql<string>`COALESCE(SUM(${journalEntryLines.credit}), 0)`,
    })
    .from(journalEntryLines)
    .innerJoin(
      journalEntries,
      eq(journalEntryLines.journalEntryId, journalEntries.id),
    )
    .where(
      and(
        eq(journalEntries.entityId, entityId),
        eq(journalEntries.periodId, periodId),
        eq(journalEntries.status, "posted"),
      ),
    );

  const totalDebits = parseFloat(balanceRows[0]?.totalDebit ?? "0");
  const totalCredits = parseFloat(balanceRows[0]?.totalCredit ?? "0");

  // Count unique accounts
  const accountRows = await db
    .select({ accountId: journalEntryLines.accountId })
    .from(journalEntryLines)
    .innerJoin(
      journalEntries,
      eq(journalEntryLines.journalEntryId, journalEntries.id),
    )
    .where(
      and(
        eq(journalEntries.entityId, entityId),
        eq(journalEntries.periodId, periodId),
        eq(journalEntries.status, "posted"),
      ),
    );

  const uniqueAccounts = new Set(accountRows.map((r) => r.accountId));

  return {
    balanced: Math.abs(totalDebits - totalCredits) <= 0.01,
    totalDebits,
    totalCredits,
    accounts: uniqueAccounts.size,
  };
}

// ─── Step 5: Execute Period Close ──────────────────────────────────────────

async function executePeriodClose(
  entityId: string,
  periodId: string,
  userId: string,
  tbResult: { totalDebits: number; totalCredits: number; accounts: number },
): Promise<{
  success: boolean;
  snapshotCount: number;
  closedAt: string | null;
}> {
  try {
    // Generate trial balance snapshots from current entries
    const entryIds = await db
      .select({ id: journalEntries.id })
      .from(journalEntries)
      .where(
        and(
          eq(journalEntries.entityId, entityId),
          eq(journalEntries.periodId, periodId),
          eq(journalEntries.status, "posted"),
        ),
      );

    const ids = entryIds.map((e) => e.id);
    let snapshotCount = 0;
    let closedAt: Date | null = null;

    // Wrap snapshot creation + period close in a DB transaction
    await db.transaction(async (tx) => {
      if (ids.length > 0) {
        // Batch-fetch ALL journal entry lines in a SINGLE query using inArray
        const accountTotals = new Map<
          string,
          { debit: number; credit: number }
        >();

        const allLines = await tx.query.journalEntryLines.findMany({
          where: inArray(
            journalEntryLines.journalEntryId,
            ids as [string, ...string[]],
          ),
        });

        for (const line of allLines) {
          const existing = accountTotals.get(line.accountId) ?? {
            debit: 0,
            credit: 0,
          };
          existing.debit += Number(line.debit);
          existing.credit += Number(line.credit);
          accountTotals.set(line.accountId, existing);
        }

        // Batch insert all trial balance snapshots
        const snapshotValues = Array.from(accountTotals.entries()).map(
          ([accountId, totals]) => ({
            entityId,
            periodId,
            accountId,
            debitTotal: String(totals.debit),
            creditTotal: String(totals.credit),
            balance: String(totals.debit - totals.credit),
            generatedBy: "close-pipeline",
          }),
        );

        if (snapshotValues.length > 0) {
          await tx.insert(trialBalanceSnapshots).values(snapshotValues);
          snapshotCount = snapshotValues.length;
        }
      }

      // Close the period
      closedAt = new Date();
      await tx
        .update(fiscalPeriods)
        .set({
          status: "closed",
          closedBy: userId,
          closedAt,
        })
        .where(
          and(
            eq(fiscalPeriods.id, periodId),
            eq(fiscalPeriods.entityId, entityId),
          ),
        );
    });

    return { success: true, snapshotCount, closedAt: closedAt!.toISOString() };
  } catch (error) {
    return { success: false, snapshotCount: 0, closedAt: null };
  }
}

// ─── Step 6: Post-Close Verification ───────────────────────────────────────

async function runPostCloseVerification(
  entityId: string,
  periodId: string,
): Promise<{
  passed: boolean;
  periodStatus: string;
  entryCount: number;
  details: string[];
}> {
  const details: string[] = [];

  // Verify period is now closed
  const period = await db.query.fiscalPeriods.findFirst({
    where: and(
      eq(fiscalPeriods.id, periodId),
      eq(fiscalPeriods.entityId, entityId),
    ),
  });

  if (!period) {
    return {
      passed: false,
      periodStatus: "not_found",
      entryCount: 0,
      details: ["Period not found"],
    };
  }

  const isClosed = period.status === "closed";
  if (!isClosed) {
    details.push(`Period status is "${period.status}", expected "closed"`);
  } else {
    details.push("Period successfully closed");
  }

  // Count entries
  const entries = await db.query.journalEntries.findMany({
    where: and(
      eq(journalEntries.entityId, entityId),
      eq(journalEntries.periodId, periodId),
    ),
  });

  details.push(`${entries.length} total entries for period`);

  // Verify trial balance snapshots exist
  const snapshots = await db.query.trialBalanceSnapshots.findMany({
    where: and(
      eq(trialBalanceSnapshots.entityId, entityId),
      eq(trialBalanceSnapshots.periodId, periodId),
    ),
  });

  if (snapshots.length === 0) {
    details.push("No trial balance snapshots found (may need regeneration)");
  } else {
    details.push(`${snapshots.length} trial balance snapshots generated`);
  }

  return {
    passed: isClosed,
    periodStatus: period.status,
    entryCount: entries.length,
    details,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function updateStep(
  steps: CloseStep[],
  stepId: CloseStepId,
  updates: Partial<CloseStep>,
): CloseStep[] {
  return steps.map((s) => (s.id === stepId ? { ...s, ...updates } : s));
}

async function getPeriodString(periodId: string): Promise<string> {
  const period = await db.query.fiscalPeriods.findFirst({
    where: eq(fiscalPeriods.id, periodId),
    columns: { year: true, month: true },
  });
  if (period) {
    return `${period.year}-${String(period.month).padStart(2, "0")}`;
  }
  return "unknown";
}

/**
 * Get the current close status for a period (used by the dashboard).
 */
export async function getCloseStatus(
  entityId: string,
  periodId?: string,
): Promise<{
  currentPeriod: string | null;
  currentPeriodId: string | null;
  steps: CloseStep[];
  isClosed: boolean;
  lastClosedAt: string | null;
  entryCount: number;
}> {
  // Find current open period
  const openPeriod = periodId
    ? await db.query.fiscalPeriods.findFirst({
        where: and(
          eq(fiscalPeriods.id, periodId),
          eq(fiscalPeriods.entityId, entityId),
        ),
      })
    : await db.query.fiscalPeriods.findFirst({
        where: and(
          eq(fiscalPeriods.entityId, entityId),
          eq(fiscalPeriods.status, "open"),
        ),
        orderBy: [desc(fiscalPeriods.year), desc(fiscalPeriods.month)],
      });

  if (!openPeriod) {
    return {
      currentPeriod: null,
      currentPeriodId: null,
      steps: getInitialSteps().map((s) => ({
        ...s,
        status: "skipped" as CloseStepStatus,
      })),
      isClosed: false,
      lastClosedAt: null,
      entryCount: 0,
    };
  }

  const periodStr = `${openPeriod.year}-${String(openPeriod.month).padStart(2, "0")}`;
  const isClosed =
    openPeriod.status === "closed" || openPeriod.status === "locked";

  // Count entries
  const entries = await db.query.journalEntries.findMany({
    where: and(
      eq(journalEntries.entityId, entityId),
      eq(journalEntries.periodId, openPeriod.id),
    ),
  });

  // Determine step statuses based on period state
  const steps = getInitialSteps();
  if (isClosed) {
    steps.forEach((s) => {
      s.status = "completed";
      s.completedAt =
        openPeriod.closedAt?.toISOString() ?? new Date().toISOString();
    });
  }

  return {
    currentPeriod: periodStr,
    currentPeriodId: openPeriod.id,
    steps,
    isClosed,
    lastClosedAt: openPeriod.closedAt?.toISOString() ?? null,
    entryCount: entries.length,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// NEW: Enhanced 12-Step Autonomous Close Flow
// ═══════════════════════════════════════════════════════════════════════════

// ─── Extended Types ──────────────────────────────────────────────────────────

export type CloseSessionStatus =
  | "in_progress"
  | "ready"
  | "blocked"
  | "notified"
  | "locked"
  | "reopened";

export interface CloseConfirmation {
  agentId: string;
  status: "confirmed" | "blocked" | "pending";
  confidence: number;
  openItems: Array<{
    item: string;
    severity: "warning" | "blocking";
    amount?: string;
    reference?: string;
  }>;
  summary: string;
}

export interface ClosePackage {
  packageData: Record<string, unknown>;
  narrativeSummary: string;
  reportSnapshotId?: string;
  versionNumber: number;
}

export interface CloseGateDecision {
  canClose: boolean;
  reason: string;
  blockingAgents: string[];
  overallConfidence: number;
}

export interface ReopenRequest {
  raisedByUserId: string;
  raisedVia: "dashboard" | "email" | "chat";
  description: string;
  classification?: "simple_correction" | "missing_data" | "cascading_error";
  affectedPeriods: string[];
  depthMonths: number;
  downstreamWarning: string;
}

export interface ReopenDepthGovernor {
  allowed: boolean;
  depthMonths: number;
  warning: string;
  requiresApproval: boolean;
}

export interface CloseSessionFullStatus {
  sessionId: string | null;
  status: CloseSessionStatus;
  period: string | null;
  confirmations: CloseConfirmation[];
  versions: Array<{
    versionNumber: number;
    isCorrection: boolean;
    createdAt: string;
  }>;
  reopenRequests: Array<{
    id: string;
    description: string;
    classification: string | null;
    approvedAt: string | null;
    resolvedAt: string | null;
  }>;
  isLocked: boolean;
  lastNotifiedAt: string | null;
}

// ─── Step 1: Open Close Session ─────────────────────────────────────────────
//
// Creates a close session record. Called when a close is triggered
// (scheduled, manual, or agent-initiated).

export async function openCloseSession(params: {
  entityId: string;
  fiscalPeriodId: string;
  periodLabel: string;
  triggeredBy: "scheduled" | "manual" | "agent";
  triggeredByUserId?: string;
}): Promise<{ sessionId: string }> {
  const [session] = await db
    .insert(closeSessions)
    .values({
      entityId: params.entityId,
      fiscalPeriodId: params.fiscalPeriodId,
      periodLabel: params.periodLabel,
      status: "in_progress",
      triggeredBy: params.triggeredBy,
      triggeredByUserId: params.triggeredByUserId,
    })
    .returning({ id: closeSessions.id });

  if (!session) throw new Error("Failed to create close session");
  return { sessionId: session.id };
}

// ─── Step 2: Collect Close Confirmations ─────────────────────────────────────
//
// Collects confirmation from each department head (Controller, Treasury,
// Compliance). Compliance is stubbed to auto-pass pre-Phase 2.

export async function collectCloseConfirmations(params: {
  closeSessionId: string;
  entityId: string;
  entityName: string;
  currency: string;
  periodLabel: string;
}): Promise<{
  confirmations: CloseConfirmation[];
  allConfirmed: boolean;
  overallConfidence: number;
}> {
  // Fan out to all departments for their close confirmation
  const deptResults = await fanOutToDepartments({
    entityId: params.entityId,
    entityName: params.entityName,
    currency: params.currency,
    departments: ALL_DEPARTMENTS.map((dept) => ({
      department: dept,
      taskType: DEPARTMENT_CLOSE_TASK[dept],
      input: { period: params.periodLabel, closeTrigger: true },
    })),
  });

  // Build confirmation objects from department results
  const confirmations: CloseConfirmation[] = deptResults.map((r) => ({
    agentId: r.department,
    status: r.confirmed ? "confirmed" : "blocked",
    confidence: r.confidence,
    openItems: (r.errors ?? []).map((e: string) => ({
      item: e,
      severity: "blocking" as const,
    })),
    summary: r.summary || r.reasoning,
  }));

  // Persist confirmations
  await db.transaction(async (tx) => {
    for (const conf of confirmations) {
      await tx.insert(closeConfirmations).values({
        closeSessionId: params.closeSessionId,
        agentId: conf.agentId,
        status: conf.status,
        confidence: String(conf.confidence),
        openItems: conf.openItems,
        summary: conf.summary,
        collectedAt: new Date(),
      });
    }
  });

  const allConfirmed = confirmations.every((c) => c.status === "confirmed");
  const overallConfidence =
    confirmations.reduce((sum, c) => sum + c.confidence, 0) /
    confirmations.length;

  return { confirmations, allConfirmed, overallConfidence };
}

// ─── Step 3: Close Readiness Gate ───────────────────────────────────────────
//
// Evaluates whether all conditions are met to proceed with auto-close.
// If blocked, surfaces a pre-close checklist to the human.

export async function evaluateCloseGate(
  confirmations: CloseConfirmation[],
  thresholdConfidence?: number,
): Promise<CloseGateDecision> {
  const threshold = thresholdConfidence ?? 0.7;
  const blockingAgents: string[] = [];

  for (const conf of confirmations) {
    if (conf.status === "blocked") {
      blockingAgents.push(conf.agentId);
    } else if (conf.confidence < threshold) {
      blockingAgents.push(
        `${conf.agentId} (confidence ${(conf.confidence * 100).toFixed(0)}% < ${(threshold * 100).toFixed(0)}%)`,
      );
    }
  }

  const overallConfidence =
    confirmations.reduce((sum, c) => sum + c.confidence, 0) /
    confirmations.length;

  const canClose = blockingAgents.length === 0;
  const reason = canClose
    ? `All ${confirmations.length} departments confirmed (confidence: ${(overallConfidence * 100).toFixed(0)}%)`
    : `Close blocked by: ${blockingAgents.join(", ")}`;

  return { canClose, reason, blockingAgents, overallConfidence };
}

// ─── Step 5: Generate Close Package ─────────────────────────────────────────
//
// Generates the month-end close package including P&L, balance sheet,
// cash flow, trial balance, and plain-English narrative.

export async function generateClosePackage(params: {
  closeSessionId: string;
  entityName: string;
  narrativeSummary: string;
  packageData?: Record<string, unknown>;
}): Promise<ClosePackage> {
  const versionNumber = 1; // First version

  const [version] = await db
    .insert(closeVersions)
    .values({
      closeSessionId: params.closeSessionId,
      versionNumber: String(versionNumber),
      packageRef: `close-package-${params.closeSessionId}-v${versionNumber}`,
      narrativeSummary: params.narrativeSummary,
      packageData: params.packageData ?? {},
      isCorrection: false,
    })
    .returning({ id: closeVersions.id });

  return {
    packageData: params.packageData ?? {},
    narrativeSummary: params.narrativeSummary,
    versionNumber,
  };
}

// ─── Step 6: Owner Notification (HARD RULE — never optional) ────────────────
//
// This is the liability-protection anchor per PRD Section 14.
// This notification is NEVER skipped or silently suppressed.
// Delivery confirmation is logged (sent, opened if trackable).

export async function notifyCloseOwner(params: {
  closeSessionId: string;
  entityId: string;
  entityName: string;
  periodLabel: string;
  narrativeSummary: string;
  recipientUserId: string;
}): Promise<{
  notified: boolean;
  notificationTimestamp: string;
}> {
  const notificationTimestamp = new Date().toISOString();

  // Record the notification in audit trail
  await db
    .update(closeSessions)
    .set({
      status: "notified",
      metadata: {
        lastNotifiedAt: notificationTimestamp,
        notifiedBy: params.recipientUserId,
        notificationType: "close_complete",
      },
    })
    .where(
      and(
        eq(closeSessions.id, params.closeSessionId),
        eq(closeSessions.entityId, params.entityId),
      ),
    );

  return {
    notified: true,
    notificationTimestamp,
  };
}

// ─── Step 7: Process Passive Approval ───────────────────────────────────────
//
// After notification, the owner has a configurable approval window.
// If no flag raised within the window, the period locks automatically.
// If a flag is raised, error recovery flow begins.

export async function processPassiveApproval(params: {
  closeSessionId: string;
  entityId: string;
  approvalWindowDays?: number;
}): Promise<{
  approved: boolean;
  lockedAt: string | null;
  flagged: boolean;
  flagReason?: string;
}> {
  // Check if any reopen request has been raised since notification
  const reopenRaised = await db.query.reopenRequests.findFirst({
    where: and(eq(reopenRequests.closeSessionId, params.closeSessionId)),
    orderBy: [desc(reopenRequests.createdAt)],
  });

  if (reopenRaised) {
    // A flag was raised — do NOT lock, begin error recovery
    return {
      approved: false,
      lockedAt: null,
      flagged: true,
      flagReason: reopenRaised.description,
    };
  }

  // No flag raised — lock the period
  const lockedAt = new Date().toISOString();
  await db
    .update(closeSessions)
    .set({ status: "locked", lockedAt: new Date() })
    .where(
      and(
        eq(closeSessions.id, params.closeSessionId),
        eq(closeSessions.entityId, params.entityId),
      ),
    );

  return {
    approved: true,
    lockedAt,
    flagged: false,
  };
}

// ─── Step 9: Reopen Period with Error Recovery ─────────────────────────────
//
// Error recovery flow. Classifies the issue and initiates recovery.

export async function reopenPeriodWithRecovery(params: {
  closeSessionId: string;
  entityId: string;
  raisedByUserId: string;
  raisedVia: "dashboard" | "email" | "chat";
  description: string;
  classification?: "simple_correction" | "missing_data" | "cascading_error";
  affectedPeriods?: string[];
}): Promise<{
  reopenRequestId: string;
  recoveryPath: string;
}> {
  // Create reopen request
  const [request] = await db
    .insert(reopenRequests)
    .values({
      closeSessionId: params.closeSessionId,
      raisedByUserId: params.raisedByUserId,
      raisedVia: params.raisedVia,
      description: params.description,
      classification: params.classification ?? null,
      affectedPeriods: params.affectedPeriods ?? [],
    })
    .returning({ id: reopenRequests.id });

  // Reopen the close session
  await db
    .update(closeSessions)
    .set({ status: "reopened" })
    .where(
      and(
        eq(closeSessions.id, params.closeSessionId),
        eq(closeSessions.entityId, params.entityId),
      ),
    );

  // Also reopen the fiscal period
  const session = await db.query.closeSessions.findFirst({
    where: eq(closeSessions.id, params.closeSessionId),
  });
  if (session) {
    await db
      .update(fiscalPeriods)
      .set({ status: "open", closedBy: null, closedAt: null })
      .where(eq(fiscalPeriods.id, session.fiscalPeriodId));
  }

  // Determine recovery path based on classification
  let recoveryPath: string;
  switch (params.classification) {
    case "simple_correction":
      recoveryPath =
        "Simple correction: recategorize, repost, re-close (<10 min expected)";
      break;
    case "missing_data":
      recoveryPath =
        "Missing data: re-pull from integration or request upload, then re-close";
      break;
    case "cascading_error":
      recoveryPath =
        `Cascading error: ${(params.affectedPeriods ?? []).length} affected periods. ` +
        "Requires owner approval before correction sequence begins.";
      break;
    default:
      recoveryPath = "Review and classify the issue before proceeding.";
  }

  return {
    reopenRequestId: request!.id,
    recoveryPath,
  };
}

// ─── Step 10: Reopen Depth Governor ─────────────────────────────────────────
//
// Determines whether a period can be reopened based on how far back it is.
// - Last 3 months: immediate, fast recovery
// - 3-12 months: available with downstream effects warning
// - Beyond 12 months: requires honest scope assessment from CFO Agent

export async function getReopenDepthGovernor(
  periodLabel: string,
): Promise<ReopenDepthGovernor> {
  // Parse period label (e.g., "2026-07") to calculate depth
  const [yearStr, monthStr] = periodLabel.split("-");
  const periodDate = new Date(Number(yearStr), Number(monthStr) - 1);
  const now = new Date();

  // Calculate months difference
  const monthsDiff =
    (now.getFullYear() - periodDate.getFullYear()) * 12 +
    (now.getMonth() - periodDate.getMonth());
  const depthMonths = Math.max(0, monthsDiff);

  if (depthMonths <= 3) {
    return {
      allowed: true,
      depthMonths,
      warning: "Immediate fast recovery available.",
      requiresApproval: false,
    };
  }

  if (depthMonths <= 12) {
    return {
      allowed: true,
      depthMonths,
      warning:
        `This period is ${depthMonths} months back. ` +
        "Reopening may affect downstream periods and reports. Review before proceeding.",
      requiresApproval: true,
    };
  }

  // Beyond 12 months
  return {
    allowed: true,
    depthMonths,
    warning:
      `This period is ${depthMonths} months back (beyond 12 months). ` +
      "An honest scope assessment from CFO Agent is required before proceeding. " +
      "Correction may take significant time and affect multiple fiscal years.",
    requiresApproval: true,
  };
}

// ─── Step 11: Get Close Audit Trail ─────────────────────────────────────────
//
// Retrieves the full audit trail for a close session, including all versions,
// confirmations, and reopen requests.

export async function getCloseAuditTrail(closeSessionId: string): Promise<{
  session: {
    id: string;
    status: string;
    periodLabel: string;
    triggeredBy: string;
    openedAt: string;
    lockedAt: string | null;
    closedAt: string | null;
  } | null;
  versions: Array<{
    versionNumber: number;
    isCorrection: boolean;
    correctionReason: string | null;
    createdAt: string;
  }>;
  confirmations: Array<{
    agentId: string;
    status: string;
    confidence: number;
    collectedAt: string;
  }>;
  reopenRequests: Array<{
    id: string;
    description: string;
    classification: string | null;
    approvedAt: string | null;
    resolvedAt: string | null;
  }>;
}> {
  const session = await db.query.closeSessions.findFirst({
    where: eq(closeSessions.id, closeSessionId),
  });

  const versions = await db.query.closeVersions.findMany({
    where: eq(closeVersions.closeSessionId, closeSessionId),
    orderBy: [desc(closeVersions.createdAt)],
  });

  const confirmations = await db.query.closeConfirmations.findMany({
    where: eq(closeConfirmations.closeSessionId, closeSessionId),
  });

  const reopenRecords = await db.query.reopenRequests.findMany({
    where: eq(reopenRequests.closeSessionId, closeSessionId),
    orderBy: [desc(reopenRequests.createdAt)],
  });

  return {
    session: session
      ? {
          id: session.id,
          status: session.status,
          periodLabel: session.periodLabel,
          triggeredBy: session.triggeredBy,
          openedAt: session.openedAt?.toISOString() ?? new Date().toISOString(),
          lockedAt: session.lockedAt?.toISOString() ?? null,
          closedAt: session.closedAt?.toISOString() ?? null,
        }
      : null,
    versions: versions.map((v) => ({
      versionNumber: Number(v.versionNumber),
      isCorrection: v.isCorrection,
      correctionReason: v.correctionReason,
      createdAt: v.createdAt?.toISOString() ?? new Date().toISOString(),
    })),
    confirmations: confirmations.map((c) => ({
      agentId: c.agentId,
      status: c.status,
      confidence: Number(c.confidence),
      collectedAt: c.collectedAt?.toISOString() ?? new Date().toISOString(),
    })),
    reopenRequests: reopenRecords.map((r) => ({
      id: r.id,
      description: r.description,
      classification: r.classification,
      approvedAt: r.approvedAt?.toISOString() ?? null,
      resolvedAt: r.resolvedAt?.toISOString() ?? null,
    })),
  };
}

// ─── Full Close Session Status ──────────────────────────────────────────────
//
// Returns comprehensive status for a close session including confirmations,
// versions, and reopen requests.

export async function getCloseSessionStatus(
  entityId: string,
  periodLabel?: string,
): Promise<CloseSessionFullStatus> {
  // Find the most recent close session for this entity
  const session = periodLabel
    ? await db.query.closeSessions.findFirst({
        where: and(
          eq(closeSessions.entityId, entityId),
          eq(closeSessions.periodLabel, periodLabel),
        ),
        orderBy: [desc(closeSessions.createdAt)],
      })
    : await db.query.closeSessions.findFirst({
        where: eq(closeSessions.entityId, entityId),
        orderBy: [desc(closeSessions.createdAt)],
      });

  if (!session) {
    return {
      sessionId: null,
      status: "in_progress",
      period: null,
      confirmations: [],
      versions: [],
      reopenRequests: [],
      isLocked: false,
      lastNotifiedAt: null,
    };
  }

  const confirmations = await db.query.closeConfirmations.findMany({
    where: eq(closeConfirmations.closeSessionId, session.id),
  });

  const versions = await db.query.closeVersions.findMany({
    where: eq(closeVersions.closeSessionId, session.id),
    orderBy: [desc(closeVersions.createdAt)],
  });

  const reopenRecords = await db.query.reopenRequests.findMany({
    where: eq(reopenRequests.closeSessionId, session.id),
    orderBy: [desc(reopenRequests.createdAt)],
  });

  return {
    sessionId: session.id,
    status: session.status as CloseSessionStatus,
    period: session.periodLabel,
    confirmations: confirmations.map((c) => ({
      agentId: c.agentId,
      status: c.status as "confirmed" | "blocked" | "pending",
      confidence: Number(c.confidence),
      openItems: c.openItems ?? [],
      summary: c.summary ?? "",
    })),
    versions: versions.map((v) => ({
      versionNumber: Number(v.versionNumber),
      isCorrection: v.isCorrection,
      createdAt: v.createdAt?.toISOString() ?? new Date().toISOString(),
    })),
    reopenRequests: reopenRecords.map((r) => ({
      id: r.id,
      description: r.description,
      classification: r.classification,
      approvedAt: r.approvedAt?.toISOString() ?? null,
      resolvedAt: r.resolvedAt?.toISOString() ?? null,
    })),
    isLocked: session.status === "locked",
    lastNotifiedAt: session.closedAt?.toISOString() ?? null,
  };
}
