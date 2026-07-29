"use client";

import { cn } from "@/lib/utils";
import {
  Brain,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
} from "lucide-react";

type AccountingTrialBalanceProps = {
  isBalanced?: boolean;
  newAccountsThisMonth?: number;
  unusualVariances?: number;
  negativeBalances?: number;
  aiSummary?: string;
  className?: string;
};

export function AccountingTrialBalance({
  isBalanced = true,
  newAccountsThisMonth = 2,
  unusualVariances = 3,
  negativeBalances = 0,
  aiSummary = "No structural issues detected. Three balances differ significantly from historical trends.",
  className,
}: AccountingTrialBalanceProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
            Trial Balance
          </h3>
        </div>
        <div
          className={cn(
            "flex items-center gap-1 rounded-md px-2 py-0.5",
            isBalanced ? "bg-balanced-green/10" : "bg-error-clay/10",
          )}
        >
          {isBalanced ? (
            <CheckCircle2 className="h-3 w-3 text-balanced-green" />
          ) : (
            <AlertTriangle className="h-3 w-3 text-error-clay" />
          )}
          <span
            className={cn(
              "text-[10px] font-medium",
              isBalanced ? "text-balanced-green" : "text-error-clay",
            )}
          >
            {isBalanced ? "Balanced" : "Unbalanced"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          {
            label: "New Accounts",
            value: newAccountsThisMonth.toString(),
            color: "text-signal-indigo bg-signal-indigo/10",
          },
          {
            label: "Unusual Variances",
            value: unusualVariances.toString(),
            color:
              unusualVariances > 0
                ? "text-attention-amber bg-attention-amber/10"
                : "text-balanced-green bg-balanced-green/10",
          },
          {
            label: "Negative Balances",
            value: negativeBalances.toString(),
            color:
              negativeBalances > 0
                ? "text-error-clay bg-error-clay/10"
                : "text-balanced-green bg-balanced-green/10",
          },
        ].map((item) => (
          <div
            key={item.label}
            className={cn(
              "rounded-lg border bg-card p-2.5 text-center",
              item.color,
            )}
          >
            <p className="text-sm font-bold">{item.value}</p>
            <p className="text-[9px] text-muted-foreground/60">{item.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-card p-3">
        <div className="flex items-center gap-1.5 mb-1">
          <Brain className="h-3.5 w-3.5 text-signal-indigo" />
          <span className="text-[10px] font-medium text-muted-foreground uppercase">
            AI Summary
          </span>
        </div>
        <p className="text-xs text-foreground/70">{aiSummary}</p>
        <button
          type="button"
          className="mt-1.5 inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-signal-indigo hover:bg-signal-indigo/10 transition-all"
        >
          View Details <ArrowRight className="h-2.5 w-2.5" />
        </button>
      </div>
    </div>
  );
}
