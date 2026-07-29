"use client";

import { cn } from "@/lib/utils";
import { CalendarDays, ArrowRight } from "lucide-react";

type FilingItem = {
  date: string;
  label: string;
  progress: number;
  status: "ready" | "needs-review" | "planning";
};

const FILING_ITEMS: FilingItem[] = [
  { date: "September 15", label: "VAT Return", progress: 100, status: "ready" },
  {
    date: "October 10",
    label: "Payroll Tax",
    progress: 72,
    status: "needs-review",
  },
  {
    date: "March 31",
    label: "Corporate Tax",
    progress: 28,
    status: "planning",
  },
];

const STATUS_COLORS: Record<string, string> = {
  ready: "text-balanced-green",
  "needs-review": "text-attention-amber",
  planning: "text-muted-foreground",
};

const STATUS_BG: Record<string, string> = {
  ready: "bg-balanced-green/10",
  "needs-review": "bg-attention-amber/10",
  planning: "bg-muted",
};

const PROGRESS_COLORS: Record<string, string> = {
  ready: "bg-balanced-green",
  "needs-review": "bg-attention-amber",
  planning: "bg-muted-foreground/30",
};

export function ComplianceFilingCalendar() {
  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <CalendarDays className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-medium">Filing Calendar</h3>
      </div>
      <div className="divide-y">
        {FILING_ITEMS.map((item) => (
          <div
            key={item.label}
            className="px-4 py-3 transition-colors hover:bg-accent/30"
          >
            <div className="flex items-center justify-between mb-1.5">
              <div>
                <span className="text-xs font-medium">{item.label}</span>
                <span className="text-[10px] text-muted-foreground ml-2">
                  {item.date}
                </span>
              </div>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[9px] font-medium",
                  STATUS_BG[item.status],
                  STATUS_COLORS[item.status],
                )}
              >
                {item.status === "ready"
                  ? "Ready"
                  : item.status === "needs-review"
                    ? "Needs Review"
                    : "Planning"}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-700",
                  PROGRESS_COLORS[item.status],
                )}
                style={{ width: `${item.progress}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <button className="flex w-full items-center justify-center gap-1 border-t px-4 py-2 text-[10px] font-medium text-muted-foreground hover:bg-accent/50 transition-colors">
        View full calendar <ArrowRight className="h-3 w-3" />
      </button>
    </div>
  );
}
