/**
 * Budget Seed Data
 *
 * Test data for the Budgeting Pipeline development.
 * Creates 2 budget versions (draft + active), 10+ budget lines mapped to
 * COA accounts and departments, version snapshots, variance records,
 * and alert thresholds.
 *
 * Run: pnpm db:seed (or call seedBudget() from the main seed file)
 *
 * Uses same patterns as fixed-assets seed:
 *   - deterministic UUIDs via seedUuid()
 *   - onConflictDoNothing() for idempotent re-runs
 *   - entity-scoped to the demo entity
 */

import crypto from "node:crypto";
import { db } from "../index";
import {
  budgets,
  budgetLines,
  budgetVersions,
  varianceRecords,
  budgetAlertThresholds,
} from "../schema/budget";

// ─── Deterministic UUID helper ──────────────────────────────────────────
function seedUuid(type: string, n: number): string {
  const hash = crypto.createHash("sha256").update(`${type}-${n}`).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
}

// ─── Account reference IDs (must match the main seed) ───────────────────
const A = (code: string) => {
  const hash = crypto.createHash("sha256").update(`acct-${code}`).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
};

const ACCT = {
  salaryExpense: A("6010"),
  rentExpense: A("6020"),
  utilitiesExpense: A("6030"),
  officeExpense: A("6050"),
  travelExpense: A("6060"),
  marketingExpense: A("6070"),
  insuranceExpense: A("6080"),
  cogs: A("5010"),
  depreciation: A("6040"),
  interestExpense: A("7010"),
};

// ─── Budget Header Definitions ──────────────────────────────────────────
interface BudgetDef {
  name: string;
  fiscalYear: number;
  status: "draft" | "active" | "superseded";
  createdById: string;
  approvedById?: string;
  totalBudgeted: string;
}

const BUDGETS: BudgetDef[] = [
  {
    name: "FY2026 Annual Budget",
    fiscalYear: 2026,
    status: "active",
    createdById: "demo@xenboox.com",
    approvedById: "demo@xenboox.com",
    totalBudgeted: "3792000",
  },
  {
    name: "FY2027 Draft Budget",
    fiscalYear: 2027,
    status: "draft",
    createdById: "demo@xenboox.com",
    totalBudgeted: "3100000",
  },
];

// ─── Budget Line Definitions ────────────────────────────────────────────
interface BudgetLineDef {
  budgetIdx: number;
  accountCode: string;
  description: string;
  dimensionType: "department" | "project" | "cost_center" | null;
  dimensionId: string | null;
  annualAmount: string;
  monthly: Record<string, string>;
}

