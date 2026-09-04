"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  Sparkles,
  TrendingUp,
  Wallet,
  FileText,
  BarChart3,
  Download,
  LayoutGrid,
  LineChart,
  Target,
  BookOpen,
  Globe,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ChevronDown,
} from "lucide-react";

import { useEntity } from "@/lib/entity-context";
import { trpc } from "@/lib/trpc/client";
import { cn, formatCurrency } from "@/lib/utils";
import { useSurfaceSync } from "@/lib/hooks/use-surface-sync";
import { useFormatCurrency } from "@/lib/hooks/use-currency";
import { ProvenanceBadge } from "@/components/ai-native-v2/provenance";
import { MetricNarrative } from "@/components/ai-native-v2/metric-narrative";
import { CommandBar } from "@/components/ai-native-v2/command-bar";
import {
  RevenueTrendChart,
  ExpenseBreakdownChart,
  CashFlowChart,
  MarginTrendChart,
} from "@/components/charts/financial-charts";
import { ForecastView } from "@/components/finance/forecast-view";
import { AnomalyAlerts } from "@/components/financial/anomaly-alerts";
import { DocumentDownloadButtons } from "@/components/documents/document-download-buttons";
import {
  buildPnlReport,
  buildCashFlowReport,
} from "@/lib/documents/report-templates";

// ─── Pulse v2 — AI-Native Financial Pulse (/financial-pulse/new) ──────────
//
// Tabs absorb navigation:
//   1. Overview — AI narrative, KPIs, anomaly alerts
//   2. Performance — revenue/cash/margin/expense charts
//   3. Planning — forecast, budget vs actual, scenario planner
//   4. Reports — report library, downloads
//
// The period selector (This Month / Last Month / This Quarter) sits above
// all tabs since it applies to every view.
//
// Keyboard: 1-4 switch tabs

type Tab = "overview" | "performance" | "planning" | "reports";

const TABS: { key: Tab; label: string; icon: typeof LayoutGrid }[] = [
  { key: "overview", label: "Overview", icon: LayoutGrid },
  { key: "performance", label: "Performance", icon: LineChart },
  { key: "planning", label: "Planning", icon: Target },
  { key: "reports", label: "Reports", icon: BookOpen },
];

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function getMonthLabel(index: number, totalBars: number): string {
  const now = new Date();
  const currentMonth = now.getMonth();
  const monthIndex = (currentMonth - totalBars + 1 + index + 12) % 12;
  return MONTH_NAMES[monthIndex];
}

