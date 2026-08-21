"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ArrowUpRight,
  Bot,
  RefreshCw,
  Wallet,
  Calendar,
  FileText,
  Send,
  Paperclip,
  X,
  Eye,
  ThumbsUp,
  ThumbsDown,
  ChevronRight,
  MessageSquare,
} from "lucide-react";

import { useEntity } from "@/lib/entity-context";
import { trpc } from "@/lib/trpc/client";
import { cn, formatCurrency } from "@/lib/utils";
import { DashboardSkeleton } from "@/components/shared/skeletons";
import { dashboardQueryOptions } from "@/lib/trpc/query-options";
import { Button } from "@/components/ui";
import { useSurfaceSync } from "@/lib/hooks/use-surface-sync";
import { ConfidenceBadge } from "@/components/shared/ai-native";
import { ActorBadge } from "@/components/shared/ai-native";
import { useDashboardChat } from "@/lib/hooks/use-dashboard-chat";
import { useSrAnnounce } from "@/lib/hooks/use-sr-announce";
import { usePageContext } from "@/lib/hooks/use-page-context";
import {
  ConversationThinkingSteps,
  ToolCallTraceCard,
} from "@/components/chat/thinking-steps";
import { DocumentDownloadButtons } from "@/components/documents/document-download-buttons";
import { ConversationSidebar } from "@/components/chat/conversation-sidebar";
import {
  MessageActions,
  PinnedMessagesPanel,
  type PinnedMessage,
} from "@/components/chat/message-actions";
import {
  KnowledgeCitations,
  type Citation,
} from "@/components/chat/knowledge-citations";
import { BatchProgressInline } from "@/components/chat/batch-progress-inline";
import {
  MessageReactions,
  type Reaction,
} from "@/components/chat/message-reactions";
import { ConversationMemory } from "@/components/chat/conversation-memory";
import type {
  NeedsInputEvent,
  NeedsInputField,
} from "@/lib/hooks/use-streaming-chat";

// ─── AI-Native Command Center ─────────────────────────────────────────────
//
// The primary surface. 80% of user time should be spent here.
// NOT a dashboard with a chat widget. IS a conversational interface
// with contextual dashboards.
//
// Layout:
//   1. ProactiveBriefing (top) — AI tells you what matters
//   2. ConversationThread (middle) — Chat with your AI CFO
//   3. AiInput (bottom) — Ask anything

// ─── Date Formatter ────────────────────────────────────────────────────────

const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

// ─── Greeting ──────────────────────────────────────────────────────────────

function AIGreeting({ firstName }: { firstName?: string }) {
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const today = DATE_FORMATTER.format(new Date());

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-1">
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          {greeting}, {firstName ?? "there"}
        </h1>
        <p className="text-[11px] text-muted-foreground/70 sm:text-xs">
          Here&apos;s your business snapshot for{" "}
          <span className="font-medium text-muted-foreground">{today}</span>.
        </p>
      </div>{" "}
      <div
        className="hidden shrink-0 items-center gap-1.5 rounded-full border border-border/40 bg-card/60 px-2.5 py-1 sm:flex"
        aria-hidden="true"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-[10px] font-medium text-muted-foreground/60">
          AI active
        </span>
      </div>
    </div>
  );
}

// ─── ProactiveBriefing ────────────────────────────────────────────────────
//
// AI-generated top alerts. The AI tells you what matters — you don't go
// looking for it. Each alert links to the surface where you can act on it.

type BriefingItem = {
  id: string;
  type: "negative" | "warning" | "positive" | "neutral";
  title: string;
  value: string;
  detail: string;
  href?: string;
  actionLabel?: string;
};

const statusConfig: Record<
  string,
  { icon: typeof TrendingUp; iconColor: string; iconBg: string; accent: string }
> = {
  positive: {
    icon: TrendingUp,
    iconColor: "text-emerald-500",
    iconBg: "bg-emerald-500/10",
    accent: "bg-emerald-500",
  },
  negative: {
    icon: AlertTriangle,
    iconColor: "text-red-500",
    iconBg: "bg-red-500/10",
    accent: "bg-red-500",
  },
  warning: {
    icon: Clock,
    iconColor: "text-amber-500",
    iconBg: "bg-amber-500/10",
    accent: "bg-amber-500",
  },
  neutral: {
    icon: FileText,
    iconColor: "text-primary",
    iconBg: "bg-primary/10",
    accent: "bg-primary",
  },
};

