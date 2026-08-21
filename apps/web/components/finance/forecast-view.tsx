"use client";

import { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  Calendar,
  ArrowRight,
  Lightbulb,
  Shield,
  Loader2,
} from "lucide-react";

import { trpc } from "@/lib/trpc/client";
import { useEntity } from "@/lib/entity-context";
import { cn, formatCurrency } from "@/lib/utils";

// ─── Forecast View ─────────────────────────────────────────────────────────
// AI-powered financial forecasting with historical data and projections.
// Shows revenue, expenses, and cash flow trends for next 3 months.

type ForecastTab = "overview" | "revenue" | "expenses" | "cashflow";

export function ForecastView() {
  const { entityId, currency } = useEntity();
  const [activeTab, setActiveTab] = useState<ForecastTab>("overview");

  const { data: forecast, isLoading } = trpc.dashboard.getAiForecast.useQuery(
    undefined,
    { enabled: !!entityId },
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-muted/30" />
        <div className="h-64 animate-pulse rounded-xl bg-muted/30" />
        <div className="h-32 animate-pulse rounded-xl bg-muted/30" />
      </div>
    );
  }

  if (!forecast) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/50 py-12 text-center">
        <TrendingUp
          className="h-12 w-12 text-muted-foreground/30 mb-3"
          aria-hidden="true"
        />
        <p className="text-sm font-medium text-foreground">
          No forecast data available
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Need at least 2 months of data for projections
        </p>
      </div>
    );
  }

  const { historical, projected, trends, ai } = forecast;
  const allRevenues = [...historical.revenues, ...projected.revenues];
  const allExpenses = [
    ...(historical.historical?.expenses ?? historical.expenses),
    ...projected.expenses,
  ];
  const allLabels = [...historical.labels, ...projected.labels];
  const maxValue = Math.max(...allRevenues, ...allExpenses) * 1.1;

  const tabs: { key: ForecastTab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "revenue", label: "Revenue" },
    { key: "expenses", label: "Expenses" },
    { key: "cashflow", label: "Cash Flow" },
  ];

  return (
    <div className="space-y-6">
      {/* Header with AI summary */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-semibold text-foreground">
                AI Forecast
              </h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                {Math.round((ai.confidence ?? 0.7) * 100)}% confidence
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {ai.summary}
            </p>
          </div>
          <RefreshCw className="h-4 w-4 text-muted-foreground/30" />
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none]">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap",
              activeTab === tab.key
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-accent",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Chart area */}
      <div className="rounded-xl border border-border/50 bg-card p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
            {activeTab === "overview"
              ? "Revenue vs Expenses"
              : activeTab === "revenue"
                ? "Revenue Projection"
                : activeTab === "expenses"
                  ? "Expenses Projection"
                  : "Net Cash Flow"}
          </h4>
          <div className="flex items-center gap-3 text-[10px]">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Historical
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-primary/40 border border-primary" />
              Projected
            </span>
          </div>
        </div>

        {/* Simple bar chart visualization */}
        <div className="relative h-48">
          <div className="absolute inset-0 flex items-end justify-between gap-1">
            {allLabels.map((label, i) => {
              const isProjected = i >= historical.labels.length;
              const revHeight =
                maxValue > 0 ? ((allRevenues[i] ?? 0) / maxValue) * 100 : 0;
              const expHeight =
                maxValue > 0 ? ((allExpenses[i] ?? 0) / maxValue) * 100 : 0;

              return (
                <div
                  key={label}
                  className="flex flex-1 items-end justify-center gap-0.5"
                >
                  {activeTab === "overview" || activeTab === "revenue" ? (
                    <div
                      className={cn(
                        "w-3 rounded-t transition-all duration-500",
                        isProjected
                          ? "bg-primary/30 border border-primary/50 border-b-0"
                          : "bg-emerald-500/70",
                      )}
                      style={{ height: `${revHeight}%` }}
                      title={`Revenue: ${formatCurrency(allRevenues[i] ?? 0)}`}
                    />
                  ) : null}
                  {activeTab === "overview" || activeTab === "expenses" ? (
                    <div
                      className={cn(
                        "w-3 rounded-t transition-all duration-500",
                        isProjected
                          ? "bg-amber-500/30 border border-amber-500/50 border-b-0"
                          : "bg-amber-500/70",
                      )}
                      style={{ height: `${expHeight}%` }}
                      title={`Expenses: ${formatCurrency(allExpenses[i] ?? 0)}`}
                    />
                  ) : null}
                  {activeTab === "cashflow" ? (
                    <div
                      className={cn(
                        "w-4 rounded-t transition-all duration-500",
                        isProjected
                          ? "bg-primary/30 border border-primary/50 border-b-0"
                          : "bg-blue-500/70",
                        (allRevenues[i] ?? 0) - (allExpenses[i] ?? 0) < 0 &&
                          "bg-red-500/70",
                      )}
                      style={{
                        height: `${Math.abs(((allRevenues[i] ?? 0) - (allExpenses[i] ?? 0)) / maxValue) * 100}%`,
                      }}
                      title={`Net: ${formatCurrency((allRevenues[i] ?? 0) - (allExpenses[i] ?? 0))}`}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>

          {/* X-axis labels */}
          <div className="absolute bottom-0 left-0 right-0 flex justify-between translate-y-full pt-2">
            {allLabels.map((label, i) => (
              <span
                key={label}
                className={cn(
                  "flex-1 text-center text-[9px]",
                  i >= historical.labels.length
                    ? "text-primary font-medium"
                    : "text-muted-foreground/50",
                )}
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Trend cards */}
      <div className="grid grid-cols-2 gap-3">
        <TrendCard
          label="Revenue Trend"
          value={trends.revenueTrend}
          avg={trends.avgRevenue}
          currency={currency}
        />
        <TrendCard
          label="Expense Trend"
          value={trends.expenseTrend}
          avg={trends.avgExpenses}
          currency={currency}
          invertColors
        />
        <div className="rounded-xl border border-border/50 bg-card p-3">
          <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider mb-1">
            Cash Balance
          </p>
          <p className="text-lg font-semibold text-foreground tabular-nums">
            {formatCurrency(trends.cashBalance)}
          </p>
        </div>
        <div className="rounded-xl border border-border/50 bg-card p-3">
          <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider mb-1">
            Runway
          </p>
          <p className="text-lg font-semibold text-foreground tabular-nums">
            {trends.runwayMonths !== null
              ? `${Math.round(trends.runwayMonths)} mo`
              : "∞"}
          </p>
        </div>
      </div>

      {/* AI Risks & Opportunities */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {ai.risks && ai.risks.length > 0 && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.03] p-3">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-3.5 w-3.5 text-amber-500" />
              <h4 className="text-xs font-semibold text-amber-600">Risks</h4>
            </div>
            <ul className="space-y-1.5">
              {ai.risks.map((risk: string, i: number) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-xs text-muted-foreground"
                >
                  <AlertTriangle className="h-3 w-3 text-amber-500/50 mt-0.5 shrink-0" />
                  {risk}
                </li>
              ))}
            </ul>
          </div>
        )}

        {ai.opportunities && ai.opportunities.length > 0 && (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.03] p-3">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="h-3.5 w-3.5 text-emerald-500" />
              <h4 className="text-xs font-semibold text-emerald-600">
                Opportunities
              </h4>
            </div>
            <ul className="space-y-1.5">
              {ai.opportunities.map((opp: string, i: number) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-xs text-muted-foreground"
                >
                  <TrendingUp className="h-3 w-3 text-emerald-500/50 mt-0.5 shrink-0" />
                  {opp}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Projected months detail */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 mb-3">
          Monthly Projections
        </h4>
        <div className="space-y-2">
          {projected.labels.map((label: string, i: number) => {
            const rev = projected.revenues[i] ?? 0;
            const exp = projected.expenses[i] ?? 0;
            const net = rev - exp;

            return (
              <div
                key={label}
                className="flex items-center justify-between rounded-lg border border-border/50 bg-card p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <Calendar className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {label}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Revenue {formatCurrency(rev)} · Expenses{" "}
                      {formatCurrency(exp)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={cn(
                      "text-sm font-semibold tabular-nums",
                      net >= 0 ? "text-emerald-500" : "text-red-500",
                    )}
                  >
                    {net >= 0 ? "+" : ""}
                    {formatCurrency(net)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">net</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Trend Card ────────────────────────────────────────────────────────────

function TrendCard({
  label,
  value,
  avg,
  currency,
  invertColors = false,
}: {
  label: string;
  value: number;
  avg: number;
  currency: string;
  invertColors?: boolean;
}) {
  const isPositive = invertColors ? value < 0 : value > 0;
  const isNegative = invertColors ? value > 0 : value < 0;

  return (
    <div className="rounded-xl border border-border/50 bg-card p-3">
      <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider mb-1">
        {label}
      </p>
      <div className="flex items-center gap-2">
        <p className="text-lg font-semibold text-foreground tabular-nums">
          {formatCurrency(avg)}
        </p>
        <span
          className={cn(
            "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold",
            isPositive && "bg-emerald-500/10 text-emerald-500",
            isNegative && "bg-red-500/10 text-red-500",
            !isPositive && !isNegative && "bg-muted text-muted-foreground",
          )}
        >
          {isPositive ? (
            <TrendingUp className="h-2.5 w-2.5" />
          ) : isNegative ? (
            <TrendingDown className="h-2.5 w-2.5" />
          ) : (
            <Minus className="h-2.5 w-2.5" />
          )}
          {value > 0 ? "+" : ""}
          {value.toFixed(1)}%
        </span>
      </div>
      <p className="text-[10px] text-muted-foreground/50 mt-1">avg/month</p>
    </div>
  );
}
