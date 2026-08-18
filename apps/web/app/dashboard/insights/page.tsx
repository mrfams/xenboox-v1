"use client";

import Link from "next/link";
import {
  BarChart3,
  FileText,
  TrendingUp,
  Users,
  Building2,
  BookOpen,
  Calendar,
  Package,
  ArrowRight,
  PieChart,
  Activity,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
} from "lucide-react";

import { useState } from "react";

import { useEntity } from "@/lib/entity-context";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { AiSimulationTrigger } from "@/components/ai-ux/simulation-trigger";
import { runwayTone, runwayStatusLabel } from "@/lib/dashboard-runway";

const insightSections = [
  {
    id: "reports",
    label: "Reports",
    description: "Financial statements, P&L, balance sheet, and custom reports",
    href: "/dashboard/reports",
    icon: BarChart3,
    color: "bg-blue-100 text-blue-600",
  },
  {
    id: "journal",
    label: "General Ledger",
    description: "Journal entries, chart of accounts, and accounting records",
    href: "/dashboard/journal",
    icon: BookOpen,
    color: "bg-emerald-100 text-emerald-600",
  },
  {
    id: "customers",
    label: "Customers",
    description: "Customer analytics, aging reports, and receivables",
    href: "/dashboard/customers",
    icon: Users,
    color: "bg-violet-100 text-violet-600",
  },
  {
    id: "vendors",
    label: "Vendors",
    description: "Vendor analytics, aging reports, and payables",
    href: "/dashboard/vendors",
    icon: Users,
    color: "bg-amber-100 text-amber-600",
  },
  {
    id: "documents",
    label: "Documents",
    description: "Financial documents, invoices, and receipts",
    href: "/dashboard/documents",
    icon: FileText,
    color: "bg-rose-100 text-rose-600",
  },
  {
    id: "close",
    label: "Close Center",
    description: "Month-end close checklists and period management",
    href: "/dashboard/close",
    icon: Calendar,
    color: "bg-cyan-100 text-cyan-600",
  },
  {
    id: "fixed-assets",
    label: "Fixed Assets",
    description: "Asset register, depreciation, and disposal",
    href: "/dashboard/fixed-assets",
    icon: Building2,
    color: "bg-indigo-100 text-indigo-600",
  },
  {
    id: "inventory",
    label: "Inventory",
    description: "Stock levels, valuation, and movements",
    href: "/dashboard/inventory",
    icon: Package,
    color: "bg-orange-100 text-orange-600",
  },
];