const BUDGET_LINES: BudgetLineDef[] = [
  // ── Finance Department ─────────────────────────────────────────────
  {
    budgetIdx: 0,
    accountCode: "6010",
    description: "Finance team salaries",
    dimensionType: "department",
    dimensionId: "fin",
    annualAmount: "540000",
    monthly: {
      jan: "45000",
      feb: "45000",
      mar: "45000",
      apr: "45000",
      may: "45000",
      jun: "45000",
      jul: "45000",
      aug: "45000",
      sep: "45000",
      oct: "45000",
      nov: "45000",
      dec: "45000",
    },
  },
  {
    budgetIdx: 0,
    accountCode: "6020",
    description: "Finance department rent allocation",
    dimensionType: "department",
    dimensionId: "fin",
    annualAmount: "120000",
    monthly: {
      jan: "10000",
      feb: "10000",
      mar: "10000",
      apr: "10000",
      may: "10000",
      jun: "10000",
      jul: "10000",
      aug: "10000",
      sep: "10000",
      oct: "10000",
      nov: "10000",
      dec: "10000",
    },
  },
  {
    budgetIdx: 0,
    accountCode: "6050",
    description: "Finance office supplies",
    dimensionType: "department",
    dimensionId: "fin",
    annualAmount: "36000",
    monthly: {
      jan: "3000",
      feb: "3000",
      mar: "3000",
      apr: "3000",
      may: "3000",
      jun: "3000",
      jul: "3000",
      aug: "3000",
      sep: "3000",
      oct: "3000",
      nov: "3000",
      dec: "3000",
    },
  },

  // ── Sales Department ───────────────────────────────────────────────
  {
    budgetIdx: 0,
    accountCode: "6010",
    description: "Sales team salaries",
    dimensionType: "department",
    dimensionId: "sales",
    annualAmount: "456000",
    monthly: {
      jan: "38000",
      feb: "38000",
      mar: "38000",
      apr: "38000",
      may: "38000",
      jun: "38000",
      jul: "38000",
      aug: "38000",
      sep: "38000",
      oct: "38000",
      nov: "38000",
      dec: "38000",
    },
  },
  {
    budgetIdx: 0,
    accountCode: "6070",
    description: "Sales marketing & advertising",
    dimensionType: "department",
    dimensionId: "sales",
    annualAmount: "240000",
    monthly: {
      jan: "20000",
      feb: "20000",
      mar: "20000",
      apr: "20000",
      may: "20000",
      jun: "20000",
      jul: "20000",
      aug: "20000",
      sep: "20000",
      oct: "20000",
      nov: "20000",
      dec: "20000",
    },
  },
  {
    budgetIdx: 0,
    accountCode: "6060",
    description: "Sales travel & client visits",
    dimensionType: "department",
    dimensionId: "sales",
    annualAmount: "120000",
    monthly: {
      jan: "10000",
      feb: "10000",
      mar: "10000",
      apr: "10000",
      may: "10000",
      jun: "10000",
      jul: "10000",
      aug: "10000",
      sep: "10000",
      oct: "10000",
      nov: "10000",
      dec: "10000",
    },
  },

  // ── Operations Department ──────────────────────────────────────────
  {
    budgetIdx: 0,
    accountCode: "6010",
    description: "Operations team salaries",
    dimensionType: "department",
    dimensionId: "ops",
    annualAmount: "420000",
    monthly: {
      jan: "35000",
      feb: "35000",
      mar: "35000",
      apr: "35000",
      may: "35000",
      jun: "35000",
      jul: "35000",
      aug: "35000",
      sep: "35000",
      oct: "35000",
      nov: "35000",
      dec: "35000",
    },
  },
  {
    budgetIdx: 0,
    accountCode: "6030",
    description: "Operations utilities (NAWEC)",
    dimensionType: "department",
    dimensionId: "ops",
    annualAmount: "480000",
    monthly: {
      jan: "40000",
      feb: "40000",
      mar: "40000",
      apr: "40000",
      may: "40000",
      jun: "40000",
      jul: "40000",
      aug: "40000",
      sep: "40000",
      oct: "40000",
      nov: "40000",
      dec: "40000",
    },
  },
  {
    budgetIdx: 0,
    accountCode: "6020",
    description: "Warehouse rent & utilities",
    dimensionType: "department",
    dimensionId: "ops",
    annualAmount: "180000",
    monthly: {
      jan: "15000",
      feb: "15000",
      mar: "15000",
      apr: "15000",
      may: "15000",
      jun: "15000",
      jul: "15000",
      aug: "15000",
      sep: "15000",
      oct: "15000",
      nov: "15000",
      dec: "15000",
    },
  },

  // ── IT Department ──────────────────────────────────────────────────
  {
    budgetIdx: 0,
    accountCode: "6010",
    description: "IT team salaries",
    dimensionType: "department",
    dimensionId: "it",
    annualAmount: "360000",
    monthly: {
      jan: "30000",
      feb: "30000",
      mar: "30000",
      apr: "30000",
      may: "30000",
      jun: "30000",
      jul: "30000",
      aug: "30000",
      sep: "30000",
      oct: "30000",
      nov: "30000",
      dec: "30000",
    },
  },
  {
    budgetIdx: 0,
    accountCode: "6050",
    description: "IT equipment & software",
    dimensionType: "department",
    dimensionId: "it",
    annualAmount: "240000",
    monthly: {
      jan: "20000",
      feb: "20000",
      mar: "20000",
      apr: "20000",
      may: "20000",
      jun: "20000",
      jul: "20000",
      aug: "20000",
      sep: "20000",
      oct: "20000",
      nov: "20000",
      dec: "20000",
    },
  },

  // ── Admin Department ───────────────────────────────────────────────
  {
    budgetIdx: 0,
    accountCode: "6010",
    description: "Admin team salaries",
    dimensionType: "department",
    dimensionId: "admin",
    annualAmount: "300000",
    monthly: {
      jan: "25000",
      feb: "25000",
      mar: "25000",
      apr: "25000",
      may: "25000",
      jun: "25000",
      jul: "25000",
      aug: "25000",
      sep: "25000",
      oct: "25000",
      nov: "25000",
      dec: "25000",
    },
  },
  {
    budgetIdx: 0,
    accountCode: "6050",
    description: "Admin office supplies & stationery",
    dimensionType: "department",
    dimensionId: "admin",
    annualAmount: "60000",
    monthly: {
      jan: "5000",
      feb: "5000",
      mar: "5000",
      apr: "5000",
      may: "5000",
      jun: "5000",
      jul: "5000",
      aug: "5000",
      sep: "5000",
      oct: "5000",
      nov: "5000",
      dec: "5000",
    },
  },
  {
    budgetIdx: 0,
    accountCode: "6080",
    description: "Insurance (health & liability)",
    dimensionType: "department",
    dimensionId: "admin",
    annualAmount: "240000",
    monthly: {
      jan: "20000",
      feb: "20000",
      mar: "20000",
      apr: "20000",
      may: "20000",
      jun: "20000",
      jul: "20000",
      aug: "20000",
      sep: "20000",
      oct: "20000",
      nov: "20000",
      dec: "20000",
    },
  },

  // ── Draft FY2027 Lines (subset) ────────────────────────────────────
  {
    budgetIdx: 1,
    accountCode: "6010",
    description: "All salaries (projected 10% increase)",
    dimensionType: null,
    dimensionId: null,
    annualAmount: "1840000",
    monthly: {
      jan: "153333",
      feb: "153333",
      mar: "153333",
      apr: "153333",
      may: "153334",
      jun: "153334",
      jul: "153334",
      aug: "153334",
      sep: "153334",
      oct: "153334",
      nov: "153334",
      dec: "153334",
    },
  },
  {
    budgetIdx: 1,
    accountCode: "6050",
    description: "Office supplies (projected 5% increase)",
    dimensionType: null,
    dimensionId: null,
    annualAmount: "75600",
    monthly: {
      jan: "6300",
      feb: "6300",
      mar: "6300",
      apr: "6300",
      may: "6300",
      jun: "6300",
      jul: "6300",
      aug: "6300",
      sep: "6300",
      oct: "6300",
      nov: "6300",
      dec: "6300",
    },
  },
];

