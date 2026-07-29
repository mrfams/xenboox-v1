"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Star, ArrowRight, Lightbulb } from "lucide-react";

type Opportunity = {
  id: string;
  priority: number;
  title: string;
  impact: string;
  reason: string;
  color: string;
};

type IntelligenceOpportunityFeedProps = {
  items?: Opportunity[];
  className?: string;
};

const DEFAULT_ITEMS: Opportunity[] = [
  {
    id: "op1",
    priority: 5,
    title: "Increase pricing on Enterprise Tier",
    impact: "+$24,000/month",
    reason: "Below market rate by 18%",
    color: "bg-balanced-green/10 text-balanced-green",
  },
  {
    id: "op2",
    priority: 5,
    title: "Reduce unused software licenses",
    impact: "$4,800/month savings",
    reason: "12 licenses not accessed in 90 days",
    color: "bg-signal-indigo/10 text-signal-indigo",
  },
  {
    id: "op3",
    priority: 4,
    title: "Improve invoice collection speed",
    impact: "+$82,000 cash improvement",
    reason: "Avg collection time can improve by 8 days",
    color: "bg-attention-amber/10 text-attention-amber",
  },
  {
    id: "op4",
    priority: 4,
    title: "Cross-sell to existing customers",
    impact: "+$15,000/month",
    reason: "60% of customers buy only 1 product",
    color: "bg-cyan-500/10 text-cyan-500",
  },
  {
    id: "op5",
    priority: 3,
    title: "Negotiate payment terms with suppliers",
    impact: "$12,000/year",
    reason: "Extend from 30 to 45 days",
    color: "bg-purple-500/10 text-purple-500",
  },
];

export function IntelligenceOpportunityFeed({
  items = DEFAULT_ITEMS,
  className,
}: IntelligenceOpportunityFeedProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-attention-amber" />
          <h3 className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
            Growth Opportunities
          </h3>
        </div>
        <span className="text-[10px] text-balanced-green font-medium">
          {items.length} opportunities
        </span>
      </div>

      <div className="space-y-1.5">
        {items.map((item) => {
          const isSelected = selectedId === item.id;
          return (
            <div
              key={item.id}
              className={cn(
                "rounded-lg border bg-card p-3 transition-all hover:shadow-sm",
                isSelected && "ring-1 ring-balanced-green/30",
              )}
            >
              <div className="flex items-start gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-card border">
                  <Lightbulb className="h-4 w-4 text-attention-amber" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-0.5 mb-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          "h-3 w-3",
                          i < item.priority
                            ? "text-attention-amber fill-attention-amber"
                            : "text-muted-foreground/20",
                        )}
                      />
                    ))}
                  </div>
                  <p className="text-sm font-medium text-foreground/80">
                    {item.title}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs font-medium text-balanced-green">
                      {item.impact}
                    </span>
                    <span className="text-[10px] text-muted-foreground/30">
                      ·
                    </span>
                    <span className="text-[10px] text-muted-foreground/60">
                      {item.reason}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 mt-2.5 ml-[42px]">
                <button
                  type="button"
                  onClick={() => setSelectedId(isSelected ? null : item.id)}
                  className="inline-flex items-center gap-1 rounded-md bg-signal-indigo/10 px-2 py-0.5 text-[10px] font-medium text-signal-indigo hover:bg-signal-indigo/20 transition-colors"
                >
                  Explore <ArrowRight className="h-2.5 w-2.5" />
                </button>
                <button
                  type="button"
                  className="rounded-md px-2 py-0.5 text-[10px] font-medium text-muted-foreground/60 hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  Dismiss
                </button>
              </div>

              {isSelected && (
                <div className="mt-2.5 ml-[42px] rounded-md bg-muted/20 border px-2.5 py-2 text-[10px] text-muted-foreground/70 leading-relaxed">
                  <p className="font-medium text-foreground/80 mb-0.5">
                    AI Analysis
                  </p>
                  <p>
                    This opportunity is ranked {item.priority}/5 based on{" "}
                    {item.reason.toLowerCase()}. Estimated impact: {item.impact}
                    . Recommended action: schedule a review meeting to discuss
                    implementation timeline and resource requirements.
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
