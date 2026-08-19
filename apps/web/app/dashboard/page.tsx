"use client";

import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  TrendingDown,
  Clock,
  FileText,
  AlertTriangle,
  Bot,
  Calendar,
  ChevronRight,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Search,
  Wallet,
  BarChart3,
  BookOpen,
  MessageSquare,
  Activity,
  ArrowUpRight,
  CheckCircle2,
} from "lucide-react";

import { useEntity } from "@/lib/entity-context";
import {
  roleToAudience,
  AUDIENCE_META,
  type BriefingAudience,
} from "@/lib/dashboard-audiences";
import { trpc } from "@/lib/trpc/client";
import { cn, formatCurrency } from "@/lib/utils";
import {
  runwayStatusLabel,
  runwayTone as runwayToneOf,
} from "@/lib/dashboard-runway";
import { DashboardSkeleton } from "@/components/shared/skeletons";
import {
  dashboardQueryOptions,
  suggestionsQueryOptions,
} from "@/lib/trpc/query-options";
import { Button } from "@/components/ui";
import { useDashboardChat } from "@/lib/hooks/use-dashboard-chat";
import {
  PageEmptyState,
  getPageEmptyState,
} from "@/components/shared/page-empty-state";

// §4.4 — the chat screen (and its workspace component chain: StreamingMessage,
// ArtifactViewer, approval prompts) only renders once a chat session is
// active, and the text-selection menu only appears on user text selection.
// Both ship as separate lazy chunks so the initial dashboard payload stays
// lean. ssr:false is safe: neither is ever visible during SSR (chat mounts
// on interaction, the menu renders nothing until a selection event fires).
const DashboardChatScreen = dynamic(
  () =>
    import("@/components/dashboard/dashboard-chat-screen").then(
      (m) => m.DashboardChatScreen,
    ),
  { ssr: false },
);
const TextSelectionMenu = dynamic(
  () =>
    import("@/components/dashboard/text-selection-menu").then(
      (m) => m.TextSelectionMenu,
    ),
  { ssr: false },
);

// The Business Health period selector drives real server-side period ranges.
type HealthPeriod = "this_month" | "last_month" | "this_quarter";

// ─── Mini Sparkline Component ─────────────────────────────────────────────

