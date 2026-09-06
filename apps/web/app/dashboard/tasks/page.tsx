"use client";

// ─── Tasks — the Review Queue ───────────────────────────────────────────────
//
// Two sections, nothing else:
//   1. Needs you — approvals, escalations, exceptions. The only thing that
//      badges the sidebar. Approve/reject here does the same thing as
//      approving in chat (same mutation, state syncs both places).
//   2. All tasks — every job, running or done. Click for detail; open in
//      Command Center to continue the thread.
//
// No activity feed, no raw notifications, no agent names, no scores,
// no timings. Users see work and decisions — never the org chart.

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileCheck,
  Inbox,
  Loader2,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { toast } from "sonner";

import { useEntity } from "@/lib/entity-context";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { useSurfaceSync } from "@/lib/hooks/use-surface-sync";
import { emitDataChanged } from "@/lib/hooks/use-surface-sync";
import { useSrAnnounce } from "@/lib/hooks/use-sr-announce";
import { TaskDetailDrawer } from "@/components/dashboard/task-detail-drawer";
import type {
  RailTask,
  RailTaskSource,
} from "@/components/dashboard/tasks-rail-panel";
import { IngestionReviewPanel } from "@/components/ingestion/ingestion-review-panel";

// ─── Decision items ─────────────────────────────────────────────────────────

type DecisionItem = {
  id: string;
  category: "agent_activity" | "ingestion" | "notification";
  title: string;
  summary: string;
  rationale?: string;
  amount?: string;
  documentId?: string;
  notificationType?: string;
  notificationData?: Record<string, unknown>;
  createdAt?: string | Date;
  evidence?: Record<string, unknown>;
};

type Section = "needs-you" | "tasks";
type TaskFilter = "all" | "running" | "done" | "failed";

