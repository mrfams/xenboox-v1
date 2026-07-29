"use client";

import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import { Brain, TrendingUp, ArrowRight } from "lucide-react";

type ForecastItem = {
  id: string;
  label: string;
  amount: number;
  confidence: number;
};

type IntelligenceForecastCenterProps = {
  items?: ForecastItem[];
  aiPrediction?: string;
  className?: string;
};

const DEFAULT_ITEMS: ForecastItem[] = [
  { id: "fc1", label: "Revenue", amount: 910000, confidence: 0.91 },
  { id: "fc2", label: "Expenses", amount: 620000, confidence: 0.94 },
  { id: "fc3", label: "Expected Profit", amount: 126000, confidence: 0.88 },
];

export function IntelligenceForecastCenter({
  items = DEFAULT_ITEMS,
  aiPrediction = "Profitability should improve if current trends continue. Revenue growth is outpacing expense growth.",
  className,
}: IntelligenceForecastCenterProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center gap-2 px-1">
        <TrendingUp className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
          Forecast — Next Month
        </h3>
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-foreground/80">{item.label}</span>
              <div className="flex items-center gap-2">
                <span className="font-bold tabular-nums">
                  {formatCurrency(item.amount)}
                </span>
                <span
                  className={cn(
                    "text-[10px] font-medium",
                    item.confidence >= 0.9
                      ? "text-balanced-green"
                      : item.confidence >= 0.7
                        ? "text-attention-amber"
                        : "text-error-clay",
                  )}
                >
                  {(item.confidence * 100).toFixed(0)}%
                </span>
              </div>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  item.label === "Expected Profit"
                    ? "bg-gradient-to-r from-signal-indigo to-balanced-green"
                    : "bg-muted-foreground/30",
                )}
                style={{ width: `${item.confidence * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-[9px] text-muted-foreground/50 mt-0.5">
              <span>{item.label === "Expected Profit" ? "Profit" : ""}</span>
              <span>Confidence</span>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-card p-3.5">
        <div className="flex items-center gap-1.5 mb-1">
          <Brain className="h-3.5 w-3.5 text-signal-indigo" />
          <span className="text-[10px] font-medium text-muted-foreground uppercase">
            AI Prediction
          </span>
        </div>
        <p className="text-xs text-foreground/70 leading-relaxed">
          {aiPrediction}
        </p>
        <button
          type="button"
          className="mt-1.5 inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-signal-indigo hover:bg-signal-indigo/10 transition-all"
        >
          Run Scenario <ArrowRight className="h-2.5 w-2.5" />
        </button>
      </div>
    </div>
  );
}
