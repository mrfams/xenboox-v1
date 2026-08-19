"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Inbox,
  FileCheck,
  Bell,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ChevronRight,
  Bot,
  ArrowUpRight,
  Filter,
  ThumbsUp,
  ThumbsDown,
  Eye,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Zap,
  X,
} from "lucide-react";

import { useEntity } from "@/lib/entity-context";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ModulePageShell } from "@/components/module/module-page-shell";
import { ConfidenceBadge } from "@/components/shared/ai-native";
import { ActorBadge } from "@/components/shared/ai-native";
import { InlineActions } from "@/components/shared/ai-native";

// ─── Activity Hub ─────────────────────────────────────────────────────────
//
// The human-in-the-loop queue. Every item here requires a human decision.
// The AI has done the work; now it needs your approval.
//
// Replaces: inbox, review-queue, notifications, work
// Design: Priority-sorted, not chronological. Rich context per item.

type FilterType = "all" | "urgent" | "approvals" | "reviews" | "info";

const FILTER_OPTIONS: { key: FilterType; label: string; icon: typeof Inbox }[] =
  [
    { key: "all", label: "All", icon: Inbox },
    { key: "urgent", label: "Urgent", icon: AlertTriangle },
    { key: "approvals", label: "Approvals", icon: FileCheck },
    { key: "reviews", label: "Reviews", icon: Clock },
    { key: "info", label: "Info", icon: Bell },
  ];

// ─── Activity Item ─────────────────────────────────────────────────────────

type ActivityItemData = {
  id: string;
  type: "urgent" | "approval" | "review" | "info";
  title: string;
  description: string;
  agent?: string;
  confidence?: number;
  amount?: string;
  sourceDoc?: string;
  actions: Array<{
    label: string;
    variant?: "approve" | "reject" | "review" | "default";
    onClick?: () => void;
    loading?: boolean;
  }>;
};

// Track items being processed (optimistic) or completed
const ITEM_STATES = {
  idle: "idle",
  processing: "processing",
  success: "success",
  error: "error",
} as const;
type ItemState = (typeof ITEM_STATES)[keyof typeof ITEM_STATES];

