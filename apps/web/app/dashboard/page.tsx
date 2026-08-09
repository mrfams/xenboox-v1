"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
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
} from "lucide-react";

import { useEntity } from "@/lib/entity-context";
import { trpc } from "@/lib/trpc/client";
import { cn, formatCurrency } from "@/lib/utils";
import { DashboardSkeleton } from "@/components/shared/skeletons";
import { dashboardQueryOptions } from "@/lib/trpc/query-options";
import { Button } from "@/components/ui";
import { TextSelectionMenu } from "@/components/dashboard/text-selection-menu";
import { DashboardChatScreen } from "@/components/dashboard/dashboard-chat-screen";
import { useDashboardChat } from "@/lib/hooks/use-dashboard-chat";
import {
  PageEmptyState,
  getPageEmptyState,
} from "@/components/shared/page-empty-state";

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

function AIGreeting({ firstName }: { firstName?: string }) {
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-foreground">
          {greeting}, {firstName ?? "there"}!{" "}
          <span className="inline-block motion-safe:animate-[wave_2s_ease-in-out_infinite] origin-[70%_70%]">
            👋
          </span>
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Here&apos;s what&apos;s happening with your business today.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-medium text-emerald-700">
            All systems operational
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── AI Chat Input Component (Controlled) ───────────────────────────────────

function AIChatInput({
  onSubmit,
  isResponding,
  isChatActive,
  onExit,
}: {
  onSubmit: (value: string) => void;
  isResponding: boolean;
  isChatActive: boolean;
  onExit: () => void;
}) {
  const [inputValue, setInputValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = (value?: string) => {
    const trimmed = (value ?? inputValue).trim();
    if (!trimmed || isResponding) return;
    onSubmit(trimmed);
    setInputValue("");
  };

  const suggestions = [
    {
      label: "Close July books",
      icon: BookOpen,
      color: "text-blue-500",
      prompt: "Close the books for July 2026",
    },
    {
      label: "Explain cash position",
      icon: Wallet,
      color: "text-emerald-500",
      prompt: "Explain my current cash position",
    },
    {
      label: "Create payroll",
      icon: FileText,
      color: "text-purple-500",
      prompt: "Create a new payroll run for this month",
    },
    {
      label: "Find duplicate expenses",
      icon: Search,
      color: "text-amber-500",
      prompt: "Scan for duplicate expenses this month",
    },
    {
      label: "Forecast next month",
      icon: BarChart3,
      color: "text-indigo-500",
      prompt: "Forecast cash flow for next month",
    },
    {
      label: "Show unpaid invoices",
      icon: Calendar,
      color: "text-rose-500",
      prompt: "Show all unpaid invoices",
    },
  ];

  return (
    <div className="mx-auto w-full max-w-3xl space-y-3">
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
                "inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-border/50 bg-card/80 px-2.5 sm:px-3 py-1.5",
                "text-[10px] sm:text-xs text-muted-foreground transition-all duration-200",
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
          className="inline-flex shrink-0 items-center justify-center h-7 w-7 rounded-xl border border-border/50 bg-card/80 text-muted-foreground transition-all hover:bg-accent"
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
        <div className="relative flex items-center gap-3 px-4 py-3.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Bot className="h-4 w-4" />
          </div>
          <input
            type="text"
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
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-none"
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

function ExecutiveBriefing({
  items,
}: {
  items: Array<{
    id: string;
    type: string;
    title: string;
    value: string;
    detail: string;
    statusLabel: string;
  }>;
}) {
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

  const statusColors: Record<string, string> = {
    positive: "text-balanced-green",
    warning: "text-attention-amber",
    negative: "text-error-clay",
    neutral: "text-muted-foreground",
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-foreground">
            Executive Briefing
          </h2>
          <span className="flex items-center gap-1 rounded-full bg-gradient-to-r from-primary/10 to-purple-500/10 px-2.5 py-0.5 text-[10px] font-medium text-primary">
            <Sparkles className="h-3 w-3" />
            AI generated
          </span>
        </div>
        <Link
          href="/dashboard/chat"
          className="flex items-center gap-1 text-[11px] font-medium text-primary hover:text-primary/80 transition-colors"
        >
          View all insights
          <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Desktop: horizontal scroll, Mobile/Tablet: grid layout */}
      <div className="hidden md:scrollbar-hide md:flex md:items-center md:gap-3 md:overflow-x-auto md:pb-1">
        {items.map((item) => {
          const config = statusConfig[item.type] ?? statusConfig.neutral;
          const Icon = config.icon;
          return (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-xl border border-border/50 bg-card p-3 transition-all duration-200 hover:shadow-md hover:border-border/80 min-w-[200px]"
            >
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                  config.iconBg,
                )}
              >
                <Icon className={cn("h-5 w-5", config.iconColor)} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">
                  {item.title}
                </p>
                <p className="text-sm font-bold tabular-nums text-foreground">
                  {item.value}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {item.detail}
                </p>
              </div>
              <span
                className={cn(
                  "text-[10px] font-medium whitespace-nowrap",
                  statusColors[item.type] ?? "text-muted-foreground",
                )}
              >
                {item.statusLabel}
              </span>
            </div>
          );
        })}
      </div>
      {/* Mobile/Tablet: stacked grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:hidden">
        {items.map((item) => {
          const config = statusConfig[item.type] ?? statusConfig.neutral;
          const Icon = config.icon;
          return (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-xl border border-border/50 bg-card p-3 transition-all duration-200 hover:shadow-md hover:border-border/80"
            >
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                  config.iconBg,
                )}
              >
                <Icon className={cn("h-5 w-5", config.iconColor)} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">
                  {item.title}
                </p>
                <p className="text-sm font-bold tabular-nums text-foreground">
                  {item.value}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {item.detail}
                </p>
              </div>
              <span
                className={cn(
                  "text-[10px] font-medium whitespace-nowrap",
                  statusColors[item.type] ?? "text-muted-foreground",
                )}
              >
                {item.statusLabel}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Business Health Component ────────────────────────────────────────────

function BusinessHealth({
  data,
}: {
  data: {
    cashBalance: number;
    revenue: number;
    expenses: number;
    profit: number;
    arOutstanding: number;
    apOutstanding: number;
    cashChange: number;
    revenueChange: number;
    expensesChange: number;
    profitChange: number;
    arChange: number;
    apChange: number;
    // Sparkline data from backend
    cashSparkline?: number[];
    revenueSparkline?: number[];
    expensesSparkline?: number[];
    profitSparkline?: number[];
    arSparkline?: number[];
    apSparkline?: number[];
  };
}) {
  const metrics = [
    {
      id: "cash",
      label: "Cash Balance",
      value: data.cashBalance,
      change: data.cashChange,
      sparkline: data.cashSparkline ?? [
        data.cashBalance * 0.85,
        data.cashBalance,
      ],
    },
    {
      id: "revenue",
      label: "Revenue",
      value: data.revenue,
      change: data.revenueChange,
      sparkline: data.revenueSparkline ?? [data.revenue * 0.9, data.revenue],
    },
    {
      id: "expenses",
      label: "Expenses",
      value: data.expenses,
      change: data.expensesChange,
      sparkline: data.expensesSparkline ?? [
        data.expenses * 1.05,
        data.expenses,
      ],
    },
    {
      id: "profit",
      label: "Profit",
      value: data.profit,
      change: data.profitChange,
      sparkline: data.profitSparkline ?? [data.profit * 0.9, data.profit],
    },
    {
      id: "ar",
      label: "A/R",
      value: data.arOutstanding,
      change: data.arChange,
      sparkline: data.arSparkline ?? [
        data.arOutstanding * 0.95,
        data.arOutstanding,
      ],
    },
    {
      id: "ap",
      label: "A/P",
      value: data.apOutstanding,
      change: data.apChange,
      sparkline: data.apSparkline ?? [
        data.apOutstanding * 1.05,
        data.apOutstanding,
      ],
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-foreground">
            Business Health
          </h2>
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Activity className="h-3 w-3" />
            Live data
          </span>
        </div>
        <select className="text-[11px] font-medium text-muted-foreground bg-transparent border border-border/50 rounded-lg px-2 py-1 outline-none">
          <option>This month</option>
          <option>Last month</option>
          <option>This quarter</option>
        </select>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        {metrics.map((metric) => {
          const isPositive = metric.change >= 0;
          const sparkColor = isPositive ? "#10B981" : "#EF4444";

          return (
            <div
              key={metric.id}
              className="rounded-xl border border-border/50 bg-card p-3 sm:p-4 transition-all duration-200 hover:shadow-md min-w-0"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] sm:text-xs font-medium text-muted-foreground truncate">
                  {metric.label}
                </p>
              </div>

              <p className="text-base sm:text-xl font-bold tracking-tight tabular-nums text-foreground truncate">
                {formatCurrency(metric.value)}
              </p>

              <div className="flex items-center justify-between mt-2 sm:mt-3 gap-2">
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 text-[10px] sm:text-xs font-semibold",
                    isPositive ? "text-balanced-green" : "text-error-clay",
                  )}
                >
                  {isPositive ? (
                    <TrendingUp className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  ) : (
                    <TrendingDown className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  )}
                  <span className="hidden sm:inline">
                    {isPositive ? "+" : ""}
                    {metric.change.toFixed(1)}%
                  </span>
                  <span className="sm:hidden">
                    {isPositive ? "+" : ""}
                    {metric.change.toFixed(0)}%
                  </span>
                </span>

                <MiniSparkline
                  data={metric.sparkline}
                  color={sparkColor}
                  className="hidden sm:block"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
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

// ─── Dashboard Right Sidebar ──────────────────────────────────────────────

function DashboardRightSidebar({
  deadlines,
  recentDocuments,
  recentConversations,
  suggestedActions,
}: {
  deadlines: Array<{
    id: string;
    label: string;
    date: string;
    urgency: string;
  }>;
  recentDocuments: Array<{
    id: string;
    name: string;
    type: string;
    createdAt: string | null;
  }>;
  recentConversations: Array<{
    id: string;
    title: string | null;
    lastMessageAt: string | null;
  }>;
  suggestedActions: string[];
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
        defaultOpen={true}
      >
        <div className="space-y-1">
          {deadlines.map((d) => (
            <div key={d.id} className="flex items-center gap-3 py-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Calendar className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">
                  {d.label}
                </p>
                <p className="text-[10px] text-muted-foreground">{d.date}</p>
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
      </CollapsibleSection>

      {/* Recent Documents */}
      <CollapsibleSection
        title="Recent Documents"
        icon={<FileText className="h-4 w-4 text-blue-500" />}
        defaultOpen={true}
      >
        <div className="space-y-0.5">
          {recentDocuments.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-2">
              No documents yet
            </p>
          ) : (
            recentDocuments.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-accent/50 cursor-pointer transition-colors"
              >
                <FileText
                  className={cn("h-4 w-4 shrink-0", getDocColor(doc.type))}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground truncate">{doc.name}</p>
                </div>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                  {formatDocTime(doc.createdAt)}
                </span>
              </div>
            ))
          )}
        </div>
      </CollapsibleSection>

      {/* Recent Conversations */}
      <CollapsibleSection
        title="Recent Conversations"
        icon={<MessageSquare className="h-4 w-4 text-purple-500" />}
        defaultOpen={true}
      >
        <div className="space-y-0.5">
          {recentConversations.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-2">
              No conversations yet
            </p>
          ) : (
            recentConversations.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-accent/50 cursor-pointer transition-colors"
              >
                <MessageSquare className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground truncate">
                    {c.title ?? "Untitled conversation"}
                  </p>
                </div>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                  {formatDocTime(c.lastMessageAt)}
                </span>
              </div>
            ))
          )}
        </div>
      </CollapsibleSection>

      {/* Suggested Actions */}
      <CollapsibleSection
        title="Suggested Actions"
        icon={<Sparkles className="h-4 w-4 text-amber-500" />}
        defaultOpen={true}
      >
        <div className="space-y-0.5">
          {suggestedActions.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-2">
              All caught up!
            </p>
          ) : (
            suggestedActions.map((action, i) => (
              <button
                key={i}
                type="button"
                className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-accent/50 text-left transition-colors group"
              >
                <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="flex-1 text-xs text-foreground truncate">
                  {action}
                </span>
                <ChevronRight className="h-3 w-3 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors" />
              </button>
            ))
          )}
        </div>
      </CollapsibleSection>
    </div>
  );
}

