"use client";

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
} from "lucide-react";

import { useEntity } from "@/lib/entity-context";
import { trpc } from "@/lib/trpc/client";
import { cn, formatCurrency } from "@/lib/utils";
import { ModulePageShell } from "@/components/module/module-page-shell";

// ─── Financial Pulse ──────────────────────────────────────────────────────
//
// AI-narrated financial health. Not raw data tables.
// The AI explains what the numbers mean. Every chart has a narrative.
//
// Replaces: reports, insights, trial-balance (as a view)

// ─── AI Narrative ──────────────────────────────────────────────────────────

function AiNarrative({ data }: { data?: Record<string, unknown> }) {
  // In production, this would call the AI to generate a narrative.
  // For now, we show a static but realistic narrative.
  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/[0.03] p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold text-foreground">
              AI Financial Narrative
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-border/40 bg-muted/30 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground/50">
              Auto-generated
            </span>
          </div>
          <p className="text-sm leading-relaxed text-foreground/80">
            Loading your financial narrative...
          </p>
        </div>
      </div>
    </div>
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
  return (
    <div className="rounded-xl border border-border/50 bg-card/60 p-4 transition-all duration-200 hover:border-border/80 hover:shadow-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={cn("h-4 w-4", color)} />
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
        </div>
        {change && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold",
              change.startsWith("+")
                ? "bg-emerald-500/10 text-emerald-500"
                : "bg-red-500/10 text-red-500",
            )}
          >
            {change}
          </span>
        )}
      </div>
      <p className="mt-2 text-xl font-bold tracking-tight text-foreground">
        {value}
      </p>
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

  const { data: overview } = trpc.dashboard.getOverview.useQuery(undefined, {
    enabled: !!entityId,
  });

  const { data: pnlData } = trpc.reports.getPnlOverview.useQuery(undefined, {
    enabled: !!entityId,
  });

  return (
    <ModulePageShell
      title="Financial Pulse"
      description="AI-narrated financial health. Visual, not tabular."
      icon={Activity}
    >
      <div className="space-y-6 p-4 sm:p-6">
        {/* AI Narrative */}
        <AiNarrative />

        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KPICard
            label="Revenue"
            value={formatCurrency(pnlData?.revenue ?? 0)}
            change={
              pnlData?.revenueChange
                ? `+${pnlData.revenueChange.toFixed(1)}%`
                : undefined
            }
            icon={TrendingUp}
            color="text-emerald-500"
          />
          <KPICard
            label="Expenses"
            value={formatCurrency(pnlData?.expenses ?? 0)}
            change={
              pnlData?.expensesChange
                ? `${pnlData.expensesChange > 0 ? "+" : ""}${pnlData.expensesChange.toFixed(1)}%`
                : undefined
            }
            icon={TrendingDown}
            color="text-red-500"
          />
          <KPICard
            label="Net Profit"
            value={formatCurrency(
              (pnlData?.revenue ?? 0) - (pnlData?.expenses ?? 0),
            )}
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
              <FileText className="h-4 w-4" />
              View Ledger
            </Link>
            <Link
              href="/dashboard/operations"
              className="inline-flex items-center gap-2 rounded-lg border border-border/50 bg-background px-4 py-2 text-sm text-foreground hover:bg-accent transition-colors"
            >
              <Wallet className="h-4 w-4" />
              Banking
            </Link>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2 text-sm text-primary hover:bg-primary/10 transition-colors"
            >
              <Bot className="h-4 w-4" />
              Ask AI for custom report
            </button>
          </div>
        </div>
      </div>
    </ModulePageShell>
  );
}
