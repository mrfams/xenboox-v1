"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import {
  Brain,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Minus,
} from "lucide-react";

type VarianceItem = {
  id: string;
  category: string;
  budget: number;
  actual: number;
  reasons: string[];
  impact: string;
  recommendation: string;
};

type IntelligenceVarianceAnalysisProps = {
  items?: VarianceItem[];
  className?: string;
};

const DEFAULT_ITEMS: VarianceItem[] = [
  {
    id: "va1",
    category: "Marketing Spend",
    budget: 50000,
    actual: 65000,
    reasons: [
      "Google Ads campaign (+$8k)",
      "Agency fees (+$5k)",
      "New campaign launch (+$2k)",
    ],
    impact: "Reduced profit margin by 1.8%",
    recommendation: "Campaign ROI review recommended before next quarter",
  },
  {
    id: "va2",
    category: "Software & Tools",
    budget: 24000,
    actual: 22000,
    reasons: [
      "License optimization (-$1.5k)",
      "Cancelled unused tools (-$0.5k)",
    ],
    impact: "Improved operating margin by 0.3%",
    recommendation: "Continue quarterly license audit",
  },
  {
    id: "va3",
    category: "Travel & Entertainment",
    budget: 15000,
    actual: 18500,
    reasons: ["Team offsite (+$2k)", "Client meetings (+$1.5k)"],
    impact: "Within annual budget — seasonal variation",
    recommendation: "Monitor Q3 trends before adjusting forecast",
  },
];

export function IntelligenceVarianceAnalysis({
  items = DEFAULT_ITEMS,
  className,
}: IntelligenceVarianceAnalysisProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center gap-2 px-1">
        <Minus className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
          Budget vs Actual
        </h3>
      </div>

      <div className="space-y-2">
        {items.map((item) => {
          const isExpanded = expandedId === item.id;
          const variance = item.actual - item.budget;
          const isOver = variance > 0;

          return (
            <div key={item.id}>
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : item.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all hover:bg-muted/30",
                  isExpanded && "bg-muted/20 rounded-b-none",
                )}
              >
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg",
                    isOver ? "bg-error-clay/10" : "bg-balanced-green/10",
                  )}
                >
                  {isOver ? (
                    <TrendingUp className="h-4 w-4 text-error-clay" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-balanced-green" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-foreground/80">
                      {item.category}
                    </span>
                    <span
                      className={cn(
                        "text-xs font-bold tabular-nums",
                        isOver ? "text-error-clay" : "text-balanced-green",
                      )}
                    >
                      {isOver ? "+" : ""}
                      {formatCurrency(variance)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground/60">
                    <span>Budget: {formatCurrency(item.budget)}</span>
                    <span>·</span>
                    <span>Actual: {formatCurrency(item.actual)}</span>
                  </div>
                </div>
              </button>

              {isExpanded && (
                <div className="rounded-b-lg border-x border-b bg-muted/10 px-3 py-3 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Brain className="h-3 w-3 text-signal-indigo" />
                    <span className="text-[10px] font-medium text-muted-foreground">
                      AI Explanation
                    </span>
                  </div>
                  <p className="text-[10px] font-medium text-muted-foreground/70">
                    The increase came from:
                  </p>
                  <ul className="space-y-1 ml-2">
                    {item.reasons.map((r, i) => (
                      <li
                        key={i}
                        className="text-[10px] text-foreground/70 flex items-center gap-1"
                      >
                        <span className="text-attention-amber">•</span> {r}
                      </li>
                    ))}
                  </ul>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <Brain className="h-3 w-3 text-attention-amber" />
                    <span className="text-foreground/70">{item.impact}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-medium text-signal-indigo">
                      Recommendation:
                    </span>
                    <span className="text-[10px] text-foreground/70">
                      {item.recommendation}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-signal-indigo hover:bg-signal-indigo/10 transition-all"
                  >
                    Review Details <ArrowRight className="h-2.5 w-2.5" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
