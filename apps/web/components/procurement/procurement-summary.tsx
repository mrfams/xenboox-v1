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

type ProcurementMetric = {
  id: string;
  label: string;
  value: string;
  status: "healthy" | "warning" | "critical";
  icon: typeof DollarSign;
};

type ProcurementSummaryData = {
  greeting: string;
  paymentHealth: string;
  outstandingBills: string;
  dueThisWeek: string;
  earlyPaymentDiscounts: string;
  supplierRisk: string;
  billsDueToday: string;
  avgPaymentTime: string;
  largestSupplier: string;
  cashImpact: string;
  metrics: ProcurementMetric[];
};

type ProcurementSummaryProps = {
  data?: ProcurementSummaryData;
  className?: string;
};

const DEFAULT_DATA: ProcurementSummaryData = {
  greeting: "Your AI Procurement Manager reviewed your obligations.",
  paymentHealth: "Healthy",
  outstandingBills: "$386,420",
  dueThisWeek: "$104,000",
  earlyPaymentDiscounts: "$8,420 Available",
  supplierRisk: "Low",
  billsDueToday: "$18,200",
  avgPaymentTime: "27 days",
  largestSupplier: "Global Logistics",
  cashImpact: "Moderate",
  metrics: [
    {
      id: "m1",
      label: "Outstanding Bills",
      value: "$386,420",
      status: "healthy",
      icon: DollarSign,
    },
    {
      id: "m2",
      label: "Due This Week",
      value: "$104,000",
      status: "warning",
      icon: TrendingUp,
    },
    {
      id: "m3",
      label: "Early Payment Discounts",
      value: "$8,420",
      status: "healthy",
      icon: TrendingDown,
    },
    {
      id: "m4",
      label: "Supplier Risk",
      value: "Low",
      status: "healthy",
      icon: Minus,
    },
  ],
};

export function ProcurementSummary({
  data = DEFAULT_DATA,
  className,
}: ProcurementSummaryProps) {
  return (
    <div className={cn("space-y-5", className)}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
        <RefreshCw className="h-3 w-3" />
        <span>{data.greeting}</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          {
            label: "Bills Due Today",
            value: data.billsDueToday,
            color: "text-attention-amber",
          },
          {
            label: "Bills Due This Week",
            value: data.dueThisWeek,
            color: "text-attention-amber",
          },
          {
            label: "Available Discounts",
            value: data.earlyPaymentDiscounts,
            color: "text-balanced-green",
          },
          {
            label: "Avg Payment Time",
            value: data.avgPaymentTime,
            color: "text-muted-foreground",
          },
          {
            label: "Largest Supplier",
            value: data.largestSupplier,
            color: "text-signal-indigo",
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

      <div className="flex flex-wrap items-center gap-2 px-1">
        {[
          {
            label: "Payment Health",
            value: data.paymentHealth,
            color:
              "text-balanced-green bg-balanced-green/10 border-balanced-green/20",
          },
          {
            label: "Cash Impact",
            value: data.cashImpact,
            color:
              "text-signal-indigo bg-signal-indigo/10 border-signal-indigo/20",
          },
          {
            label: "Supplier Risk",
            value: data.supplierRisk,
            color:
              "text-balanced-green bg-balanced-green/10 border-balanced-green/20",
          },
          {
            label: "Discounts Available",
            value: data.earlyPaymentDiscounts,
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