function MiniSparkline({
  data,
  color,
  className,
}: {
  data: number[];
  color: string;
  className?: string;
}) {
  // No data (or a single flat point) → render nothing rather than a bogus
  // line; real figures come from the server, never fabricated client-side.
  if (data.length < 2) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const width = 60;
  const height = 20;
  const padding = 2;

  const points = data
    .map((v, i) => {
      const x =
        padding + (i / Math.max(data.length - 1, 1)) * (width - padding * 2);
      const y = height - padding - ((v - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");

  const areaPoints = `${padding},${height - padding} ${points} ${width - padding},${height - padding}`;

  return (
    <svg
      width={width}
      height={height}
      className={cn("overflow-visible shrink-0", className)}
    >
      <defs>
        <linearGradient
          id={`sparkline-${color.replace("#", "")}`}
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={areaPoints}
        fill={`url(#sparkline-${color.replace("#", "")})`}
      />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── Greeting Component ──────────────────────────────────────────────────

// Module-scope formatter — hoisted so it isn't re-allocated on every render.
const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

function AIGreeting({ firstName }: { firstName?: string }) {
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const today = DATE_FORMATTER.format(new Date());

  return (
    <div className="flex flex-col gap-1">
      <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
        {greeting}, {firstName ?? "there"}
      </h1>
      <p className="text-xs text-muted-foreground sm:text-sm">
        Here&apos;s your business snapshot for {today}.
      </p>
    </div>
  );
}

// ─── AI Chat Input Component (Controlled) ───────────────────────────────────

// Max composer height in px (~5 lines) — shared by the auto-grow effect and
// the CSS cap so they can never drift apart.
const COMPOSER_MAX_HEIGHT = 120;

function AIChatInput({
  onSubmit,
  isResponding,
  isChatActive,
  onExit,
  suggestions,
}: {
  onSubmit: (value: string) => void;
  isResponding: boolean;
  isChatActive: boolean;
  onExit: () => void;
  suggestions: Array<{
    label: string;
    icon: typeof TrendingUp;
    color: string;
    prompt: string;
  }>;
}) {
  const [inputValue, setInputValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-grow the composer: text wraps onto new lines (like ChatGPT/Claude)
  // instead of scrolling sideways out of view. Grows up to ~5 lines, then
  // scrolls internally.
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

  return (
    <div
      className={cn(
        "mx-auto w-full max-w-3xl",
        // While a chat is active the composer is in-conversation — the
        // suggestion row is secondary, so it gets tighter spacing.
        isChatActive ? "space-y-1.5" : "space-y-2",
      )}
    >
      {/* Suggestions */}
      <div className="scrollbar-hide flex items-center gap-2 overflow-x-auto py-0.5">
        {suggestions.map((suggestion) => {
          const Icon = suggestion.icon;
          return (
            <button
              key={suggestion.label}
              type="button"
              onClick={() => handleSubmit(suggestion.prompt)}
              disabled={isResponding}
              className={cn(
                "inline-flex shrink-0 items-center rounded-xl border border-border/50 bg-card/80",
                "text-[10px] sm:text-xs text-muted-foreground transition-all duration-200",
                isChatActive
                  ? "gap-1 px-2 py-1"
                  : "gap-1.5 px-2.5 sm:px-3 py-1.5",
                "hover:border-primary/30 hover:text-primary hover:bg-primary/5 hover:shadow-sm",
                "active:scale-95",
                "disabled:opacity-50 disabled:pointer-events-none",
              )}
            >
              <Icon className={cn("h-3 w-3", suggestion.color)} />
              <span className="hidden sm:inline">{suggestion.label}</span>
              <span className="sm:hidden">
                {suggestion.label.split(" ")[0]}
              </span>
            </button>
          );
        })}
        <button
          type="button"
          className={cn(
            "inline-flex shrink-0 items-center justify-center rounded-xl border border-border/50 bg-card/80 text-muted-foreground transition-all hover:bg-accent",
            isChatActive ? "h-6 w-6" : "h-7 w-7",
          )}
          title="Refresh suggestions"
        >
          <RefreshCw className="h-3 w-3" />
        </button>
      </div>

      <div
        className={cn(
          "relative group rounded-2xl border-2 bg-card transition-all duration-300 shadow-sm",
          isFocused
            ? "border-primary/50 shadow-lg shadow-primary/10"
            : "border-border/50 hover:border-border/80 hover:shadow-md",
        )}
      >
        <div className="relative flex items-end gap-3 px-4 py-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center self-center rounded-lg bg-primary/10 text-primary">
            <Bot className="h-4 w-4" />
          </div>
          <textarea
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
            placeholder={
              isChatActive
                ? "Follow up with Xenboox AI..."
                : "Ask anything about your accounting..."
            }
            className="max-h-[120px] min-h-[24px] flex-1 resize-none overflow-y-auto bg-transparent py-1 text-sm leading-normal text-foreground placeholder:text-muted-foreground/50 outline-none"
          />
          <Button
            type="button"
            size="icon"
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
              <ArrowRight className="h-4 w-4" />
            )}
          </Button>
        </div>
        {isFocused && (
          <div className="border-t border-border/50 px-4 py-2">
            <p className="text-[10px] text-muted-foreground">
              <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">
                Enter
              </kbd>{" "}
              to send ·
              <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">
                Shift+Enter
              </kbd>{" "}
              for new line
            </p>
          </div>
        )}
      </div>

      {/* Chat session indicator */}
      {isChatActive && (
        <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
          <MessageSquare className="h-3 w-3 text-primary" />
          <span>In conversation with Xenboox AI</span>
          <button
            type="button"
            onClick={onExit}
            className="font-medium text-primary transition-colors hover:underline"
          >
            Exit chat
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Executive Briefing Component ─────────────────────────────────────────
// Role-aware: the server tags every insight with an audience
// (decision / operations / oversight) and the client curates what this role
// actually sees. One narrative headline (the single most important item for
// that role right now) + up to 4 attention-first cards, split into
// "Needs attention" vs "On track". Never a flat blast of equal-weight cards.

type BriefingItem = {
  id: string;
  type: string;
  title: string;
  value: string;
  detail: string;
  statusLabel: string;
  href?: string;
  audience?: string[];
};

const statusConfig: Record<
  string,
  { icon: typeof TrendingUp; iconColor: string; iconBg: string }
> = {
  positive: {
    icon: TrendingUp,
    iconColor: "text-balanced-green",
    iconBg: "bg-balanced-green-bg",
  },
  negative: {
    icon: AlertTriangle,
    iconColor: "text-error-clay",
    iconBg: "bg-error-clay-bg",
  },
  warning: {
    icon: Clock,
    iconColor: "text-attention-amber",
    iconBg: "bg-attention-amber-bg",
  },
  neutral: {
    icon: FileText,
    iconColor: "text-primary",
    iconBg: "bg-primary/10",
  },
};

// Maps suggestion IDs from the server to client-side icon + color pairs.
const SUGGESTION_ICONS: Record<
  string,
  { icon: typeof TrendingUp; color: string }
> = {
  close_books: { icon: BookOpen, color: "text-blue-500" },
  cash_position: { icon: Wallet, color: "text-emerald-500" },
  overdue_invoices: { icon: AlertTriangle, color: "text-rose-500" },
  pending_journals: { icon: FileText, color: "text-amber-500" },
  payroll: { icon: Calendar, color: "text-purple-500" },
  forecast: { icon: BarChart3, color: "text-indigo-500" },
};

function isAttention(item: BriefingItem): boolean {
  return item.type === "negative" || item.type === "warning";
}

// One curated insight card — every card links to the module that owns its
// metric (no dead cards). `muted` renders quieter, for "on track" items so
// they never out-shout real problems.
function BriefingCard({
  item,
  muted = false,
}: {
  item: BriefingItem;
  muted?: boolean;
}) {
  const config = statusConfig[item.type] ?? statusConfig.neutral;
  const Icon = config.icon;

  const chipClass = cn(
    "shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold whitespace-nowrap",
    muted
      ? "bg-muted/60 text-muted-foreground"
      : item.type === "negative"
        ? "bg-error-clay-bg text-error-clay"
        : item.type === "warning"
          ? "bg-attention-amber-bg text-attention-amber"
          : item.type === "positive"
            ? "bg-balanced-green-bg text-balanced-green"
            : "bg-muted text-muted-foreground",
  );

  const inner = (
    <>
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
          muted ? "bg-muted/50" : config.iconBg,
        )}
      >
        <Icon
          className={cn(
            "h-5 w-5",
            muted ? "text-muted-foreground" : config.iconColor,
          )}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              "truncate text-xs font-medium",
              muted ? "text-muted-foreground" : "text-foreground",
            )}
          >
            {item.title}
          </p>
          <span className={chipClass}>{item.statusLabel}</span>
        </div>
        <p className="mt-1 truncate tabular-nums text-lg font-bold tracking-tight text-foreground">
          {item.value}
        </p>
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
          {item.detail}
        </p>
      </div>
    </>
  );
  const cardClass = cn(
    "flex items-center gap-3 rounded-xl border p-3.5 transition-all duration-200 hover:shadow-md",
    muted
      ? "border-border/40 bg-card hover:border-border/60"
      : "border-border/60 bg-card hover:border-border/90",
  );
  return item.href ? (
    <Link
      key={item.id}
      href={item.href}
      className={cn(cardClass, "group hover:-translate-y-0.5")}
    >
      {inner}
    </Link>
  ) : (
    <div key={item.id} className={cardClass}>
      {inner}
    </div>
  );
}

// The headline is a statement, not a tile: one number, one context line,
// one destination. It frames the day for this role. A solid surface with a
// status accent bar reads far more deliberate than a color wash.
function BriefingHeadline({ item }: { item: BriefingItem }) {
  const config = statusConfig[item.type] ?? statusConfig.neutral;
  const Icon = config.icon;
  const attention = isAttention(item);
  const inner = (
    <>
      {/* Status accent bar — lives INSIDE the card so overflow-hidden clips
          it to the card's rounded corners (a sibling bar would poke out past
          the corner radius) and the hover translate carries it along. */}
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-0 left-0 z-10 w-1",
          attention ? "bg-attention-amber" : "bg-balanced-green",
        )}
      />
      <div
        className={cn(
          "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
          config.iconBg,
        )}
      >
        <Icon className={cn("h-6 w-6", config.iconColor)} />
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-[10px] font-semibold uppercase tracking-wider",
            attention ? "text-attention-amber" : "text-balanced-green",
          )}
        >
          {attention ? "Needs attention today" : "Business pulse"}
        </p>
        <p className="mt-0.5 text-sm font-medium text-foreground">
          {item.title}
        </p>
        <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-foreground">
          {item.value}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">{item.detail}</p>
      </div>
      {item.href && (
        <span className="hidden shrink-0 items-center gap-1 rounded-lg border border-border/60 bg-background/60 px-3 py-1.5 text-[11px] font-semibold text-foreground transition-colors group-hover:border-primary/40 group-hover:text-primary sm:inline-flex">
          Review
          <ArrowUpRight className="h-3.5 w-3.5" />
        </span>
      )}
    </>
  );
  // Must be a flex row (matching BriefingCard) — the inner layout relies on
  // flex-1 / shrink-0 children. Without `flex` the card renders as an inline
  // link, the icon/content/CTA stack vertically, and the card overflows its
  // relative wrapper so the accent bar and icon hang half into the margin.
  const cardClass = cn(
    "relative flex items-center gap-3 overflow-hidden rounded-xl border bg-card p-4 transition-all duration-200 group sm:p-5",
    attention ? "border-attention-amber/40" : "border-border/60",
  );
  const card = item.href ? (
    <Link
      href={item.href}
      className={cn(cardClass, "hover:-translate-y-0.5 hover:shadow-md")}
    >
      {inner}
    </Link>
  ) : (
    <div className={cardClass}>{inner}</div>
  );
  return card;
}

function BriefingGroupLabel({
  children,
  count,
  tone,
}: {
  children: React.ReactNode;
  count: number;
  tone: "attention" | "ontrack";
}) {
  return (
    <div className="flex items-center gap-2 pt-1">
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          tone === "attention" ? "bg-attention-amber" : "bg-balanced-green",
        )}
      />
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {children}
      </span>
      <span className="rounded-full bg-muted px-1.5 py-px text-[9px] font-medium tabular-nums text-muted-foreground">
        {count}
      </span>
    </div>
  );
}

