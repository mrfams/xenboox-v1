"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Star, ArrowRight, CheckCircle2 } from "lucide-react";

type CloseTask = {
  id: string;
  priority: number;
  task: string;
  effort: string;
  reason: string;
};

type AccountingCloseChecklistProps = {
  tasks?: CloseTask[];
  className?: string;
};

const DEFAULT_TASKS: CloseTask[] = [
  {
    id: "ct1",
    priority: 5,
    task: "Approve Revenue Journal",
    effort: "2 minutes",
    reason: "Blocks financial statement generation",
  },
  {
    id: "ct2",
    priority: 5,
    task: "Review Tax Adjustment",
    effort: "5 minutes",
    reason: "Required before finalizing close",
  },
  {
    id: "ct3",
    priority: 4,
    task: "Verify Inventory Adjustment",
    effort: "4 minutes",
    reason: "COGS impact needs confirmation",
  },
  {
    id: "ct4",
    priority: 4,
    task: "Finalize Accruals",
    effort: "6 minutes",
    reason: "Pending review of 3 accrual entries",
  },
  {
    id: "ct5",
    priority: 3,
    task: "Review Intercompany Entries",
    effort: "3 minutes",
    reason: "Cross-entity reconciliation needed",
  },
];

export function AccountingCloseChecklist({
  tasks = DEFAULT_TASKS,
  className,
}: AccountingCloseChecklistProps) {
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const visible = tasks.filter((t) => !completedIds.has(t.id));

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
            Close Checklist
          </h3>
        </div>
        <span
          className={cn(
            "text-[10px] font-medium",
            completedIds.size > 0
              ? "text-balanced-green"
              : "text-muted-foreground/50",
          )}
        >
          {completedIds.size}/{tasks.length} complete
        </span>
      </div>

      <div className="space-y-1.5">
        {visible.map((task) => {
          const isSelected = selectedId === task.id;
          return (
            <div
              key={task.id}
              className={cn(
                "rounded-lg border bg-card p-3 transition-all hover:shadow-sm",
                isSelected && "ring-1 ring-signal-indigo/30",
              )}
            >
              <div className="flex items-start gap-2.5">
                <button
                  type="button"
                  onClick={() =>
                    setCompletedIds((prev) => new Set(prev).add(task.id))
                  }
                  className="shrink-0 flex h-5 w-5 items-center justify-center rounded-md border-2 border-muted-foreground/30 hover:border-balanced-green/50 transition-all"
                ></button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-0.5 mb-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          "h-3 w-3",
                          i < task.priority
                            ? "text-attention-amber fill-attention-amber"
                            : "text-muted-foreground/20",
                        )}
                      />
                    ))}
                  </div>
                  <p className="text-sm font-medium text-foreground/80">
                    {task.task}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] text-muted-foreground/60">
                      {task.effort}
                    </span>
                    <span className="text-[10px] text-muted-foreground/30">
                      ·
                    </span>
                    <span className="text-[10px] text-muted-foreground/60">
                      {task.reason}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 mt-2 ml-7">
                <button
                  type="button"
                  onClick={() => setSelectedId(isSelected ? null : task.id)}
                  className="inline-flex items-center gap-1 rounded-md bg-signal-indigo/10 px-2 py-0.5 text-[10px] font-medium text-signal-indigo hover:bg-signal-indigo/20 transition-colors"
                >
                  Start <ArrowRight className="h-2.5 w-2.5" />
                </button>
              </div>

              {isSelected && (
                <div className="mt-2 ml-7 rounded-md bg-muted/20 border px-2.5 py-2 text-[10px] text-muted-foreground/70 leading-relaxed">
                  <p className="font-medium text-foreground/80 mb-0.5">
                    AI Guidance
                  </p>
                  <p>
                    This task is priority {task.priority}/5. Estimated time:{" "}
                    {task.effort}. {task.reason}. The AI has prepared the
                    necessary entries — review and approve to proceed.
                  </p>
                </div>
              )}
            </div>
          );
        })}

        {visible.length === 0 && (
          <div className="flex items-center justify-center py-6 text-xs text-balanced-green font-medium">
            <CheckCircle2 className="h-4 w-4 mr-1.5" />
            All close tasks complete
          </div>
        )}
      </div>
    </div>
  );
}
