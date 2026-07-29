"use client";

import React from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Lightbulb, X, ArrowRight } from "lucide-react";

type InsightItem = {
  id: string;
  icon: string;
  text: string;
  priority: "high" | "medium" | "info";
  action: string;
};

const DEFAULT_INSIGHTS: InsightItem[] = [
  {
    id: "i1",
    icon: "🟢",
    text: "Document processing is ahead of schedule",
    priority: "info",
    action: "View queue",
  },
  {
    id: "i2",
    icon: "🟠",
    text: "12 approvals are waiting for finance review",
    priority: "medium",
    action: "Review now",
  },
  {
    id: "i3",
    icon: "🔵",
    text: "Contract renewal detected — 5 agreements expiring",
    priority: "info",
    action: "View contracts",
  },
  {
    id: "i4",
    icon: "🟣",
    text: "Duplicate documents prevented — 3 flagged",
    priority: "info",
    action: "Review duplicates",
  },
  {
    id: "i5",
    icon: "🟠",
    text: "32 expenses are missing receipt documents",
    priority: "medium",
    action: "Find receipts",
  },
  {
    id: "i6",
    icon: "🟢",
    text: "Company memory updated with new policies",
    priority: "info",
    action: "View updates",
  },
];

const PRIORITY_COLORS: Record<string, string> = {
  high: "border-l-error-clay",
  medium: "border-l-attention-amber",
  info: "border-l-signal-indigo",
};

export function KnowledgeAIInsights() {
  const [insights, setInsights] = useState(DEFAULT_INSIGHTS);

  const dismissInsight = (id: string) => {
    setInsights((prev) => prev.filter((i) => i.id !== id));
  };

  const resetInsights = () => {
    setInsights(DEFAULT_INSIGHTS);
  };

  if (insights.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-balanced-green/10">
            <Lightbulb className="h-5 w-5 text-balanced-green" />
          </div>
          <p className="text-sm font-medium text-foreground mb-1">
            All insights reviewed
          </p>
          <p className="text-xs text-muted-foreground mb-3">
            No new knowledge updates.
          </p>
          <button
            onClick={resetInsights}
            className="text-xs font-medium text-signal-indigo hover:underline"
          >
            Show mock data
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium">AI Insights</h3>
        </div>
      </div>
      <div className="divide-y">
        {insights.map((insight) => (
          <div
            key={insight.id}
            className={cn(
              "group relative border-l-2 px-4 py-2.5 transition-colors hover:bg-accent/30",
              PRIORITY_COLORS[insight.priority],
            )}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-2 flex-1 min-w-0">
                <span className="text-sm shrink-0">{insight.icon}</span>
                <div>
                  <p className="text-xs text-foreground">{insight.text}</p>
                  <button className="mt-0.5 flex items-center gap-0.5 text-[10px] font-medium text-signal-indigo hover:underline">
                    {insight.action} <ArrowRight className="h-2.5 w-2.5" />
                  </button>
                </div>
              </div>
              <button
                onClick={() => dismissInsight(insight.id)}
                className="ml-2 flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-accent group-hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
      {insights.length > 0 && insights.length < DEFAULT_INSIGHTS.length && (
        <button
          onClick={resetInsights}
          className="flex w-full items-center justify-center border-t px-4 py-2 text-[10px] font-medium text-muted-foreground hover:bg-accent/50 transition-colors"
        >
          Show all insights
        </button>
      )}
    </div>
  );
}
