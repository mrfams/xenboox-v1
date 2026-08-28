"use client";

import { Suspense, useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Wallet,
  BarChart3,
  FileText,
  ArrowUpRight,
  Bot,
  Sparkles,
  ChevronRight,
  RefreshCw,
  ArrowRightLeft,
  Calendar,
  X,
  ChevronDown,
  ChevronUp,
  Globe,
  Loader2,
  LineChart,
  Target,
  FileBarChart,
  type LucideIcon,
} from "lucide-react";

import { useEntity } from "@/lib/entity-context";
import { trpc } from "@/lib/trpc/client";
import { cn, formatCurrency } from "@/lib/utils";
import { ModulePageShell } from "@/components/module/module-page-shell";
import { useSurfaceSync } from "@/lib/hooks/use-surface-sync";
import { AiNarrativeHeader } from "@/components/shared/ai-native";
import { useModuleAi } from "@/components/module/module-ai-context";
import {
  RevenueTrendChart,
  ExpenseBreakdownChart,
  CashFlowChart,
  MarginTrendChart,
} from "@/components/charts/financial-charts";
import { LiveExchangeRates } from "@/components/financial/live-exchange-rates";
import { DailyCloseStatus } from "@/components/financial/daily-close-status";
import {
  AnomalyAlerts,
  type Anomaly,
} from "@/components/financial/anomaly-alerts";
import { DocumentDownloadButtons } from "@/components/documents/document-download-buttons";
import { ForecastView } from "@/components/finance/forecast-view";
import {
  buildPnlReport,
  buildTrialBalanceReport,
  buildCashFlowReport,
} from "@/lib/documents/report-templates";

// ─── Helpers ─────────────────────────────────────────────────────────────

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

/** Convert a sparkline index to a month label (e.g., 0 → "Mar" for 3 months of data ending in May) */
function getMonthLabel(index: number, totalBars: number): string {
  const now = new Date();
  const currentMonth = now.getMonth();
  const monthIndex = (currentMonth - totalBars + 1 + index + 12) % 12;
  return MONTH_NAMES[monthIndex];
}

// ─── Financial Pulse ──────────────────────────────────────────────────────
//
// AI-narrated financial health. Not raw data tables.
// The AI explains what the numbers mean. Every chart has a narrative.
//
// Replaces: reports, insights, trial-balance (as a view)

// ─── Mini Sparkline ────────────────────────────────────────────────────────

function MiniSparkline({
  data,
  color = "text-balanced-green",
}: {
  data: number[];
  color?: string;
}) {
  if (data.length < 2) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * 100;
      const y = 100 - ((v - min) / range) * 80 - 10;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      viewBox="0 0 100 100"
      className="h-8 w-16"
      preserveAspectRatio="none"
      role="img"
      aria-label="Trend sparkline"
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className={color}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── KPI Cards ─────────────────────────────────────────────────────────────

function KPICard({
  label,
  value,
  previousValue,
  change,
  icon: Icon,
  color,
  sparkline,
  onAskAi,
  aiPrompt,
  onDrillDown,
}: {
  label: string;
  value: string;
  previousValue?: string;
  change?: string;
  icon: typeof TrendingUp;
  color: string;
  sparkline?: number[];
  onAskAi?: () => void;
  aiPrompt?: string;
  onDrillDown?: () => void;
}) {
  const isPositive = change?.startsWith("+");
  const isNegative = change?.startsWith("-");

  return (
    <div
      className={cn(
        "group relative text-left rounded-xl border border-border/50 bg-card/60 p-4 transition-all duration-200 hover:border-border/80 hover:shadow-md w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        onDrillDown && "cursor-pointer",
      )}
      onClick={onDrillDown}
      role={onDrillDown ? "button" : undefined}
      tabIndex={onDrillDown ? 0 : undefined}
      onKeyDown={
        onDrillDown
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onDrillDown();
              }
            }
          : undefined
      }
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={cn("h-4 w-4", color)} aria-hidden="true" />
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
        </div>
        {sparkline && (
          <MiniSparkline
            data={sparkline}
            color={
              isNegative
                ? "text-error-clay"
                : isPositive
                  ? "text-balanced-green"
                  : color
            }
          />
        )}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <p className="text-xl font-bold tracking-tight text-foreground">
          {value}
        </p>
        {change && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold",
              isPositive
                ? "bg-balanced-green/10 text-balanced-green"
                : isNegative
                  ? "bg-error-clay/10 text-error-clay"
                  : "bg-muted text-muted-foreground",
            )}
          >
            {change}
          </span>
        )}
      </div>
      {/* Prior period comparison */}
      {previousValue && (
        <p className="mt-1 text-[10px] text-muted-foreground/60">
          Previous period: {previousValue}
        </p>
      )}
      {/* Ask AI — appears on hover */}
      {onAskAi && aiPrompt && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onAskAi();
          }}
          className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md border border-primary/20 bg-primary/5 px-2 py-1 text-[10px] font-medium text-primary opacity-0 transition-all hover:bg-primary/10 group-hover:opacity-100"
          title={`Ask AI about ${label.toLowerCase()}`}
        >
          <Sparkles className="h-2.5 w-2.5" />
          Ask AI
        </button>
      )}
    </div>
  );
}