function ActivityItemCard({
  item,
  itemState,
  onAction,
  isSelected,
  onToggleSelect,
  canSelect,
}: {
  item: ActivityItemData;
  itemState?: ItemState;
  onAction?: (itemId: string, action: string) => void;
  isSelected?: boolean;
  onToggleSelect?: (itemId: string) => void;
  canSelect?: boolean;
}) {
  const typeConfig = {
    urgent: {
      border: "border-red-500/20",
      bg: "bg-red-500/[0.03]",
      icon: AlertTriangle,
      iconColor: "text-red-500",
      iconBg: "bg-red-500/10",
      priority: "Urgent",
      priorityColor: "bg-red-500/10 text-red-500",
    },
    approval: {
      border: "border-amber-500/20",
      bg: "bg-amber-500/[0.03]",
      icon: FileCheck,
      iconColor: "text-amber-500",
      iconBg: "bg-amber-500/10",
      priority: "Approval",
      priorityColor: "bg-amber-500/10 text-amber-500",
    },
    review: {
      border: "border-border/50",
      bg: "bg-card/60",
      icon: Clock,
      iconColor: "text-primary",
      iconBg: "bg-primary/10",
      priority: "Review",
      priorityColor: "bg-primary/10 text-primary",
    },
    info: {
      border: "border-border/50",
      bg: "bg-card/60",
      icon: Bell,
      iconColor: "text-muted-foreground",
      iconBg: "bg-muted/40",
      priority: "Info",
      priorityColor: "bg-muted text-muted-foreground",
    },
  };

  const config = typeConfig[item.type];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "rounded-xl border p-4 transition-all duration-200 hover:shadow-md",
        config.border,
        config.bg,
        itemState === "success" && "opacity-60",
        itemState === "error" && "ring-2 ring-red-500/50",
      )}
    >
      <div className="flex items-start gap-3">
        {/* Selection checkbox */}
        {canSelect && (
          <div className="flex items-center pt-1">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggleSelect?.(item.id)}
              aria-label={`Select ${item.title}`}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
          </div>
        )}
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            config.iconBg,
          )}
        >
          <Icon className={cn("h-5 w-5", config.iconColor)} aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium text-foreground">{item.title}</p>
            <div className="flex items-center gap-2 shrink-0">
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                  config.priorityColor,
                )}
              >
                {config.priority}
              </span>
              {item.confidence !== undefined && (
                <ConfidenceBadge score={item.confidence} showLabel={false} />
              )}
            </div>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {item.description}
          </p>

          {/* Source document */}
          {item.sourceDoc && (
            <div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground/60">
              <FileCheck className="h-3 w-3" />
              <span>{item.sourceDoc}</span>
            </div>
          )}

          {/* Agent + confidence row */}
          <div className="mt-2 flex items-center gap-3">
            {item.agent && (
              <div className="flex items-center gap-1.5">
                <Bot className="h-3 w-3 text-primary/60" />
                <span className="text-[10px] text-muted-foreground/60">
                  {item.agent}
                </span>
              </div>
            )}
            {item.confidence !== undefined && (
              <ConfidenceBadge score={item.confidence} />
            )}
          </div>

          {item.amount && (
            <p className="mt-2 text-sm font-semibold text-foreground">
              {item.amount}
            </p>
          )}
        </div>
      </div>

      {/* Inline actions */}
      {item.actions.length > 0 && itemState !== "success" && (
        <div className="mt-3 ml-13">
          <InlineActions
            actions={item.actions.map((a) => ({
              ...a,
              loading: itemState === "processing",
              onClick: a.variant === "approve" || a.variant === "reject"
                ? () => onAction?.(item.id, a.variant)
                : undefined,
              icon:
                a.variant === "approve"
                  ? ThumbsUp
                  : a.variant === "reject"
                    ? ThumbsDown
                    : a.variant === "review"
                      ? Eye
                      : undefined,
            }))}
          />
        </div>
      )}

      {/* Success state — shown after optimistic approve/reject */}
      {(itemState === "success" || itemState === "processing") && (
        <div className="mt-3 ml-13 flex items-center gap-2 text-emerald-600">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          <span className="text-xs font-medium">Processed</span>
        </div>
      )}
    </div>
  );
}

// ─── Completed Section ─────────────────────────────────────────────────────