// ─── Main Dashboard Page ──────────────────────────────────────────────────

export default function DashboardPage() {
  const { entityId } = useEntity();
  const { data: session } = useSession();
  const firstName = session?.user?.name?.split(" ")[0];

  // Inline AI chat session — activates a full chat screen when messaging.
  const chat = useDashboardChat({ entityId });

  // Fetch dashboard data with optimized caching
  const { data: dashboardData, isLoading } =
    trpc.dashboard.getDashboardData.useQuery(undefined, {
      enabled: !!entityId,
      ...dashboardQueryOptions,
      // No refetchInterval - use staleTime from dashboardQueryOptions (2 minutes)
      // This prevents unnecessary re-renders and page refreshes
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

  // Empty state - no data yet
  const hasData =
    dashboardData &&
    (dashboardData.briefingItems.length > 0 ||
      dashboardData.businessHealth.cashBalance > 0 ||
      dashboardData.agentActivity.length > 0);

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
          />
        </div>
      </div>
    );
  }

  const handleAskAI = (text: string) => {
    console.log("Ask AI about:", text);
  };

  const handleExplain = (text: string) => {
    console.log("Explain:", text);
  };

  const handleCorrect = (text: string) => {
    console.log("Correct:", text);
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
              onExit={chat.exitChat}
              onNewChat={chat.newChat}
            />
          ) : (
            <div className="space-y-6 px-6 pt-6">
              {/* Row 1: Greeting */}
              <AIGreeting firstName={firstName} />

              {/* Row 2: Executive Briefing */}
              <ExecutiveBriefing items={dashboardData?.briefingItems ?? []} />

              {/* Row 3: Business Health KPI Cards */}
              <BusinessHealth
                data={
                  dashboardData?.businessHealth ?? {
                    cashBalance: 0,
                    revenue: 0,
                    expenses: 0,
                    profit: 0,
                    arOutstanding: 0,
                    apOutstanding: 0,
                    cashChange: 0,
                    revenueChange: 0,
                    expensesChange: 0,
                    profitChange: 0,
                    arChange: 0,
                    apChange: 0,
                  }
                }
              />
            </div>
          )}
        </div>

        {/* Pinned AI Command Bar */}
        <div
          className={cn(
            "border-t p-4 flex-shrink-0",
            chat.isChatActive
              ? "border-primary/20 bg-background"
              : "border-border/50 bg-background/80 backdrop-blur-sm",
          )}
        >
          <AIChatInput
            onSubmit={chat.sendMessage}
            isResponding={chat.isStreaming}
            isChatActive={chat.isChatActive}
            onExit={chat.exitChat}
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
        />
      </div>
    </div>
  );
}