// ─── AI Narrative ──────────────────────────────────────────────────────────
//
// Now uses real LLM-generated narrative instead of assembled text.
// Falls back to assembled text if AI is unavailable.

function AiFinancialNarrative({
  aiNarrative,
  overview,
  pnl,
  isError,
}: {
  aiNarrative?: {
    text: string;
    confidence: number;
    generatedAt: string;
    highlights: string[];
    concerns: string[];
  };
  overview?: {
    cashBalance: number;
    accountsReceivable: number;
    accountsPayable: number;
    overdueInvoices: number;
    runway?: number | null;
  };
  pnl?: {
    revenue: number;
    expenses: number;
    revenueChange?: number;
    expensesChange?: number;
  };
  isError?: boolean;
}) {
  // Show error state when AI narrative fails
  if (isError && !aiNarrative) {
    return (
      <AiNarrativeHeader title="AI Financial Narrative">
        <p className="text-sm text-muted-foreground">
          AI narrative unavailable. Showing key figures below.
        </p>
      </AiNarrativeHeader>
    );
  }

  // Show loading state while AI narrative is being generated
  if (!aiNarrative && (!overview || !pnl)) {
    return (
      <AiNarrativeHeader title="AI Financial Narrative">
        <p className="text-muted-foreground animate-pulse">
          Generating your financial narrative...
        </p>
      </AiNarrativeHeader>
    );
  }

  // Use AI-generated narrative if available
  const narrativeText = aiNarrative?.text;

  // Fallback to assembled text if AI is unavailable
  if (!narrativeText) {
    const netProfit = (pnl?.revenue ?? 0) - (pnl?.expenses ?? 0);
    const margin =
      pnl && pnl.revenue > 0 ? Math.round((netProfit / pnl.revenue) * 100) : 0;
    const parts: string[] = [];
    if (pnl && pnl.revenue > 0)
      parts.push(
        `Revenue is ${formatCurrency(pnl.revenue)}${pnl.revenueChange ? ` (${pnl.revenueChange > 0 ? "+" : ""}${pnl.revenueChange.toFixed(1)}% vs prior)` : ""}.`,
      );
    if (pnl && pnl.expenses > 0)
      parts.push(
        `Expenses are ${formatCurrency(pnl.expenses)}${pnl.expensesChange ? ` (${pnl.expensesChange > 0 ? "+" : ""}${pnl.expensesChange.toFixed(1)}%)` : ""}.`,
      );
    if (netProfit !== 0)
      parts.push(
        `Net ${netProfit >= 0 ? "profit" : "loss"} is ${formatCurrency(Math.abs(netProfit))} (${margin}% margin).`,
      );
    return (
      <AiNarrativeHeader title="AI Financial Narrative">
        <p className="text-xs text-muted-foreground/60 mb-1">
          Key figures (AI narrative unavailable)
        </p>
        <p>{parts.join(" ") || "Financial data is being compiled..."}</p>
      </AiNarrativeHeader>
    );
  }

  return (
    <AiNarrativeHeader title="AI Financial Narrative">
      {/* AI-generated narrative text */}
      <div className="whitespace-pre-wrap">{narrativeText}</div>

      {/* Highlights and concerns */}
      {(aiNarrative.highlights.length > 0 ||
        aiNarrative.concerns.length > 0) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {aiNarrative.highlights.map((h, i) => (
            <span
              key={`h-${i}`}
              className="inline-flex items-center gap-1 rounded-full bg-balanced-green/10 px-2 py-0.5 text-[10px] font-medium text-balanced-green"
            >
              ✅ {h}
            </span>
          ))}
          {aiNarrative.concerns.map((c, i) => (
            <span
              key={`c-${i}`}
              className="inline-flex items-center gap-1 rounded-full bg-attention-amber/10 px-2 py-0.5 text-[10px] font-medium text-attention-amber"
            >
              ⚠️ {c}
            </span>
          ))}
        </div>
      )}

      {/* Confidence and timestamp */}
      <div className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground/60">
        <span>
          Confidence: {Math.round(aiNarrative.confidence * 100)}%
          {aiNarrative.confidence >= 0.7
            ? " (High)"
            : aiNarrative.confidence >= 0.4
              ? " (Medium)"
              : " (Low)"}
        </span>
        <span>•</span>
        <span>
          Generated: {new Date(aiNarrative.generatedAt).toLocaleTimeString()}
        </span>
      </div>
    </AiNarrativeHeader>
  );
}

// ─── Scenario Planner ──────────────────────────────────────────────────────

