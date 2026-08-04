"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useEntity } from "@/lib/entity-context";
import { trpc } from "@/lib/trpc/client";
import { cn, formatCurrency } from "@/lib/utils";
import { Skeleton } from "@/components/shared/loading";
import { Button } from "@/components/ui";
import { useStreamingChat } from "@/lib/hooks/use-streaming-chat";
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
  MessageSquare,
  Search,
  MoreHorizontal,
  Edit3,
  Trash2,
  ClipboardCheck,
  Activity,
  Eye,
  Download,
  Shield,
  Zap,
  History,
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

function ConversationThreads({
  activeConversationId,
  onSelectConversation,
  onNewChat,
}: {
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
}) {
  const { entityId } = useEntity();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const utils = trpc.useUtils();

  // Fetch conversations
  const { data: conversations, isLoading } =
    trpc.chat.listConversations.useQuery(undefined, { enabled: !!entityId });

  // Search conversations
  const { data: searchResults } = trpc.chat.searchConversations.useQuery(
    { query: searchQuery, limit: 20 },
    { enabled: searchQuery.length > 1 },
  );

  // Rename mutation
  const renameMutation = trpc.chat.renameConversation.useMutation({
    onSuccess: () => {
      utils.chat.listConversations.invalidate();
      setEditingId(null);
      setEditTitle("");
    },
  });

  // Delete mutation
  const deleteMutation = trpc.chat.deleteConversation.useMutation({
    onSuccess: () => {
      utils.chat.listConversations.invalidate();
    },
  });

  // Filter and sort conversations
  const filteredConversations =
    searchQuery.length > 1
      ? (searchResults ?? []).map((r) => r.conversation)
      : (conversations ?? []);

  // Group conversations by date
  const groupedConversations = groupConversationsByDate(filteredConversations);

  const handleRename = (id: string) => {
    if (editTitle.trim()) {
      renameMutation.mutate({ conversationId: id, title: editTitle.trim() });
    }
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate({ conversationId: id });
    if (id === activeConversationId) {
      onNewChat();
    }
  };

  if (!isSidebarOpen) {
    return (
      <div className="w-12 border-r bg-card flex flex-col items-center py-3 gap-3">
        <button
          type="button"
          onClick={onNewChat}
          className="h-8 w-8 rounded-lg flex items-center justify-center bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setIsSidebarOpen(true)}
          className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
        >
          <MessageSquare className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="w-72 border-r bg-card flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
            <MessageSquare className="h-3.5 w-3.5 text-primary" />
          </div>
          <p className="text-xs font-semibold text-foreground">Conversations</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onNewChat}
            className="h-7 w-7 rounded-lg flex items-center justify-center text-primary hover:bg-primary/10 transition-colors"
            title="New Chat"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setIsSidebarOpen(false)}
            className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="p-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="w-full bg-accent rounded-lg pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/30"
          />
        </div>
      </div>

      {/* New Chat Button */}
      <div className="px-2 pb-1">
        <button
          type="button"
          onClick={onNewChat}
          className="w-full flex items-center gap-2 rounded-lg border border-dashed border-border/60 bg-background px-3 py-2 text-xs text-muted-foreground hover:border-primary/30 hover:text-primary hover:bg-primary/5 transition-all"
        >
          <Plus className="h-3.5 w-3.5" />
          New Conversation
        </button>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {isLoading ? (
          <div className="space-y-1 py-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-12 rounded-lg bg-accent/50 animate-pulse"
              />
            ))}
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Bot className="h-8 w-8 text-muted-foreground/30 mb-2" />
            <p className="text-xs text-muted-foreground">
              {searchQuery ? "No conversations found" : "No conversations yet"}
            </p>
            <p className="text-[10px] text-muted-foreground/60 mt-1">
              Start a new conversation with AI
            </p>
          </div>
        ) : (
          Object.entries(groupedConversations).map(([dateGroup, convs]) => (
            <div key={dateGroup} className="mb-2">
              <p className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider px-2 py-1.5">
                {dateGroup}
              </p>
              <div className="space-y-0.5">
                {convs.map((conv) => (
                  <ConversationItem
                    key={conv.id}
                    conversation={conv}
                    isActive={conv.id === activeConversationId}
                    isEditing={editingId === conv.id}
                    editTitle={editTitle}
                    onEditTitleChange={setEditTitle}
                    onSelect={() => onSelectConversation(conv.id)}
                    onStartEdit={() => {
                      setEditingId(conv.id);
                      setEditTitle(conv.title ?? "");
                    }}
                    onSaveEdit={() => handleRename(conv.id)}
                    onCancelEdit={() => {
                      setEditingId(null);
                      setEditTitle("");
                    }}
                    onDelete={() => handleDelete(conv.id)}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-border/50">
        <div className="flex items-center gap-2 rounded-lg bg-accent/50 px-3 py-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
            <Bot className="h-3 w-3 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-medium text-foreground">
              Xenboox AI
            </p>
            <div className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span className="text-[9px] text-muted-foreground">Active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Conversation Item Component ──────────────────────────────────────────

function ConversationItem({
  conversation,
  isActive,
  isEditing,
  editTitle,
  onEditTitleChange,
  onSelect,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
}: {
  conversation: {
    id: string;
    title: string | null;
    messageCount: number | null;
    lastMessageAt: Date | string | null;
  };
  isActive: boolean;
  isEditing: boolean;
  editTitle: string;
  onEditTitleChange: (val: string) => void;
  onSelect: () => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    if (showMenu) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showMenu]);

  const timeAgo = conversation.lastMessageAt
    ? formatTimeAgo(conversation.lastMessageAt)
    : "";

  return (
    <div
      className={cn(
        "group relative flex items-center gap-2 rounded-lg px-2 py-2 cursor-pointer transition-all duration-150",
        isActive
          ? "bg-primary/10 text-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
      onClick={onSelect}
    >
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-background/50">
        <MessageSquare className="h-3 w-3" />
      </div>

      <div className="flex-1 min-w-0">
        {isEditing ? (
          <div
            className="flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="text"
              value={editTitle}
              onChange={(e) => onEditTitleChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSaveEdit();
                if (e.key === "Escape") onCancelEdit();
              }}
              className="flex-1 bg-background rounded px-1.5 py-0.5 text-xs outline-none ring-1 ring-primary/30"
              autoFocus
            />
            <button
              type="button"
              onClick={onSaveEdit}
              className="h-5 w-5 rounded flex items-center justify-center text-emerald-600 hover:bg-emerald-50"
            >
              <CheckCircle2 className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={onCancelEdit}
              className="h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:bg-accent"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <>
            <p className="text-xs font-medium truncate">
              {conversation.title || "New Conversation"}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] text-muted-foreground/70">
                {conversation.messageCount ?? 0} messages
              </span>
              {timeAgo && (
                <>
                  <span className="text-[10px] text-muted-foreground/40">
                    ·
                  </span>
                  <span className="text-[10px] text-muted-foreground/70">
                    {timeAgo}
                  </span>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* Context Menu */}
      {!isEditing && (
        <div
          className="relative"
          ref={menuRef}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => setShowMenu(!showMenu)}
            className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground/50 hover:text-foreground hover:bg-accent opacity-0 group-hover:opacity-100 transition-all"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-8 z-50 w-36 rounded-lg border border-border/50 bg-card shadow-lg py-1">
              <button
                type="button"
                onClick={() => {
                  onStartEdit();
                  setShowMenu(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-foreground hover:bg-accent transition-colors"
              >
                <Edit3 className="h-3 w-3" />
                Rename
              </button>
              <button
                type="button"
                onClick={() => {
                  onDelete();
                  setShowMenu(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="h-3 w-3" />
                Delete
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Helper Functions ─────────────────────────────────────────────────────

function formatTimeAgo(date: Date | string): string {
  const now = new Date();
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function groupConversationsByDate(
  conversations: Array<{
    id: string;
    title: string | null;
    messageCount: number | null;
    lastMessageAt: Date | string | null;
    createdAt: Date | string | null;
  }>,
): Record<string, typeof conversations> {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 7 * 86400000);

  const groups: Record<string, typeof conversations> = {
    Today: [],
    Yesterday: [],
    "Previous 7 days": [],
    Older: [],
  };

  for (const conv of conversations) {
    const date = new Date(conv.lastMessageAt ?? conv.createdAt ?? now);

    if (date >= today) {
      groups["Today"].push(conv);
    } else if (date >= yesterday) {
      groups["Yesterday"].push(conv);
    } else if (date >= weekAgo) {
      groups["Previous 7 days"].push(conv);
    } else {
      groups["Older"].push(conv);
    }
  }

  // Remove empty groups
  const result: Record<string, typeof conversations> = {};
  for (const [key, convs] of Object.entries(groups)) {
    if (convs.length > 0) {
      result[key] = convs;
    }
  }

  return result;
}

// ─── Right Sidebar Component ──────────────────────────────────────────────

function RightSidebar({
  entityId,
  isChatMode,
}: {
  entityId: string | null;
  isChatMode: boolean;
}) {
  const [activeTab, setActiveTab] = useState<
    "approvals" | "documents" | "activity"
  >("approvals");
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Fetch pending approvals
  const { data: approvalsData } = trpc.aiWorkspace.getPendingApprovals.useQuery(
    undefined,
    { enabled: !!entityId },
  );

  // Fetch recent documents
  const { data: documentsData } = trpc.aiWorkspace.getRecentDocuments.useQuery(
    undefined,
    { enabled: !!entityId },
  );

  // Fetch agent activity
  const { data: activityData } = trpc.aiWorkspace.getAgentActivity.useQuery(
    undefined,
    { enabled: !!entityId },
  );

  const pendingApprovals = approvalsData?.approvals ?? [];
  const recentDocuments = documentsData?.documents ?? [];
  const agentActivity = activityData?.activity ?? [];

  if (isCollapsed) {
    return (
      <div className="w-12 border-l bg-card flex flex-col items-center py-3 gap-3">
        <button
          type="button"
          onClick={() => setIsCollapsed(false)}
          className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors relative"
        >
          <ClipboardCheck className="h-4 w-4" />
          {pendingApprovals.length > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-amber-500 text-[9px] font-bold text-white flex items-center justify-center">
              {pendingApprovals.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setIsCollapsed(false)}
          className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
        >
          <FileText className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setIsCollapsed(false)}
          className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
        >
          <Activity className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="w-80 border-l bg-card flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
            <ClipboardCheck className="h-3.5 w-3.5 text-primary" />
          </div>
          <p className="text-xs font-semibold text-foreground">Workspace</p>
        </div>
        <button
          type="button"
          onClick={() => setIsCollapsed(true)}
          className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/50">
        {[
          {
            id: "approvals" as const,
            label: "Approvals",
            count: pendingApprovals.length,
          },
          {
            id: "documents" as const,
            label: "Documents",
            count: recentDocuments.length,
          },
          { id: "activity" as const, label: "Activity", count: null },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-[11px] font-medium transition-colors",
              activeTab === tab.id
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
            {tab.count !== null && tab.count > 0 && (
              <span className="h-4 min-w-[16px] rounded-full bg-primary/10 px-1 text-[9px] font-bold text-primary flex items-center justify-center">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Approvals Tab */}
        {activeTab === "approvals" && (
          <div className="p-3 space-y-2">
            {pendingApprovals.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 mb-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                </div>
                <p className="text-xs font-medium text-foreground">
                  All caught up!
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  No pending approvals
                </p>
              </div>
            ) : (
              pendingApprovals.map((approval) => (
                <div
                  key={approval.id}
                  className="rounded-xl border border-border/50 bg-background p-3 space-y-2"
                >
                  <div className="flex items-start gap-2">
                    <div
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                        approval.type === "journal"
                          ? "bg-blue-100"
                          : approval.type === "invoice"
                            ? "bg-amber-100"
                            : "bg-purple-100",
                      )}
                    >
                      {approval.type === "journal" ? (
                        <FileText className="h-3.5 w-3.5 text-blue-600" />
                      ) : approval.type === "invoice" ? (
                        <CreditCard className="h-3.5 w-3.5 text-amber-600" />
                      ) : (
                        <Shield className="h-3.5 w-3.5 text-purple-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium text-foreground truncate">
                        {approval.title}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {approval.description}
                      </p>
                      {approval.amount && (
                        <p className="text-[10px] font-medium text-foreground mt-1">
                          {approval.amount}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="flex-1 h-7 rounded-lg bg-emerald-500 text-white text-[10px] font-medium hover:bg-emerald-600 transition-colors"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      className="flex-1 h-7 rounded-lg border border-border bg-background text-[10px] font-medium text-foreground hover:bg-accent transition-colors"
                    >
                      Review
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Documents Tab */}
        {activeTab === "documents" && (
          <div className="p-3 space-y-2">
            {recentDocuments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 mb-2">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <p className="text-xs font-medium text-foreground">
                  No documents yet
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Documents created by AI will appear here
                </p>
              </div>
            ) : (
              recentDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="rounded-xl border border-border/50 bg-background p-3 hover:shadow-sm transition-all cursor-pointer"
                >
                  <div className="flex items-start gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium text-foreground truncate">
                        {doc.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {doc.type} · {doc.date}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
                    >
                      <Download className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Activity Tab */}
        {activeTab === "activity" && (
          <div className="p-3">
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-[15px] top-0 bottom-0 w-px bg-border/50" />

              <div className="space-y-3">
                {agentActivity.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 mb-2">
                      <Activity className="h-5 w-5 text-primary" />
                    </div>
                    <p className="text-xs font-medium text-foreground">
                      No activity yet
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Agent actions will appear here
                    </p>
                  </div>
                ) : (
                  agentActivity.map((activity, index) => (
                    <div key={activity.id} className="flex gap-2 relative">
                      <div
                        className={cn(
                          "flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full z-10",
                          activity.status === "completed"
                            ? "bg-emerald-100"
                            : activity.status === "active"
                              ? "bg-primary/10"
                              : "bg-amber-100",
                        )}
                      >
                        {activity.status === "completed" ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        ) : activity.status === "active" ? (
                          <Zap className="h-3.5 w-3.5 text-primary" />
                        ) : (
                          <Clock className="h-3.5 w-3.5 text-amber-600" />
                        )}
                      </div>
                      <div className="flex-1 pb-3">
                        <p className="text-[11px] font-medium text-foreground">
                          {activity.title}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {activity.description}
                        </p>
                        <p className="text-[9px] text-muted-foreground/60 mt-1 flex items-center gap-1">
                          <History className="h-2.5 w-2.5" />
                          {activity.time}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-border/50">
        <button
          type="button"
          className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-accent/50 px-3 py-2 text-[10px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <Eye className="h-3 w-3" />
          View full dashboard
        </button>
      </div>
    </div>
  );
}

// ─── Main AI Workspace Page ───────────────────────────────────────────────

// ─── Chat Messages Component ──────────────────────────────────────────────

function ChatMessages({
  conversationId,
  streamedContent,
  isStreaming,
}: {
  conversationId: string | null;
  streamedContent?: string;
  isStreaming?: boolean;
}) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: messages } = trpc.aiWorkspace.getMessages.useQuery(
    { conversationId: conversationId! },
    { enabled: !!conversationId },
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamedContent]);

  if (!conversationId && !isStreaming) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
          <Bot className="h-8 w-8 text-primary" />
        </div>
        <p className="text-sm font-medium text-foreground">How can I help?</p>
        <p className="text-xs text-muted-foreground mt-1">
          Ask me anything about your accounting
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
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
                  {new Date(msg.createdAt ?? Date.now()).toLocaleTimeString(
                    [],
                    {
                      hour: "2-digit",
                      minute: "2-digit",
                    },
                  )}
                </span>
              </div>
            )}
            <div
              className={cn(
                "max-w-[80%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed",
                msg.role === "user"
                  ? "bg-primary text-white rounded-br-md"
                  : "bg-accent text-foreground rounded-bl-md",
              )}
            >
              {msg.content}
            </div>
            {msg.role === "user" && (
              <span className="text-[10px] text-muted-foreground mt-1">
                {new Date(msg.createdAt ?? Date.now()).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
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
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 mb-3">
            <Bot className="h-6 w-6 text-primary" />
          </div>
          <p className="text-xs font-medium text-foreground">How can I help?</p>
          <p className="text-[10px] text-muted-foreground mt-1">
            Ask me anything about your accounting
          </p>
        </div>
      )}
      {/* Streaming response */}
      {isStreaming && streamedContent && (
        <div className="flex flex-col gap-1 items-start">
          <div className="flex items-center gap-1.5 mb-1">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10">
              <Bot className="h-3 w-3 text-primary" />
            </div>
            <span className="text-[10px] text-muted-foreground">
              Xenboox AI
            </span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-[10px] text-primary">typing...</span>
            </span>
          </div>
          <div className="max-w-[80%] rounded-2xl rounded-bl-md px-4 py-2.5 text-xs leading-relaxed bg-accent text-foreground">
            {streamedContent}
            <span className="inline-block w-0.5 h-3 bg-primary ml-0.5 animate-pulse" />
          </div>
        </div>
      )}
      {/* Typing indicator when streaming starts but no content yet */}
      {isStreaming && !streamedContent && (
        <div className="flex flex-col gap-1 items-start">
          <div className="flex items-center gap-1.5 mb-1">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10">
              <Bot className="h-3 w-3 text-primary" />
            </div>
            <span className="text-[10px] text-muted-foreground">
              Xenboox AI
            </span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-[10px] text-primary">thinking...</span>
            </span>
          </div>
          <div className="max-w-[80%] rounded-2xl rounded-bl-md px-4 py-2.5 text-xs leading-relaxed bg-accent text-foreground">
            <div className="flex items-center gap-1">
              <span
                className="h-2 w-2 rounded-full bg-muted-foreground/30 animate-bounce"
                style={{ animationDelay: "0ms" }}
              />
              <span
                className="h-2 w-2 rounded-full bg-muted-foreground/30 animate-bounce"
                style={{ animationDelay: "150ms" }}
              />
              <span
                className="h-2 w-2 rounded-full bg-muted-foreground/30 animate-bounce"
                style={{ animationDelay: "300ms" }}
              />
            </div>
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}

// ─── Chat Input Component ─────────────────────────────────────────────────

function ChatInput({
  conversationId,
  onSend,
  isPending,
}: {
  conversationId: string | null;
  onSend: (message: string) => void;
  isPending: boolean;
}) {
  const [inputValue, setInputValue] = useState("");

  const quickActions = [
    "Show cash flow forecast",
    "Which invoices are overdue?",
    "Reconcile GTBank account",
    "Create cash flow report",
  ];

  const handleSend = () => {
    if (!inputValue.trim()) return;
    onSend(inputValue);
    setInputValue("");
  };

  return (
    <div className="border-t border-border/50">
      {/* Quick Actions */}
      <div className="px-4 pt-3 pb-2">
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
      <div className="px-4 pb-4">
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
            disabled={!inputValue.trim() || isPending}
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
  );
}

function AIWorkspaceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialConversationId = searchParams?.get("c") ?? null;
  const { entityId } = useEntity();
  const { data: session } = useSession();
  const [inputValue, setInputValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(initialConversationId);
  const [isChatMode, setIsChatMode] = useState(!!initialConversationId);

  const utils = trpc.useUtils();

  // Streaming chat hook
  const {
    sendMessage: sendStreamingMessage,
    isStreaming,
    streamedContent,
  } = useStreamingChat({
    entityId: entityId ?? "",
    onConversationCreated: (convId) => {
      setActiveConversationId(convId);
      setIsChatMode(true);
      router.replace(`/dashboard/chat?c=${convId}`);
      utils.chat.listConversations.invalidate();
    },
    onComplete: () => {
      // Refresh messages after streaming completes
      if (activeConversationId) {
        utils.aiWorkspace.getMessages.invalidate({
          conversationId: activeConversationId,
        });
      }
    },
  });

  // Fetch data
  const { data: tasksData, isLoading: tasksLoading } =
    trpc.aiWorkspace.getActiveTasks.useQuery(undefined, {
      enabled: !!entityId && !isChatMode,
    });

  const { data: suggestionsData, isLoading: suggestionsLoading } =
    trpc.aiWorkspace.getSuggestions.useQuery(undefined, {
      enabled: !!entityId && !isChatMode,
    });

  const { data: insightsData, isLoading: insightsLoading } =
    trpc.aiWorkspace.getFinancialInsights.useQuery(undefined, {
      enabled: !!entityId && !isChatMode,
    });

  const { data: cashFlowData, isLoading: cashFlowLoading } =
    trpc.aiWorkspace.getCashFlowOverview.useQuery(undefined, {
      enabled: !!entityId && !isChatMode,
    });

  const isLoading =
    !isChatMode &&
    (tasksLoading || suggestionsLoading || insightsLoading || cashFlowLoading);

  const suggestions = [
    { label: "Close May books", icon: FileText },
    { label: "Explain cash position", icon: BarChart3 },
    { label: "Reconcile transactions", icon: RefreshCw },
    { label: "Create payroll", icon: Users },
    { label: "Forecast next month", icon: TrendingUp },
    { label: "Analyze expenses", icon: CreditCard },
  ];

  const handleNewChat = () => {
    setActiveConversationId(null);
    setIsChatMode(false);
    setInputValue("");
    router.replace("/dashboard/chat");
  };

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
    setIsChatMode(true);
    router.replace(`/dashboard/chat?c=${id}`);
  };

  const handleCommandSubmit = async () => {
    if (!inputValue.trim() || isStreaming) return;
    sendStreamingMessage(inputValue, activeConversationId ?? undefined);
    setInputValue("");
  };

  const quickActions = [
    "Show cash flow forecast",
    "Which invoices are overdue?",
    "Reconcile GTBank account",
    "Create cash flow report",
  ];

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Conversation Threads - Left Side */}
      <ConversationThreads
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
      />

      {/* Main Content - Center */}
      {isChatMode ? (
        <div className="flex-1 flex flex-col h-full">
          {/* Chat Header */}
          <div className="flex items-center justify-between border-b border-border/50 px-4 py-2">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-primary" />
              <p className="text-xs font-medium text-foreground">
                AI Assistant
              </p>
              <div className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="text-[10px] text-muted-foreground">
                  Active
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleNewChat}
              className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-background px-3 py-1.5 text-xs text-muted-foreground hover:border-primary/30 hover:text-primary hover:bg-primary/5 transition-all"
            >
              <Plus className="h-3 w-3" />
              New Chat
            </button>
          </div>

          {/* Chat Messages Area */}
          <div className="flex-1 overflow-y-auto p-4">
            <ChatMessages
              conversationId={activeConversationId}
              streamedContent={streamedContent}
              isStreaming={isStreaming}
            />
          </div>

          {/* Chat Input */}
          <ChatInput
            conversationId={activeConversationId}
            onSend={(msg) => {
              sendStreamingMessage(msg, activeConversationId ?? undefined);
            }}
            isPending={isStreaming}
          />
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
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
                      summary: {
                        totalCashIn: 0,
                        totalCashOut: 0,
                        netCashFlow: 0,
                      },
                    }
                  }
                />
              </div>
            </div>
          </div>

          {/* Pinned AI Command Box */}
          <div className="border-t border-border/50 bg-background/80 backdrop-blur-sm p-4 flex-shrink-0">
            <div className="mx-auto w-full max-w-3xl space-y-3">
              {/* Quick suggestions above input */}
              <div className="scrollbar-hide flex items-center gap-2 overflow-x-auto py-0.5">
                {suggestions.map((suggestion) => {
                  const Icon = suggestion.icon;
                  return (
                    <button
                      key={suggestion.label}
                      type="button"
                      onClick={() => {
                        if (!isStreaming) {
                          sendStreamingMessage(
                            suggestion.label,
                            activeConversationId ?? undefined,
                          );
                        }
                      }}
                      disabled={isStreaming}
                      className={cn(
                        "inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-border/50 bg-card/80 px-3 py-1.5",
                        "text-xs text-muted-foreground transition-all duration-200",
                        "hover:border-primary/30 hover:text-primary hover:bg-primary/5 hover:shadow-sm",
                        "active:scale-95",
                        isStreaming && "opacity-50 cursor-not-allowed",
                      )}
                    >
                      <Icon className="h-3 w-3" />
                      {suggestion.label}
                    </button>
                  );
                })}
              </div>

              {/* Input */}
              <div
                className={cn(
                  "relative group rounded-2xl border-2 bg-card transition-all duration-300 shadow-sm",
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
                    onKeyDown={(e) =>
                      e.key === "Enter" && handleCommandSubmit()
                    }
                    placeholder="What would you like Xenboox to do?"
                    className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-none"
                  />
                  <Button
                    type="button"
                    size="icon"
                    onClick={handleCommandSubmit}
                    disabled={!inputValue.trim() || isStreaming}
                    className={cn(
                      "h-10 w-10 rounded-xl p-0 transition-all shrink-0",
                      inputValue.trim()
                        ? "bg-primary hover:bg-primary/90 text-white shadow-sm"
                        : "bg-primary text-white",
                    )}
                  >
                    {isStreaming ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowRight className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Right Sidebar - Approvals, Documents, Activity */}
      <RightSidebar entityId={entityId} isChatMode={isChatMode} />
    </div>
  );
}

export default function AIWorkspacePage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[calc(100vh-4rem)]">
          <div className="flex-1 p-6">
            <Skeleton className="h-16 w-96 rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl mt-6" />
          </div>
        </div>
      }
    >
      <AIWorkspaceContent />
    </Suspense>
  );
}
