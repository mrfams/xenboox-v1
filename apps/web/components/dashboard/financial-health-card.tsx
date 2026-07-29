"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Info,
  Wallet,
  DollarSign,
  PieChart,
  Flame,
  Clock,
  CreditCard,
} from "lucide-react";

type MetricStatus = "healthy" | "warning" | "critical";

type KPIMetric = {
  id: string;
  label: string;
  value: number;
  currency?: string;
  format?: "currency" | "percentage" | "number" | "months";
  change?: number;
  status: MetricStatus;
  icon: typeof Wallet;
  explanation?: string;
};

type FinancialHealthCardProps = {
  metrics: KPIMetric[];
  className?: string;
};

const STATUS_STYLES: Record<
  MetricStatus,
  { dot: string; bg: string; text: string; label: string }
> = {
  healthy: {
    dot: "bg-balanced-green",
    bg: "bg-balanced-green-bg",
    text: "text-balanced-green",
    label: "Healthy",
  },
  warning: {
    dot: "bg-attention-amber",
    bg: "bg-attention-amber-bg",
    text: "text-attention-amber",
    label: "Needs review",
  },
  critical: {
    dot: "bg-error-clay",
    bg: "bg-error-clay-bg",
    text: "text-error-clay",
    label: "Needs attention",
  },
};

function TrendIndicator({ change }: { change: number }) {
  if (change > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-balanced-green">
        <TrendingUp className="h-3 w-3" />+{change}%
      </span>
    );
  }
  if (change < 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-error-clay">
        <TrendingDown className="h-3 w-3" />
        {change}%
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-xs font-medium text-muted-foreground">
      <Minus className="h-3 w-3" />
      0%
    </span>
  );
}

function formatValue(metric: KPIMetric): string {
  if (metric.format === "currency")
    return formatCurrency(metric.value, metric.currency);
  if (metric.format === "percentage") return `${metric.value}%`;
  if (metric.format === "months") return `${metric.value} months`;
  return metric.value.toLocaleString();
}

function MetricCard({
  metric,
  onExplain,
}: {
  metric: KPIMetric;
  onExplain: (id: string) => void;
}) {
  const styles = STATUS_STYLES[metric.status];
  const Icon = metric.icon;

  return (
    <div className="group relative rounded-xl border bg-card p-4 transition-all duration-200 hover:shadow-md hover:border-muted/40">
      <div className="flex items-start justify-between mb-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/50 group-hover:bg-muted/70 transition-colors">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <button
          type="button"
          onClick={() => onExplain(metric.id)}
          className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground/40 opacity-0 transition-all duration-200 hover:bg-muted hover:text-foreground group-hover:opacity-100"
          title={`Explain ${metric.label}`}
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </div>

      <p className="text-xs font-medium text-muted-foreground mb-0.5">
        {metric.label}
      </p>

      <div className="text-xl font-bold tracking-tight tabular-nums">
        {formatValue(metric)}
      </div>

      <div className="mt-1.5 flex items-center gap-2">
        {metric.change != null && <TrendIndicator change={metric.change} />}
        <span
          className={cn(
            "flex items-center gap-1 text-[10px] font-medium",
            styles.text,
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", styles.dot)} />
          {styles.label}
        </span>
      </div>
    </div>
  );
}

export function FinancialHealthCard({
  metrics,
  className,
}: FinancialHealthCardProps) {
  const [explainingId, setExplainingId] = useState<string | null>(null);

  const handleExplain = (id: string) => {
    setExplainingId(explainingId === id ? null : id);
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">
          Financial Health
        </h2>
        <span className="text-[10px] text-muted-foreground/60 tabular-nums">
          {metrics.filter((m) => m.status === "healthy").length}/
          {metrics.length} healthy
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {metrics.map((metric) => (
          <MetricCard
            key={metric.id}
            metric={metric}
            onExplain={handleExplain}
          />
        ))}
      </div>

      {/* AI Explanation Panel */}
      {explainingId && (
        <div className="rounded-xl border bg-gradient-to-r from-signal-indigo/5 via-purple-500/5 to-signal-indigo/5 p-4 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1 duration-300">
          <div className="flex items-start gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-signal-indigo/10">
              <Info className="h-3.5 w-3.5 text-signal-indigo" />
            </div>
            <div className="flex-1 text-sm">
              <p className="font-medium text-foreground mb-1">
                {metrics.find((m) => m.id === explainingId)?.label}
              </p>
              <p className="text-muted-foreground text-xs leading-relaxed">
                {metrics.find((m) => m.id === explainingId)?.explanation ??
                  "AI analysis is being prepared. This will show a natural language explanation of what's driving this metric and any actions you should consider."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setExplainingId(null)}
              className="text-xs text-muted-foreground/60 hover:text-foreground transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Default Metrics Factory ──────────────────────────────────────────────

export function createDefaultMetrics(data?: {
  cashAvailable?: number;
  revenue?: number;
  profit?: number;
  burnRate?: number;
  runwayMonths?: number;
  receivables?: number;
}): KPIMetric[] {
  const d = data ?? {};
  return [
    {
      id: "cash",
      label: "Cash Available",
      value: d.cashAvailable ?? 184300,
      format: "currency",
      change: 8,
      status: "healthy",
      icon: Wallet,
      explanation:
        "Cash available across all bank accounts and mobile money wallets. Up 8% from last month due to improved collections. Current ratio is 2.3x — well above the 1.5x threshold for healthy liquidity.",
    },
    {
      id: "revenue",
      label: "Monthly Revenue",
      value: d.revenue ?? 142000,
      format: "currency",
      change: 12,
      status: "healthy",
      icon: DollarSign,
      explanation:
        "Revenue grew 12% month-over-month, driven by a 15% increase in customer volume. Average transaction value held steady at GMD 4,200.",
    },
    {
      id: "profit",
      label: "Net Profit",
      value: d.profit ?? 18,
      format: "percentage",
      change: -3,
      status: "warning",
      icon: PieChart,
      explanation:
        "Net profit margin declined 3 percentage points due to increased COGS from supplier price increases. Consider renegotiating with key suppliers or adjusting pricing.",
    },
    {
      id: "burn",
      label: "Burn Rate",
      value: d.burnRate ?? 14200,
      format: "currency",
      status: "healthy",
      icon: Flame,
      explanation:
        "Monthly operating expenses total GMD 14,200. This is within the 60% of revenue threshold (currently at 58%). No immediate action needed.",
    },
    {
      id: "runway",
      label: "Runway",
      value: d.runwayMonths ?? 13,
      format: "months",
      status: "healthy",
      icon: Clock,
      explanation:
        "At current burn rate, you have 13 months of runway. This provides a comfortable buffer for strategic investments.",
    },
    {
      id: "receivables",
      label: "Outstanding AR",
      value: d.receivables ?? 78500,
      format: "currency",
      change: 15,
      status: "warning",
      icon: CreditCard,
      explanation:
        "Outstanding receivables increased 15% to GMD 78,500. 4 invoices are overdue by more than 30 days. Consider sending payment reminders or reviewing credit terms.",
    },
  ];
}