function ScenarioPlanner({ onAskAi }: { onAskAi: (prompt: string) => void }) {
  const [query, setQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleSubmit = () => {
    if (!query.trim() || isSubmitting) return;
    setIsSubmitting(true);
    onAskAi(`Model this scenario: ${query}`);
    setQuery("");
    // Reset after a brief delay since the AI processes asynchronously
    timerRef.current = setTimeout(() => setIsSubmitting(false), 2000);
  };

  return (
    <div className="rounded-xl border border-border/50 bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-foreground">
          AI Scenario Planner
        </h3>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Ask the AI to model financial scenarios. Try: &quot;What if revenue
        grows 20% and we hire 3 more staff?&quot;
      </p>
      <div className="flex gap-2">
        <label htmlFor="scenario-input" className="sr-only">
          Describe a financial scenario
        </label>
        <input
          id="scenario-input"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="Describe a scenario..."
          className="flex-1 rounded-lg border border-border/50 bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/10"
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!query.trim() || isSubmitting}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40"
        >
          {isSubmitting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          {isSubmitting ? "Processing..." : "Run scenario"}
        </button>
      </div>
    </div>
  );
}

// ─── KPI Drill-Down Drawer ────────────────────────────────────────────────

type DrillDownItem = {
  label: string;
  value: string;
  percentage?: string;
  color?: string;
};

type DrillDownData = {
  title: string;
  total: string;
  items: DrillDownItem[];
  insight?: string;
};

function KpiDrillDownDrawer({
  data,
  onClose,
}: {
  data: DrillDownData | null;
  onClose: () => void;
}) {
  if (!data) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="drilldown-title"
      className="fixed inset-0 z-50 flex items-center justify-end bg-black/50 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div className="h-full w-full max-w-md bg-card border-l border-border shadow-2xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card/95 backdrop-blur-sm px-6 py-4">
          <h2
            id="drilldown-title"
            className="text-sm font-semibold text-foreground"
          >
            {data.title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Total */}
          <div className="rounded-lg border border-border/50 bg-background p-4">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              Total
            </p>
            <p className="mt-1 text-2xl font-bold text-foreground">
              {data.total}
            </p>
          </div>

          {/* Items */}
          <div className="space-y-2">
            {data.items.map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg border border-border/30 bg-background/50 px-3 py-2.5"
              >
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "h-2 w-2 rounded-full",
                      item.color ?? "bg-primary",
                    )}
                  />
                  <span className="text-sm text-foreground">{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  {item.percentage && (
                    <span className="text-[10px] text-muted-foreground">
                      {item.percentage}
                    </span>
                  )}
                  <span className="text-sm font-semibold text-foreground">
                    {item.value}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* AI Insight */}
          {data.insight && (
            <div className="rounded-lg border border-primary/10 bg-primary/[0.03] p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Sparkles className="h-3 w-3 text-primary" aria-hidden="true" />
                <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">
                  AI Insight
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {data.insight}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Budget vs Actual ────────────────────────────────────────────────────

function BudgetVsActualSection({
  entityId,
  askAiAbout,
}: {
  entityId: string;
  askAiAbout: (prompt: string) => void;
}) {
  const { data: currentPeriod } = trpc.fiscal.getCurrent.useQuery(undefined, {
    enabled: !!entityId,
  });

  const { data: budgetData, isLoading } =
    trpc.reports.getBudgetVsActual.useQuery(
      { periodId: currentPeriod?.id ?? "" },
      { enabled: !!entityId && !!currentPeriod?.id },
    );

  if (isLoading || !budgetData) return null;

  const items = (budgetData.lines ?? []).map((line) => ({
    category: line.accountName,
    budget: line.budgetedAmount,
    actual: line.actualAmount,
    variance: line.variance,
    variancePercent: line.variancePct,
    status: line.status,
  }));
  if (items.length === 0) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold tracking-tight text-foreground">
          Budget vs Actual
        </h3>
        <button
          type="button"
          onClick={() =>
            askAiAbout(
              "Analyze my budget vs actual performance. Where are the biggest variances and what should I do about them?",
            )
          }
          className="text-[10px] text-primary hover:underline"
        >
          Ask AI
        </button>
      </div>
      <div className="rounded-xl border border-border/50 overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                Category
              </th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                Budget
              </th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                Actual
              </th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                Variance
              </th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {items.slice(0, 8).map(
              (
                item: {
                  category: string;
                  budget: number;
                  actual: number;
                  variance: number;
                  variancePercent: number;
                },
                i: number,
              ) => {
                const isOver = item.variance > 0;
                const isUnder = item.variance < 0;
                return (
                  <tr
                    key={i}
                    className="border-b last:border-0 hover:bg-muted/20"
                  >
                    <td className="px-3 py-2 font-medium text-foreground">
                      {item.category}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                      {formatCurrency(item.budget)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-foreground">
                      {formatCurrency(item.actual)}
                    </td>
                    <td
                      className={cn(
                        "px-3 py-2 text-right tabular-nums font-medium",
                        isOver
                          ? "text-error-clay"
                          : isUnder
                            ? "text-balanced-green"
                            : "text-muted-foreground",
                      )}
                    >
                      {isOver ? "+" : ""}
                      {formatCurrency(item.variance)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold",
                          isOver
                            ? "bg-error-clay/10 text-error-clay"
                            : isUnder
                              ? "bg-balanced-green/10 text-balanced-green"
                              : "bg-muted text-muted-foreground",
                        )}
                      >
                        {isOver ? "Over" : isUnder ? "Under" : "On Track"}
                      </span>
                    </td>
                  </tr>
                );
              },
            )}
          </tbody>
        </table>
        {items.length > 8 && (
          <div className="border-t border-border/50 px-3 py-2 text-center">
            <span className="text-xs text-muted-foreground">
              Showing 8 of {items.length} categories
            </span>
          </div>
        )}
      </div>
    </section>
  );
}

// ─── Report Library ────────────────────────────────────────────────────────

const REPORTS = [
  {
    id: "pnl",
    label: "Profit & Loss",
    description: "Revenue, expenses, and net income",
    aiPrompt: "Show me my profit and loss statement",
    icon: TrendingUp,
    color: "bg-primary/10 text-primary",
  },
  {
    id: "cash-flow",
    label: "Cash Flow",
    description: "Cash in, cash out, net movement",
    aiPrompt: "Show me my cash flow statement",
    icon: Wallet,
    color: "bg-signal-indigo/10 text-signal-indigo",
  },
  // Balance Sheet and Trial Balance hidden until real report builders exist
  // (were generating empty documents — users downloading blank PDFs)
  // TODO: Wire real builders and re-enable
  // {
  //   id: "balance-sheet",
  //   label: "Balance Sheet",
  //   description: "Assets, liabilities, and equity",
  //   aiPrompt: "Show me my balance sheet",
  //   icon: BarChart3,
  //   color: "bg-emerald-500/10 text-emerald-500",
  // },
  // {
  //   id: "trial-balance",
  //   label: "Trial Balance",
  //   description: "Debits equal credits verification",
  //   aiPrompt: "Show me my trial balance",
  //   icon: FileText,
  //   color: "bg-amber-500/10 text-amber-500",
  // },
];

// ─── Tabs ──────────────────────────────────────────────────────────────────

type PulseTab = "overview" | "performance" | "planning" | "reports";

const TABS: { key: PulseTab; label: string; icon: LucideIcon }[] = [
  { key: "overview", label: "Overview", icon: Activity },
  { key: "performance", label: "Performance", icon: LineChart },
  { key: "planning", label: "Planning", icon: Target },
  { key: "reports", label: "Reports", icon: FileBarChart },
];

function isPulseTab(v: string | null | undefined): v is PulseTab {
  return TABS.some((t) => t.key === v);
}

// ─── Keyboard-Navigable Tab List ──────────────────────────────────────────

function PulseTabList({
  activeTab,
  onTabChange,
}: {
  activeTab: PulseTab;
  onTabChange: (key: PulseTab) => void;
}) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const tabIndex = TABS.findIndex((t) => t.key === activeTab);

  const focusTab = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(index, TABS.length - 1));
    tabRefs.current[clamped]?.focus();
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowRight":
          e.preventDefault();
          focusTab(tabIndex + 1);
          break;
        case "ArrowLeft":
          e.preventDefault();
          focusTab(tabIndex - 1);
          break;
        case "Home":
          e.preventDefault();
          focusTab(0);
          break;
        case "End":
          e.preventDefault();
          focusTab(TABS.length - 1);
          break;
      }
    },
    [tabIndex, focusTab],
  );

  return (
    <div
      role="tablist"
      aria-label="Financial Pulse sections"
      className="flex items-center gap-1 overflow-x-auto border-b border-border/50 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {TABS.map((tab, i) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.key;

        return (
          <button
            key={tab.key}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`pulse-tab-${tab.key}`}
            aria-selected={isActive}
            aria-controls={`pulse-panel-${tab.key}`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onTabChange(tab.key)}
            onKeyDown={handleKeyDown}
            className={cn(
              "flex items-center gap-1.5 border-b-2 -mb-px px-3 py-2.5 text-xs font-medium transition-colors whitespace-nowrap",
              isActive
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function FinancialPulsePage() {
  return (
    <Suspense>
      <FinancialPulseInner />
    </Suspense>
  );
}

function FinancialPulseInner() {
  const { entityId, entityCurrency } = useEntity();
  const { openWithFocus } = useModuleAi();

  const { data: entities } = trpc.organization.listUserEntities.useQuery();
  const entity = entities?.find((e) => e.id === entityId);

  // Display currency: entity context is authoritative. Never hardcode a
  // region-specific currency code as a fallback (engreview FP PM#1 / Eng#4).
  const displayCurrency = entityCurrency || "USD";

  // ── Cross-surface sync ────────────────────────────────────────────────
  // Listen for data_changed events from other surfaces and refetch
  useSurfaceSync({ entityId, surfaces: ["financial-pulse"] });

  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<PulseTab>(
    isPulseTab(searchParams.get("tab")) ? searchParams.get("tab")! : "overview",
  );

  const handleTabChange = useCallback(
    (key: PulseTab) => {
      setActiveTab(key);
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", key);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const [selectedPeriod, setSelectedPeriod] = useState<
    "this_month" | "last_month" | "this_quarter"
  >("this_month");

  const [drillDown, setDrillDown] = useState<DrillDownData | null>(null);

  const { data: dashboardData } = trpc.dashboard.getDashboardData.useQuery(
    { period: selectedPeriod },
    { enabled: !!entityId },
  );

  const { data: pnlData } = trpc.reports.getPnlOverview.useQuery(undefined, {
    enabled: !!entityId,
  });

  const { data: anomalyData } = trpc.dashboard.detectAnomalies.useQuery(
    undefined,
    {
      enabled: !!entityId,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  );

  const { data: aiNarrative, isError: isNarrativeError } =
    trpc.dashboard.getAiNarrative.useQuery(undefined, {
      enabled: !!entityId,
      staleTime: 10 * 60 * 1000, // 10 minutes — AI narratives are expensive to regenerate
    });

  const overview = dashboardData
    ? {
        cashBalance: dashboardData.businessHealth.cashBalance,
        accountsReceivable: dashboardData.businessHealth.arOutstanding,
        accountsPayable: dashboardData.businessHealth.apOutstanding,
        overdueInvoices: 0,
        runway: dashboardData.businessHealth.runwayMonths,
      }
    : undefined;

  const pnl = pnlData
    ? {
        revenue: pnlData.current.revenue,
        expenses: pnlData.current.opExpenses,
        revenueChange: dashboardData?.businessHealth.revenueChange,
        expensesChange: dashboardData?.businessHealth.expensesChange,
      }
    : undefined;

  // Real sparkline data from the backend (monthly totals)
  const revenueSparkline = dashboardData?.businessHealth.revenueSparkline ?? [];
  const expenseSparkline =
    dashboardData?.businessHealth.expensesSparkline ?? [];
  const cashSparkline = dashboardData?.businessHealth.cashSparkline ?? [];

  // Build expense breakdown from P&L data
  const expenseBreakdownData =
    pnlData?.current.expensesByAccount?.slice(0, 8).map((a) => ({
      category:
        a.accountName.length > 12
          ? a.accountName.slice(0, 12) + "…"
          : a.accountName,
      amount: Math.abs(a.amount),
    })) ?? [];

  // Helper to open copilot with a financial question
  const askAiAbout = (prompt: string) => {
    openWithFocus(
      {
        kind: "Financial Pulse",
        name: "Financial Overview",
        fields: [
          {
            label: "Revenue",
            value: formatCurrency(pnl?.revenue ?? 0),
          },
          {
            label: "Expenses",
            value: formatCurrency(pnl?.expenses ?? 0),
          },
          {
            label: "Net Profit",
            value: formatCurrency(pnlData?.current.netProfit ?? 0),
          },
          {
            label: "Cash Balance",
            value: formatCurrency(overview?.cashBalance ?? 0),
          },
          {
            label: "Revenue Change",
            value: pnl?.revenueChange
              ? `${pnl.revenueChange > 0 ? "+" : ""}${pnl.revenueChange.toFixed(1)}%`
              : "N/A",
          },
          {
            label: "Expenses Change",
            value: pnl?.expensesChange
              ? `${pnl.expensesChange > 0 ? "+" : ""}${pnl.expensesChange.toFixed(1)}%`
              : "N/A",
          },
        ],
      },
      prompt,
    );
  };

  return (
    <ModulePageShell
      title="Financial Pulse"
      description="AI-narrated financial health. Visual, not tabular."
      icon={Activity}
      aiSuggestions={[
        {
          label: "Explain my cash position",
          prompt: "Explain my cash position",
        },
        {
          label: "What's driving expenses?",
          prompt: "What's driving expenses?",
        },
        { label: "Model next quarter", prompt: "Model next quarter" },
      ]}
    >
      <div
        className="space-y-6 p-3 pb-20 sm:p-6 md:pb-6"
        aria-busy={!dashboardData && !pnlData}
      >
        {/* Period Selector */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar
              className="h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
            <span className="text-xs font-medium text-muted-foreground">
              Period:
            </span>
          </div>
          <div
            role="tablist"
            aria-label="Financial period"
            className="flex items-center gap-1 rounded-lg border border-border/50 bg-muted/30 p-0.5"
          >
            {[
              { key: "this_month" as const, label: "This Month" },
              { key: "last_month" as const, label: "Last Month" },
              { key: "this_quarter" as const, label: "This Quarter" },
            ].map((period) => (
              <button
                key={period.key}
                type="button"
                role="tab"
                aria-selected={selectedPeriod === period.key}
                onClick={() => setSelectedPeriod(period.key)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  selectedPeriod === period.key
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {period.label}
              </button>
            ))}
          </div>
        </div>

        {/* Section Tabs */}
        <PulseTabList activeTab={activeTab} onTabChange={handleTabChange} />

        {/* ── Overview Tab ── */}
        {activeTab === "overview" && (
          <div
            id="pulse-panel-overview"
            role="tabpanel"
            aria-labelledby="pulse-tab-overview"
            className="space-y-6"
          >
            {/* AI Narrative */}
            <AiFinancialNarrative
              aiNarrative={aiNarrative}
              overview={overview}
              pnl={pnl}
              isError={isNarrativeError}
            />

            {/* Anomaly Alerts */}
            {anomalyData?.anomalies && anomalyData.anomalies.length > 0 && (
              <AnomalyAlerts
                anomalies={anomalyData.anomalies}
                onInvestigate={(anomaly) =>
                  askAiAbout(
                    `Investigate this anomaly: ${anomaly.message}. ${anomaly.aiInsight}`,
                  )
                }
              />
            )}

            {/* Data Freshness Indicator */}
            <div className="flex items-center justify-end">
              <span className="text-xs text-muted-foreground">
                Data refreshes every 5 minutes
              </span>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <KPICard
                label="Revenue"
                value={formatCurrency(pnl?.revenue ?? 0)}
                previousValue={
                  pnl?.revenueChange
                    ? formatCurrency(
                        (pnl.revenue ?? 0) /
                          (1 + (pnl.revenueChange ?? 0) / 100),
                      )
                    : undefined
                }
                change={
                  pnl?.revenueChange
                    ? `${pnl.revenueChange > 0 ? "+" : ""}${pnl.revenueChange.toFixed(1)}%`
                    : undefined
                }
                icon={TrendingUp}
                color="text-balanced-green"
                sparkline={revenueSparkline}
                onDrillDown={() => {
                  const expenses = pnlData?.current.expensesByAccount ?? [];
                  const totalExpenses = expenses.reduce(
                    (s, e) => s + Math.abs(e.amount),
                    0,
                  );
                  setDrillDown({
                    title: "Revenue Breakdown",
                    total: formatCurrency(pnl?.revenue ?? 0),
                    items: (pnlData?.current.revenueByAccount ?? [])
                      .slice(0, 10)
                      .map((a) => ({
                        label: a.accountName,
                        value: formatCurrency(a.amount),
                        percentage: pnl?.revenue
                          ? `${((a.amount / pnl.revenue) * 100).toFixed(1)}%`
                          : undefined,
                        color: "bg-balanced-green",
                      })),
                    insight: pnl?.revenueChange
                      ? `Revenue ${pnl.revenueChange > 0 ? "grew" : "declined"} ${Math.abs(pnl.revenueChange).toFixed(1)}% vs prior period.`
                      : undefined,
                  });
                }}
                onAskAi={() =>
                  askAiAbout(
                    "Explain my revenue position and trends. What's driving the change vs last month?",
                  )
                }
                aiPrompt="Explain revenue"
              />
              <KPICard
                label="Expenses"
                value={formatCurrency(pnl?.expenses ?? 0)}
                previousValue={
                  pnl?.expensesChange
                    ? formatCurrency(
                        (pnl.expenses ?? 0) /
                          (1 + (pnl.expensesChange ?? 0) / 100),
                      )
                    : undefined
                }
                change={
                  pnl?.expensesChange
                    ? `${pnl.expensesChange > 0 ? "+" : ""}${pnl.expensesChange.toFixed(1)}%`
                    : undefined
                }
                icon={TrendingDown}
                color="text-error-clay"
                sparkline={expenseSparkline}
                onDrillDown={() => {
                  const expenses = pnlData?.current.expensesByAccount ?? [];
                  const totalExpenses = expenses.reduce(
                    (s, e) => s + Math.abs(e.amount),
                    0,
                  );
                  setDrillDown({
                    title: "Expense Breakdown",
                    total: formatCurrency(pnl?.expenses ?? 0),
                    items: expenses.slice(0, 10).map((a) => ({
                      label: a.accountName,
                      value: formatCurrency(Math.abs(a.amount)),
                      percentage:
                        totalExpenses > 0
                          ? `${((Math.abs(a.amount) / totalExpenses) * 100).toFixed(1)}%`
                          : undefined,
                      color: "bg-error-clay",
                    })),
                    insight: pnl?.expensesChange
                      ? `Expenses ${pnl.expensesChange > 0 ? "increased" : "decreased"} ${Math.abs(pnl.expensesChange).toFixed(1)}% vs prior period.`
                      : undefined,
                  });
                }}
                onAskAi={() =>
                  askAiAbout(
                    "Break down my expenses. What's the biggest cost driver and how can I reduce it?",
                  )
                }
                aiPrompt="Explain expenses"
              />
              <KPICard
                label="Net Profit"
                value={formatCurrency(pnlData?.current.netProfit ?? 0)}
                icon={BarChart3}
                color="text-primary"
                onDrillDown={() => {
                  setDrillDown({
                    title: "Profitability Summary",
                    total: formatCurrency(pnlData?.current.netProfit ?? 0),
                    items: [
                      {
                        label: "Revenue",
                        value: formatCurrency(pnl?.revenue ?? 0),
                        color: "bg-balanced-green",
                      },
                      {
                        label: "Cost of Goods Sold",
                        value: formatCurrency(pnlData?.current.cogs ?? 0),
                        color: "bg-attention-amber",
                      },
                      {
                        label: "Gross Profit",
                        value: formatCurrency(
                          (pnl?.revenue ?? 0) - (pnlData?.current.cogs ?? 0),
                        ),
                        color: "bg-primary",
                      },
                      {
                        label: "Operating Expenses",
                        value: formatCurrency(pnl?.expenses ?? 0),
                        color: "bg-error-clay",
                      },
                      {
                        label: "Net Profit",
                        value: formatCurrency(pnlData?.current.netProfit ?? 0),
                        color: "bg-primary",
                      },
                    ],
                    insight:
                      pnl?.revenue && pnl?.expenses
                        ? pnl.revenue > 0
                          ? `Net margin: ${(((pnlData?.current.netProfit ?? 0) / pnl.revenue) * 100).toFixed(1)}%. Revenue-expense spread: ${(pnl.revenueChange ?? 0) - (pnl.expensesChange ?? 0) > 0 ? "expanding" : "narrowing"}.`
                          : `Net margin: —. Revenue-expense spread: ${(pnl.revenueChange ?? 0) - (pnl.expensesChange ?? 0) > 0 ? "expanding" : "narrowing"}.`
                        : undefined,
                  });
                }}
                onAskAi={() =>
                  askAiAbout(
                    "Explain my profitability. Is my margin improving or declining? What should I focus on?",
                  )
                }
                aiPrompt="Explain profit"
              />
              <KPICard
                label="Cash Balance"
                value={formatCurrency(overview?.cashBalance ?? 0)}
                icon={Wallet}
                color="text-primary"
                sparkline={cashSparkline}
                onDrillDown={() => {
                  setDrillDown({
                    title: "Cash Position",
                    total: formatCurrency(overview?.cashBalance ?? 0),
                    items: [
                      {
                        label: "Accounts Receivable",
                        value: formatCurrency(
                          overview?.accountsReceivable ?? 0,
                        ),
                        color: "bg-balanced-green",
                      },
                      {
                        label: "Accounts Payable",
                        value: formatCurrency(overview?.accountsPayable ?? 0),
                        color: "bg-error-clay",
                      },
                      {
                        label: "Net Position",
                        value: formatCurrency(
                          (overview?.cashBalance ?? 0) +
                            (overview?.accountsReceivable ?? 0) -
                            (overview?.accountsPayable ?? 0),
                        ),
                        color: "bg-primary",
                      },
                    ],
                    insight:
                      overview?.runway !== null &&
                      overview?.runway !== undefined
                        ? overview.runway <= 0
                          ? "Immediate action required — runway is critically low."
                          : overview.runway < 3
                            ? `At current burn rate, you have approximately ${overview.runway.toFixed(1)} months of runway. This is critically low.`
                            : `At current burn rate, you have approximately ${overview.runway.toFixed(1)} months of runway.`
                        : "Runway unknown — connect your bank accounts for accurate data.",
                  });
                }}
                onAskAi={() =>
                  askAiAbout(
                    "Explain my cash position. How many months of runway do I have? What's the trend?",
                  )
                }
                aiPrompt="Explain cash"
              />
            </div>

            {/* Daily Close Status */}
            <DailyCloseStatus />

            {/* Live Exchange Rates */}
            <LiveExchangeRates />
          </div>
        )}

        {/* ── Performance Tab ── */}
        {activeTab === "performance" && (
          <div
            id="pulse-panel-performance"
            role="tabpanel"
            aria-labelledby="pulse-tab-performance"
            className="space-y-6"
          >
            {/* Interactive Charts */}
            <div className="grid gap-4 sm:grid-cols-2">
              <RevenueTrendChart
                data={revenueSparkline.map((v, i) => ({
                  month: getMonthLabel(i, revenueSparkline.length),
                  revenue: v,
                  prior: expenseSparkline[i] ? undefined : undefined,
                }))}
                currency={displayCurrency}
                onAskAi={() =>
                  askAiAbout(
                    "Explain my revenue trend. What's driving the changes?",
                  )
                }
              />
              <CashFlowChart
                data={revenueSparkline.map((v, i) => ({
                  month: getMonthLabel(i, revenueSparkline.length),
                  incoming: v,
                  outgoing: expenseSparkline[i] ?? 0,
                }))}
                currency={displayCurrency}
                onAskAi={() =>
                  askAiAbout(
                    "Analyze my cash flow. Am I spending more than I'm earning?",
                  )
                }
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
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
                  askAiAbout(
                    "Analyze my profit margin trend. Is it improving or declining?",
                  )
                }
              />
              <ExpenseBreakdownChart
                data={expenseBreakdownData}
                currency={displayCurrency}
                onAskAi={() =>
                  askAiAbout(
                    "Break down my expenses. What's the biggest cost driver?",
                  )
                }
              />
            </div>

            {/* Scenario Planner */}
            <ScenarioPlanner onAskAi={askAiAbout} />
          </div>
        )}

        {/* ── Planning Tab ── */}
        {activeTab === "planning" && (
          <div
            id="pulse-panel-planning"
            role="tabpanel"
            aria-labelledby="pulse-tab-planning"
            className="space-y-6"
          >
            {/* AI Forecast */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold tracking-tight text-foreground">
                  AI Forecast
                </h3>
                <button
                  type="button"
                  onClick={() =>
                    askAiAbout(
                      "Explain my financial forecast for the next 3 months",
                    )
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/5 px-2.5 py-1 text-[11px] font-medium text-primary hover:bg-primary/10 transition-colors"
                >
                  <Sparkles className="h-3 w-3" />
                  Ask AI
                </button>
              </div>
              <ForecastView />
            </section>

            {/* Budget vs Actual */}
            <BudgetVsActualSection
              entityId={entityId ?? ""}
              askAiAbout={askAiAbout}
            />
          </div>
        )}

        {/* ── Reports Tab ── */}
        {activeTab === "reports" && (
          <div
            id="pulse-panel-reports"
            role="tabpanel"
            aria-labelledby="pulse-tab-reports"
            className="space-y-6"
          >
            {/* Report Library */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold tracking-tight text-foreground">
                  Reports
                </h3>
                <span className="text-[10px] text-muted-foreground">
                  Click to analyze with AI · Download buttons for export
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {REPORTS.map((report) => {
                  const Icon = report.icon;
                  // Build report data for downloads
                  const reportData =
                    report.id === "pnl" && pnlData
                      ? buildPnlReport({
                          entityName: entity?.name || "Your Business",
                          currency: displayCurrency,
                          period: new Date().toLocaleDateString("en-US", {
                            month: "long",
                            year: "numeric",
                          }),
                          revenue: pnlData.current.revenue,
                          revenueByAccount:
                            pnlData.current.revenueByAccount.map((a) => ({
                              code: a.accountCode,
                              name: a.accountName,
                              amount: a.amount,
                            })),
                          expenses: pnlData.current.expenses,
                          expensesByAccount:
                            pnlData.current.expensesByAccount.map((a) => ({
                              code: a.accountCode,
                              name: a.accountName,
                              amount: a.amount,
                            })),
                          cogs: pnlData.current.cogs,
                          grossProfit: pnlData.current.grossProfit,
                          opExpenses: pnlData.current.opExpenses,
                          netProfit: pnlData.current.netProfit,
                          narrative: aiNarrative?.text,
                        })
                      : report.id === "cash-flow"
                        ? buildCashFlowReport({
                            entityName: entity?.name || "Your Business",
                            currency: displayCurrency,
                            period: new Date().toLocaleDateString("en-US", {
                              month: "long",
                              year: "numeric",
                            }),
                            openingCash: overview?.cashBalance ?? 0,
                            operating: {
                              lines: [
                                {
                                  name: "Revenue",
                                  amount: pnlData?.current.revenue ?? 0,
                                },
                              ],
                              total: pnlData?.current.revenue ?? 0,
                            },
                            investing: { lines: [], total: 0 },
                            financing: { lines: [], total: 0 },
                            closingCash: overview?.cashBalance ?? 0,
                          })
                        : {
                            title: report.label,
                            entityName: entity?.name || "Your Business",
                            currency: displayCurrency,
                            generatedAt: new Date(),
                            sections: [],
                          };

                  return (
                    <div
                      key={report.id}
                      className="group rounded-xl border border-border/50 bg-card p-4 transition-all duration-200 hover:border-border/80 hover:shadow-md"
                    >
                      <button
                        type="button"
                        onClick={() => askAiAbout(report.aiPrompt)}
                        className="w-full text-left"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={cn(
                              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                              report.color.split(" ")[0],
                            )}
                          >
                            <Icon
                              className={cn(
                                "h-5 w-5",
                                report.color.split(" ")[1],
                              )}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                              {report.label}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                              {report.description}
                            </p>
                          </div>
                          <Sparkles className="h-4 w-4 shrink-0 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                        </div>
                      </button>
                      {/* Download buttons */}
                      <div className="mt-3 pt-3 border-t border-border/30">
                        <DocumentDownloadButtons
                          data={reportData}
                          formats={["pdf", "excel", "word"]}
                          size="xs"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Quick Actions */}
            <div className="rounded-xl border border-border/50 bg-card p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">
                Quick Actions
              </h3>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => askAiAbout("Show me my trial balance")}
                  className="inline-flex items-center gap-2 rounded-lg border border-border/50 bg-background px-4 py-2 text-sm text-foreground hover:bg-accent transition-colors"
                >
                  <FileText className="h-4 w-4" aria-hidden="true" />
                  View Ledger
                </button>
                <button
                  type="button"
                  onClick={() =>
                    askAiAbout("Show me my cash flow for this month")
                  }
                  className="inline-flex items-center gap-2 rounded-lg border border-border/50 bg-background px-4 py-2 text-sm text-foreground hover:bg-accent transition-colors"
                >
                  <ArrowRightLeft className="h-4 w-4" aria-hidden="true" />
                  Cash Flow
                </button>
                <button
                  type="button"
                  onClick={() =>
                    askAiAbout(
                      "Generate a comprehensive financial report for this month",
                    )
                  }
                  className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2 text-sm text-primary hover:bg-primary/10 transition-colors"
                >
                  <Bot className="h-4 w-4" aria-hidden="true" />
                  Ask AI for custom report
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* KPI Drill-Down Drawer */}
      <KpiDrillDownDrawer data={drillDown} onClose={() => setDrillDown(null)} />
    </ModulePageShell>
  );
}
