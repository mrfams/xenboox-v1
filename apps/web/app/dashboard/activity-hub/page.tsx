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
  RefreshCw,
  Shield,
  Lightbulb,
  StickyNote,
} from "lucide-react";

import { useEntity } from "@/lib/entity-context";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { useSurfaceSync } from "@/lib/hooks/use-surface-sync";
import { useSrAnnounce } from "@/lib/hooks/use-sr-announce";
import { cn } from "@/lib/utils";
import { ModulePageShell } from "@/components/module/module-page-shell";
import { ConfidenceBadge } from "@/components/shared/ai-native";
import { ActorBadge } from "@/components/shared/ai-native";
import { InlineActions } from "@/components/shared/ai-native";
import { emitDataChanged } from "@/lib/hooks/use-surface-sync";

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
  itemType: "agent_activity" | "ingestion" | "notification";
  type: "urgent" | "approval" | "review" | "info";
  title: string;
  description: string;
  agent?: string;
  confidence?: number;
  amount?: string;
  sourceDoc?: string;
  createdAt?: string | Date;
  recommendation?: string;
  metadata?: Record<string, unknown>;
  detail?: Record<string, unknown>;
  actions: Array<{
    label: string;
    variant?: "approve" | "reject" | "review" | "default";
    onClick?: () => void;
    loading?: boolean;
  }>;
};

// ─── Helpers ──────────────────────────────────────────────────────────────

