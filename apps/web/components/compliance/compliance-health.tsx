"use client";

import { cn } from "@/lib/utils";
import { Heart, Shield } from "lucide-react";

type ComplianceHealthProps = {
  className?: string;
};

const SCORES = [
  { label: "Tax", score: 98 },
  { label: "Accounting Records", score: 96 },
  { label: "Documentation", score: 91 },
  { label: "Audit Trail", score: 99 },
  { label: "Regulatory Tasks", score: 94 },
];

function getScoreColor(score: number): string {
  if (score >= 95) return "text-balanced-green";
  if (score >= 85) return "text-attention-amber";
  return "text-error-clay";
}

function getBarColor(score: number): string {
  if (score >= 95) return "bg-gradient-to-r from-emerald-400 to-emerald-500";
  if (score >= 85) return "bg-gradient-to-r from-amber-400 to-amber-500";
  return "bg-gradient-to-r from-red-400 to-red-500";
}

export function ComplianceHealth({ className }: ComplianceHealthProps) {
  const overall = 96;

  return (
    <div className={cn("rounded-lg border bg-card p-4", className)}>
      <div className="flex items-center gap-2 mb-3">
        <Heart className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Compliance Health
        </h3>
      </div>

      {/* Overall score */}
      <div className="flex items-center justify-between mb-4 p-3 rounded-lg bg-accent/50">
        <div className="flex items-center gap-2">
          <Shield className={cn("h-5 w-5", getScoreColor(overall))} />
          <span className="text-sm font-semibold">Overall</span>
        </div>
        <span className={cn("text-lg font-bold", getScoreColor(overall))}>
          {overall}%
        </span>
      </div>

      {/* Category scores */}
      <div className="space-y-2.5">
        {SCORES.map((item) => (
          <div key={item.label} className="space-y-1">
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
    </div>
  );
}
