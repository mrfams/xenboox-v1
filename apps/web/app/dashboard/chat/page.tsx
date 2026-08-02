"use client";

import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useEntity } from "@/lib/entity-context";
import { trpc } from "@/lib/trpc/client";
import { cn, formatCurrency } from "@/lib/utils";
import { Skeleton } from "@/components/shared/loading";
import { Button } from "@/components/ui";
import {
  ArrowRight,
  Plus,
  Mic,
  Paperclip,
  Bot,
  AlertTriangle,
  AlertCircle,
  LinkIcon,
  TrendingDown,
  TrendingUp,
  ChevronRight,
  CheckCircle2,
  Clock,
  FileText,
  Send,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Expand,
  X,
  Sparkles,
  CreditCard,
  Users,
  BarChart3,
  RefreshCw,
} from "lucide-react";

// ─── Active AI Tasks Component ────────────────────────────────────────────

function ActiveAITasks({
  tasks,
}: {
  tasks: Array<{
    id: string;
    title: string;
    subtitle: string;
    progress: number;
    status: "active" | "review" | "completed";
    eta: string;
    type: string;
  }>;
}) {
  const typeIcons: Record<string, typeof Bot> = {
    reconciliation: CreditCard,
    invoice: FileText,
    journal: FileText,
    escalation: AlertTriangle,
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">
          Active AI Tasks
        </h2>
        <button
          type="button"
          className="flex items-center gap-1 text-[11px] font-medium text-primary hover:text-primary/80 transition-colors"
        >
          View all tasks
          <ChevronRight className="h-3 w-3" />
        </button>
      </div>

      <div className="scrollbar-hide flex items-center gap-3 overflow-x-auto pb-1">
        {tasks.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4 min-w-[200px]">
            No active tasks
          </p>
        ) : (
          tasks.map((task) => {
            const Icon = typeIcons[task.type] ?? Bot;
            return (
              <div
                key={task.id}
                className="flex flex-col gap-3 rounded-xl border border-border/50 bg-card p-4 transition-all duration-200 hover:shadow-md min-w-[280px]"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                      task.status === "review"
                        ? "bg-amber-50"
                        : "bg-primary/10",
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-5 w-5",
                        task.status === "review"
                          ? "text-amber-600"
                          : "text-primary",
                      )}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-medium text-foreground truncate">
                        {task.title}
                      </p>
                      {task.status === "review" && (
                        <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                          Review
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {task.subtitle}
                    </p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5">
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-1000",
                        task.status === "review"
                          ? "bg-amber-500"
                          : "bg-primary",
                      )}
                      style={{ width: `${task.progress}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">
                      {task.progress}%
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {task.eta}
                    </span>
                  </div>
                </div>

                {/* Action button */}
                <button
                  type="button"
                  className={cn(
                    "w-full rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                    task.status === "review"
                      ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                      : "border-border/50 bg-background text-foreground hover:bg-accent",
                  )}
                >
                  {task.status === "review" ? "Review now" : "View details"}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── AI Suggestions Component ─────────────────────────────────────────────

function AISuggestions({
  suggestions,
}: {
  suggestions: Array<{
    id: string;
    title: string;
    description: string;
    action: string;
    type: "warning" | "info" | "alert";
    icon: string;
  }>;
}) {
  const typeConfig: Record<
    string,
    { icon: typeof AlertTriangle; color: string; bgColor: string }
  > = {
    warning: {
      icon: AlertCircle,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
    },
    alert: {
      icon: AlertTriangle,
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
    info: {
      icon: LinkIcon,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">
          AI Suggestions
        </h2>
      </div>

      <div className="scrollbar-hide flex items-center gap-3 overflow-x-auto pb-1">
        {suggestions.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4 min-w-[200px]">
            No suggestions right now
          </p>
        ) : (
          suggestions.map((suggestion) => {
            const config = typeConfig[suggestion.type] ?? typeConfig.info;
            const Icon = config.icon;
            return (
              <div
                key={suggestion.id}
                className="flex flex-col gap-2 rounded-xl border border-border/50 bg-card p-4 transition-all duration-200 hover:shadow-md min-w-[280px]"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                      config.bgColor,
                    )}
                  >
                    <Icon className={cn("h-4 w-4", config.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground">
                      {suggestion.title}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {suggestion.description}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="self-start rounded-lg border border-border/50 bg-background px-3 py-1.5 text-[10px] font-medium text-foreground hover:bg-accent transition-colors"
                >
                  {suggestion.action}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── Financial Insights Component ─────────────────────────────────────────

function FinancialInsights({
  insights,
}: {
  insights: Array<{
    id: string;
    title: string;
    description: string;
    type: "positive" | "negative" | "neutral";
  }>;
}) {
  const typeConfig: Record<
    string,
    { icon: typeof TrendingUp; color: string; bgColor: string }
  > = {
    positive: {
      icon: TrendingUp,
      color: "text-balanced-green",
      bgColor: "bg-balanced-green-bg",
    },
    negative: {
      icon: TrendingDown,
      color: "text-error-clay",
      bgColor: "bg-error-clay-bg",
    },
    neutral: {
      icon: FileText,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-foreground">
            Financial Insights
          </h2>
          <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            AI generated
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {insights.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            No insights available yet
          </p>
        ) : (
          insights.map((insight) => {
            const config = typeConfig[insight.type] ?? typeConfig.neutral;
            const Icon = config.icon;
            return (
              <div
                key={insight.id}
                className="flex items-start gap-3 rounded-xl border border-border/50 bg-card p-3 transition-all duration-200 hover:shadow-sm"
              >
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                    config.bgColor,
                  )}
                >
                  <Icon className={cn("h-4 w-4", config.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground">
                    {insight.title}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {insight.description}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <button
        type="button"
        className="flex items-center gap-1 text-[11px] font-medium text-primary hover:text-primary/80 transition-colors"
      >
        View all insights
        <ChevronRight className="h-3 w-3" />
      </button>
    </div>
  );
}

// ─── Cash Flow Overview Component ─────────────────────────────────────────

function CashFlowOverview({
  data,
}: {
  data: {
    chartData: Array<{
      date: string;
      cashIn: number;
      cashOut: number;
      netCashFlow: number;
    }>;
    summary: {
      totalCashIn: number;
      totalCashOut: number;
      netCashFlow: number;
    };
  };
}) {
  const maxVal = Math.max(
    ...data.chartData.map((d) => Math.max(d.cashIn, d.cashOut)),
    1,
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">
          Cash Flow Overview
        </h2>
        <select className="text-[11px] font-medium text-muted-foreground bg-transparent border border-border/50 rounded-lg px-2 py-1 outline-none">
          <option>This month</option>
          <option>Last month</option>
          <option>This quarter</option>
        </select>
      </div>

      {/* Summary */}
      <div className="space-y-1">
        <p className="text-2xl font-bold tabular-nums text-foreground">
          {formatCurrency(data.summary.netCashFlow)}
        </p>
        <p className="text-xs text-muted-foreground">Net Cash Flow</p>
        {data.summary.netCashFlow > 0 && (
          <p className="text-xs text-balanced-green font-medium">
            +18.4% vs last month
          </p>
        )}
      </div>

      {/* Chart */}
      <div className="h-48 flex items-end gap-1">
        {data.chartData.slice(-30).map((d, i) => {
          const cashInHeight = (d.cashIn / maxVal) * 100;
          const cashOutHeight = (d.cashOut / maxVal) * 100;

          return (
            <div key={d.date} className="flex-1 flex items-end gap-0.5 h-full">
              <div
                className="flex-1 bg-balanced-green rounded-t"
                style={{ height: `${cashInHeight}%` }}
              />
              <div
                className="flex-1 bg-error-clay rounded-t"
                style={{ height: `${cashOutHeight}%` }}
              />
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-balanced-green" />
          Cash In
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-error-clay" />
          Cash Out
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-primary" />
          Net Cash Flow
        </div>
      </div>

      <button
        type="button"
        className="flex items-center gap-1 text-[11px] font-medium text-primary hover:text-primary/80 transition-colors"
      >
        View cash flow statement
        <ChevronRight className="h-3 w-3" />
      </button>
    </div>
  );
}

// ─── AI Chat Panel Component ──────────────────────────────────────────────

function AIChatPanel() {
  const { entityId } = useEntity();
  const { data: session } = useSession();
  const [inputValue, setInputValue] = useState("");
  const [isOpen, setIsOpen] = useState(true);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const utils = trpc.useUtils();

  // Fetch messages if conversation exists
  const { data: messages } = trpc.aiWorkspace.getMessages.useQuery(
    { conversationId: conversationId! },
    { enabled: !!conversationId },
  );

  // Send message mutation
  const sendMessage = trpc.aiWorkspace.sendMessage.useMutation({
    onSuccess: (data) => {
      setConversationId(data.conversationId);
      utils.aiWorkspace.getMessages.invalidate({
        conversationId: data.conversationId,
      });
      setInputValue("");
    },
  });

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!inputValue.trim()) return;
    sendMessage.mutate({
      message: inputValue,
      conversationId: conversationId ?? undefined,
    });
  };

  const quickActions = [
    "Show cash flow forecast",
    "Which invoices are overdue?",
    "Reconcile GTBank account",
    "Create cash flow report",
  ];

  return (
    <div
      className={cn(
        "border-l bg-card transition-all duration-300",
        isOpen ? "w-96" : "w-12",
      )}
    >
      {isOpen ? (
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/50 p-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs font-medium text-foreground">
                  AI Assistant
                </p>
                <div className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-balanced-green" />
                  <span className="text-[10px] text-muted-foreground">
                    Active
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
              >
                <Expand className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages && messages.length > 0 ? (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex flex-col gap-1",
                    msg.role === "user" ? "items-end" : "items-start",
                  )}
                >
                  {msg.role === "assistant" && (
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10">
                        <Bot className="h-3 w-3 text-primary" />
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        Xenboox AI
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(
                          msg.createdAt ?? Date.now(),
                        ).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed",
                      msg.role === "user"
                        ? "bg-primary text-white rounded-br-md"
                        : "bg-accent text-foreground rounded-bl-md",
                    )}
                  >
                    {msg.content}
                  </div>
                  {msg.role === "user" && (
                    <span className="text-[10px] text-muted-foreground mt-1">
                      {new Date(msg.createdAt ?? Date.now()).toLocaleTimeString(
                        [],
                        { hour: "2-digit", minute: "2-digit" },
                      )}
                    </span>
                  )}
                  {msg.role === "assistant" && (
                    <div className="flex items-center gap-2 mt-1">
                      <button
                        type="button"
                        className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
                      >
                        <ThumbsUp className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
                      >
                        <ThumbsDown className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 mb-3">
                  <Bot className="h-6 w-6 text-primary" />
                </div>
                <p className="text-xs font-medium text-foreground">
                  How can I help?
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Ask me anything about your accounting
                </p>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions */}
          <div className="px-4 pb-2">
            <div className="flex flex-wrap gap-1.5">
              {quickActions.map((action) => (
                <button
                  key={action}
                  type="button"
                  onClick={() => setInputValue(action)}
                  className="inline-flex items-center gap-1 rounded-lg border border-border/50 bg-card/80 px-2.5 py-1 text-[10px] text-muted-foreground hover:border-primary/30 hover:text-primary hover:bg-primary/5 transition-all"
                >
                  {action}
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="p-4 border-t border-border/50">
            <div className="relative flex items-center gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Ask follow up..."
                className="flex-1 bg-accent rounded-xl px-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground outline-none"
              />
              <Button
                type="button"
                size="icon"
                onClick={handleSend}
                disabled={!inputValue.trim() || sendMessage.isPending}
                className="h-9 w-9 rounded-xl shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-[9px] text-muted-foreground text-center mt-2">
              Xenboox AI can make mistakes. Verify important information.
            </p>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="h-full w-full flex items-center justify-center hover:bg-accent transition-colors"
        >
          <Bot className="h-5 w-5 text-primary" />
        </button>
      )}
    </div>
  );
}

// ─── Main AI Workspace Page ───────────────────────────────────────────────

export default function AIWorkspacePage() {
  const { entityId } = useEntity();
  const { data: session } = useSession();
  const [inputValue, setInputValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  // Fetch data
  const { data: tasksData, isLoading: tasksLoading } =
    trpc.aiWorkspace.getActiveTasks.useQuery(undefined, {
      enabled: !!entityId,
    });

  const { data: suggestionsData, isLoading: suggestionsLoading } =
    trpc.aiWorkspace.getSuggestions.useQuery(undefined, {
      enabled: !!entityId,
    });

  const { data: insightsData, isLoading: insightsLoading } =
    trpc.aiWorkspace.getFinancialInsights.useQuery(undefined, {
      enabled: !!entityId,
    });

  const { data: cashFlowData, isLoading: cashFlowLoading } =
    trpc.aiWorkspace.getCashFlowOverview.useQuery(undefined, {
      enabled: !!entityId,
    });

  const isLoading =
    tasksLoading || suggestionsLoading || insightsLoading || cashFlowLoading;

  const suggestions = [
    { label: "Close May books", icon: FileText },
    { label: "Explain cash position", icon: BarChart3 },
    { label: "Reconcile transactions", icon: RefreshCw },
    { label: "Create payroll", icon: Users },
    { label: "Forecast next month", icon: TrendingUp },
    { label: "Analyze expenses", icon: CreditCard },
  ];

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)]">
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-6 p-6">
            <Skeleton className="h-16 w-96 rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
            <div className="grid gap-6 lg:grid-cols-2">
              <Skeleton className="h-64 rounded-xl" />
              <Skeleton className="h-64 rounded-xl" />
            </div>
          </div>
        </div>
        <div className="w-96 border-l bg-card hidden lg:block p-6">
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
          {/* Header */}
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              AI Workspace
            </h1>
            <p className="text-sm text-muted-foreground">
              Collaborate with AI on your accounting and financial tasks.
            </p>
          </div>

          {/* AI Command Box */}
          <div className="space-y-3">
            <div
              className={cn(
                "relative group rounded-2xl border-2 bg-card transition-all duration-300",
                isFocused
                  ? "border-primary/50 shadow-lg shadow-primary/5"
                  : "border-border/50 hover:border-border/80 hover:shadow-md",
              )}
            >
              <div className="relative flex items-center gap-3 px-4 py-3.5">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
                  >
                    <Mic className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
                  >
                    <Paperclip className="h-4 w-4" />
                  </button>
                </div>
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  placeholder="What would you like Xenboox to do?"
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-none"
                />
                <Button
                  type="button"
                  size="icon"
                  className={cn(
                    "h-10 w-10 rounded-xl p-0 transition-all shrink-0",
                    inputValue.trim()
                      ? "bg-primary hover:bg-primary/90 text-white shadow-sm"
                      : "bg-primary text-white",
                  )}
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Quick suggestions */}
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
                      "hover:border-primary/30 hover:text-primary hover:bg-primary/5 hover:shadow-sm",
                      "active:scale-95",
                    )}
                  >
                    <Icon className="h-3 w-3" />
                    {suggestion.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active AI Tasks */}
          <ActiveAITasks tasks={tasksData?.tasks ?? []} />

          {/* AI Suggestions */}
          <AISuggestions suggestions={suggestionsData?.suggestions ?? []} />

          {/* Financial Insights + Cash Flow */}
          <div className="grid gap-6 lg:grid-cols-2">
            <FinancialInsights insights={insightsData?.insights ?? []} />
            <CashFlowOverview
              data={
                cashFlowData ?? {
                  chartData: [],
                  summary: { totalCashIn: 0, totalCashOut: 0, netCashFlow: 0 },
                }
              }
            />
          </div>
        </div>
      </div>

      {/* AI Chat Panel */}
      <AIChatPanel />
    </div>
  );
}