function timeAgo(d: string | Date | undefined): string {
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

function TasksPageInner() {
  const { entityId } = useEntity();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { announce } = useSrAnnounce();

  useSurfaceSync({ entityId: entityId ?? "", surfaces: ["activity-hub"] });

  const [section, setSection] = useState<Section>("needs-you");
  const [taskFilter, setTaskFilter] = useState<TaskFilter>("all");
  const [cursor, setCursor] = useState(0);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [reviewDocumentId, setReviewDocumentId] = useState<string | null>(null);
  const [detailTask, setDetailTask] = useState<{
    id: string;
    source: RailTaskSource;
  } | null>(null);

  // Deep link from the task drawer (?filter=needs-you).
  useEffect(() => {
    if (searchParams.get("filter") === "needs-you") setSection("needs-you");
  }, [searchParams]);

  // ── Data ──────────────────────────────────────────────────────────────
  // Batch 3 / N19: the needs-you queue is assembled SERVER-SIDE by
  // tasks.needsYou (agent activity + decision notifications, deduped).
  // The old client-side stitching of ingestion.listAgentApprovals +
  // notifications.list + tasks.list is gone — toAInative §4 contract.
  const { data: needsYouData, isLoading: needsYouLoading } =
    trpc.tasks.needsYou.useQuery(
      { limit: 50 },
      { enabled: !!entityId, refetchInterval: 15_000 },
    );
  const { data: tasksData, isLoading: tasksLoading } = trpc.tasks.list.useQuery(
    { limit: 50 },
    { enabled: !!entityId, refetchInterval: 10_000 },
  );

  const resolveApproval = trpc.approvals.resolve.useMutation();
  const rejectIngestion = trpc.ingestion.rejectReview.useMutation();
  const markNotificationRead = trpc.notifications.markAsRead.useMutation();

  const needsYou: DecisionItem[] = useMemo(
    () => (needsYouData?.items ?? []) as DecisionItem[],
    [needsYouData],
  );

  const visible = needsYou.filter((i) => !dismissed.has(i.id));
  const selected = visible[Math.min(cursor, Math.max(visible.length - 1, 0))] ?? null;

  const tasks = useMemo(() => (tasksData?.tasks ?? []) as RailTask[], [tasksData]);
  const filteredTasks = useMemo(() => {
    if (taskFilter === "running")
      return tasks.filter(
        (t) =>
          t.status === "in_progress" ||
          t.status === "queued" ||
          t.status === "waiting",
      );
    if (taskFilter === "done")
      return tasks.filter((t) => t.status === "completed");
    if (taskFilter === "failed")
      return tasks.filter((t) => t.status === "failed" || t.status === "blocked");
    return tasks;
  }, [tasks, taskFilter]);

  // ── Decide ────────────────────────────────────────────────────────────
  const decide = useCallback(
    async (item: DecisionItem, action: "approve" | "reject") => {
      setPendingIds((p) => new Set(p).add(item.id));
      try {
        if (item.category === "agent_activity") {
          await resolveApproval.mutateAsync({
            itemId: item.id,
            itemType: "agent_escalation",
            action: action === "approve" ? "approved" : "rejected",
            reason:
              note.trim() ||
              (action === "approve" ? "Approved from Tasks" : "Rejected from Tasks"),
          });
        } else if (item.category === "notification") {
          const logId =
            typeof item.notificationData?.logId === "string"
              ? item.notificationData.logId
              : undefined;
          if (item.notificationType === "agent_escalation" && logId) {
            await resolveApproval.mutateAsync({
              itemId: logId,
              itemType: "agent_escalation",
              action: action === "approve" ? "approved" : "rejected",
              reason:
                note.trim() ||
                (action === "approve" ? "Approved from Tasks" : "Rejected from Tasks"),
            });
          }
          await markNotificationRead.mutateAsync({ id: item.id });
        } else if (item.category === "ingestion") {
          if (action === "approve") {
            if (item.documentId) setReviewDocumentId(item.documentId);
            return;
          }
          await rejectIngestion.mutateAsync({
            documentId: item.documentId ?? item.id,
            reason: note.trim() || "Rejected from Tasks",
          });
        }
        setDismissed((p) => new Set(p).add(item.id));
        toast.success(action === "approve" ? "Approved" : "Rejected");
        announce(action === "approve" ? "Approved" : "Rejected");
        if (entityId) emitDataChanged("activity-hub", `${action}_task`, entityId);
      } catch {
        toast.error("That didn't save. Try again.");
      } finally {
        setPendingIds((p) => {
          const n = new Set(p);
          n.delete(item.id);
          return n;
        });
        setNote("");
        setNoteFor(null);
      }
    },
    [resolveApproval, markNotificationRead, rejectIngestion, note, announce, entityId],
  );

  // ── Batch approve (Batch 3 / N20) ─────────────────────────────────────
  // Approves every currently visible needs-you item that can be approved
  // without opening a document review (ingestion items with a documentId are
  // skipped — they need human document review). Per-item results are
  // reported honestly: successes leave the queue, failures stay with a toast.
  const [batchRunning, setBatchRunning] = useState(false);
  const batchApproveVisible = useCallback(async () => {
    if (batchRunning) return;
    const targets = visible.filter(
      (i) => !(i.category === "ingestion" && i.documentId),
    );
    if (targets.length === 0) return;
    setBatchRunning(true);
    const results = await Promise.allSettled(
      targets.map(async (item) => {
        if (item.category === "agent_activity") {
          await resolveApproval.mutateAsync({
            itemId: item.id,
            itemType: "agent_escalation",
            action: "approved",
            reason: "Approved via batch from Tasks",
          });
        } else if (item.category === "notification") {
          const logId =
            typeof item.notificationData?.logId === "string"
              ? item.notificationData.logId
              : undefined;
          if (item.notificationType === "agent_escalation" && logId) {
            await resolveApproval.mutateAsync({
              itemId: logId,
              itemType: "agent_escalation",
              action: "approved",
              reason: "Approved via batch from Tasks",
            });
          }
          await markNotificationRead.mutateAsync({ id: item.id });
        }
        return item.id;
      }),
    );
    const okIds: string[] = [];
    let failed = 0;
    for (const r of results) {
      if (r.status === "fulfilled") okIds.push(r.value);
      else failed += 1;
    }
    if (okIds.length > 0) {
      setDismissed((p) => {
        const n = new Set(p);
        for (const id of okIds) n.add(id);
        return n;
      });
      if (entityId) emitDataChanged("activity-hub", "approve_task", entityId);
    }
    if (failed > 0) {
      toast.warning("" + okIds.length + " approved, " + failed + " failed — try those again");
    } else {
      toast.success("" + okIds.length + " approved");
    }
    announce("" + okIds.length + " approved, " + failed + " failed");
    setBatchRunning(false);
  }, [visible, batchRunning, resolveApproval, markNotificationRead, entityId, announce]);

  // ── Keyboard triage: j/k move · a approve · r reject · 1/2 sections ───
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName.match(/INPUT|TEXTAREA|SELECT/))
        return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      switch (e.key) {
        case "1":
          e.preventDefault();
          setSection("needs-you");
          setCursor(0);
          break;
        case "2":
          e.preventDefault();
          setSection("tasks");
          break;
        case "j":
        case "ArrowDown":
          if (section !== "needs-you") break;
          e.preventDefault();
          setCursor((c) => Math.min(c + 1, visible.length - 1));
          break;
        case "k":
        case "ArrowUp":
          if (section !== "needs-you") break;
          e.preventDefault();
          setCursor((c) => Math.max(c - 1, 0));
          break;
        case "a":
          if (section === "needs-you" && selected) void decide(selected, "approve");
          break;
        case "r":
          if (section === "needs-you" && selected) setNoteFor(selected.id);
          break;
        case "Escape":
          setNoteFor(null);
          setNote("");
          setDetailTask(null);
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible.length, selected, decide, section]);

  useEffect(() => {
    if (selected) announce(`Selected: ${selected.title}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  const needsCount = visible.length;

  return (
    <div className="flex h-full min-h-0 flex-col pb-16 md:pb-0">
      <header className="border-b border-border/40">
        <div className="flex items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <Inbox className="h-4 w-4 text-primary" aria-hidden="true" />
            <h1 className="text-sm font-semibold tracking-tight text-foreground">
              Tasks
            </h1>
            {needsCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-error-clay/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-error-clay">
                {needsCount} need you
              </span>
            )}
              <button
                type="button"
                onClick={() => void batchApproveVisible()}
                disabled={batchRunning || needsCount === 0}
                className="inline-flex items-center gap-1 rounded-full border border-border/60 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                {batchRunning ? "Approving…" : "Approve all"}
              </button>
          </div>
          <p className="hidden font-mono text-[10px] text-muted-foreground/60 sm:block">
            1/2 section · j/k move · a/r decide
          </p>
        </div>

        <div
          className="flex items-center gap-1 px-4 pb-2 sm:px-6"
          role="tablist"
          aria-label="Tasks sections"
        >
          {(
            [
              { key: "needs-you" as const, label: "Needs you", count: needsCount },
              {
                key: "tasks" as const,
                label: "All tasks",
                count: tasksData?.counts?.total ?? 0,
              },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={section === tab.key}
              onClick={() => {
                setSection(tab.key);
                setCursor(0);
              }}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all",
                section === tab.key
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
              )}
            >
              {tab.label}
              {tab.count > 0 && (
                <span
                  className={cn(
                    "inline-flex min-w-[18px] items-center justify-center rounded-full px-1 py-0.5 text-[9px] font-bold tabular-nums",
                    section === tab.key
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </header>

      {section === "needs-you" ? (
        needsYouLoading ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
            <div
              className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground"
              aria-hidden="true"
            />
            <p className="text-xs text-muted-foreground">Loading your queue…</p>
          </div>
        ) : visible.length === 0 ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
            <CheckCircle2
              className="mb-1 h-8 w-8 text-balanced-green"
              aria-hidden="true"
            />
            <p className="text-sm font-medium text-foreground">All clear</p>
            <p className="max-w-xs text-xs text-muted-foreground">
              Nothing needs your call right now. Anything that does will land
              here.
            </p>
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 lg:grid-cols-[380px_1fr]">
            <div
              role="listbox"
              aria-label="Needs your decision"
              className="min-h-0 overflow-y-auto border-b border-border/40 lg:border-b-0 lg:border-r"
            >
              {visible.map((item, idx) => {
                const isSelected = selected?.id === item.id;
                return (
                  <button
                    key={item.id}
                    role="option"
                    aria-selected={isSelected}
                    disabled={pendingIds.has(item.id)}
                    onClick={() => {
                      setCursor(idx);
                      if (item.category === "ingestion" && item.documentId) {
                        setReviewDocumentId(item.documentId);
                      }
                    }}
                    className={cn(
                      "flex w-full items-start gap-2.5 border-b border-border/30 px-4 py-3 text-left transition-colors last:border-0",
                      isSelected ? "bg-primary/[0.06]" : "hover:bg-accent/40",
                    )}
                  >
                    <FileCheck
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-attention-amber"
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium text-foreground">
                        {item.title}
                      </span>
                      <span className="mt-0.5 block text-[10px] text-muted-foreground">
                        {timeAgo(item.createdAt)}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="min-h-0 overflow-y-auto">
              {selected ? (
                <BriefPane
                  key={selected.id}
                  item={selected}
                  busy={pendingIds.has(selected.id)}
                  noteOpen={noteFor === selected.id}
                  note={note}
                  onNoteChange={setNote}
                  onToggleNote={() =>
                    setNoteFor((v) => (v === selected.id ? null : selected.id))
                  }
                  onDecide={(a) => void decide(selected, a)}
                  onReviewDoc={
                    selected.documentId
                      ? () => setReviewDocumentId(selected.documentId!)
                      : undefined
                  }
                  onAskAi={(q) =>
                    router.push(`/dashboard?prompt=${encodeURIComponent(q)}`)
                  }
                />
              ) : (
                <div className="flex h-full items-center justify-center p-8 text-sm text-muted-foreground">
                  Select an item to see its full brief.
                </div>
              )}
            </div>
          </div>
        )
      ) : (
        <TasksSection
          tasks={filteredTasks}
          isLoading={tasksLoading}
          filter={taskFilter}
          onFilterChange={setTaskFilter}
          counts={tasksData?.counts}
          onOpenDetail={(id, source) => setDetailTask({ id, source })}
        />
      )}

      {detailTask && (
        <TaskDetailDrawer
          key={detailTask.id}
          taskId={detailTask.id}
          source={detailTask.source}
          onClose={() => setDetailTask(null)}
          onSendFollowUp={(text) =>
            router.push(`/dashboard?prompt=${encodeURIComponent(text)}`)
          }
        />
      )}

      {reviewDocumentId && (
        <IngestionReviewPanel
          documentId={reviewDocumentId}
          onClose={() => setReviewDocumentId(null)}
        />
      )}
    </div>
  );
}

export default function TasksPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      }
    >
      <TasksPageInner />
    </Suspense>
  );
}

// ─── Brief pane ─────────────────────────────────────────────────────────────

function BriefPane({
  item,
  busy,
  noteOpen,
  note,
  onNoteChange,
  onToggleNote,
  onDecide,
  onReviewDoc,
  onAskAi,
}: {
  item: DecisionItem;
  busy: boolean;
  noteOpen: boolean;
  note: string;
  onNoteChange: (v: string) => void;
  onToggleNote: () => void;
  onDecide: (a: "approve" | "reject") => void;
  onReviewDoc?: () => void;
  onAskAi: (question: string) => void;
}) {
  const evidenceKeys =
    item.evidence && Object.keys(item.evidence).length > 0
      ? Object.entries(item.evidence).slice(0, 6)
      : [];

  return (
    <article className="mx-auto max-w-2xl space-y-5 p-5 sm:p-6">
      <div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Needs your decision
        </span>
        <h2 className="mt-1.5 text-base font-semibold leading-snug text-foreground">
          {item.title}
        </h2>
        {item.amount && (
          <span className="mt-2 inline-block rounded-full bg-attention-amber/10 px-2 py-0.5 font-mono text-[11px] font-semibold tabular-nums text-attention-amber">
            {item.amount}
          </span>
        )}
      </div>

      <Section title="What this is">
        <p className="text-sm leading-relaxed text-foreground/85">{item.summary}</p>
      </Section>

      {item.rationale && (
        <Section title="Why this is recommended">
          <p className="rounded-lg border border-primary/15 bg-primary/[0.04] px-3 py-2.5 text-[13px] leading-relaxed text-foreground/85">
            {item.rationale}
          </p>
        </Section>
      )}

      {evidenceKeys.length > 0 && (
        <Section title="Evidence">
          <dl className="divide-y divide-border/30 overflow-hidden rounded-lg border border-border/50">
            {evidenceKeys.map(([k, v]) => (
              <div
                key={k}
                className="flex items-start justify-between gap-4 px-3 py-2"
              >
                <dt className="shrink-0 text-[11px] capitalize text-muted-foreground">
                  {k.replace(/([A-Z])/g, " $1").replace(/_/g, " ")}
                </dt>
                <dd className="break-words text-right text-xs text-foreground">
                  {typeof v === "object" ? JSON.stringify(v) : String(v ?? "—")}
                </dd>
              </div>
            ))}
          </dl>
        </Section>
      )}

      {noteOpen && (
        <div>
          <label
            htmlFor={`note-${item.id}`}
            className="text-[11px] font-medium text-muted-foreground"
          >
            Reason for rejecting (helps improve future recommendations)
          </label>
          <textarea
            id={`note-${item.id}`}
            value={note}
            onChange={(e) => onNoteChange(e.target.value)}
            rows={2}
            autoFocus
            placeholder="What should have happened instead…"
            className="mt-1 w-full resize-none rounded-lg border border-border/50 bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      )}

      <footer className="flex flex-wrap items-center gap-2 border-t border-border/40 pt-4">
        <button
          type="button"
          disabled={busy}
          onClick={() => onDecide("approve")}
          className="inline-flex items-center gap-1.5 rounded-lg bg-balanced-green px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-balanced-green/90 disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <ThumbsUp className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          Approve
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => (noteOpen ? onDecide("reject") : onToggleNote())}
          className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/20 disabled:opacity-50"
        >
          <ThumbsDown className="h-3.5 w-3.5" aria-hidden="true" />
          {noteOpen ? "Confirm rejection" : "Reject"}
        </button>
        {onReviewDoc && (
          <button
            type="button"
            onClick={onReviewDoc}
            className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Review document
          </button>
        )}
        <button
          type="button"
          onClick={() => onAskAi(`Explain this: "${item.title}". ${item.summary}`)}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/5"
        >
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          Ask Xenboox
        </button>
        <button
          type="button"
          onClick={() =>
            onAskAi(
              `Make approvals like this automatic going forward: "${item.title}". ${item.summary} Analyze my approval history and suggest an auto-approve rule for this kind of item.`,
            )
          }
          className="ml-auto rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
        >
          Make automatic
        </button>
      </footer>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
        {title}
      </h3>
      {children}
    </section>
  );
}

// ─── All-tasks section ──────────────────────────────────────────────────────

function taskStatusMeta(status: RailTask["status"]): {
  label: string;
  cls: string;
} {
  switch (status) {
    case "in_progress":
      return { label: "Running", cls: "text-primary" };
    case "queued":
      return { label: "Queued", cls: "text-muted-foreground" };
    case "waiting":
      return { label: "Waiting on you", cls: "text-attention-amber" };
    case "completed":
      return { label: "Done", cls: "text-balanced-green" };
    case "failed":
    case "blocked":
      return { label: "Failed", cls: "text-error-clay" };
    default:
      return { label: "Skipped", cls: "text-muted-foreground" };
  }
}

function TasksSection({
  tasks,
  isLoading,
  filter,
  onFilterChange,
  counts,
  onOpenDetail,
}: {
  tasks: RailTask[];
  isLoading: boolean;
  filter: TaskFilter;
  onFilterChange: (f: TaskFilter) => void;
  counts?: { total: number; running: number; completed: number; failed: number };
  onOpenDetail: (id: string, source: RailTaskSource) => void;
}) {
  if (isLoading) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-1.5 border-b border-border/30 px-4 py-2 sm:px-6">
        {(
          [
            { key: "all" as const, label: "All", count: counts?.total ?? 0 },
            { key: "running" as const, label: "Running", count: counts?.running ?? 0 },
            { key: "done" as const, label: "Done", count: counts?.completed ?? 0 },
            { key: "failed" as const, label: "Failed", count: counts?.failed ?? 0 },
          ] as const
        ).map((chip) => (
          <button
            key={chip.key}
            type="button"
            onClick={() => onFilterChange(chip.key)}
            className={cn(
              "flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-all",
              filter === chip.key
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent/50",
            )}
          >
            {chip.key === "running" && chip.count > 0 && (
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
            )}
            {chip.label}
            {chip.count > 0 && (
              <span className="font-mono tabular-nums">{chip.count}</span>
            )}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 p-8 text-center">
            <CheckCircle2
              className="mb-1 h-8 w-8 text-balanced-green"
              aria-hidden="true"
            />
            <p className="text-sm font-medium text-foreground">
              {filter === "all" ? "No tasks yet" : "Nothing here"}
            </p>
            <p className="max-w-xs text-xs text-muted-foreground">
              {filter === "all"
                ? "Ask Xenboox to do something and it will show up here."
                : "No tasks in this state right now."}
            </p>
          </div>
        ) : (
          tasks.map((task) => {
            const meta = taskStatusMeta(task.status);
            const running =
              task.status === "in_progress" || task.status === "queued";
            return (
              <div
                key={task.id}
                className="flex w-full items-start gap-3 border-b border-border/30 px-4 py-3 text-left last:border-0 sm:px-6"
              >
                <span className="mt-0.5 shrink-0">
                  {task.status === "in_progress" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                  ) : task.status === "completed" ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-balanced-green" />
                  ) : task.status === "failed" || task.status === "blocked" ? (
                    <AlertTriangle className="h-3.5 w-3.5 text-error-clay" />
                  ) : task.status === "waiting" ? (
                    <Clock className="h-3.5 w-3.5 text-attention-amber" />
                  ) : (
                    <Bell className="h-3.5 w-3.5 text-muted-foreground/50" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-xs font-medium text-foreground">
                      {task.title}
                    </span>
                    <span className={cn("text-[10px] font-semibold", meta.cls)}>
                      {meta.label}
                    </span>
                    {task.needsDecision && (
                      <span className="rounded-full bg-attention-amber/15 px-1.5 py-px text-[8px] font-bold uppercase tracking-wide text-attention-amber">
                        Needs you
                      </span>
                    )}
                  </span>
                  {task.description && (
                    <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                      {task.description}
                    </span>
                  )}
                  {running && (
                    <span className="mt-1.5 flex items-center gap-2">
                      <span className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                        <span
                          className="block h-full rounded-full bg-primary transition-all"
                          style={{
                            width: `${Math.min(100, Math.max(2, task.progress))}%`,
                          }}
                        />
                      </span>
                      <span className="font-mono text-[9px] tabular-nums text-muted-foreground/60">
                        {Math.round(task.progress)}%
                      </span>
                    </span>
                  )}
                  <span className="mt-1 block text-[10px] text-muted-foreground/60">
                    {timeAgo(task.startedAt ?? task.createdAt)}
                    {task.error ? ` · ${task.error}` : ""}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1">
                  {task.conversationId && (
                    <a
                      href={`/dashboard?task=${task.id}&source=${task.source}`}
                      className="rounded-lg px-2 py-1.5 text-[11px] font-medium text-primary transition-colors hover:bg-primary/10"
                    >
                      Open in chat
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => onOpenDetail(task.id, task.source)}
                    className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
                    aria-label={`Details for ${task.title}`}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
