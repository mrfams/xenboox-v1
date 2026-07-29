"use client";

import { cn } from "@/lib/utils";
import { ShieldCheck, RefreshCw } from "lucide-react";

type ComplianceSummaryProps = {
  complianceHealth?: string;
  taxReadiness?: string;
  auditReadiness?: number;
  openRisks?: number;
  upcomingDeadlines?: number;
  className?: string;
};

export function ComplianceSummary({
  complianceHealth = "96%",
  taxReadiness = "Ready",
  auditReadiness = 92,
  openRisks = 3,
  upcomingDeadlines = 2,
  className,
}: ComplianceSummaryProps) {
  return (
    <div className={cn("space-y-5", className)}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
        <RefreshCw className="h-3 w-3" />
        <span>Your AI Compliance Officer reviewed your company.</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          {
            label: "Compliance Health",
            value: complianceHealth,
            color: "text-balanced-green",
          },
          {
            label: "Tax Readiness",
            value: taxReadiness,
            color: "text-balanced-green",
          },
          {
            label: "Audit Readiness",
            value: `${auditReadiness}%`,
            color:
              auditReadiness >= 90
                ? "text-balanced-green"
                : "text-attention-amber",
          },
          {
            label: "Open Risks",
            value: openRisks.toString(),
            color:
              openRisks > 0 ? "text-attention-amber" : "text-balanced-green",
          },
          {
            label: "Upcoming Deadlines",
            value: upcomingDeadlines.toString(),
            color:
              upcomingDeadlines > 0
                ? "text-signal-indigo"
                : "text-balanced-green",
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

      {/* Audit Readiness progress bar */}
      <div className="flex items-center gap-2 px-1">
        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-signal-indigo to-balanced-green transition-all duration-700"
            style={{ width: `${auditReadiness}%` }}
          />
        </div>
        <span className="text-xs font-bold tabular-nums text-signal-indigo shrink-0">
          {auditReadiness}% audit ready
        </span>
      </div>

      {/* Status badges */}
      <div className="flex flex-wrap items-center gap-2 px-1">
        {[
          {
            label: "Compliance Health",
            value: complianceHealth,
            color:
              "text-balanced-green bg-balanced-green/10 border-balanced-green/20",
          },
          {
            label: "Tax Status",
            value: taxReadiness,
            color:
              "text-signal-indigo bg-signal-indigo/10 border-signal-indigo/20",
          },
          {
            label: "Open Risks",
            value: openRisks.toString(),
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
