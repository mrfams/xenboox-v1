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
import { ConfidenceBadge } from "@/components/shared/ai-native";
import { ActorBadge } from "@/components/shared/ai-native";
import { useDashboardChat } from "@/lib/hooks/use-dashboard-chat";

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
      </div>          <div className="hidden shrink-0 items-center gap-1.5 rounded-full border border-border/40 bg-card/60 px-2.5 py-1 sm:flex" aria-hidden="true">
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

  const { data: dashboardData } = trpc.dashboard.getOverview.useQuery(
    undefined,
    { enabled: !!entityId },
  );
  const { data: ingestionStats } = trpc.ingestion.getStats.useQuery(undefined, {
    enabled: !!entityId,
  });

  const items: BriefingItem[] = [];

  if (dashboardData) {
    const { cashBalance, overdueInvoices, pendingJournals, runway } =
      dashboardData;

    if (overdueInvoices > 0) {
      items.push({
        id: "overdue-invoices",
        type: "negative",
        title: `${overdueInvoices} invoice${overdueInvoices > 1 ? "s" : ""} overdue`,
        value: `${overdueInvoices} items`,
        detail: "Invoices past their due date need attention",
        href: "/dashboard/operations",
        actionLabel: "Review",
      });
    }

    if (pendingJournals > 0) {
      items.push({
        id: "pending-journals",
        type: "warning",
        title: `${pendingJournals} journal entr${pendingJournals > 1 ? "ies" : "y"} pending`,
        value: `${pendingJournals} pending`,
        detail: "Journal entries awaiting review or posting",
        href: "/dashboard/ledger",
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
          runway !== null && runway !== undefined
            ? `${runway.toFixed(1)} months runway`
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
      <div className="flex items-center gap-2.5">          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/8" aria-hidden="true">
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

function ConversationThread({
  messages,
  isStreaming,
  streamedContent,
  approvals,
  documents,
}: {
  messages: ReturnType<typeof useDashboardChat>["messages"];
  isStreaming: boolean;
  streamedContent: string;
  approvals: ReturnType<typeof useDashboardChat>["approvals"];
  documents: ReturnType<typeof useDashboardChat>["documents"];
}) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming, streamedContent]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="mx-auto max-w-3xl space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "flex gap-3",
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
                "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
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
            </div>
          </div>
        ))}

        {/* Streaming response */}
        {isStreaming && streamedContent && (
          <div className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/8">
              <Bot className="h-4 w-4 text-primary/70" />
            </div>
            <div className="max-w-[85%] rounded-2xl bg-card border border-border/50 px-4 py-3 text-sm leading-relaxed text-foreground">
              <p className="whitespace-pre-wrap" aria-live="polite">{streamedContent}</p>
              <span className="inline-block h-4 w-0.5 animate-pulse bg-primary/60 ml-0.5" aria-hidden="true" />
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
                <span className="text-xs text-muted-foreground/60" role="status" aria-live="polite">
                  Thinking...
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Inline approval cards from streaming */}
        {approvals.map((approval, i) => (
          <div
            key={`approval-${i}`}
            className="flex gap-3"
          >
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
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-500/20 transition-colors"
                >
                  <ThumbsUp className="h-3.5 w-3.5" aria-hidden="true" />
                  Approve
                </button>
                <button
                  type="button"
                  aria-label="Review"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
                >
                  <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                  Review
                </button>
                <button
                  type="button"
                  aria-label="Reject"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-500/20 transition-colors"
                >
                  <ThumbsDown className="h-3.5 w-3.5" aria-hidden="true" />
                  Reject
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Document artifacts */}
        {documents.map((doc, i) => (
          <div
            key={`doc-${i}`}
            className="flex gap-3"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/8">
              <Bot className="h-4 w-4 text-primary/70" />
            </div>
            <div className="max-w-[85%] rounded-2xl border border-border/50 bg-card px-4 py-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" aria-hidden="true" />
                <span className="text-sm font-medium text-foreground">
                  {doc.name}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {doc.docType}
                </span>
              </div>
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
              <Icon className={cn("h-3 w-3", suggestion.color)} aria-hidden="true" />
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
          <label htmlFor="ai-chat-input" className="sr-only">Ask your AI CFO anything</label>
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

  const {
    messages,
    isStreaming,
    streamedContent,
    approvals,
    documents,
    sendMessage,
  } = useDashboardChat({ entityId });

  const handleSubmit = useCallback(
    (value: string) => {
      sendMessage(value);
    },
    [sendMessage],
  );

  return (
    <div className="flex h-full flex-col pb-16 md:pb-0">
      {/* Greeting */}
      <div className="px-4 pt-6 sm:px-6">
        <AIGreeting firstName={firstName} />
      </div>

      {/* Proactive Briefing */}
      <div className="px-4 pt-4 sm:px-6">
        <ProactiveBriefing />
      </div>

      {/* Conversation Thread */}
      <ConversationThread
        messages={messages}
        isStreaming={isStreaming}
        streamedContent={streamedContent}
        approvals={approvals}
        documents={documents}
      />

      {/* AI Input — fixed at bottom */}
      <div className="sticky bottom-0 border-t border-border/30 bg-background/80 backdrop-blur-sm">
        <AiInput onSubmit={handleSubmit} isResponding={isStreaming} />
      </div>
    </div>
  );
}