// ─── Version Snapshots ──────────────────────────────────────────────────
interface VersionDef {
  budgetIdx: number;
  versionNumber: number;
  changesSummary: string;
  lineCount: number;
}

const VERSIONS: VersionDef[] = [
  {
    budgetIdx: 0,
    versionNumber: 1,
    changesSummary: "Initial budget created from annual planning process",
    lineCount: 13,
  },
  {
    budgetIdx: 0,
    versionNumber: 2,
    changesSummary:
      "Revised marketing budget (+50K GMD) and IT equipment (+20K)",
    lineCount: 13,
  },
];

// ─── Alert Thresholds ───────────────────────────────────────────────────
interface ThresholdDef {
  accountCode: string;
  dimensionId: string;
  approachingPct: string;
  exceededPct: string;
}

const THRESHOLDS: ThresholdDef[] = [
  {
    accountCode: "6010",
    dimensionId: "fin",
    approachingPct: "90.00",
    exceededPct: "100.00",
  },
  {
    accountCode: "6070",
    dimensionId: "sales",
    approachingPct: "80.00",
    exceededPct: "100.00",
  },
  {
    accountCode: "6030",
    dimensionId: "ops",
    approachingPct: "85.00",
    exceededPct: "95.00",
  },
  {
    accountCode: "6050",
    dimensionId: "it",
    approachingPct: "80.00",
    exceededPct: "100.00",
  },
];

// ─── Variance Records — simulated for Q1 2026 ──────────────────────────
interface VarianceDef {
  accountCode: string;
  dimensionId: string;
  period: string;
  budgetedAmount: string;
  actualAmount: string;
  isSignificant: boolean;
  narrativeExplanation?: string;
}

