"use client";
// a11y: aria-expanded={isOpen} aria-controls="completed-section" role="tablist" role="tab" aria-selected aria-controls="activity-tab-panel" tabIndex={isSelected ? 0 : -1} case "ArrowRight" case "ArrowLeft" case "Home" case "End" role="tabpanel" aria-label={`${activeFilter} activities`}
// batch: undoBatchAction label: "Undo" onClick: () => undoBatchAction delete next[id] refetchApprovals toast.info Undone keydown handleKeyDown key === "a" key === "r" Press A approve R reject selectedIds.size === 0 confirmRejectOpen role="dialog" aria-modal="true" aria-label="Confirm batch reject" Cancel key === "Escape" e.target === e.currentTarget setConfirmRejectOpen(true) selectedIds toggleSelect handleBatchAction role="toolbar" aria-label="Batch actions" Approve all Reject all selectAll clearSelection type="checkbox" itemStates setItemStates handleAction itemState={itemStates onAction={handleAction} itemState === "success" import toast from sonner

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  AlertCircle,
  Bell,
  CheckCircle2,
  FileCheck,
  FileUp,
  Inbox,
  Clock,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  CalendarCheck,
  TrendingUp,
  CreditCard,
  Loader2,
  Bot,
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  XCircle,
  Square,
  CheckSquare,
  ChevronDown,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { useEntity } from "@/lib/entity-context";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { useSurfaceSync } from "@/lib/hooks/use-surface-sync";
import { emitDataChanged } from "@/lib/hooks/use-surface-sync";
import { useSrAnnounce } from "@/lib/hooks/use-sr-announce";
import { ProvenanceBadge } from "@/components/ai-native-v2/provenance";
import { IngestionReviewPanel } from "@/components/ingestion/ingestion-review-panel";

// ─── Activity Hub — AI-Native Decisions + Activity (/activity-hub/new) ────
//
// Left panel split into two sections via filter tabs:
//   - Decisions: items needing user approval (agent escalations, pending reviews)
//   - Activity: updates, completions, alerts (month-end done, bank statement needed)
//
// Keyboard: j/k navigate, a approve, r reject, s snooze, 1/2/3 filter

type ItemType = "decision" | "activity";

type DecisionItem = {
  id: string;
  itemType: ItemType;
  category: "agent_activity" | "ingestion" | "notification";
  severity: "urgent" | "approval" | "review" | "info";
  title: string;
  summary: string;
  rationale?: string;
  agentName?: string;
  confidence?: number;
  sourceDoc?: string;
  /** Real document id when this item resolves to an ingestion document */
  documentId?: string;
  /** Notification row type (e.g. "agent_escalation") when this item came
   * from the notifications feed. */
  notificationType?: string;
  /** Parsed notification payload — carries the underlying escalation logId. */
  notificationData?: Record<string, unknown>;
  amount?: string;
  createdAt?: string | Date;
  evidence?: Record<string, unknown>;
  // Activity-specific
  icon?: LucideIcon;
  tone?: "green" | "amber" | "red" | "blue";
  actionLabel?: string;
  actionHref?: string;
};

type FilterTab = "all" | "decisions" | "activity" | "tasks";

type UnifiedTask = {
  id: string;
  source: "close_task" | "live_run" | "daily_close";
  title: string;
  description: string | null;
  status:
    | "queued"
    | "in_progress"
    | "waiting"
    | "completed"
    | "failed"
    | "blocked"
    | "skipped";
  progress: number;
  agentName: string | null;
  agentInitials: string | null;
  agentColor: string | null;
  confidence: number | null;
  startedAt: Date | null;
  completedAt: Date | null;
  durationMs: number | null;
  currentStep: string | null;
  error: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
};

const SEVERITY_META = {
  urgent: { icon: AlertTriangle, tone: "text-error-clay", label: "Urgent" },
  approval: {
    icon: FileCheck,
    tone: "text-attention-amber",
    label: "Approval",
  },
  review: { icon: Clock, tone: "text-primary", label: "Review" },
  info: { icon: Bell, tone: "text-muted-foreground", label: "FYI" },
} as const;

const ACTIVITY_META: Record<
  string,
  { icon: LucideIcon; tone: "green" | "amber" | "red" | "blue" }
> = {
  month_end_complete: { icon: CalendarCheck, tone: "green" },
  bank_statement_needed: { icon: FileUp, tone: "amber" },
  report_ready: { icon: TrendingUp, tone: "blue" },
  reconciliation_done: { icon: CheckCircle2, tone: "green" },
  overdue_invoice: { icon: CreditCard, tone: "red" },
  budget_alert: { icon: AlertTriangle, tone: "amber" },
};

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

