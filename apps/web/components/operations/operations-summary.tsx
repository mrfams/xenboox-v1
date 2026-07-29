"use client";

import { cn } from "@/lib/utils";
import { DollarSign, ShieldCheck, RefreshCw } from "lucide-react";

type OpsMetric = {
  id: string;
  label: string;
  value: string;
  status: "healthy" | "warning" | "critical";
};

type OperationsSummaryData = {
  greeting: string;
  operationalHealth: string;
  monthlyOperatingCost: string;
  payrollStatus: string;
  inventoryHealth: string;
  costOptimizationOpps: string;
  inventoryValue: string;
  assetsRequiringMaintenance: number;
  budgetStatusPct: number;
  costSavingsIdentified: string;
  metrics: OpsMetric[];
};

type OperationsSummaryProps = {
  data?: OperationsSummaryData;
  className?: string;
};

const DEFAULT_DATA: OperationsSummaryData = {
  greeting: "Your AI Operations Controller analyzed today's operations.",
  operationalHealth: "Excellent",
  monthlyOperatingCost: "$824,300",
  payrollStatus: "Fully Funded",
  inventoryHealth: "Healthy",
  costOptimizationOpps: "$28,400",
  inventoryValue: "$1.24M",
  assetsRequiringMaintenance: 4,
  budgetStatusPct: 96,
  costSavingsIdentified: "$28,400",
  metrics: [
    {
      id: "m1",
      label: "Monthly Operating Cost",
      value: "$824,300",
      status: "warning",
    },
    { id: "m2", label: "Payroll", value: "Fully Funded", status: "healthy" },
    {
      id: "m3",
      label: "Inventory Health",
      value: "Healthy",
      status: "healthy",
    },
    {
      id: "m4",
      label: "Cost Savings Identified",
      value: "$28,400",
      status: "healthy",
    },
  ],
};

export function OperationsSummary({
  data = DEFAULT_DATA,
  className,
}: OperationsSummaryProps) {
  return (
    <div className={cn("space-y-5", className)}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
        <RefreshCw className="h-3 w-3" />
        <span>{data.greeting}</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          {
            label: "Payroll",
            value: data.payrollStatus,
            color: "text-balanced-green",
          },
          {
            label: "Monthly Expenses",
            value: data.monthlyOperatingCost,
            color: "text-attention-amber",
          },
          {
            label: "Inventory Value",
            value: data.inventoryValue,
            color: "text-signal-indigo",
          },
          {
            label: "Assets Needing Maintenance",
            value: data.assetsRequiringMaintenance.toString(),
            color: "text-attention-amber",
          },
          {
            label: "Cost Savings",
            value: data.costSavingsIdentified,
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

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {data.metrics.map((metric) => (
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
                <DollarSign className="h-3 w-3" />
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
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 px-1">
        {[
          {
            label: "Operational Health",
            value: data.operationalHealth,
            color:
              "text-balanced-green bg-balanced-green/10 border-balanced-green/20",
          },
          {
            label: "Budget Status",
            value: `${data.budgetStatusPct}%`,
            color:
              "text-signal-indigo bg-signal-indigo/10 border-signal-indigo/20",
          },
          {
            label: "Cost Savings",
            value: data.costSavingsIdentified,
            color:
              "text-attention-amber bg-attention-amber/10 border-attention-amber/20",
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
