"use client";

import { useState } from "react";
import {
  Search,
  Filter,
  Download,
  ChevronDown,
  ChevronRight,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Bot,
  ArrowUpRight,
  ArrowDownLeft,
  MoreHorizontal,
  Eye,
  RefreshCw,
  Sparkles,
  Send,
  XCircle,
  Settings,
  Grid,
  List,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────────────────────

type StatusFilter =
  | "all"
  | "needs_review"
  | "matched"
  | "unmatched"
  | "excluded";
type SortBy = "date" | "description" | "amount" | "confidence";

// ─── Summary Cards ─────────────────────────────────────────────────────────

function SummaryCards({
  summary,
}: {
  summary: {
    totalTransactions: number;
    totalTransactionsChange: number;
    aiCategorized: number;
    aiCategorizedPercent: number;
    aiChange: number;
    needsReview: number;
    needsReviewChange: number;
    totalAmount: number;
    amountChange: number;
    matched: number;
    matchedPercent: number;
    matchedChange: number;
  };
}) {
  const cards = [
    {
      label: "Total Transactions",
      value: summary.totalTransactions.toLocaleString(),
      change: summary.totalTransactionsChange,
      icon: List,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
    },
    {
      label: "AI Auto-Categorized",
      value: summary.aiCategorized.toLocaleString(),
      change: summary.aiChange,
      percent: summary.aiCategorizedPercent,
      icon: Bot,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
    {
      label: "Needs Review",
      value: summary.needsReview.toLocaleString(),
      change: summary.needsReviewChange,
      icon: AlertTriangle,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
    },
    {
      label: "Total Amount",
      value: `GMD ${summary.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      change: summary.amountChange,
      icon: ArrowUpRight,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      label: "Matched to Bank",
      value: summary.matched.toLocaleString(),
      change: summary.matchedChange,
      percent: summary.matchedPercent,
      icon: CheckCircle2,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
  ];

  return (
    <div className="grid grid-cols-5 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-xl border border-slate-200 bg-white p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-slate-500">{card.label}</p>
            <div className={cn("rounded-lg p-2", card.bgColor)}>
              <card.icon className={cn("h-4 w-4", card.color)} />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{card.value}</p>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={cn(
                "text-sm font-medium",
                card.change >= 0 ? "text-emerald-600" : "text-red-600",
              )}
            >
              {card.change >= 0 ? "↑" : "↓"} {Math.abs(card.change)}%
            </span>
            {card.percent !== undefined && (
              <span className="text-sm text-slate-500">({card.percent}%)</span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">vs last month</p>
        </div>
      ))}
    </div>
  );
}

// ─── Transaction Table ─────────────────────────────────────────────────────

function TransactionTable({
  transactions,
  selectedId,
  onSelect,
  isLoading,
}: {
  transactions: Array<{
    id: string;
    date: string;
    description: string;
    reference?: string;
    account: string;
    accountCode: string;
    category: string;
    categoryColor: string;
    amount: number;
    amountFormatted: string;
    isPositive: boolean;
    status: string;
    statusLabel: string;
    confidence: number;
  }>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  isLoading: boolean;
}) {
  const statusColors: Record<string, string> = {
    matched: "bg-emerald-100 text-emerald-700",
    needs_review: "bg-amber-100 text-amber-700",
    unmatched: "bg-red-100 text-red-700",
    excluded: "bg-slate-100 text-slate-600",
  };

  const categoryColors: Record<string, string> = {
    blue: "bg-blue-100 text-blue-700",
    green: "bg-emerald-100 text-emerald-700",
    purple: "bg-purple-100 text-purple-700",
    orange: "bg-orange-100 text-orange-700",
    gray: "bg-slate-100 text-slate-600",
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 text-slate-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="text-left py-3 px-4">
              <input type="checkbox" className="rounded border-slate-300" />
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Date
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Description
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Account
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Category (AI)
            </th>
            <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">
              Amount
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Status
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              AI Confidence
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx) => (
            <tr
              key={tx.id}
              onClick={() => onSelect(tx.id)}
              className={cn(
                "border-b border-slate-100 cursor-pointer transition-colors",
                selectedId === tx.id ? "bg-indigo-50" : "hover:bg-slate-50",
              )}
            >
              <td className="py-3 px-4">
                <input type="checkbox" className="rounded border-slate-300" />
              </td>
              <td className="py-3 px-4 text-sm text-slate-600">
                {new Date(tx.date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </td>
              <td className="py-3 px-4">
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {tx.description}
                  </p>
                  {tx.reference && (
                    <p className="text-xs text-slate-400">{tx.reference}</p>
                  )}
                </div>
              </td>
              <td className="py-3 px-4">
                <div>
                  <p className="text-sm text-slate-700">{tx.account}</p>
                  <p className="text-xs text-slate-400">{tx.accountCode}</p>
                </div>
              </td>
              <td className="py-3 px-4">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium",
                    categoryColors[tx.categoryColor] || categoryColors.gray,
                  )}
                >
                  {tx.category}
                </span>
              </td>
              <td className="py-3 px-4 text-right">
                <span
                  className={cn(
                    "text-sm font-medium",
                    tx.isPositive ? "text-emerald-600" : "text-red-600",
                  )}
                >
                  {tx.amountFormatted}
                </span>
              </td>
              <td className="py-3 px-4">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium",
                    statusColors[tx.status] || statusColors.excluded,
                  )}
                >
                  {tx.statusLabel}
                </span>
              </td>
              <td className="py-3 px-4">
                {tx.confidence > 0 ? (
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          tx.confidence >= 90
                            ? "bg-emerald-500"
                            : tx.confidence >= 70
                              ? "bg-amber-500"
                              : "bg-red-500",
                        )}
                        style={{ width: `${tx.confidence}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-600">
                      {tx.confidence}%
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-slate-400">—</span>
                )}
              </td>
              <td className="py-3 px-4">
                <button className="p-1 hover:bg-slate-100 rounded">
                  <MoreHorizontal className="h-4 w-4 text-slate-400" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── AI Transaction Assistant Panel ────────────────────────────────────────

function AiTransactionAssistantPanel({
  transactionDetail,
  aiInsights,
  onApprove,
  onReject,
}: {
  transactionDetail: {
    id: string;
    date: string;
    description: string;
    reference?: string;
    amount: number;
    amountFormatted: string;
    isPositive: boolean;
    status: string;
    statusLabel: string;
    confidence: number;
    bankAccount?: { name: string; number: string; bank: string } | null;
    account?: { code: string; name: string; type: string } | null;
    category: string;
    journalEntry?: {
      entryNumber: number;
      description: string;
      status: string;
    } | null;
  } | null;
  aiInsights: Array<{
    id: string;
    type: "warning" | "info" | "success";
    title: string;
    description: string;
    actionLabel: string;
  }>;
  onApprove: () => void;
  onReject: () => void;
}) {
  const [message, setMessage] = useState("");

  const quickActions = [
    "Why is this categorized this way?",
    "Show similar transactions",
    "Find duplicate payments",
    "Summarize by category",
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
                AI Transaction Assistant
              </h3>
              <span className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                24 pending
              </span>
            </div>
          </div>
          <button className="text-slate-400 hover:text-slate-600">
            <MoreHorizontal className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Review These Transactions */}
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
          <h4 className="font-medium text-slate-900 mb-2">
            Review These Transactions
          </h4>
          <p className="text-sm text-slate-600 mb-3">
            24 transactions need your review and approval.
          </p>
          <button className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700">
            Review Now →
          </button>
        </div>

        {/* AI Insights */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-slate-900">AI Insights</h4>
            <button className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
              View all →
            </button>
          </div>
          <div className="space-y-3">
            {aiInsights.map((insight) => (
              <div
                key={insight.id}
                className={cn(
                  "rounded-lg border p-3",
                  insight.type === "warning"
                    ? "border-amber-200 bg-amber-50"
                    : insight.type === "success"
                      ? "border-emerald-200 bg-emerald-50"
                      : "border-blue-200 bg-blue-50",
                )}
              >
                <div className="flex items-start gap-2">
                  <div
                    className={cn(
                      "h-5 w-5 rounded-full flex items-center justify-center mt-0.5",
                      insight.type === "warning"
                        ? "bg-amber-100"
                        : insight.type === "success"
                          ? "bg-emerald-100"
                          : "bg-blue-100",
                    )}
                  >
                    {insight.type === "warning" ? (
                      <AlertTriangle className="h-3 w-3 text-amber-600" />
                    ) : insight.type === "success" ? (
                      <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                    ) : (
                      <Bot className="h-3 w-3 text-blue-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">
                      {insight.title}
                    </p>
                    <p className="text-xs text-slate-600 mt-1">
                      {insight.description}
                    </p>
                    <button className="text-xs font-medium text-indigo-600 hover:text-indigo-700 mt-2">
                      {insight.actionLabel} →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Transaction Details */}
        {transactionDetail && (
          <div className="rounded-xl border border-slate-200 p-4">
            <h4 className="font-medium text-slate-900 mb-3">
              Transaction Details
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900">
                    {transactionDetail.description}
                  </p>
                  <p className="text-sm text-slate-500">
                    {new Date(transactionDetail.date).toLocaleDateString(
                      "en-US",
                      {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      },
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={cn(
                      "text-lg font-bold",
                      transactionDetail.isPositive
                        ? "text-emerald-600"
                        : "text-red-600",
                    )}
                  >
                    {transactionDetail.amountFormatted}
                  </p>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                      transactionDetail.status === "matched"
                        ? "bg-emerald-100 text-emerald-700"
                        : transactionDetail.status === "needs_review"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-red-100 text-red-700",
                    )}
                  >
                    {transactionDetail.statusLabel}
                  </span>
                </div>
              </div>

              {transactionDetail.bankAccount && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Account</span>
                    <span className="font-medium text-slate-900">
                      {transactionDetail.bankAccount.name}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Suggested Category</span>
                    <span className="font-medium text-slate-900">
                      {transactionDetail.category}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">AI Confidence</span>
                    <span className="font-medium text-slate-900">
                      {transactionDetail.confidence}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Matched Bank</span>
                    <span className="font-medium text-slate-900">
                      {transactionDetail.bankAccount.bank} ****{" "}
                      {transactionDetail.bankAccount.number.slice(-4)}
                    </span>
                  </div>
                </div>
              )}

              {transactionDetail.journalEntry && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <p className="text-sm font-medium text-slate-900 mb-2">
                    Why this category?
                  </p>
                  <p className="text-sm text-slate-600">
                    This appears to be a{" "}
                    {transactionDetail.category.toLowerCase()} expense based on
                    the description and vendor.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {transactionDetail && (
        <div className="border-t border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onApprove}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
            >
              <CheckCircle2 className="h-4 w-4" />
              Approve
            </button>
            <button
              onClick={onReject}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Change
            </button>
            <button className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
              <Bot className="h-4 w-4" />
              Ask AI
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-slate-200 p-4">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask Xenboox AI anything about these transactions..."
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <button className="h-9 w-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white hover:bg-indigo-700">
            <Send className="h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {quickActions.map((action, i) => (
            <button
              key={i}
              className="text-xs text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded"
            >
              {action}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function TransactionsPage() {
  const [activeTab, setActiveTab] = useState<StatusFilter>("all");
  const [sortBy, setSortBy] = useState<SortBy>("date");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTransactionId, setSelectedTransactionId] = useState<
    string | null
  >(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  // Fetch summary
  const { data: summary } = trpc.transactions.getSummary.useQuery({});

  // Fetch transactions
  const { data: transactionsData, isLoading: transactionsLoading } =
    trpc.transactions.listTransactions.useQuery({
      status: activeTab,
      sortBy,
      search: searchQuery || undefined,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });

  // Fetch selected transaction detail
  const { data: transactionDetail } =
    trpc.transactions.getTransactionDetail.useQuery(
      { transactionId: selectedTransactionId ?? "" },
      { enabled: !!selectedTransactionId },
    );

  // Fetch AI insights
  const { data: aiInsights } = trpc.transactions.getAiInsights.useQuery({});

  // Fetch accounts for filters
  const { data: accounts } = trpc.transactions.getAccounts.useQuery();

  // Approve/Reject mutations
  const approveMutation = trpc.transactions.approveTransaction.useMutation();
  const rejectMutation = trpc.transactions.rejectTransaction.useMutation();

  const handleApprove = async () => {
    if (!selectedTransactionId) return;
    await approveMutation.mutateAsync({ transactionId: selectedTransactionId });
    setSelectedTransactionId(null);
  };

  const handleReject = async () => {
    if (!selectedTransactionId) return;
    await rejectMutation.mutateAsync({ transactionId: selectedTransactionId });
    setSelectedTransactionId(null);
  };

  const tabs = [
    { key: "all" as StatusFilter, label: "All Transactions" },
    {
      key: "needs_review" as StatusFilter,
      label: "Needs Review",
      count: summary?.needsReview,
    },
    {
      key: "matched" as StatusFilter,
      label: "Matched",
      count: summary?.matched,
    },
    {
      key: "unmatched" as StatusFilter,
      label: "Unmatched",
      count: transactionsData?.totalCount
        ? transactionsData.totalCount - (summary?.matched ?? 0)
        : undefined,
    },
    { key: "excluded" as StatusFilter, label: "Excluded" },
  ];

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Transactions
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                All your business transactions in one place. AI categorization
                and reconciliation.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                <Calendar className="h-4 w-4" />
                May 1 – May 31, 2025
                <ChevronDown className="h-4 w-4" />
              </button>
              <button className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                <Filter className="h-4 w-4" />
                Filters
              </button>
              <button className="rounded-lg border border-slate-200 bg-white p-2 hover:bg-slate-50">
                <Settings className="h-4 w-4 text-slate-600" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 border-b border-slate-200 -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
                  activeTab === tab.key
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-500 hover:text-slate-700",
                )}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span
                    className={cn(
                      "ml-2 px-2 py-0.5 rounded-full text-xs",
                      activeTab === tab.key
                        ? "bg-indigo-100 text-indigo-700"
                        : "bg-slate-100 text-slate-600",
                    )}
                  >
                    {tab.count.toLocaleString()}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="p-4 bg-slate-50 border-b border-slate-200">
            <SummaryCards summary={summary} />
          </div>
        )}

        {/* Search and Filters */}
        <div className="p-4 bg-white border-b border-slate-200">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search transactions..."
                className="w-full rounded-lg border border-slate-200 pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <select className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option>All Accounts</option>
              {accounts?.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name}
                </option>
              ))}
            </select>
            <select className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option>All Categories</option>
            </select>
            <select className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option>All Types</option>
              <option>Deposit</option>
              <option>Withdrawal</option>
              <option>Transfer</option>
              <option>Fee</option>
            </select>
            <select className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option>All Status</option>
              <option>Matched</option>
              <option>Needs Review</option>
              <option>Unmatched</option>
            </select>
            <button className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              More
              <ChevronDown className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-1 border border-slate-200 rounded-lg">
              <button className="p-2 hover:bg-slate-50 rounded-l-lg">
                <List className="h-4 w-4 text-slate-600" />
              </button>
              <button className="p-2 hover:bg-slate-50">
                <Grid className="h-4 w-4 text-slate-400" />
              </button>
              <button className="p-2 hover:bg-slate-50 rounded-r-lg border-l border-slate-200">
                <Download className="h-4 w-4 text-slate-400" />
              </button>
            </div>
          </div>
        </div>

        {/* Transaction Table */}
        <div className="flex-1 overflow-auto bg-white">
          <TransactionTable
            transactions={transactionsData?.transactions ?? []}
            selectedId={selectedTransactionId}
            onSelect={setSelectedTransactionId}
            isLoading={transactionsLoading}
          />
        </div>

        {/* Pagination */}
        <div className="border-t border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Showing {(page - 1) * pageSize + 1} to{" "}
              {Math.min(page * pageSize, transactionsData?.totalCount ?? 0)} of{" "}
              {(transactionsData?.totalCount ?? 0).toLocaleString()} results
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 rounded disabled:opacity-50"
              >
                ←
              </button>
              {Array.from(
                { length: Math.min(5, transactionsData?.totalPages ?? 1) },
                (_, i) => i + 1,
              ).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={cn(
                    "px-3 py-1.5 text-sm rounded",
                    page === p
                      ? "bg-indigo-600 text-white"
                      : "text-slate-600 hover:bg-slate-50",
                  )}
                >
                  {p}
                </button>
              ))}
              <button className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 rounded">
                ...
              </button>
              <button
                onClick={() =>
                  setPage(Math.min(transactionsData?.totalPages ?? 1, page + 1))
                }
                disabled={page === (transactionsData?.totalPages ?? 1)}
                className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 rounded disabled:opacity-50"
              >
                →
              </button>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPage(1);
                }}
                className="ml-4 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value={10}>10 / page</option>
                <option value={25}>25 / page</option>
                <option value={50}>50 / page</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* AI Transaction Assistant Panel */}
      <div className="w-[360px]">
        <AiTransactionAssistantPanel
          transactionDetail={transactionDetail ?? null}
          aiInsights={aiInsights ?? []}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      </div>
    </div>
  );
}
