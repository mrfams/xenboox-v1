"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  CalendarDays,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";

const URGENCY_COLORS = {
  normal: {
    bg: "bg-blue-50 border-blue-200",
    text: "text-blue-700",
    dot: "bg-blue-500",
    label: "On track",
  },
  approaching: {
    bg: "bg-amber-50 border-amber-200",
    text: "text-amber-700",
    dot: "bg-amber-500",
    label: "Approaching",
  },
  critical: {
    bg: "bg-red-50 border-red-200",
    text: "text-red-700",
    dot: "bg-red-500",
    label: "Critical",
  },
  overdue: {
    bg: "bg-rose-50 border-rose-300",
    text: "text-rose-800",
    dot: "bg-rose-600",
    label: "Overdue",
  },
};

function CountdownBadge({ days }: { days: number }) {
  const absDays = Math.abs(days);
  if (days <= 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
        <AlertTriangle className="h-3 w-3" />
        {absDays === 0 ? "Due today" : `${absDays}d overdue`}
      </span>
    );
  }
  if (days <= 7) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">
        <Clock className="h-3 w-3" />
        {days}d left
      </span>
    );
  }
  if (days <= 14) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
        <Clock className="h-3 w-3" />
        {days}d left
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
      <CheckCircle2 className="h-3 w-3" />
      {days}d left
    </span>
  );
}

export function ComplianceLivenessCalendar() {
  const { data: deadlines, isLoading } =
    trpc.complianceLiveness.listDeadlines.useQuery(undefined, {
      refetchInterval: 60_000,
    });

  const { data: stats } = trpc.complianceLiveness.getDeadlineStats.useQuery(
    undefined,
    {
      refetchInterval: 60_000,
    },
  );

  const sorted = useMemo(() => {
    if (!deadlines) return [];
    return [...deadlines].sort((a, b) => a.daysUntilDue - b.daysUntilDue);
  }, [deadlines]);

  if (isLoading) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-48 rounded bg-muted" />
          <div className="h-8 w-full rounded bg-muted" />
          <div className="h-8 w-full rounded bg-muted" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium">Compliance Calendar</h3>
        </div>
        {stats && (
          <div className="flex items-center gap-2">
            {stats.critical > 0 && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                {stats.critical} critical
              </span>
            )}
            {stats.approaching > 0 && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                {stats.approaching} approaching
              </span>
            )}
            {stats.overdue > 0 && (
              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                {stats.overdue} overdue
              </span>
            )}
          </div>
        )}
      </div>

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
          <CheckCircle2 className="h-8 w-8 text-green-500" />
          <p className="text-sm text-muted-foreground">
            No compliance deadlines tracked
          </p>
        </div>
      ) : (
        <div className="divide-y">
          {sorted.map((d) => {
            const colors = URGENCY_COLORS[d.urgency];
            return (
              <div
                key={d.id}
                className={cn(
                  "border-l-2 px-4 py-3 transition-colors hover:bg-accent/30",
                  colors.bg,
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={cn(
                        "h-2 w-2 shrink-0 rounded-full",
                        colors.dot,
                      )}
                    />
                    <div className="min-w-0">
                      <span className="text-xs font-medium truncate block">
                        {d.name}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {d.jurisdiction} · {d.filingType}
                      </span>
                    </div>
                  </div>
                  <CountdownBadge days={d.daysUntilDue} />
                </div>

                <div className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground">
                  <span>Due: {new Date(d.dueDate).toLocaleDateString()}</span>
                  {d.packageReady && (
                    <span className="text-green-600">Package ready</span>
                  )}
                  {d.taxAgentReviewStatus === "passed" && (
                    <span className="text-green-600">Review passed</span>
                  )}
                  {d.taxAgentReviewStatus === "kicked_back" && (
                    <span className="text-red-600">Needs revision</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between border-t px-4 py-2 text-[10px] text-muted-foreground">
        <span>Auto-refreshes every 60s</span>
        <span className="flex items-center gap-1">
          Live countdown
          <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
        </span>
      </div>
    </div>
  );
}
