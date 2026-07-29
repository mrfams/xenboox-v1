"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Lightbulb, ArrowRight, X } from "lucide-react";

type OpsInsight = {
  id: string;
  emoji: string;
  text: string;
  priority: "high" | "medium" | "low";
  actions: string[];
};

type OperationsAIInsightsProps = {
  insights?: OpsInsight[];
  className?: string;
};

const DEFAULT_INSIGHTS: OpsInsight[] = [
  {
    id: "oi1",
    emoji: "🟢",
    text: "Payroll is fully funded for the current period — 148 employees",
    priority: "high",
    actions: ["Explain", "Dismiss"],
  },
  {
    id: "oi2",
    emoji: "🟠",
    text: "Marketing exceeded budget by 18% this quarter — review campaign spend",
    priority: "high",
    actions: ["Investigate", "Resolve"],
  },
  {
    id: "oi3",
    emoji: "🔵",
    text: "Inventory for Product A is running low — 12 units remaining",
    priority: "medium",
    actions: ["Explain", "Investigate"],
  },
  {
    id: "oi4",
    emoji: "🟣",
    text: "Three laptops have been inactive for 90 days — recommend reassignment",
    priority: "medium",
    actions: ["Resolve", "Dismiss"],
  },
  {
    id: "oi5",
    emoji: "🟠",
    text: "Travel expenses increased sharply — up 14% month-over-month",
    priority: "high",
    actions: ["Investigate", "Explain"],
  },
  {
    id: "oi6",
    emoji: "🟢",
    text: "Fuel costs decreased this month — saving $4,200 vs budget",
    priority: "low",
    actions: ["Explain", "Dismiss"],
  },
];

export function OperationsAIInsights({
  insights = DEFAULT_INSIGHTS,
  className,
}: OperationsAIInsightsProps) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const visible = useMemo(
    () => insights.filter((i) => !dismissedIds.has(i.id)).slice(0, 5),
    [insights, dismissedIds],
  );

  if (visible.length === 0) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center gap-2 px-1">
          <Lightbulb className="h-4 w-4 text-balanced-green" />
          <h3 className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
            AI Insights
          </h3>
        </div>
        <div className="flex items-center justify-center rounded-xl border border-dashed py-8 text-center text-xs text-muted-foreground/50">
          All clear — no insights to review
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-attention-amber" />
          <h3 className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
            AI Insights
          </h3>
        </div>
        {dismissedIds.size > 0 && (
          <button
            type="button"
            onClick={() => setDismissedIds(new Set())}
            className="text-[10px] text-signal-indigo hover:underline"
          >
            Reset
          </button>
        )}
      </div>
      <div className="space-y-1.5">
        {visible.map((insight) => (
          <div
            key={insight.id}
            className={cn(
              "group rounded-lg border bg-card px-3 py-2.5 transition-all hover:shadow-sm",
              insight.priority === "high" &&
                "border-l-[3px] border-l-attention-amber",
              insight.priority === "medium" &&
                "border-l-[3px] border-l-signal-indigo/40",
              insight.priority === "low" &&
                "border-l-[3px] border-l-balanced-green/40",
            )}
          >
            <div className="flex items-start gap-2">
              <span className="text-sm shrink-0 mt-0.5">{insight.emoji}</span>
              <p className="flex-1 text-xs text-foreground/80 leading-relaxed">
                {insight.text}
              </p>
              <button
                type="button"
                onClick={() =>
                  setDismissedIds((prev) => new Set(prev).add(insight.id))
                }
                className="shrink-0 flex h-5 w-5 items-center justify-center rounded text-muted-foreground/30 opacity-0 group-hover:opacity-100 hover:text-foreground hover:bg-muted transition-all"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
            <div className="flex items-center gap-1.5 mt-1.5 ml-5">
              {insight.actions.map((action) => (
                <button
                  key={action}
                  type="button"
                  className={cn(
                    "inline-flex items-center gap-0.5 rounded-md px-2 py-0.5 text-[10px] font-medium transition-all",
                    action === "Investigate" || action === "Resolve"
                      ? "bg-attention-amber/10 text-attention-amber hover:bg-attention-amber/20"
                      : action === "Explain"
                        ? "bg-signal-indigo/10 text-signal-indigo hover:bg-signal-indigo/20"
                        : "text-muted-foreground/60 hover:text-foreground hover:bg-muted/50",
                  )}
                >
                  {action}
                  {(action === "Investigate" || action === "Resolve") && (
                    <ArrowRight className="h-2.5 w-2.5" />
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
