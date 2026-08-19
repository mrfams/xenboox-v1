"use client";

import { useState } from "react";
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
} from "lucide-react";

import { useEntity } from "@/lib/entity-context";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { ModulePageShell } from "@/components/module/module-page-shell";

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
  actions: Array<{
    label: string;
    variant?: "default" | "outline" | "ghost";
    href?: string;
    onClick?: () => void;
  }>;
};

function ConfidenceBadge({ score }: { score: number }) {
  if (score >= 0.9)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-500">
        High confidence
      </span>
    );
  if (score >= 0.7)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-500">
        Review suggested
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-500">
      Needs attention
    </span>
  );
}

function ActivityItemCard({ item }: { item: ActivityItemData }) {
  const typeConfig = {
    urgent: {
      border: "border-red-500/20",
      bg: "bg-red-500/[0.03]",
      icon: AlertTriangle,
      iconColor: "text-red-500",
      iconBg: "bg-red-500/10",
    },
    approval: {
      border: "border-amber-500/20",
      bg: "bg-amber-500/[0.03]",
      icon: FileCheck,
      iconColor: "text-amber-500",
      iconBg: "bg-amber-500/10",
    },
    review: {
      border: "border-border/50",
      bg: "bg-card/60",
      icon: Clock,
      iconColor: "text-primary",
      iconBg: "bg-primary/10",
    },
    info: {
      border: "border-border/50",
      bg: "bg-card/60",
      icon: Bell,
      iconColor: "text-muted-foreground",
      iconBg: "bg-muted/40",
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
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            config.iconBg,
          )}
        >
          <Icon className={cn("h-5 w-5", config.iconColor)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium text-foreground">{item.title}</p>
            {item.confidence !== undefined && (
              <ConfidenceBadge score={item.confidence} />
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {item.description}
          </p>
          {item.agent && (
            <div className="mt-2 flex items-center gap-1.5">
              <Bot className="h-3 w-3 text-primary/60" />
              <span className="text-[10px] text-muted-foreground/60">
                {item.agent}
              </span>
            </div>
          )}
          {item.amount && (
            <p className="mt-2 text-sm font-semibold text-foreground">
              {item.amount}
            </p>
          )}
        </div>
      </div>
      {item.actions.length > 0 && (
        <div className="mt-3 flex items-center gap-2 pl-13">
          {item.actions.map((action) =>
            action.href ? (
              <Link
                key={action.label}
                href={action.href}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                  action.variant === "outline"
                    ? "border border-border bg-background text-foreground hover:bg-accent"
                    : action.variant === "ghost"
                      ? "text-muted-foreground hover:text-foreground hover:bg-accent"
                      : "bg-primary text-primary-foreground hover:bg-primary/90",
                )}
              >
                {action.label}
              </Link>
            ) : (
              <button
                key={action.label}
                type="button"
                onClick={action.onClick}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                  action.variant === "outline"
                    ? "border border-border bg-background text-foreground hover:bg-accent"
                    : action.variant === "ghost"
                      ? "text-muted-foreground hover:text-foreground hover:bg-accent"
                      : "bg-primary text-primary-foreground hover:bg-primary/90",
                )}
              >
                {action.label}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function ActivityHubPage() {
  const { entityId } = useEntity();
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");

  // Fetch real data
  const { data: ingestionStats } = trpc.ingestion.getStats.useQuery(undefined, {
    enabled: !!entityId,
  });
  const { data: agentApprovals } = trpc.ingestion.listAgentApprovals.useQuery(
    { limit: 50 },
    { enabled: !!entityId },
  );
  const { data: notifications } = trpc.notifications.list.useQuery(
    { limit: 20, onlyUnread: false },
    { enabled: !!entityId },
  );

  // Build activity items from real data
  const activityItems: ActivityItemData[] = [];

  // Add agent approvals as approvals
  if (agentApprovals?.items) {
    for (const approval of agentApprovals.items) {
      activityItems.push({
        id: approval.id,
        type: "approval",
        title: approval.title ?? "Agent action pending",
        description: approval.description ?? "Requires your review",
        agent: approval.agentName ?? "AI Agent",
        confidence: approval.confidence ?? undefined,
        actions: [
          { label: "Approve", variant: "default" },
          { label: "Review", variant: "outline" },
          { label: "Reject", variant: "ghost" },
        ],
      });
    }
  }

  // Add pending review items as reviews
  if (ingestionStats && ingestionStats.pendingReview > 0) {
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
          variant: "default",
          href: "/dashboard/operations",
        },
        { label: "Auto-approve", variant: "ghost" },
      ],
    });
  }

  // Add notifications as info items
  if (notifications) {
    for (const notification of notifications.slice(0, 5)) {
      activityItems.push({
        id: notification.id,
        type: "info",
        title: notification.title,
        description: notification.body ?? "",
        actions: [{ label: "View", variant: "ghost" }],
      });
    }
  }

  // Filter items
  const filteredItems =
    activeFilter === "all"
      ? activityItems
      : activityItems.filter((item) => {
          if (activeFilter === "urgent") return item.type === "urgent";
          if (activeFilter === "approvals") return item.type === "approval";
          if (activeFilter === "reviews") return item.type === "review";
          if (activeFilter === "info") return item.type === "info";
          return true;
        });

  const urgentCount = activityItems.filter((i) => i.type === "urgent").length;
  const approvalCount = activityItems.filter(
    (i) => i.type === "approval",
  ).length;

  return (
    <ModulePageShell
      title="Activity Hub"
      description="What needs your attention right now. AI-curated, priority-sorted."
      icon={Inbox}
    >
      <div className="space-y-4 p-4 sm:p-6">
        {/* Stats */}
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border/50 bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10">
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
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
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
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {ingestionStats?.autoPosted ?? 0}
                </p>
                <p className="text-xs text-muted-foreground">Auto-resolved</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {FILTER_OPTIONS.map((filter) => {
            const Icon = filter.icon;
            return (
              <button
                key={filter.key}
                type="button"
                onClick={() => setActiveFilter(filter.key)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap",
                  activeFilter === filter.key
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {filter.label}
              </button>
            );
          })}
        </div>

        {/* Activity Items */}
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/50 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 mb-3">
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
            {filteredItems.map((item) => (
              <ActivityItemCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </ModulePageShell>
  );
}
