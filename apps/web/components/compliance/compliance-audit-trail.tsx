"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Clock,
  CheckCircle2,
  FileText,
  Brain,
  RefreshCw,
  Search,
} from "lucide-react";

type AuditEntry = {
  id: string;
  time: string;
  action: string;
  type: "reviewed" | "approved" | "generated" | "completed" | "explained";
  explanation?: string;
};

const AUDIT_ENTRIES: AuditEntry[] = [
  {
    id: "e1",
    time: "10:42",
    action: "AI reviewed 842 transactions for compliance",
    type: "reviewed",
    explanation:
      "All transactions cross-checked against tax codes and accounting policies. No material issues found.",
  },
  {
    id: "e2",
    time: "09:18",
    action: "User approved journal J-2048",
    type: "approved",
    explanation:
      "Monthly software subscription accrual of $4,200 approved by FD.",
  },
  {
    id: "e3",
    time: "Yesterday, 16:30",
    action: "VAT report generated for Q3 2026",
    type: "generated",
    explanation:
      "VAT return prepared from reconciled sales and purchase data. Estimated liability: $42,800.",
  },
  {
    id: "e4",
    time: "Yesterday, 14:20",
    action: "Bank reconciliation completed",
    type: "completed",
    explanation:
      "GTBank account reconciled — 2,348 transactions matched, 12 exceptions for review.",
  },
];

const ENTRY_ICONS: Record<string, React.ReactNode> = {
  reviewed: <Search className="h-3 w-3" />,
  approved: <CheckCircle2 className="h-3 w-3" />,
  generated: <FileText className="h-3 w-3" />,
  completed: <RefreshCw className="h-3 w-3" />,
  explained: <Brain className="h-3 w-3" />,
};

const ENTRY_COLORS: Record<string, string> = {
  reviewed: "bg-indigo-500/10 text-indigo-600",
  approved: "bg-emerald-500/10 text-emerald-600",
  generated: "bg-amber-500/10 text-amber-600",
  completed: "bg-blue-500/10 text-blue-600",
  explained: "bg-purple-500/10 text-purple-600",
};

export function ComplianceAuditTrail() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-medium">Audit Trail</h3>
      </div>
      <div className="divide-y">
        {AUDIT_ENTRIES.map((entry) => (
          <div key={entry.id}>
            <button
              onClick={() =>
                setExpandedId(expandedId === entry.id ? null : entry.id)
              }
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-accent/50"
            >
              <div
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full",
                  ENTRY_COLORS[entry.type],
                )}
              >
                {ENTRY_ICONS[entry.type]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-foreground">{entry.action}</p>
              </div>
              <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                {entry.time}
              </span>
            </button>

            {/* AI Explanation */}
            {expandedId === entry.id && entry.explanation && (
              <div className="border-t bg-accent/30 px-4 py-2.5">
                <div className="flex items-start gap-2">
                  <Brain className="h-3 w-3 text-signal-indigo mt-0.5 shrink-0" />
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    {entry.explanation}
                  </p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      <button className="flex w-full items-center justify-center border-t px-4 py-2 text-[10px] font-medium text-muted-foreground hover:bg-accent/50 transition-colors">
        View full audit trail
      </button>
    </div>
  );
}