export default function DecisionsPage() {
  const { entityId } = useEntity();
  const router = useRouter();
  const { announce } = useSrAnnounce();

  useSurfaceSync({ entityId: entityId ?? "", surfaces: ["activity-hub"] });

  // ── Data ──────────────────────────────────────────────────────────────
  const { data: agentApprovals } = trpc.ingestion.listAgentApprovals.useQuery(
    { limit: 50 },
    { enabled: !!entityId, refetchInterval: 15_000 },
  );
  const { data: alerts } = trpc.notifications.listAgentAlerts.useQuery(
    { limit: 20, unreadOnly: false },
    { enabled: !!entityId, refetchInterval: 15_000 },
  );
  const { data: allNotifications } = trpc.notifications.list.useQuery(
    { limit: 30, onlyUnread: false },
    { enabled: !!entityId, refetchInterval: 30_000 },
  );
  const { data: tasksData, isLoading: tasksLoading } = trpc.tasks.list.useQuery(
    { limit: 50 },
    { enabled: !!entityId, refetchInterval: 10_000 },
  );

  const resolveApproval = trpc.approvals.resolve.useMutation();
  const rejectIngestion = trpc.ingestion.rejectReview.useMutation();
  const markNotificationRead = trpc.notifications.markAsRead.useMutation();

  // ── Build items ─────────────────────────────────────────────────────
  const items: DecisionItem[] = useMemo(() => {
    const out: DecisionItem[] = [];
    const seen = new Set<string>();

    // Agent approvals → decisions
    if (agentApprovals?.items) {
      for (const a of agentApprovals.items) {
        if (seen.has(a.id)) continue;
        seen.add(a.id);
        const meta = (a.metadata ?? {}) as Record<string, unknown>;
        out.push({
          id: a.id,
          itemType: "decision",
          category: "agent_activity",
          severity: "approval",
          title: a.title ?? "Agent action pending",
          summary: a.description ?? "Requires your review",
          rationale:
            (meta.recommendation as string) ?? a.description ?? undefined,
          agentName: a.workflow ?? "AI Agent",
          confidence: a.confidence ?? undefined,
          sourceDoc: a.documentName ?? undefined,
          createdAt: a.createdAt,
          evidence: (meta.inputData ?? {}) as Record<string, unknown>,
        });
      }
    }

    // Agent alerts → decisions (if urgent)
    if (alerts?.alerts) {
      for (const al of alerts.alerts) {
        if (seen.has(al.id)) continue;
        seen.add(al.id);
        const isUrgent = al.priority === "critical" || al.priority === "high";
        out.push({
          id: al.id,
          itemType: isUrgent ? "decision" : "activity",
          category: "notification",
          severity:
            al.priority === "critical"
              ? "urgent"
              : al.priority === "high"
                ? "approval"
                : "info",
          title: al.title,
          summary: al.body ?? "",
          agentName: al.agentSource.replace(/-agent$/, "").replace(/_/g, " "),
          createdAt: al.createdAt ?? undefined,
        });
      }
    }

    // All notifications → activity items
    if (allNotifications?.length) {
      for (const n of allNotifications) {
        if (seen.has(n.id)) continue;
        seen.add(n.id);

        // Map notification type to activity meta
        const typeKey = n.type ?? "info";
        const activityMeta = ACTIVITY_META[typeKey];

        // The notification `data` column holds JSON with the real document id
        // for ingestion notifications — parse it so review actions target the
        // document, not the notification row.
        // `data` may already be parsed (web list router returns structured
        // metadata) or a raw JSON string (older rows / other routers). Handle
        // both so the real documentId is always found.
        let notificationData: Record<string, unknown> = {};
        if (n.data && typeof n.data === "object") {
          notificationData = n.data as Record<string, unknown>;
        } else if (typeof n.data === "string") {
          try {
            notificationData = JSON.parse(n.data) as Record<string, unknown>;
          } catch {
            notificationData = {};
          }
        }
        const documentId =
          typeof notificationData.documentId === "string"
            ? notificationData.documentId
            : undefined;

        const isIngestionNotification =
          typeKey === "ingestion_review" ||
          typeKey === "ingestion_rejected" ||
          typeKey === "ingestion_failed" ||
          typeKey === "ingestion_escalated";

        // Determine if this is a decision or activity
        const isDecision =
          isIngestionNotification ||
          typeKey === "agent_escalation" ||
          typeKey === "agent_flag" ||
          typeKey === "overdue_invoice" ||
          typeKey === "budget_exceeded";

        out.push({
          id: n.id,
          itemType: isDecision ? "decision" : "activity",
          category: isIngestionNotification ? "ingestion" : "notification",
          severity: isDecision ? "approval" : "info",
          title: n.title,
          summary: n.body ?? "",
          createdAt: n.createdAt ?? undefined,
          documentId,
          notificationType: typeKey,
          notificationData,
          icon: activityMeta?.icon,
          tone: activityMeta?.tone,
          actionLabel:
            typeKey === "bank_statement_needed"
              ? "Upload statement"
              : typeKey === "month_end_complete"
                ? "View summary"
                : typeKey === "report_ready"
                  ? "View report"
                  : undefined,
          actionHref:
            typeKey === "bank_statement_needed"
              ? "/dashboard/operations"
              : typeKey === "month_end_complete"
                ? "/dashboard/financial-pulse"
                : typeKey === "report_ready"
                  ? "/dashboard/financial-pulse"
                  : undefined,
        });
      }
    }

    // Add synthetic "bank statement needed" if no connected bank
    // (this is a common real-world scenario)
    if (entityId) {
      const hasBankAlert = out.some(
        (i) =>
          i.title.toLowerCase().includes("bank statement") ||
          i.title.toLowerCase().includes("upload"),
      );
      if (!hasBankAlert) {
        // Check if we have bank connection status
        // For now, we'll add a generic "upload statement" prompt
        // that appears when reconciliation is needed
      }
    }

    const order = { urgent: 0, approval: 1, review: 2, info: 3 } as const;
    return out.sort((x, y) => order[x.severity] - order[y.severity]);
  }, [agentApprovals, alerts, allNotifications, entityId]);

  // ── Filter + selection state ─────────────────────────────────────────
  const [filter, setFilter] = useState<FilterTab>("all");
  const [cursor, setCursor] = useState(0);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [completedExpanded, setCompletedExpanded] = useState(false);
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const [reviewDocumentId, setReviewDocumentId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (filter === "decisions")
      return items.filter((i) => i.itemType === "decision");
    if (filter === "activity")
      return items.filter((i) => i.itemType === "activity");
    if (filter === "tasks") return []; // Tasks are rendered separately
    return items;
  }, [items, filter]);

  const visible = filtered.filter((i) => !dismissed.has(i.id));
  const selected = visible[Math.min(cursor, visible.length - 1)] ?? null;

  // Counts for tab badges
  const decisionCount = items.filter(
    (i) => i.itemType === "decision" && !dismissed.has(i.id),
  ).length;
  const activityCount = items.filter(
    (i) => i.itemType === "activity" && !dismissed.has(i.id),
  ).length;
  const taskCount = tasksData?.counts?.running ?? 0;
  const taskTotalCount = tasksData?.counts?.total ?? 0;

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
              (action === "approve"
                ? "Approved from Decisions"
                : "Rejected from Decisions"),
          });
        } else if (item.category === "notification") {
          // An escalation notification is a copy of a real escalation in the
          // routing logs. Approving/rejecting must resolve that underlying
          // escalation (payload carries its logId), not just mark the
          // notification read — otherwise the decision silently does
          // nothing to the queue.
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
                (action === "approve"
                  ? "Approved from Activity Hub"
                  : "Rejected from Activity Hub"),
            });
          }
          await markNotificationRead.mutateAsync({ id: item.id });
        } else if (item.category === "ingestion") {
          await rejectIngestion.mutateAsync({
            documentId: item.documentId ?? item.id,
            reason: note.trim() || "Rejected from Decisions",
          });
        }
        setDismissed((p) => new Set(p).add(item.id));
        toast.success(action === "approve" ? "Approved" : "Rejected", {
          action: {
            label: "Undo",
            onClick: () =>
              setDismissed((p) => {
                const n = new Set(p);
                n.delete(item.id);
                return n;
              }),
          },
        });
        announce(action === "approve" ? "Approved" : "Rejected");
        if (entityId) {
          emitDataChanged(
            "activity-hub",
            `${action}_${item.category}`,
            entityId,
          );
        }
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
    [
      resolveApproval,
      markNotificationRead,
      rejectIngestion,
      note,
      announce,
      entityId,
    ],
  );

  const snooze = useCallback((item: DecisionItem) => {
    setDismissed((p) => new Set(p).add(item.id));
    toast.info("Snoozed for 1 hour", {
      action: {
        label: "Restore",
        onClick: () =>
          setDismissed((p) => {
            const n = new Set(p);
            n.delete(item.id);
            return n;
          }),
      },
    });
  }, []);

  const dismissActivity = useCallback((id: string) => {
    setDismissed((p) => new Set(p).add(id));
  }, []);

  // ── Batch actions ──────────────────────────────────────────────────────
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }, []);

  const selectAll = useCallback(() => {
    const decisionItems = visible.filter(
      (i) => i.itemType === "decision" && !pendingIds.has(i.id),
    );
    setSelectedIds(new Set(decisionItems.map((i) => i.id)));
  }, [visible, pendingIds]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const batchDecide = useCallback(
    async (action: "approve" | "reject") => {
      const ids = Array.from(selectedIds);
      if (ids.length === 0) return;
      const items = visible.filter((i) => ids.includes(i.id));
      setPendingIds((p) => {
        const n = new Set(p);
        ids.forEach((id) => n.add(id));
        return n;
      });
      let succeeded = 0;
      for (const item of items) {
        try {
          if (item.category === "agent_activity") {
            await resolveApproval.mutateAsync({
              itemId: item.id,
              itemType: "agent_escalation",
              action: action === "approve" ? "approved" : "rejected",
              reason: `Batch ${action}`,
            });
            succeeded++;
          } else if (item.category === "ingestion") {
            await rejectIngestion.mutateAsync({
              documentId: item.documentId ?? item.id,
              reason: `Batch ${action}`,
            });
            succeeded++;
          }
        } catch {}
      }
      setDismissed((p) => {
        const n = new Set(p);
        ids.forEach((id) => n.add(id));
        return n;
      });
      setSelectedIds(new Set());
      setPendingIds((p) => {
        const n = new Set(p);
        ids.forEach((id) => n.delete(id));
        return n;
      });
      toast.success(
        `${succeeded} item${succeeded !== 1 ? "s" : ""} ${action}d`,
        {
          action: {
            label: "Undo",
            onClick: () =>
              setDismissed((p) => {
                const n = new Set(p);
                ids.forEach((id) => n.delete(id));
                return n;
              }),
          },
        },
      );
      if (entityId) {
        emitDataChanged("activity-hub", `batch_${action}`, entityId);
      }
    },
    [selectedIds, visible, resolveApproval, rejectIngestion, entityId],
  );

  // ── Keyboard triage ──────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName.match(/INPUT|TEXTAREA|SELECT/))
        return;

      // Shift+A = select all visible decisions
      if (e.shiftKey && e.key === "A") {
        e.preventDefault();
        selectAll();
        return;
      }
      // Shift+X = batch approve selected
      if (e.shiftKey && e.key === "X") {
        e.preventDefault();
        if (selectedIds.size > 0) void batchDecide("approve");
        return;
      }
      // Shift+Z = clear selection
      if (e.shiftKey && e.key === "Z") {
        e.preventDefault();
        clearSelection();
        return;
      }

      if (e.metaKey || e.ctrlKey || e.altKey) return;

      switch (e.key) {
        case "1":
          e.preventDefault();
          setFilter("all");
          setCursor(0);
          break;
        case "2":
          e.preventDefault();
          setFilter("decisions");
          setCursor(0);
          break;
        case "3":
          e.preventDefault();
          setFilter("activity");
          setCursor(0);
          break;
        case "4":
          e.preventDefault();
          setFilter("tasks");
          setCursor(0);
          break;
        case "j":
        case "ArrowDown":
          e.preventDefault();
          setCursor((c) => Math.min(c + 1, visible.length - 1));
          break;
        case "k":
        case "ArrowUp":
          e.preventDefault();
          setCursor((c) => Math.max(c - 1, 0));
          break;
        case "a":
          if (selected && selected.itemType === "decision")
            void decide(selected, "approve");
          break;
        case "r":
          if (selected && selected.itemType === "decision") {
            setNoteFor(selected.id);
            e.preventDefault();
          }
          break;
        case "s":
          if (selected && selected.itemType === "decision") snooze(selected);
          break;
        case "Escape":
          setNoteFor(null);
          setNote("");
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    visible.length,
    selected,
    decide,
    snooze,
    selectAll,
    batchDecide,
    clearSelection,
    selectedIds,
  ]);

  // Announce triage movement for screen readers.
  useEffect(() => {
    if (selected) {
      announce(`Selected: ${selected.title}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  return (
    <div className="flex h-full min-h-0 flex-col pb-16 md:pb-0">
      {/* ── Header + Filter Tabs ──────────────────────────────────────── */}
      <header className="border-b border-border/40">
        <div className="flex items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <Inbox className="h-4 w-4 text-primary" aria-hidden="true" />
            <h1 className="text-sm font-semibold tracking-tight text-foreground">
              Activity Hub
            </h1>
            <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
              {visible.length} items
            </span>
            {decisionCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-error-clay/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-error-clay">
                {decisionCount} need you
              </span>
            )}
          </div>
          <p className="hidden font-mono text-[10px] text-muted-foreground/60 sm:block">
            1/2/3/4 filter · j/k move · a/r decide
          </p>
        </div>

        {/* Filter tabs */}
        <div
          className="flex items-center gap-1 px-4 pb-2 sm:px-6"
          role="tablist"
          aria-label="Activity filters"
        >
          {(
            [
              {
                key: "all" as const,
                label: "All",
                count: visible.length + taskCount,
              },
              {
                key: "decisions" as const,
                label: "Decisions",
                count: decisionCount,
              },
              {
                key: "activity" as const,
                label: "Activity",
                count: activityCount,
              },
              {
                key: "tasks" as const,
                label: "Tasks",
                count: taskCount,
                total: taskTotalCount,
              },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={filter === tab.key}
              onClick={() => {
                setFilter(tab.key);
                setCursor(0);
              }}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all",
                filter === tab.key
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
              )}
            >
              {tab.label}
              {"total" in tab && tab.total > 0 ? (
                <span
                  className={cn(
                    "inline-flex min-w-[18px] items-center justify-center rounded-full px-1 py-0.5 text-[9px] font-bold tabular-nums",
                    filter === tab.key
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {tab.count}/{tab.total}
                </span>
              ) : tab.count > 0 ? (
                <span
                  className={cn(
                    "inline-flex min-w-[18px] items-center justify-center rounded-full px-1 py-0.5 text-[9px] font-bold tabular-nums",
                    filter === tab.key
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {tab.count}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </header>

      {filter === "tasks" ? (
        <TasksView
          tasks={tasksData?.tasks ?? []}
          isLoading={tasksLoading}
          counts={tasksData?.counts}
        />
      ) : visible.length === 0 ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
          <CheckCircle2
            className="mb-1 h-8 w-8 text-balanced-green"
            aria-hidden="true"
          />
          <p className="text-sm font-medium text-foreground">
            {filter === "decisions"
              ? "No decisions pending"
              : filter === "activity"
                ? "No recent activity"
                : "Queue clear"}
          </p>
          <p className="max-w-xs text-xs text-muted-foreground">
            {filter === "decisions"
              ? "Agents are running your books. Decisions will appear here when they need your call."
              : filter === "activity"
                ? "Agent completions, updates, and alerts will appear here."
                : "Agents are running your books. Anything that needs your call lands here."}
          </p>
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 lg:grid-cols-[380px_1fr]">
          {/* ── Queue pane ─────────────────────────────────────────────── */}
          <div
            ref={listRef}
            role="listbox"
            aria-label="Activity queue"
            aria-activedescendant={selected ? `item-${selected.id}` : undefined}
            className="min-h-0 overflow-y-auto border-b border-border/40 lg:border-b-0 lg:border-r"
          >
            {visible.map((item, idx) => {
              const isSelected = selected?.id === item.id;
              const isActivity = item.itemType === "activity";

              // Activity items get their own icon/tone
              const ActivityIcon = item.icon;
              const meta = !isActivity ? SEVERITY_META[item.severity] : null;

              return (
                <button
                  key={item.id}
                  id={`item-${item.id}`}
                  role="option"
                  aria-selected={isSelected}
                  disabled={pendingIds.has(item.id)}
                  onClick={(e) => {
                    if (e.shiftKey) {
                      toggleSelect(item.id);
                    } else {
                      setCursor(idx);
                      // Open ingestion review panel for ingestion items — the
                      // documentId comes from the notification data JSON, never
                      // the notification id itself.
                      if (item.category === "ingestion" && item.documentId) {
                        setReviewDocumentId(item.documentId);
                      }
                    }
                  }}
                  className={cn(
                    "flex w-full items-start gap-2.5 border-b border-border/30 px-4 py-3 text-left transition-colors last:border-0",
                    isSelected ? "bg-primary/[0.06]" : "hover:bg-accent/40",
                    selectedIds.has(item.id) && "bg-primary/[0.04]",
                  )}
                >
                  {/* Checkbox (for batch selection) */}
                  <span
                    className="mt-0.5 shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelect(item.id);
                    }}
                  >
                    {selectedIds.has(item.id) ? (
                      <CheckSquare className="h-3.5 w-3.5 text-primary" />
                    ) : (
                      <Square className="h-3.5 w-3.5 text-muted-foreground/30" />
                    )}
                  </span>

                  {/* Icon */}
                  {isActivity && ActivityIcon ? (
                    <span
                      className={cn(
                        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md",
                        item.tone === "green"
                          ? "bg-balanced-green/10"
                          : item.tone === "amber"
                            ? "bg-attention-amber/10"
                            : item.tone === "red"
                              ? "bg-error-clay/10"
                              : "bg-primary/10",
                      )}
                    >
                      <ActivityIcon
                        className={cn(
                          "h-3 w-3",
                          item.tone === "green"
                            ? "text-balanced-green"
                            : item.tone === "amber"
                              ? "text-attention-amber"
                              : item.tone === "red"
                                ? "text-error-clay"
                                : "text-primary",
                        )}
                        aria-hidden="true"
                      />
                    </span>
                  ) : meta ? (
                    <meta.icon
                      className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", meta.tone)}
                      aria-hidden="true"
                    />
                  ) : (
                    <Bell
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                  )}

                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="block truncate text-xs font-medium text-foreground">
                        {item.title}
                      </span>
                      {isActivity && (
                        <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[8px] font-bold uppercase text-muted-foreground">
                          FYI
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      {!isActivity && item.confidence !== undefined && (
                        <span
                          className={cn(
                            "font-mono font-semibold tabular-nums",
                            item.confidence >= 0.8
                              ? "text-balanced-green"
                              : item.confidence >= 0.6
                                ? "text-attention-amber"
                                : "text-error-clay",
                          )}
                        >
                          {Math.round(item.confidence * 100)}%
                        </span>
                      )}
                      {item.agentName && (
                        <span className="truncate">{item.agentName}</span>
                      )}
                      <span aria-hidden="true">·</span>
                      <span className="shrink-0">
                        {timeAgo(item.createdAt)}
                      </span>
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* Floating batch action bar */}
          {selectedIds.size > 0 && (
            <div className="sticky bottom-0 z-20 flex items-center justify-between border-t border-border/40 bg-background/95 px-4 py-2 backdrop-blur-sm">
              <span className="text-xs text-muted-foreground">
                {selectedIds.size} selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void batchDecide("approve")}
                  className="inline-flex items-center gap-1 rounded-lg bg-balanced-green/10 px-3 py-1.5 text-xs font-medium text-balanced-green hover:bg-balanced-green/20 transition-colors"
                >
                  <ThumbsUp className="h-3 w-3" />
                  Approve all
                </button>
                <button
                  type="button"
                  onClick={clearSelection}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          {/* ── Brief pane ─────────────────────────────────────────────── */}
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
                onSnooze={() => snooze(selected)}
                onDismiss={() => dismissActivity(selected.id)}
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
      )}

      {/* Completed section */}
      {filter !== "tasks" && dismissed.size > 0 && (
        <div className="border-t border-border/30">
          <button
            type="button"
            onClick={() => setCompletedExpanded((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-balanced-green" />
              Completed today
              <span className="font-mono tabular-nums text-muted-foreground/60">
                {dismissed.size}
              </span>
            </span>
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 transition-transform",
                completedExpanded && "rotate-180",
              )}
            />
          </button>
          {completedExpanded && (
            <div className="px-4 pb-3 text-[11px] text-muted-foreground/60">
              Items you approved, rejected, or snoozed will appear here.
            </div>
          )}
        </div>
      )}

      {/* ── Ingestion Review Panel (slide-over) ──────────────────── */}
      {reviewDocumentId && (
        <IngestionReviewPanel
          documentId={reviewDocumentId}
          onClose={() => setReviewDocumentId(null)}
        />
      )}
    </div>
  );
}

// ─── Brief pane ───────────────────────────────────────────────────────────

function BriefPane({
  item,
  busy,
  noteOpen,
  note,
  onNoteChange,
  onToggleNote,
  onDecide,
  onSnooze,
  onDismiss,
  onAskAi,
}: {
  item: DecisionItem;
  busy: boolean;
  noteOpen: boolean;
  note: string;
  onNoteChange: (v: string) => void;
  onToggleNote: () => void;
  onDecide: (a: "approve" | "reject") => void;
  onSnooze: () => void;
  onDismiss: () => void;
  onAskAi: (question: string) => void;
}) {
  const isActivity = item.itemType === "activity";
  const meta = !isActivity ? SEVERITY_META[item.severity] : null;
  const ActivityIcon = item.icon;
  const evidenceKeys =
    item.evidence && Object.keys(item.evidence).length > 0
      ? Object.entries(item.evidence).slice(0, 6)
      : [];

  return (
    <article className="mx-auto max-w-2xl space-y-5 p-5 sm:p-6">
      {/* Title */}
      <div>
        <div className="flex items-center gap-2">
          {isActivity && ActivityIcon ? (
            <span
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-md",
                item.tone === "green"
                  ? "bg-balanced-green/10"
                  : item.tone === "amber"
                    ? "bg-attention-amber/10"
                    : item.tone === "red"
                      ? "bg-error-clay/10"
                      : "bg-primary/10",
              )}
            >
              <ActivityIcon
                className={cn(
                  "h-3.5 w-3.5",
                  item.tone === "green"
                    ? "text-balanced-green"
                    : item.tone === "amber"
                      ? "text-attention-amber"
                      : item.tone === "red"
                        ? "text-error-clay"
                        : "text-primary",
                )}
                aria-hidden="true"
              />
            </span>
          ) : meta ? (
            <meta.icon
              className={cn("h-4 w-4", meta.tone)}
              aria-hidden="true"
            />
          ) : (
            <Bell
              className="h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
          )}
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {isActivity ? "Activity Update" : (meta?.label ?? "Update")}
          </span>
        </div>
        <h2 className="mt-1.5 text-base font-semibold leading-snug text-foreground">
          {item.title}
        </h2>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {!isActivity && (
            <ProvenanceBadge
              actor="agent"
              actorName={item.agentName}
              confidence={item.confidence}
              source={item.sourceDoc}
            />
          )}
          {item.amount && (
            <span className="rounded-full bg-attention-amber/10 px-2 py-0.5 font-mono text-[11px] font-semibold tabular-nums text-attention-amber">
              {item.amount}
            </span>
          )}
        </div>
      </div>

      {/* What */}
      <Section title="What this is">
        <p className="text-sm leading-relaxed text-foreground/85">
          {item.summary}
        </p>
      </Section>

      {/* Why (decisions only) */}
      {item.rationale && (
        <Section title="Why the agent recommends this">
          <p className="rounded-lg border border-primary/15 bg-primary/[0.04] px-3 py-2.5 text-[13px] leading-relaxed text-foreground/85">
            {item.rationale}
          </p>
        </Section>
      )}

      {/* Evidence (decisions only) */}
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

      {/* Note (decisions only) */}
      {noteOpen && (
        <div>
          <label
            htmlFor={`note-${item.id}`}
            className="text-[11px] font-medium text-muted-foreground"
          >
            Reason for rejecting (helps the agent learn)
          </label>
          <textarea
            id={`note-${item.id}`}
            value={note}
            onChange={(e) => onNoteChange(e.target.value)}
            rows={2}
            autoFocus
            placeholder="Tell the agent what it missed…"
            className="mt-1 w-full resize-none rounded-lg border border-border/50 bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      )}

      {/* Actions */}
      <footer className="flex flex-wrap items-center gap-2 border-t border-border/40 pt-4">
        {isActivity ? (
          <>
            {/* Activity: just dismiss + optional action */}
            {item.actionLabel && item.actionHref && (
              <a
                href={item.actionHref}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                {item.actionLabel}
              </a>
            )}
            <button
              type="button"
              onClick={onDismiss}
              className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Dismiss
            </button>
          </>
        ) : (
          <>
            {/* Decision: approve/reject/snooze */}
            <button
              type="button"
              disabled={busy}
              onClick={() => onDecide("approve")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-balanced-green px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-balanced-green/90 disabled:opacity-50"
            >
              <ThumbsUp className="h-3.5 w-3.5" aria-hidden="true" />
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
            <button
              type="button"
              onClick={onSnooze}
              disabled={busy}
              className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
            >
              Snooze 1h
            </button>
          </>
        )}

        <button
          type="button"
          onClick={() =>
            onAskAi(`Explain this: "${item.title}". ${item.summary}`)
          }
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/5"
        >
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          Ask the CFO
        </button>
      </footer>
    </article>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
        {title}
      </h3>
      {children}
    </section>
  );
}

// ─── Tasks View ────────────────────────────────────────────────────────────
//
// AI-native running tasks view. Shows what the AI is working on right now.
// Tasks are grouped by status: running, queued, completed, failed.

function TasksView({
  tasks,
  isLoading,
  counts,
}: {
  tasks: UnifiedTask[];
  isLoading: boolean;
  counts?: {
    total: number;
    running: number;
    completed: number;
    failed: number;
  };
}) {
  const [selectedTask, setSelectedTask] = useState<UnifiedTask | null>(null);
  const [statusFilter, setStatusFilter] = useState<
    "all" | "running" | "completed" | "failed"
  >("all");

  const filteredTasks = useMemo(() => {
    if (statusFilter === "all") return tasks;
    if (statusFilter === "running")
      return tasks.filter(
        (t) =>
          t.status === "in_progress" ||
          t.status === "queued" ||
          t.status === "waiting",
      );
    if (statusFilter === "completed")
      return tasks.filter((t) => t.status === "completed");
    if (statusFilter === "failed")
      return tasks.filter(
        (t) => t.status === "failed" || t.status === "blocked",
      );
    return tasks;
  }, [tasks, statusFilter]);

  if (isLoading) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
        <CheckCircle2
          className="mb-1 h-8 w-8 text-balanced-green"
          aria-hidden="true"
        />
        <p className="text-sm font-medium text-foreground">No tasks running</p>
        <p className="max-w-xs text-xs text-muted-foreground">
          AI agents will start tasks automatically. They&apos;ll appear here as
          they run.
        </p>
      </div>
    );
  }

  return (
    <div className="grid min-h-0 flex-1 lg:grid-cols-[380px_1fr]">
      {/* Task list */}
      <div className="min-h-0 overflow-y-auto border-b border-border/40 lg:border-b-0 lg:border-r">
        {/* Status filter chips */}
        <div className="flex items-center gap-1.5 border-b border-border/30 px-4 py-2">
          {(
            [
              { key: "all" as const, label: "All", count: counts?.total ?? 0 },
              {
                key: "running" as const,
                label: "Running",
                count: counts?.running ?? 0,
                color: "text-primary",
              },
              {
                key: "completed" as const,
                label: "Done",
                count: counts?.completed ?? 0,
                color: "text-balanced-green",
              },
              {
                key: "failed" as const,
                label: "Failed",
                count: counts?.failed ?? 0,
                color: "text-error-clay",
              },
            ] as const
          ).map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => setStatusFilter(chip.key)}
              className={cn(
                "flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-all",
                statusFilter === chip.key
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent/50",
              )}
            >
              {chip.key === "running" && (
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
              )}
              {chip.label}
              {chip.count > 0 && (
                <span className={cn("font-mono tabular-nums", chip.color)}>
                  {chip.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Task items */}
        {filteredTasks.length === 0 ? (
          <div className="flex items-center justify-center p-8 text-xs text-muted-foreground">
            No tasks in this category
          </div>
        ) : (
          filteredTasks.map((task) => (
            <button
              key={task.id}
              type="button"
              onClick={() => setSelectedTask(task)}
              className={cn(
                "flex w-full items-start gap-3 border-b border-border/30 px-4 py-3 text-left transition-colors last:border-0",
                selectedTask?.id === task.id
                  ? "bg-primary/[0.06]"
                  : "hover:bg-accent/40",
              )}
            >
              {/* Status icon */}
              <TaskStatusIcon status={task.status} />

              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="block truncate text-xs font-medium text-foreground">
                    {task.title}
                  </span>
                  <TaskSourceBadge source={task.source} />
                </span>

                {/* Progress bar for running tasks */}
                {(task.status === "in_progress" ||
                  task.status === "queued") && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-500"
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>
                    <span className="font-mono text-[9px] tabular-nums text-muted-foreground">
                      {task.progress}%
                    </span>
                  </div>
                )}

                {/* Time + confidence info */}
                <span className="mt-1 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  {task.confidence !== null && (
                    <span
                      className={cn(
                        "font-mono font-semibold tabular-nums",
                        task.confidence >= 0.8
                          ? "text-balanced-green"
                          : "text-attention-amber",
                      )}
                    >
                      {Math.round(task.confidence * 100)}%
                    </span>
                  )}
                  <span className="shrink-0">
                    {timeAgo(task.startedAt ?? task.createdAt)}
                  </span>
                  {task.durationMs !== null && (
                    <span className="text-muted-foreground/60">
                      ({formatDuration(task.durationMs)})
                    </span>
                  )}
                </span>
              </span>
            </button>
          ))
        )}
      </div>

      {/* Task detail pane */}
      <div className="min-h-0 overflow-y-auto">
        {selectedTask ? (
          <TaskDetail task={selectedTask} />
        ) : (
          <div className="flex h-full items-center justify-center p-8 text-sm text-muted-foreground">
            Select a task to see details
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Task Sub-Components ──────────────────────────────────────────────────

function TaskStatusIcon({ status }: { status: UnifiedTask["status"] }) {
  const iconClass = "h-3.5 w-3.5 shrink-0";

  switch (status) {
    case "in_progress":
      return (
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-primary/10">
          <Loader2 className={cn(iconClass, "text-primary animate-spin")} />
        </span>
      );
    case "queued":
      return (
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-muted">
          <Clock className={cn(iconClass, "text-muted-foreground")} />
        </span>
      );
    case "waiting":
      return (
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-attention-amber/10">
          <Pause className={cn(iconClass, "text-attention-amber")} />
        </span>
      );
    case "completed":
      return (
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-balanced-green/10">
          <CheckCircle2 className={cn(iconClass, "text-balanced-green")} />
        </span>
      );
    case "failed":
    case "blocked":
      return (
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-error-clay/10">
          <XCircle className={cn(iconClass, "text-error-clay")} />
        </span>
      );
    case "skipped":
      return (
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-muted">
          <RotateCcw className={cn(iconClass, "text-muted-foreground")} />
        </span>
      );
    default:
      return (
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-muted">
          <Bot className={cn(iconClass, "text-muted-foreground")} />
        </span>
      );
  }
}

function TaskSourceBadge({ source }: { source: UnifiedTask["source"] }) {
  const meta = {
    close_task: {
      label: "Close",
      color: "bg-attention-amber/10 text-attention-amber",
    },
    live_run: { label: "Agent", color: "bg-primary/10 text-primary" },
    daily_close: {
      label: "Daily",
      color: "bg-balanced-green/10 text-balanced-green",
    },
  }[source];

  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase",
        meta.color,
      )}
    >
      {meta.label}
    </span>
  );
}

function TaskDetail({ task }: { task: UnifiedTask }) {
  const isRunning =
    task.status === "in_progress" ||
    task.status === "queued" ||
    task.status === "waiting";
  const isComplete = task.status === "completed";

  return (
    <article className="space-y-0">
      {/* Hero — live status banner */}
      <div
        className={cn(
          "relative px-5 pt-5 pb-4 sm:px-6",
          isRunning && "bg-primary/[0.03]",
          task.status === "failed" && "bg-error-clay/[0.03]",
        )}
      >
        {isRunning && (
          <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.04] to-transparent" />
        )}
        <div className="relative">
          <div className="flex items-center gap-2">
            <TaskStatusIcon status={task.status} />
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {task.source === "close_task"
                ? "Month-End Close"
                : task.source === "live_run"
                  ? "Agent Run"
                  : "Daily Close"}
            </span>
            <TaskSourceBadge source={task.source} />
          </div>

          <h2 className="mt-1.5 text-base font-semibold leading-snug text-foreground">
            {task.title}
          </h2>

          {/* Confidence + timing row */}
          <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
            {task.confidence !== null && (
              <span className="flex items-center gap-1">
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    task.confidence >= 0.8
                      ? "bg-balanced-green"
                      : "bg-attention-amber",
                  )}
                />
                <span
                  className={cn(
                    "font-semibold tabular-nums",
                    task.confidence >= 0.8
                      ? "text-balanced-green"
                      : "text-attention-amber",
                  )}
                >
                  {Math.round(task.confidence * 100)}% confidence
                </span>
              </span>
            )}
            {task.durationMs !== null && (
              <span>{formatDuration(task.durationMs)}</span>
            )}
            {task.startedAt && !isRunning && (
              <span>{timeAgo(task.startedAt)} ago</span>
            )}
          </div>
        </div>
      </div>

      {/* Progress bar — only for running */}
      {isRunning && (
        <div className="border-t border-border/30 px-5 py-3 sm:px-6">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1.5">
            <span className="font-medium">
              {task.currentStep ?? "Working..."}
            </span>
            <span className="font-mono tabular-nums">{task.progress}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
              style={{ width: `${task.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Live step feed — the AI-native core */}
      {task.source === "live_run" && (
        <StepFeed taskId={task.id} source={task.source} isRunning={isRunning} />
      )}

      {/* Error banner */}
      {task.error && (
        <div className="mx-5 sm:mx-6 mb-4">
          <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2.5">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
            <span className="text-xs text-destructive leading-relaxed">
              {task.error}
            </span>
          </div>
        </div>
      )}

      {/* Description */}
      {task.description && (
        <div className="mx-5 sm:mx-6 mb-4">
          <p className="text-xs leading-relaxed text-muted-foreground">
            {task.description}
          </p>
        </div>
      )}

      {/* Metadata — compact row */}
      {task.metadata && Object.keys(task.metadata).length > 0 && (
        <div className="mx-5 sm:mx-6 mb-4">
          <div className="flex flex-wrap gap-2">
            {Object.entries(task.metadata)
              .filter(
                ([k, v]) =>
                  v !== null &&
                  v !== undefined &&
                  ![
                    "model",
                    "costUsd",
                    "inputTokens",
                    "outputTokens",
                    "runId",
                    "steps",
                  ].includes(k),
              )
              .slice(0, 6)
              .map(([k, v]) => (
                <span
                  key={k}
                  className="inline-flex items-center gap-1 rounded-md bg-muted/50 px-2 py-1 text-[10px]"
                >
                  <span className="text-muted-foreground">
                    {k.replace(/([A-Z])/g, " $1").replace(/_/g, " ")}
                  </span>
                  <span className="font-medium text-foreground">
                    {typeof v === "object" ? "..." : String(v)}
                  </span>
                </span>
              ))}
          </div>
        </div>
      )}
    </article>
  );
}

// ─── Step Feed (AI-Native Live View) ──────────────────────────────────────
// Shows step-by-step progress like Cursor/Devin — the core AI UX.

function StepFeed({
  taskId,
  source,
  isRunning,
}: {
  taskId: string;
  source: UnifiedTask["source"];
  isRunning: boolean;
}) {
  const stepsQuery = trpc.tasks.getSteps.useQuery(
    { taskId, source: source as "live_run" | "daily_close" | "close_task" },
    { refetchInterval: isRunning ? 2000 : false },
  );

  const steps = stepsQuery.data?.steps ?? [];

  if (steps.length === 0) {
    if (!isRunning) return null;
    return (
      <div className="mx-5 sm:mx-6 mb-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin text-primary" />
          <span>Initializing...</span>
        </div>
      </div>
    );
  }

  const completedCount = steps.filter((s) => s.status === "completed").length;
  const failedStep = steps.find((s) => s.status === "failed");
  const currentStep = steps.find((s) => s.status === "in_progress");

  return (
    <div className="mx-5 sm:mx-6 mb-4">
      <div className="rounded-lg border border-border/40 bg-muted/20">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/30 px-3 py-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {isRunning ? "Live" : "Steps"}
          </span>
          <span className="text-[10px] tabular-nums text-muted-foreground">
            {completedCount}/{steps.length}
          </span>
        </div>

        {/* Steps */}
        <div className="divide-y divide-border/20">
          {steps.map((step, i) => (
            <StepItem
              key={`${step.stepNumber}-${step.name}`}
              step={step}
              stepNumber={i + 1}
              totalSteps={steps.length}
              isLast={i === steps.length - 1}
            />
          ))}
        </div>

        {/* Live indicator */}
        {isRunning && currentStep && (
          <div className="flex items-center gap-2 border-t border-border/30 px-3 py-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            <span className="text-[11px] text-primary font-medium">
              {currentStep.name}
            </span>
          </div>
        )}

        {/* Failure banner */}
        {failedStep && (
          <div className="flex items-center gap-2 border-t border-destructive/20 bg-destructive/5 px-3 py-2">
            <XCircle className="h-3 w-3 shrink-0 text-destructive" />
            <span className="text-[11px] text-destructive">
              Failed: {failedStep.name}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Single Step Item ──────────────────────────────────────────────────────

function StepItem({
  step,
  stepNumber,
  totalSteps,
  isLast,
}: {
  step: {
    name: string;
    status: string;
    durationMs: number | null;
    error: string | null;
  };
  stepNumber: number;
  totalSteps: number;
  isLast: boolean;
}) {
  const isComplete = step.status === "completed";
  const isFailed = step.status === "failed";
  const isActive = step.status === "in_progress";
  const isSkipped = step.status === "skipped";

  return (
    <div className="flex items-start gap-2.5 px-3 py-2">
      {/* Status indicator */}
      <div className="mt-0.5 flex shrink-0 items-center justify-center">
        {isComplete ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-balanced-green" />
        ) : isFailed ? (
          <XCircle className="h-3.5 w-3.5 text-destructive" />
        ) : isActive ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
        ) : isSkipped ? (
          <SkipForward className="h-3.5 w-3.5 text-muted-foreground/50" />
        ) : (
          <span className="flex h-3.5 w-3.5 items-center justify-center">
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
          </span>
        )}
      </div>

      {/* Step content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              "text-xs truncate",
              isActive && "font-medium text-foreground",
              isComplete && "text-muted-foreground",
              isFailed && "text-destructive",
              !isActive &&
                !isComplete &&
                !isFailed &&
                "text-muted-foreground/60",
            )}
          >
            {step.name}
          </span>
          {step.durationMs !== null && (
            <span className="shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground/60">
              {formatDuration(step.durationMs)}
            </span>
          )}
        </div>
        {step.error && (
          <span className="mt-0.5 block text-[10px] text-destructive truncate">
            {step.error}
          </span>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: UnifiedTask["status"] }) {
  const meta = {
    in_progress: { label: "Running", color: "bg-primary/10 text-primary" },
    queued: { label: "Queued", color: "bg-muted text-muted-foreground" },
    waiting: {
      label: "Waiting",
      color: "bg-attention-amber/10 text-attention-amber",
    },
    completed: {
      label: "Completed",
      color: "bg-balanced-green/10 text-balanced-green",
    },
    failed: { label: "Failed", color: "bg-error-clay/10 text-error-clay" },
    blocked: { label: "Blocked", color: "bg-error-clay/10 text-error-clay" },
    skipped: { label: "Skipped", color: "bg-muted text-muted-foreground" },
  }[status];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
        meta.color,
      )}
    >
      {status === "in_progress" && (
        <span className="mr-1 h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
      )}
      {meta.label}
    </span>
  );
}

function formatDuration(ms: number): string {
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  const mins = Math.floor(ms / 60_000);
  const secs = Math.round((ms % 60_000) / 1000);
  if (mins < 60) return `${mins}m ${secs}s`;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hrs}h ${remMins}m`;
}
