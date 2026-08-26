"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, AlertTriangle, Sparkles } from "lucide-react";

import { useEntity } from "@/lib/entity-context";
import { trpc } from "@/lib/trpc/client";
import { cn, formatCurrency } from "@/lib/utils";
import { useSurfaceSync } from "@/lib/hooks/use-surface-sync";
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

// ─── Pulse v2 (/financial-pulse/new) ───────────────────────────────────
//
// The AI narrates your health. Numbers never appear alone — every metric
// carries its one-line read, every chart has an "Ask" affordance, and
// anomalies land as a feed, not a buried widget.

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

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 pb-20 sm:p-6 md:pb-6">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Activity className="h-4 w-4 text-primary" aria-hidden="true" />
          <h1 className="text-sm font-semibold tracking-tight text-foreground">
            Financial Health
          </h1>
          <span className="hidden font-mono text-[11px] tabular-nums text-muted-foreground sm:inline">
            AI-narrated · live
          </span>
        </div>

        {/* Period — pill tabs like ops */}
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
      </header>

      {/* ── AI Narrative — the hero ────────────────────────────────── */}
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
              The AI’s take
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
                      className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600"
                    >
                      <span aria-hidden="true">✓</span> {h}
                    </span>
                  ))}
                  {aiNarrative.concerns.map((c: string, i: number) => (
                    <span
                      key={`c-${i}`}
                      className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-600"
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
                  Revenue is {formatCurrency(pnl.revenue)}
                  {pnl.revenueChange
                    ? ` (${pnl.revenueChange > 0 ? "+" : ""}${pnl.revenueChange.toFixed(1)}% vs prior)`
                    : ""}
                  .{" "}
                </>
              )}
              {pnl && pnl.expenses > 0 && (
                <>
                  Expenses are {formatCurrency(pnl.expenses)}
                  {pnl.expensesChange
                    ? ` (${pnl.expensesChange > 0 ? "+" : ""}${pnl.expensesChange.toFixed(1)}%)`
                    : ""}
                  .{" "}
                </>
              )}
              {(pnl?.netProfit ?? 0) !== 0 && (
                <>
                  Net {(pnl?.netProfit ?? 0) >= 0 ? "profit" : "loss"} is{" "}
                  {formatCurrency(Math.abs(pnl?.netProfit ?? 0))}.
                </>
              )}
            </p>
          )}
        </div>
      </section>

      {/* ── KPI strip — every number narrated ──────────────────────── */}
      <section
        aria-label="Key metrics"
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      >
        <div className="rounded-xl border border-border/50 bg-card p-4">
          <MetricNarrative
            label="Revenue"
            value={formatCurrency(pnl?.revenue ?? 0)}
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
            value={formatCurrency(pnl?.expenses ?? 0)}
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
            value={formatCurrency(pnl?.netProfit ?? 0)}
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
                  ? "bg-emerald-500/10 text-emerald-600"
                  : "bg-red-500/10 text-red-600",
              )}
            >
              {(pnl.netProfit ?? 0) >= 0 ? "Profitable" : "Loss"}
            </span>
          )}
        </div>
        <div className="rounded-xl border border-border/50 bg-card p-4">
          <MetricNarrative
            label="Cash & runway"
            value={formatCurrency(overview?.cashBalance ?? 0)}
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

      {/* ── Anomalies — only when present ──────────────────────────── */}
      {anomalyData?.anomalies && anomalyData.anomalies.length > 0 && (
        <AnomalyAlerts
          anomalies={anomalyData.anomalies}
          onInvestigate={(a) =>
            ask(`Investigate this anomaly: ${a.message}. ${a.aiInsight ?? ""}`)
          }
        />
      )}

      {/* ── Charts — each with an Ask affordance ───────────────────── */}
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

      {/* ── Forecast ───────────────────────────────────────────────── */}
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

      {/* ── Command — follow-up lives here ─────────────────────────── */}
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
              `About Financial Pulse (${selectedPeriod}): ${v}. Context — revenue ${formatCurrency(pnl?.revenue ?? 0)}, expenses ${formatCurrency(pnl?.expenses ?? 0)}, cash ${formatCurrency(overview?.cashBalance ?? 0)}.`,
            )
          }
          placeholder="e.g. Why did margin dip last month? Model a 10% cut in ops spend…"
        />
      </section>
    </div>
  );
}