function ScenarioPlanner() {
  const { data } = trpc.dashboard.getScenarioData.useQuery();
  const [revenueGrowth, setRevenueGrowth] = useState(0); // %
  const [expenseCut, setExpenseCut] = useState(0); // %
  const [months, setMonths] = useState(6);

  const cash = data?.cashBalance ?? 0;
  const burn = data?.avgMonthlyBurn ?? 0;
  const revenues = data?.monthlyRevenues ?? [];
  const expenses = data?.monthlyExpenses ?? [];

  const avgRevenue = revenues.length
    ? revenues.reduce((s, v) => s + v, 0) / revenues.length
    : 0;
  const avgExpense = expenses.length
    ? expenses.reduce((s, v) => s + v, 0) / expenses.length
    : 0;

  // Projected burn under the assumptions: expenses cut by X%, revenue grows
  // by Y% → net burn = expense' − revenue'.
  const projectedExpense = avgExpense * (1 - expenseCut / 100);
  const projectedRevenue = avgRevenue * (1 + revenueGrowth / 100);
  const projectedBurn = projectedExpense - projectedRevenue;
  const projectedRunway = projectedBurn > 0 ? cash / projectedBurn : null;

  const tone = runwayTone(projectedRunway);
  const label = runwayStatusLabel(projectedRunway);

  // Cash projection curve across the selected horizon.
  const projection: Array<{ month: number; cash: number }> = [];
  let running = cash;
  for (let m = 1; m <= months; m++) {
    running -= projectedBurn;
    projection.push({ month: m, cash: Math.max(0, running) });
  }
  const maxCash = Math.max(cash, ...projection.map((p) => p.cash), 1);
  const currentRunway = burn > 0 ? cash / burn : null;

  const toneStyles: Record<string, string> = {
    positive: "bg-emerald-50 text-emerald-700 border-emerald-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    negative: "bg-rose-50 text-rose-700 border-rose-200",
  };

  return (
    <div className="rounded-xl border border-border/50 bg-card p-6">
      <div className="mb-4 flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">
          Scenario planning
        </h3>
        <span className="text-[11px] text-muted-foreground">
          What-if projections on your real cash position
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        {/* Controls */}
        <div className="space-y-5">
          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">
                Revenue growth
              </span>
              <span className="font-semibold text-primary">
                {revenueGrowth > 0 ? "+" : ""}
                {revenueGrowth}%
              </span>
            </div>
            <input
              type="range"
              min={-20}
              max={50}
              value={revenueGrowth}
              onChange={(e) => setRevenueGrowth(Number(e.target.value))}
              className="w-full accent-indigo-600"
            />
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">
                Expense reduction
              </span>
              <span className="font-semibold text-primary">{expenseCut}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={50}
              value={expenseCut}
              onChange={(e) => setExpenseCut(Number(e.target.value))}
              className="w-full accent-indigo-600"
            />
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">Horizon</span>
              <span className="font-semibold text-primary">
                {months} months
              </span>
            </div>
            <input
              type="range"
              min={3}
              max={12}
              value={months}
              onChange={(e) => setMonths(Number(e.target.value))}
              className="w-full accent-indigo-600"
            />
          </div>

          <div className={`rounded-lg border px-4 py-3 ${toneStyles[tone]}`}>
            <p className="text-[11px] font-semibold uppercase tracking-wider opacity-80">
              Projected runway
            </p>
            <p className="mt-0.5 text-2xl font-bold">
              {projectedRunway === null
                ? "Sustainable"
                : `${projectedRunway.toFixed(1)} months`}
            </p>
            <p className="mt-1 text-[11px] opacity-80">
              {label}
              {currentRunway !== null &&
                projectedRunway !== null &&
                ` · currently ${currentRunway.toFixed(1)} months`}
            </p>
          </div>
        </div>

        {/* Projection chart */}
        <div>
          <div className="flex h-48 items-end gap-1 rounded-lg border border-border/50 bg-background p-3">
            {projection.map((p) => (
              <div
                key={p.month}
                className="flex flex-1 flex-col items-center gap-1"
              >
                <div
                  className={cn(
                    "w-full rounded-t",
                    p.cash <= 0
                      ? "bg-rose-400"
                      : p.cash < cash / 2
                        ? "bg-amber-400"
                        : "bg-primary/70",
                  )}
                  style={{
                    height: `${Math.max(2, (p.cash / maxCash) * 100)}%`,
                  }}
                  title={`Month ${p.month}: GMD ${p.cash.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                />
                <span className="text-[9px] text-muted-foreground">
                  M{p.month}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-sm bg-primary/70" /> Cash on hand
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-sm bg-amber-400" /> Below half
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-sm bg-rose-400" /> Depleted
            </span>
          </div>
          <p className="mt-3 text-[11px] leading-4 text-muted-foreground">
            Baseline: GMD{" "}
            {cash.toLocaleString(undefined, { maximumFractionDigits: 0 })} cash
            · GMD{" "}
            {Math.abs(burn).toLocaleString(undefined, {
              maximumFractionDigits: 0,
            })}{" "}
            {burn >= 0 ? "net burn" : "net income"} / month (3-mo average).
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Anomaly Detection Card ────────────────────────────────────────────────
// Surfaces deterministic GL outlier signals (unbalanced entries, statistical
// outliers, duplicates, round amounts, low-confidence postings) computed from
// the entity's own ledger. Same engine as the Journal page's Unusual Activity
// panel — this is the cross-module "anomaly & outlier detection" surface.

function AnomalyDetectionCard() {
  const { data, isLoading } = trpc.journal.getOutlierSignals.useQuery({});

  return (
    <div className="rounded-xl border border-border/50 bg-card p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-amber-500" />
          <h3 className="text-sm font-semibold text-foreground">
            Anomaly &amp; Outlier Detection
          </h3>
        </div>
        <Link
          href="/dashboard/journal"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          Review in Journal <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <div className="h-3 w-full animate-pulse rounded bg-muted" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
        </div>
      ) : !data || data.signals.length === 0 ? (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <p className="text-sm text-emerald-700">
            No anomalies detected in the last 90 days of posted entries.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {data.signals.slice(0, 4).map((signal) => (
            <div
              key={signal.id}
              className={cn(
                "flex items-start gap-3 rounded-lg border px-3 py-2.5",
                signal.severity === "high"
                  ? "border-red-200 bg-red-50"
                  : signal.severity === "medium"
                    ? "border-amber-200 bg-amber-50"
                    : "border-border/50 bg-muted/30",
              )}
            >
              <AlertTriangle
                className={cn(
                  "mt-0.5 h-4 w-4 shrink-0",
                  signal.severity === "high"
                    ? "text-red-600"
                    : signal.severity === "medium"
                      ? "text-amber-600"
                      : "text-muted-foreground",
                )}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">
                  {signal.title}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {signal.description}
                </p>
              </div>
            </div>
          ))}
          {data.signals.length > 4 && (
            <p className="pt-1 text-center text-[11px] text-muted-foreground">
              +{data.signals.length - 4} more — see the Journal page for the
              full list
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function InsightsPage() {
  const { entityId } = useEntity();

  // Fetch financial insights
  const { data: insightsData } = trpc.aiWorkspace.getFinancialInsights.useQuery(
    undefined,
    { enabled: !!entityId },
  );

  const insights = insightsData?.insights ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Insights
          </h1>
          <p className="text-sm text-muted-foreground">
            Financial analytics, reports, and business intelligence.
          </p>
        </div>
        <AiSimulationTrigger
          traceId="insight-generation"
          label="AI Generate Insights"
          variant="outline"
        />
      </div>

      {/* Scenario Planning */}
      <ScenarioPlanner />

      {/* Anomaly Detection — deterministic GL outlier signals */}
      <AnomalyDetectionCard />

      {/* AI-Generated Insights */}
      {insights.length > 0 && (
        <div className="rounded-xl border border-border/50 bg-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">
              AI Insights
            </h3>
            <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Live
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {insights.map((insight) => (
              <div
                key={insight.id}
                className="flex items-start gap-3 rounded-lg border border-border/50 bg-background p-4"
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                    insight.type === "positive"
                      ? "bg-emerald-100"
                      : insight.type === "negative"
                        ? "bg-rose-100"
                        : "bg-primary/10"
                  }`}
                >
                  {insight.type === "positive" ? (
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                  ) : insight.type === "negative" ? (
                    <TrendingUp className="h-4 w-4 text-rose-600 rotate-180" />
                  ) : (
                    <PieChart className="h-4 w-4 text-primary" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {insight.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {insight.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Insight Sections */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {insightSections.map((section) => (
          <div key={section.id}>
            <Link
              href={section.href}
              className="group rounded-xl border border-border/50 bg-card p-5 hover:shadow-md transition-all duration-200 block"
            >
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${section.color}`}
                >
                  <section.icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                    {section.label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {section.description}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Link>
          </div>
        ))}
      </div>

      {/* Quick Access */}
      <div className="rounded-xl border border-border/50 bg-card p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">
          Quick Access
        </h3>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/reports"
            className="inline-flex items-center gap-2 rounded-lg border border-border/50 bg-background px-4 py-2 text-sm text-foreground hover:bg-accent transition-colors"
          >
            <BarChart3 className="h-4 w-4" />
            View Reports
          </Link>
          <Link
            href="/dashboard/journal"
            className="inline-flex items-center gap-2 rounded-lg border border-border/50 bg-background px-4 py-2 text-sm text-foreground hover:bg-accent transition-colors"
          >
            <BookOpen className="h-4 w-4" />
            General Ledger
          </Link>
          <Link
            href="/dashboard/close"
            className="inline-flex items-center gap-2 rounded-lg border border-border/50 bg-background px-4 py-2 text-sm text-foreground hover:bg-accent transition-colors"
          >
            <Calendar className="h-4 w-4" />
            Close Books
          </Link>
          <Link
            href="/dashboard/documents"
            className="inline-flex items-center gap-2 rounded-lg border border-border/50 bg-background px-4 py-2 text-sm text-foreground hover:bg-accent transition-colors"
          >
            <FileText className="h-4 w-4" />
            Documents
          </Link>
        </div>
      </div>
    </div>
  );
}
