"use client";

import { useState, useCallback, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useEntity } from "@/lib/entity-context";
import { trpc } from "@/lib/trpc/client";
import { cn, formatCurrency } from "@/lib/utils";
import { DashboardSkeleton } from "@/components/shared/skeletons";
import { dashboardQueryOptions } from "@/lib/trpc/query-options";
import { Button } from "@/components/ui";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  FileText,
  AlertTriangle,
  Bot,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Search,
  Wallet,
  BarChart3,
  BookOpen,
  Shield,
  MessageSquare,
  Activity,
  ArrowUpRight,
} from "lucide-react";
import { TextSelectionMenu } from "@/components/dashboard/text-selection-menu";

// ─── Mini Sparkline Component ─────────────────────────────────────────────

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const width = 80;
  const height = 24;
  const padding = 2;

  const points = data
    .map((v, i) => {
      const x = padding + (i / (data.length - 1)) * (width - padding * 2);
      const y = height - padding - ((v - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");

  const areaPoints = `${padding},${height - padding} ${points} ${width - padding},${height - padding}`;

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={`sparkline-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#sparkline-${color})`} />
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

// ─── AI Chat Input Component ──────────────────────────────────────────────

function AIChatInput() {
  const router = useRouter();
  const [inputValue, setInputValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const sendMessage = trpc.aiWorkspace.sendMessage.useMutation({
    onSuccess: (data) => {
      router.push(`/dashboard/chat?c=${data.conversationId}`);
    },
  });

  const handleSubmit = (value: string) => {
    const trimmed = value.trim();
    if (trimmed && !sendMessage.isPending) {
      sendMessage.mutate({ message: trimmed });
    }
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
      <div className="scrollbar-hide flex items-center gap-2 overflow-x-auto py-0.5">
        {suggestions.map((suggestion) => {
          const Icon = suggestion.icon;
          return (
            <button
              key={suggestion.label}
              type="button"
              onClick={() => handleSubmit(suggestion.prompt)}
              disabled={sendMessage.isPending}
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
                handleSubmit(inputValue);
              }
            }}
            placeholder="Ask anything about your accounting..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-none"
          />
          <Button
            type="button"
            size="icon"
            onClick={() => handleSubmit(inputValue)}
            disabled={!inputValue.trim() || sendMessage.isPending}
            className={cn(
              "h-10 w-10 rounded-xl p-0 transition-all shrink-0",
              inputValue.trim()
                ? "bg-primary hover:bg-primary/90 text-white shadow-sm"
                : "bg-primary text-white",
            )}
          >
            {sendMessage.isPending ? (
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
    revenueChange: number;
    expensesChange: number;
    profitChange: number;
    arChange: number;
    apChange: number;
  };
}) {
  const metrics = [
    {
      id: "cash",
      label: "Cash Balance",
      value: data.cashBalance,
      change: 12.5,
      sparkline: [
        800000,
        900000,
        850000,
        1000000,
        1100000,
        1050000,
        1200000,
        data.cashBalance || 1234567,
      ],
    },
    {
      id: "revenue",
      label: "Revenue",
      value: data.revenue,
      change: data.revenueChange,
      sparkline: [
        1800000,
        1900000,
        2000000,
        2100000,
        2000000,
        2200000,
        2300000,
        data.revenue || 2345890,
      ],
    },
    {
      id: "expenses",
      label: "Expenses",
      value: data.expenses,
      change: data.expensesChange,
      sparkline: [
        1400000,
        1350000,
        1300000,
        1320000,
        1380000,
        1360000,
        1350000,
        data.expenses || 1345221,
      ],
    },
    {
      id: "profit",
      label: "Profit",
      value: data.profit,
      change: data.profitChange,
      sparkline: [
        600000,
        700000,
        650000,
        800000,
        850000,
        900000,
        950000,
        data.profit || 1000669,
      ],
    },
    {
      id: "ar",
      label: "A/R (Outstanding)",
      value: data.arOutstanding,
      change: data.arChange,
      sparkline: [
        200000,
        210000,
        220000,
        230000,
        225000,
        235000,
        230000,
        data.arOutstanding || 234550,
      ],
    },
    {
      id: "ap",
      label: "A/P (Outstanding)",
      value: data.apOutstanding,
      change: data.apChange,
      sparkline: [
        360000,
        355000,
        350000,
        345000,
        350000,
        348000,
        346000,
        data.apOutstanding || 345667,
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {metrics.map((metric) => {
          const isPositive = metric.change >= 0;
          const sparkColor = isPositive ? "#10B981" : "#EF4444";

          return (
            <div
              key={metric.id}
              className="rounded-xl border border-border/50 bg-card p-4 transition-all duration-200 hover:shadow-md"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground">
                  {metric.label}
                </p>
                <button
                  type="button"
                  className="h-5 w-5 rounded-full flex items-center justify-center text-muted-foreground/30 hover:text-foreground hover:bg-muted transition-all"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <circle
                      cx="7"
                      cy="7"
                      r="6"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                    <path
                      d="M7 6v4M7 4.5v0"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>

              <p className="text-xl font-bold tracking-tight tabular-nums text-foreground">
                {formatCurrency(metric.value)}
              </p>

              <div className="flex items-center justify-between mt-3">
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 text-xs font-semibold",
                    isPositive ? "text-balanced-green" : "text-error-clay",
                  )}
                >
                  {isPositive ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {isPositive ? "+" : ""}
                  {metric.change.toFixed(1)}%
                </span>

                <MiniSparkline data={metric.sparkline} color={sparkColor} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── AI Activity Feed Component ───────────────────────────────────────────

function AgentActivityFeed({
  activities,
}: {
  activities: Array<{
    id: string;
    action: string;
    entityType: string;
    createdAt: string | null;
  }>;
}) {
  const colorMap: Record<string, { color: string; bgColor: string }> = {
    document: { color: "text-primary", bgColor: "bg-primary/10" },
    bank_account: { color: "text-emerald-500", bgColor: "bg-emerald-50" },
    journal_entry: { color: "text-blue-500", bgColor: "bg-blue-50" },
    invoice_ap: { color: "text-amber-500", bgColor: "bg-amber-50" },
    invoice_ar: { color: "text-purple-500", bgColor: "bg-purple-50" },
    default: { color: "text-primary", bgColor: "bg-primary/10" },
  };

  function formatTimeAgo(date: string | null): string {
    if (!date) return "Unknown";
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes} min ago`;
    if (hours < 24) return `${hours} hr ago`;
    return `${Math.floor(hours / 24)} days ago`;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">
          AI Activity Feed
        </h2>
        <span className="text-[10px] text-muted-foreground">
          Live updates from your AI agents
        </span>
      </div>

      <div className="space-y-2">
        {activities.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            No recent activity
          </p>
        ) : (
          activities.map((activity) => {
            const colors = colorMap[activity.entityType] ?? colorMap.default;
            return (
              <div
                key={activity.id}
                className="flex items-center gap-3 rounded-xl border border-border/50 bg-card p-3 transition-all duration-200 hover:shadow-sm"
              >
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                    colors.bgColor,
                  )}
                >
                  <Bot className={cn("h-4 w-4", colors.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground capitalize">
                    {activity.entityType?.replace(/_/g, " ") ?? "Agent"}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {activity.action}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">
                    {formatTimeAgo(activity.createdAt)}
                  </span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                    Completed
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      <Link
        href="/dashboard/agent-monitor"
        className="flex items-center gap-1 text-[11px] font-medium text-primary hover:text-primary/80 transition-colors"
      >
        View all activity
        <ChevronRight className="h-3 w-3" />
      </Link>
    </div>
  );
}

// ─── Pending Approvals Component ──────────────────────────────────────────

function PendingApprovals({
  items,
}: {
  items: Array<{
    id: string;
    type: string;
    title: string;
    subtitle: string;
    amount: string;
    status: "pending" | "review";
  }>;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">
          Pending Approvals
        </h2>
        <span className="text-[10px] text-muted-foreground">
          Your attention is required
        </span>
      </div>

      <div className="space-y-2">
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            No pending approvals
          </p>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-xl border border-border/50 bg-card p-3 transition-all duration-200 hover:shadow-sm"
            >
              <div
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                  item.status === "pending"
                    ? "bg-balanced-green-bg"
                    : item.type === "agent_escalation"
                      ? "bg-primary/10"
                      : "bg-attention-amber-bg",
                )}
              >
                {item.status === "pending" ? (
                  <CheckCircle2 className="h-4 w-4 text-balanced-green" />
                ) : item.type === "agent_escalation" ? (
                  <Bot className="h-4 w-4 text-primary" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-attention-amber" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">
                  {item.title}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {item.subtitle}
                </p>
              </div>
              {item.amount !== "—" && (
                <span className="text-xs font-bold tabular-nums text-foreground whitespace-nowrap">
                  {item.amount}
                </span>
              )}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
                >
                  Approve
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-border/50 bg-background px-2.5 py-1 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-accent"
                >
                  Review
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <Link
        href="/dashboard/inbox"
        className="flex items-center gap-1 text-[11px] font-medium text-primary hover:text-primary/80 transition-colors"
      >
        View all approvals
        <ChevronRight className="h-3 w-3" />
      </Link>
    </div>
  );
}

// ─── Active Agents Component ──────────────────────────────────────────────

function ActiveAgents() {
  const agents = [
    {
      id: "1",
      name: "Bank Reconciler",
      detail: "Reconciled 3 of 5 accounts",
      progress: 60,
      eta: "ETA 5m",
      color: "from-emerald-500 to-teal-500",
    },
    {
      id: "2",
      name: "Invoice Processor",
      detail: "Processing invoices",
      progress: 78,
      eta: "ETA 3m",
      color: "from-primary to-blue-500",
    },
    {
      id: "3",
      name: "Payroll Agent",
      detail: "Calculating taxes",
      progress: 45,
      eta: "ETA 8m",
      color: "from-amber-500 to-orange-500",
    },
    {
      id: "4",
      name: "Report Generator",
      detail: "Generating P&L report",
      progress: 90,
      eta: "ETA 2m",
      color: "from-purple-500 to-indigo-500",
    },
    {
      id: "5",
      name: "Expense Categorizer",
      detail: "Categorizing expenses",
      progress: 30,
      eta: "ETA 10m",
      color: "from-sky-500 to-cyan-500",
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Active Agents</h2>
        <span className="text-[10px] text-muted-foreground">
          {agents.length} agents are currently working
        </span>
      </div>

      <div className="space-y-2">
        {agents.map((agent) => (
          <div
            key={agent.id}
            className="flex items-center gap-3 rounded-xl border border-border/50 bg-card p-3 transition-all duration-200 hover:shadow-sm"
          >
            <div
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-white",
                agent.color,
              )}
            >
              <Bot className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">
                {agent.name}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {agent.detail}
              </p>
              <div className="mt-1.5 flex items-center gap-2">
                <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-1000 bg-gradient-to-r",
                      agent.color,
                    )}
                    style={{ width: `${agent.progress}%` }}
                  />
                </div>
                <span className="text-[10px] tabular-nums text-muted-foreground">
                  {agent.progress}%
                </span>
              </div>
            </div>
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
              {agent.eta}
            </span>
          </div>
        ))}
      </div>

      <Link
        href="/dashboard/agent-monitor"
        className="flex items-center gap-1 text-[11px] font-medium text-primary hover:text-primary/80 transition-colors"
      >
        View all agents
        <ChevronRight className="h-3 w-3" />
      </Link>
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
    <div className="space-y-4">
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

  // Fetch dashboard data with optimized caching
  const { data: dashboardData, isLoading } =
    trpc.dashboard.getDashboardData.useQuery(undefined, {
      enabled: !!entityId,
      ...dashboardQueryOptions,
      refetchInterval: 60000, // Refresh every 60 seconds (less aggressive)
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
        <div className="flex-1 overflow-y-auto">
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
                  revenueChange: 0,
                  expensesChange: 0,
                  profitChange: 0,
                  arChange: 0,
                  apChange: 0,
                }
              }
            />

            {/* Row 4: 3-column — Activity Feed | Pending Approvals | Active Agents */}
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              <AgentActivityFeed
                activities={dashboardData?.agentActivity ?? []}
              />
              <PendingApprovals items={dashboardData?.pendingApprovals ?? []} />
              <ActiveAgents />
            </div>
          </div>
        </div>

        {/* Pinned AI Command Bar */}
        <div className="border-t border-border/50 bg-background/80 backdrop-blur-sm p-4 flex-shrink-0">
          <AIChatInput />
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
