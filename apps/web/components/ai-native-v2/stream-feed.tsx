"use client";

import { useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDashed,
  Loader2,
  XCircle,
} from "lucide-react";

import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

// ─── AgentStream (DEPRECATED — ops/debug only) ─────────────────────────────
//
// Agent identity is an internal concern (LangFuse + audit trail) and must
// NOT render in user-facing surfaces. The dashboard rail and Tasks page
// read tasks.list (work, not agents). Retained for ops/debug screens only.
// See toAINative.md §3b.

type RunStatus =
  | "queued"
  | "in_progress"
  | "waiting"
  | "completed"
  | "failed"
  | "cancelled";

function StatusIcon({ status }: { status: RunStatus }) {
  switch (status) {
    case "completed":
      return (
        <CheckCircle2
          className="h-3.5 w-3.5 shrink-0 text-emerald-500"
          aria-hidden="true"
        />
      );
    case "failed":
      return (
        <XCircle
          className="h-3.5 w-3.5 shrink-0 text-red-500"
          aria-hidden="true"
        />
      );
    case "cancelled":
      return (
        <XCircle
          className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40"
          aria-hidden="true"
        />
      );
    case "queued":
    case "waiting":
      return (
        <CircleDashed
          className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
      );
    default:
      return (
        <Loader2
          className="h-3.5 w-3.5 shrink-0 animate-spin text-primary"
          aria-hidden="true"
        />
      );
  }
}

function relativeTime(date: string | Date | null | undefined): string {
  if (!date) return "";
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Expanded run: step timeline pulled from the detail endpoint ──────────

function RunSteps({ runId }: { runId: string }) {
  const { data: detail, isLoading } = trpc.liveRuns.getEntityRunDetail.useQuery(
    { runId },
    { staleTime: 5000 },
  );

  if (isLoading) {
    return (
      <div className="space-y-1.5 px-4 pb-3 pt-1">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-4 w-full animate-pulse rounded bg-muted/40"
          />
        ))}
      </div>
    );
  }

  const steps = detail?.steps ?? [];
  const hasEvents = (detail?.events?.length ?? 0) > 0;
  if (steps.length === 0 && !hasEvents) {
    return (
      <p className="px-4 pb-3 pt-1 text-[11px] text-muted-foreground/70">
        Step trace unavailable for this run.
      </p>
    );
  }

  return (
    <div className="space-y-1 border-t border-border/30 px-4 pb-3 pt-2">
      {detail?.events && detail.events.length > 0 && (
        <div className="mb-2 space-y-0.5 rounded-md bg-muted/30 px-2 py-1.5">
          {detail.events.slice(0, 3).map((e, i) => (
            <p
              key={`${e.createdAt}-${i}`}
              className="line-clamp-1 font-mono text-[10px] leading-relaxed text-muted-foreground"
            >
              {e.message ?? e.eventType}
            </p>
          ))}
        </div>
      )}
      {steps.map((s) => (
        <div key={s.stepNumber} className="flex items-center gap-2">
          <StatusIcon status={s.status as RunStatus} />
          <span className="min-w-0 flex-1 truncate text-[11px] text-foreground/80">
            {s.name}
          </span>
          {s.duration !== "--" && (
            <span className="font-mono text-[10px] tabular-nums text-muted-foreground/50">
              {s.duration}
            </span>
          )}
        </div>
      ))}
      {detail?.error && (
        <p className="mt-1 rounded-md bg-destructive/10 px-2 py-1 text-[11px] text-destructive">
          {detail.error}
        </p>
      )}
    </div>
  );
}

// ── One run row ───────────────────────────────────────────────────────────

