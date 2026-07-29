"use client";

import { cn } from "@/lib/utils";
import {
  Heart,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Brain,
} from "lucide-react";

type AccountingBookHealthProps = {
  transactions?: number;
  categorized?: number;
  matched?: number;
  journalExceptions?: number;
  duplicateEntries?: number;
  outOfBalance?: number;
  aiConfidence?: number;
  className?: string;
};

export function AccountingBookHealth({
  transactions = 3842,
  categorized = 99,
  matched = 97,
  journalExceptions = 7,
  duplicateEntries = 0,
  outOfBalance = 0,
  aiConfidence = 98,
  className,
}: AccountingBookHealthProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center gap-2 px-1">
        <Heart className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
          Book Health
        </h3>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {[
          {
            label: "Transactions",
            value: transactions.toLocaleString(),
            icon: CheckCircle2,
            color: "text-balanced-green bg-balanced-green/10",
          },
          {
            label: "Categorized",
            value: `${categorized}%`,
            icon: CheckCircle2,
            color:
              categorized >= 95
                ? "text-balanced-green bg-balanced-green/10"
                : "text-attention-amber bg-attention-amber/10",
          },
          {
            label: "Matched",
            value: `${matched}%`,
            icon: CheckCircle2,
            color:
              matched >= 95
                ? "text-balanced-green bg-balanced-green/10"
                : "text-attention-amber bg-attention-amber/10",
          },
          {
            label: "Exceptions",
            value: journalExceptions.toString(),
            icon: AlertTriangle,
            color:
              journalExceptions > 0
                ? "text-attention-amber bg-attention-amber/10"
                : "text-balanced-green bg-balanced-green/10",
          },
          {
            label: "Duplicates",
            value: duplicateEntries.toString(),
            icon: XCircle,
            color:
              duplicateEntries > 0
                ? "text-error-clay bg-error-clay/10"
                : "text-balanced-green bg-balanced-green/10",
          },
          {
            label: "Out-of-Balance",
            value: outOfBalance.toString(),
            icon: XCircle,
            color:
              outOfBalance > 0
                ? "text-error-clay bg-error-clay/10"
                : "text-balanced-green bg-balanced-green/10",
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className={cn(
                "flex items-center gap-2 rounded-lg border bg-card px-3 py-2.5",
                item.color,
              )}
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-inherit">
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div>
                <p className="text-xs font-bold">{item.value}</p>
                <p className="text-[9px] text-muted-foreground/60">
                  {item.label}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border bg-card p-3.5">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <Brain className="h-3.5 w-3.5 text-signal-indigo" />
            <span className="text-[10px] font-medium text-muted-foreground uppercase">
              AI Confidence
            </span>
          </div>
          <span className="text-xs font-bold tabular-nums text-balanced-green">
            {aiConfidence}%
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-signal-indigo to-balanced-green transition-all duration-500"
            style={{ width: `${aiConfidence}%` }}
          />
        </div>
      </div>
    </div>
  );
}
