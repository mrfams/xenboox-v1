"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Lightbulb, ArrowRight, X } from "lucide-react";

type AccInsight = {
  id: string;
  emoji: string;
  text: string;
  priority: "high" | "medium" | "low";
  actions: string[];
};

type AccountingAIInsightsProps = {
  insights?: AccInsight[];
  className?: string;
};

const DEFAULT_INSIGHTS: AccInsight[] = [
  {
    id: "ai1",
    emoji: "🟢",
    text: "98% of transactions categorized automatically — 3,842 posted",
    priority: "high",
    actions: ["Explain", "Dismiss"],
  },
  {
    id: "ai2",
    emoji: "🟠",
    text: "Three journals require approval before month-end close",
    priority: "high",
    actions: ["Review", "Approve"],
  },
  {
    id: "ai3",
    emoji: "🔵",
    text: "Trial Balance is balanced — no out-of-balance accounts detected",
    priority: "medium",
    actions: ["Explain", "Dismiss"],
  },
  {
    id: "ai4",
    emoji: "🟣",
    text: "Revenue recognition adjustment suggested for Q2",
    priority: "medium",
    actions: ["Investigate", "Review"],
  },
  {
    id: "ai5",
    emoji: "🟠",
    text: "Intercompany mismatch detected between entities",
    priority: "high",
    actions: ["Investigate", "Review"],
  },
  {
    id: "ai6",
    emoji: "🟢",
    text: "Depreciation for June posted successfully — 482 assets processed",
    priority: "low",
    actions: ["Explain", "Dismiss"],
  },
];

export function AccountingAIInsights({
  insights = DEFAULT_INSIGHTS,
  className,
}: AccountingAIInsightsProps) {
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
                    action === "Investigate" ||
                      action === "Review" ||
                      action === "Approve"
                      ? "bg-attention-amber/10 text-attention-amber hover:bg-attention-amber/20"
                      : action === "Explain"
                        ? "bg-signal-indigo/10 text-signal-indigo hover:bg-signal-indigo/20"
                        : "text-muted-foreground/60 hover:text-foreground hover:bg-muted/50",
                  )}
                >
                  {action}
                  {(action === "Investigate" ||
                    action === "Review" ||
                    action === "Approve") && (
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
