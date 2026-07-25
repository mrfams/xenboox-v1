// ─── Budgeting Pipeline (Phase 2) ────────────────────────────────────────────
//
// Annual and multi-year budgets, budget-vs-actual, variance analysis,
// departmental budget scoping, and the Budget Impact Check interface
// consumed by the Expense Management Pipeline (Step 5 stub).
//
// Pipeline Steps:
//   1. Budget Creation — Create/retrieve budget header per fiscal year
//   2. Line Mapping — Map budget lines to COA accounts + dimensions
//   3. Version Control — Preserve every revision (never overwrite)
//   4. Actuals Feed — Pull actuals from ledger scoped to each line
//   5. Variance Calculation — Budget vs actual per line per period
//   6. Narrative Explanation — Auto-generated for significant variances
//   7. Alert Threshold Check — Approaching/exceeded triggers
//   8. Budget Impact Check — Interface for Expense Pipeline consumption
//   9. Departmental Scoping — Query-layer enforcement
//   10. Forecast Coordination — Budget baseline vs Analytics trend
//   11. Monthly Summary — Variance rollup for CFO Agent
//   12. Audit Trail — Log all actions
//
// Critical Rule:
//   Budget revisions are NEVER overwritten — every version preserved.
//   Department visibility enforced at query layer, not UI.
//   When budget and analytics forecasts diverge, show both with explanation.

import { db } from "@xenboox/db";
import { eq, and, desc, gte, lte, inArray, sql } from "drizzle-orm";
import {
  budgets,
  budgetLines,
  budgetVersions,
  varianceRecords,
  budgetAlertThresholds,
} from "@xenboox/db/schema";
import {
  journalEntries,
  journalEntryLines,
} from "@xenboox/db/schema/accounting";
import { auditLog } from "@xenboox/db/schema/documents";
import { entities } from "@xenboox/db/schema/organization";

// ─── Types ───────────────────────────────────────────────────────────────────

export type BudgetStepId =
  | "budget_creation"
  | "line_mapping"
  | "version_control"
  | "actuals_feed"
  | "variance_calc"
  | "narrative_explanation"
  | "alert_thresholds"
  | "budget_impact_check"
  | "departmental_scoping"
  | "forecast_coordination"
  | "monthly_summary"
  | "audit_trail";

export type BudgetStepStatus =
  "pending" | "in_progress" | "completed" | "skipped" | "failed" | "flagged";

export interface BudgetStep {
  id: BudgetStepId;
  label: string;
  status: BudgetStepStatus;
  agent: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  result?: Record<string, unknown>;
}

export interface BudgetSummary {
  budgetId: string;
  name: string;
  fiscalYear: number;
  status: string;
  totalBudgeted: number;
  totalActuals: number;
  totalVariance: number;
  totalVariancePct: number;
  lineCount: number;
}

export interface VarLineItem {
  lineId: string;
  accountCode: string;
  accountName: string;
  lineDescription: string;
  dimensionType: string | null;
  dimensionId: string | null;
  budgetedAmount: number;
  actualAmount: number;
  variance: number;
  variancePct: number;
  cumulativeVariance: number;
  isSignificant: boolean;
  narrative: string | null;
}

export interface BudgetAlert {
  lineId: string;
  lineDescription: string;
  budgetedAmount: number;
  actualAmount: number;
  spendPct: number;
  approachingPct: number;
  exceededPct: number;
  alertType: "approaching" | "exceeded";
}

export interface BudgetImpactResult {
  available: boolean;
  lineDescription: string;
  budgetedAmount: number;
  actualAmount: number;
  remainingBudget: number;
  requestedAmount: number;
  wouldExceed: boolean;
  alerts: BudgetAlert[];
}

export interface BudgetPipelineResult {
  success: boolean;
  period: string;
  fiscalYear: number;
  steps: BudgetStep[];
  budgetSummary: BudgetSummary | null;
  varianceLines: VarLineItem[];
  alerts: BudgetAlert[];
  errors: string[];
  warnings: string[];
}

interface PipelineParams {
  entityId: string;
  entityName: string;
  currency: string;
  fiscalYear: number;
  period: string;
  userId: string;
}

const MONTH_COLUMNS = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
] as const;

function getMonthColumn(period: string): string {
  const month = parseInt(period.split("-")[1] ?? "01", 10);
  return MONTH_COLUMNS[month - 1] ?? "jan";
}

