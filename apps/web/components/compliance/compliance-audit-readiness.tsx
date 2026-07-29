"use client";

import { cn } from "@/lib/utils";
import { ShieldCheck, Brain, ArrowRight } from "lucide-react";

type AuditReadinessProps = {
  className?: string;
};

const METRICS = [
  { label: "Documentation", score: 98 },
  { label: "Transaction Support", score: 94 },
  { label: "Reconciliations", score: 96 },
  { label: "Policies", score: 88 },
];

function getScoreColor(score: number): string {
  if (score >= 95) return "text-balanced-green";
  if (score >= 85) return "text-attention-amber";
  return "text-error-clay";
}

function getBarColor(score: number): string {
  if (score >= 95) return "bg-balanced-green";
  if (score >= 85) return "bg-attention-amber";
  return "bg-error-clay";
}

export function AuditReadiness({ className }: AuditReadinessProps) {
  const overall = 92;

  return (
    <div className={cn("rounded-lg border bg-card p-4", className)}>
      <div className="flex items-center gap-2 mb-3">
        <ShieldCheck className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Audit Readiness
        </h3>
      </div>

      {/* Overall */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium">Overall Readiness</span>
        <span className={cn("text-lg font-bold", getScoreColor(overall))}>
          {overall}%
        </span>
      </div>

      {/* Metrics */}
      <div className="space-y-2 mb-3">
        {METRICS.map((item) => (
          <div key={item.label} className="space-y-0.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {item.label}
              </span>
              <span
                className={cn(
                  "text-xs font-bold tabular-nums",
                  getScoreColor(item.score),
                )}
              >
                {item.score}%
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  getBarColor(item.score),
                )}
                style={{ width: `${item.score}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* AI Recommendation */}
      <div className="rounded-lg bg-accent/50 p-2.5">
        <div className="flex items-start gap-2">
          <Brain className="h-3 w-3 text-signal-indigo mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-foreground font-medium">
              AI Recommendation
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Complete missing approval documentation. Estimated completion: 2
              hours.
            </p>
            <button className="mt-1 flex items-center gap-1 text-[10px] font-medium text-signal-indigo hover:underline">
              Prepare Audit Package <ArrowRight className="h-2.5 w-2.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