function StreamRow({
  run,
  defaultOpen = false,
}: {
  run: {
    runId: string;
    agentDisplayName?: string | null;
    agentName: string;
    status: string;
    progress?: number | null;
    currentStep?: string | null;
    startedAt: string | Date | null;
    duration?: string | null;
  };
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const active =
    run.status === "in_progress" ||
    run.status === "queued" ||
    run.status === "waiting";

  return (
    <div className="border-b border-border/30 last:border-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left transition-colors hover:bg-accent/40"
      >
        <StatusIcon status={run.status as RunStatus} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-medium text-foreground">
            {run.agentDisplayName ?? run.agentName.replace(/-/g, " ")}
          </span>
          <span className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
            {active && run.currentStep ? (
              <span className="truncate text-primary/80">
                {run.currentStep}
              </span>
            ) : (
              <span>{relativeTime(run.startedAt)}</span>
            )}
            {run.duration && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">{run.duration}</span>
              </>
            )}
          </span>
        </span>
        {active && run.progress != null && (
          <span className="font-mono text-[10px] tabular-nums text-muted-foreground/60">
            {Math.round(run.progress)}%
          </span>
        )}
        {open ? (
          <ChevronDown
            className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50"
            aria-hidden="true"
          />
        ) : (
          <ChevronRight
            className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50"
            aria-hidden="true"
          />
        )}
      </button>
      {active && run.progress != null && (
        <div className="mx-4 mb-1 h-0.5 overflow-hidden rounded-full bg-muted/50">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              run.status === "failed" ? "bg-red-500" : "bg-primary",
            )}
            style={{ width: `${Math.min(100, Math.max(2, run.progress))}%` }}
          />
        </div>
      )}
      {open && <RunSteps runId={run.runId} />}
    </div>
  );
}

// ── The feed ──────────────────────────────────────────────────────────────

export function AgentStream({
  entityId,
  className,
}: {
  entityId: string;
  className?: string;
}) {
  const [showHistory, setShowHistory] = useState(false);

  // Live runs poll — backstop for the SSE channel.
  const { data: activeRuns, isLoading: activeLoading } =
    trpc.liveRuns.getActiveEntityRuns.useQuery(undefined, {
      enabled: !!entityId,
      refetchInterval: 8000,
    });

  const { data: history } = trpc.liveRuns.listEntityRuns.useQuery(
    { limit: 15 },
    { enabled: !!entityId && showHistory },
  );

  const activeCount = activeRuns?.length ?? 0;

  return (
    <section
      aria-labelledby="agent-stream-heading"
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-xl border border-border/50 bg-card",
        className,
      )}
    >
      <header className="flex items-center justify-between border-b border-border/40 px-4 py-3">
        <div className="flex items-center gap-2">
          <h2
            id="agent-stream-heading"
            className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
          >
            Agent activity
          </h2>
          {activeCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold tabular-nums text-primary">
              <span
                className="h-1 w-1 animate-pulse rounded-full bg-primary"
                aria-hidden="true"
              />
              {activeCount} live
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowHistory((s) => !s)}
          className="text-[10px] font-medium text-primary hover:text-primary/80"
        >
          {showHistory ? "Live only" : "History"}
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {activeLoading ? (
          <div className="space-y-2 p-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-9 animate-pulse rounded-lg bg-muted/30"
              />
            ))}
          </div>
        ) : showHistory ? (
          history && history.items.length > 0 ? (
            history.items.map((r) => <StreamRow key={r.runId} run={r} />)
          ) : (
            <FeedEmpty label="No runs yet this period." />
          )
        ) : activeRuns && activeCount > 0 ? (
          activeRuns.map((r) => (
            <StreamRow key={r.runId} run={r} defaultOpen={false} />
          ))
        ) : (
          <FeedEmpty
            label="No agents working right now."
            hint="Launch a mission below — finished runs land here."
          />
        )}
      </div>
    </section>
  );
}

function FeedEmpty({ label, hint }: { label: string; hint?: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-1 p-8 text-center">
      <CircleDashed
        className="mb-1 h-5 w-5 text-muted-foreground/30"
        aria-hidden="true"
      />
      <p className="text-xs font-medium text-foreground/70">{label}</p>
      {hint && <p className="text-[11px] text-muted-foreground/60">{hint}</p>}
    </div>
  );
}
