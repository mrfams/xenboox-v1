"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  Clock,
  FileText,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Search,
  Bot,
} from "lucide-react";

type TimelineEntry = {
  id: string;
  time: string;
  action: string;
  type: "report" | "analysis" | "alert" | "task" | "review";
};

type CFOTimelineProps = {
  entries?: TimelineEntry[];
  className?: string;
};

const ENTRY_ICONS = {
  report: FileText,
  analysis: TrendingUp,
  alert: AlertTriangle,
  task: CheckCircle2,
  review: Search,
} as const;

const ENTRY_COLORS = {
  report: "text-signal-indigo bg-signal-indigo/10",
  analysis: "text-balanced-green bg-balanced-green-bg",
  alert: "text-attention-amber bg-attention-amber-bg",
  task: "text-emerald-500 bg-emerald-500/10",
  review: "text-purple-500 bg-purple-500/10",
} as const;

const DEFAULT_ENTRIES: TimelineEntry[] = [
  {
    id: "tl-1",
    time: "09:10",
    action: "Prepared management accounts",
    type: "report",
  },
  {
    id: "tl-2",
    time: "09:42",
    action: "Detected duplicate payment of GMD 12,500",
    type: "alert",
  },
  {
    id: "tl-3",
    time: "10:15",
    action: "Generated board report with quarterly highlights",
    type: "report",
  },
  {
    id: "tl-4",
    time: "11:08",
    action: "Forecasted cash flow for next 90 days",
    type: "analysis",
  },
  {
    id: "tl-5",
    time: "11:45",
    action: "Reviewed 15 journal entries for accuracy",
    type: "review",
  },
  {
    id: "tl-6",
    time: "12:30",
    action: "Reconciled GTBank transactions (42 matched)",
    type: "task",
  },
  {
    id: "tl-7",
    time: "13:15",
    action: "Flagged 4 overdue invoices for follow-up",
    type: "alert",
  },
  {
    id: "tl-8",
    time: "14:00",
    action: "Prepared VAT return draft for Q2",
    type: "report",
  },
];

export function CFOTimeline({
  entries = DEFAULT_ENTRIES,
  className,
}: CFOTimelineProps) {
  const grouped = useMemo(() => {
    const groups: { date: string; entries: TimelineEntry[] }[] = [];
    groups.push({ date: "Today", entries });
    return groups;
  }, [entries]);

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center gap-2 px-1">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
          AI Timeline
        </h3>
      </div>

      {grouped.map((group) => (
        <div key={group.date}>
          <div className="flex items-center gap-2 mb-2 px-1">
            <span className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider">
              {group.date}
            </span>
            <div className="h-px flex-1 bg-muted/50" />
          </div>

          <div className="relative space-y-0">
            {/* Timeline line */}
            <div className="absolute left-[13px] top-2 bottom-2 w-px bg-muted/40" />

            {group.entries.map((entry) => {
              const Icon = ENTRY_ICONS[entry.type];
              const colorClass = ENTRY_COLORS[entry.type];

              return (
                <div
                  key={entry.id}
                  className="relative flex items-start gap-3 pb-3 pl-0"
                >
                  {/* Timeline dot */}
                  <div
                    className={cn(
                      "relative z-10 flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full",
                      colorClass,
                    )}
                  >
                    <Icon className="h-3 w-3" />
                  </div>

                  <div className="flex-1 min-w-0 pt-0.5">
                    <p className="text-xs text-foreground/80 leading-relaxed">
                      {entry.action}
                    </p>
                    <span className="text-[10px] text-muted-foreground/50">
                      {entry.time}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
