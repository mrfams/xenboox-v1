"use client";

import { cn } from "@/lib/utils";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Minus,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";

type RevenueMetric = {
  id: string;
  label: string;
  value: string;
  status: "healthy" | "warning" | "critical";
  icon: typeof DollarSign;
};

type RevenueSummaryData = {
  greeting: string;
  collectionHealth: string;
  outstandingReceivables: string;
  expectedThisWeek: string;
  overdue: string;
  collectionConfidence: number;
  revenueTrend: string;
  collectedToday: string;
  invoicesIssued: number;
  avgCollectionTime: string;
  metrics: RevenueMetric[];
};

type RevenueSummaryProps = {
  data?: RevenueSummaryData;
  className?: string;
};

const DEFAULT_DATA: RevenueSummaryData = {
  greeting: "Your AI Credit Controller reviewed your receivables.",
  collectionHealth: "Excellent",
  outstandingReceivables: "$482,300",
  expectedThisWeek: "$126,000",
  overdue: "$31,400",
  collectionConfidence: 0.94,
  revenueTrend: "+18%",
  collectedToday: "$42,800",
  invoicesIssued: 26,
  avgCollectionTime: "24 days",
  metrics: [
    {
      id: "m1",
      label: "Outstanding Receivables",
      value: "$482,300",
      status: "healthy",
      icon: DollarSign,
    },
    {
      id: "m2",
      label: "Expected This Week",
      value: "$126,000",
      status: "healthy",
      icon: TrendingUp,
    },
    {
      id: "m3",
      label: "Overdue",
      value: "$31,400",
      status: "warning",
      icon: TrendingDown,
    },
    {
      id: "m4",
      label: "Collection Confidence",
      value: "94%",
      status: "healthy",
      icon: Minus,
    },
  ],
};

export function RevenueSummary({
  data = DEFAULT_DATA,
  className,
}: RevenueSummaryProps) {
  return (
    <div className={cn("space-y-5", className)}>
      {/* Greeting */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
        <RefreshCw className="h-3 w-3" />
        <span>{data.greeting}</span>
      </div>

      {/* Briefing strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          {
            label: "Collected Today",
            value: data.collectedToday,
            color: "text-balanced-green",
          },
          {
            label: "Invoices Issued",
            value: data.invoicesIssued.toString(),
            color: "text-signal-indigo",
          },
          {
            label: "Avg Collection Time",
            value: data.avgCollectionTime,
            color: "text-muted-foreground",
          },
          {
            label: "Overdue Balance",
            value: data.overdue,
            color: "text-attention-amber",
          },
          {
            label: "Revenue Trend",
            value: data.revenueTrend,
            color: "text-balanced-green",
          },
        ].map((item) => (
          <div key={item.label} className="rounded-lg border bg-card p-3">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              {item.label}
            </p>
            <p className={cn("text-lg font-bold mt-1", item.color)}>
              {item.value}
            </p>
          </div>
        ))}
      </div>

      {/* Hero metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {data.metrics.map((metric) => {
          const Icon = metric.icon;
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
                    metric.status === "healthy"
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

      {/* Status badges */}
      <div className="flex flex-wrap items-center gap-2 px-1">
        {[
          {
            label: "Collection Health",
            value: data.collectionHealth,
            color:
              "text-balanced-green bg-balanced-green/10 border-balanced-green/20",
          },
          {
            label: "Avg Collection Time",
            value: data.avgCollectionTime,
            color:
              "text-signal-indigo bg-signal-indigo/10 border-signal-indigo/20",
          },
          {
            label: "Confidence",
            value: `${(data.collectionConfidence * 100).toFixed(0)}%`,
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
