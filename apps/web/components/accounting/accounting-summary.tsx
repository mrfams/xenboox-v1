"use client";

import { cn } from "@/lib/utils";
import { ShieldCheck, RefreshCw } from "lucide-react";

type AccountingSummaryProps = {
  bookHealth?: string;
  monthEndProgress?: number;
  openJournalReviews?: number;
  unreconciledAccounts?: number;
  closeReadiness?: string;
  className?: string;
};

export function AccountingSummary({
  bookHealth = "98% Complete",
  monthEndProgress = 82,
  openJournalReviews = 7,
  unreconciledAccounts = 3,
  closeReadiness = "High",
  className,
}: AccountingSummaryProps) {
  return (
    <div className={cn("space-y-5", className)}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
        <RefreshCw className="h-3 w-3" />
        <span>Your AI Controller reviewed your books.</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          {
            label: "Book Health",
            value: bookHealth,
            color: "text-balanced-green",
          },
          {
            label: "Month-End Progress",
            value: `${monthEndProgress}%`,
            color: "text-signal-indigo",
          },
          {
            label: "Open Journal Reviews",
            value: openJournalReviews.toString(),
            color:
              openJournalReviews > 5
                ? "text-attention-amber"
                : "text-balanced-green",
          },
          {
            label: "Unreconciled Accounts",
            value: unreconciledAccounts.toString(),
            color:
              unreconciledAccounts > 0
                ? "text-attention-amber"
                : "text-balanced-green",
          },
          {
            label: "Close Readiness",
            value: closeReadiness,
            color: "text-balanced-green",
          },
        ].map((item) => (
          <div key={item.label} className="rounded-lg border bg-card p-3">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              {item.label}
            </p>
            <p className={cn("text-lg font-bold mt-1", item.color)}>
              {item.value}
            </p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 px-1">
        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-signal-indigo to-balanced-green transition-all duration-700"
            style={{ width: `${monthEndProgress}%` }}
          />
        </div>
        <span className="text-xs font-bold tabular-nums text-signal-indigo shrink-0">
          {monthEndProgress}% complete
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 px-1">
        {[
          {
            label: "Book Health",
            value: bookHealth,
            color:
              "text-balanced-green bg-balanced-green/10 border-balanced-green/20",
          },
          {
            label: "Close Readiness",
            value: closeReadiness,
            color:
              "text-signal-indigo bg-signal-indigo/10 border-signal-indigo/20",
          },
          {
            label: "Reviews Needed",
            value: openJournalReviews.toString(),
            color:
              "text-attention-amber bg-attention-amber/10 border-attention-amber/20",
          },
        ].map((badge) => (
          <div
            key={badge.label}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10px] font-medium",
              badge.color,
            )}
          >
            <ShieldCheck className="h-3 w-3" />
            <span>{badge.label}</span>
            <span className="opacity-60">·</span>
            <span>{badge.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