function ExecutiveBriefing({
  items,
  audience,
}: {
  items: BriefingItem[];
  audience: BriefingAudience;
}) {
  const meta = AUDIENCE_META[audience];
  // Server-tagged items; items without an audience field are shown to all.
  const visible = items.filter(
    (item) => !item.audience || item.audience.includes(audience),
  );
  const attention = visible.filter(isAttention);
  const onTrack = visible.filter((item) => !isAttention(item));
  const priority = [...attention, ...onTrack];
  const headline = priority[0];

  // Attention-first allocation: problems fill the slots before the pulse.
  const remaining = priority.slice(1);
  const attentionCards = remaining.filter(isAttention).slice(0, 3);
  const onTrackCards = remaining
    .filter((item) => !isAttention(item))
    .slice(0, Math.max(0, 4 - attentionCards.length));
  const overflow = priority.length > 5;

  return (
    <section className="space-y-4 rounded-2xl border border-border/50 bg-card/40 p-4 sm:p-5">
      {/* Section header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2.5">
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              {meta.title}
            </h2>
            <span className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-muted/40 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
              <Sparkles className="h-2.5 w-2.5" />
              Curated
            </span>
          </div>
          <p className="text-xs text-muted-foreground">{meta.subtitle}</p>
        </div>
        <Link
          href="/dashboard/chat"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border/60 bg-card px-3 py-1.5 text-[11px] font-semibold text-foreground shadow-sm transition-all hover:border-primary/40 hover:text-primary"
        >
          <Bot className="h-3.5 w-3.5 text-primary" />
          Ask Xenboox
        </Link>
      </div>

      {priority.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border/60 bg-card/50 px-4 py-8 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-balanced-green-bg">
            <CheckCircle2 className="h-6 w-6 text-balanced-green" />
          </div>
          <p className="text-sm font-semibold text-foreground">
            All clear — nothing needs your attention right now.
          </p>
          <p className="max-w-sm text-xs text-muted-foreground">
            {meta.subtitle}
          </p>
        </div>
      ) : (
        <>
          {headline && <BriefingHeadline item={headline} />}

          {(attentionCards.length > 0 || onTrackCards.length > 0) && (
            <div
              className={cn(
                "grid gap-4",
                attentionCards.length > 0 && onTrackCards.length > 0
                  ? "lg:grid-cols-2"
                  : "grid-cols-1",
              )}
            >
              {/* ── Needs Attention ─────────────────────────────────────── */}
              {attentionCards.length > 0 && (
                <div className="relative space-y-3 overflow-hidden rounded-xl border border-border/40 bg-card p-4">
                  <span
                    aria-hidden
                    className="absolute inset-y-0 left-0 w-[3px] bg-attention-amber"
                  />
                  <div className="pl-1">
                    <BriefingGroupLabel
                      tone="attention"
                      count={attention.length}
                    >
                      Needs attention
                    </BriefingGroupLabel>
                    <div className="mt-3 space-y-3">
                      {attentionCards.map((item) => (
                        <BriefingCard key={item.id} item={item} />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── On Track ────────────────────────────────────────────── */}
              {onTrackCards.length > 0 && (
                <div className="relative space-y-3 overflow-hidden rounded-xl border border-border/40 bg-card p-4">
                  <span
                    aria-hidden
                    className="absolute inset-y-0 left-0 w-[3px] bg-balanced-green"
                  />
                  <div className="pl-1">
                    <BriefingGroupLabel tone="ontrack" count={onTrack.length}>
                      On track
                    </BriefingGroupLabel>
                    <div className="mt-3 space-y-3">
                      {onTrackCards.map((item) => (
                        <BriefingCard key={item.id} item={item} muted />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {overflow && (
            <Link
              href="/dashboard/review-queue"
              className="inline-flex items-center gap-1 text-[11px] font-medium text-primary transition-colors hover:text-primary/80"
            >
              View more in the review queue
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          )}
        </>
      )}
    </section>
  );
}

// ─── Business Health Component ────────────────────────────────────────────

// The four fundamentals that define a business: cash, revenue, expenses, and
// runway (months of cash at the current burn rate). A/R, A/P and profit are
// deliberately absent — they are balances, not health signals, and they only
// surface in the executive briefing when they need action.

// Tone → chip classes + sparkline colors, mirrored from the briefing so the
// two sections read as one system.
const HEALTH_TONE_CHIP: Record<string, string> = {
  positive: "bg-balanced-green-bg text-balanced-green",
  warning: "bg-attention-amber-bg text-attention-amber",
  negative: "bg-error-clay-bg text-error-clay",
  neutral: "bg-muted text-muted-foreground",
};

const HEALTH_TONE_SPARK: Record<string, string> = {
  positive: "#10B981",
  warning: "#F59E0B",
  negative: "#EF4444",
  neutral: "#94A3B8",
};

function BusinessHealth({
  data,
  period,
  onPeriodChange,
}: {
  data: {
    cashBalance: number;
    revenue: number;
    expenses: number;
    cashChange: number;
    revenueChange: number;
    expensesChange: number;
    // Cash runway — months of cash at the current burn rate. null means the
    // business is cash-flow positive (sustainable), not a real number.
    runwayMonths?: number | null;
    monthlyBurn?: number;
    // Sparkline data from backend
    cashSparkline?: number[];
    revenueSparkline?: number[];
    expensesSparkline?: number[];
    runwaySparkline?: number[];
  };
  period: HealthPeriod;
  onPeriodChange: (period: HealthPeriod) => void;
}) {
  // Sparklines come from the server (real per-month aggregates from the DB).
  // If the server ever returns nothing, show a flat line rather than fabricate
  // data — never hardcode chart figures on the client.
  const runway = data.runwayMonths ?? null;

  // Per-metric presentation. Runway carries a status chip (Healthy / Caution /
  // Critical / Sustainable / No cash); the fundamentals carry their % change.
  // Direction semantics: cash & revenue up is good; expenses down is good.
  // Shared threshold policy (apps/web/lib/dashboard-runway.ts) — the card and
  // the executive briefing must agree on tone and wording for the same months.
  const runwayTone = runwayToneOf(runway);
  const runwayStatus = runwayStatusLabel(runway);

  const metrics = [
    {
      id: "cash",
      label: "Cash Balance",
      value: data.cashBalance,
      change: data.cashChange,
      tone: data.cashChange >= 0 ? "positive" : "warning",
      sparkline: data.cashSparkline ?? [],
    },
    {
      id: "revenue",
      label: "Revenue",
      value: data.revenue,
      change: data.revenueChange,
      tone: data.revenueChange >= 0 ? "positive" : "negative",
      sparkline: data.revenueSparkline ?? [],
    },
    {
      id: "expenses",
      label: "Expenses",
      value: data.expenses,
      change: data.expensesChange,
      tone: data.expensesChange <= 0 ? "positive" : "negative",
      sparkline: data.expensesSparkline ?? [],
    },
    {
      id: "runway",
      label: "Runway",
      // Runway is a duration, not a currency — format it directly.
      value: runway,
      change: null as number | null,
      status: runwayStatus,
      tone: runwayTone,
      sparkline: data.runwaySparkline ?? [],
    },
  ];

  const periodLabel: Record<HealthPeriod, string> = {
    this_month: "vs last month",
    last_month: "vs previous month",
    this_quarter: "vs last quarter",
  };

  return (
    <section className="space-y-4 rounded-2xl border border-border/50 bg-card/40 p-4 sm:p-5">
      {/* Section header — matches the Executive Briefing panel above */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2.5">
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              Business Health
            </h2>
            <span className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-muted/40 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
              <Activity className="h-2.5 w-2.5" />
              Live
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Cash, revenue, expenses and runway — the fundamentals that define
            your business.
          </p>
        </div>
        <select
          value={period}
          onChange={(e) => onPeriodChange(e.target.value as HealthPeriod)}
          aria-label="Business health period"
          className="shrink-0 cursor-pointer rounded-lg border border-border/60 bg-card px-3 py-1.5 text-[11px] font-semibold text-foreground shadow-sm transition-all hover:border-primary/40 hover:text-primary"
        >
          <option value="this_month">This month</option>
          <option value="last_month">Last month</option>
          <option value="this_quarter">This quarter</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {metrics.map((metric) => {
          const isRunway = metric.id === "runway";
          const toneClass =
            HEALTH_TONE_CHIP[metric.tone] ?? "bg-muted text-muted-foreground";
          const sparkColor = HEALTH_TONE_SPARK[metric.tone] ?? "#94A3B8";
          const valueText = isRunway
            ? (metric.status ?? "—")
            : formatCurrency(metric.value as number);
          const changeText =
            metric.change !== null
              ? `${metric.change >= 0 ? "+" : ""}${metric.change.toFixed(1)}%`
              : null;

          return (
            <div
              key={metric.id}
              className="group min-w-0 rounded-xl border border-border/60 bg-card p-3.5 transition-all duration-200 hover:border-border/90 hover:shadow-md"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-[10px] font-medium text-muted-foreground sm:text-xs">
                  {metric.label}
                </p>
                {!isRunway && changeText && (
                  <span
                    className={cn(
                      "inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-px text-[9px] font-semibold",
                      toneClass,
                    )}
                  >
                    {metric.change! >= 0 ? (
                      <TrendingUp className="h-2.5 w-2.5" />
                    ) : (
                      <TrendingDown className="h-2.5 w-2.5" />
                    )}
                    {changeText}
                  </span>
                )}
              </div>

              <p className="mt-1.5 truncate text-lg font-bold tracking-tight tabular-nums text-foreground sm:text-xl">
                {valueText}
              </p>

              <div className="mt-2 flex items-center justify-between gap-2 sm:mt-3">
                <p className="truncate text-[10px] text-muted-foreground">
                  {isRunway
                    ? runway === 0
                      ? "No cash on hand"
                      : runway === null
                        ? "Cash-flow positive"
                        : (data.monthlyBurn ?? 0) > 0
                          ? `Burn ${formatCurrency(data.monthlyBurn ?? 0)}/mo`
                          : "Coverage on hand"
                    : periodLabel[period]}
                </p>
                <MiniSparkline
                  data={metric.sparkline}
                  color={sparkColor}
                  className="hidden shrink-0 sm:block"
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─── Collapsible Section Component ─────────────────────────────────────────

function CollapsibleSection({
  title,
  children,
  defaultOpen = true,
  icon,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  icon?: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between gap-2 rounded-lg bg-muted/60 px-3 py-2.5 text-left transition-colors hover:bg-muted/80"
      >
        <div className="flex items-center gap-2.5">
          {icon && (
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10">
              {icon}
            </span>
          )}
          <span className="text-sm font-semibold text-foreground">{title}</span>
        </div>
        <ChevronRight
          className={cn(
            "h-5 w-5 text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-90",
          )}
        />
      </button>
      <div
        className={cn(
          "overflow-hidden transition-all duration-300 ease-in-out",
          isOpen ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0",
        )}
      >
        <div className="pt-2">{children}</div>
      </div>
    </div>
  );
}

// Maps a suggested action to the module page that resolves it — every
// suggested action leads somewhere real.
function actionHref(action: string): string | null {
  const lower = action.toLowerCase();
  if (lower.includes("overdue") || lower.includes("invoice")) {
    return "/dashboard/bills";
  }
  if (lower.includes("journal")) {
    return "/dashboard/journal";
  }
  if (lower.includes("flagged") || lower.includes("review")) {
    return "/dashboard/review-queue";
  }
  if (lower.includes("document")) {
    return "/dashboard/documents";
  }
  if (lower.includes("payroll")) {
    return "/dashboard/payroll";
  }
  return null;
}

// ─── Dashboard Right Sidebar ──────────────────────────────────────────────
// Rules:
//  • Sections with nothing to show are collapsed by default (header stays
//    visible so the user can open them).
//  • Lists are capped at 5 — a "View all (N)" link appears when more exist.
//  • Every deadline row links to the module that owns it.
//  • Documents the current user hasn't opened yet carry a "New" badge.

type DeadlineItem = {
  id: string;
  label: string;
  date: string;
  urgency: string;
  href?: string;
};

type RecentDoc = {
  id: string;
  name: string;
  type: string;
  createdAt: string | null;
  viewed?: boolean;
  viewedAt?: string | null;
};

function ViewAllLink({ href, count }: { href: string; count: number }) {
  return (
    <Link
      href={href}
      className="mt-1 flex items-center justify-center gap-1 rounded-lg border border-dashed border-border/60 py-1.5 text-[10px] font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
    >
      View all ({count})
      <ArrowUpRight className="h-3 w-3" />
    </Link>
  );
}

function DashboardRightSidebar({
  deadlines,
  recentDocuments,
  recentConversations,
  suggestedActions,
  recentDocumentsTotal,
  recentConversationsTotal,
  deadlinesTotal,
  suggestedActionsTotal,
  onNavigate,
  onContinueConversation,
  onMarkDocumentViewed,
}: {
  deadlines: DeadlineItem[];
  recentDocuments: RecentDoc[];
  recentConversations: Array<{
    id: string;
    title: string | null;
    summary: string | null;
    lastMessageAt: string | null;
  }>;
  suggestedActions: string[];
  recentDocumentsTotal: number;
  recentConversationsTotal: number;
  deadlinesTotal: number;
  suggestedActionsTotal: number;
  onNavigate?: (href: string) => void;
  onContinueConversation?: (conversation: {
    id: string;
    title: string | null;
  }) => void;
  onMarkDocumentViewed?: (documentId: string) => void;
}) {
  function formatDocTime(date: string | null): string {
    if (!date) return "";
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes} min ago`;
    if (hours < 24) return `${hours} hr ago`;
    return `${Math.floor(hours / 24)} days ago`;
  }

  function getDocColor(type: string): string {
    const colors: Record<string, string> = {
      bank_statement: "text-red-500",
      invoice: "text-primary",
      payroll_report: "text-emerald-500",
      tax_return: "text-red-500",
    };
    return colors[type] ?? "text-primary";
  }

  return (
    <div className="space-y-0 p-4">
      {/* Upcoming & Deadlines */}
      <CollapsibleSection
        title="Upcoming & Deadlines"
        icon={<Calendar className="h-4 w-4 text-primary" />}
        defaultOpen={deadlines.length > 0}
      >
        {deadlines.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-2">
            Nothing due right now
          </p>
        ) : (
          <div className="space-y-1">
            {deadlines.map((d) => (
              <div key={d.id} className="flex items-center gap-3 py-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Calendar className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  {d.href ? (
                    <Link
                      href={d.href}
                      className="block truncate hover:text-primary transition-colors"
                    >
                      <span className="block text-xs font-medium text-foreground truncate">
                        {d.label}
                      </span>
                      <span className="block text-[10px] text-muted-foreground">
                        {d.date}
                      </span>
                    </Link>
                  ) : (
                    <>
                      <p className="text-xs font-medium text-foreground truncate">
                        {d.label}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {d.date}
                      </p>
                    </>
                  )}
                </div>
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[9px] font-medium whitespace-nowrap",
                    d.urgency === "upcoming"
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-blue-50 text-blue-700 border-blue-200",
                  )}
                >
                  {d.urgency === "upcoming" ? "Upcoming" : "Scheduled"}
                </span>
              </div>
            ))}
          </div>
        )}
        {deadlinesTotal > 5 && (
          <ViewAllLink
            href="/dashboard/tax-compliance"
            count={deadlinesTotal}
          />
        )}
      </CollapsibleSection>

      {/* Recent Documents */}
      <CollapsibleSection
        title="Recent Documents"
        icon={<FileText className="h-4 w-4 text-blue-500" />}
        defaultOpen={recentDocuments.length > 0}
      >
        {recentDocuments.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-2">
            No documents yet
          </p>
        ) : (
          <div className="space-y-0.5">
            {recentDocuments.map((doc) => (
              <button
                key={doc.id}
                type="button"
                onClick={() => {
                  // Clicking a recent document counts as engaging with it —
                  // the "New" badge clears for this user. (Semantic note: this
                  // fires on the dashboard click that takes the user to the
                  // documents module — not on an in-app document viewer, since
                  // the documents module has none yet. Reuse the same mutation
                  // from a viewer later if one is added.)
                  if (!doc.viewed) onMarkDocumentViewed?.(doc.id);
                  onNavigate?.("/dashboard/documents");
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-accent/50 cursor-pointer transition-colors text-left"
              >
                <FileText
                  className={cn("h-4 w-4 shrink-0", getDocColor(doc.type))}
                />
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      "truncate",
                      doc.viewed
                        ? "text-xs text-foreground"
                        : "text-xs font-semibold text-foreground",
                    )}
                  >
                    {doc.name}
                  </p>
                  {!doc.viewed && (
                    <span className="mt-0.5 inline-flex items-center rounded-full bg-primary/10 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-primary">
                      New
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                  {formatDocTime(doc.createdAt)}
                </span>
              </button>
            ))}
          </div>
        )}
        {recentDocumentsTotal > 5 && (
          <ViewAllLink
            href="/dashboard/documents"
            count={recentDocumentsTotal}
          />
        )}
      </CollapsibleSection>

      {/* Recent Conversations */}
      <CollapsibleSection
        title="Recent Conversations"
        icon={<MessageSquare className="h-4 w-4 text-purple-500" />}
        defaultOpen={recentConversations.length > 0}
      >
        {recentConversations.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-2">
            No conversations yet
          </p>
        ) : (
          <div className="space-y-0.5">
            {recentConversations.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => onContinueConversation?.(c)}
                title="Continue this conversation"
                className="group flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-accent/50 cursor-pointer transition-colors"
              >
                <MessageSquare className="h-3.5 w-3.5 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground truncate">
                    {c.title ?? "Untitled conversation"}
                  </p>
                  {c.summary && (
                    <p className="text-[10px] text-muted-foreground/70 truncate mt-0.5">
                      {c.summary}
                    </p>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap group-hover:hidden">
                  {formatDocTime(c.lastMessageAt)}
                </span>
                <span className="hidden group-hover:inline-flex items-center gap-1 text-[10px] font-medium text-primary whitespace-nowrap">
                  Continue
                  <ChevronRight className="h-3 w-3" />
                </span>
              </button>
            ))}
          </div>
        )}
        {recentConversationsTotal > 5 && (
          <ViewAllLink
            href="/dashboard/chat"
            count={recentConversationsTotal}
          />
        )}
      </CollapsibleSection>

      {/* Suggested Actions */}
      <CollapsibleSection
        title="Suggested Actions"
        icon={<Sparkles className="h-4 w-4 text-amber-500" />}
        defaultOpen={suggestedActions.length > 0}
      >
        {suggestedActions.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-2">
            All caught up!
          </p>
        ) : (
          <div className="space-y-0.5">
            {suggestedActions.slice(0, 5).map((action, i) => {
              const href = actionHref(action);
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => href && onNavigate?.(href)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-accent/50 text-left transition-colors group"
                >
                  <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="flex-1 text-xs text-foreground truncate">
                    {action}
                  </span>
                  <ChevronRight className="h-3 w-3 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors" />
                </button>
              );
            })}
          </div>
        )}
        {suggestedActionsTotal > 5 && (
          <ViewAllLink
            href="/dashboard/review-queue"
            count={suggestedActionsTotal}
          />
        )}
      </CollapsibleSection>
    </div>
  );
}

// ─── Main Dashboard Page ──────────────────────────────────────────────────

export default function DashboardPage() {
  const { entityId, entityRole } = useEntity();
  const { data: session } = useSession();
  const router = useRouter();
  const firstName = session?.user?.name?.split(" ")[0];

  // Business Health period — drives the server-side date ranges for the
  // revenue / expenses / profit KPIs (see dashboard router periodConfig).
  const [healthPeriod, setHealthPeriod] = useState<HealthPeriod>("this_month");

  // Which briefing audience this user sees (decision / operations / oversight)
  const audience = roleToAudience(entityRole);

  // Inline AI chat session — activates a full chat screen when messaging.
  const chat = useDashboardChat({ entityId });

  const markDocViewed = trpc.document.markDocumentViewed.useMutation();

  // Fetch dashboard data with optimized caching. The period input changes
  // the query key, so switching the Business Health selector refetches with
  // the right date ranges.
  const { data: dashboardData, isLoading } =
    trpc.dashboard.getDashboardData.useQuery(
      { period: healthPeriod },
      {
        enabled: !!entityId,
        ...dashboardQueryOptions,
        // No refetchInterval - use staleTime from dashboardQueryOptions (2 minutes)
        // This prevents unnecessary re-renders and page refreshes
      },
    );

  // Dynamic AI chat suggestions based on entity state
  const { data: suggestionsData } =
    trpc.dashboard.getDashboardSuggestions.useQuery(undefined, {
      enabled: !!entityId,
      ...suggestionsQueryOptions,
    });

  // Map server suggestion IDs to client-side icon + color pairs
  const chatSuggestions = (suggestionsData ?? []).map((s) => {
    const meta = SUGGESTION_ICONS[s.id] ?? {
      icon: Sparkles,
      color: "text-primary",
    };
    return { ...s, icon: meta.icon, color: meta.color };
  });

  // Loading state - show skeleton immediately for perceived performance
  if (isLoading) {
    return (
      <div className="flex h-full">
        <div className="flex-1 overflow-y-auto p-6">
          <DashboardSkeleton />
        </div>
        <div className="w-80 border-l bg-card hidden lg:block p-6">
          <div className="space-y-4">
            <div className="h-8 w-32 bg-muted rounded animate-pulse" />
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-16 bg-muted rounded-lg animate-pulse"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Empty state - no data yet. The briefing always renders its core cards,
  // so gate on actual business activity, not card count.
  const bh = dashboardData?.businessHealth;
  const hasData =
    dashboardData &&
    ((bh &&
      (bh.cashBalance > 0 ||
        bh.revenue > 0 ||
        bh.expenses > 0 ||
        bh.arOutstanding > 0 ||
        bh.apOutstanding > 0)) ||
      dashboardData.agentActivity.length > 0 ||
      dashboardData.recentDocuments.length > 0);

  if (!hasData) {
    const emptyState = getPageEmptyState("dashboard");
    return (
      <div className="flex h-full">
        <div className="flex-1 overflow-y-auto">
          <PageEmptyState
            icon={emptyState.icon}
            iconColor={emptyState.iconColor}
            iconBg={emptyState.iconBg}
            title={emptyState.title}
            description={emptyState.description}
            actions={emptyState.actions}
            tips={emptyState.tips}
          />
        </div>
        <div className="w-80 border-l bg-card hidden lg:block overflow-y-auto">
          <DashboardRightSidebar
            deadlines={[]}
            recentDocuments={[]}
            recentConversations={[]}
            suggestedActions={[]}
            recentDocumentsTotal={0}
            recentConversationsTotal={0}
            deadlinesTotal={0}
            suggestedActionsTotal={0}
          />
        </div>
      </div>
    );
  }

  const handleContinueConversation = (conversation: {
    id: string;
    title: string | null;
  }) => {
    void chat.loadConversation(conversation.id, conversation.title);
  };

  const handleAskAI = (text: string) => {
    chat.sendMessage(`Help me understand this: "${text}"`);
  };

  const handleExplain = (text: string) => {
    chat.sendMessage(`Explain this in simple terms: "${text}"`);
  };

  const handleCorrect = (text: string) => {
    chat.sendMessage(`Review and correct this: "${text}"`);
  };

  return (
    <div className="flex h-full">
      <TextSelectionMenu
        onAskAI={handleAskAI}
        onExplain={handleExplain}
        onCorrect={handleCorrect}
      />
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div
          className={cn(
            "flex-1",
            chat.isChatActive ? "overflow-hidden" : "overflow-y-auto",
          )}
        >
          {chat.isChatActive ? (
            <DashboardChatScreen
              messages={chat.messages}
              streamedContent={chat.streamedContent}
              isStreaming={chat.isStreaming}
              agentActivities={chat.agentActivities}
              delegations={chat.delegations}
              documents={chat.documents}
              approvals={chat.approvals}
              conversationId={chat.conversationId}
              title={chat.conversationTitle}
              onExit={chat.exitChat}
              onNewChat={chat.newChat}
            />
          ) : (
            <div className="space-y-6 px-6 pt-6">
              {/* Row 1: Greeting */}
              <AIGreeting firstName={firstName} />

              {/* Row 2: Role-aware Executive Briefing */}
              <ExecutiveBriefing
                items={dashboardData?.briefingItems ?? []}
                audience={audience}
              />

              {/* Row 3: Business Health KPI Cards */}
              <BusinessHealth
                data={
                  dashboardData?.businessHealth ?? {
                    cashBalance: 0,
                    revenue: 0,
                    expenses: 0,
                    cashChange: 0,
                    revenueChange: 0,
                    expensesChange: 0,
                    runwayMonths: null,
                    monthlyBurn: 0,
                  }
                }
                period={healthPeriod}
                onPeriodChange={setHealthPeriod}
              />
            </div>
          )}
        </div>

        {/* Pinned AI Command Bar — tighter padding while in a chat so the
            composer doesn't crowd the conversation view; reduced top padding
            so suggestions sit close to the content above */}
        <div
          className={cn(
            "border-t flex-shrink-0",
            chat.isChatActive
              ? "border-primary/20 bg-background px-4 py-2"
              : "border-border/50 bg-background/80 backdrop-blur-sm px-4 pb-3 pt-2",
          )}
        >
          <AIChatInput
            onSubmit={chat.sendMessage}
            isResponding={chat.isStreaming}
            isChatActive={chat.isChatActive}
            onExit={chat.exitChat}
            suggestions={chatSuggestions}
          />
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="w-80 border-l bg-card hidden lg:block overflow-y-auto">
        <DashboardRightSidebar
          deadlines={dashboardData?.deadlines ?? []}
          recentDocuments={dashboardData?.recentDocuments ?? []}
          recentConversations={dashboardData?.recentConversations ?? []}
          suggestedActions={dashboardData?.suggestedActions ?? []}
          recentDocumentsTotal={dashboardData?.recentDocumentsTotal ?? 0}
          recentConversationsTotal={
            dashboardData?.recentConversationsTotal ?? 0
          }
          deadlinesTotal={dashboardData?.deadlinesTotal ?? 0}
          suggestedActionsTotal={dashboardData?.suggestedActionsTotal ?? 0}
          onNavigate={(href) => router.push(href)}
          onContinueConversation={handleContinueConversation}
          onMarkDocumentViewed={(documentId) => {
            // Fire-and-forget: a failed view record must never block the
            // navigation or spam the console on an already-rendered page.
            void markDocViewed
              .mutateAsync({ documentId })
              .catch(() => undefined);
          }}
        />
      </div>
    </div>
  );
}
