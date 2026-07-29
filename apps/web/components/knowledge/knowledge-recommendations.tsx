"use client";

import React from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Star, ArrowRight, Lightbulb } from "lucide-react";

type RecommendationItem = {
  id: string;
  title: string;
  detail: string;
  priority: number;
};

const DEFAULT_RECOMMENDATIONS: RecommendationItem[] = [
  {
    id: "r1",
    title: "Missing receipts",
    detail: "32 expenses need supporting documents",
    priority: 5,
  },
  {
    id: "r2",
    title: "Expired supplier documents",
    detail: "5 vendors require updated tax information",
    priority: 5,
  },
  {
    id: "r3",
    title: "Approval delays",
    detail: "Finance approvals taking 3 days longer than target",
    priority: 4,
  },
  {
    id: "r4",
    title: "Duplicate records detected",
    detail: "3 customer records have duplicate entries",
    priority: 3,
  },
  {
    id: "r5",
    title: "Contract renewal reminders",
    detail: "5 agreements expiring within 90 days",
    priority: 4,
  },
];

export function KnowledgeRecommendations() {
  const [recommendations, setRecommendations] = useState(
    DEFAULT_RECOMMENDATIONS,
  );

  const dismissRecommendation = (id: string) => {
    setRecommendations((prev) => prev.filter((r) => r.id !== id));
  };

  const resetAll = () => {
    setRecommendations(DEFAULT_RECOMMENDATIONS);
  };

  if (recommendations.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-balanced-green/10">
            <Lightbulb className="h-5 w-5 text-balanced-green" />
          </div>
          <p className="text-sm font-medium text-foreground mb-1">
            All resolved
          </p>
          <p className="text-xs text-muted-foreground mb-3">
            No knowledge improvements needed.
          </p>
          <button
            onClick={resetAll}
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
          <h3 className="text-sm font-medium">AI Recommendations</h3>
        </div>
      </div>
      <div className="divide-y">
        {recommendations.map((rec) => (
          <div
            key={rec.id}
            className="px-4 py-3 transition-colors hover:bg-accent/30"
          >
            <div className="flex items-start justify-between mb-1">
              <div className="flex items-center gap-1.5">
                {/* Star priority */}
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <Star
                      key={idx}
                      className={cn(
                        "h-2.5 w-2.5",
                        idx < rec.priority
                          ? "fill-attention-amber text-attention-amber"
                          : "text-muted-foreground/20",
                      )}
                    />
                  ))}
                </div>
                <span className="text-sm font-medium">{rec.title}</span>
              </div>
              <button
                onClick={() => dismissRecommendation(rec.id)}
                className="text-[9px] text-muted-foreground hover:text-foreground shrink-0 ml-2"
              >
                Dismiss
              </button>
            </div>
            <p className="text-xs text-muted-foreground ml-7">{rec.detail}</p>
          </div>
        ))}
      </div>
      {recommendations.length > 0 &&
        recommendations.length < DEFAULT_RECOMMENDATIONS.length && (
          <button
            onClick={resetAll}
            className="flex w-full items-center justify-center border-t px-4 py-2 text-[10px] font-medium text-muted-foreground hover:bg-accent/50 transition-colors"
          >
            Show all recommendations
          </button>
        )}
    </div>
  );
}
