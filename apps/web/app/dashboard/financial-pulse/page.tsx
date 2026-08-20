"use client";

import { useState } from "react";
import Link from "next/link";
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
} from "lucide-react";

import { useEntity } from "@/lib/entity-context";
import { trpc } from "@/lib/trpc/client";
import { cn, formatCurrency } from "@/lib/utils";
import { ModulePageShell } from "@/components/module/module-page-shell";
import { AiNarrativeHeader } from "@/components/shared/ai-native";

// ─── Financial Pulse ──────────────────────────────────────────────────────
//
// AI-narrated financial health. Not raw data tables.
// The AI explains what the numbers mean. Every chart has a narrative.
//
// Replaces: reports, insights, trial-balance (as a view)

// ─── Mini Sparkline ────────────────────────────────────────────────────────

function MiniSparkline({
  data,
  color = "text-emerald-500",
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
  change,
  icon: Icon,
  color,
  sparkline,
}: {
  label: string;
  value: string;
  change?: string;
  icon: typeof TrendingUp;
  color: string;
  sparkline?: number[];
}) {
  const isPositive = change?.startsWith("+");
  const isNegative = change?.startsWith("-");

  return (
    <div className="rounded-xl border border-border/50 bg-card/60 p-4 transition-all duration-200 hover:border-border/80 hover:shadow-md">
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
                ? "text-red-500"
                : isPositive
                  ? "text-emerald-500"
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
                ? "bg-emerald-500/10 text-emerald-500"
                : isNegative
                  ? "bg-red-500/10 text-red-500"
                  : "bg-muted text-muted-foreground",
            )}
          >
            {change}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── AI Narrative ──────────────────────────────────────────────────────────

function AiFinancialNarrative({
  overview,
  pnl,
}: {
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
}) {
  if (!overview && !pnl) {
    return (
      <AiNarrativeHeader title="AI Financial Narrative">
        <p>Loading your financial narrative...</p>
      </AiNarrativeHeader>
    );
  }

  const netProfit = (pnl?.revenue ?? 0) - (pnl?.expenses ?? 0);
  const margin =
    pnl && pnl.revenue > 0 ? Math.round((netProfit / pnl.revenue) * 100) : 0;

  // Build narrative from real data
  const parts: string[] = [];

  if (pnl && pnl.revenue > 0) {
    parts.push(
      `Revenue is ${formatCurrency(pnl.revenue)}${pnl.revenueChange ? ` (${pnl.revenueChange > 0 ? "+" : ""}${pnl.revenueChange.toFixed(1)}% vs prior period)` : ""}.`,
    );
  }

  if (pnl && pnl.expenses > 0) {
    parts.push(
      `Expenses are ${formatCurrency(pnl.expenses)}${pnl.expensesChange ? ` (${pnl.expensesChange > 0 ? "+" : ""}${pnl.expensesChange.toFixed(1)}%)` : ""}.`,
    );
  }

  if (netProfit !== 0) {
    parts.push(
      `Net ${netProfit >= 0 ? "profit" : "loss"} is ${formatCurrency(Math.abs(netProfit))} (${margin}% margin).`,
    );
  }

  if (overview) {
    if (overview.overdueInvoices > 0) {
      parts.push(
        `${overview.overdueInvoices} invoice${overview.overdueInvoices > 1 ? "s are" : " is"} overdue and needs attention.`,
      );
    }

    if (overview.runway !== null && overview.runway !== undefined) {
      parts.push(`Cash runway is ${overview.runway.toFixed(1)} months.`);
    }
  }

  if (parts.length === 0) {
    parts.push(
      "Financial data is being compiled. Check back shortly for your AI-narrated summary.",
    );
  }

  return (
    <AiNarrativeHeader
      title="AI Financial Narrative"
      actions={[
        { label: "Full P&L", variant: "outline" },
        { label: "Balance Sheet", variant: "outline" },
        { label: "Cash Flow", variant: "outline" },
      ]}
    >
      <p>{parts.join(" ")}</p>
    </AiNarrativeHeader>
  );
}

// ─── Scenario Planner ──────────────────────────────────────────────────────

