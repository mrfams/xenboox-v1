"use client";

import React from "react";
import { cn } from "@/lib/utils";
import {
  ShieldCheck,
  Brain,
  RefreshCw,
  Sparkles,
  FileText,
  Receipt,
  Building2,
  CreditCard,
  Users,
  Landmark,
} from "lucide-react";

type KnowledgeSummaryProps = {
  companyMemory?: string;
  documentsIndexed?: number;
  pendingApprovals?: number;
  missingInformation?: number;
  aiUnderstanding?: number;
  className?: string;
};

const RECENTLY_LEARNED = [
  {
    text: "New supplier agreement — ABC Corp",
    time: "2 hours ago",
    color: "bg-blue-500/10 text-blue-600",
  },
  {
    text: "Updated expense policy — travel limits increased",
    time: "5 hours ago",
    color: "bg-emerald-500/10 text-emerald-600",
  },
  {
    text: "Tax document uploaded — Q2 2026 filings",
    time: "Yesterday",
    color: "bg-violet-500/10 text-violet-600",
  },
];

const AI_KNOWLEDGE_BREAKDOWN = [
  { icon: "receipt", label: "Invoices", value: "4,820" },
  { icon: "file", label: "Supplier docs", value: "1,240" },
  { icon: "building", label: "Contracts", value: "842" },
  { icon: "card", label: "Receipts", value: "12.4k" },
  { icon: "bank", label: "Bank statements", value: "48" },
  { icon: "users", label: "Payroll records", value: "230" },
];

const ICON_MAP: Record<string, React.ReactNode> = {
  receipt: <Receipt className="h-3 w-3" />,
  file: <FileText className="h-3 w-3" />,
  building: <Building2 className="h-3 w-3" />,
  card: <CreditCard className="h-3 w-3" />,
  bank: <Landmark className="h-3 w-3" />,
  users: <Users className="h-3 w-3" />,
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
      {/* Hero header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Knowledge Center
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your AI Finance Assistant indexed your company information.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border bg-balanced-green/5 px-3 py-2">
          <Sparkles className="h-4 w-4 text-balanced-green" />
          <span className="text-sm font-semibold text-balanced-green">
            Company Memory {companyMemory} Complete ✅
          </span>
        </div>
      </div>

      {/* AI Knowledge Breakdown */}
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Brain className="h-4 w-4 text-signal-indigo" />
          <span className="text-xs font-semibold text-foreground">
            Your AI understands:
          </span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {" "}
          {AI_KNOWLEDGE_BREAKDOWN.map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-1.5 rounded-lg bg-accent/30 px-2.5 py-2"
            >
              <span className="text-muted-foreground">
                {ICON_MAP[item.icon]}
              </span>
              <div>
                <p className="text-[10px] font-bold tabular-nums text-foreground">
                  {item.value}
                </p>
                <p className="text-[8px] text-muted-foreground">{item.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recently Learned */}
      <div className="rounded-lg border bg-card p-3">
        <div className="flex items-center gap-2 mb-2">
          <RefreshCw className="h-3.5 w-3.5 text-signal-indigo" />
          <span className="text-[11px] font-semibold text-foreground">
            Recently learned
          </span>
        </div>
        <div className="space-y-1.5">
          {RECENTLY_LEARNED.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between rounded-lg px-3 py-1.5 transition-colors hover:bg-accent/50"
            >
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full",
                    item.color,
                  )}
                >
                  <RefreshCw className="h-2.5 w-2.5" />
                </div>
                <span className="text-xs text-foreground">{item.text}</span>
              </div>
              <span className="text-[9px] text-muted-foreground shrink-0 ml-2">
                {item.time}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Main metrics cards */}
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
