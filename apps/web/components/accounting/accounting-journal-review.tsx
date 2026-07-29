"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import {
  FileText,
  Brain,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

type JournalEntry = {
  id: string;
  number: string;
  title: string;
  confidence: number;
  reason: string;
  action: string;
  amount?: number;
};

type AccountingJournalReviewProps = {
  entries?: JournalEntry[];
  className?: string;
};

const DEFAULT_ENTRIES: JournalEntry[] = [
  {
    id: "je1",
    number: "J-1023",
    title: "Accrued Expenses",
    confidence: 98,
    reason: "Automatically generated from recurring pattern",
    action: "Approve",
    amount: 45000,
  },
  {
    id: "je2",
    number: "J-1028",
    title: "Revenue Adjustment",
    confidence: 71,
    reason: "Unusual transaction amount detected",
    action: "Review",
    amount: 12000,
  },
  {
    id: "je3",
    number: "J-1035",
    title: "Depreciation",
    confidence: 100,
    reason: "Standard monthly depreciation schedule",
    action: "Approve",
    amount: 18400,
  },
  {
    id: "je4",
    number: "J-1042",
    title: "Intercompany Transfer",
    confidence: 65,
    reason: "Entity mismatch requires verification",
    action: "Review",
    amount: 35000,
  },
];

export function AccountingJournalReview({
  entries = DEFAULT_ENTRIES,
  className,
}: AccountingJournalReviewProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
            Journal Review
          </h3>
        </div>
        <span className="text-[10px] text-attention-amber font-medium">
          {entries.filter((e) => e.confidence < 90).length} need attention
        </span>
      </div>

      <div className="space-y-1.5">
        {entries.map((entry) => {
          const isSelected = selectedId === entry.id;
          return (
            <div
              key={entry.id}
              className={cn(
                "rounded-lg border bg-card p-3 transition-all hover:shadow-sm",
                isSelected && "ring-1 ring-signal-indigo/30",
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-medium text-foreground/80">
                      {entry.number}
                    </span>
                    <span className="text-[10px] text-muted-foreground/50">
                      —
                    </span>
                    <span className="text-xs text-muted-foreground/70">
                      {entry.title}
                    </span>
                  </div>
                  {entry.amount && (
                    <p className="text-xs font-bold tabular-nums mt-0.5">
                      {formatCurrency(entry.amount)}
                    </p>
                  )}
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                    {entry.reason}
                  </p>
                </div>

                <div className="text-right shrink-0 ml-3">
                  <div
                    className={cn(
                      "text-xs font-bold tabular-nums",
                      entry.confidence >= 90
                        ? "text-balanced-green"
                        : entry.confidence >= 70
                          ? "text-attention-amber"
                          : "text-error-clay",
                    )}
                  >
                    {entry.confidence}%
                  </div>
                  <div className="text-[9px] text-muted-foreground/50">
                    confidence
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 mt-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedId(isSelected ? null : entry.id)}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium transition-all",
                    entry.action === "Approve"
                      ? "bg-balanced-green/10 text-balanced-green hover:bg-balanced-green/20"
                      : "bg-attention-amber/10 text-attention-amber hover:bg-attention-amber/20",
                  )}
                >
                  {entry.action === "Approve" ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : (
                    <AlertTriangle className="h-3 w-3" />
                  )}
                  {entry.action} <ArrowRight className="h-2.5 w-2.5" />
                </button>
              </div>

              {isSelected && (
                <div className="mt-2.5 rounded-md bg-muted/20 border px-2.5 py-2 text-[10px] text-muted-foreground/70 leading-relaxed">
                  <p className="font-medium text-foreground/80 mb-0.5">
                    AI Analysis
                  </p>
                  <p>
                    {entry.reason}. Confidence: {entry.confidence}%. Recommended
                    action: {entry.action.toLowerCase()} based on{" "}
                    {entry.confidence >= 90
                      ? "high pattern match with historical entries"
                      : "unusual characteristics requiring human judgment"}
                    .
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
