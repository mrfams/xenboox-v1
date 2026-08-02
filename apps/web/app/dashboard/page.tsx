"use client";

import { useState, useMemo, useEffect } from "react";
import { useEntity } from "@/lib/entity-context";
import { Skeleton } from "@/components/shared/loading";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import { cn, formatCurrency } from "@/lib/utils";
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
  MessageSquare,
  Wallet,
  BarChart3,
  BookOpen,
  Shield,
} from "lucide-react";
import { Button, Badge, Input } from "@/components/ui";

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
        <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#gradient-${color})`} />
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

// ─── AI Greeting Component ────────────────────────────────────────────────

function AIGreeting() {
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-1">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">
        {greeting}, Famara!{" "}
        <span className="inline-block motion-safe:animate-[wave_2s_ease-in-out_infinite] origin-[70%_70%]">
          👋
        </span>
      </h1>
      <p className="text-sm text-muted-foreground">
        Here&apos;s what&apos;s happening with your business today.
      </p>
    </div>
  );
}

// ─── AI Chat Input Component ──────────────────────────────────────────────

function AIChatInput() {
  const [inputValue, setInputValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const suggestions = [
    { label: "Close July books", icon: BookOpen },
    { label: "Explain cash position", icon: Wallet },
    { label: "Create payroll", icon: FileText },
    { label: "Find duplicate expenses", icon: Search },
    { label: "Forecast next month", icon: BarChart3 },
    { label: "Show unpaid invoices", icon: Calendar },
  ];

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-foreground">
        What would you like Xenboox to do today?
      </p>
      <div
        className={cn(
          "relative group rounded-2xl border-2 bg-card transition-all duration-300",
          isFocused
            ? "border-[#6366F1]/50 shadow-lg shadow-[#6366F1]/5"
            : "border-border/50 hover:border-border/80 hover:shadow-md",
        )}
      >
        <div className="relative flex items-center gap-3 px-4 py-3.5">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Ask anything about your accounting..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-none"
          />
          <Button
            type="button"
            size="icon"
            className={cn(
              "h-10 w-10 rounded-xl p-0 transition-all shrink-0",
              inputValue.trim()
                ? "bg-[#6366F1] hover:bg-[#6366F1]/90 text-white shadow-sm"
                : "bg-[#6366F1] text-white",
            )}
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="scrollbar-hide flex items-center gap-2 overflow-x-auto py-0.5">
        {suggestions.map((suggestion) => {
          const Icon = suggestion.icon;
          return (
            <button
              key={suggestion.label}
              type="button"
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-border/50 bg-card/80 px-3 py-1.5",
                "text-xs text-muted-foreground transition-all duration-200",
                "hover:border-[#6366F1]/30 hover:text-[#6366F1] hover:bg-[#6366F1]/5 hover:shadow-sm",
                "active:scale-95",
              )}
            >
              <Icon className="h-3 w-3" />
              {suggestion.label}
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
    </div>
  );
}

// ─── Executive Briefing Component ─────────────────────────────────────────

function ExecutiveBriefing() {
  const items = [
    {
      id: "1",
      icon: TrendingUp,
      iconColor: "text-balanced-green",
      iconBg: "bg-balanced-green-bg",
      title: "Revenue is up 8%",
      value: "GMD 1,234,567",
      detail: "vs last month",
      status: "positive",
      statusLabel: "Strong performance",
    },
    {
      id: "2",
      icon: DollarSign,
      iconColor: "text-balanced-green",
      iconBg: "bg-balanced-green-bg",
      title: "Cash position is healthy",
      value: "GMD 1,234,567",
      detail: "12% above last month",
      status: "positive",
      statusLabel: "+12% above last month",
    },
    {
      id: "3",
      icon: Clock,
      iconColor: "text-attention-amber",
      iconBg: "bg-attention-amber-bg",
      title: "Payroll due in 3 days",
      value: "For 24 employees",
      detail: "Jul 31, 2025",
      status: "warning",
      statusLabel: "Review draft",
    },
    {
      id: "4",
      icon: FileText,
      iconColor: "text-[#6366F1]",
      iconBg: "bg-[#6366F1]/10",
      title: "VAT return ready",
      value: "For July 2025",
      detail: "Due Aug 15",
      status: "neutral",
      statusLabel: "Ready for review",
    },
    {
      id: "5",
      icon: AlertTriangle,
      iconColor: "text-error-clay",
      iconBg: "bg-error-clay-bg",
      title: "2 invoices overdue",
      value: "Totalling GMD 5,600",
      detail: "Overdue by 30+ days",
      status: "negative",
      statusLabel: "Follow up required",
    },
    {
      id: "6",
      icon: Shield,
      iconColor: "text-attention-amber",
      iconBg: "bg-attention-amber-bg",
      title: "1 suspicious transaction",
      value: "Needs your review",
      detail: "Flagged by AI",
      status: "warning",
      statusLabel: "Review now",
    },
  ];

  const statusColors: Record<string, string> = {
    positive: "text-balanced-green",
    warning: "text-attention-amber",
    negative: "text-error-clay",
    neutral: "text-muted-foreground",
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-foreground">
            Executive Briefing
          </h2>
          <span className="flex items-center gap-1 rounded-full bg-[#6366F1]/10 px-2 py-0.5 text-[10px] font-medium text-[#6366F1]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#6366F1]" />
            AI generated
          </span>
        </div>
        <button
          type="button"
          className="flex items-center gap-1 text-[11px] font-medium text-[#6366F1] hover:text-[#6366F1]/80 transition-colors"
        >
          View all insights
          <ChevronRight className="h-3 w-3" />
        </button>
      </div>

      <div className="scrollbar-hide flex items-center gap-3 overflow-x-auto pb-1">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-xl border border-border/50 bg-card p-3 transition-all duration-200 hover:shadow-md hover:border-border/80 min-w-[200px]"
            >
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                  item.iconBg,
                )}
              >
                <Icon className={cn("h-5 w-5", item.iconColor)} />
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
                  statusColors[item.status],
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

function BusinessHealth() {
  const metrics = [
    {
      id: "cash",
      label: "Cash Balance",
      value: 1234567,
      change: 12.5,
      sparkline: [
        800000, 900000, 850000, 1000000, 1100000, 1050000, 1200000, 1234567,
      ],
    },
    {
      id: "revenue",
      label: "Revenue",
      value: 2345890,
      change: 8.1,
      sparkline: [
        1800000, 1900000, 2000000, 2100000, 2000000, 2200000, 2300000, 2345890,
      ],
    },
    {
      id: "expenses",
      label: "Expenses",
      value: 1345221,
      change: -3.4,
      sparkline: [
        1400000, 1350000, 1300000, 1320000, 1380000, 1360000, 1350000, 1345221,
      ],
    },
    {
      id: "profit",
      label: "Profit",
      value: 1000669,
      change: 12.2,
      sparkline: [
        600000, 700000, 650000, 800000, 850000, 900000, 950000, 1000669,
      ],
    },
    {
      id: "ar",
      label: "A/R (Outstanding)",
      value: 234550,
      change: 5.6,
      sparkline: [
        200000, 210000, 220000, 230000, 225000, 235000, 230000, 234550,
      ],
    },
    {
      id: "ap",
      label: "A/P (Outstanding)",
      value: 345667,
      change: -2.1,
      sparkline: [
        360000, 355000, 350000, 345000, 350000, 348000, 346000, 345667,
      ],
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">
          Business Health
        </h2>
        <select className="text-[11px] font-medium text-muted-foreground bg-transparent border border-border/50 rounded-lg px-2 py-1 outline-none">
          <option>This month</option>
          <option>Last month</option>
          <option>This quarter</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
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
                  {metric.change}%
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

function AgentActivityFeed() {
  const activities = [
    {
      id: "1",
      agent: "Invoice Processor",
      action: "Processed 12 invoices from Acme Corp",
      time: "2 min ago",
      status: "completed",
      icon: Bot,
      color: "text-[#6366F1]",
      bgColor: "bg-[#6366F1]/10",
    },
    {
      id: "2",
      agent: "Bank Reconciler",
      action: "Reconciled GTBank account #1234",
      time: "15 min ago",
      status: "completed",
      icon: RefreshCw,
      color: "text-emerald-500",
      bgColor: "bg-emerald-50",
    },
    {
      id: "3",
      agent: "Payroll Agent",
      action: "Prepared payroll draft for July 2025",
      time: "32 min ago",
      status: "in_progress",
      icon: Clock,
      color: "text-amber-500",
      bgColor: "bg-amber-50",
    },
    {
      id: "4",
      agent: "Bookkeeper Agent",
      action: "Posted 8 journal entries",
      time: "1 hr ago",
      status: "completed",
      icon: BookOpen,
      color: "text-blue-500",
      bgColor: "bg-blue-50",
    },
    {
      id: "5",
      agent: "Document Extractor",
      action: "Extracted data from 24 receipts",
      time: "2 hrs ago",
      status: "completed",
      icon: FileText,
      color: "text-purple-500",
      bgColor: "bg-purple-50",
    },
  ];

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
        {activities.map((activity) => {
          const Icon = activity.icon;
          return (
            <div
              key={activity.id}
              className="flex items-center gap-3 rounded-xl border border-border/50 bg-card p-3 transition-all duration-200 hover:shadow-sm"
            >
              <div
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                  activity.bgColor,
                )}
              >
                <Icon className={cn("h-4 w-4", activity.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground">
                  {activity.agent}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {activity.action}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">
                  {activity.time}
                </span>
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-[10px]",
                    activity.status === "completed"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-700",
                  )}
                >
                  {activity.status === "completed"
                    ? "Completed"
                    : "In Progress"}
                </Badge>
              </div>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        className="flex items-center gap-1 text-[11px] font-medium text-[#6366F1] hover:text-[#6366F1]/80 transition-colors"
      >
        View all activity
        <ChevronRight className="h-3 w-3" />
      </button>
    </div>
  );
}

// ─── Pending Approvals Component ──────────────────────────────────────────

function PendingApprovals() {
  const items = [
    {
      id: "1",
      title: "Payroll July 2025",
      subtitle: "24 employees",
      amount: "GMD 78,450",
      status: "pending",
      icon: CheckCircle2,
      iconColor: "text-balanced-green",
      iconBg: "bg-balanced-green-bg",
    },
    {
      id: "2",
      title: "Payment to Office Rent",
      subtitle: "Rent for August",
      amount: "GMD 15,000",
      status: "pending",
      icon: CheckCircle2,
      iconColor: "text-balanced-green",
      iconBg: "bg-balanced-green-bg",
    },
    {
      id: "3",
      title: "Journal Entry #JE-2025-124",
      subtitle: "Depreciation Expense",
      amount: "GMD 4,250",
      status: "pending",
      icon: CheckCircle2,
      iconColor: "text-balanced-green",
      iconBg: "bg-balanced-green-bg",
    },
    {
      id: "4",
      title: "VAT Return July 2025",
      subtitle: "VAT payable GMD 9,850",
      amount: "GMD 9,850",
      status: "review",
      icon: AlertTriangle,
      iconColor: "text-attention-amber",
      iconBg: "bg-attention-amber-bg",
    },
    {
      id: "5",
      title: "AI Correction",
      subtitle: "Uncategorized expense",
      amount: "GMD 2,300",
      status: "review",
      icon: Bot,
      iconColor: "text-[#6366F1]",
      iconBg: "bg-[#6366F1]/10",
    },
  ];

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
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-xl border border-border/50 bg-card p-3 transition-all duration-200 hover:shadow-sm"
            >
              <div
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                  item.iconBg,
                )}
              >
                <Icon className={cn("h-4 w-4", item.iconColor)} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">
                  {item.title}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {item.subtitle}
                </p>
              </div>
              <span className="text-xs font-bold tabular-nums text-foreground whitespace-nowrap">
                {item.amount}
              </span>
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
          );
        })}
      </div>

      <button
        type="button"
        className="flex items-center gap-1 text-[11px] font-medium text-[#6366F1] hover:text-[#6366F1]/80 transition-colors"
      >
        View all approvals
        <ChevronRight className="h-3 w-3" />
      </button>
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
      color: "from-[#6366F1] to-blue-500",
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

      <button
        type="button"
        className="flex items-center gap-1 text-[11px] font-medium text-[#6366F1] hover:text-[#6366F1]/80 transition-colors"
      >
        View all agents
        <ChevronRight className="h-3 w-3" />
      </button>
    </div>
  );
}