const VARIANCES: VarianceDef[] = [
  {
    accountCode: "6070",
    dimensionId: "sales",
    period: "2026-01",
    budgetedAmount: "20000",
    actualAmount: "18500",
    isSignificant: false,
  },
  {
    accountCode: "6030",
    dimensionId: "ops",
    period: "2026-01",
    budgetedAmount: "40000",
    actualAmount: "42350",
    isSignificant: true,
    narrativeExplanation:
      "NAWEC utilities for January were 5.9% over budget due to increased air conditioning usage during the hot season. The Operations Manager has been notified and energy-saving measures are being implemented.",
  },
  {
    accountCode: "6010",
    dimensionId: "fin",
    period: "2026-01",
    budgetedAmount: "45000",
    actualAmount: "45000",
    isSignificant: false,
  },
  {
    accountCode: "6010",
    dimensionId: "sales",
    period: "2026-01",
    budgetedAmount: "38000",
    actualAmount: "38000",
    isSignificant: false,
  },
  {
    accountCode: "6050",
    dimensionId: "it",
    period: "2026-01",
    budgetedAmount: "20000",
    actualAmount: "24800",
    isSignificant: true,
    narrativeExplanation:
      "IT equipment costs exceeded budget by 24% due to emergency replacement of failed network switch. One-time unplanned expense — remainder of year expected to be on budget.",
  },
  {
    accountCode: "6010",
    dimensionId: "ops",
    period: "2026-02",
    budgetedAmount: "35000",
    actualAmount: "35000",
    isSignificant: false,
  },
  {
    accountCode: "6070",
    dimensionId: "sales",
    period: "2026-02",
    budgetedAmount: "20000",
    actualAmount: "22500",
    isSignificant: true,
    narrativeExplanation:
      "Marketing overrun due to radio ad campaign for Ramadan sales event. Expected to generate additional revenue offset. Campaign ROI being tracked.",
  },
  {
    accountCode: "6030",
    dimensionId: "ops",
    period: "2026-02",
    budgetedAmount: "40000",
    actualAmount: "41000",
    isSignificant: false,
  },
  {
    accountCode: "6050",
    dimensionId: "fin",
    period: "2026-01",
    budgetedAmount: "3000",
    actualAmount: "3200",
    isSignificant: false,
  },
  {
    accountCode: "6060",
    dimensionId: "sales",
    period: "2026-03",
    budgetedAmount: "10000",
    actualAmount: "12800",
    isSignificant: true,
    narrativeExplanation:
      "Travel costs exceeded budget by 28% due to unplanned client meeting in Dakar. Pre-approved by Sales Lead as potential high-value opportunity.",
  },
];

// ─── Main Seed Function ──────────────────────────────────────────────────

