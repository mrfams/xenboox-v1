"use client";

import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import { Brain, CalendarDays } from "lucide-react";

type ForecastDay = {
  id: string;
  label: string;
  amount: number;
  date: string;
};

type RevenueCollectionsForecastProps = {
  days?: ForecastDay[];
  confidence?: number;
  aiSummary?: string;
  className?: string;
};

const DEFAULT_DAYS: ForecastDay[] = [
  { id: "fd1", label: "Today", amount: 12400, date: "Jun 17" },
  { id: "fd2", label: "Tomorrow", amount: 8200, date: "Jun 18" },
  { id: "fd3", label: "This Week", amount: 126000, date: "Jun 17-23" },
  { id: "fd4", label: "This Month", amount: 482000, date: "June" },
];

export function RevenueCollectionsForecast({
  days = DEFAULT_DAYS,
  confidence = 0.92,
  aiSummary = "Collections remain healthy. Largest expected payment: Acme Holdings, Friday.",
  className,
}: RevenueCollectionsForecastProps) {
  const maxAmount = Math.max(...days.map((d) => d.amount));

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center gap-2 px-1">
        <CalendarDays className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
          Collections Forecast
        </h3>
      </div>

      {/* Forecast bars */}
      <div className="space-y-2">
        {days.map((day) => (
          <div key={day.id} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground/70">{day.label}</span>
              <span className="font-bold tabular-nums">
                {formatCurrency(day.amount)}
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-signal-indigo to-balanced-green transition-all duration-700"
                style={{ width: `${(day.amount / maxAmount) * 100}%` }}
              />
            </div>
          </div>
        ))}
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
