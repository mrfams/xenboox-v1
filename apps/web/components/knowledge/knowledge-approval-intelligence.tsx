"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, Brain, ArrowRight, X } from "lucide-react";

type ApprovalItem = {
  id: string;
  title: string;
  amount: string;
  recommendation: "approve" | "review" | "reject";
  reason: string;
  confidence: number;
};

const DEFAULT_APPROVALS: ApprovalItem[] = [
  {
    id: "a1",
    title: "AWS — Monthly Infrastructure",
    amount: "$8,400",
    recommendation: "approve",
    reason: "Recurring expense, within budget, normal vendor pattern",
    confidence: 99,
  },
  {
    id: "a2",
    title: "New Software License — Design Tools",
    amount: "$24,000/year",
    recommendation: "reject",
    reason:
      "Cost increased 40%, similar tool already licensed, budget exceeded",
    confidence: 94,
  },
  {
    id: "a3",
    title: "Marketing Campaign — Q4 Launch",
    amount: "$18,500",
    recommendation: "review",
    reason: "Above approval threshold ($10k), manual review required",
    confidence: 88,
  },
];

const RECO_COLORS: Record<string, string> = {
  approve: "bg-balanced-green/10 text-balanced-green border-balanced-green/20",
  review:
    "bg-attention-amber/10 text-attention-amber border-attention-amber/20",
  reject: "bg-error-clay/10 text-error-clay border-error-clay/20",
};

const RECO_LABELS: Record<string, string> = {
  approve: "Approve ✅",
  review: "Review ⚠",
  reject: "Reject ✕",
};

export function KnowledgeApprovalIntelligence() {
  const [approvals, setApprovals] = useState(DEFAULT_APPROVALS);

  const dismissApproval = (id: string) => {
    setApprovals((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium">Approval Intelligence</h3>
        </div>
        <span className="text-[9px] text-muted-foreground">
          {approvals.length} decisions waiting
        </span>
      </div>

      <div className="divide-y">
        {approvals.map((item) => (
          <div
            key={item.id}
            className="px-4 py-3 transition-colors hover:bg-accent/30"
          >
            <div className="flex items-start justify-between mb-1.5">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium">{item.title}</span>
                  <span
                    className={cn(
                      "rounded-full border px-1.5 py-0.5 text-[9px] font-medium",
                      RECO_COLORS[item.recommendation],
                    )}
                  >
                    {RECO_LABELS[item.recommendation]}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {item.amount}
                </p>
              </div>
              <button
                onClick={() => dismissApproval(item.id)}
                className="ml-2 flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-accent group-hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
            </div>

            {/* AI Review */}
            <div className="rounded-lg bg-accent/30 p-2.5">
              <div className="flex items-start gap-2">
                <Brain className="h-3 w-3 text-signal-indigo mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-[10px] text-muted-foreground">
                    {item.reason}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px] text-muted-foreground">
                      Confidence
                    </span>
                    <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden max-w-[60px]">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          item.confidence >= 95
                            ? "bg-balanced-green"
                            : item.confidence >= 85
                              ? "bg-attention-amber"
                              : "bg-error-clay",
                        )}
                        style={{ width: `${item.confidence}%` }}
                      />
                    </div>
                    <span className="text-[9px] font-bold tabular-nums">
                      {item.confidence}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 mt-2">
              {item.recommendation === "approve" && (
                <button className="rounded-lg bg-balanced-green/10 px-2.5 py-1 text-[10px] font-medium text-balanced-green hover:bg-balanced-green/20 transition-colors">
                  Approve
                </button>
              )}
              {item.recommendation === "reject" && (
                <button className="rounded-lg bg-error-clay/10 px-2.5 py-1 text-[10px] font-medium text-error-clay hover:bg-error-clay/20 transition-colors">
                  Reject
                </button>
              )}
              <button className="flex items-center gap-0.5 text-[10px] font-medium text-signal-indigo hover:underline">
                Review details <ArrowRight className="h-2.5 w-2.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
