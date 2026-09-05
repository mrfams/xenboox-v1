"use client";

// ─── Task Detail Drawer ─────────────────────────────────────────────────────
//
// What this task did, in one place: status, the artifacts it produced, any
// open escalations, and a follow-up box that continues the SAME conversation.
// Opens from the Tasks rail or the Tasks page; never navigates away.

import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  Pause,
  Send,
  X,
} from "lucide-react";

import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import type { RailTaskSource, RailTaskStatus } from "./tasks-rail-panel";

function StatusLine({ status }: { status: RailTaskStatus }) {
  const map: Record<RailTaskStatus, { icon: React.ReactNode; label: string; cls: string }> = {
    in_progress: {
      icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
      label: "Working",
      cls: "text-primary",
    },
    queued: {
      icon: <Clock className="h-3.5 w-3.5" />,
      label: "Queued",
      cls: "text-muted-foreground",
    },
    waiting: {
      icon: <Pause className="h-3.5 w-3.5" />,
      label: "Waiting on you",
      cls: "text-attention-amber",
    },
    completed: {
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
      label: "Done",
      cls: "text-balanced-green",
    },
    failed: {
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
      label: "Needs attention",
      cls: "text-error-clay",
    },
    blocked: {
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
      label: "Blocked",
      cls: "text-error-clay",
    },
    skipped: {
      icon: <Clock className="h-3.5 w-3.5" />,
      label: "Skipped",
      cls: "text-muted-foreground",
    },
  };
  const s = map[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", s.cls)}>
      {s.icon}
      {s.label}
    </span>
  );
}

export function TaskDetailDrawer({
  taskId,
  source,
  onClose,
  onSendFollowUp,
}: {
  taskId: string;
  source: RailTaskSource;
  onClose: () => void;
  onSendFollowUp: (text: string) => void;
}) {
  const { data: task, isLoading } = trpc.tasks.get.useQuery(
    { id: taskId, source },
    { staleTime: 5_000, refetchInterval: 10_000 },
  );
  const [draft, setDraft] = useState("");

  function submitFollowUp() {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    onSendFollowUp(text);
  }

  const artifacts = task && "artifacts" in task ? (task.artifacts ?? []) : [];
  const openEscalations =
    task && "openEscalations" in task ? (task.openEscalations ?? 0) : 0;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Task details"
      className="fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col border-l border-border/50 bg-background shadow-2xl"
    >
      <div className="flex items-center justify-between gap-2 border-b border-border/40 px-4 py-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Task
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close task details"
          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
        {isLoading || !task ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <h2 className="text-base font-semibold leading-snug text-foreground">
                {task.title}
              </h2>
              <div className="mt-2">
                <StatusLine status={task.status as RailTaskStatus} />
              </div>
              {task.description && (
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {task.description}
                </p>
              )}
              {task.status === "in_progress" && task.progress > 0 && (
                <div className="mt-3 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(2, task.progress))}%` }}
                    />
                  </div>
                  <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                    {Math.round(task.progress)}%
                  </span>
                </div>
              )}
              {task.error && (
                <p className="mt-2 rounded-lg bg-error-clay/10 px-3 py-2 text-xs text-error-clay">
                  {task.error}
                </p>
              )}
            </div>

            {openEscalations > 0 && (
              <section>
                <h3 className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                  Needs your call
                </h3>
                <a
                  href="/dashboard/tasks?filter=needs-you"
                  className="block rounded-lg border border-attention-amber/30 bg-attention-amber/[0.06] px-3 py-2.5 text-xs font-medium text-foreground transition-colors hover:border-attention-amber/50"
                >
                  {openEscalations} item{openEscalations !== 1 ? "s" : ""} waiting
                  for your decision — review in Tasks
                </a>
              </section>
            )}

            <section>
              <h3 className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                Produced
              </h3>
              {artifacts.length === 0 ? (
                <p className="text-xs text-muted-foreground/60">
                  Nothing saved yet — results land here as the work finishes.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {artifacts.map((a) => (
                    <li
                      key={a.artifactId}
                      className="flex items-center gap-2.5 rounded-lg border border-border/50 px-3 py-2"
                    >
                      <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-medium text-foreground">
                          {a.name}
                        </span>
                        <span className="text-[10px] uppercase tracking-wide text-muted-foreground/60">
                          {a.docType}
                        </span>
                      </span>
                      {a.url && (
                        <a
                          href={a.url}
                          target="_blank"
                          rel="noreferrer"
                          className="shrink-0 text-[11px] font-medium text-primary hover:text-primary/80"
                        >
                          Open
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <p className="text-[11px] leading-relaxed text-muted-foreground/70">
              The full back-and-forth for this task is loaded in the chat — ask
              below to keep going in the same thread.
            </p>
          </div>
        )}
      </div>

      <div className="border-t border-border/40 bg-background px-4 py-3">
        <div className="flex items-center gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submitFollowUp();
              }
            }}
            placeholder="Ask a follow-up on this task…"
            aria-label="Ask a follow-up on this task"
            className="h-9 min-w-0 flex-1 rounded-lg border border-border/50 bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button
            type="button"
            onClick={submitFollowUp}
            disabled={!draft.trim()}
            aria-label="Send follow-up"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