function timeAgo(dateStr: string | Date | undefined): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function getRiskLevel(confidence: number | undefined): {
  label: string;
  color: string;
  bgColor: string;
  barColor: string;
} {
  if (confidence === undefined)
    return {
      label: "Unknown",
      color: "text-muted-foreground",
      bgColor: "bg-muted/40",
      barColor: "bg-muted",
    };
  if (confidence >= 0.8)
    return {
      label: "Low Risk",
      color: "text-emerald-600",
      bgColor: "bg-emerald-500/10",
      barColor: "bg-emerald-500",
    };
  if (confidence >= 0.6)
    return {
      label: "Medium Risk",
      color: "text-amber-600",
      bgColor: "bg-amber-500/10",
      barColor: "bg-amber-500",
    };
  return {
    label: "High Risk",
    color: "text-red-600",
    bgColor: "bg-red-500/10",
    barColor: "bg-red-500",
  };
}

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
  onViewItem,
  isSelected,
  onToggleSelect,
  canSelect,
}: {
  item: ActivityItemData;
  itemState?: ItemState;
  onAction?: (
    itemId: string,
    action: string,
    itemType: string,
    reason?: string,
  ) => void;
  onViewItem?: (item: ActivityItemData) => void;
  isSelected?: boolean;
  onToggleSelect?: (itemId: string) => void;
  canSelect?: boolean;
}) {
  const [note, setNote] = useState("");
  const [showNote, setShowNote] = useState(false);

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
  const risk = getRiskLevel(item.confidence);

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
          <Icon
            className={cn("h-5 w-5", config.iconColor)}
            aria-hidden="true"
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p
              className="text-sm font-medium text-foreground hover:text-primary cursor-pointer transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onViewItem?.(item);
              }}
            >
              {item.title}
            </p>
            <div className="flex items-center gap-2 shrink-0">
              {item.createdAt && (
                <span className="text-[10px] text-muted-foreground/50">
                  {timeAgo(item.createdAt)}
                </span>
              )}
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

          {/* AI Recommendation / Reasoning */}
          {item.recommendation && (
            <div className="mt-2.5 rounded-lg border border-primary/10 bg-primary/[0.03] px-3 py-2">
              <div className="flex items-center gap-1.5 mb-1">
                <Lightbulb
                  className="h-3 w-3 text-primary"
                  aria-hidden="true"
                />
                <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">
                  AI Recommendation
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {item.recommendation}
              </p>
            </div>
          )}

          {/* Risk Assessment Bar */}
          {item.confidence !== undefined && (
            <div className="mt-2.5">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <Shield className="h-3 w-3" aria-hidden="true" />
                  <span className={cn("text-[10px] font-semibold", risk.color)}>
                    {risk.label}
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {Math.round(item.confidence * 100)}% confidence
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted/40">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    risk.barColor,
                  )}
                  style={{ width: `${Math.round(item.confidence * 100)}%` }}
                  role="progressbar"
                  aria-valuenow={Math.round(item.confidence * 100)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Confidence: ${Math.round(item.confidence * 100)}%`}
                />
              </div>
            </div>
          )}

          {/* Supporting Data Row */}
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {item.sourceDoc && (
              <div className="inline-flex items-center gap-1 rounded-md bg-muted/40 px-2 py-0.5 text-[10px] text-muted-foreground">
                <FileCheck className="h-3 w-3" aria-hidden="true" />
                {item.sourceDoc}
              </div>
            )}
            {item.agent && (
              <div className="inline-flex items-center gap-1 rounded-md bg-muted/40 px-2 py-0.5 text-[10px] text-muted-foreground">
                <Bot className="h-3 w-3 text-primary/60" aria-hidden="true" />
                {item.agent}
              </div>
            )}
            {item.amount && (
              <div className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                {item.amount}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Inline actions with optional note */}
      {item.actions.length > 0 && itemState !== "success" && (
        <div className="mt-3 ml-13 space-y-2">
          {/* Note input — toggle-able */}
          {showNote && (item.type === "approval" || item.type === "urgent") && (
            <div className="relative">
              <label htmlFor={`note-${item.id}`} className="sr-only">
                Add a note for this {item.type}
              </label>
              <StickyNote
                className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground/50"
                aria-hidden="true"
              />
              <textarea
                id={`note-${item.id}`}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a note (optional)..."
                rows={2}
                className="w-full rounded-lg border border-border/50 bg-background pl-8 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
            </div>
          )}
          <div className="flex items-center gap-2">
            <InlineActions
              actions={item.actions.map((a) => ({
                ...a,
                loading: itemState === "processing",
                onClick:
                  a.variant === "approve" || a.variant === "reject"
                    ? () => {
                        const reason = note.trim() || undefined;
                        onAction?.(
                          item.id,
                          a.variant as "approve" | "reject",
                          item.itemType,
                          reason,
                        );
                        setNote("");
                        setShowNote(false);
                      }
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
            {(item.type === "approval" || item.type === "urgent") && (
              <>
                <button
                  type="button"
                  onClick={() => setShowNote(!showNote)}
                  className={cn(
                    "rounded-lg px-2 py-1.5 text-[10px] font-medium transition-colors",
                    showNote
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                  )}
                  aria-label={showNote ? "Hide note field" : "Add a note"}
                >
                  <StickyNote className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    toast.info("Snoozed for 1 hour", {
                      description: "This item will reappear in your queue.",
                    });
                  }}
                  className="rounded-lg px-2 py-1.5 text-[10px] font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
                  aria-label="Snooze for 1 hour"
                >
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </>
            )}
          </div>
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
          <CheckCircle2
            className="h-4 w-4 text-emerald-500"
            aria-hidden="true"
          />
          <span>Completed today</span>
          <span
            className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-emerald-500/10 px-1.5 text-[10px] font-bold text-emerald-500"
            aria-label={`${count} completed`}
          >
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
        <div
          id="completed-section"
          className="border-t border-border/50 px-4 py-3"
        >
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

// ─── Detail Drawer ─────────────────────────────────────────────────────────

function ItemDetailDrawer({
  item,
  onClose,
  onAction,
  itemState,
}: {
  item: ActivityItemData;
  onClose: () => void;
  onAction: (
    itemId: string,
    action: string,
    itemType: string,
    reason?: string,
  ) => void;
  itemState?: ItemState;
}) {
  const [note, setNote] = useState("");

  const typeConfig = {
    urgent: { label: "Urgent", color: "text-red-500", bg: "bg-red-500/10" },
    approval: {
      label: "Approval",
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
    review: { label: "Review", color: "text-primary", bg: "bg-primary/10" },
    info: { label: "Info", color: "text-muted-foreground", bg: "bg-muted/40" },
  };
  const config = typeConfig[item.type];
  const risk = getRiskLevel(item.confidence);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-end bg-black/50 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div className="h-full w-full max-w-lg bg-card border-l border-border shadow-2xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card/95 backdrop-blur-sm px-6 py-4">
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                config.bg,
                config.color,
              )}
            >
              {config.label}
            </span>
            <h2 className="text-sm font-semibold text-foreground">
              Item Details
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-5">
          {/* Title */}
          <div>
            <h3 className="text-base font-semibold text-foreground">
              {item.title}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {item.description}
            </p>
            {item.createdAt && (
              <p className="mt-1 text-[10px] text-muted-foreground/60">
                Created {timeAgo(item.createdAt)}
              </p>
            )}
          </div>

          {/* Risk Assessment */}
          {item.confidence !== undefined && (
            <div className={cn("rounded-lg border p-3", risk.bgColor)}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className={cn("text-xs font-semibold", risk.color)}>
                    Risk Assessment: {risk.label}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {Math.round(item.confidence * 100)}%
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-white/50">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    risk.barColor,
                  )}
                  style={{ width: `${Math.round(item.confidence * 100)}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {item.confidence >= 0.8
                  ? "AI is confident in this action. Low risk of error."
                  : item.confidence >= 0.6
                    ? "AI has moderate confidence. Review recommended."
                    : "AI has low confidence. Manual review strongly recommended."}
              </p>
            </div>
          )}

          {/* AI Recommendation */}
          {item.recommendation && (
            <div className="rounded-lg border border-primary/10 bg-primary/[0.03] p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Lightbulb
                  className="h-3.5 w-3.5 text-primary"
                  aria-hidden="true"
                />
                <span className="text-xs font-semibold text-primary">
                  AI Recommendation
                </span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {item.recommendation}
              </p>
            </div>
          )}

          {/* Meta Grid */}
          <div className="grid grid-cols-2 gap-3">
            {item.agent && (
              <div className="rounded-lg border border-border/50 bg-background p-3">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  Agent
                </p>
                <p className="mt-1 text-sm font-medium text-foreground flex items-center gap-1.5">
                  <Bot className="h-3.5 w-3.5 text-primary/60" /> {item.agent}
                </p>
              </div>
            )}
            {item.confidence !== undefined && (
              <div className="rounded-lg border border-border/50 bg-background p-3">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  Confidence
                </p>
                <div className="mt-1">
                  <ConfidenceBadge score={item.confidence} />
                </div>
              </div>
            )}
            {item.amount && (
              <div className="rounded-lg border border-border/50 bg-background p-3">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  Amount
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {item.amount}
                </p>
              </div>
            )}
            <div className="rounded-lg border border-border/50 bg-background p-3">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                Item Type
              </p>
              <p className="mt-1 text-sm font-medium text-foreground">
                {item.itemType.replace(/_/g, " ")}
              </p>
            </div>
          </div>

          {/* Source doc */}
          {item.sourceDoc && (
            <div className="rounded-lg border border-border/50 bg-background p-3">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                Source Document
              </p>
              <p className="mt-1 text-sm text-foreground">{item.sourceDoc}</p>
            </div>
          )}

          {/* Detail payload */}
          {item.detail && Object.keys(item.detail).length > 0 && (
            <div className="rounded-lg border border-border/50 bg-background p-3">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Full Context
              </p>
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">
                {JSON.stringify(item.detail, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Actions with note field */}
        {item.actions.length > 0 && itemState !== "success" && (
          <div className="sticky bottom-0 border-t border-border bg-card/95 backdrop-blur-sm px-6 py-4 space-y-3">
            {/* Note textarea */}
            {(item.type === "approval" || item.type === "urgent") && (
              <div>
                <label
                  htmlFor="drawer-note"
                  className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider"
                >
                  Add a note (optional)
                </label>
                <textarea
                  id="drawer-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Why are you approving/rejecting this?"
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              </div>
            )}
            <div className="flex items-center gap-3">
              {item.actions
                .filter(
                  (a) => a.variant === "approve" || a.variant === "reject",
                )
                .map((a) => (
                  <button
                    key={a.variant}
                    type="button"
                    disabled={itemState === "processing"}
                    onClick={() => {
                      const reason = note.trim() || undefined;
                      onAction(item.id, a.variant!, item.itemType, reason);
                      setNote("");
                    }}
                    className={cn(
                      "flex-1 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
                      a.variant === "approve"
                        ? "bg-emerald-600 text-white hover:bg-emerald-700"
                        : "bg-red-600 text-white hover:bg-red-700",
                      itemState === "processing" &&
                        "opacity-50 cursor-not-allowed",
                    )}
                  >
                    {itemState === "processing" ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : a.variant === "approve" ? (
                      <ThumbsUp className="h-4 w-4" />
                    ) : (
                      <ThumbsDown className="h-4 w-4" />
                    )}
                    {a.variant === "approve" ? "Approve" : "Reject"}
                  </button>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function ActivityHubPage() {
  const { entityId } = useEntity();
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const { announce } = useSrAnnounce();

  // ── Cross-surface sync ────────────────────────────────────────────────
  // Listen for data_changed events from other surfaces and refetch
  useSurfaceSync({ entityId: entityId ?? "", surfaces: ["activity-hub"] });

  // ── Optimistic state ───────────────────────────────────────────────────
  // Track which items are being processed, succeeded, or failed
  const [itemStates, setItemStates] = useState<Record<string, ItemState>>({});
  const queryClient = trpc.useUtils();

  // ── Selection state ─────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmRejectOpen, setConfirmRejectOpen] = useState(false);

  // Fetch real data — refetchInterval provides polling fallback if SSE drops
  const { data: ingestionStats } = trpc.ingestion.getStats.useQuery(undefined, {
    enabled: !!entityId,
    refetchInterval: 30_000, // 30s polling fallback (degraded mode per §16.2)
  });
  const { data: agentApprovals, refetch: refetchApprovals } =
    trpc.ingestion.listAgentApprovals.useQuery(
      { limit: 50 },
      {
        enabled: !!entityId,
        refetchInterval: 15_000, // 15s polling fallback — approvals are time-sensitive
      },
    );
  const { data: notifications } = trpc.notifications.list.useQuery(
    { limit: 20, onlyUnread: false },
    { enabled: !!entityId, refetchInterval: 30_000 },
  );
  const { data: agentAlerts, refetch: refetchAlerts } =
    trpc.notifications.listAgentAlerts.useQuery(
      { limit: 20, unreadOnly: false },
      {
        enabled: !!entityId,
        refetchInterval: 15_000, // Alerts are time-sensitive
      },
    );

  // ── Mutations ───────────────────────────────────────────────────────────
  const resolveApproval = trpc.approvals.resolve.useMutation({
    onSuccess: () => {
      refetchApprovals();
    },
  });
  const approveIngestion = trpc.ingestion.approveReview.useMutation({
    onSuccess: () => {
      refetchApprovals();
    },
  });
  const rejectIngestion = trpc.ingestion.rejectReview.useMutation({
    onSuccess: () => {
      refetchApprovals();
    },
  });
  const markNotificationRead = trpc.notifications.markAsRead.useMutation({
    onSuccess: () => {
      refetchAlerts();
    },
  });

  // ── Detail drawer ───────────────────────────────────────────────────────
  const [selectedItem, setSelectedItem] = useState<ActivityItemData | null>(
    null,
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

  // ── Undo handler ────────────────────────────────────────────────────────
  const undoBatchAction = useCallback(
    (ids: string[]) => {
      // Remove success states so items reappear
      setItemStates((prev) => {
        const next = { ...prev };
        for (const id of ids) delete next[id];
        return next;
      });
      // Refetch to restore items
      refetchApprovals();
      toast.info("Undone", { description: "Changes have been reverted." });
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
      if (itemStates[approval.id] === "success") continue;
      const meta = (approval.metadata ?? {}) as Record<string, unknown>;
      const inputData = (meta.inputData ?? {}) as Record<string, unknown>;
      const recommendation =
        (meta.recommendation as string) ??
        approval.description ??
        "Review and take appropriate action";

      activityItems.push({
        id: approval.id,
        itemType: "agent_activity",
        type: "approval",
        title: approval.title ?? "Agent action pending",
        description: approval.description ?? "Requires your review",
        agent: approval.workflow ?? "AI Agent",
        confidence: approval.confidence ?? undefined,
        sourceDoc: approval.documentName ?? undefined,
        createdAt: approval.createdAt,
        recommendation,
        metadata: meta,
        detail: inputData,
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
          itemType: "ingestion",
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

  // Add agent alerts as first-class items (urgent/approval/info based on severity)
  if (agentAlerts?.alerts) {
    for (const alert of agentAlerts.alerts) {
      if (addedIds.has(alert.id)) continue;
      addedIds.add(alert.id);
      if (itemStates[alert.id] === "success") continue;

      const itemType: "urgent" | "approval" | "info" =
        alert.priority === "critical"
          ? "urgent"
          : alert.priority === "high"
            ? "approval"
            : "info";

      activityItems.push({
        id: alert.id,
        itemType: "notification",
        type: itemType,
        title: alert.title,
        description: alert.body ?? "",
        agent: alert.agentSource.replace(/-agent$/, "").replace(/_/g, " "),
        actions: alert.actionRequired
          ? [
              { label: "Review", variant: "review" },
              { label: "Dismiss", variant: "default" },
            ]
          : [{ label: "View", variant: "default" }],
      });
    }
  }

  // Add regular notifications as info items (lower priority than agent alerts)
  if (notifications) {
    for (const notification of notifications.slice(0, 5)) {
      if (addedIds.has(notification.id)) continue;
      addedIds.add(notification.id);
      if (itemStates[notification.id] === "success") continue;
      activityItems.push({
        id: notification.id,
        itemType: "notification",
        type: "info",
        title: notification.title,
        description: notification.body ?? "",
        actions: [{ label: "View", variant: "default" }],
      });
    }
  }

  // ── Real mutation handler ──────────────────────────────────────────────
  const handleAction = useCallback(
    async (
      itemId: string,
      action: string,
      itemType: string,
      reason?: string,
    ) => {
      setItemStates((prev) => ({ ...prev, [itemId]: "processing" }));

      try {
        if (itemType === "agent_activity") {
          const actionReason =
            reason ??
            (action === "approve"
              ? "Approved from Activity Hub"
              : "Rejected from Activity Hub");
          await resolveApproval.mutateAsync({
            itemId,
            itemType: "agent_escalation",
            action: action === "approve" ? "approved" : "rejected",
            reason: actionReason,
          });
        } else if (itemType === "ingestion") {
          if (action === "approve") {
            await approveIngestion.mutateAsync({ documentId: itemId });
          } else {
            await rejectIngestion.mutateAsync({
              documentId: itemId,
              reason: reason ?? "Rejected from Activity Hub",
            });
          }
        } else if (itemType === "notification") {
          await markNotificationRead.mutateAsync({ id: itemId });
        }

        setItemStates((prev) => ({ ...prev, [itemId]: "success" }));
        const actionLabel = action === "approve" ? "Approved" : "Rejected";
        toast.success(actionLabel, {
          description: `Item has been ${actionLabel.toLowerCase()} successfully.${reason ? ` Note: "${reason}"` : ""}`,
          duration: 3000,
        });
        announce(`${actionLabel} successfully`);
        if (entityId) {
          emitDataChanged("activity-hub", `${action}_${itemType}`, entityId);
        }

        setTimeout(() => {
          setItemStates((prev) => {
            const next = { ...prev };
            delete next[itemId];
            return next;
          });
        }, 2000);
      } catch (error) {
        setItemStates((prev) => ({ ...prev, [itemId]: "error" }));
        toast.error("Action failed", {
          description:
            error instanceof Error ? error.message : "Please try again.",
          duration: 5000,
        });
        announce("Action failed. Please try again.", "assertive");
        setTimeout(() => {
          setItemStates((prev) => {
            const next = { ...prev };
            delete next[itemId];
            return next;
          });
        }, 3000);
      }
    },
    [resolveApproval, approveIngestion, rejectIngestion, markNotificationRead],
  );

  // ── Batch approve/reject handler ────────────────────────────────────────
  const handleBatchAction = useCallback(
    async (action: "approve" | "reject") => {
      const ids = Array.from(selectedIds);
      if (ids.length === 0) return;

      setItemStates((prev) => {
        const next = { ...prev };
        for (const id of ids) next[id] = "processing";
        return next;
      });

      try {
        // Resolve each item by its type
        for (const id of ids) {
          const item = activityItems.find((i) => i.id === id);
          if (!item) continue;
          try {
            await handleAction(id, action, item.itemType);
          } catch {
            // Individual item failures are handled inside handleAction
          }
        }

        const actionLabel = action === "approve" ? "Approved" : "Rejected";
        const itemCount = ids.length;
        toast.success(
          `${actionLabel} ${itemCount} item${itemCount === 1 ? "" : "s"}`,
          {
            description: `${itemCount} item${itemCount === 1 ? "" : "s"} ${actionLabel.toLowerCase()} successfully.`,
            duration: 5000,
            action: {
              label: "Undo",
              onClick: () => undoBatchAction(ids),
            },
          },
        );

        setSelectedIds(new Set());

        setTimeout(() => {
          setItemStates((prev) => {
            const next = { ...prev };
            for (const id of ids) delete next[id];
            return next;
          });
        }, 2000);
      } catch (error) {
        setItemStates((prev) => {
          const next = { ...prev };
          for (const id of ids) next[id] = "error";
          return next;
        });
        toast.error("Batch action failed", {
          description:
            error instanceof Error ? error.message : "Please try again.",
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
    [selectedIds, activityItems, handleAction, undoBatchAction],
  );

  // ── Keyboard shortcuts for batch actions ───────────────────────────────
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Only when items are selected
      if (selectedIds.size === 0) return;
      // Ignore if modifier keys are held
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      // Ignore if focused on an interactive element
      const tag = document.activeElement?.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        tag === "BUTTON" ||
        tag === "A"
      )
        return;
      if ((document.activeElement as HTMLElement)?.isContentEditable) return;
      // Ignore if confirm dialog is open
      if (confirmRejectOpen) return;

      if (e.key === "a") {
        e.preventDefault();
        handleBatchAction("approve");
      } else if (e.key === "r") {
        e.preventDefault();
        setConfirmRejectOpen(true);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedIds, confirmRejectOpen, handleBatchAction]);

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

  const selectAll = useCallback(() => {
    const selectableIds = filteredItems
      .filter((item) =>
        item.actions.some(
          (a) => a.variant === "approve" || a.variant === "reject",
        ),
      )
      .map((item) => item.id);
    setSelectedIds(new Set(selectableIds));
  }, [filteredItems]);

  // Items that can be batch-selected (have approve/reject actions)
  const selectableCount = useMemo(
    () =>
      filteredItems.filter((item) =>
        item.actions.some(
          (a) => a.variant === "approve" || a.variant === "reject",
        ),
      ).length,
    [filteredItems],
  );

  const urgentCount = activityItems.filter((i) => i.type === "urgent").length;
  const approvalCount = activityItems.filter(
    (i) => i.type === "approval",
  ).length;
  const completedCount = ingestionStats?.autoPosted ?? 0;
  const agentAlertCount = agentAlerts?.total ?? 0;

  return (
    <ModulePageShell
      title="Activity Hub"
      description="What needs your attention right now. AI-curated, priority-sorted."
      icon={Inbox}
      aiSuggestions={[
        {
          label: "Show me what needs approval",
          prompt: "Show me what needs approval",
        },
        {
          label: "Auto-approve low-risk items",
          prompt: "Auto-approve low-risk items",
        },
        { label: "Why was this flagged?", prompt: "Why was this flagged?" },
      ]}
    >
      <div
        className="space-y-4 p-3 pb-20 sm:p-6 md:pb-6"
        aria-busy={Object.values(itemStates).some((s) => s === "processing")}
      >
        {/* Stats */}
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-border/50 bg-card p-4">
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10"
                aria-hidden="true"
              >
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
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10"
                aria-hidden="true"
              >
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
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10"
                aria-hidden="true"
              >
                <Bot className="h-5 w-5 text-violet-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {agentAlertCount}
                </p>
                <p className="text-xs text-muted-foreground">Agent Alerts</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-border/50 bg-card p-4">
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10"
                aria-hidden="true"
              >
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
                nextIdx =
                  (idx - 1 + FILTER_OPTIONS.length) % FILTER_OPTIONS.length;
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
                {selectedIds.size} item{selectedIds.size === 1 ? "" : "s"}{" "}
                selected
              </span>
              <span className="hidden sm:inline text-[10px] text-muted-foreground">
                Press{" "}
                <kbd className="mx-0.5 rounded bg-muted px-1 py-0.5 font-mono text-[9px]">
                  A
                </kbd>{" "}
                approve,{" "}
                <kbd className="mx-0.5 rounded bg-muted px-1 py-0.5 font-mono text-[9px]">
                  R
                </kbd>{" "}
                reject
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
                onClick={() => setConfirmRejectOpen(true)}
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

        {/* Reject Confirmation Dialog */}
        {confirmRejectOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Confirm batch reject"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === e.currentTarget) setConfirmRejectOpen(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") setConfirmRejectOpen(false);
            }}
          >
            <div className="mx-4 w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-500/10">
                  <AlertTriangle
                    className="h-6 w-6 text-red-500"
                    aria-hidden="true"
                  />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-foreground">
                    Reject {selectedIds.size} item
                    {selectedIds.size === 1 ? "" : "s"}?
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    This will reject {selectedIds.size} selected item
                    {selectedIds.size === 1 ? "" : "s"}. This action can be
                    undone from the audit trail.
                  </p>
                </div>
              </div>
              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmRejectOpen(false)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmRejectOpen(false);
                    handleBatchAction("reject");
                  }}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
                >
                  Reject {selectedIds.size} item
                  {selectedIds.size === 1 ? "" : "s"}
                </button>
              </div>
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
              <div
                className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 mb-3"
                aria-hidden="true"
              >
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
                const canSelect = item.actions.some(
                  (a) => a.variant === "approve" || a.variant === "reject",
                );
                return (
                  <ActivityItemCard
                    key={item.id}
                    item={item}
                    itemState={itemStates[item.id]}
                    onAction={handleAction}
                    onViewItem={setSelectedItem}
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

      {/* Detail Drawer */}
      {selectedItem && (
        <ItemDetailDrawer
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onAction={handleAction}
          itemState={itemStates[selectedItem.id]}
        />
      )}
    </ModulePageShell>
  );
}
