"use client";

import { useState } from "react";
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  FileText,
  CreditCard,
  Building2,
  Filter,
  ChevronDown,
  RefreshCw,
  MoreHorizontal,
  ExternalLink,
  Send,
  ChevronRight,
  Bot,
} from "lucide-react";

import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────────────────────

type FilterType =
  | "all"
  | "needs_approval"
  | "ai_review"
  | "information"
  | "completed"
  | "rejected";
type SortType = "newest" | "oldest" | "priority" | "amount";

// ─── Summary Cards ─────────────────────────────────────────────────────────

function SummaryCards({
  counts,
  activeFilter,
  onFilterChange,
}: {
  counts: {
    allItems: number;
    needsApproval: number;
    aiReview: number;
    information: number;
    completed: number;
    rejected: number;
  };
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
}) {
  const cards = [
    {
      label: "All Items",
      value: counts.allItems,
      icon: FileText,
      filter: "all" as FilterType,
      color: "text-slate-600",
      bgColor: "bg-slate-50",
      borderColor: "border-slate-200",
    },
    {
      label: "Needs Approval",
      value: counts.needsApproval,
      icon: Clock,
      filter: "needs_approval" as FilterType,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
      borderColor: "border-amber-200",
    },
    {
      label: "AI Review",
      value: counts.aiReview,
      icon: Bot,
      filter: "ai_review" as FilterType,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
    },
    {
      label: "Information",
      value: counts.information,
      icon: AlertTriangle,
      filter: "information" as FilterType,
      color: "text-slate-500",
      bgColor: "bg-slate-50",
      borderColor: "border-slate-200",
    },
    {
      label: "Completed",
      value: counts.completed,
      icon: CheckCircle2,
      filter: "completed" as FilterType,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
      borderColor: "border-emerald-200",
    },
    {
      label: "Rejected",
      value: counts.rejected,
      icon: XCircle,
      filter: "rejected" as FilterType,
      color: "text-red-600",
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
    },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {cards.map((card) => (
        <button
          key={card.filter}
          onClick={() => onFilterChange(card.filter)}
          className={cn(
            "flex items-center gap-3 rounded-xl border px-4 py-3 transition-all duration-200",
            activeFilter === card.filter
              ? `${card.bgColor} ${card.borderColor} shadow-sm`
              : "border-slate-200 bg-white hover:bg-slate-50",
          )}
        >
          <div className={cn("rounded-lg p-2", card.bgColor)}>
            <card.icon className={cn("h-4 w-4", card.color)} />
          </div>
          <div className="text-left">
            <p className="text-xs text-slate-500">{card.label}</p>
            <p className="text-lg font-semibold text-slate-900">{card.value}</p>
          </div>
        </button>
      ))}
    </div>
  );
}

// ─── Approval List Item ────────────────────────────────────────────────────

function ApprovalListItem({
  item,
  isSelected,
  onSelect,
}: {
  item: {
    id: string;
    type: string;
    title: string;
    subtitle: string;
    amount: string;
    priority: "high" | "medium" | "low";
    status: string;
    createdAt: string;
  };
  isSelected: boolean;
  onSelect: () => void;
}) {
  const priorityColors = {
    high: "bg-red-100 text-red-700",
    medium: "bg-amber-100 text-amber-700",
    low: "bg-slate-100 text-slate-600",
  };

  const typeIcons: Record<string, React.ElementType> = {
    journal_entry: FileText,
    agent_escalation: Bot,
    invoice: CreditCard,
    payment: CreditCard,
  };

  const Icon = typeIcons[item.type] || FileText;

  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full text-left p-4 rounded-xl border transition-all duration-200",
        isSelected
          ? "border-indigo-300 bg-indigo-50 shadow-sm"
          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm",
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
            item.type === "agent_escalation" ? "bg-blue-100" : "bg-slate-100",
          )}
        >
          <Icon
            className={cn(
              "h-5 w-5",
              item.type === "agent_escalation"
                ? "text-blue-600"
                : "text-slate-600",
            )}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-slate-900 truncate">{item.title}</p>
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                priorityColors[item.priority],
              )}
            >
              {item.priority.charAt(0).toUpperCase() + item.priority.slice(1)}
            </span>
          </div>
          <p className="text-sm text-slate-500 truncate mt-0.5">
            {item.subtitle}
          </p>
        </div>
        <div className="text-right shrink-0">
          {item.amount !== "—" && (
            <p className="text-sm font-semibold text-slate-900">
              {item.amount}
            </p>
          )}
          <p className="text-xs text-slate-400 mt-1">
            {new Date(item.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </p>
        </div>
      </div>
    </button>
  );
}