export async function seedBudget(entityId: string): Promise<void> {
  console.log("Seeding budget pipeline test data...");

  // ── 1. Budgets ────────────────────────────────────────────────────────
  console.log(`  Creating ${BUDGETS.length} budgets...`);
  const budgetIds: string[] = [];

  for (let i = 0; i < BUDGETS.length; i++) {
    const b = BUDGETS[i];
    const budgetId = seedUuid("budget", i + 1);
    budgetIds.push(budgetId);

    await db
      .insert(budgets)
      .values({
        id: budgetId,
        entityId,
        name: b.name,
        fiscalYear: b.fiscalYear,
        status: b.status,
        totalBudgeted: b.totalBudgeted,
        createdById: b.createdById,
        approvedById: b.approvedById ?? null,
        approvedAt: b.status === "active" ? new Date("2025-12-15") : null,
      })
      .onConflictDoNothing();
  }

  // ── 2. Budget Lines ───────────────────────────────────────────────────
  console.log(`  Creating ${BUDGET_LINES.length} budget lines...`);
  const lineIds: string[] = [];

  for (let i = 0; i < BUDGET_LINES.length; i++) {
    const l = BUDGET_LINES[i];
    const budgetId = budgetIds[l.budgetIdx];
    const accountId = ACCT[l.accountCode as keyof typeof ACCT];
    const lineId = seedUuid("budget-line", i + 1);
    lineIds.push(lineId);

    await db
      .insert(budgetLines)
      .values({
        id: lineId,
        entityId,
        budgetId,
        accountId,
        lineDescription: l.description,
        dimensionType: l.dimensionType,
        dimensionId: l.dimensionId,
        annualAmount: l.annualAmount,
        jan: l.monthly.jan,
        feb: l.monthly.feb,
        mar: l.monthly.mar,
        apr: l.monthly.apr,
        may: l.monthly.may,
        jun: l.monthly.jun,
        jul: l.monthly.jul,
        aug: l.monthly.aug,
        sep: l.monthly.sep,
        oct: l.monthly.oct,
        nov: l.monthly.nov,
        dec: l.monthly.dec,
        isActive: true,
      })
      .onConflictDoNothing();
  }

  // ── 3. Budget Versions ────────────────────────────────────────────────
  console.log(`  Creating ${VERSIONS.length} budget versions...`);

  // Build line snapshot from first BUDGET_LINES items belonging to budget 0
  const budget0Lines = BUDGET_LINES.filter((l) => l.budgetIdx === 0);
  const lineSnapshot = budget0Lines.map((l) => ({
    lineId: seedUuid("budget-line", BUDGET_LINES.indexOf(l) + 1),
    accountId: ACCT[l.accountCode as keyof typeof ACCT],
    annualAmount: l.annualAmount,
    dimensionType: l.dimensionType ?? undefined,
    dimensionId: l.dimensionId ?? undefined,
  }));

  for (let i = 0; i < VERSIONS.length; i++) {
    const v = VERSIONS[i];
    await db
      .insert(budgetVersions)
      .values({
        id: seedUuid("budget-version", i + 1),
        entityId,
        budgetId: budgetIds[v.budgetIdx],
        versionNumber: v.versionNumber,
        changesSummary: v.changesSummary,
        linesSnapshot: lineSnapshot,
        approvedById: "demo@xenboox.com",
        approvedAt: new Date(`2025-12-${10 + v.versionNumber}`),
      })
      .onConflictDoNothing();
  }

  // ── 4. Variance Records ───────────────────────────────────────────────
  console.log(`  Creating ${VARIANCES.length} variance records...`);

  for (let i = 0; i < VARIANCES.length; i++) {
    const v = VARIANCES[i];
    const accountId = ACCT[v.accountCode as keyof typeof ACCT];

    // Find matching budget line
    const lineMatch = BUDGET_LINES.findIndex(
      (l) => l.accountCode === v.accountCode && l.dimensionId === v.dimensionId,
    );
    if (lineMatch < 0) {
      console.log(
        `    Skipping variance: no line match for ${v.accountCode}/${v.dimensionId}`,
      );
      continue;
    }

    const budgeted = parseFloat(v.budgetedAmount);
    const actual = parseFloat(v.actualAmount);
    const varianceAmount = actual - budgeted;
    const variancePct = budgeted > 0 ? (varianceAmount / budgeted) * 100 : 0;

    await db
      .insert(varianceRecords)
      .values({
        id: seedUuid("variance", i + 1),
        entityId,
        budgetLineId: lineIds[lineMatch],
        period: v.period,
        budgetedAmount: v.budgetedAmount,
        actualAmount: v.actualAmount,
        variance: varianceAmount.toFixed(2),
        variancePct: variancePct.toFixed(2),
        cumulativeVariance: varianceAmount.toFixed(2),
        isSignificant: v.isSignificant,
        narrativeExplanation: v.narrativeExplanation ?? null,
        generatedBy: "agent",
      })
      .onConflictDoNothing();
  }

  // ── 5. Alert Thresholds ───────────────────────────────────────────────
  console.log(`  Creating ${THRESHOLDS.length} alert thresholds...`);

  for (let i = 0; i < THRESHOLDS.length; i++) {
    const t = THRESHOLDS[i];
    const accountId = ACCT[t.accountCode as keyof typeof ACCT];

    // Find matching budget line
    const lineMatch = BUDGET_LINES.findIndex(
      (l) => l.accountCode === t.accountCode && l.dimensionId === t.dimensionId,
    );
    if (lineMatch < 0) {
      console.log(
        `    Skipping threshold: no line match for ${t.accountCode}/${t.dimensionId}`,
      );
      continue;
    }

    await db
      .insert(budgetAlertThresholds)
      .values({
        id: seedUuid("threshold", i + 1),
        entityId,
        budgetLineId: lineIds[lineMatch],
        approachingPct: t.approachingPct,
        exceededPct: t.exceededPct,
        isActive: true,
      })
      .onConflictDoNothing();
  }

  console.log("  ✅ Budget pipeline seed complete!");
  console.log(
    `    ${BUDGETS.length} budgets · ${BUDGET_LINES.length} lines · ${VERSIONS.length} versions · ${VARIANCES.length} variances · ${THRESHOLDS.length} thresholds`,
  );
}