// ─── Dashboard Right Sidebar ──────────────────────────────────────────────

function DashboardRightSidebar() {
  const deadlines = [
    {
      id: "1",
      label: "Payroll Payment",
      date: "Jul 31, 2025",
      tag: "In 3 days",
      tagColor: "bg-amber-50 text-amber-700 border-amber-200",
    },
    {
      id: "2",
      label: "VAT Return Due",
      date: "Aug 15, 2025",
      tag: "In 18 days",
      tagColor: "bg-blue-50 text-blue-700 border-blue-200",
    },
    {
      id: "3",
      label: "Management Report",
      date: "Aug 20, 2025",
      tag: "In 23 days",
      tagColor: "bg-blue-50 text-blue-700 border-blue-200",
    },
    {
      id: "4",
      label: "Tax Payment",
      date: "Aug 31, 2025",
      tag: "In 34 days",
      tagColor: "bg-blue-50 text-blue-700 border-blue-200",
    },
  ];

  const docs = [
    {
      id: "1",
      name: "GTBank Statement - July 2025.pdf",
      time: "2 min ago",
      icon: FileText,
      color: "text-red-500",
    },
    {
      id: "2",
      name: "Invoice INV-1001 - Acme Corp.pdf",
      time: "12 min ago",
      icon: FileText,
      color: "text-[#6366F1]",
    },
    {
      id: "3",
      name: "Payroll July 2025.xlsx",
      time: "32 min ago",
      icon: FileText,
      color: "text-emerald-500",
    },
    {
      id: "4",
      name: "VAT Return - July 2025.pdf",
      time: "1 hr ago",
      icon: FileText,
      color: "text-red-500",
    },
    {
      id: "5",
      name: "Management Report - June 2025.pdf",
      time: "2 hrs ago",
      icon: FileText,
      color: "text-[#6366F1]",
    },
  ];

  const conversations = [
    { id: "1", text: "Explain cash position", time: "Just now" },
    { id: "2", text: "Why did expenses increase?", time: "1 hr ago" },
    { id: "3", text: "Show unpaid invoices", time: "3 hrs ago" },
    { id: "4", text: "Forecast next month cash flow", time: "Yesterday" },
    { id: "5", text: "Close June books", time: "2 days ago" },
  ];

  const actions = [
    { id: "1", text: "Follow up 2 overdue invoices" },
    { id: "2", text: "Reconcile 2 bank accounts" },
    { id: "3", text: "Review 1 suspicious transaction" },
    { id: "4", text: "Approve payroll draft" },
    { id: "5", text: "Connect Paystack account" },
  ];

  return (
    <div className="space-y-6">
      {/* Upcoming & Deadlines */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">
            Upcoming & Deadlines
          </h3>
          <button
            type="button"
            className="flex items-center gap-0.5 text-[11px] font-medium text-[#6366F1] hover:text-[#6366F1]/80"
          >
            View calendar <ChevronRight className="h-3 w-3" />
          </button>
        </div>
        <div className="space-y-2">
          {deadlines.map((d) => (
            <div
              key={d.id}
              className="flex items-center gap-3 rounded-lg border border-border/50 bg-card p-2.5 hover:shadow-sm transition-all"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#6366F1]/10">
                <Calendar className="h-4 w-4 text-[#6366F1]" />
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
                  d.tagColor,
                )}
              >
                {d.tag}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Documents */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">
            Recent Documents
          </h3>
          <button
            type="button"
            className="flex items-center gap-0.5 text-[11px] font-medium text-[#6366F1] hover:text-[#6366F1]/80"
          >
            View all <ChevronRight className="h-3 w-3" />
          </button>
        </div>
        <div className="space-y-1.5">
          {docs.map((doc) => {
            const Icon = doc.icon;
            return (
              <div
                key={doc.id}
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-accent/50 cursor-pointer transition-colors"
              >
                <Icon className={cn("h-4 w-4 shrink-0", doc.color)} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground truncate">{doc.name}</p>
                </div>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                  {doc.time}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Conversations */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">
            Recent Conversations
          </h3>
          <button
            type="button"
            className="flex items-center gap-0.5 text-[11px] font-medium text-[#6366F1] hover:text-[#6366F1]/80"
          >
            View all <ChevronRight className="h-3 w-3" />
          </button>
        </div>
        <div className="space-y-1.5">
          {conversations.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-accent/50 cursor-pointer transition-colors"
            >
              <MessageSquare className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-foreground truncate">{c.text}</p>
              </div>
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                {c.time}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Suggested Actions */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">
          Suggested Actions
        </h3>
        <div className="space-y-1.5">
          {actions.map((a) => (
            <button
              key={a.id}
              type="button"
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-accent/50 text-left transition-colors group"
            >
              <Sparkles className="h-3.5 w-3.5 text-[#6366F1] shrink-0" />
              <span className="flex-1 text-xs text-foreground truncate">
                {a.text}
              </span>
              <ChevronRight className="h-3 w-3 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard Page ──────────────────────────────────────────────────

export default function DashboardPage() {
  const { entityId } = useEntity();
  const [copilotOpen, setCopilotOpen] = useState(true);

  // Fetch real data for metrics
  const { data: arInvoices, isLoading: arLoading } =
    trpc.ar.listInvoices.useQuery({}, { enabled: !!entityId });
  const { data: apInvoices, isLoading: apLoading } =
    trpc.ap.listInvoices.useQuery(undefined, { enabled: !!entityId });
  const { data: bankAccounts, isLoading: bankLoading } =
    trpc.treasury.listBankAccounts.useQuery(undefined, { enabled: !!entityId });
  const { data: cashAccounts, isLoading: cashLoading } =
    trpc.cash.listCashAccounts.useQuery(undefined, { enabled: !!entityId });

  const isLoading = arLoading || apLoading || bankLoading || cashLoading;

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16 w-96 rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <div className="grid gap-4 lg:grid-cols-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-6 p-6">
          {/* Row 1: Greeting */}
          <AIGreeting />

          {/* Row 2: AI Command Box */}
          <AIChatInput />

          {/* Row 3: Executive Briefing */}
          <ExecutiveBriefing />

          {/* Row 4: Business Health KPI Cards */}
          <BusinessHealth />

          {/* Row 5: 3-column — Activity Feed | Pending Approvals | Active Agents */}
          <div className="grid gap-6 lg:grid-cols-3">
            <AgentActivityFeed />
            <PendingApprovals />
            <ActiveAgents />
          </div>
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="w-80 border-l bg-card hidden lg:block overflow-y-auto p-6">
        <DashboardRightSidebar />
      </div>
    </div>
  );
}
