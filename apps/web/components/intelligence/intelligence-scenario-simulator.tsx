"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Brain,
  Beaker,
  ArrowRight,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

type Scenario = {
  id: string;
  title: string;
  impacts: { label: string; value: string; direction: "up" | "down" }[];
  recommendation: string;
};

type IntelligenceScenarioSimulatorProps = {
  scenarios?: Scenario[];
  className?: string;
};

const DEFAULT_SCENARIOS: Scenario[] = [
  {
    id: "sc1",
    title: "Hire 5 Engineers",
    impacts: [
      { label: "Payroll", value: "+$42,000/month", direction: "up" },
      { label: "Runway", value: "14 → 11 months", direction: "down" },
      {
        label: "Revenue Opportunity",
        value: "+$180,000 projected",
        direction: "up",
      },
    ],
    recommendation:
      "Affordable, but delay until Q3 for optimal cash flow timing.",
  },
  {
    id: "sc2",
    title: "Increase Marketing Budget 20%",
    impacts: [
      { label: "Marketing Spend", value: "+$10,000/month", direction: "up" },
      {
        label: "Expected Revenue Lift",
        value: "+$45,000/month",
        direction: "up",
      },
      { label: "Payback Period", value: "3.2 months", direction: "up" },
    ],
    recommendation:
      "Positive ROI projected — proceed with controlled A/B test first.",
  },
  {
    id: "sc3",
    title: "Reduce Operating Costs 10%",
    impacts: [
      { label: "Cost Savings", value: "$19,000/month", direction: "down" },
      { label: "Net Profit Impact", value: "+$228,000/year", direction: "up" },
      { label: "One-time Restructuring", value: "$15,000", direction: "up" },
    ],
    recommendation:
      "Highest impact option — focus on software and vendor costs first.",
  },
];

export function IntelligenceScenarioSimulator({
  scenarios = DEFAULT_SCENARIOS,
  className,
}: IntelligenceScenarioSimulatorProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center gap-2 px-1">
        <Beaker className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
          Scenario Simulator
        </h3>
      </div>

      <div className="space-y-2">
        {scenarios.map((sc) => {
          const isSelected = selectedId === sc.id;
          return (
            <div
              key={sc.id}
              className={cn(
                "rounded-lg border bg-card transition-all hover:shadow-sm",
                isSelected && "ring-1 ring-signal-indigo/30",
              )}
            >
              <button
                type="button"
                onClick={() => setSelectedId(isSelected ? null : sc.id)}
                className="flex w-full items-center gap-3 p-3 text-left"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-signal-indigo/10">
                  <Beaker className="h-4 w-4 text-signal-indigo" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground/80">
                    {sc.title}
                  </p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                    {sc.impacts.slice(0, 2).map((imp) => (
                      <span
                        key={imp.label}
                        className="text-[10px] text-muted-foreground/60"
                      >
                        {imp.label}: {imp.value}
                      </span>
                    ))}
                  </div>
                </div>
                <ArrowRight
                  className={cn(
                    "h-4 w-4 shrink-0 transition-all",
                    isSelected
                      ? "text-signal-indigo rotate-90"
                      : "text-muted-foreground/30",
                  )}
                />
              </button>

              {isSelected && (
                <div className="border-t px-3 py-3 space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    {sc.impacts.map((imp) => (
                      <div
                        key={imp.label}
                        className={cn(
                          "rounded-lg border bg-card p-2 text-center",
                          imp.direction === "up"
                            ? "border-balanced-green/20"
                            : "border-attention-amber/20",
                        )}
                      >
                        <p className="text-[9px] text-muted-foreground uppercase">
                          {imp.label}
                        </p>
                        <p
                          className={cn(
                            "text-xs font-bold mt-0.5",
                            imp.direction === "up"
                              ? "text-balanced-green"
                              : "text-attention-amber",
                          )}
                        >
                          {imp.direction === "up" ? "↑" : "↓"} {imp.value}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-start gap-1.5">
                    <Brain className="h-3 w-3 text-signal-indigo mt-0.5 shrink-0" />
                    <p className="text-[10px] text-foreground/70 leading-relaxed">
                      {sc.recommendation}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-md bg-signal-indigo/10 px-2 py-0.5 text-[10px] font-medium text-signal-indigo hover:bg-signal-indigo/20 transition-all"
                  >
                    Run This Scenario <ArrowRight className="h-2.5 w-2.5" />
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