// ─── Approval Detail ───────────────────────────────────────────────────────

function ApprovalDetail({
  detail,
  onApprove,
  onReject,
  isProcessing,
}: {
  detail: {
    id: string;
    type: string;
    title: string;
    status: string;
    priority: string;
    confidence: number;
    aiExplanation: string;
    checkItems: string[];
    supportingDocuments: Array<{ name: string; type: string }>;
    activityTimeline: Array<{
      timestamp: string;
      action: string;
      detail: string;
    }>;
    metadata: Record<string, unknown>;
  } | null;
  onApprove: () => void;
  onReject: () => void;
  isProcessing: boolean;
}) {
  if (!detail) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
          <FileText className="h-8 w-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-medium text-slate-900">Select an item</h3>
        <p className="text-sm text-slate-500 mt-1">
          Choose an item from the list to view details
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-slate-200 p-4">
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
          <span>Inbox</span>
          <ChevronRight className="h-4 w-4" />
          <span>{detail.title}</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              {detail.title}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">
                <Bot className="h-3 w-3 mr-1" />
                AI Pre-approved
              </span>
              <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
                {detail.confidence * 100}% Confidence
              </span>
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium",
                  detail.priority === "high"
                    ? "bg-red-100 text-red-700"
                    : detail.priority === "medium"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-slate-100 text-slate-600",
                )}
              >
                {detail.priority === "high"
                  ? "High Priority"
                  : detail.priority === "medium"
                    ? "Medium"
                    : "Low"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50">
              <MoreHorizontal className="h-4 w-4 text-slate-600" />
            </button>
            <button className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
              <Bot className="h-4 w-4" />
              Ask AI
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* AI Explanation */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="font-medium text-slate-900 mb-2">AI Explanation</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            {detail.aiExplanation}
          </p>
          <div className="mt-4 space-y-2">
            {detail.checkItems.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span className="text-sm text-slate-700">{item}</span>
              </div>
            ))}
          </div>
          <button className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700">
            View full analysis
            <ExternalLink className="h-3 w-3" />
          </button>
        </div>

        {/* Supporting Documents */}
        {detail.supportingDocuments.length > 0 && (
          <div className="rounded-xl border border-slate-200 p-4">
            <h3 className="font-medium text-slate-900 mb-3">
              Supporting Documents
            </h3>
            <div className="space-y-2">
              {detail.supportingDocuments.map((doc, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-lg border border-slate-100 bg-white p-3 hover:bg-slate-50"
                >
                  <FileText className="h-5 w-5 text-slate-400" />
                  <span className="flex-1 text-sm text-slate-700">
                    {doc.name}
                  </span>
                  <span className="text-xs text-slate-400">{doc.type}</span>
                </div>
              ))}
            </div>
            <button className="mt-3 text-sm font-medium text-indigo-600 hover:text-indigo-700">
              View all documents ({detail.supportingDocuments.length})
            </button>
          </div>
        )}

        {/* AI Agent Activity */}
        <div className="rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-slate-900">AI Agent Activity</h3>
            <button className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
              View full log
            </button>
          </div>
          <div className="space-y-4">
            {detail.activityTimeline.map((event, i) => (
              <div key={i} className="flex gap-3">
                <div className="relative">
                  <div className="h-2.5 w-2.5 rounded-full bg-indigo-500 mt-1.5" />
                  {i < detail.activityTimeline.length - 1 && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 w-px h-full bg-slate-200" />
                  )}
                </div>
                <div className="flex-1 pb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-900">
                      {new Date(event.timestamp).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    <span className="text-xs text-slate-400">
                      {new Date(event.timestamp).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-slate-700">
                    {event.action}
                  </p>
                  <p className="text-sm text-slate-500">{event.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="border-t border-slate-200 p-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onApprove}
            disabled={isProcessing}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            <CheckCircle2 className="h-4 w-4" />
            Approve
          </button>
          <button
            onClick={onReject}
            disabled={isProcessing}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            <XCircle className="h-4 w-4" />
            Reject
          </button>
          <button className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
            <Bot className="h-4 w-4" />
            Ask AI to Explain
          </button>
          <button className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
            More Actions
            <ChevronDown className="h-4 w-4 ml-1 inline" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── AI Assistant Panel ────────────────────────────────────────────────────

function AiAssistantPanel({
  vendorInsights,
  cashImpact,
  recentConversations,
}: {
  vendorInsights: {
    vendorName: string;
    since: string;
    totalPaid: number;
    onTimePayments: number;
    thisYear: number;
  } | null;
  cashImpact: {
    availableCash: number;
    afterPayment: number;
    impact: number;
  } | null;
  recentConversations: Array<{
    id: string;
    title: string;
    lastMessageAt: string | null;
  }>;
}) {
  const [message, setMessage] = useState("");

  const quickActions = [
    "Summarize this payment",
    "What is this for?",
    "Check vendor history",
    "Show cash impact",
    "Compare with previous payments",
  ];

  return (
    <div className="h-full flex flex-col bg-white border-l border-slate-200">
      {/* Header */}
      <div className="border-b border-slate-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="font-medium text-slate-900">
                Xenboox AI Assistant
              </h3>
              <span className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                Beta
              </span>
            </div>
          </div>
          <button className="text-slate-400 hover:text-slate-600">
            <XCircle className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Greeting */}
        <div>
          <h4 className="font-medium text-slate-900">Hello Famara! 👋</h4>
          <p className="text-sm text-slate-500 mt-1">
            How can I help with this approval?
          </p>
        </div>

        {/* Quick Actions */}
        <div className="space-y-2">
          {quickActions.map((action, i) => (
            <button
              key={i}
              className="w-full text-left rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              {action}
            </button>
          ))}
        </div>

        {/* Vendor Insights */}
        {vendorInsights && (
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-slate-900">Vendor Insights</h4>
              <button className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
                View full profile →
              </button>
            </div>
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="font-medium text-slate-900">
                  {vendorInsights.vendorName}
                </p>
                <p className="text-xs text-slate-500">
                  Vendor since {vendorInsights.since}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Total paid</span>
                <span className="font-medium text-slate-900">
                  GMD {vendorInsights.totalPaid.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">On-time payments</span>
                <span className="font-medium text-slate-900">
                  {vendorInsights.onTimePayments}%
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">This year</span>
                <span className="font-medium text-slate-900">
                  GMD {vendorInsights.thisYear.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Cash Impact */}
        {cashImpact && (
          <div className="rounded-xl border border-slate-200 p-4">
            <h4 className="font-medium text-slate-900 mb-3">Cash Impact</h4>
            <p className="text-xs text-slate-500 mb-3">
              This payment will affect your cash position
            </p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Available cash (now)</span>
                <span className="font-medium text-slate-900">
                  GMD {cashImpact.availableCash.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">After this payment</span>
                <span className="font-medium text-slate-900">
                  GMD {cashImpact.afterPayment.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Impact</span>
                <span className="font-medium text-red-600">
                  GMD {cashImpact.impact.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Recent Conversations */}
        {recentConversations.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-slate-900">
                Recent Conversations
              </h4>
              <button className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
                View all →
              </button>
            </div>
            <div className="space-y-2">
              {recentConversations.map((conv) => (
                <button
                  key={conv.id}
                  className="w-full text-left rounded-lg border border-slate-100 p-3 hover:bg-slate-50 transition-colors"
                >
                  <p className="text-sm text-slate-700 truncate">
                    {conv.title}
                  </p>
                  {conv.lastMessageAt && (
                    <p className="text-xs text-slate-400 mt-1">
                      {new Date(conv.lastMessageAt).toLocaleDateString(
                        "en-US",
                        {
                          month: "short",
                          day: "numeric",
                        },
                      )}
                    </p>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-slate-200 p-4">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask anything about this..."
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <button className="h-9 w-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white hover:bg-indigo-700">
            <Send className="h-4 w-4" />
          </button>
        </div>
        <p className="text-xs text-slate-400 mt-2 text-center">
          AI can make mistakes. Verify important info.
        </p>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function InboxPage() {
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [sortBy, _setSortBy] = useState<SortType>("newest");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedItemType, setSelectedItemType] =
    useState<string>("journal_entry");

  // Fetch summary counts
  const { data: summaryCounts, isLoading: countsLoading } =
    trpc.inbox.getSummaryCounts.useQuery();

  // Fetch approval list
  const { data: approvalsData, isLoading: approvalsLoading } =
    trpc.inbox.listApprovals.useQuery({
      filter: activeFilter,
      sort: sortBy,
      limit: 20,
      offset: 0,
    });

  // Fetch approval detail
  const { data: approvalDetail, isLoading: detailLoading } =
    trpc.inbox.getApprovalDetail.useQuery(
      { itemId: selectedItemId ?? "", itemType: selectedItemType as any },
      { enabled: !!selectedItemId },
    );

  // Fetch vendor insights
  const { data: vendorInsights } = trpc.inbox.getVendorInsights.useQuery({});

  // Fetch cash impact
  const { data: cashImpact } = trpc.inbox.getCashImpact.useQuery({});

  // Fetch recent conversations
  const { data: recentConversations } =
    trpc.inbox.getRecentConversations.useQuery();

  // Approve/Reject mutations
  const approveMutation = trpc.inbox.approveItem.useMutation();
  const rejectMutation = trpc.inbox.rejectItem.useMutation();

  const handleApprove = async () => {
    if (!selectedItemId) return;
    await approveMutation.mutateAsync({
      itemId: selectedItemId,
      itemType: selectedItemType as any,
    });
    setSelectedItemId(null);
  };

  const handleReject = async () => {
    if (!selectedItemId) return;
    await rejectMutation.mutateAsync({
      itemId: selectedItemId,
      itemType: selectedItemType as any,
    });
    setSelectedItemId(null);
  };

  const handleSelectItem = (id: string, type: string) => {
    setSelectedItemId(id);
    setSelectedItemType(type);
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Inbox & Approvals
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Review and approve AI-prepared work with confidence.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                <Filter className="h-4 w-4" />
                Filters
                <ChevronDown className="h-4 w-4" />
              </button>
              <button className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                Sort: {sortBy === "newest" ? "Newest" : sortBy}
                <ChevronDown className="h-4 w-4" />
              </button>
              <button className="rounded-lg border border-slate-200 bg-white p-2 hover:bg-slate-50">
                <RefreshCw className="h-4 w-4 text-slate-600" />
              </button>
            </div>
          </div>

          {/* Summary Cards */}
          {summaryCounts && (
            <SummaryCards
              counts={summaryCounts}
              activeFilter={activeFilter}
              onFilterChange={setActiveFilter}
            />
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Approval List */}
          <div className="w-[400px] border-r border-slate-200 bg-slate-50 overflow-y-auto">
            <div className="p-4">
              <h2 className="font-medium text-slate-900 mb-3">
                Needs Your Approval ({summaryCounts?.needsApproval ?? 0})
              </h2>
              <div className="space-y-2">
                {approvalsData?.items.map((item) => (
                  <ApprovalListItem
                    key={item.id}
                    item={item}
                    isSelected={selectedItemId === item.id}
                    onSelect={() => handleSelectItem(item.id, item.type)}
                  />
                ))}
              </div>
              {approvalsData && approvalsData.items.length > 0 && (
                <button className="w-full mt-4 text-center text-sm font-medium text-indigo-600 hover:text-indigo-700">
                  Load more
                </button>
              )}
            </div>
          </div>

          {/* Approval Detail */}
          <div className="flex-1 bg-white">
            <ApprovalDetail
              detail={approvalDetail ?? null}
              onApprove={handleApprove}
              onReject={handleReject}
              isProcessing={
                approveMutation.isPending || rejectMutation.isPending
              }
            />
          </div>
        </div>
      </div>

      {/* AI Assistant Panel */}
      <div className="w-[320px]">
        <AiAssistantPanel
          vendorInsights={vendorInsights ?? null}
          cashImpact={cashImpact ?? null}
          recentConversations={recentConversations ?? []}
        />
      </div>
    </div>
  );
}