export default function FinancialPulseV2Page() {
  const { entityId, entityCurrency } = useEntity();
  const router = useRouter();
  const displayCurrency = entityCurrency || "USD";
  const [tab, setTab] = useState<Tab>("overview");

  useSurfaceSync({ entityId, surfaces: ["financial-pulse"] });

  const [selectedPeriod, setSelectedPeriod] = useState<
    "this_month" | "last_month" | "this_quarter"
  >("this_month");

  const { data: dashboardData } = trpc.dashboard.getDashboardData.useQuery(
    { period: selectedPeriod },
    { enabled: !!entityId },
  );
  const { data: pnlData } = trpc.reports.getPnlOverview.useQuery(undefined, {
    enabled: !!entityId,
  });
  const { data: aiNarrative, isError: isNarrativeError } =
    trpc.dashboard.getAiNarrative.useQuery(undefined, {
      enabled: !!entityId,
      staleTime: 10 * 60 * 1000,
    });
  const { data: anomalyData } = trpc.dashboard.detectAnomalies.useQuery(
    undefined,
    { enabled: !!entityId, staleTime: 5 * 60 * 1000 },
  );

  const overview = dashboardData
    ? {
        cashBalance: dashboardData.businessHealth.cashBalance,
        ar: dashboardData.businessHealth.arOutstanding,
        ap: dashboardData.businessHealth.apOutstanding,
        runway: dashboardData.businessHealth.runwayMonths,
      }
    : undefined;

  const pnl = pnlData
    ? {
        revenue: pnlData.current.revenue,
        expenses: pnlData.current.opExpenses,
        netProfit: pnlData.current.netProfit,
        revenueChange: dashboardData?.businessHealth.revenueChange,
        expensesChange: dashboardData?.businessHealth.expensesChange,
      }
    : undefined;

  const revenueSparkline = dashboardData?.businessHealth.revenueSparkline ?? [];
  const expenseSparkline =
    dashboardData?.businessHealth.expensesSparkline ?? [];

  const expenseBreakdownData =
    pnlData?.current.expensesByAccount?.slice(0, 8).map((a) => ({
      category:
        a.accountName.length > 12
          ? `${a.accountName.slice(0, 12)}…`
          : a.accountName,
      amount: Math.abs(a.amount),
    })) ?? [];

  const ask = (prompt: string) =>
    router.push(`/dashboard?prompt=${encodeURIComponent(prompt)}`);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag?.match(/INPUT|TEXTAREA|SELECT/)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      switch (e.key) {
        case "1":
          e.preventDefault();
          setTab("overview");
          break;
        case "2":
          e.preventDefault();
          setTab("performance");
          break;
        case "3":
          e.preventDefault();
          setTab("planning");
          break;
        case "4":
          e.preventDefault();
          setTab("reports");
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex h-full flex-col p-4 pb-6 sm:p-6">
      {/* ── Header + Period + Tabs ─────────────────────────────────── */}
      <header className="mb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Activity className="h-4 w-4 text-primary" aria-hidden="true" />
            <h1 className="text-sm font-semibold tracking-tight text-foreground">
              Financial Health
            </h1>
            <span className="hidden font-mono text-[11px] tabular-nums text-muted-foreground sm:inline">
              AI-narrated · live
            </span>
          </div>

          {/* Period selector */}
          <div
            role="tablist"
            aria-label="Financial period"
            className="flex items-center gap-1 rounded-lg border border-border/50 bg-muted/30 p-0.5"
          >
            {(
              [
                { key: "this_month" as const, label: "This Month" },
                { key: "last_month" as const, label: "Last Month" },
                { key: "this_quarter" as const, label: "This Quarter" },
              ] as const
            ).map((p) => (
              <button
                key={p.key}
                type="button"
                role="tab"
                aria-selected={selectedPeriod === p.key}
                onClick={() => setSelectedPeriod(p.key)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  selectedPeriod === p.key
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* View tabs */}
        <div className="mt-3 flex items-center justify-between">
          <div
            className="flex items-center gap-1"
            role="tablist"
            aria-label="Financial views"
          >
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(t.key)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  {t.label}
                </button>
              );
            })}
          </div>
          <span className="hidden text-[10px] text-muted-foreground/50 sm:inline">
            1-4 switch tabs
          </span>
        </div>
      </header>

      {/* ── Tab Panels ──────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {tab === "overview" && (
          <OverviewPanel
            aiNarrative={aiNarrative}
            isNarrativeError={isNarrativeError}
            overview={overview}
            pnl={pnl}
            anomalyData={anomalyData}
            ask={ask}
          />
        )}
        {tab === "performance" && (
          <PerformancePanel
            revenueSparkline={revenueSparkline}
            expenseSparkline={expenseSparkline}
            expenseBreakdownData={expenseBreakdownData}
            displayCurrency={displayCurrency}
            ask={ask}
          />
        )}
        {tab === "planning" && (
          <PlanningPanel entityId={entityId ?? ""} ask={ask} />
        )}
        {tab === "reports" && (
          <ReportsPanel
            ask={ask}
            pnlData={pnlData}
            overview={overview}
            displayCurrency={displayCurrency}
          />
        )}
      </div>
    </div>
  );
}

// ─── Overview Panel ─────────────────────────────────────────────────────────

function OverviewPanel({
  aiNarrative,
  isNarrativeError,
  overview,
  pnl,
  anomalyData,
  ask,
}: {
  aiNarrative:
    | {
        text: string;
        highlights: string[];
        concerns: string[];
        confidence: number;
        generatedAt: string;
      }
    | undefined;
  isNarrativeError: boolean;
  overview:
    | { cashBalance: number; ar: number; ap: number; runway: number | null }
    | undefined;
  pnl:
    | {
        revenue: number;
        expenses: number;
        netProfit: number;
        revenueChange: number | undefined;
        expensesChange: number | undefined;
      }
    | undefined;
  anomalyData:
    | { anomalies: Array<{ message: string; aiInsight?: string }> }
    | undefined;
  ask: (prompt: string) => void;
}) {
  const { format } = useFormatCurrency();
  return (
    <div className="space-y-5">
      {/* AI Narrative */}
      <section
        aria-labelledby="pulse-narrative-heading"
        className="overflow-hidden rounded-2xl border border-border/50 bg-card"
      >
        <div className="border-b border-border/40 bg-muted/20 px-5 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2
              id="pulse-narrative-heading"
              className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              <Sparkles
                className="h-3.5 w-3.5 text-primary"
                aria-hidden="true"
              />
              The AI&apos;s take
            </h2>
            {aiNarrative && (
              <ProvenanceBadge
                actor="agent"
                actorName="Financial Analyst"
                confidence={aiNarrative.confidence}
              />
            )}
          </div>
        </div>

        <div className="px-5 py-4">
          {isNarrativeError && !aiNarrative ? (
            <p className="text-sm leading-relaxed text-muted-foreground">
              AI narrative unavailable. Key figures are shown below.
            </p>
          ) : !aiNarrative && !overview ? (
            <p className="animate-pulse text-sm text-muted-foreground">
              Generating your financial narrative…
            </p>
          ) : aiNarrative?.text ? (
            <>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/85">
                {aiNarrative.text}
              </p>
              {(aiNarrative.highlights.length > 0 ||
                aiNarrative.concerns.length > 0) && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {aiNarrative.highlights.map((h: string, i: number) => (
                    <span
                      key={`h-${i}`}
                      className="inline-flex items-center gap-1 rounded-full bg-balanced-green/10 px-2 py-0.5 text-[11px] font-medium text-balanced-green"
                    >
                      <span aria-hidden="true">✓</span> {h}
                    </span>
                  ))}
                  {aiNarrative.concerns.map((c: string, i: number) => (
                    <span
                      key={`c-${i}`}
                      className="inline-flex items-center gap-1 rounded-full bg-attention-amber/10 px-2 py-0.5 text-[11px] font-medium text-attention-amber"
                    >
                      <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                      {c}
                    </span>
                  ))}
                </div>
              )}
              <p className="mt-3 font-mono text-[10px] tabular-nums text-muted-foreground/60">
                {Math.round(aiNarrative.confidence * 100)}% confidence ·{" "}
                {new Date(aiNarrative.generatedAt).toLocaleTimeString()}
              </p>
            </>
          ) : (
            <p className="text-sm leading-relaxed text-foreground/85">
              {pnl && pnl.revenue > 0 && (
                <>
                  Revenue is {format(pnl.revenue)}
                  {pnl.revenueChange
                    ? ` (${pnl.revenueChange > 0 ? "+" : ""}${pnl.revenueChange.toFixed(1)}% vs prior)`
                    : ""}
                  .{" "}
                </>
              )}
              {pnl && pnl.expenses > 0 && (
                <>
                  Expenses are {format(pnl.expenses)}
                  {pnl.expensesChange
                    ? ` (${pnl.expensesChange > 0 ? "+" : ""}${pnl.expensesChange.toFixed(1)}%)`
                    : ""}
                  .{" "}
                </>
              )}
              {(pnl?.netProfit ?? 0) !== 0 && (
                <>
                  Net {(pnl?.netProfit ?? 0) >= 0 ? "profit" : "loss"} is{" "}
                  {format(Math.abs(pnl?.netProfit ?? 0))}.
                </>
              )}
            </p>
          )}
        </div>
      </section>

      {/* KPI strip */}
      <section
        aria-label="Key metrics"
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      >
        <div className="rounded-xl border border-border/50 bg-card p-4">
          <MetricNarrative
            label="Revenue"
            value={format(pnl?.revenue ?? 0)}
            narrative={
              pnl?.revenueChange
                ? `${pnl.revenueChange > 0 ? "Up" : "Down"} ${Math.abs(pnl.revenueChange).toFixed(1)}% vs prior — ${pnl.revenueChange > 5 ? "strong" : "steady"}.`
                : undefined
            }
            size="sm"
          />
          <button
            type="button"
            onClick={() =>
              ask(
                "Explain my revenue position and what's driving the change vs last month.",
              )
            }
            className="mt-2 text-[11px] font-medium text-primary hover:text-primary/80"
          >
            Ask why →
          </button>
        </div>
        <div className="rounded-xl border border-border/50 bg-card p-4">
          <MetricNarrative
            label="Expenses"
            value={format(pnl?.expenses ?? 0)}
            narrative={
              pnl?.expensesChange
                ? `${pnl.expensesChange > 0 ? "Up" : "Down"} ${Math.abs(pnl.expensesChange).toFixed(1)}% — watch the trend.`
                : undefined
            }
            size="sm"
          />
          <button
            type="button"
            onClick={() =>
              ask("Break down my expenses. What's the biggest cost driver?")
            }
            className="mt-2 text-[11px] font-medium text-primary hover:text-primary/80"
          >
            Break down →
          </button>
        </div>
        <div className="rounded-xl border border-border/50 bg-card p-4">
          <MetricNarrative
            label="Net Profit"
            value={format(pnl?.netProfit ?? 0)}
            narrative={
              pnl?.revenue && pnl.revenue > 0
                ? `${(((pnl.netProfit ?? 0) / pnl.revenue) * 100).toFixed(1)}% margin.`
                : undefined
            }
            size="sm"
          />
          {pnl?.revenue != null && (
            <span
              className={cn(
                "mt-2 inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                (pnl.netProfit ?? 0) >= 0
                  ? "bg-balanced-green/10 text-balanced-green"
                  : "bg-error-clay/10 text-error-clay",
              )}
            >
              {(pnl.netProfit ?? 0) >= 0 ? "Profitable" : "Loss"}
            </span>
          )}
        </div>
        <div className="rounded-xl border border-border/50 bg-card p-4">
          <MetricNarrative
            label="Cash & runway"
            value={format(overview?.cashBalance ?? 0)}
            narrative={
              overview?.runway != null
                ? overview.runway < 3
                  ? `${overview.runway.toFixed(1)} mo runway — tight.`
                  : `${overview.runway.toFixed(1)} mo runway — comfortable.`
                : "Connect bank for runway."
            }
            size="sm"
          />
        </div>
      </section>

      {/* Exchange rates + Daily close status strip */}
      <div className="grid gap-3 sm:grid-cols-2">
        <ExchangeRatesStrip />
        <DailyCloseStrip ask={ask} />
      </div>

      {/* Anomalies */}
      {anomalyData?.anomalies && anomalyData.anomalies.length > 0 && (
        <AnomalyAlerts
          anomalies={anomalyData.anomalies}
          onInvestigate={(a) =>
            ask(`Investigate this anomaly: ${a.message}. ${a.aiInsight ?? ""}`)
          }
        />
      )}
    </div>
  );
}

