"use client";

import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, ArrowRight } from "lucide-react";

type PerformanceMetric = {
  id: string;
  label: string;
  value: string;
  change: string;
  direction: "up" | "down" | "flat";
};

type IntelligencePerformanceOverviewProps = {
  metrics?: PerformanceMetric[];
  className?: string;
};

const DEFAULT_METRICS: PerformanceMetric[] = [
  {
    id: "pm1",
    label: "Revenue",
    value: "$842,000",
    change: "+18%",
    direction: "up",
  },
  {
    id: "pm2",
    label: "Gross Profit",
    value: "$286,000",
    change: "+12%",
    direction: "up",
  },
  {
    id: "pm3",
    label: "Net Profit",
    value: "$94,000",
    change: "-4%",
    direction: "down",
  },
  {
    id: "pm4",
    label: "Cash Conversion",
    value: "87%",
    change: "+3%",
    direction: "up",
  },
  {
    id: "pm5",
    label: "Runway",
    value: "14 months",
    change: "Stable",
    direction: "flat",
  },
];

export function IntelligencePerformanceOverview({
  metrics = DEFAULT_METRICS,
  className,
}: IntelligencePerformanceOverviewProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center gap-2 px-1">
        <TrendingUp className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
          Financial Health
        </h3>
      </div>

      <div className="space-y-1">
        {metrics.map((metric) => {
          const DirectionIcon =
            metric.direction === "up"
              ? TrendingUp
              : metric.direction === "down"
                ? TrendingDown
                : Minus;
          const changeColor =
            metric.direction === "up"
              ? "text-balanced-green"
              : metric.direction === "down"
                ? "text-error-clay"
                : "text-muted-foreground";
          return (
            <div
              key={metric.id}
              className="group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all hover:bg-muted/30"
            >
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg",
                  metric.direction === "up"
                    ? "bg-balanced-green/10"
                    : metric.direction === "down"
                      ? "bg-error-clay/10"
                      : "bg-muted/30",
                )}
              >
                <DirectionIcon className={cn("h-4 w-4", changeColor)} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground/80">
                    {metric.label}
                  </span>
                  <span className="text-xs font-bold tabular-nums">
                    {metric.value}
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className={cn("text-[10px] font-medium", changeColor)}>
                    {metric.direction === "up"
                      ? "↑"
                      : metric.direction === "down"
                        ? "↓"
                        : "→"}{" "}
                    {metric.change}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {["Explain", "Compare", "Forecast", "Improve"].map((action) => (
                  <button
                    key={action}
                    type="button"
                    className="rounded-md px-1.5 py-0.5 text-[9px] font-medium text-signal-indigo hover:bg-signal-indigo/10 transition-colors"
                  >
                    {action}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