function BriefingCard({ item }: { item: BriefingItem }) {
  const config = statusConfig[item.type] ?? statusConfig.neutral;
  const Icon = config.icon;
  const isAttention = item.type === "negative" || item.type === "warning";

  const inner = (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105",
          config.iconBg,
        )}
      >
        <Icon className={cn("h-5 w-5", config.iconColor)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-medium text-foreground">
            {item.title}
          </p>
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
              isAttention
                ? item.type === "negative"
                  ? "bg-red-500/10 text-red-500"
                  : "bg-amber-500/10 text-amber-500"
                : "bg-emerald-500/10 text-emerald-500",
            )}
          >
            {item.value}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground/70">{item.detail}</p>
      </div>
      {item.href && (
        <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground/40 transition-all duration-200 group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      )}
    </div>
  );

  const cardClass = cn(
    "flex rounded-xl border p-3 transition-all duration-200 group",
    isAttention
      ? "border-amber-500/20 bg-amber-500/[0.03] hover:border-amber-500/40 hover:shadow-md"
      : "border-border/50 bg-card/60 hover:border-border/80 hover:shadow-md",
  );

  return item.href ? (
    <Link href={item.href} className={cn(cardClass, "hover:-translate-y-px")}>
      {inner}
    </Link>
  ) : (
    <div className={cardClass}>{inner}</div>
  );
}

