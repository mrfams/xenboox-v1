"use client";

import { useState } from "react";
import { Bot } from "lucide-react";

import { trpc } from "@/lib/trpc/client";

// ─── Daily Close Status Component ─────────────────────────────────────────
// Shows the status of today's daily close run with transaction stats
// and auto-match rate. Polls every 30s for real-time updates.

export function DailyCloseStatus() {
  const [today, setToday] = useState(
    () => new Date().toISOString().split("T")[0]!,
  );

  const { data: todayRun, isLoading: todayLoading } =
    trpc.dailyClose.getToday.useQuery(undefined, { refetchInterval: 30_000 });

  const { data: stats, isLoading: statsLoading } =
    trpc.dailyClose.getStats.useQuery();

  if (todayLoading || statsLoading) {
    return (
      <div className="rounded-xl border bg-card p-4 animate-pulse">
        <div className="h-4 bg-muted rounded w-48 mb-2" />
        <div className="h-3 bg-muted rounded w-32" />
      </div>
    );
  }

  const statusColor = !todayRun
    ? "text-muted-foreground"
    : todayRun.status === "completed"
      ? "text-emerald-500"
      : todayRun.status === "exception"
        ? "text-amber-500"
        : todayRun.status === "failed"
          ? "text-red-500"
          : "text-blue-500";

  const statusLabel = !todayRun
    ? "Not yet run"
    : todayRun.status === "completed"
      ? "All clear"
      : todayRun.status === "exception"
        ? `${todayRun.exceptions?.length ?? 0} exception(s)`
        : todayRun.status === "failed"
          ? "Failed"
          : "In progress";

  return (
    <div
      className="rounded-xl border bg-card p-4"
      role="region"
      aria-label="Daily Close Status"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" aria-hidden="true" />
          <span className="text-sm font-medium">Daily Close</span>
        </div>
        <span
          className={`text-xs font-medium ${statusColor}`}
          aria-live="polite"
        >
          {statusLabel}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-3 text-center">
        <div>
          <div className="text-lg font-bold">{stats?.completed ?? 0}</div>
          <div className="text-[10px] text-muted-foreground">Completed</div>
        </div>
        <div>
          <div className="text-lg font-bold text-amber-500">
            {stats?.exceptions ?? 0}
          </div>
          <div className="text-[10px] text-muted-foreground">Exceptions</div>
        </div>
        <div>
          <div className="text-lg font-bold">
            {stats?.totalTransactions ?? 0}
          </div>
          <div className="text-[10px] text-muted-foreground">Transactions</div>
        </div>
        <div>
          <div className="text-lg font-bold text-emerald-500">
            {stats ? Math.round(stats.autoMatchRate * 100) : 0}%
          </div>
          <div className="group relative text-[10px] text-muted-foreground">
            Auto-matched
            <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-popover px-3 py-1.5 text-xs text-popover-foreground shadow-md opacity-0 transition-opacity group-hover:opacity-100">
              Transactions automatically matched to bank statements by AI
            </div>
          </div>
        </div>
      </div>

      {todayRun && todayRun.status === "exception" && todayRun.exceptions && (
        <div className="mt-3 space-y-1">
          {(todayRun.exceptions as any[])
            .slice(0, 3)
            .map((ex: any, i: number) => (
              <div
                key={i}
                className="flex items-center gap-2 text-xs text-amber-600"
              >
                <span>⚠️</span>
                <span className="truncate">{ex.description}</span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
