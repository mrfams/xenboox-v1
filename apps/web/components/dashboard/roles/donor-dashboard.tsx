"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
} from "@/components/ui";
import { StatCard } from "@/components/dashboard/stat-card";
import { Skeleton } from "@/components/shared/loading";
import { EmptyState } from "@/components/shared/empty-state";
import { trpc } from "@/lib/trpc/client";
import { useEntity } from "@/lib/entity-context";
import { formatCurrency, cn } from "@/lib/utils";
import {
  FolderOpen,
  TrendingUp,
  AlertCircle,
  FileText,
  Download,
  CalendarDays,
  BookOpen,
  BarChart3,
  Receipt,
  DollarSign,
  Landmark,
  Globe,
  Search,
} from "lucide-react";

/**
 * Donor / Funder Dashboard
 *
 * Per Architecture Doc §5:
 * Donor portal: their project's budget vs actual, report downloads.
 * Purely read-only — donor role cannot write data.
 */

// ─── Types ──────────────────────────────────────────────────────────────

type Budget = {
  id: string;
  name: string;
  fiscalYear: number;
  status: string;
  totalBudgeted: string;
  currency: string;
  multiYear: boolean;
  multiYearEnd: number | null;
  notes: string | null;
};

type Variance = {
  id: string;
  period: string;
  budgetedAmount: string;
  actualAmount: string;
  variance: string;
  variancePct: string;
  cumulativeVariance: string;
  isSignificant: boolean;
  narrativeExplanation: string | null;
  budgetLine?: {
    lineDescription: string;
    annualAmount: string;
    account?: { name: string; code: string };
  };
};

// ─── Project Overview Widget ────────────────────────────────────────────