// ─── Performance Panel ──────────────────────────────────────────────────────

function PerformancePanel({
  revenueSparkline,
  expenseSparkline,
  expenseBreakdownData,
  displayCurrency,
  ask,
}: {
  revenueSparkline: number[];
  expenseSparkline: number[];
  expenseBreakdownData: { category: string; amount: number }[];
  displayCurrency: string;
  ask: (prompt: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card">
          <RevenueTrendChart
            data={revenueSparkline.map((v, i) => ({
              month: getMonthLabel(i, revenueSparkline.length),
              revenue: v,
              prior: undefined,
            }))}
            currency={displayCurrency}
            onAskAi={() =>
              ask("Explain my revenue trend. What's driving the changes?")
            }
          />
        </div>
        <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card">
          <CashFlowChart
            data={revenueSparkline.map((v, i) => ({
              month: getMonthLabel(i, revenueSparkline.length),
              incoming: v,
              outgoing: expenseSparkline[i] ?? 0,
            }))}
            currency={displayCurrency}
            onAskAi={() =>
              ask("Analyze my cash flow. Am I spending more than I'm earning?")
            }
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card">
          <MarginTrendChart
            data={revenueSparkline.map((v, i) => {
              const exp = expenseSparkline[i] ?? 0;
              const margin = v > 0 ? ((v - exp) / v) * 100 : 0;
              return {
                month: getMonthLabel(i, revenueSparkline.length),
                margin: Math.round(margin * 10) / 10,
                target: 25,
              };
            })}
            onAskAi={() =>
              ask("Analyze my profit margin trend. Is it improving?")
            }
          />
        </div>
        <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card">
          <ExpenseBreakdownChart
            data={expenseBreakdownData}
            currency={displayCurrency}
            onAskAi={() =>
              ask("Break down my expenses. What's the biggest cost driver?")
            }
          />
        </div>
      </div>
    </div>
  );
}

// ─── Planning Panel ─────────────────────────────────────────────────────────

function PlanningPanel({
  entityId,
  ask,
}: {
  entityId: string;
  ask: (prompt: string) => void;
}) {
  return (
    <div className="space-y-5">
      {/* Forecast */}
      <section
        aria-labelledby="pulse-forecast-heading"
        className="overflow-hidden rounded-xl border border-border/50 bg-card"
      >
        <header className="flex items-center justify-between border-b border-border/40 px-4 py-3">
          <h2
            id="pulse-forecast-heading"
            className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
          >
            Forecast
          </h2>
          <button
            type="button"
            onClick={() =>
              ask("Explain my financial forecast for the next 3 months")
            }
            className="text-[11px] font-medium text-primary hover:text-primary/80"
          >
            Ask for detail →
          </button>
        </header>
        <div className="p-4">
          <ForecastView />
        </div>
      </section>

      {/* Budget vs Actual */}
      <BudgetVsActualCard entityId={entityId} ask={ask} />

      {/* Scenario Planner */}
      <ScenarioCard ask={ask} />
    </div>
  );
}

// ─── Reports Panel ──────────────────────────────────────────────────────────

function ReportsPanel({
  ask,
  pnlData,
  overview,
  displayCurrency,
}: {
  ask: (prompt: string) => void;
  pnlData: unknown;
  overview:
    | { cashBalance: number; ar: number; ap: number; runway: number | null }
    | undefined;
  displayCurrency: string;
}) {
  return (
    <div className="space-y-5">
      <ReportLibrary
        ask={ask}
        pnlData={pnlData}
        overview={overview}
        displayCurrency={displayCurrency}
      />

      {/* Command bar */}
      <section
        aria-label="Ask about this page"
        className="rounded-xl border border-dashed border-border/60 bg-muted/10 p-4"
      >
        <h2 className="mb-2 flex items-center gap-1.5 text-sm font-medium text-foreground">
          <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
          Ask a follow-up
        </h2>
        <CommandBar
          onSubmit={(v) =>
            ask(
              `About Financial Pulse: ${v}. Context — revenue ${formatCurrency(0)}, expenses ${formatCurrency(0)}, cash ${formatCurrency(0)}.`,
            )
          }
          placeholder="e.g. Why did margin dip last month? Model a 10% cut in ops spend…"
        />
      </section>
    </div>
  );
}

// ─── Budget vs Actual Card ─────────────────────────────────────────────────

function BudgetVsActualCard({
  entityId,
  ask,
}: {
  entityId: string;
  ask: (prompt: string) => void;
}) {
  const { format } = useFormatCurrency();
  const { data: currentPeriod } = trpc.fiscal.getCurrent.useQuery(undefined, {
    enabled: !!entityId,
  });
  const { data: budgetData, isLoading } =
    trpc.reports.getBudgetVsActual.useQuery(
      { periodId: currentPeriod?.id ?? "" },
      { enabled: !!entityId && !!currentPeriod?.id },
    );

  if (isLoading) {
    return (
      <div className="animate-pulse rounded-xl border border-border/50 bg-card p-4">
        <div className="h-4 w-48 rounded bg-muted/30" />
      </div>
    );
  }

  if (!budgetData) return null;

  const items = (budgetData.lines ?? []).map(
    (line: {
      accountName: string;
      budgetedAmount: number;
      actualAmount: number;
      variance: number;
      variancePct: number;
      status: string;
    }) => ({
      category: line.accountName,
      budget: line.budgetedAmount,
      actual: line.actualAmount,
      variance: line.variance,
      variancePercent: line.variancePct,
      status: line.status,
    }),
  );

  if (items.length === 0) return null;

  const overBudget = items.filter((i) => i.variance > 0).length;
  const underBudget = items.filter((i) => i.variance < 0).length;

  return (
    <section
      aria-labelledby="budget-heading"
      className="overflow-hidden rounded-xl border border-border/50 bg-card"
    >
      <header className="flex items-center justify-between border-b border-border/40 px-4 py-3">
        <div className="flex items-center gap-2">
          <h2
            id="budget-heading"
            className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
          >
            Budget vs Actual
          </h2>
          {overBudget > 0 && (
            <span className="inline-flex items-center rounded-full bg-error-clay/10 px-1.5 py-0.5 text-[9px] font-bold text-error-clay">
              {overBudget} over
            </span>
          )}
          {underBudget > 0 && (
            <span className="inline-flex items-center rounded-full bg-balanced-green/10 px-1.5 py-0.5 text-[9px] font-bold text-balanced-green">
              {underBudget} under
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() =>
            ask("Analyze my budget vs actual. Where are the biggest variances?")
          }
          className="text-[11px] font-medium text-primary hover:text-primary/80"
        >
          Ask why →
        </button>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">
                Category
              </th>
              <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">
                Budget
              </th>
              <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">
                Actual
              </th>
              <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">
                Variance
              </th>
            </tr>
          </thead>
          <tbody>
            {items.slice(0, 6).map(
              (
                item: {
                  category: string;
                  budget: number;
                  actual: number;
                  variance: number;
                },
                i: number,
              ) => {
                const isOver = item.variance > 0;
                return (
                  <tr
                    key={i}
                    className="border-b last:border-0 hover:bg-muted/20"
                  >
                    <td className="px-4 py-2 font-medium text-foreground">
                      {item.category}
                    </td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums text-muted-foreground">
                      {format(item.budget)}
                    </td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums text-foreground">
                      {format(item.actual)}
                    </td>
                    <td
                      className={cn(
                        "px-4 py-2 text-right font-mono tabular-nums font-medium",
                        isOver ? "text-error-clay" : "text-balanced-green",
                      )}
                    >
                      {isOver ? "+" : ""}
                      {format(item.variance)}
                    </td>
                  </tr>
                );
              },
            )}
          </tbody>
        </table>
        {items.length > 6 && (
          <div className="border-t border-border/50 px-4 py-2 text-center">
            <span className="text-[10px] text-muted-foreground">
              Showing 6 of {items.length} categories
            </span>
          </div>
        )}
      </div>
    </section>
  );
}

// ─── Scenario Planner Card ─────────────────────────────────────────────────

function ScenarioCard({ ask }: { ask: (prompt: string) => void }) {
  const scenarios = [
    {
      label: "Revenue drops 20%",
      prompt:
        "Model what happens if revenue drops 20% next quarter. Show impact on cash, runway, and profitability.",
    },
    {
      label: "Hire 3 people",
      prompt:
        "Model the cost of hiring 3 people at $80K each. Show impact on expenses and runway.",
    },
    {
      label: "Cut marketing 50%",
      prompt:
        "Model cutting marketing spend by 50%. What's the savings and impact on revenue?",
    },
  ];

  return (
    <section
      aria-labelledby="scenario-heading"
      className="rounded-xl border border-border/50 bg-card p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <h2
          id="scenario-heading"
          className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
        >
          Scenario Planner
        </h2>
        <Sparkles
          className="h-3.5 w-3.5 text-muted-foreground/40"
          aria-hidden="true"
        />
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        Ask the AI to model any scenario — revenue changes, new hires, cost
        cuts, or anything else.
      </p>
      <div className="flex flex-wrap gap-2">
        {scenarios.map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={() => ask(s.prompt)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border/50 bg-background px-3 py-2 text-xs text-foreground hover:bg-accent transition-colors"
          >
            {s.label}
          </button>
        ))}
      </div>
    </section>
  );
}

// ─── Report Library ────────────────────────────────────────────────────────

function ReportLibrary({
  ask,
  pnlData,
  overview,
  displayCurrency,
}: {
  ask: (prompt: string) => void;
  pnlData: unknown;
  overview:
    | { cashBalance: number; ar: number; ap: number; runway: number | null }
    | undefined;
  displayCurrency: string;
}) {
  const reports = [
    {
      id: "pnl",
      label: "Profit & Loss",
      description: "Revenue, expenses, net income",
      icon: TrendingUp,
      color: "text-primary",
      bg: "bg-primary/10",
      aiPrompt: "Show me my profit and loss statement",
    },
    {
      id: "cash-flow",
      label: "Cash Flow",
      description: "Cash in, cash out, net movement",
      icon: Wallet,
      color: "text-signal-indigo",
      bg: "bg-signal-indigo/10",
      aiPrompt: "Show me my cash flow statement",
    },
    {
      id: "trial-balance",
      label: "Trial Balance",
      description: "Debits equal credits verification",
      icon: BarChart3,
      color: "text-attention-amber",
      bg: "bg-attention-amber/10",
      aiPrompt: "Show me my trial balance",
    },
    {
      id: "tax-summary",
      label: "Tax Summary",
      description: "Tax liability and obligations",
      icon: FileText,
      color: "text-error-clay",
      bg: "bg-error-clay/10",
      aiPrompt: "Summarize my tax obligations",
    },
  ];

  return (
    <section
      aria-labelledby="reports-heading"
      className="rounded-xl border border-border/50 bg-card p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <h2
          id="reports-heading"
          className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
        >
          Reports
        </h2>
        <span className="text-[10px] text-muted-foreground">
          Ask AI to analyze · Download for export
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {reports.map((report) => {
          const Icon = report.icon;
          const reportData =
            report.id === "pnl" && pnlData
              ? buildPnlReport({
                  entityName: "Your Business",
                  currency: displayCurrency,
                  period: new Date().toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  }),
                  revenue: (
                    pnlData as {
                      current: {
                        revenue: number;
                        revenueByAccount: Array<{
                          code: string;
                          name: string;
                          amount: number;
                        }>;
                        expenses: number;
                        expensesByAccount: Array<{
                          code: string;
                          name: string;
                          amount: number;
                        }>;
                        cogs: number;
                        grossProfit: number;
                        opExpenses: number;
                        netProfit: number;
                      };
                    }
                  ).current.revenue,
                  revenueByAccount: (
                    pnlData as {
                      current: {
                        revenueByAccount: Array<{
                          code: string;
                          name: string;
                          amount: number;
                        }>;
                      };
                    }
                  ).current.revenueByAccount.map(
                    (a: { code: string; name: string; amount: number }) => ({
                      code: a.code,
                      name: a.name,
                      amount: a.amount,
                    }),
                  ),
                  expenses: (pnlData as { current: { expenses: number } })
                    .current.expenses,
                  expensesByAccount: (
                    pnlData as {
                      current: {
                        expensesByAccount: Array<{
                          code: string;
                          name: string;
                          amount: number;
                        }>;
                      };
                    }
                  ).current.expensesByAccount.map(
                    (a: { code: string; name: string; amount: number }) => ({
                      code: a.code,
                      name: a.name,
                      amount: a.amount,
                    }),
                  ),
                  cogs: (pnlData as { current: { cogs: number } }).current.cogs,
                  grossProfit: (pnlData as { current: { grossProfit: number } })
                    .current.grossProfit,
                  opExpenses: (pnlData as { current: { opExpenses: number } })
                    .current.opExpenses,
                  netProfit: (pnlData as { current: { netProfit: number } })
                    .current.netProfit,
                })
              : report.id === "cash-flow" && overview
                ? buildCashFlowReport({
                    entityName: "Your Business",
                    currency: displayCurrency,
                    period: new Date().toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    }),
                    openingCash: overview.cashBalance,
                    operating: {
                      lines: [{ name: "Revenue", amount: 0 }],
                      total: 0,
                    },
                    investing: { lines: [], total: 0 },
                    financing: { lines: [], total: 0 },
                    closingCash: overview.cashBalance,
                  })
                : {
                    title: report.label,
                    entityName: "Your Business",
                    currency: displayCurrency,
                    generatedAt: new Date(),
                    sections: [],
                  };

          return (
            <div
              key={report.id}
              className="group rounded-xl border border-border/50 bg-background p-3 transition-all hover:border-border/80 hover:shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                    report.bg,
                  )}
                >
                  <Icon className={cn("h-4 w-4", report.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => ask(report.aiPrompt)}
                    className="text-left"
                  >
                    <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                      {report.label}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {report.description}
                    </p>
                  </button>
                  <div className="mt-2">
                    <DocumentDownloadButtons
                      data={reportData}
                      formats={["pdf", "excel"]}
                      size="xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─── Exchange Rates Strip ────────────────────────────────────────────────
// Compact live exchange rates from ECB-synced data.

function ExchangeRatesStrip() {
  const { data: rates } = trpc.currency.listGlobalRates.useQuery(
    {
      pairs: [
        { from: "USD", to: "EUR" },
        { from: "USD", to: "GBP" },
        { from: "USD", to: "KES" },
      ],
    },
    { staleTime: 60_000 },
  );

  if (!rates || rates.length === 0) return null;

  return (
    <div className="rounded-xl border border-border/50 bg-card px-4 py-3">
      <div className="flex items-center gap-2 mb-2">
        <Globe className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[11px] font-medium text-muted-foreground">
          Live rates
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {rates.map((r) => (
          <span
            key={`${r.fromCurrency}-${r.toCurrency}`}
            className="inline-flex items-center gap-1 rounded-md bg-muted/50 px-2 py-1 text-[11px]"
          >
            <span className="text-muted-foreground">
              {r.fromCurrency}/{r.toCurrency}
            </span>
            <span className="font-mono font-semibold text-foreground tabular-nums">
              {Number(r.rate).toFixed(4)}
            </span>
          </span>
        ))}
      </div>
      <p className="mt-1.5 text-[10px] text-muted-foreground/50">Source: ECB</p>
    </div>
  );
}

// ─── Daily Close Status Strip ────────────────────────────────────────────
// AI-narrated status of today's reconciliation.

function DailyCloseStrip({ ask }: { ask: (q: string) => void }) {
  const { data: closeStatus } = trpc.dailyClose.getStatus.useQuery(undefined, {
    staleTime: 60_000,
  });

  if (!closeStatus) return null;

  const status = closeStatus.status ?? "unknown";
  const isComplete = status === "completed";
  const isFailed = status === "failed";

  return (
    <div className="rounded-xl border border-border/50 bg-card px-4 py-3">
      <div className="flex items-center gap-2 mb-2">
        {isComplete ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-balanced-green" />
        ) : isFailed ? (
          <AlertTriangle className="h-3.5 w-3.5 text-error-clay" />
        ) : (
          <Clock className="h-3.5 w-3.5 text-muted-foreground animate-pulse" />
        )}
        <span className="text-[11px] font-medium text-muted-foreground">
          Daily close
        </span>
      </div>
      <p className="text-xs text-foreground">
        {isComplete
          ? `Reconciliation completed — ${closeStatus.matchedCount ?? 0} of ${closeStatus.totalCount ?? 0} transactions matched`
          : isFailed
            ? "Reconciliation failed — needs attention"
            : "In progress..."}
      </p>
      <button
        type="button"
        onClick={() =>
          ask("Show me the daily reconciliation status and any exceptions")
        }
        className="mt-1.5 text-[11px] font-medium text-primary hover:text-primary/80"
      >
        Ask why →
      </button>
    </div>
  );
}
