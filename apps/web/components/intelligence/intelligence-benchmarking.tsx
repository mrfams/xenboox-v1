"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Brain, ArrowRight, TrendingUp, TrendingDown } from "lucide-react";

type BenchmarkItem = {
  id: string;
  metric: string;
  yourValue: string;
  industryAvg: string;
  gap: string;
  gapDirection: "positive" | "negative";
  reasons: string[];
  recommendations: string[];
};

type IntelligenceBenchmarkingProps = {
  items?: BenchmarkItem[];
  className?: string;
};

const DEFAULT_ITEMS: BenchmarkItem[] = [
  {
    id: "bm1",
    metric: "Gross Margin",
    yourValue: "34%",
    industryAvg: "42%",
    gap: "-8%",
    gapDirection: "negative",
    reasons: [
      "Supplier costs are higher than industry average",
      "Discounting is aggressive (22% avg discount)",
      "Delivery costs increased 14%",
    ],
    recommendations: [
      "Review pricing strategy — consider 5% increase",
      "Renegotiate top 3 supplier contracts",
      "Reduce promotional discounts by 10%",
    ],
  },
  {
    id: "bm2",
    metric: "Revenue per Employee",
    yourValue: "$142,000",
    industryAvg: "$128,000",
    gap: "+11%",
    gapDirection: "positive",
    reasons: ["Higher average deal size", "Efficient sales team structure"],
    recommendations: [
      "Maintain current team structure",
      "Use as recruiting advantage",
    ],
  },
  {
    id: "bm3",
    metric: "Cash Conversion Days",
    yourValue: "38 days",
    industryAvg: "45 days",
    gap: "-7 days",
    gapDirection: "positive",
    reasons: [
      "Fast invoice collection (avg 24 days)",
      "Efficient payables management",
    ],
    recommendations: [
      "Continue current AR practices",
      "Monitor if growth causes slippage",
    ],
  },
];

export function IntelligenceBenchmarking({
  items = DEFAULT_ITEMS,
  className,
}: IntelligenceBenchmarkingProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center gap-2 px-1">
        <Brain className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
          Business Benchmark
        </h3>
      </div>

      <div className="space-y-2">
        {items.map((item) => {
          const isSelected = selectedId === item.id;
          return (
            <div key={item.id}>
              <button
                type="button"
                onClick={() => setSelectedId(isSelected ? null : item.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all hover:bg-muted/30",
                  isSelected && "bg-muted/20 rounded-b-none",
                )}
              >
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg",
                    item.gapDirection === "positive"
                      ? "bg-balanced-green/10"
                      : "bg-error-clay/10",
                  )}
                >
                  {item.gapDirection === "positive" ? (
                    <TrendingUp className="h-4 w-4 text-balanced-green" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-error-clay" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-foreground/80">
                      {item.metric}
                    </span>
                    <span
                      className={cn(
                        "text-xs font-bold",
                        item.gapDirection === "positive"
                          ? "text-balanced-green"
                          : "text-error-clay",
                      )}
                    >
                      {item.gap}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground/60">
                    <span>You: {item.yourValue}</span>
                    <span>·</span>
                    <span>Industry: {item.industryAvg}</span>
                  </div>
                </div>
              </button>

              {isSelected && (
                <div className="rounded-b-lg border-x border-b bg-muted/10 px-3 py-3 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Brain className="h-3 w-3 text-signal-indigo" />
                    <span className="text-[10px] font-medium text-muted-foreground">
                      AI Analysis
                    </span>
                  </div>
                  <p className="text-[10px] font-medium text-muted-foreground/70">
                    Your margin is{" "}
                    {item.gapDirection === "negative" ? "lower" : "higher"}{" "}
                    because:
                  </p>
                  <ul className="space-y-0.5 ml-2">
                    {item.reasons.map((r, i) => (
                      <li
                        key={i}
                        className="text-[10px] text-foreground/70 flex items-center gap-1"
                      >
                        <span
                          className={
                            item.gapDirection === "positive"
                              ? "text-balanced-green"
                              : "text-attention-amber"
                          }
                        >
                          •
                        </span>{" "}
                        {r}
                      </li>
                    ))}
                  </ul>
                  <div className="border-t pt-2 mt-2">
                    <p className="text-[10px] font-medium text-signal-indigo mb-1">
                      Recommendations:
                    </p>
                    {item.recommendations.map((rec, i) => (
                      <div key={i} className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[10px] text-foreground/70">
                          {i + 1}. {rec}
                        </span>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-signal-indigo hover:bg-signal-indigo/10 transition-all"
                  >
                    Take Action <ArrowRight className="h-2.5 w-2.5" />
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
