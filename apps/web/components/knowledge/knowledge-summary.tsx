"use client";

import { cn } from "@/lib/utils";
import { ShieldCheck, Brain, RefreshCw } from "lucide-react";

type KnowledgeSummaryProps = {
  companyMemory?: string;
  documentsIndexed?: number;
  pendingApprovals?: number;
  missingInformation?: number;
  aiUnderstanding?: number;
  className?: string;
};

export function KnowledgeSummary({
  companyMemory = "98%",
  documentsIndexed = 24842,
  pendingApprovals = 12,
  missingInformation = 8,
  aiUnderstanding = 96,
  className,
}: KnowledgeSummaryProps) {
  return (
    <div className={cn("space-y-5", className)}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
        <RefreshCw className="h-3 w-3" />
        <span>Your AI Finance Assistant indexed your company information.</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          {
            label: "Company Memory",
            value: companyMemory,
            color: "text-balanced-green",
          },
          {
            label: "Documents Indexed",
            value: `${(documentsIndexed / 1000).toFixed(1)}k`,
            color: "text-signal-indigo",
          },
          {
            label: "Pending Approvals",
            value: pendingApprovals.toString(),
            color:
              pendingApprovals > 10
                ? "text-attention-amber"
                : "text-balanced-green",
          },
          {
            label: "Missing Info",
            value: missingInformation.toString(),
            color:
              missingInformation > 0
                ? "text-attention-amber"
                : "text-balanced-green",
          },
          {
            label: "AI Understanding",
            value: `${aiUnderstanding}%`,
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

      {/* Company Memory progress */}
      <div className="flex items-center gap-2 px-1">
        <Brain className="h-3 w-3 text-muted-foreground/60" />
        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-signal-indigo to-balanced-green transition-all duration-700"
            style={{ width: `${aiUnderstanding}%` }}
          />
        </div>
        <span className="text-xs font-bold tabular-nums text-balanced-green shrink-0">
          {aiUnderstanding}% complete
        </span>
      </div>

      {/* Status badges */}
      <div className="flex flex-wrap items-center gap-2 px-1">
        {[
          {
            label: "Memory Health",
            value: companyMemory,
            color:
              "text-balanced-green bg-balanced-green/10 border-balanced-green/20",
          },
          {
            label: "AI Understanding",
            value: `${aiUnderstanding}%`,
            color:
              "text-signal-indigo bg-signal-indigo/10 border-signal-indigo/20",
          },
          {
            label: "Pending Approvals",
            value: pendingApprovals.toString(),
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