function ProjectOverviewWidget({
  budgets,
  isLoading,
}: {
  budgets: Budget[];
  isLoading: boolean;
}) {
  const activeBudgets = budgets.filter((b) => b.status === "active");
  const totalFunded = activeBudgets.reduce(
    (s, b) => s + parseFloat(b.totalBudgeted),
    0,
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (budgets.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Active Projects
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={<FolderOpen className="h-8 w-8 text-muted-foreground" />}
            title="No projects yet"
            description="Budgets and projects will appear here once they are set up."
            className="py-6"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Active Projects
          </CardTitle>
          <Badge variant="outline" className="text-xs font-normal">
            {activeBudgets.length} of {budgets.length} active
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {activeBudgets.length > 0 && (
          <div className="mb-3 rounded-lg bg-primary/5 p-3">
            <p className="text-xs text-muted-foreground">Total Funded</p>
            <p className="text-xl font-bold">{formatCurrency(totalFunded)}</p>
          </div>
        )}
        {budgets.map((budget) => {
          const amount = parseFloat(budget.totalBudgeted);
          const isActive = budget.status === "active";
          return (
            <div
              key={budget.id}
              className={cn(
                "flex items-center justify-between rounded-lg border p-3 transition-colors",
                isActive
                  ? "hover:bg-accent/40 hover:border-primary/20"
                  : "opacity-60",
              )}
            >
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                    isActive
                      ? "bg-emerald-500/10 text-emerald-600"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  <FolderOpen className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{budget.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">
                      FY {budget.fiscalYear}
                      {budget.multiYear && budget.multiYearEnd
                        ? `–${budget.multiYearEnd}`
                        : ""}
                    </span>
                    <Badge
                      variant={isActive ? "secondary" : "outline"}
                      className="text-[10px] px-1.5 py-0"
                    >
                      {budget.status}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0 ml-3">
                <p className="text-sm font-semibold tabular-nums">
                  {formatCurrency(amount)}
                </p>
                <p className="text-[10px] text-muted-foreground">budgeted</p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// ─── Budget vs Actual Widget ────────────────────────────────────────────

function BudgetVsActualWidget({
  budgets,
  variances,
  isLoading,
}: {
  budgets: Budget[];
  variances: Variance[];
  isLoading: boolean;
}) {
  const [selectedBudgetId, setSelectedBudgetId] = useState<string | null>(null);

  const activeBudgets = budgets.filter((b) => b.status === "active");

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (activeBudgets.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Budget vs Actual
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={<BarChart3 className="h-8 w-8 text-muted-foreground" />}
            title="No active budgets"
            description="Budget vs actual tracking will appear once active budgets exist."
            className="py-6"
          />
        </CardContent>
      </Card>
    );
  }

  // Compute budget vs actual per budget by matching variances to fiscal year
  const budgetPeriodMap = new Map<
    string,
    {
      budgetId: string;
      budgetName: string;
      totalBudgeted: number;
      totalActual: number;
      periodCount: number;
    }
  >();

  // For each active budget, estimate actuals from variances if they exist
  // Variances have period YYYY-MM which helps us determine fiscal year alignment
  for (const budget of activeBudgets) {
    const relevantVariances = variances.filter((v) =>
      v.period.startsWith(String(budget.fiscalYear)),
    );
    const totalBudgeted = parseFloat(budget.totalBudgeted);
    const totalActual = relevantVariances.reduce(
      (s, v) => s + parseFloat(v.actualAmount),
      0,
    );

    budgetPeriodMap.set(budget.id, {
      budgetId: budget.id,
      budgetName: budget.name,
      totalBudgeted,
      totalActual: totalActual || 0,
      periodCount: relevantVariances.length,
    });
  }

  const budgetStats = Array.from(budgetPeriodMap.values());
  // Only show budgets that have some actuals, plus at least one empty one for demo
  const displayStats =
    budgetStats.filter((s) => s.periodCount > 0).length > 0
      ? budgetStats.filter((s) => s.periodCount > 0)
      : budgetStats.slice(0, 3);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Budget vs Actual
          </CardTitle>
          {displayStats.length > 0 && (
            <Badge variant="outline" className="text-xs font-normal">
              {displayStats.length} projects
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {displayStats.map((stat) => {
          const pctUsed =
            stat.totalBudgeted > 0
              ? Math.min(
                  100,
                  Math.round((stat.totalActual / stat.totalBudgeted) * 100),
                )
              : 0;
          const isOverBudget = pctUsed > 100;
          const isApproaching = pctUsed >= 80 && pctUsed <= 100;

          return (
            <div
              key={stat.budgetId}
              className="rounded-lg border p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {stat.budgetName}
                  </p>
                </div>
                <Badge
                  variant={
                    isOverBudget
                      ? "destructive"
                      : isApproaching
                        ? "secondary"
                        : "outline"
                  }
                  className="text-[10px] shrink-0 ml-2"
                >
                  {isOverBudget
                    ? "Over Budget"
                    : isApproaching
                      ? "Approaching Limit"
                      : "On Track"}
                </Badge>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">
                    {formatCurrency(stat.totalActual)} spent
                  </span>
                  <span className="font-medium tabular-nums">{pctUsed}%</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      isOverBudget
                        ? "bg-red-500"
                        : isApproaching
                          ? "bg-amber-500"
                          : "bg-emerald-500",
                    )}
                    style={{ width: `${Math.min(pctUsed, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Budget: {formatCurrency(stat.totalBudgeted)}</span>
                  {stat.periodCount > 0 && (
                    <span>{stat.periodCount} periods tracked</span>
                  )}
                </div>
              </div>

              {/* Variance indicator */}
              {isOverBudget && (
                <div className="flex items-center gap-1.5 rounded-md bg-red-50 dark:bg-red-950/20 px-2.5 py-1.5 text-xs text-red-600">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  <span>
                    Exceeded budget by{" "}
                    {formatCurrency(stat.totalActual - stat.totalBudgeted)}
                  </span>
                </div>
              )}
              {isApproaching && !isOverBudget && (
                <div className="flex items-center gap-1.5 rounded-md bg-amber-50 dark:bg-amber-950/20 px-2.5 py-1.5 text-xs text-amber-600">
                  <TrendingUp className="h-3 w-3 shrink-0" />
                  <span>{100 - pctUsed}% of budget remaining</span>
                </div>
              )}
            </div>
          );
        })}

        {/* Budget Selector */}
        {activeBudgets.length > 3 && (
          <div className="flex flex-wrap gap-1.5">
            <span className="text-[11px] text-muted-foreground self-center mr-1">
              View:
            </span>
            {activeBudgets.slice(0, 5).map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() =>
                  setSelectedBudgetId(selectedBudgetId === b.id ? null : b.id)
                }
                className={cn(
                  "rounded-md px-2 py-1 text-[11px] transition-colors",
                  selectedBudgetId === b.id
                    ? "bg-primary/10 text-primary font-medium"
                    : "bg-muted text-muted-foreground hover:bg-accent",
                )}
              >
                {b.name.length > 18 ? b.name.slice(0, 16) + "…" : b.name}
              </button>
            ))}
            {selectedBudgetId && (
              <button
                type="button"
                onClick={() => setSelectedBudgetId(null)}
                className="rounded-md px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Report Downloads Widget ────────────────────────────────────────────

const AVAILABLE_REPORTS = [
  {
    id: "pnl",
    label: "Profit & Loss Statement",
    description: "Income and expenses for the current period",
    icon: Receipt,
    href: "/dashboard/reports?report=pnl",
  },
  {
    id: "balance-sheet",
    label: "Balance Sheet",
    description: "Assets, liabilities, and equity summary",
    icon: Landmark,
    href: "/dashboard/reports?report=balance-sheet",
  },
  {
    id: "budget-vs-actual",
    label: "Budget vs Actual Report",
    description: "Detailed variance analysis by project",
    icon: BarChart3,
    href: "/dashboard/reports?report=budget-vs-actual",
  },
  {
    id: "cash-flow",
    label: "Cash Flow Statement",
    description: "Operating, investing, and financing activities",
    icon: DollarSign,
    href: "/dashboard/reports?report=cash-flow",
  },
  {
    id: "trial-balance",
    label: "Trial Balance",
    description: "Complete listing of all accounts and balances",
    icon: BookOpen,
    href: "/dashboard/reports?report=trial-balance",
  },
  {
    id: "donor-summary",
    label: "Donor Summary Report",
    description: "Consolidated report across all funded projects",
    icon: FileText,
    href: "/dashboard/reports?report=donor-summary",
  },
];

function DonorReportsWidget() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Available Reports
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2">
          {AVAILABLE_REPORTS.map((report) => {
            const Icon = report.icon;
            return (
              <Link key={report.id} href={report.href}>
                <div className="group flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors hover:border-primary/30 hover:bg-accent/40">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/5 text-primary group-hover:bg-primary/10 transition-colors">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{report.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {report.description}
                    </p>
                  </div>
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                    <Download className="h-3.5 w-3.5" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Period Summary Widget ─────────────────────────────────────────────

function PeriodSummaryWidget() {
  const { data: periods, isLoading } = trpc.reports.listPeriods.useQuery();
  const { data: summary, isLoading: summaryLoading } =
    trpc.organization.getEntitySummary.useQuery();

  const latestPeriod = periods?.[periods.length - 1];

  if (isLoading || summaryLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-28" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-12 rounded-lg" />
          <Skeleton className="h-12 rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Period Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Current Period */}
        {latestPeriod && (
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
              <CalendarDays className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium">Current Period</p>
              <p className="text-xs text-muted-foreground">
                {new Date(latestPeriod.startDate).toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}{" "}
                –{" "}
                {new Date(latestPeriod.endDate).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
            <Badge
              variant={latestPeriod.status === "open" ? "secondary" : "outline"}
              className="ml-auto shrink-0"
            >
              {latestPeriod.status}
            </Badge>
          </div>
        )}

        {/* Summary Metrics */}
        {summary && (
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border p-2.5">
              <p className="text-[11px] text-muted-foreground">Cash Balance</p>
              <p className="text-sm font-semibold tabular-nums">
                {formatCurrency(summary.cashBalance)}
              </p>
            </div>
            <div className="rounded-lg border p-2.5">
              <p className="text-[11px] text-muted-foreground">
                Outstanding Payables
              </p>
              <p className="text-sm font-semibold tabular-nums">
                {formatCurrency(summary.apOutstanding)}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Dashboard Component ──────────────────────────────────────────

export function DonorDashboard() {
  useEntity();

  const { data: budgets, isLoading: budgetsLoading } =
    trpc.budget.listBudgets.useQuery({});
  const { data: variances, isLoading: variancesLoading } =
    trpc.budget.listVariances.useQuery({ limit: 50 });
  const { data: periods, isLoading: periodsLoading } =
    trpc.reports.listPeriods.useQuery();
  const { data: summary, isLoading: summaryLoading } =
    trpc.organization.getEntitySummary.useQuery();

  const isLoading =
    budgetsLoading || variancesLoading || periodsLoading || summaryLoading;

  const metrics = useMemo(() => {
    const activeBudgets = (budgets ?? []).filter(
      (b: Budget) => b.status === "active",
    );
    const totalCommitted = activeBudgets.reduce(
      (s: number, b: Budget) => s + parseFloat(b.totalBudgeted),
      0,
    );
    return {
      totalProjects: activeBudgets.length,
      totalCommitted,
      totalBudgets: (budgets ?? []).length,
      openPeriods: (periods ?? []).filter(
        (p: { status: string }) => p.status === "open",
      ).length,
    };
  }, [budgets, periods]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Donor Portal</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track funded projects, monitor budgets vs actuals, and access reports
          — all in read-only view.
        </p>
        <div className="mt-2 flex items-center gap-2">
          <Badge
            variant="secondary"
            className="text-[11px] bg-blue-500/10 text-blue-600 hover:bg-blue-500/15"
          >
            <Globe className="h-3 w-3 mr-1" />
            Donor access
          </Badge>
          <Badge variant="outline" className="text-[11px]">
            Read-only
          </Badge>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<FolderOpen className="h-4 w-4" />}
          label="Active Projects"
          value={String(metrics.totalProjects)}
          changeLabel={
            metrics.totalProjects > 0
              ? `of ${metrics.totalBudgets} total`
              : "No active projects"
          }
        />
        <StatCard
          icon={<DollarSign className="h-4 w-4" />}
          label="Total Committed"
          value={formatCurrency(metrics.totalCommitted)}
          changeLabel="Across all projects"
          href="/dashboard/budget"
        />
        <StatCard
          icon={<CalendarDays className="h-4 w-4" />}
          label="Open Periods"
          value={String(metrics.openPeriods)}
          changeLabel="Currently tracking"
        />
        <StatCard
          icon={<Search className="h-4 w-4" />}
          label="Available Reports"
          value={String(AVAILABLE_REPORTS.length)}
          changeLabel="Downloadable"
        />
      </div>

      {/* Main Content */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <BudgetVsActualWidget
            budgets={budgets ?? []}
            variances={variances ?? []}
            isLoading={budgetsLoading || variancesLoading}
          />
          <DonorReportsWidget />
        </div>
        <div className="space-y-4">
          <ProjectOverviewWidget
            budgets={budgets ?? []}
            isLoading={budgetsLoading}
          />
          <PeriodSummaryWidget />
        </div>
      </div>
    </div>
  );
}