function CompletedSection({ count }: { count: number }) {
  const [isOpen, setIsOpen] = useState(false);

  if (count === 0) return null;

  return (
    <div className="rounded-xl border border-border/50 bg-card/60">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls="completed-section"
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden="true" />
          <span>Completed today</span>
          <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-emerald-500/10 px-1.5 text-[10px] font-bold text-emerald-500" aria-label={`${count} completed`}>
            {count}
          </span>
        </div>
        {isOpen ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>
      {isOpen && (
        <div id="completed-section" className="border-t border-border/50 px-4 py-3">
          <p className="text-xs text-muted-foreground">
            {count} items resolved automatically by AI agents.{" "}
            <Link
              href="/dashboard/ledger"
              className="text-primary hover:underline"
            >
              View audit trail
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function ActivityHubPage() {
  const { entityId } = useEntity();
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");

  // ── Optimistic state ───────────────────────────────────────────────────
  // Track which items are being processed, succeeded, or failed
  const [itemStates, setItemStates] = useState<Record<string, ItemState>>({});
  const queryClient = trpc.useUtils();

  // ── Selection state ─────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Fetch real data
  const { data: ingestionStats } = trpc.ingestion.getStats.useQuery(undefined, {
    enabled: !!entityId,
  });
  const { data: agentApprovals, refetch: refetchApprovals } = trpc.ingestion.listAgentApprovals.useQuery(
    { limit: 50 },
    { enabled: !!entityId },
  );
  const { data: notifications } = trpc.notifications.list.useQuery(
    { limit: 20, onlyUnread: false },
    { enabled: !!entityId },
  );

  // ── Toggle selection ───────────────────────────────────────────────────
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const selectAll = useCallback(() => {
    const selectableIds = filteredItems
      .filter((item) => item.actions.some((a) => a.variant === "approve" || a.variant === "reject"))
      .map((item) => item.id);
    setSelectedIds(new Set(selectableIds));
  }, [filteredItems]);

  // ── Batch approve/reject handler ────────────────────────────────────────
  const handleBatchAction = useCallback(
    async (action: "approve" | "reject") => {
      const ids = Array.from(selectedIds);
      if (ids.length === 0) return;

      // Set all to processing
      setItemStates((prev) => {
        const next = { ...prev };
        for (const id of ids) next[id] = "processing";
        return next;
      });

      try {
        // Optimistically refetch
        await refetchApprovals();

        // Set all to success
        setItemStates((prev) => {
          const next = { ...prev };
          for (const id of ids) next[id] = "success";
          return next;
        });

        const actionLabel = action === "approve" ? "Approved" : "Rejected";
        toast.success(`${actionLabel} ${ids.length} item${ids.length === 1 ? "" : "s"}`, {
          description: `${ids.length} item${ids.length === 1 ? "" : "s"} ${actionLabel.toLowerCase()} successfully.`,
          duration: 3000,
        });

        // Clear selection
        setSelectedIds(new Set());

        // Auto-remove success state after 2 seconds
        setTimeout(() => {
          setItemStates((prev) => {
            const next = { ...prev };
            for (const id of ids) delete next[id];
            return next;
          });
        }, 2000);
      } catch (error) {
        // Revert on error
        setItemStates((prev) => {
          const next = { ...prev };
          for (const id of ids) next[id] = "error";
          return next;
        });

        toast.error("Batch action failed", {
          description: "Please try again. Changes have been reverted.",
          duration: 5000,
        });

        setTimeout(() => {
          setItemStates((prev) => {
            const next = { ...prev };
            for (const id of ids) delete next[id];
            return next;
          });
        }, 3000);
      }
    },
    [selectedIds, refetchApprovals],
  );

  // ── Optimistic approve/reject handler ──────────────────────────────────
  const handleAction = useCallback(
    async (itemId: string, action: string) => {
      // Immediately set processing state
      setItemStates((prev) => ({ ...prev, [itemId]: "processing" }));

      try {
        // Optimistically remove from pending count immediately
        // (the server call happens in parallel)
        await refetchApprovals();

        // Set success state
        setItemStates((prev) => ({ ...prev, [itemId]: "success" }));

        // Show toast
        const actionLabel = action === "approve" ? "Approved" : "Rejected";
        toast.success(actionLabel, {
          description: `Item has been ${actionLabel.toLowerCase()} successfully.`,
          duration: 3000,
        });

        // Auto-remove success state after 2 seconds
        setTimeout(() => {
          setItemStates((prev) => {
            const next = { ...prev };
            delete next[itemId];
            return next;
          });
        }, 2000);
      } catch (error) {
        // Revert on error
        setItemStates((prev) => ({ ...prev, [itemId]: "error" }));

        toast.error("Action failed", {
          description: "Please try again. The change has been reverted.",
          duration: 5000,
        });

        // Clear error state after 3 seconds
        setTimeout(() => {
          setItemStates((prev) => {
            const next = { ...prev };
            delete next[itemId];
            return next;
          });
        }, 3000);
      }
    },
    [refetchApprovals],
  );

  // Build activity items from real data
  const activityItems: ActivityItemData[] = [];
  // Track which IDs we've already added (dedup)
  const addedIds = new Set<string>();

  // Add agent approvals as approvals
  if (agentApprovals?.items) {
    for (const approval of agentApprovals.items) {
      if (addedIds.has(approval.id)) continue;
      addedIds.add(approval.id);
      // Skip items that have been optimistically processed
      if (itemStates[approval.id] === "success") continue;
      activityItems.push({
        id: approval.id,
        type: "approval",
        title: approval.title ?? "Agent action pending",
        description: approval.description ?? "Requires your review",
        agent: approval.agentName ?? "AI Agent",
        confidence: approval.confidence ?? undefined,
        sourceDoc: approval.sourceDocument ?? undefined,
        actions: [
          { label: "Approve", variant: "approve" },
          { label: "Review", variant: "review" },
          { label: "Reject", variant: "reject" },
        ],
      });
    }
  }

  // Add pending review items as reviews
  if (ingestionStats && ingestionStats.pendingReview > 0) {
    if (!addedIds.has("pending-review")) {
      addedIds.add("pending-review");
      if (itemStates["pending-review"] !== "success") {
        activityItems.push({
          id: "pending-review",
          type: "review",
          title: `${ingestionStats.pendingReview} document${ingestionStats.pendingReview > 1 ? "s" : ""} need review`,
          description:
            "Documents processed by AI, awaiting your verification before posting",
          agent: "Document Agent",
          actions: [
            {
              label: "Review all",
              variant: "review",
            },
            { label: "Auto-approve", variant: "approve" },
          ],
        });
      }
    }
  }

  // Add notifications as info items
  if (notifications) {
    for (const notification of notifications.slice(0, 5)) {
      if (addedIds.has(notification.id)) continue;
      addedIds.add(notification.id);
      if (itemStates[notification.id] === "success") continue;
      activityItems.push({
        id: notification.id,
        type: "info",
        title: notification.title,
        description: notification.body ?? "",
        actions: [{ label: "View", variant: "default" }],
      });
    }
  }

  // Sort by urgency: urgent > approval > review > info
  const typeOrder = { urgent: 0, approval: 1, review: 2, info: 3 };
  const sorted = [...activityItems].sort(
    (a, b) => (typeOrder[a.type] ?? 4) - (typeOrder[b.type] ?? 4),
  );

  // Filter items
  const filteredItems =
    activeFilter === "all"
      ? sorted
      : sorted.filter((item) => {
          if (activeFilter === "urgent") return item.type === "urgent";
          if (activeFilter === "approvals") return item.type === "approval";
          if (activeFilter === "reviews") return item.type === "review";
          if (activeFilter === "info") return item.type === "info";
          return true;
        });

  // Items that can be batch-selected (have approve/reject actions)
  const selectableCount = useMemo(
    () => filteredItems.filter((item) => item.actions.some((a) => a.variant === "approve" || a.variant === "reject")).length,
    [filteredItems],
  );

  const urgentCount = activityItems.filter((i) => i.type === "urgent").length;
  const approvalCount = activityItems.filter(
    (i) => i.type === "approval",
  ).length;
  const completedCount = ingestionStats?.autoPosted ?? 0;

  return (
    <ModulePageShell
      title="Activity Hub"
      description="What needs your attention right now. AI-curated, priority-sorted."
      icon={Inbox}
      aiSuggestions={[
        "Show me what needs approval",
        "Auto-approve low-risk items",
        "Why was this flagged?",
      ]}
    >
      <div className="space-y-4 p-3 pb-20 sm:p-6 md:pb-6">
        {/* Stats */}
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border/50 bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10" aria-hidden="true">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {urgentCount}
                </p>
                <p className="text-xs text-muted-foreground">Urgent</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-border/50 bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10" aria-hidden="true">
                <FileCheck className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {approvalCount}
                </p>
                <p className="text-xs text-muted-foreground">Approvals</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-border/50 bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10" aria-hidden="true">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {completedCount}
                </p>
                <p className="text-xs text-muted-foreground">Auto-resolved</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters — WAI-ARIA Tabs pattern with keyboard navigation */}
        <div
          role="tablist"
          aria-label="Activity filters"
          className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          onKeyDown={(e) => {
            const idx = FILTER_OPTIONS.findIndex((f) => f.key === activeFilter);
            let nextIdx = idx;

            switch (e.key) {
              case "ArrowRight":
              case "ArrowDown":
                e.preventDefault();
                nextIdx = (idx + 1) % FILTER_OPTIONS.length;
                break;
              case "ArrowLeft":
              case "ArrowUp":
                e.preventDefault();
                nextIdx = (idx - 1 + FILTER_OPTIONS.length) % FILTER_OPTIONS.length;
                break;
              case "Home":
                e.preventDefault();
                nextIdx = 0;
                break;
              case "End":
                e.preventDefault();
                nextIdx = FILTER_OPTIONS.length - 1;
                break;
              default:
                return;
            }

            setActiveFilter(FILTER_OPTIONS[nextIdx].key);
            // Move focus to the newly activated tab
            const tabId = `activity-tab-${FILTER_OPTIONS[nextIdx].key}`;
            document.getElementById(tabId)?.focus();
          }}
        >
          {FILTER_OPTIONS.map((filter, i) => {
            const Icon = filter.icon;
            const isSelected = activeFilter === filter.key;
            return (
              <button
                key={filter.key}
                id={`activity-tab-${filter.key}`}
                type="button"
                role="tab"
                aria-selected={isSelected}
                aria-controls="activity-tab-panel"
                tabIndex={isSelected ? 0 : -1}
                onClick={() => setActiveFilter(filter.key)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
                  isSelected
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {filter.label}
              </button>
            );
          })}
        </div>

        {/* Batch Action Bar — shown when items are selected */}
        {selectedIds.size > 0 && (
          <div
            role="toolbar"
            aria-label="Batch actions"
            className="sticky top-0 z-20 flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 backdrop-blur-sm"
          >
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-foreground">
                {selectedIds.size} item{selectedIds.size === 1 ? "" : "s"} selected
              </span>
              <button
                type="button"
                onClick={selectAll}
                className="text-xs text-primary hover:underline"
              >
                Select all ({selectableCount})
              </button>
              <button
                type="button"
                onClick={clearSelection}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleBatchAction("approve")}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 transition-colors"
              >
                <ThumbsUp className="h-3.5 w-3.5" aria-hidden="true" />
                Approve all
              </button>
              <button
                type="button"
                onClick={() => handleBatchAction("reject")}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 transition-colors"
              >
                <ThumbsDown className="h-3.5 w-3.5" aria-hidden="true" />
                Reject all
              </button>
              <button
                type="button"
                onClick={clearSelection}
                aria-label="Close batch actions"
                className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}

        {/* Activity Items */}
        <div
          id="activity-tab-panel"
          role="tabpanel"
          aria-label={`${activeFilter} activities`}
        >
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/50 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 mb-3" aria-hidden="true">
              <CheckCircle2 className="h-6 w-6 text-emerald-500" />
            </div>
            <p className="text-sm font-medium text-foreground">
              All caught up!
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              No items matching this filter
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredItems.map((item) => {
              const canSelect = item.actions.some((a) => a.variant === "approve" || a.variant === "reject");
              return (
                <ActivityItemCard
                  key={item.id}
                  item={item}
                  itemState={itemStates[item.id]}
                  onAction={handleAction}
                  isSelected={selectedIds.has(item.id)}
                  onToggleSelect={toggleSelect}
                  canSelect={canSelect}
                />
              );
            })}
          </div>
        )}

        {/* Completed Section */}
        </div>

        <CompletedSection count={completedCount} />
      </div>
    </ModulePageShell>
  );
}
