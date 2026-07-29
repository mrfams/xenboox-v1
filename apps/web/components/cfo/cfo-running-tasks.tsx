"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Loader2, CheckCircle2, Clock } from "lucide-react";

type Task = {
  id: string;
  label: string;
  progress: number;
  estimatedRemaining?: string;
  status: "running" | "complete" | "queued";
};

type CFORunningTasksProps = {
  tasks?: Task[];
  className?: string;
};

const DEFAULT_TASKS: Task[] = [
  {
    id: "task-1",
    label: "Preparing Financial Statements",
    progress: 84,
    estimatedRemaining: "2 min remaining",
    status: "running",
  },
  {
    id: "task-2",
    label: "Reviewing Payroll",
    progress: 62,
    estimatedRemaining: "4 min remaining",
    status: "running",
  },
  {
    id: "task-3",
    label: "Forecasting Q4 Cash Flow",
    progress: 35,
    estimatedRemaining: "6 min remaining",
    status: "running",
  },
  {
    id: "task-4",
    label: "Generating Board Report",
    progress: 100,
    status: "complete",
  },
  {
    id: "task-5",
    label: "Reconciling Bank Transactions",
    progress: 100,
    status: "complete",
  },
];

export function CFORunningTasks({
  tasks = DEFAULT_TASKS,
  className,
}: CFORunningTasksProps) {
  const { running, completed } = useMemo(() => {
    const r = tasks.filter((t) => t.status === "running");
    const c = tasks.filter((t) => t.status === "complete");
    return { running: r, completed: c };
  }, [tasks]);

  if (tasks.length === 0) return null;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2 px-1">
        <Loader2 className="h-4 w-4 text-signal-indigo motion-safe:animate-spin" />
        <h3 className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
          Running Tasks
        </h3>
        {running.length > 0 && (
          <span className="text-[10px] text-muted-foreground/60">
            {running.length} active
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        {running.map((task) => (
          <div key={task.id} className="rounded-lg border bg-card p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <Loader2 className="h-3.5 w-3.5 shrink-0 text-signal-indigo motion-safe:animate-spin" />
                <span className="text-xs font-medium text-foreground/80 truncate">
                  {task.label}
                </span>
              </div>
              <span className="text-[10px] tabular-nums font-medium text-signal-indigo shrink-0 ml-2">
                {task.progress}%
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-signal-indigo to-blue-500 transition-all duration-1000 motion-safe:animate-pulse"
                style={{ width: `${task.progress}%` }}
              />
            </div>
            {task.estimatedRemaining && (
              <div className="flex items-center gap-1 mt-1.5 text-[10px] text-muted-foreground/60">
                <Clock className="h-2.5 w-2.5" />
                <span>{task.estimatedRemaining}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Recently Completed */}
      {completed.length > 0 && (
        <div className="pt-1">
          <div className="flex items-center gap-1.5 mb-1.5 px-1">
            <CheckCircle2 className="h-3 w-3 text-balanced-green" />
            <span className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">
              Recently Completed
            </span>
          </div>
          <div className="space-y-0.5">
            {completed.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 opacity-60"
              >
                <CheckCircle2 className="h-3 w-3 shrink-0 text-balanced-green" />
                <span className="text-[11px] text-muted-foreground/70">
                  {task.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
