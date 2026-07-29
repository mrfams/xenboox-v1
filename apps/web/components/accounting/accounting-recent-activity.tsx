"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Clock,
  CheckCircle2,
  FileText,
  DollarSign,
  BarChart3,
  RefreshCw,
} from "lucide-react";

type ActivityEntry = {
  id: string;
  time: string;
  action: string;
  type:
    | "reconciled"
    | "posted"
    | "prepared"
    | "generated"
    | "updated"
    | "reviewed";
};

const ACTIVITY_ENTRIES: ActivityEntry[] = [
  {
    id: "a1",
    time: "09:12",
    action: "AI reconciled bank accounts",
    type: "reconciled",
  },
  {
    id: "a2",
    time: "09:35",
    action: "Depreciation posted successfully",
    type: "posted",
  },
  {
    id: "a3",
    time: "10:08",
    action: "Revenue journal prepared for review",
    type: "prepared",
  },
  {
    id: "a4",
    time: "10:46",
    action: "Financial statements generated",
    type: "generated",
  },
  {
    id: "a5",
    time: "11:12",
    action: "Month-end progress updated to 82%",
    type: "updated",
  },
];

const ENTRY_ICONS: Record<string, React.ReactNode> = {
  reconciled: <CheckCircle2 className="h-3 w-3" />,
  posted: <DollarSign className="h-3 w-3" />,
  prepared: <FileText className="h-3 w-3" />,
  generated: <BarChart3 className="h-3 w-3" />,
  updated: <RefreshCw className="h-3 w-3" />,
};

const ENTRY_COLORS: Record<string, string> = {
  reconciled: "bg-emerald-500/10 text-emerald-600",
  posted: "bg-blue-500/10 text-blue-600",
  prepared: "bg-amber-500/10 text-amber-600",
  generated: "bg-indigo-500/10 text-indigo-600",
  updated: "bg-sky-500/10 text-sky-600",
};

export function AccountingRecentActivity() {
  const [entries] = useState(ACTIVITY_ENTRIES);

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-medium">Recent Accounting Activity</h3>
      </div>
      <div className="divide-y">
        {entries.map((entry, idx) => (
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
              <p className="text-sm text-foreground">{entry.action}</p>
            </div>
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
              {entry.time}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