function ProactiveBriefing() {
  const { entityId } = useEntity();
  const [briefingText, setBriefingText] = useState<string | null>(null);
  const [briefingActions, setBriefingActions] = useState<
    Array<{ label: string; href: string }>
  >([]);
  const [isLoadingBriefing, setIsLoadingBriefing] = useState(true);

  // Fetch AI briefing
  const { data: aiBriefing } = trpc.dashboard.getAiBriefing.useQuery(
    undefined,
    {
      enabled: !!entityId,
      staleTime: 5 * 60 * 1000, // 5 minutes
      onSuccess: (data) => {
        setBriefingText(data.text);
        setBriefingActions(data.actions ?? []);
        setIsLoadingBriefing(false);
      },
      onError: () => {
        setIsLoadingBriefing(false);
      },
    },
  );

  // Loading state
  if (isLoadingBriefing) {
    return (
      <div className="rounded-2xl border border-border/40 bg-card/30 p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary animate-pulse" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              Generating your briefing...
            </p>
            <p className="text-xs text-muted-foreground/70">
              Analyzing your financial data
            </p>
          </div>
        </div>
      </div>
    );
  }

  // AI-generated briefing
  if (briefingText) {
    return (
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground leading-relaxed">
              {briefingText}
            </p>
            {briefingActions.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {briefingActions.map((action) => (
                  <Link
                    key={action.href}
                    href={action.href}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
                  >
                    {action.label}
                    <ArrowUpRight className="h-3 w-3" />
                  </Link>
                ))}
              </div>
            )}
            <p className="text-[10px] text-muted-foreground/50 mt-2">
              AI-generated briefing • {new Date().toLocaleTimeString()}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Fallback to count-based briefing (if AI fails)
  const { data: dashboardData } = trpc.dashboard.getDashboardData.useQuery(
    {},
    { enabled: !!entityId },
  );
  const { data: ingestionStats } = trpc.ingestion.getStats.useQuery(undefined, {
    enabled: !!entityId,
  });

  const items: BriefingItem[] = [];

  if (dashboardData) {
    const { businessHealth, pendingApprovalsCount, deadlines } = dashboardData;
    const { cashBalance, runwayMonths } = businessHealth;

    if (deadlines.length > 0) {
      items.push({
        id: "upcoming-deadlines",
        type: "warning",
        title: `${deadlines.length} deadline${deadlines.length > 1 ? "s" : ""} upcoming`,
        value: `${deadlines.length} due`,
        detail: deadlines[0]?.label ?? "Upcoming deadlines need attention",
        href: "/dashboard/operations",
        actionLabel: "Review",
      });
    }

    if (pendingApprovalsCount > 0) {
      items.push({
        id: "pending-approvals",
        type: "warning",
        title: `${pendingApprovalsCount} item${pendingApprovalsCount > 1 ? "s" : ""} awaiting approval`,
        value: `${pendingApprovalsCount} pending`,
        detail: "Items awaiting your review or posting",
        href: "/dashboard/activity-hub",
        actionLabel: "Review",
      });
    }

    if (cashBalance !== undefined) {
      items.push({
        id: "cash-position",
        type: "positive",
        title: "Cash position",
        value: formatCurrency(cashBalance),
        detail:
          runwayMonths !== null && runwayMonths !== undefined
            ? `${runwayMonths.toFixed(1)} months runway`
            : "Cash-flow positive",
        href: "/dashboard/operations",
        actionLabel: "Details",
      });
    }
  }

  if (ingestionStats && ingestionStats.pendingReview > 0) {
    items.push({
      id: "pending-review",
      type: "warning",
      title: `${ingestionStats.pendingReview} document${ingestionStats.pendingReview > 1 ? "s" : ""} need review`,
      value: `${ingestionStats.pendingReview} pending`,
      detail: "Documents processed by AI, awaiting your verification",
      href: "/dashboard/activity-hub",
      actionLabel: "Review",
    });
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.03] p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              All clear — nothing needs your attention right now.
            </p>
            <p className="text-xs text-muted-foreground/70">
              Your AI accounting department is running smoothly.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const sorted = [...items].sort((a, b) => {
    const order = { negative: 0, warning: 1, neutral: 2, positive: 3 };
    return (order[a.type] ?? 2) - (order[b.type] ?? 2);
  });

  return (
    <section className="space-y-3 rounded-2xl border border-border/40 bg-card/30 p-4 sm:p-5">
      <div className="flex items-center gap-2.5">
        {" "}
        <div
          className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/8"
          aria-hidden="true"
        >
          <Sparkles className="h-3.5 w-3.5 text-primary" />
        </div>
        <h2 className="text-sm font-semibold tracking-tight text-foreground">
          Your AI briefing
        </h2>
        <span className="inline-flex items-center gap-1 rounded-full border border-border/40 bg-muted/30 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground/50">
          AI-curated
        </span>
      </div>
      <div className="space-y-2">
        {sorted.map((item) => (
          <BriefingCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}

// ─── ConversationThread ────────────────────────────────────────────────────
//
// The main chat interface. Uses the real streaming chat hook.
// Rich messages with inline actions — approve, reject, recode — directly
// in the conversation. No page navigation needed.

function InlineInputForm({
  spec,
  onSubmit,
}: {
  spec: NeedsInputEvent;
  onSubmit: (text: string) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pre-fill with known context
  useEffect(() => {
    if (spec.context) {
      const prefill: Record<string, string> = {};
      for (const [key, val] of Object.entries(spec.context)) {
        if (val != null) prefill[key] = String(val);
      }
      setValues(prefill);
    }
  }, [spec.context]);

  const handleSubmit = () => {
    // Build a natural language message from the form values
    const parts: string[] = [];
    for (const field of spec.missing) {
      const val = values[field.field];
      if (val) {
        parts.push(`${field.label}: ${val}`);
      } else if (field.required) {
        return; // Don't submit if required field is empty
      }
    }
    if (parts.length === 0) return;
    setIsSubmitting(true);
    onSubmit(`For the ${spec.action.replace(/_/g, " ")}: ${parts.join(". ")}`);
  };

  const allRequiredFilled = spec.missing
    .filter((f) => f.required)
    .every((f) => values[f.field]?.trim());

  return (
    <div className="flex gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/8">
        <Bot className="h-4 w-4 text-primary/70" />
      </div>
      <div className="max-w-[85%] rounded-2xl border border-primary/20 bg-primary/[0.03] px-4 py-3">
        <p className="text-sm font-medium text-foreground mb-3">
          I need a few details to {spec.action.replace(/_/g, " ")}:
        </p>
        <div className="space-y-3">
          {spec.missing.map((field) => (
            <div key={field.field}>
              <label
                htmlFor={`needs-input-${field.field}`}
                className="block text-xs font-medium text-muted-foreground mb-1"
              >
                {field.label}
                {field.required && (
                  <span className="text-red-500 ml-0.5">*</span>
                )}
              </label>
              {field.type === "select" && field.options ? (
                <select
                  id={`needs-input-${field.field}`}
                  value={values[field.field] ?? ""}
                  onChange={(e) =>
                    setValues((prev) => ({
                      ...prev,
                      [field.field]: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/10"
                >
                  <option value="">Select...</option>
                  {field.options.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : field.type === "textarea" ? (
                <textarea
                  id={`needs-input-${field.field}`}
                  value={values[field.field] ?? ""}
                  onChange={(e) =>
                    setValues((prev) => ({
                      ...prev,
                      [field.field]: e.target.value,
                    }))
                  }
                  rows={3}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/10"
                />
              ) : (
                <input
                  id={`needs-input-${field.field}`}
                  type={
                    field.type === "number"
                      ? "number"
                      : field.type === "date"
                        ? "date"
                        : "text"
                  }
                  value={values[field.field] ?? ""}
                  onChange={(e) =>
                    setValues((prev) => ({
                      ...prev,
                      [field.field]: e.target.value,
                    }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit();
                    }
                  }}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/10"
                />
              )}
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!allRequiredFilled || isSubmitting}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              allRequiredFilled && !isSubmitting
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-muted text-muted-foreground cursor-not-allowed",
            )}
          >
            {isSubmitting ? (
              <RefreshCw
                className="h-3.5 w-3.5 animate-spin"
                aria-hidden="true"
              />
            ) : (
              <Send className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {isSubmitting ? "Sending..." : "Submit"}
          </button>
          <span className="text-[10px] text-muted-foreground/50">
            Press Enter to submit
          </span>
        </div>
      </div>
    </div>
  );
}

function ConversationThread({
  messages,
  isStreaming,
  streamedContent,
  thinkingEvents,
  toolTraces,
  approvals,
  documents,
  pendingInput,
  onSendMessage,
}: {
  messages: ReturnType<typeof useDashboardChat>["messages"];
  isStreaming: boolean;
  streamedContent: string;
  thinkingEvents: ReturnType<typeof useDashboardChat>["thinkingEvents"];
  toolTraces: ReturnType<typeof useDashboardChat>["toolTraces"];
  approvals: ReturnType<typeof useDashboardChat>["approvals"];
  documents: ReturnType<typeof useDashboardChat>["documents"];
  pendingInput: NeedsInputEvent | null;
  onSendMessage: (text: string) => void;
}) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [processingApproval, setProcessingApproval] = useState<string | null>(
    null,
  );
  const [pinnedMessages, setPinnedMessages] = useState<PinnedMessage[]>([]);
  const [messageReactions, setMessageReactions] = useState<
    Record<string, Reaction[]>
  >({});

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming, streamedContent]);

  const handleApprovalAction = useCallback(
    (action: "approve" | "reject" | "review", approvalTitle: string) => {
      setProcessingApproval(approvalTitle);
      const message =
        action === "approve"
          ? `Approved: ${approvalTitle}`
          : action === "reject"
            ? `Rejected: ${approvalTitle}`
            : `Please review: ${approvalTitle}`;
      onSendMessage(message);
    },
    [onSendMessage],
  );

  // Reaction handler
  const handleReact = useCallback((messageId: string, emoji: string) => {
    setMessageReactions((prev) => {
      const existing = prev[messageId] ?? [];
      const reactionIndex = existing.findIndex((r) => r.emoji === emoji);

      if (reactionIndex >= 0) {
        // Toggle existing reaction
        const updated = [...existing];
        const reaction = updated[reactionIndex];
        if (reaction.userReacted) {
          // Remove user's reaction
          updated[reactionIndex] = {
            ...reaction,
            count: reaction.count - 1,
            userReacted: false,
          };
          // Remove if count is 0
          if (updated[reactionIndex].count === 0) {
            updated.splice(reactionIndex, 1);
          }
        } else {
          // Add user's reaction
          updated[reactionIndex] = {
            ...reaction,
            count: reaction.count + 1,
            userReacted: true,
          };
        }
        return { ...prev, [messageId]: updated };
      } else {
        // Add new reaction
        return {
          ...prev,
          [messageId]: [...existing, { emoji, count: 1, userReacted: true }],
        };
      }
    });
  }, []);

  // Pin/unpin message handler
  const handlePin = useCallback(
    (messageId: string) => {
      setPinnedMessages((prev) => {
        const existing = prev.find((m) => m.id === messageId);
        if (existing) {
          // Unpin
          return prev.filter((m) => m.id !== messageId);
        }
        // Pin
        const msg = messages.find((m) => m.id === messageId);
        if (!msg) return prev;
        return [
          ...prev,
          {
            id: msg.id,
            content: msg.content,
            role: msg.role as "user" | "assistant",
            pinnedAt: new Date(),
            sender: msg.role === "assistant" ? "AI" : "You",
          },
        ];
      });
    },
    [messages],
  );

  // Unpin handler
  const handleUnpin = useCallback((messageId: string) => {
    setPinnedMessages((prev) => prev.filter((m) => m.id !== messageId));
  }, []);

  // Jump to pinned message
  const handleJumpTo = useCallback((messageId: string) => {
    const element = document.getElementById(`message-${messageId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      element.classList.add("ring-2", "ring-primary/50");
      setTimeout(() => {
        element.classList.remove("ring-2", "ring-primary/50");
      }, 2000);
    }
  }, []);

  // Regenerate handler (placeholder — would call API to regenerate)
  const handleRegenerate = useCallback(
    (messageId: string) => {
      // Find the user message before this assistant message
      const msgIndex = messages.findIndex((m) => m.id === messageId);
      if (msgIndex > 0) {
        const prevMsg = messages[msgIndex - 1];
        if (prevMsg.role === "user") {
          onSendMessage(prevMsg.content);
        }
      }
    },
    [messages, onSendMessage],
  );

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      {/* Pinned Messages Panel */}
      <PinnedMessagesPanel
        messages={pinnedMessages}
        onUnpin={handleUnpin}
        onJumpTo={handleJumpTo}
      />
      <div className="mx-auto max-w-3xl space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            id={`message-${msg.id}`}
            className={cn(
              "flex gap-3 group relative",
              msg.role === "user" ? "justify-end" : "justify-start",
            )}
          >
            {msg.role === "assistant" && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/8">
                <Bot className="h-4 w-4 text-primary/70" />
              </div>
            )}
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed relative",
                msg.role === "assistant"
                  ? "bg-card border border-border/50 text-foreground"
                  : "bg-primary text-primary-foreground",
              )}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>

              {/* Confidence badge on assistant messages */}
              {msg.role === "assistant" && msg.confidence !== undefined && (
                <div className="mt-2">
                  <ConfidenceBadge score={msg.confidence / 100} />
                </div>
              )}

              {/* Actor badge */}
              {msg.role === "assistant" && (
                <div className="mt-1">
                  <ActorBadge actor="ai" />
                </div>
              )}

              {/* Knowledge citations */}
              {msg.role === "assistant" &&
                msg.citations &&
                msg.citations.length > 0 && (
                  <KnowledgeCitations
                    citations={msg.citations.flatMap((event) =>
                      event.citations.map((c) => ({
                        index: c.index,
                        content: c.content,
                        sourceType: c.sourceType,
                        documentId: c.documentId,
                        score: c.score,
                        method: c.method,
                      })),
                    )}
                  />
                )}

              {/* Batch ingestion results */}
              {msg.role === "assistant" &&
                msg.batchResults &&
                msg.batchResults.length > 0 && (
                  <>
                    {msg.batchResults.map((result) => (
                      <BatchProgressInline
                        key={result.batchId}
                        batchId={result.batchId}
                        totalDocuments={result.totalDocuments}
                        completedDocuments={result.completedDocuments}
                        failedDocuments={result.failedDocuments}
                        documents={result.documents}
                        message={result.message}
                      />
                    ))}
                  </>
                )}
            </div>

            {/* Message Reactions */}
            <div className="flex items-center gap-2 mt-1">
              <MessageReactions
                reactions={messageReactions[msg.id] ?? []}
                onReact={(emoji) => handleReact(msg.id, emoji)}
              />
            </div>

            {/* Message Actions (on hover) */}
            <MessageActions
              content={msg.content}
              messageId={msg.id}
              role={msg.role as "user" | "assistant"}
              isPinned={pinnedMessages.some((p) => p.id === msg.id)}
              onPin={handlePin}
              onRegenerate={
                msg.role === "assistant" ? handleRegenerate : undefined
              }
            />
          </div>
        ))}

        {/* Thinking steps — shown while AI is processing */}
        {isStreaming && thinkingEvents.length > 0 && (
          <ConversationThinkingSteps
            events={thinkingEvents}
            isStreaming={isStreaming}
          />
        )}

        {/* Tool call traces — shown when AI calls tools */}
        {toolTraces.map((trace, i) => (
          <ToolCallTraceCard
            key={`tool-${i}-${trace.toolName}`}
            trace={trace}
          />
        ))}

        {/* Streaming response */}
        {isStreaming && streamedContent && (
          <div className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/8">
              <Bot className="h-4 w-4 text-primary/70" />
            </div>
            <div className="max-w-[85%] rounded-2xl bg-card border border-border/50 px-4 py-3 text-sm leading-relaxed text-foreground">
              <p className="whitespace-pre-wrap" aria-live="polite">
                {streamedContent}
              </p>
              <span
                className="inline-block h-4 w-0.5 animate-pulse bg-primary/60 ml-0.5"
                aria-hidden="true"
              />
            </div>
          </div>
        )}

        {/* Thinking indicator */}
        {isStreaming && !streamedContent && (
          <div className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/8">
              <Bot className="h-4 w-4 text-primary/70" />
            </div>
            <div className="rounded-2xl bg-card border border-border/50 px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary/60" />
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary/60 [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary/60 [animation-delay:300ms]" />
                </div>
                <span
                  className="text-xs text-muted-foreground/60"
                  role="status"
                  aria-live="polite"
                >
                  Thinking...
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Inline approval cards from streaming */}
        {approvals.map((approval, i) => (
          <div key={`approval-${i}`} className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/8">
              <Bot className="h-4 w-4 text-primary/70" />
            </div>
            <div className="max-w-[85%] rounded-2xl border border-amber-500/20 bg-amber-500/[0.03] px-4 py-3">
              <div className="flex items-start gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {approval.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {approval.description}
                  </p>
                  {approval.amount && (
                    <p className="text-sm font-semibold text-foreground mt-1">
                      {approval.amount}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  aria-label="Approve"
                  disabled={processingApproval === approval.title}
                  onClick={() =>
                    handleApprovalAction("approve", approval.title)
                  }
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                    processingApproval === approval.title
                      ? "bg-emerald-500/20 text-emerald-700 cursor-wait"
                      : "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20",
                  )}
                >
                  {processingApproval === approval.title ? (
                    <RefreshCw
                      className="h-3.5 w-3.5 animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <ThumbsUp className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  {processingApproval === approval.title
                    ? "Processing..."
                    : "Approve"}
                </button>
                <button
                  type="button"
                  aria-label="Review"
                  disabled={processingApproval === approval.title}
                  onClick={() => handleApprovalAction("review", approval.title)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-50"
                >
                  <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                  Review
                </button>
                <button
                  type="button"
                  aria-label="Reject"
                  disabled={processingApproval === approval.title}
                  onClick={() => handleApprovalAction("reject", approval.title)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                    processingApproval === approval.title
                      ? "bg-red-500/20 text-red-700 cursor-wait"
                      : "bg-red-500/10 text-red-600 hover:bg-red-500/20",
                  )}
                >
                  {processingApproval === approval.title ? (
                    <RefreshCw
                      className="h-3.5 w-3.5 animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <ThumbsDown className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  {processingApproval === approval.title
                    ? "Processing..."
                    : "Reject"}
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Inline input form from AI */}
        {pendingInput && !isStreaming && (
          <InlineInputForm
            spec={pendingInput}
            onSubmit={(text) => {
              onSendMessage(text);
            }}
          />
        )}

        {/* Document artifacts */}
        {documents.map((doc, i) => (
          <div key={`doc-${i}`} className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/8">
              <Bot className="h-4 w-4 text-primary/70" />
            </div>
            <div className="max-w-[85%] rounded-2xl border border-border/50 bg-card px-4 py-3">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-primary" aria-hidden="true" />
                <span className="text-sm font-medium text-foreground">
                  {doc.name}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {doc.docType}
                </span>
              </div>
              <DocumentDownloadButtons
                data={{
                  title: doc.name,
                  entityName: "Your Business",
                  currency: "GMD",
                  generatedAt: new Date(),
                  sections: [],
                }}
                formats={["pdf", "excel", "word"]}
                size="xs"
              />
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}

// ─── AiInput ───────────────────────────────────────────────────────────────
//
// Universal AI chat input. Sits at the bottom of the Command Center.
// Dynamic suggestions based on time of month and entity state.

const COMPOSER_MAX_HEIGHT = 120;

function AiInput({
  onSubmit,
  isResponding,
}: {
  onSubmit: (value: string) => void;
  isResponding: boolean;
}) {
  const [inputValue, setInputValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, COMPOSER_MAX_HEIGHT)}px`;
  }, [inputValue]);

  const handleSubmit = (value?: string) => {
    const trimmed = (value ?? inputValue).trim();
    if (!trimmed || isResponding) return;
    onSubmit(trimmed);
    setInputValue("");
  };

  const suggestions = [
    { label: "Cash position", icon: Wallet, color: "text-emerald-500" },
    { label: "Show P&L", icon: TrendingUp, color: "text-blue-500" },
    { label: "What's overdue?", icon: AlertTriangle, color: "text-amber-500" },
    { label: "Run payroll", icon: Calendar, color: "text-purple-500" },
    { label: "Close books", icon: FileText, color: "text-indigo-500" },
  ];

  return (
    <div className="mx-auto w-full max-w-3xl space-y-2 px-3 pb-4 sm:px-4">
      {/* Suggestions */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {suggestions.map((suggestion) => {
          const Icon = suggestion.icon;
          return (
            <button
              key={suggestion.label}
              type="button"
              onClick={() => handleSubmit(suggestion.label)}
              disabled={isResponding}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border/40 bg-background/50",
                "px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground/70 transition-all duration-200",
                "hover:border-primary/25 hover:text-primary/80 hover:bg-primary/[0.03]",
                "active:scale-[0.97]",
                "disabled:opacity-40 disabled:pointer-events-none",
              )}
            >
              <Icon
                className={cn("h-3 w-3", suggestion.color)}
                aria-hidden="true"
              />
              <span>{suggestion.label}</span>
            </button>
          );
        })}
      </div>

      {/* Input */}
      <div
        className={cn(
          "relative group rounded-2xl border bg-card transition-all duration-300",
          isFocused
            ? "border-primary/40 shadow-lg shadow-primary/[0.06]"
            : "border-border/40 shadow-sm hover:border-border/60 hover:shadow-md",
        )}
      >
        <div className="relative flex items-end gap-3 px-4 py-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center self-center rounded-lg bg-primary/8 text-primary/70 transition-colors group-focus-within:bg-primary/12 group-focus-within:text-primary">
            <Bot className="h-4 w-4" />
          </div>
          <label htmlFor="ai-chat-input" className="sr-only">
            Ask your AI CFO anything
          </label>
          <textarea
            id="ai-chat-input"
            ref={textareaRef}
            rows={1}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="Ask anything about your accounting..."
            className="max-h-[120px] min-h-[24px] flex-1 resize-none overflow-y-auto bg-transparent py-1 text-sm leading-normal text-foreground placeholder:text-muted-foreground/50 outline-none"
          />
          <Button
            type="button"
            size="icon"
            aria-label="Send message"
            onClick={() => handleSubmit()}
            disabled={!inputValue.trim() || isResponding}
            className={cn(
              "h-10 w-10 rounded-xl p-0 transition-all shrink-0",
              inputValue.trim()
                ? "bg-primary hover:bg-primary/90 text-white shadow-sm"
                : "bg-primary text-white",
            )}
          >
            {isResponding ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        {isFocused && (
          <div className="border-t border-border/30 px-4 py-1.5">
            <p className="text-[9px] text-muted-foreground/40">
              <kbd className="inline-flex items-center rounded border border-border/40 bg-muted/40 px-1 py-px text-[9px] font-mono">
                Enter
              </kbd>{" "}
              send ·{" "}
              <kbd className="inline-flex items-center rounded border border-border/40 bg-muted/40 px-1 py-px text-[9px] font-mono">
                Shift+Enter
              </kbd>{" "}
              newline
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function CommandCenterPage() {
  const { data: session } = useSession();
  const firstName = session?.user?.name?.split(" ")[0];
  const { entityId } = useEntity();
  const { announce } = useSrAnnounce();

  // ── Cross-surface sync ────────────────────────────────────────────────
  // Listen for data_changed events from other surfaces and refetch
  useSurfaceSync({ entityId, surfaces: ["command-center"] });

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const {
    messages,
    isStreaming,
    streamedContent,
    thinkingEvents,
    conversationId,
    approvals,
    documents,
    toolTraces,
    pendingInput,
    sendMessage,
    loadConversation,
    newChat,
  } = useDashboardChat({ entityId });

  // Announce streaming status to screen readers
  useEffect(() => {
    if (isStreaming && !streamedContent) {
      announce("AI is thinking...");
    } else if (isStreaming && streamedContent) {
      announce("AI is responding...");
    }
  }, [isStreaming, streamedContent, announce]);

  const pageContext = usePageContext();

  const handleSubmit = useCallback(
    (value: string) => {
      sendMessage(value, pageContext);
    },
    [sendMessage, pageContext],
  );

  return (
    <div className="flex h-full pb-16 md:pb-0" aria-busy={isStreaming}>
      {/* Conversation Sidebar */}
      <ConversationSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        currentConversationId={conversationId}
        onSelectConversation={(id, title) => {
          loadConversation(id, title);
          setSidebarOpen(false);
        }}
        onNewChat={() => {
          newChat();
          setSidebarOpen(false);
        }}
      />

      {/* Main Content */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Greeting */}
        <div className="px-4 pt-6 sm:px-6">
          <div className="flex items-center justify-between">
            <AIGreeting firstName={firstName} />
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hidden md:inline-flex items-center gap-1.5 rounded-lg border border-border/50 bg-background/50 px-2.5 py-1.5 text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              aria-label={
                sidebarOpen
                  ? "Close conversation list"
                  : "Open conversation list"
              }
            >
              <MessageSquare className="h-3 w-3" />
              {sidebarOpen ? "Hide list" : "Conversations"}
            </button>
          </div>
        </div>

        {/* Proactive Briefing */}
        <div className="px-4 pt-4 sm:px-6">
          <ProactiveBriefing />
        </div>

        {/* Conversation Memory — shows relevant past conversations */}
        <div className="px-4 sm:px-6">
          <ConversationMemory
            currentQuery={messages[messages.length - 1]?.content ?? ""}
            currentConversationId={conversationId ?? undefined}
            onJumpToConversation={(id) => loadConversation(id)}
          />
        </div>

        {/* Conversation Thread */}
        <ConversationThread
          messages={messages}
          isStreaming={isStreaming}
          streamedContent={streamedContent}
          thinkingEvents={thinkingEvents}
          toolTraces={toolTraces}
          approvals={approvals}
          documents={documents}
          pendingInput={pendingInput}
          onSendMessage={sendMessage}
        />

        {/* AI Input — fixed at bottom */}
        <div className="sticky bottom-0 border-t border-border/30 bg-background/80 backdrop-blur-sm">
          <AiInput onSubmit={handleSubmit} isResponding={isStreaming} />
        </div>
      </div>
    </div>
  );
}