function calculateCAGR(begin: number, end: number, years: number): number {
  if (begin <= 0 || years <= 0) return 0;
  return ((end / begin) ** (1 / years) - 1) * 100;
}

// ─── Pipeline Runner ─────────────────────────────────────────────────────────

export async function runBudgetPipeline(
  params: PipelineParams,
): Promise<BudgetPipelineResult> {
  const { entityId, period, fiscalYear, userId } = params;
  const steps: BudgetStep[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  let budgetId: string | undefined;
  let budgetSummary: BudgetSummary | null = null;
  let varianceLines: VarLineItem[] = [];
  let alerts: BudgetAlert[] = [];

  // ── Step 1: Budget Creation ─────────────────────────────────────────
  const step1: BudgetStep = {
    id: "budget_creation",
    label: "Budget Creation & Retrieval",
    status: "pending",
    agent: "Budget Agent",
  };

  try {
    step1.status = "in_progress";
    step1.startedAt = new Date().toISOString();

    // Find active budget for this fiscal year, or create draft
    let budget = await db.query.budgets.findFirst({
      where: and(
        eq(budgets.entityId, entityId),
        eq(budgets.fiscalYear, fiscalYear),
        inArray(budgets.status, ["draft", "active"]),
      ),
    });

    if (!budget) {
      const entityCtx = await db.query.entities.findFirst({
        where: eq(entities.id, entityId),
      });

      const [newBudget] = await db
        .insert(budgets)
        .values({
          entityId,
          name: `FY${fiscalYear} Budget`,
          fiscalYear,
          status: "draft",
          currency: entityCtx?.currency ?? "GMD",
          createdById: userId,
        })
        .returning();

      budget = newBudget;
    }

    budgetId = budget?.id;
    step1.status = "completed";
    step1.completedAt = new Date().toISOString();
    step1.result = {
      budgetId: budget?.id,
      name: budget?.name,
      fiscalYear: budget?.fiscalYear,
      status: budget?.status,
      isNew: budget?.status === "draft",
    };
  } catch (err) {
    step1.status = "failed";
    step1.error = String(err);
    errors.push(`Budget creation failed: ${String(err)}`);
  }

  steps.push(step1);

  // ── Step 2: Line Mapping ────────────────────────────────────────────
  const step2: BudgetStep = {
    id: "line_mapping",
    label: "Budget Line to Dimension Mapping",
    status: "pending",
    agent: "Budget Agent",
  };

  try {
    step2.status = "in_progress";
    step2.startedAt = new Date().toISOString();

    if (!budgetId) throw new Error("No budget ID available");

    const lines = await db.query.budgetLines.findMany({
      where: and(
        eq(budgetLines.budgetId, budgetId),
        eq(budgetLines.isActive, true),
      ),
      with: { account: true },
    });

    step2.status = "completed";
    step2.completedAt = new Date().toISOString();
    step2.result = {
      lineCount: lines.length,
      mappedToDimensions: lines.filter((l) => l.dimensionId).length,
    };
  } catch (err) {
    step2.status = "failed";
    step2.error = String(err);
    errors.push(`Line mapping failed: ${String(err)}`);
  }

  steps.push(step2);

  // ── Step 3: Version Control ─────────────────────────────────────────
  const step3: BudgetStep = {
    id: "version_control",
    label: "Budget Version Control",
    status: "pending",
    agent: "Budget Agent",
  };

  try {
    step3.status = "in_progress";
    step3.startedAt = new Date().toISOString();

    if (!budgetId) throw new Error("No budget ID available");

    const versions = await db.query.budgetVersions.findMany({
      where: eq(budgetVersions.budgetId, budgetId),
      orderBy: [desc(budgetVersions.versionNumber)],
    });

    // Create a new version snapshot if lines exist and no version created this period
    const lines = await db.query.budgetLines.findMany({
      where: and(
        eq(budgetLines.budgetId, budgetId),
        eq(budgetLines.isActive, true),
      ),
    });

    const latestVersionNum = versions[0]?.versionNumber ?? 0;
    const latestVersionPeriod = versions[0]?.createdAt
      ? new Date(versions[0].createdAt).toISOString().slice(0, 7)
      : null;

    if (lines.length > 0 && latestVersionPeriod !== period) {
      const lineSnapshot = lines.map((l) => ({
        lineId: l.id,
        accountId: l.accountId,
        annualAmount: l.annualAmount,
        dimensionType: l.dimensionType ?? undefined,
        dimensionId: l.dimensionId ?? undefined,
      }));

      await db.insert(budgetVersions).values({
        entityId,
        budgetId,
        versionNumber: latestVersionNum + 1,
        changesSummary: `Auto-snapshot for ${period} pipeline run — ${lines.length} lines`,
        linesSnapshot: lineSnapshot,
        notes: `Created by Budget Agent pipeline run for ${period}`,
      });
    }

    step3.status = "completed";
    step3.completedAt = new Date().toISOString();
    step3.result = {
      totalVersions: latestVersionNum + 1,
      latestVersion: latestVersionNum + 1,
      snapshotCreated: lines.length > 0,
    };
  } catch (err) {
    step3.status = "failed";
    step3.error = String(err);
    errors.push(`Version control check failed: ${String(err)}`);
  }

  steps.push(step3);

  // ── Step 4: Actuals Feed ────────────────────────────────────────────
  const step4: BudgetStep = {
    id: "actuals_feed",
    label: "Actuals Feed from Ledger",
    status: "pending",
    agent: "Budget Agent",
  };

  try {
    step4.status = "in_progress";
    step4.startedAt = new Date().toISOString();

    if (!budgetId) throw new Error("No budget ID available");

    const lines = await db.query.budgetLines.findMany({
      where: and(
        eq(budgetLines.budgetId, budgetId),
        eq(budgetLines.isActive, true),
      ),
      with: { account: true },
    });

    // Pull actuals from journal entry lines for the period
    const periodStart = `${period}-01`;
    const periodEnd = `${period}-31`;

    const actuals = await db
      .select({
        accountId: journalEntryLines.accountId,
        total: sql<string>`COALESCE(SUM(${journalEntryLines.debit}) - SUM(${journalEntryLines.credit}), 0)`,
      })
      .from(journalEntryLines)
      .innerJoin(
        journalEntries,
        eq(journalEntryLines.journalEntryId, journalEntries.id),
      )
      .where(
        and(
          eq(journalEntries.entityId, entityId),
          eq(journalEntries.status, "posted"),
          gte(journalEntries.date, periodStart),
          lte(journalEntries.date, periodEnd),
          inArray(
            journalEntryLines.accountId,
            lines.map((l) => l.accountId),
          ),
        ),
      )
      .groupBy(journalEntryLines.accountId);

    const actualsMap = new Map(
      actuals.map((a) => [a.accountId, Math.abs(parseFloat(a.total))]),
    );

    step4.status = "completed";
    step4.completedAt = new Date().toISOString();
    step4.result = {
      linesTracked: lines.length,
      accountsWithActuals: actualsMap.size,
      totalActuals: Array.from(actualsMap.values()).reduce((s, v) => s + v, 0),
    };
  } catch (err) {
    step4.status = "failed";
    step4.error = String(err);
    errors.push(`Actuals feed failed: ${String(err)}`);
  }

  steps.push(step4);

  // ── Step 5: Variance Calculation ────────────────────────────────────
  const step5: BudgetStep = {
    id: "variance_calc",
    label: "Variance Calculation Engine",
    status: "pending",
    agent: "Budget Agent",
  };

  try {
    step5.status = "in_progress";
    step5.startedAt = new Date().toISOString();

    if (!budgetId) throw new Error("No budget ID available");

    const lines = await db.query.budgetLines.findMany({
      where: and(
        eq(budgetLines.budgetId, budgetId),
        eq(budgetLines.isActive, true),
      ),
      with: { account: true },
    });

    const monthCol = getMonthColumn(period);

    // Pull actuals again for calculations
    const periodStart = `${period}-01`;
    const periodEnd = `${period}-31`;
    const actuals = await db
      .select({
        accountId: journalEntryLines.accountId,
        total: sql<string>`COALESCE(SUM(${journalEntryLines.debit}) - SUM(${journalEntryLines.credit}), 0)`,
      })
      .from(journalEntryLines)
      .innerJoin(
        journalEntries,
        eq(journalEntryLines.journalEntryId, journalEntries.id),
      )
      .where(
        and(
          eq(journalEntries.entityId, entityId),
          eq(journalEntries.status, "posted"),
          gte(journalEntries.date, periodStart),
          lte(journalEntries.date, periodEnd),
        ),
      )
      .groupBy(journalEntryLines.accountId);

    const actualsMap = new Map(
      actuals.map((a) => [a.accountId, Math.abs(parseFloat(a.total))]),
    );

    const calculatedVariances: VarLineItem[] = [];
    let totalBudgeted = 0;
    let totalActuals = 0;
    let totalVariance = 0;

    for (const line of lines) {
      const lineData = line as typeof line & Record<string, string>;
      const budgetedAmt = parseFloat(lineData[monthCol] ?? "0");
      const actualAmt = actualsMap.get(line.accountId) ?? 0;
      const variance = actualAmt - budgetedAmt;
      const variancePct =
        budgetedAmt > 0
          ? (variance / budgetedAmt) * 100
          : actualAmt > 0
            ? 100
            : 0;

      totalBudgeted += budgetedAmt;
      totalActuals += actualAmt;
      totalVariance += variance;

      const materialityThreshold = budgetedAmt * 0.1;
      const isSignificant =
        Math.abs(variance) > materialityThreshold && Math.abs(variancePct) > 5;

      calculatedVariances.push({
        lineId: line.id,
        accountCode: line.account?.code ?? "",
        accountName: line.account?.name ?? "",
        lineDescription: line.lineDescription,
        dimensionType: line.dimensionType,
        dimensionId: line.dimensionId,
        budgetedAmount: budgetedAmt,
        actualAmount: actualAmt,
        variance,
        variancePct: Math.round(variancePct * 100) / 100,
        cumulativeVariance: variance,
        isSignificant,
        narrative: null,
      });
    }

    varianceLines = calculatedVariances;

    step5.status = "completed";
    step5.completedAt = new Date().toISOString();
    // Persist variance records to DB
    for (const v of calculatedVariances) {
      await db
        .insert(varianceRecords)
        .values({
          entityId,
          budgetLineId: v.lineId,
          period,
          budgetedAmount: v.budgetedAmount.toFixed(2),
          actualAmount: v.actualAmount.toFixed(2),
          variance: v.variance.toFixed(2),
          variancePct: v.variancePct.toFixed(2),
          cumulativeVariance: v.cumulativeVariance.toFixed(2),
          isSignificant: v.isSignificant,
          generatedBy: "agent",
        })
        .onConflictDoNothing();
    }

    step5.result = {
      linesCalculated: calculatedVariances.length,
      significantVariances: calculatedVariances.filter((v) => v.isSignificant)
        .length,
      varianceRecordsPersisted: calculatedVariances.length,
      totalBudgeted,
      totalActuals,
      totalVariance,
    };

    budgetSummary = {
      budgetId,
      name: `FY${fiscalYear} Budget`,
      fiscalYear,
      status: "active",
      totalBudgeted,
      totalActuals,
      totalVariance,
      totalVariancePct:
        totalBudgeted > 0
          ? Math.round((totalVariance / totalBudgeted) * 10000) / 100
          : 0,
      lineCount: lines.length,
    };
  } catch (err) {
    step5.status = "failed";
    step5.error = String(err);
    errors.push(`Variance calculation failed: ${String(err)}`);
  }

  steps.push(step5);

  // ── Step 6: Narrative Explanation ───────────────────────────────────
  const step6: BudgetStep = {
    id: "narrative_explanation",
    label: "Plain-English Variance Explanation",
    status: "pending",
    agent: "Budget Agent",
  };

  try {
    step6.status = "in_progress";
    step6.startedAt = new Date().toISOString();

    const significantVariances = varianceLines.filter((v) => v.isSignificant);

    for (const v of significantVariances) {
      let narrative = "";
      if (v.variance > 0) {
        narrative = `${v.accountName} actual (${v.actualAmount.toFixed(2)}) exceeded budget (${v.budgetedAmount.toFixed(2)}) by ${Math.abs(v.variance).toFixed(2)} (${v.variancePct.toFixed(1)}%). This is a ${v.variancePct > 20 ? "significant" : "moderate"} overrun.`;
      } else {
        narrative = `${v.accountName} actual (${v.actualAmount.toFixed(2)}) was under budget (${v.budgetedAmount.toFixed(2)}) by ${Math.abs(v.variance).toFixed(2)} (${Math.abs(v.variancePct).toFixed(1)}%). This represents ${v.variancePct < -20 ? "substantial" : "moderate"} underspend.`;
      }
      v.narrative = narrative;
    }

    step6.status = "completed";
    step6.completedAt = new Date().toISOString();
    // Persist narratives to variance_records
    for (const v of significantVariances) {
      await db
        .update(varianceRecords)
        .set({ narrativeExplanation: v.narrative })
        .where(
          and(
            eq(varianceRecords.budgetLineId, v.lineId),
            eq(varianceRecords.period, period),
          ),
        );
    }

    step6.result = {
      narrativesGenerated: significantVariances.length,
      narrativeLines: significantVariances.map((v) => v.lineDescription),
    };
  } catch (err) {
    step6.status = "failed";
    step6.error = String(err);
    errors.push(`Narrative generation failed: ${String(err)}`);
  }

  steps.push(step6);

  // ── Step 7: Alert Threshold Check ───────────────────────────────────
  const step7: BudgetStep = {
    id: "alert_thresholds",
    label: "Budget Alert Threshold Check",
    status: "pending",
    agent: "Budget Agent",
  };

  try {
    step7.status = "in_progress";
    step7.startedAt = new Date().toISOString();

    const triggeredAlerts: BudgetAlert[] = [];

    for (const v of varianceLines) {
      const thresholds = await db.query.budgetAlertThresholds.findFirst({
        where: eq(budgetAlertThresholds.budgetLineId, v.lineId),
      });

      if (!thresholds) continue;

      const spendPct =
        v.budgetedAmount > 0 ? (v.actualAmount / v.budgetedAmount) * 100 : 0;
      const approachingThreshold = parseFloat(thresholds.approachingPct);
      const exceededThreshold = parseFloat(thresholds.exceededPct);

      if (spendPct >= exceededThreshold) {
        triggeredAlerts.push({
          lineId: v.lineId,
          lineDescription: v.lineDescription,
          budgetedAmount: v.budgetedAmount,
          actualAmount: v.actualAmount,
          spendPct: Math.round(spendPct * 100) / 100,
          approachingPct: approachingThreshold,
          exceededPct: exceededThreshold,
          alertType: "exceeded",
        });
      } else if (spendPct >= approachingThreshold) {
        triggeredAlerts.push({
          lineId: v.lineId,
          lineDescription: v.lineDescription,
          budgetedAmount: v.budgetedAmount,
          actualAmount: v.actualAmount,
          spendPct: Math.round(spendPct * 100) / 100,
          approachingPct: approachingThreshold,
          exceededPct: exceededThreshold,
          alertType: "approaching",
        });
      }
    }

    alerts = triggeredAlerts;

    if (triggeredAlerts.length > 0) {
      const exceeded = triggeredAlerts.filter(
        (a) => a.alertType === "exceeded",
      ).length;
      const approaching = triggeredAlerts.filter(
        (a) => a.alertType === "approaching",
      ).length;
      warnings.push(
        `${exceeded} budget line(s) exceeded, ${approaching} line(s) approaching limit`,
      );
    }

    step7.status = triggeredAlerts.length > 0 ? "flagged" : "completed";
    step7.completedAt = new Date().toISOString();
    step7.result = {
      thresholdLinesChecked: varianceLines.length,
      alertsTriggered: triggeredAlerts.length,
      exceeded: triggeredAlerts.filter((a) => a.alertType === "exceeded")
        .length,
      approaching: triggeredAlerts.filter((a) => a.alertType === "approaching")
        .length,
    };
  } catch (err) {
    step7.status = "failed";
    step7.error = String(err);
    errors.push(`Alert threshold check failed: ${String(err)}`);
  }

  steps.push(step7);

  // ── Step 8: Budget Impact Check Interface ──────────────────────────
  const step8: BudgetStep = {
    id: "budget_impact_check",
    label: "Budget Impact Check Interface",
    status: "pending",
    agent: "Budget Agent (→ Expense Pipeline)",
  };

  try {
    step8.status = "in_progress";
    step8.startedAt = new Date().toISOString();

    // Fulfills the stub from Expense Pipeline Step 5
    // Reports remaining budget per department/dimension
    const activeLines = varianceLines.filter((v) => v.budgetedAmount > 0);
    const linesAtRisk = activeLines.filter(
      (v) => v.variance > 0 && v.actualAmount / v.budgetedAmount > 0.75,
    ).length;

    step8.status = "completed";
    step8.completedAt = new Date().toISOString();
    step8.result = {
      interfaceAvailable: true,
      linesWithBudget: activeLines.length,
      linesAtRisk,
      remainingBudgetTotal: varianceLines.reduce(
        (s, v) => s + Math.max(0, v.budgetedAmount - v.actualAmount),
        0,
      ),
    };
  } catch (err) {
    step8.status = "failed";
    step8.error = String(err);
    errors.push(`Budget impact check failed: ${String(err)}`);
  }

  steps.push(step8);

  // ── Step 9: Departmental Scoping ────────────────────────────────────
  const step9: BudgetStep = {
    id: "departmental_scoping",
    label: "Departmental Budget Scoping",
    status: "pending",
    agent: "Budget Agent",
  };

  try {
    step9.status = "in_progress";
    step9.startedAt = new Date().toISOString();

    const dimensions = new Map<string, number>();
    for (const v of varianceLines) {
      if (v.dimensionType && v.dimensionId) {
        const key = `${v.dimensionType}:${v.dimensionId}`;
        dimensions.set(key, (dimensions.get(key) ?? 0) + 1);
      }
    }

    step9.status = "completed";
    step9.completedAt = new Date().toISOString();
    step9.result = {
      departmentCount: dimensions.size,
      dimensionTypes: [
        ...new Set(varianceLines.map((v) => v.dimensionType).filter(Boolean)),
      ],
      totalDepartmentLines: varianceLines.filter((v) => v.dimensionId).length,
    };
  } catch (err) {
    step9.status = "failed";
    step9.error = String(err);
    errors.push(`Departmental scoping failed: ${String(err)}`);
  }

  steps.push(step9);

  // ── Step 10: Forecast Coordination ──────────────────────────────────
  const step10: BudgetStep = {
    id: "forecast_coordination",
    label: "Forecast Coordination with Analytics Agent",
    status: "pending",
    agent: "Budget Agent",
  };

  try {
    step10.status = "in_progress";
    step10.startedAt = new Date().toISOString();

    // Budget Agent forecasts against budget baseline/target
    // Analytics Agent forecasts from trend/trajectory
    // If they diverge materially, CFO Agent shows both

    const monthsElapsed = parseInt(period.split("-")[1] ?? "01", 10);
    const monthsRemaining = 12 - monthsElapsed;
    const annualBurnRate =
      monthsElapsed > 0
        ? (budgetSummary?.totalActuals ?? 0 / monthsElapsed)
        : 0;
    const projectedAnnual = annualBurnRate * 12;

    const budgetTarget = budgetSummary?.totalBudgeted ?? 0;
    const budgetVsTrendDiff =
      budgetTarget > 0
        ? ((projectedAnnual - budgetTarget) / budgetTarget) * 100
        : 0;
    const materiallyDivergent = Math.abs(budgetVsTrendDiff) > 10;

    step10.status = "completed";
    step10.completedAt = new Date().toISOString();
    step10.result = {
      budgetTarget,
      projectedAnnual: Math.round(projectedAnnual * 100) / 100,
      budgetVsTrendDiff: Math.round(budgetVsTrendDiff * 100) / 100,
      materiallyDivergent,
      monthsRemaining,
      coordinationRequired: materiallyDivergent
        ? "Budget and trend forecasts diverge >10% — both figures should be surfaced to CFO Agent with explanation"
        : "Budget and trend forecasts aligned within tolerance",
    };
  } catch (err) {
    step10.status = "failed";
    step10.error = String(err);
    errors.push(`Forecast coordination failed: ${String(err)}`);
  }

  steps.push(step10);

  // ── Step 11: Monthly Summary ────────────────────────────────────────
  const step11: BudgetStep = {
    id: "monthly_summary",
    label: "Monthly Reporting to CFO Agent",
    status: "pending",
    agent: "Budget Agent",
  };

  try {
    step11.status = "in_progress";
    step11.startedAt = new Date().toISOString();

    const significantCount = varianceLines.filter(
      (v) => v.isSignificant,
    ).length;
    const favorableCount = varianceLines.filter((v) => v.variance < 0).length;
    const unfavorableCount = varianceLines.filter((v) => v.variance > 0).length;

    step11.status = "completed";
    step11.completedAt = new Date().toISOString();
    step11.result = {
      period,
      totalBudgeted: budgetSummary?.totalBudgeted ?? 0,
      totalActuals: budgetSummary?.totalActuals ?? 0,
      totalVariance: budgetSummary?.totalVariance ?? 0,
      significantVariances: significantCount,
      favorableLines: favorableCount,
      unfavorableLines: unfavorableCount,
      alertsCount: alerts.length,
    };
  } catch (err) {
    step11.status = "failed";
    step11.error = String(err);
    errors.push(`Monthly summary failed: ${String(err)}`);
  }

  steps.push(step11);

  // ── Step 12: Audit Trail ────────────────────────────────────────────
  const step12: BudgetStep = {
    id: "audit_trail",
    label: "Audit Trail Logging",
    status: "pending",
    agent: "Budget Agent",
  };

  try {
    step12.status = "in_progress";
    step12.startedAt = new Date().toISOString();

    await db.insert(auditLog).values({
      entityId,
      userId,
      action: "budgetPipeline.run",
      entityType: "budget_pipeline_run",
      entityIdRef: budgetId ?? "N/A",
      newValues: {
        fiscalYear,
        period,
        totalLines: varianceLines.length,
        significantVariances: varianceLines.filter((v) => v.isSignificant)
          .length,
        alertsTriggered: alerts.length,
        totalBudgeted: budgetSummary?.totalBudgeted ?? 0,
        totalActuals: budgetSummary?.totalActuals ?? 0,
        totalVariance: budgetSummary?.totalVariance ?? 0,
        stepsCompleted: steps.filter((s) => s.status === "completed").length,
        totalSteps: steps.length,
        errors: errors.length,
        warnings: warnings.length,
      },
    });

    step12.status = "completed";
    step12.completedAt = new Date().toISOString();
  } catch (err) {
    step12.status = "failed";
    step12.error = String(err);
    errors.push(`Audit trail failed: ${String(err)}`);
  }

  steps.push(step12);

  const allCompleted = steps.every(
    (s) => s.status === "completed" || s.status === "skipped",
  );

  return {
    success: true,
    period,
    fiscalYear,
    steps,
    budgetSummary,
    varianceLines,
    alerts,
    errors,
    warnings,
  };
}

// ─── Status Query ────────────────────────────────────────────────────────────

export async function getBudgetStatus(params: {
  entityId: string;
  fiscalYear?: number;
  period?: string;
}): Promise<{
  hasActivePipeline: boolean;
  activeBudget: typeof budgets.$inferSelect | null;
  budgetSummary: {
    totalBudgeted: number;
    totalLines: number;
    status: string;
    departmentCount: number;
    alertCount: number;
  } | null;
  varianceSummary: {
    totalLines: number;
    significantVariances: number;
    totalVariance: number;
    totalVariancePct: number;
  } | null;
  recentAlerts: BudgetAlert[];
  forecastStatus: {
    projectedAnnual: number;
    budgetTarget: number;
    materiallyDivergent: boolean;
  } | null;
}> {
  const { entityId, fiscalYear } = params;

  // Active budget for fiscal year
  const activeBudget = fiscalYear
    ? await db.query.budgets.findFirst({
        where: and(
          eq(budgets.entityId, entityId),
          eq(budgets.fiscalYear, fiscalYear),
          eq(budgets.status, "active"),
        ),
      })
    : await db.query.budgets.findFirst({
        where: and(
          eq(budgets.entityId, entityId),
          eq(budgets.status, "active"),
        ),
        orderBy: [desc(budgets.fiscalYear)],
      });

  if (!activeBudget) {
    return {
      hasActivePipeline: false,
      activeBudget: null,
      budgetSummary: null,
      varianceSummary: null,
      recentAlerts: [],
      forecastStatus: null,
    };
  }

  // Line count
  const lines = await db.query.budgetLines.findMany({
    where: and(
      eq(budgetLines.budgetId, activeBudget.id),
      eq(budgetLines.isActive, true),
    ),
  });

  // Department count
  const departments = new Set(
    lines
      .filter((l) => l.dimensionType === "department" && l.dimensionId)
      .map((l) => l.dimensionId),
  );

  // Total budgeted
  const totalBudgeted = lines.reduce(
    (s, l) => s + parseFloat(l.annualAmount ?? "0"),
    0,
  );

  // Recent variances
  const recentVariances = await db.query.varianceRecords.findMany({
    where: eq(varianceRecords.entityId, entityId),
    orderBy: [desc(varianceRecords.createdAt)],
    limit: 10,
  });

  const totalVariance = recentVariances.reduce(
    (s, v) => s + parseFloat(v.variance ?? "0"),
    0,
  );

  // Alerts
  const thresholdLines = await db.query.budgetAlertThresholds.findMany({
    where: eq(budgetAlertThresholds.entityId, entityId),
  });

  return {
    hasActivePipeline: true,
    activeBudget,
    budgetSummary: {
      totalBudgeted,
      totalLines: lines.length,
      status: activeBudget.status,
      departmentCount: departments.size,
      alertCount: thresholdLines.length,
    },
    varianceSummary: {
      totalLines: recentVariances.length,
      significantVariances: recentVariances.filter((v) => v.isSignificant)
        .length,
      totalVariance,
      totalVariancePct:
        totalBudgeted > 0
          ? Math.round((totalVariance / totalBudgeted) * 10000) / 100
          : 0,
    },
    recentAlerts: [],
    forecastStatus: null,
  };
}

// ─── Budget Impact Check (consumed by Expense Pipeline) ───────────────────

export async function checkBudgetImpact(
  entityId: string,
  params: {
    accountId: string;
    dimensionType?: string;
    dimensionId?: string;
    requestedAmount: number;
    period: string;
  },
): Promise<BudgetImpactResult> {
  const { accountId, dimensionType, dimensionId, requestedAmount, period } =
    params;

  // Find matching budget line
  const whereConditions = [
    eq(budgetLines.entityId, entityId),
    eq(budgetLines.accountId, accountId),
    eq(budgetLines.isActive, true),
  ];
  if (dimensionType)
    whereConditions.push(eq(budgetLines.dimensionType, dimensionType));
  if (dimensionId)
    whereConditions.push(eq(budgetLines.dimensionId, dimensionId));

  const line = await db.query.budgetLines.findFirst({
    where: and(...whereConditions),
    with: { budget: true },
  });

  if (!line || line.budget?.status !== "active") {
    return {
      available: false,
      lineDescription: "No budget line found",
      budgetedAmount: 0,
      actualAmount: 0,
      remainingBudget: 0,
      requestedAmount,
      wouldExceed: true,
      alerts: [],
    };
  }

  const monthCol = getMonthColumn(period);
  const lineData = line as typeof line & Record<string, string>;
  const monthlyBudget = parseFloat(lineData[monthCol] ?? "0");

  // Get actuals for this account and period
  const periodStart = `${period}-01`;
  const periodEnd = `${period}-31`;
  const actualsRows = await db
    .select({
      total: sql<string>`COALESCE(SUM(${journalEntryLines.debit}) - SUM(${journalEntryLines.credit}), 0)`,
    })
    .from(journalEntryLines)
    .innerJoin(
      journalEntries,
      eq(journalEntryLines.journalEntryId, journalEntries.id),
    )
    .where(
      and(
        eq(journalEntries.entityId, entityId),
        eq(journalEntries.status, "posted"),
        eq(journalEntryLines.accountId, accountId),
        gte(journalEntries.date, periodStart),
        lte(journalEntries.date, periodEnd),
      ),
    );

  const actualAmt =
    actualsRows.length > 0
      ? Math.abs(parseFloat(actualsRows[0]?.total ?? "0"))
      : 0;
  const remainingBudget = Math.max(0, monthlyBudget - actualAmt);
  const wouldExceed = requestedAmount > remainingBudget;
  const spendPct =
    monthlyBudget > 0
      ? ((actualAmt + requestedAmount) / monthlyBudget) * 100
      : 0;

  // Check thresholds
  const threshold = await db.query.budgetAlertThresholds.findFirst({
    where: eq(budgetAlertThresholds.budgetLineId, line.id),
  });

  const alerts: BudgetAlert[] = [];
  if (threshold) {
    const approachingPct = parseFloat(threshold.approachingPct);
    const exceededPct = parseFloat(threshold.exceededPct);

    if (spendPct >= exceededPct) {
      alerts.push({
        lineId: line.id,
        lineDescription: line.lineDescription,
        budgetedAmount: monthlyBudget,
        actualAmount: actualAmt + requestedAmount,
        spendPct: Math.round(spendPct * 100) / 100,
        approachingPct,
        exceededPct,
        alertType: "exceeded",
      });
    } else if (spendPct >= approachingPct) {
      alerts.push({
        lineId: line.id,
        lineDescription: line.lineDescription,
        budgetedAmount: monthlyBudget,
        actualAmount: actualAmt + requestedAmount,
        spendPct: Math.round(spendPct * 100) / 100,
        approachingPct,
        exceededPct,
        alertType: "approaching",
      });
    }
  }

  return {
    available: true,
    lineDescription: line.lineDescription,
    budgetedAmount: monthlyBudget,
    actualAmount: actualAmt,
    remainingBudget,
    requestedAmount,
    wouldExceed,
    alerts,
  };
}
