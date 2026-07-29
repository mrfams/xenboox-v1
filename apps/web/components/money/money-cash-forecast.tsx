"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import { Brain, BarChart3, Download } from "lucide-react";

type ForecastPoint = {
  id: string;
  label: string;
  amount: number;
  date: string;
};

type MoneyCashForecastProps = {
  points?: ForecastPoint[];
  confidence?: number;
  aiSummary?: string;
  className?: string;
};

const DEFAULT_POINTS: ForecastPoint[] = [
  { id: "fp1", label: "Today", amount: 1842340, date: "Jun 17" },
  { id: "fp2", label: "Next Week", amount: 1770000, date: "Jun 24" },
  { id: "fp3", label: "Next Month", amount: 2010000, date: "Jul 17" },
  { id: "fp4", label: "Next Quarter", amount: 2150000, date: "Sep 17" },
];

export function MoneyCashForecast({
  points = DEFAULT_POINTS,
  confidence = 0.94,
  aiSummary = "Cash remains healthy despite payroll. Largest inflow arrives next Thursday.",
  className,
}: MoneyCashForecastProps) {
  const min = useMemo(() => Math.min(...points.map((p) => p.amount)), [points]);
  const max = useMemo(() => Math.max(...points.map((p) => p.amount)), [points]);
  const range = max - min || 1;

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
            Cash Forecast
          </h3>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-md bg-muted/50 px-2 py-1 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <Download className="h-3 w-3" />
          Export
        </button>
      </div>

      {/* Mini chart (bar-based visual) */}
      <div className="rounded-xl border bg-card p-4">
        <div className="flex items-end justify-between gap-3 h-24">
          {points.map((point) => {
            const height = ((point.amount - min) / range) * 100;
            const isUp = point.amount >= points[0]?.amount;
            return (
              <div
                key={point.id}
                className="flex flex-1 flex-col items-center gap-1.5"
              >
                <span
                  className={cn(
                    "text-[9px] font-bold tabular-nums",
                    isUp ? "text-balanced-green" : "text-attention-amber",
                  )}
                >
                  {isUp ? "↑" : "↓"}
                  {formatCurrency(point.amount)}
                </span>
                <div className="relative w-full flex justify-center">
                  <div
                    className={cn(
                      "w-full max-w-[40px] rounded-t-md transition-all duration-500",
                      isUp
                        ? "bg-gradient-to-t from-balanced-green/30 to-balanced-green/80"
                        : "bg-gradient-to-t from-attention-amber/30 to-attention-amber/80",
                    )}
                    style={{ height: `${Math.max(height, 8)}%` }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground/60">
                  {point.label}
                </span>
                <span className="text-[8px] text-muted-foreground/40">
                  {point.date}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Confidence + AI Summary */}
      <div className="rounded-xl border bg-card p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Brain className="h-3.5 w-3.5 text-signal-indigo" />
            <span className="text-[10px] font-medium text-muted-foreground uppercase">
              AI Analysis
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground/60">
              Confidence
            </span>
            <span className="text-xs font-bold tabular-nums text-balanced-green">
              {(confidence * 100).toFixed(0)}%
            </span>
          </div>
        </div>
        <p className="text-xs text-foreground/70 leading-relaxed">
          {aiSummary}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-md bg-signal-indigo/10 px-2.5 py-1 text-[10px] font-medium text-signal-indigo hover:bg-signal-indigo/20 transition-colors"
          >
            Explain
          </button>
          <button
            type="button"
            className="rounded-md bg-muted/30 px-2.5 py-1 text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            Run Scenario
          </button>
        </div>
      </div>
    </div>
  );
}
