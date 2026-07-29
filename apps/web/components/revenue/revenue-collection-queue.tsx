"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import {
  ListChecks,
  Star,
  Send,
  Phone,
  FileText,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";

type CollectionAction = {
  id: string;
  priority: number;
  action: string;
  customer: string;
  reason: string;
  likelihood: number;
  color: string;
};

type RevenueCollectionQueueProps = {
  items?: CollectionAction[];
  className?: string;
};

const DEFAULT_ITEMS: CollectionAction[] = [
  {
    id: "cq1",
    priority: 5,
    action: "Send Reminder",
    customer: "BlueWave Ltd",
    reason: "Invoice due in 3 days",
    likelihood: 0.93,
    color: "text-signal-indigo bg-signal-indigo/10",
  },
  {
    id: "cq2",
    priority: 5,
    action: "Call Customer",
    customer: "Nova Tech",
    reason: "Invoice disputed — $28,000",
    likelihood: 0.72,
    color: "text-attention-amber bg-attention-amber/10",
  },
  {
    id: "cq3",
    priority: 4,
    action: "Offer Payment Plan",
    customer: "Global Logistics",
    reason: "High value — $35,000 outstanding",
    likelihood: 0.85,
    color: "text-cyan-500 bg-cyan-500/10",
  },
  {
    id: "cq4",
    priority: 3,
    action: "Escalate",
    customer: "Metro Group",
    reason: "67 days overdue — $12,000",
    likelihood: 0.65,
    color: "text-error-clay bg-error-clay/10",
  },
  {
    id: "cq5",
    priority: 2,
    action: "Send Statement",
    customer: "Prime Services",
    reason: "Monthly statement due",
    likelihood: 0.88,
    color: "text-purple-500 bg-purple-500/10",
  },
];

export function RevenueCollectionQueue({
  items = DEFAULT_ITEMS,
  className,
}: RevenueCollectionQueueProps) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const visible = items.filter((i) => !dismissedIds.has(i.id));

  if (visible.length === 0) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center gap-2 px-1">
          <ListChecks className="h-4 w-4 text-balanced-green" />
          <h3 className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
            AI Collection Queue
          </h3>
        </div>
        <div className="flex items-center justify-center rounded-xl border border-dashed py-8 text-xs text-muted-foreground/50">
          Queue empty — all recommendations resolved
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center gap-2 px-1">
        <ListChecks className="h-4 w-4 text-attention-amber" />
        <h3 className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
          AI Collection Queue
        </h3>
        <span className="rounded-full bg-attention-amber/10 px-1.5 py-0.5 text-[9px] font-medium text-attention-amber">
          {visible.length}
        </span>
      </div>

      <div className="space-y-1.5">
        {visible.map((item) => {
          const isSelected = selectedId === item.id;
          const stars = item.priority;

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
                  {/* Stars */}
                  <div className="flex items-center gap-0.5 mb-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          "h-3 w-3",
                          i < stars
                            ? "text-attention-amber fill-attention-amber"
                            : "text-muted-foreground/20",
                        )}
                      />
                    ))}
                  </div>

                  {/* Action title */}
                  <p className="text-sm font-medium text-foreground/80">
                    {item.action}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs text-muted-foreground/70">
                      {item.customer}
                    </span>
                    <span className="text-[10px] text-muted-foreground/30">
                      ·
                    </span>
                    <span className="text-[10px] text-muted-foreground/60">
                      {item.reason}
                    </span>
                  </div>
                </div>

                {/* Likelihood */}
                <div className="text-right shrink-0 ml-3">
                  <div
                    className={cn(
                      "text-xs font-bold tabular-nums",
                      item.likelihood >= 0.85
                        ? "text-balanced-green"
                        : item.likelihood >= 0.7
                          ? "text-attention-amber"
                          : "text-error-clay",
                    )}
                  >
                    {(item.likelihood * 100).toFixed(0)}%
                  </div>
                  <div className="text-[9px] text-muted-foreground/50">
                    likelihood
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 mt-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedId(isSelected ? null : item.id)}
                  className="inline-flex items-center gap-1 rounded-md bg-signal-indigo/10 px-2 py-0.5 text-[10px] font-medium text-signal-indigo hover:bg-signal-indigo/20 transition-colors"
                >
                  {item.action}
                  <ArrowRight className="h-2.5 w-2.5" />
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

              {/* Detail */}
              {isSelected && (
                <div className="mt-2.5 rounded-md bg-muted/20 border px-2.5 py-2 text-[10px] text-muted-foreground/70 leading-relaxed">
                  <p className="font-medium text-foreground/80 mb-0.5">
                    AI Recommendation
                  </p>
                  <p>
                    Recommended action based on {item.customer}'s payment
                    history of{" "}
                    {item.likelihood >= 0.85
                      ? "consistent on-time payments"
                      : "mixed payment patterns"}
                    . Confidence: {(item.likelihood * 100).toFixed(0)}%.
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
