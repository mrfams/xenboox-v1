"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Minus,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";

type TreasuryMetric = {
  id: string;
  label: string;
  value: string;
  status: "healthy" | "warning" | "critical";
  icon: typeof DollarSign;
};

type TreasurySummaryData = {
  greeting: string;
  cash: string;
  liquidity: string;
  forecast: string;
  payrollStatus: string;
  taxStatus: string;
  bankSyncStatus: string;
  lastReviewed: string;
  metrics: TreasuryMetric[];
};

type MoneyTreasurySummaryProps = {
  data?: TreasurySummaryData;
  className?: string;
};

const DEFAULT_DATA: TreasurySummaryData = {
  greeting: "Good afternoon. Here's today's treasury briefing.",
  cash: "$1,842,340",
  liquidity: "Very Strong",
  forecast: "Positive",
  payrollStatus: "Fully Funded",
  taxStatus: "Covered",
  bankSyncStatus: "All Accounts Updated",
  lastReviewed: "3 minutes ago",
  metrics: [
    {
      id: "m1",
      label: "Available Cash",
      value: "$1,842,340",
      status: "healthy",
      icon: DollarSign,
    },
    {
      id: "m2",
      label: "Expected Inflows Today",
      value: "$84,200",
      status: "healthy",
      icon: TrendingUp,
    },
    {
      id: "m3",
      label: "Expected Outflows",
      value: "$42,900",
      status: "warning",
      icon: TrendingDown,
    },
    {
      id: "m4",
      label: "Net Position",
      value: "+$41,300",
      status: "healthy",
      icon: Minus,
    },
  ],
};

export function MoneyTreasurySummary({
  data = DEFAULT_DATA,
  className,
}: MoneyTreasurySummaryProps) {
  const timeOfDay = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "morning";
    if (hour < 17) return "afternoon";
    return "evening";
  }, []);

  return (
    <div className={cn("space-y-5", className)}>
      {/* Greeting */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
          <RefreshCw className="h-3 w-3" />
          <span>
            Your AI Treasury Manager reviewed your cash position{" "}
            {data.lastReviewed}
          </span>
        </div>
      </div>

      {/* Hero metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {data.metrics.map((metric) => {
          const Icon = metric.icon;
          const isUp = metric.id === "m2" || metric.id === "m4";
          return (
            <div
              key={metric.id}
              className={cn(
                "rounded-xl border bg-card p-4 transition-all duration-200 hover:shadow-sm",
                metric.status === "healthy" && "border-balanced-green/20",
                metric.status === "warning" && "border-attention-amber/20",
                metric.status === "critical" && "border-error-clay/20",
              )}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  {metric.label}
                </span>
                <div
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-md",
                    isUp
                      ? "bg-balanced-green/10 text-balanced-green"
                      : "bg-attention-amber/10 text-attention-amber",
                  )}
                >
                  <Icon className="h-3 w-3" />
                </div>
              </div>
              <p className="text-lg font-bold tabular-nums">{metric.value}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <span
                  className={cn(
                    "inline-flex h-1.5 w-1.5 rounded-full",
                    metric.status === "healthy" && "bg-balanced-green",
                    metric.status === "warning" && "bg-attention-amber",
                    metric.status === "critical" && "bg-error-clay",
                  )}
                />
                <span
                  className={cn(
                    "text-[10px] font-medium capitalize",
                    metric.status === "healthy" && "text-balanced-green",
                    metric.status === "warning" && "text-attention-amber",
                    metric.status === "critical" && "text-error-clay",
                  )}
                >
                  {metric.status}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Status badges row */}
      <div className="flex flex-wrap items-center gap-2 px-1">
        {[
          {
            label: "Liquidity",
            value: data.liquidity,
            color:
              "text-balanced-green bg-balanced-green/10 border-balanced-green/20",
          },
          {
            label: "Forecast",
            value: data.forecast,
            color:
              "text-balanced-green bg-balanced-green/10 border-balanced-green/20",
          },
          {
            label: "Payroll",
            value: data.payrollStatus,
            color:
              "text-balanced-green bg-balanced-green/10 border-balanced-green/20",
          },
          {
            label: "Tax",
            value: data.taxStatus,
            color:
              "text-signal-indigo bg-signal-indigo/10 border-signal-indigo/20",
          },
          {
            label: "Bank Sync",
            value: data.bankSyncStatus,
            color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
          },
        ].map((badge) => (
          <div
            key={badge.label}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10px] font-medium",
              badge.color,
            )}
          >
            <ShieldCheck className="h-3 w-3" />
            <span>{badge.label}</span>
            <span className="opacity-60">·</span>
            <span>{badge.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
