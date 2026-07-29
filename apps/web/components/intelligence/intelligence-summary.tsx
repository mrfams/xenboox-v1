"use client";

import { cn } from "@/lib/utils";
import { ShieldCheck, RefreshCw } from "lucide-react";

type IntelligenceSummaryProps = {
  businessHealth?: string;
  revenueGrowth?: string;
  margin?: string;
  forecastAccuracy?: string;
  opportunitiesFound?: number;
  className?: string;
};

export function IntelligenceSummary({
  businessHealth = "Strong",
  revenueGrowth = "+18%",
  margin = "34%",
  forecastAccuracy = "96%",
  opportunitiesFound = 12,
  className,
}: IntelligenceSummaryProps) {
  return (
    <div className={cn("space-y-5", className)}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
        <RefreshCw className="h-3 w-3" />
        <span>Your AI Financial Analyst reviewed your business.</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          {
            label: "Business Health",
            value: businessHealth,
            color: "text-balanced-green",
          },
          {
            label: "Revenue Growth",
            value: revenueGrowth,
            color: "text-balanced-green",
          },
          { label: "Margin", value: margin, color: "text-signal-indigo" },
          {
            label: "Forecast Accuracy",
            value: forecastAccuracy,
            color: "text-balanced-green",
          },
          {
            label: "Opportunities Found",
            value: opportunitiesFound.toString(),
            color: "text-attention-amber",
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

      <div className="flex flex-wrap items-center gap-2 px-1">
        {[
          {
            label: "Business Health",
            value: businessHealth,
            color:
              "text-balanced-green bg-balanced-green/10 border-balanced-green/20",
          },
          {
            label: "Forecast Accuracy",
            value: forecastAccuracy,
            color:
              "text-signal-indigo bg-signal-indigo/10 border-signal-indigo/20",
          },
          {
            label: "Opportunities",
            value: `${opportunitiesFound} found`,
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
