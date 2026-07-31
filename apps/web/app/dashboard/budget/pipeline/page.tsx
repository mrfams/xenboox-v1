"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { BudgetLiveness } from "@/components/agents/budget-liveness";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/loading";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Badge,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui";
import {
  Calculator,
  AlertTriangle,
  PlayCircle,
  CheckCircle2,
  RefreshCw,
  FileText,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ClipboardCheck,
  Gavel,
  PiggyBank,
  BarChart3,
  Users,
} from "lucide-react";
import { cn, formatDate, formatCurrency } from "@/lib/utils";

// ─── Helpers ────────────────────────────────────────────────────────────────

const STEP_ICONS: Record<string, typeof Calculator> = {
  budget_creation: PiggyBank,
  line_mapping: ClipboardCheck,
  version_control: RefreshCw,
  actuals_feed: TrendingDown,
  variance_calc: Calculator,
  narrative_explanation: FileText,
  alert_thresholds: AlertTriangle,
  budget_impact_check: CheckCircle2,
  departmental_scoping: Users,
  forecast_coordination: BarChart3,
  monthly_summary: TrendingUp,
  audit_trail: Gavel,
};

const STEP_LABELS: Record<string, string> = {
  budget_creation: "Budget Creation",
  line_mapping: "Line Mapping",
  version_control: "Version Control",
  actuals_feed: "Actuals Feed",
  variance_calc: "Variance Calc",
  narrative_explanation: "Narratives",
  alert_thresholds: "Alert Check",
  budget_impact_check: "Impact Check",
  departmental_scoping: "Dept. Scoping",
  forecast_coordination: "Forecast Coord.",
  monthly_summary: "Monthly Summary",
  audit_trail: "Audit Trail",
};

const STEP_AGENTS: Record<string, string> = {
  budget_creation: "Budget Agent",
  line_mapping: "Budget Agent",
  version_control: "Budget Agent",
  actuals_feed: "Budget Agent",
  variance_calc: "Budget Agent",
  narrative_explanation: "Budget Agent",
  alert_thresholds: "Budget Agent",
  budget_impact_check: "Budget Agent (→ Expense)",
  departmental_scoping: "Budget Agent",
  forecast_coordination: "Budget Agent",
  monthly_summary: "Budget Agent (→ CFO)",
  audit_trail: "Budget Agent",
};

function stepStatusColor(status: string): string {
  switch (status) {
    case "completed":
      return "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-200";
    case "in_progress":
      return "bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-200";
    case "skipped":
      return "bg-muted text-muted-foreground border-border";
    case "flagged":
      return "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-200";
    case "failed":
      return "bg-red-500/20 text-red-700 dark:text-red-300 border-red-200";
    default:
      return "bg-muted/50 text-muted-foreground border-border";
  }
}

function varianceColor(variancePct: number): string {
  if (variancePct > 10) return "text-red-600 dark:text-red-400";
  if (variancePct < -10) return "text-emerald-600 dark:text-emerald-400";
  return "text-muted-foreground";
}

// ─── BudgetPipelinePage ──────────────────────────────────────────────────

