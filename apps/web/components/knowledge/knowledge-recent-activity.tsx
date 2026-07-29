"use client";

import React from "react";
import { cn } from "@/lib/utils";
import {
  Clock,
  CheckCircle2,
  FileText,
  Brain,
  Search,
  RefreshCw,
} from "lucide-react";

type ActivityEntry = {
  id: string;
  time: string;
  action: string;
  type: "extracted" | "detected" | "prevented" | "analyzed" | "updated";
};

const ACTIVITY_ENTRIES: ActivityEntry[] = [
  {
    id: "a1",
    time: "10:42",
    action: "AI extracted invoice details from 12 PDFs",
    type: "extracted",
  },
  {
    id: "a2",
    time: "10:18",
    action: "Contract renewal detected — Zoom Enterprise",
    type: "detected",
  },
  {
    id: "a3",
    time: "09:50",
    action: "Duplicate document prevented — Invoice #4021",
    type: "prevented",
  },
  {
    id: "a4",
    time: "09:15",
    action: "Approval risk analyzed — New software license",
    type: "analyzed",
  },
  {
    id: "a5",
    time: "Yesterday",
    action: "Expense policy updated with new travel limits",
    type: "updated",
  },
];

const ENTRY_ICONS: Record<string, React.ReactNode> = {
  extracted: <FileText className="h-3 w-3" />,
  detected: <Search className="h-3 w-3" />,
  prevented: <CheckCircle2 className="h-3 w-3" />,
  analyzed: <Brain className="h-3 w-3" />,
  updated: <RefreshCw className="h-3 w-3" />,
};

const ENTRY_COLORS: Record<string, string> = {
  extracted: "bg-indigo-500/10 text-indigo-600",
  detected: "bg-amber-500/10 text-amber-600",
  prevented: "bg-emerald-500/10 text-emerald-600",
  analyzed: "bg-purple-500/10 text-purple-600",
  updated: "bg-blue-500/10 text-blue-600",
};

export function KnowledgeRecentActivity() {
  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-medium">Recent AI Activity</h3>
      </div>
      <div className="divide-y">
        {ACTIVITY_ENTRIES.map((entry, idx) => (
          <div
            key={entry.id}
            className={cn(
              "flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-accent/50",
              idx === 0 && "bg-accent/30",
            )}
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
          </div>
        ))}
      </div>
    </div>
  );
}
