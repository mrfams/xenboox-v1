"use client";

// ─── Tasks Rail Panel ───────────────────────────────────────────────────────
//
// The ONE right-rail surface on the dashboard. A single list of work —
// running, needing the user, done — backed by one query (tasks.list).
// No Agents tab (identity is internal), no Chat tab (history lives behind
// the History button). Clicking a task loads its thread inline and opens
// the detail drawer; it never navigates away.

import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock,
  Loader2,
  Pause,
} from "lucide-react";

import { cn } from "@/lib/utils";

export type RailTaskStatus =
  | "queued"
  | "in_progress"
  | "waiting"
  | "completed"
  | "failed"
  | "blocked"
  | "skipped";

export type RailTaskSource = "close_task" | "live_run" | "daily_close";

export interface RailTask {
  id: string;
  source: RailTaskSource;
  title: string;
  description: string | null;
  status: RailTaskStatus;
  progress: number;
  conversationId: string | null;
  needsDecision: boolean;
  currentStep: string | null;
  error: string | null;
  startedAt: string | Date | null;
  createdAt: string | Date;
}

export interface RailCounts {
  total: number;
  running: number;
  completed: number;
  failed: number;
  needsDecision?: number;
}

function timeAgo(d: string | Date | null | undefined): string {
  if (!d) return "";
  const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return days < 7
    ? `${days}d`
    : new Date(d).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
}

function StatusIcon({ status }: { status: RailTaskStatus }) {
  switch (status) {
    case "in_progress":
      return <Loader2 className="h-3 w-3 text-primary animate-spin" />;
    case "queued":
      return <Clock className="h-3 w-3 text-muted-foreground" />;
    case "waiting":
      return <Pause className="h-3 w-3 text-attention-amber" />;
    case "completed":
      return <CheckCircle2 className="h-3 w-3 text-balanced-green" />;
    case "failed":
    case "blocked":
      return <AlertTriangle className="h-3 w-3 text-error-clay" />;
    default:
      return <Clock className="h-3 w-3 text-muted-foreground" />;
  }
}

function TaskRow({
  task,
  selected,
  onSelect,
}: {
  task: RailTask;
  selected: boolean;
  onSelect: () => void;
}) {
  const running =
    task.status === "in_progress" ||
    task.status === "queued" ||
    task.status === "waiting";

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected}
      className={cn(
        "group flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left transition-colors",
        selected ? "bg-primary/[0.07] ring-1 ring-primary/20" : "hover:bg-accent/50",
      )}
    >
      <span className="mt-0.5 shrink-0">
        <StatusIcon status={task.status} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="block truncate text-[11px] font-medium text-foreground group-hover:text-primary">
            {task.title}
          </span>
          {task.needsDecision && (
            <span className="shrink-0 rounded-full bg-attention-amber/15 px-1.5 py-px text-[8px] font-bold uppercase tracking-wide text-attention-amber">
              Needs you
            </span>
          )}
        </span>
        {task.currentStep && running && (
          <span className="mt-0.5 block truncate text-[10px] text-primary/80">
            {task.currentStep}
          </span>
        )}
        {running && task.progress > 0 && (
          <span className="mt-1.5 flex items-center gap-1.5">
            <span className="h-0.5 flex-1 overflow-hidden rounded-full bg-muted">
              <span
                className="block h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(2, task.progress))}%` }}
              />
            </span>
            <span className="font-mono text-[8px] tabular-nums text-muted-foreground/60">
              {Math.round(task.progress)}%
            </span>
          </span>
        )}
        <span className="mt-0.5 flex items-center gap-1 text-[9px] text-muted-foreground/60">
          <span>{timeAgo(task.startedAt ?? task.createdAt)}</span>
          {task.error && (
            <>
              <span aria-hidden="true">·</span>
              <span className="truncate text-error-clay">{task.error}</span>
            </>
          )}
        </span>
      </span>
      <ChevronRight className="mt-1 h-3 w-3 shrink-0 text-muted-foreground/30 transition-colors group-hover:text-primary" />
    </button>
  );
}

function GroupLabel({
  children,
  tone = "default",
  count,
}: {
  children: React.ReactNode;
  tone?: "default" | "attention" | "success";
  count: number;
}) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 pb-1 pt-3 first:pt-1">
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          tone === "attention" && "bg-attention-amber",
          tone === "success" && "bg-balanced-green",
          tone === "default" && "bg-primary animate-pulse",
        )}
      />
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {children}
      </span>
      <span className="font-mono text-[10px] tabular-nums text-muted-foreground/60">
        {count}
      </span>
    </div>
  );
}

export function TasksRailPanel({
  tasks,
  counts,
  selectedTaskId,
  onSelectTask,
}: {
  tasks: RailTask[];
  counts?: RailCounts;
  selectedTaskId: string | null;
  onSelectTask: (task: RailTask) => void;
}) {
  const needsYou = tasks.filter((t) => t.needsDecision);
  const running = tasks.filter(
    (t) =>
      !t.needsDecision &&
      (t.status === "in_progress" ||
        t.status === "queued" ||
        t.status === "waiting"),
  );
  const done = tasks.filter(
    (t) => !t.needsDecision && t.status !== "in_progress" && t.status !== "queued" && t.status !== "waiting",
  );
  const failedCount = counts?.failed ?? 0;
  const activeCount = (counts?.needsDecision ?? needsYou.length) + running.length;

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-card">
      <div className="flex shrink-0 items-center justify-between border-b border-border/30 bg-background px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-semibold tracking-tight text-foreground">
            Tasks
          </h2>
          {activeCount > 0 && (
            <span className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary/10 px-1 text-[9px] font-bold tabular-nums text-primary">
              {activeCount}
            </span>
          )}
          {failedCount > 0 && (
            <span className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-error-clay/15 px-1 text-[9px] font-bold tabular-nums text-error-clay">
              {failedCount}
            </span>
          )}
        </div>
        <a
          href="/dashboard/tasks"
          className="text-[10px] font-medium text-primary hover:text-primary/80"
        >
          View all
        </a>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1.5 pb-3">
        {tasks.length === 0 ? (
          <div className="flex h-full min-h-[200px] flex-col items-center justify-center p-4 text-center">
            <CheckCircle2 className="mb-2 h-6 w-6 text-balanced-green/30" />
            <p className="text-xs text-muted-foreground">Nothing running</p>
            <p className="mt-1 text-[10px] text-muted-foreground/60">
              Ask for something and it will show up here
            </p>
          </div>
        ) : (
          <>
            {needsYou.length > 0 && (
              <div>
                <GroupLabel tone="attention" count={needsYou.length}>
                  Needs you
                </GroupLabel>
                <div className="space-y-0.5">
                  {needsYou.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      selected={task.id === selectedTaskId}
                      onSelect={() => onSelectTask(task)}
                    />
                  ))}
                </div>
              </div>
            )}
            {running.length > 0 && (
              <div>
                <GroupLabel count={running.length}>Running</GroupLabel>
                <div className="space-y-0.5">
                  {running.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      selected={task.id === selectedTaskId}
                      onSelect={() => onSelectTask(task)}
                    />
                  ))}
                </div>
              </div>
            )}
            {done.length > 0 && (
              <div>
                <GroupLabel tone="success" count={done.length}>
                  Done
                </GroupLabel>
                <div className="space-y-0.5">
                  {done.slice(0, 10).map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      selected={task.id === selectedTaskId}
                      onSelect={() => onSelectTask(task)}
                    />
                  ))}
                  {done.length > 10 && (
                    <p className="px-2.5 py-1 text-[10px] text-muted-foreground/60">
                      +{done.length - 10} more
                    </p>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