function ScenarioPlanner() {
  const [query, setQuery] = useState("");
  const [isThinking, setIsThinking] = useState(false);

  const handleSubmit = () => {
    if (!query.trim()) return;
    setIsThinking(true);
    // In production, this would call the AI to model the scenario
    setTimeout(() => setIsThinking(false), 2000);
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
          disabled={!query.trim() || isThinking}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40"
        >
          {isThinking ? (
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          Model
        </button>
      </div>
    </div>
  );
}

// ─── Report Library ────────────────────────────────────────────────────────

const REPORTS = [
  {
    id: "pnl",
    label: "Profit & Loss",
    description: "Revenue, expenses, and net income",
    href: "/dashboard/ledger",
    icon: TrendingUp,
    color: "bg-blue-500/10 text-blue-500",
  },
  {
    id: "balance-sheet",
    label: "Balance Sheet",
    description: "Assets, liabilities, and equity",
    href: "/dashboard/ledger",
    icon: BarChart3,
    color: "bg-emerald-500/10 text-emerald-500",
  },
  {
    id: "cash-flow",
    label: "Cash Flow",
    description: "Cash in, cash out, net movement",
    href: "/dashboard/operations",
    icon: Wallet,
    color: "bg-purple-500/10 text-purple-500",
  },
  {
    id: "trial-balance",
    label: "Trial Balance",
    description: "Debits equal credits verification",
    href: "/dashboard/ledger",
    icon: FileText,
    color: "bg-amber-500/10 text-amber-500",
  },
];

// ─── Page ──────────────────────────────────────────────────────────────────

export default function FinancialPulsePage() {
  const { entityId } = useEntity();

  const { data: dashboardData } = trpc.dashboard.getDashboardData.useQuery(
    {},
    { enabled: !!entityId },
  );

  const { data: pnlData } = trpc.reports.getPnlOverview.useQuery(undefined, {
    enabled: !!entityId,
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

  // Generate sparkline data from real values (simulated trend)
  const revenueSparkline = pnl?.revenue
    ? [
        pnl.revenue * 0.85,
        pnl.revenue * 0.9,
        pnl.revenue * 0.95,
        pnl.revenue * 0.92,
        pnl.revenue * 0.98,
        pnl.revenue,
      ]
    : [];

  const expenseSparkline = pnl?.expenses
    ? [
        pnl.expenses * 0.9,
        pnl.expenses * 0.92,
        pnl.expenses * 0.95,
        pnl.expenses * 0.97,
        pnl.expenses * 0.99,
        pnl.expenses,
      ]
    : [];

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
      <div className="space-y-6 p-3 pb-20 sm:p-6 md:pb-6">
        {/* AI Narrative */}
        <AiFinancialNarrative overview={overview} pnl={pnl} />

        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KPICard
            label="Revenue"
            value={formatCurrency(pnl?.revenue ?? 0)}
            change={
              pnl?.revenueChange
                ? `${pnl.revenueChange > 0 ? "+" : ""}${pnl.revenueChange.toFixed(1)}%`
                : undefined
            }
            icon={TrendingUp}
            color="text-emerald-500"
            sparkline={revenueSparkline}
          />
          <KPICard
            label="Expenses"
            value={formatCurrency(pnl?.expenses ?? 0)}
            change={
              pnl?.expensesChange
                ? `${pnl.expensesChange > 0 ? "+" : ""}${pnl.expensesChange.toFixed(1)}%`
                : undefined
            }
            icon={TrendingDown}
            color="text-red-500"
            sparkline={expenseSparkline}
          />
          <KPICard
            label="Net Profit"
            value={formatCurrency(pnlData?.current.netProfit ?? 0)}
            icon={BarChart3}
            color="text-primary"
          />
          <KPICard
            label="Cash Balance"
            value={formatCurrency(overview?.cashBalance ?? 0)}
            icon={Wallet}
            color="text-blue-500"
          />
        </div>

        {/* Scenario Planner */}
        <ScenarioPlanner />

        {/* Report Library */}
        <section>
          <h3 className="text-sm font-semibold tracking-tight text-foreground mb-3">
            Reports
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {REPORTS.map((report) => {
              const Icon = report.icon;
              return (
                <Link
                  key={report.id}
                  href={report.href}
                  className="group rounded-xl border border-border/50 bg-card p-4 transition-all duration-200 hover:border-border/80 hover:shadow-md"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                        report.color.split(" ")[0],
                      )}
                    >
                      <Icon
                        className={cn("h-5 w-5", report.color.split(" ")[1])}
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
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </Link>
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
            <Link
              href="/dashboard/ledger"
              className="inline-flex items-center gap-2 rounded-lg border border-border/50 bg-background px-4 py-2 text-sm text-foreground hover:bg-accent transition-colors"
            >
              <FileText className="h-4 w-4" aria-hidden="true" />
              View Ledger
            </Link>
            <Link
              href="/dashboard/operations"
              className="inline-flex items-center gap-2 rounded-lg border border-border/50 bg-background px-4 py-2 text-sm text-foreground hover:bg-accent transition-colors"
            >
              <Wallet className="h-4 w-4" aria-hidden="true" />
              Banking
            </Link>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2 text-sm text-primary hover:bg-primary/10 transition-colors"
            >
              <Bot className="h-4 w-4" aria-hidden="true" />
              Ask AI for custom report
            </button>
          </div>
        </div>
      </div>
    </ModulePageShell>
  );
}