export default function BudgetPipelinePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  const currentYear = new Date().getFullYear();
  const currentPeriod = `${currentYear}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  const [fiscalYear, setFiscalYear] = useState(currentYear);

  // Data fetching
  const { data: status, isLoading: statusLoading } =
    trpc.budget.getStatus.useQuery({ fiscalYear });
  const { data: budgets } = trpc.budget.listBudgets.useQuery({ fiscalYear });
  const { data: budgetLines } = trpc.budget.listBudgetLines.useQuery(
    { budgetId: status?.activeBudget?.id ?? "" },
    { enabled: !!status?.activeBudget?.id },
  );
  const { data: variances } = trpc.budget.listVariances.useQuery({
    significant: true,
    limit: 10,
  });
  const { data: thresholds } = trpc.budget.listThresholds.useQuery();

  // Pipeline execution
  const runPipeline = trpc.budget.runPipeline.useMutation({
    onSuccess: () => router.refresh(),
  });

  // ── Derived State ───────────────────────────────────────────────────

  const activeBudget = status?.activeBudget;
  const budgetSummary = status?.budgetSummary;
  const varianceSummary = status?.varianceSummary;
  const alerts = status?.recentAlerts ?? [];

  // ── Loading State ───────────────────────────────────────────────────

  if (statusLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Budget Pipeline"
          description="Budget vs actual, variance analysis, and forecasting"
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <div className="h-5 w-24 animate-pulse rounded bg-muted mb-2" />
                <div className="h-8 w-20 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
        <TableSkeleton rows={4} columns={5} />
      </div>
    );
  }

  // ── No Budget State ────────────────────────────────────────────────

  if (!activeBudget) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Budget Pipeline"
          description="Budget vs actual, variance analysis, and forecasting"
        />
        <EmptyState
          icon={<PiggyBank className="h-12 w-12" />}
          title="No active budget"
          description={`Create a budget for FY${fiscalYear} to start tracking budget vs actual performance.`}
          action={
            <Button
              size="sm"
              className="gap-2"
              onClick={() =>
                runPipeline.mutate({
                  fiscalYear,
                  period: currentPeriod,
                })
              }
              disabled={runPipeline.isPending}
            >
              <PlayCircle className="h-4 w-4" />
              Run Budget Pipeline
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Budget Pipeline"
        description={`${activeBudget.name} · FY${fiscalYear} · ${budgetSummary?.totalLines} lines · ${activeBudget.status}`}
        action={{
          label: "Run Budget Pipeline",
          icon: <PlayCircle className="mr-2 h-4 w-4" />,
          onClick: () =>
            runPipeline.mutate({
              fiscalYear,
              period: currentPeriod,
            }),
        }}
      />

      <BudgetLiveness />

      {/* ── Summary Stat Cards ──────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Budget */}
        <Card className="bg-gradient-to-br from-primary/5 to-background">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Total Budget
                </p>
                <p className="text-2xl font-bold">
                  {formatCurrency(budgetSummary?.totalBudgeted ?? 0)}
                </p>
              </div>
              <div className="rounded-lg bg-primary/10 p-2.5">
                <PiggyBank className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <BarChart3 className="h-3 w-3" />
              <span>{budgetSummary?.totalLines ?? 0} line items</span>
            </div>
          </CardContent>
        </Card>

        {/* Budget Status */}
        <Card className="bg-gradient-to-br from-blue-50 to-background dark:from-blue-950/20">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Budget Status
                </p>
                <div className="flex items-center gap-2">
                  <Badge
                    className={cn(
                      "text-[10px]",
                      activeBudget.status === "active"
                        ? "bg-emerald-500/20 text-emerald-700"
                        : "bg-amber-500/20 text-amber-700",
                    )}
                  >
                    {activeBudget.status}
                  </Badge>
                </div>
              </div>
              <div className="rounded-lg bg-blue-100 p-2.5 dark:bg-blue-900/30">
                <ClipboardCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3 w-3" />
              <span>{budgetSummary?.departmentCount ?? 0} department(s)</span>
            </div>
          </CardContent>
        </Card>

        {/* Variance */}
        <Card className="bg-gradient-to-br from-amber-50 to-background dark:from-amber-950/20">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Total Variance
                </p>
                <p
                  className={cn(
                    "text-2xl font-bold",
                    (varianceSummary?.totalVariance ?? 0) > 0
                      ? "text-red-600 dark:text-red-400"
                      : "text-emerald-600 dark:text-emerald-400",
                  )}
                >
                  {formatCurrency(varianceSummary?.totalVariance ?? 0)}
                </p>
              </div>
              <div className="rounded-lg bg-amber-100 p-2.5 dark:bg-amber-900/30">
                <Calculator className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              {(varianceSummary?.totalVariancePct ?? 0) > 0 ? (
                <TrendingUp className="h-3 w-3 text-red-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-emerald-500" />
              )}
              <span>
                {Math.abs(varianceSummary?.totalVariancePct ?? 0).toFixed(1)}%{" "}
                {(varianceSummary?.totalVariancePct ?? 0) > 0
                  ? "over budget"
                  : "under budget"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Alerts */}
        <Card className="bg-gradient-to-br from-red-50 to-background dark:from-red-950/20">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Alert Thresholds
                </p>
                <p className="text-2xl font-bold">{thresholds?.length ?? 0}</p>
              </div>
              <div className="rounded-lg bg-red-100 p-2.5 dark:bg-red-900/30">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <span>
                {varianceSummary?.significantVariances ?? 0} significant
                variance(s)
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Main Content Tabs ─────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start border-b rounded-none h-auto pb-0 bg-transparent gap-0">
          <TabsTrigger
            value="overview"
            className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 pb-3"
          >
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="lines"
            className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 pb-3"
          >
            <ClipboardCheck className="h-4 w-4" />
            Budget Lines
          </TabsTrigger>
          <TabsTrigger
            value="variances"
            className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 pb-3"
          >
            <Calculator className="h-4 w-4" />
            Variances
            {varianceSummary && varianceSummary.significantVariances > 0 && (
              <Badge
                variant="secondary"
                className="ml-1 text-[9px] bg-red-500/20 text-red-700 px-1"
              >
                {varianceSummary.significantVariances}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="alerts"
            className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 pb-3"
          >
            <AlertTriangle className="h-4 w-4" />
            Alerts {alerts.length > 0 && `(${alerts.length})`}
          </TabsTrigger>
          <TabsTrigger
            value="steps"
            className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 pb-3"
          >
            <RefreshCw className="h-4 w-4" />
            Pipeline Steps
          </TabsTrigger>
        </TabsList>

        {/* ── Tab: Overview ────────────────────────────────────────── */}
        <TabsContent value="overview" className="space-y-6 pt-4">
          {/* Budget at a Glance */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <PiggyBank className="h-4 w-4" />
                Budget at a Glance
              </CardTitle>
              <CardDescription className="text-xs">
                FY{fiscalYear} · {activeBudget.status} ·
                {activeBudget.multiYear ? " Multi-year" : " Single-year"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1 text-center p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20">
                  <p className="text-lg font-bold text-emerald-600">
                    {formatCurrency(budgetSummary?.totalBudgeted ?? 0)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Total Budgeted
                  </p>
                </div>
                <div className="space-y-1 text-center p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                  <p className="text-lg font-bold text-blue-600">
                    {budgetSummary?.totalLines ?? 0}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Line Items
                  </p>
                </div>
                <div className="space-y-1 text-center p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20">
                  <p className="text-lg font-bold text-amber-600">
                    {budgetSummary?.departmentCount ?? 0}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Departments
                  </p>
                </div>
              </div>

              {/* Forecast Coordination Status */}
              {status?.forecastStatus && (
                <div
                  className={cn(
                    "mt-4 p-3 rounded-lg border text-xs",
                    status.forecastStatus.materiallyDivergent
                      ? "bg-amber-50 dark:bg-amber-950/10 border-amber-200 dark:border-amber-900"
                      : "bg-emerald-50 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-900",
                  )}
                >
                  <p className="font-medium mb-1">Forecast Coordination</p>
                  <p className="text-muted-foreground">
                    Budget target:{" "}
                    {formatCurrency(status.forecastStatus.budgetTarget)} ·{" "}
                    Projected (trend):{" "}
                    {formatCurrency(status.forecastStatus.projectedAnnual)}
                    {status.forecastStatus.materiallyDivergent
                      ? " ⚠️ Material divergence detected — both figures shown to CFO Agent"
                      : " ✅ Aligned within tolerance"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Budget Impact Check Interface */}
          <Card className="border-blue-200 dark:border-blue-900">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    Budget Impact Check Interface — Active
                  </p>
                  <p className="text-xs text-muted-foreground">
                    The Budget Agent interface is available for the Expense
                    Management Pipeline to query. Expense claims are checked
                    against remaining budget before approval routing.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pipeline Steps Progress */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Latest Pipeline Run
              </CardTitle>
              <CardDescription className="text-xs">
                {runPipeline.data
                  ? `Completed ${runPipeline.data.stepsCompleted}/${runPipeline.data.totalSteps} steps`
                  : "No pipeline runs yet"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {runPipeline.data ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="p-2 rounded bg-muted/50">
                      <p className="text-sm font-bold">
                        {runPipeline.data.stepsCompleted}
                      </p>
                      <p className="text-[9px] text-muted-foreground">
                        Steps Done
                      </p>
                    </div>
                    <div className="p-2 rounded bg-muted/50">
                      <p className="text-sm font-bold">
                        {budgetLines?.length ?? 0}
                      </p>
                      <p className="text-[9px] text-muted-foreground">Lines</p>
                    </div>
                    <div className="p-2 rounded bg-muted/50">
                      <p className="text-sm font-bold">
                        {runPipeline.data.alerts.length}
                      </p>
                      <p className="text-[9px] text-muted-foreground">Alerts</p>
                    </div>
                    <div className="p-2 rounded bg-muted/50">
                      <p className="text-sm font-bold">
                        {runPipeline.data.errors.length}
                      </p>
                      <p className="text-[9px] text-muted-foreground">Errors</p>
                    </div>
                  </div>
                  {runPipeline.data.warnings.length > 0 && (
                    <div className="p-2 rounded bg-amber-50 dark:bg-amber-950/20 text-xs text-amber-700">
                      {runPipeline.data.warnings.join("; ")}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-4">
                  <RefreshCw className="h-8 w-8 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">
                    No pipeline runs yet
                  </p>
                  <p className="text-xs text-muted-foreground/70">
                    Click "Run Budget Pipeline" to calculate variances
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab: Budget Lines ────────────────────────────────────── */}
        <TabsContent value="lines" className="space-y-4 pt-4">
          {budgetLines && budgetLines.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border bg-card">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                      Account
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                      Description
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                      Dept.
                    </th>
                    <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground">
                      Annual Amount
                    </th>
                    <th className="py-3 px-4 text-center text-xs font-medium text-muted-foreground">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {budgetLines.slice(0, 20).map((line) => (
                    <tr key={line.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4 text-xs font-mono">
                        {line.account?.code ?? "—"}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {line.lineDescription}
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground">
                        {line.dimensionId
                          ? `${line.dimensionType}:${line.dimensionId.slice(0, 8)}...`
                          : "—"}
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-mono">
                        {formatCurrency(parseFloat(line.annualAmount))}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-[9px]",
                            line.isActive
                              ? "bg-emerald-500/20 text-emerald-700"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          {line.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              icon={<ClipboardCheck className="h-12 w-12" />}
              title="No budget lines"
              description="Add budget line items mapped to COA accounts and departments."
            />
          )}
        </TabsContent>

        {/* ── Tab: Variances ───────────────────────────────────────── */}
        <TabsContent value="variances" className="space-y-4 pt-4">
          {variances && variances.length > 0 ? (
            <div className="space-y-3">
              {variances.map((v) => {
                const varianceNum = parseFloat(v.variance);
                const variancePct = parseFloat(v.variancePct);
                return (
                  <div
                    key={v.id}
                    className={cn(
                      "rounded-lg border p-4",
                      v.isSignificant && varianceNum > 0
                        ? "border-red-200 dark:border-red-900 bg-red-50/30 dark:bg-red-950/10"
                        : v.isSignificant
                          ? "border-emerald-200 dark:border-emerald-900 bg-emerald-50/30 dark:bg-emerald-950/10"
                          : "border-border",
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">
                          {v.budgetLine?.account?.name ?? "Unknown"} —{" "}
                          {v.period}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {v.budgetLine?.lineDescription ?? ""}
                        </p>
                      </div>
                      <Badge
                        className={cn(
                          "text-[9px]",
                          varianceNum > 0
                            ? "bg-red-500/20 text-red-700"
                            : "bg-emerald-500/20 text-emerald-700",
                        )}
                      >
                        {varianceNum > 0 ? "+" : ""}
                        {formatCurrency(varianceNum)}
                      </Badge>
                    </div>
                    <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                      <span>
                        Budget: {formatCurrency(parseFloat(v.budgetedAmount))}
                      </span>
                      <span>
                        Actual: {formatCurrency(parseFloat(v.actualAmount))}
                      </span>
                      <span className={varianceColor(variancePct)}>
                        {variancePct.toFixed(1)}%
                      </span>
                    </div>
                    {v.narrativeExplanation && (
                      <div className="mt-2 p-2 rounded bg-muted/30 text-xs text-muted-foreground italic">
                        {v.narrativeExplanation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={<Calculator className="h-12 w-12" />}
              title="No variance records"
              description="Run the budget pipeline to calculate variances."
              action={
                <Button
                  size="sm"
                  className="gap-2"
                  onClick={() =>
                    runPipeline.mutate({
                      fiscalYear,
                      period: currentPeriod,
                    })
                  }
                  disabled={runPipeline.isPending}
                >
                  <PlayCircle className="h-4 w-4" />
                  Run Pipeline
                </Button>
              }
            />
          )}
        </TabsContent>

        {/* ── Tab: Alerts ──────────────────────────────────────────── */}
        <TabsContent value="alerts" className="space-y-4 pt-4">
          {thresholds && thresholds.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Configured Alert Thresholds
              </p>
              {thresholds.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-medium">
                        Line: {t.budgetLineId.slice(0, 8)}...
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Approaching: {t.approachingPct}% · Exceeded:{" "}
                        {t.exceededPct}%
                      </p>
                    </div>
                  </div>
                  <Badge
                    className={cn(
                      "text-[9px]",
                      t.isActive
                        ? "bg-emerald-500/20 text-emerald-700"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {t.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<AlertTriangle className="h-12 w-12" />}
              title="No alert thresholds configured"
              description="Set up alert thresholds on budget lines to get notified when spending approaches or exceeds budget."
            />
          )}
        </TabsContent>

        {/* ── Tab: Pipeline Steps ──────────────────────────────────── */}
        <TabsContent value="steps" className="space-y-4 pt-4">
          <div className="space-y-3">
            {Object.entries(STEP_LABELS).map(([stepId, label]) => {
              const IconComponent = STEP_ICONS[stepId] ?? RefreshCw;
              const agent = STEP_AGENTS[stepId] ?? "Budget Agent";
              return (
                <div
                  key={stepId}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-muted p-2">
                      <IconComponent className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs font-medium">{label}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {agent}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="secondary"
                    className="text-[9px] bg-muted/50 text-muted-foreground"
                  >
                    Pending
                  </Badge>
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
