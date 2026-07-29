"use client";

import { cn } from "@/lib/utils";
import { Brain, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";

type ComplianceBriefingProps = {
  className?: string;
};

const COMPLETED = [
  "Sales reconciliation",
  "Purchase reconciliation",
  "Tax calculations",
];

const PENDING = [
  { text: "Review 3 unusual expense claims", severity: "warning" as const },
  { text: "Confirm supplier tax details", severity: "warning" as const },
];

const RECOMMENDATION =
  "Resolve these items before submission to avoid compliance risks.";

export function ComplianceBriefing({ className }: ComplianceBriefingProps) {
  return (
    <div className={cn("rounded-lg border bg-card p-4", className)}>
      <div className="flex items-center gap-2 mb-3">
        <Brain className="h-4 w-4 text-signal-indigo" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Today's Compliance Briefing
        </h3>
      </div>

      <p className="text-sm font-medium text-balanced-green mb-3">
        Your VAT return is 92% prepared.
      </p>

      {/* Completed */}
      <div className="space-y-1.5 mb-3">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Completed
        </p>
        {COMPLETED.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <CheckCircle2 className="h-3 w-3 text-balanced-green shrink-0" />
            <span className="text-xs text-muted-foreground">{item}</span>
          </div>
        ))}
      </div>

      {/* Pending */}
      <div className="space-y-1.5 mb-3">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Pending
        </p>
        {PENDING.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <AlertTriangle
              className={cn(
                "h-3 w-3 shrink-0",
                item.severity === "warning" && "text-attention-amber",
              )}
            />
            <span className="text-xs text-muted-foreground">{item.text}</span>
          </div>
        ))}
      </div>

      {/* Recommendation */}
      <div className="rounded-lg bg-accent/50 p-2.5">
        <div className="flex items-start gap-2">
          <ArrowRight className="h-3 w-3 text-signal-indigo mt-0.5 shrink-0" />
          <p className="text-xs text-foreground">{RECOMMENDATION}</p>
        </div>
      </div>
    </div>
  );
}
