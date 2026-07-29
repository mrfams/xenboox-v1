"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ListChecks, Star, ArrowRight } from "lucide-react";

type PaymentRec = {
  id: string;
  priority: number;
  action: string;
  target: string;
  reason: string;
  detail: string;
  color: string;
};

type ProcurementPaymentRecommendationsProps = {
  items?: PaymentRec[];
  className?: string;
};

const DEFAULT_ITEMS: PaymentRec[] = [
  {
    id: "pr1",
    priority: 5,
    action: "Pay Microsoft Today",
    target: "Save $1,240",
    reason: "Early Payment Discount — 2%",
    detail:
      "Paying Microsoft invoice B-2034 of $62,000 today qualifies for a 2% early payment discount, saving $1,240. Payment is due in 5 days.",
    color: "text-balanced-green bg-balanced-green/10",
  },
  {
    id: "pr2",
    priority: 5,
    action: "Delay Office Depot",
    target: "Safe 10 Days",
    reason: "No late fees — good relationship",
    detail:
      "Office Depot invoice B-2088 for $2,100 can be safely delayed by 10 days without penalty. This preserves cash for the Microsoft discount capture.",
    color: "text-signal-indigo bg-signal-indigo/10",
  },
  {
    id: "pr3",
    priority: 4,
    action: "Approve Purchase Order",
    target: "Manufacturing Equipment",
    reason: "Budget Available",
    detail:
      "PO-2041 for manufacturing equipment ($45,000) is within the approved capital expenditure budget. Recommend approval to avoid project delays.",
    color: "text-cyan-500 bg-cyan-500/10",
  },
  {
    id: "pr4",
    priority: 4,
    action: "Negotiate with ABC Manufacturing",
    target: "Prices increased 11%",
    reason: "Price increase alert",
    detail:
      "ABC Manufacturing has increased prices by 11% across all products. Recommend scheduling a negotiation meeting based on volume commitment.",
    color: "text-attention-amber bg-attention-amber/10",
  },
  {
    id: "pr5",
    priority: 3,
    action: "Review Global Logistics Contract",
    target: "Renewal in 45 days",
    reason: "Contract expiring soon",
    detail:
      "The Global Logistics annual contract ($120,000/yr) expires in 45 days. Recommend starting renewal negotiations early.",
    color: "text-purple-500 bg-purple-500/10",
  },
];

export function ProcurementPaymentRecommendations({
  items = DEFAULT_ITEMS,
  className,
}: ProcurementPaymentRecommendationsProps) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const visible = items.filter((i) => !dismissedIds.has(i.id));

  if (visible.length === 0) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center gap-2 px-1">
          <ListChecks className="h-4 w-4 text-balanced-green" />
          <h3 className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
            AI Recommendations
          </h3>
        </div>
        <div className="flex items-center justify-center rounded-xl border border-dashed py-8 text-xs text-muted-foreground/50">
          All recommendations resolved
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center gap-2 px-1">
        <ListChecks className="h-4 w-4 text-attention-amber" />
        <h3 className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
          AI Payment Recommendations
        </h3>
        <span className="rounded-full bg-attention-amber/10 px-1.5 py-0.5 text-[9px] font-medium text-attention-amber">
          {visible.length}
        </span>
      </div>

      <div className="space-y-1.5">
        {visible.map((item) => {
          const isSelected = selectedId === item.id;
          return (
            <div
              key={item.id}
              className={cn(
                "rounded-lg border bg-card p-3 transition-all hover:shadow-sm",
                isSelected && "ring-1 ring-signal-indigo/30",
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-0.5 mb-1">
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
                    {item.action}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs text-muted-foreground/70">
                      {item.target}
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

              <div className="flex items-center gap-1.5 mt-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedId(isSelected ? null : item.id)}
                  className="inline-flex items-center gap-1 rounded-md bg-signal-indigo/10 px-2 py-0.5 text-[10px] font-medium text-signal-indigo hover:bg-signal-indigo/20 transition-colors"
                >
                  Review <ArrowRight className="h-2.5 w-2.5" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setDismissedIds((prev) => new Set(prev).add(item.id))
                  }
                  className="rounded-md px-2 py-0.5 text-[10px] font-medium text-muted-foreground/60 hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  Dismiss
                </button>
              </div>

              {isSelected && (
                <div className="mt-2.5 rounded-md bg-muted/20 border px-2.5 py-2 text-[10px] text-muted-foreground/70 leading-relaxed">
                  <p className="font-medium text-foreground/80 mb-0.5">
                    AI Analysis
                  </p>
                  <p>{item.detail}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
