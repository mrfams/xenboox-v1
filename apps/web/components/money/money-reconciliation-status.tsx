"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  FileSearch,
  Copy,
  Ban,
  ArrowRight,
} from "lucide-react";

type MoneyReconciliationStatusProps = {
  progress?: number;
  matched?: number;
  needsReview?: number;
  duplicatePayments?: number;
  unknownTransactions?: number;
  className?: string;
};

export function MoneyReconciliationStatus({
  progress = 96,
  matched = 2348,
  needsReview = 12,
  duplicatePayments = 2,
  unknownTransactions = 3,
  className,
}: MoneyReconciliationStatusProps) {
  const [selectedAction, setSelectedAction] = useState<string | null>(null);

  const stats = [
    {
      id: "matched",
      label: "Matched",
      value: matched.toLocaleString(),
      icon: CheckCircle2,
      color: "text-balanced-green",
      bgColor: "bg-balanced-green/10",
    },
    {
      id: "needsReview",
      label: "Needs Review",
      value: needsReview.toString(),
      icon: FileSearch,
      color: "text-attention-amber",
      bgColor: "bg-attention-amber/10",
    },
    {
      id: "duplicate",
      label: "Duplicate Payments",
      value: duplicatePayments.toString(),
      icon: Copy,
      color: "text-error-clay",
      bgColor: "bg-error-clay/10",
    },
    {
      id: "unknown",
      label: "Unknown Transactions",
      value: unknownTransactions.toString(),
      icon: Ban,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
  ];

  const actions = [
    {
      id: "auto-match",
      label: "Auto-match all",
      desc: "4 remaining unmatched transactions",
    },
    {
      id: "review-exceptions",
      label: "Review Exceptions",
      desc: `${needsReview} items need human review`,
    },
    {
      id: "investigate-dupes",
      label: "Investigate Duplicates",
      desc: `${duplicatePayments} potential duplicate payments`,
    },
  ];

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
            AI Reconciliation
          </h3>
        </div>
        <span className="text-xs font-bold tabular-nums text-balanced-green">
          {progress}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-signal-indigo via-balanced-green to-balanced-green transition-all duration-1000"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.id}
              className="flex items-center gap-2.5 rounded-lg border bg-card px-3 py-2.5"
            >
              <div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-md",
                  stat.bgColor,
                )}
              >
                <Icon className={cn("h-3.5 w-3.5", stat.color)} />
              </div>
              <div>
                <p className="text-xs font-bold tabular-nums">{stat.value}</p>
                <p className="text-[9px] text-muted-foreground/60">
                  {stat.label}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* AI Recommendations */}
      <div className="space-y-1">
        <p className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider px-1">
          AI Recommendations
        </p>
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            onClick={() =>
              setSelectedAction(selectedAction === action.id ? null : action.id)
            }
            className={cn(
              "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-all",
              selectedAction === action.id
                ? "bg-signal-indigo/10 text-signal-indigo"
                : "hover:bg-muted/30 text-foreground/70",
            )}
          >
            <ArrowRight className="h-3 w-3 shrink-0" />
            <div className="flex-1">
              <span className="text-xs font-medium">{action.label}</span>
              <p className="text-[10px] text-muted-foreground/60">
                {action.desc}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
