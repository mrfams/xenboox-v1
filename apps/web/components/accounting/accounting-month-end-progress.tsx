"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, Clock, ArrowRight } from "lucide-react";

type CloseStep = {
  id: string;
  label: string;
  status: "complete" | "needs_review" | "pending";
};

type AccountingMonthEndProgressProps = {
  steps?: CloseStep[];
  className?: string;
};

const DEFAULT_STEPS: CloseStep[] = [
  { id: "cs1", label: "Bank Reconciliation", status: "complete" },
  { id: "cs2", label: "Payroll Posted", status: "complete" },
  { id: "cs3", label: "Depreciation", status: "complete" },
  { id: "cs4", label: "Accruals", status: "needs_review" },
  { id: "cs5", label: "Tax Entries", status: "pending" },
  { id: "cs6", label: "Financial Statements", status: "needs_review" },
];

export function AccountingMonthEndProgress({
  steps = DEFAULT_STEPS,
  className,
}: AccountingMonthEndProgressProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const completeCount = steps.filter((s) => s.status === "complete").length;

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
            Month-End Close
          </h3>
        </div>
        <span className="text-xs font-bold tabular-nums text-balanced-green">
          {completeCount}/{steps.length}
        </span>
      </div>

      <div className="space-y-0.5">
        {steps.map((step) => {
          const isExpanded = expandedId === step.id;
          return (
            <div key={step.id}>
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : step.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all hover:bg-muted/20",
                  isExpanded && "bg-muted/10 rounded-b-none",
                )}
              >
                <div
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                    step.status === "complete"
                      ? "bg-balanced-green/10"
                      : step.status === "needs_review"
                        ? "bg-attention-amber/10"
                        : "bg-muted/30",
                  )}
                >
                  {step.status === "complete" ? (
                    <CheckCircle2 className="h-4 w-4 text-balanced-green" />
                  ) : step.status === "needs_review" ? (
                    <Clock className="h-4 w-4 text-attention-amber" />
                  ) : (
                    <div className="h-3 w-3 rounded-full border-2 border-muted-foreground/30" />
                  )}
                </div>
                <span
                  className={cn(
                    "flex-1 text-xs",
                    step.status === "complete"
                      ? "text-foreground/60 line-through"
                      : step.status === "needs_review"
                        ? "text-attention-amber font-medium"
                        : "text-muted-foreground/60",
                  )}
                >
                  {step.label}
                </span>
                <span
                  className={cn(
                    "text-[10px] font-medium",
                    step.status === "complete"
                      ? "text-balanced-green"
                      : step.status === "needs_review"
                        ? "text-attention-amber"
                        : "text-muted-foreground/40",
                  )}
                >
                  {step.status === "complete"
                    ? "Complete"
                    : step.status === "needs_review"
                      ? "Needs Review"
                      : "Pending"}
                </span>
              </button>

              {isExpanded && step.status === "needs_review" && (
                <div className="rounded-b-lg border-x border-b bg-muted/10 px-3 py-2 text-[10px] text-muted-foreground/70">
                  <p>
                    AI has prepared the {step.label.toLowerCase()} entries.
                    Review and approve to continue the close process.
                  </p>
                  <button
                    type="button"
                    className="mt-1 inline-flex items-center gap-0.5 text-signal-indigo font-medium"
                  >
                    Review {step.label} <ArrowRight className="h-2.5 w-2.5" />
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
