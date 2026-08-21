"use client";

import { useState } from "react";
import {
  Search,
  Filter,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  Bot,
  Send,
  Upload,
  Settings,
  ArrowRight,
  Clock,
  Sparkles,
  FileText,
} from "lucide-react";

import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { AiSimulationTrigger } from "@/components/ai-ux/simulation-trigger";

// ─── Summary Cards ─────────────────────────────────────────────────────────

function SummaryCards({
  summary,
}: {
  summary: {
    statementBalance: number;
    statementBalanceFormatted: string;
    bookBalance: number;
    bookBalanceFormatted: string;
    difference: number;
    differenceFormatted: string;
    differencePercent: number;
    matchedCount: number;
    matchedAmount: number;
    matchedAmountFormatted: string;
    matchedPercent: number;
    unmatchedCount: number;
    unmatchedAmount: number;
    unmatchedAmountFormatted: string;
    autoMatchedCount: number;
    autoMatchedPercent: number;
  };
}) {
  const cards = [
    {
      label: "Statement Balance",
      value: summary.statementBalanceFormatted,
      icon: FileText,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
    },
    {
      label: "Book Balance",
      value: summary.bookBalanceFormatted,
      icon: FileText,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      label: "Difference",
      value: summary.differenceFormatted,
      subtitle: `${summary.differencePercent}% of statement`,
      icon: AlertTriangle,
      color: summary.difference === 0 ? "text-emerald-600" : "text-red-600",
      bgColor: summary.difference === 0 ? "bg-emerald-50" : "bg-red-50",
    },
    {
      label: "Matched",
      value: summary.matchedCount.toString(),
      subtitle: `${summary.matchedAmountFormatted} (${summary.matchedPercent}%)`,
      icon: CheckCircle2,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
    {
      label: "Unmatched",
      value: summary.unmatchedCount.toString(),
      subtitle: summary.unmatchedAmountFormatted,
      icon: AlertTriangle,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
    },
    {
      label: "Auto-Matched",
      value: summary.autoMatchedCount.toString(),
      subtitle: `${summary.autoMatchedPercent}% of matched`,
      icon: Sparkles,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
  ];

  return (
    <div className="grid grid-cols-6 gap-4">
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
          <p className="text-lg font-bold text-slate-900">{card.value}</p>
          {card.subtitle && (
            <p className="text-xs text-slate-400 mt-1">{card.subtitle}</p>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Transaction Table ─────────────────────────────────────────────────────

function TransactionTable({
  matched,
  unmatched,
  activeTab,
}: {
  matched: Array<{
    id: string;
    date: string;
    description: string;
    statementAmount: number;
    statementFormatted: string;
    bookAmount: number | null;
    bookFormatted: string | null;
    matchStatus: string;
    matchColor: string;
    confidence: number;
  }>;
  unmatched: Array<{
    id: string;
    date: string;
    description: string;
    statementAmount: number;
    statementFormatted: string;
    bookAmount: number | null;
    bookFormatted: string | null;
    matchStatus: string;
    matchColor: string;
    confidence: number;
  }>;
  activeTab: string;
}) {
  const statusColors: Record<string, string> = {
    Matched: "text-emerald-600",
    Unmatched: "text-amber-600",
    "Auto-Matched": "text-blue-600",
  };

  const showMatched = activeTab === "all" || activeTab === "matched";
  const showUnmatched = activeTab === "all" || activeTab === "unmatched";

  return (
    <div className="overflow-x-auto">
      {/* Header */}
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="text-left py-3 px-4 w-10">
              <input type="checkbox" className="rounded border-slate-300" />
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Date
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Description
            </th>
            <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">
              Statement (GMD)
            </th>
            <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">
              Book (GMD)
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Match Status
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Confidence
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {/* Matched Transactions */}
          {showMatched && matched.length > 0 && (
            <>
              <tr className="bg-emerald-50">
                <td colSpan={8} className="py-2 px-4">
                  <span className="text-sm font-medium text-emerald-700">
                    Matched Transactions ({matched.length})
                  </span>
                </td>
              </tr>
              {matched.map((tx) => (
                <tr
                  key={tx.id}
                  className="border-b border-slate-100 hover:bg-slate-50"
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="rounded border-slate-300"
                      />
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-600">
                    {new Date(tx.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-900">
                    {tx.description}
                  </td>
                  <td className="py-3 px-4 text-right text-sm font-medium text-slate-900">
                    {tx.statementFormatted}
                  </td>
                  <td className="py-3 px-4 text-right text-sm font-medium text-slate-900">
                    {tx.bookFormatted}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={cn(
                        "inline-flex items-center text-xs font-medium",
                        statusColors[tx.matchStatus],
                      )}
                    >
                      {tx.matchStatus === "Matched" && "✓ "}
                      {tx.matchStatus}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-600">
                    {tx.confidence}%
                  </td>
                  <td className="py-3 px-4">
                    <button className="p-1 hover:bg-slate-100 rounded">
                      <span className="text-slate-400">···</span>
                    </button>
                  </td>
                </tr>
              ))}
            </>
          )}

          {/* Unmatched Transactions */}
          {showUnmatched && unmatched.length > 0 && (
            <>
              <tr className="bg-amber-50">
                <td colSpan={8} className="py-2 px-4">
                  <span className="text-sm font-medium text-amber-700">
                    Unmatched Transactions ({unmatched.length})
                  </span>
                </td>
              </tr>
              {unmatched.map((tx) => (
                <tr
                  key={tx.id}
                  className="border-b border-slate-100 hover:bg-slate-50"
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="rounded border-slate-300"
                      />
                      <div className="h-4 w-4 rounded-full bg-amber-100 flex items-center justify-center">
                        <div className="h-2 w-2 rounded-full bg-amber-500" />
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-600">
                    {new Date(tx.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-900">
                    {tx.description}
                  </td>
                  <td className="py-3 px-4 text-right text-sm font-medium text-slate-900">
                    {tx.statementFormatted}
                  </td>
                  <td className="py-3 px-4 text-right text-sm text-slate-400">
                    —
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center text-xs font-medium text-amber-600">
                      {tx.matchStatus}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-400">—</td>
                  <td className="py-3 px-4">
                    <button className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100">
                      Match
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── AI Match Suggestions ──────────────────────────────────────────────────

function AiMatchSuggestions({
  suggestions,
}: {
  suggestions: Array<{
    id: string;
    date: string;
    description: string;
    statementAmount: number;
    statementFormatted: string;
    suggestedMatches: Array<{
      id: string;
      description: string;
      reference: string;
      date: string;
      amount: number;
      confidence: number;
    }>;
  }>;
}) {
  if (suggestions.length === 0) return null;

  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-medium text-slate-900">
            AI Match Suggestions ({suggestions.length})
          </h4>
          <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
            High Confidence
          </span>
        </div>
        <button className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-white rounded-lg border border-indigo-200 hover:bg-indigo-50">
          Accept All
        </button>
      </div>

      <div className="space-y-3">
        {suggestions.map((suggestion) => (
          <div
            key={suggestion.id}
            className="bg-white rounded-lg p-3 border border-slate-200"
          >
            <div className="flex items-center gap-4">
              <input
                type="checkbox"
                className="rounded border-slate-300"
                defaultChecked
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-900">
                    {suggestion.description}
                  </span>
                  <span className="text-xs text-slate-500">
                    {suggestion.statementFormatted}
                  </span>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400" />
              {suggestion.suggestedMatches.map((match) => (
                <div key={match.id} className="flex items-center gap-2">
                  <div>
                    <p className="text-sm text-slate-700">
                      {match.description}
                    </p>
                    <p className="text-xs text-slate-500">
                      {match.reference} • {match.date}
                    </p>
                  </div>
                  <span className="text-xs font-medium text-emerald-600">
                    {match.confidence}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button className="mt-3 text-xs font-medium text-indigo-600 hover:text-indigo-700">
        View all suggestions →
      </button>
    </div>
  );
}

// ─── AI Copilot Panel ──────────────────────────────────────────────────────

function AiCopilotPanel({
  insights,
  summary,
  transactionDetail,
}: {
  insights: Array<{
    id: string;
    type: "warning" | "info" | "success";
    title: string;
    description: string;
    actionLabel: string;
  }>;
  summary: {
    matchedCount: number;
    matchedAmount: number;
    matchedAmountFormatted: string;
    matchedPercent: number;
    unmatchedCount: number;
    unmatchedAmount: number;
    unmatchedAmountFormatted: string;
    autoMatchedCount: number;
    autoMatchedPercent: number;
  };
  transactionDetail: {
    description: string;
    date: string;
    amount: number;
    amountFormatted: string;
    reference: string;
    type: string;
    bankName: string;
  } | null;
}) {
  const [message, setMessage] = useState("");

  const quickActions = [
    "Why is this amount unmatched?",
    "Show me possible matches for this",
    "What bank charges can I expect?",
    "Explain this reconciliation",
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
              <h3 className="font-medium text-slate-900">Xenboox AI Copilot</h3>
              <span className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                Beta
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Greeting */}
        <div className="rounded-xl bg-indigo-50 p-3">
          <p className="text-sm text-slate-700">
            I found 3 potential matches and 2 issues that need your attention.
          </p>
        </div>

        {/* Top Insight */}
        {insights.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-slate-900 mb-3">
              Top Insight
            </h4>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {insights[0].title}
                  </p>
                  <p className="text-xs text-slate-600 mt-1">
                    {insights[0].description}
                  </p>
                  <button className="text-xs font-medium text-indigo-600 hover:text-indigo-700 mt-2">
                    {insights[0].actionLabel} →
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reconciliation Progress */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-slate-900">
              Reconciliation Progress
            </h4>
            <span className="text-sm font-medium text-slate-900">
              {summary.matchedPercent}%
            </span>
          </div>
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
              style={{ width: `${summary.matchedPercent}%` }}
            />
          </div>
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-xs text-slate-600">Matched</span>
              </div>
              <span className="text-xs text-slate-500">
                {summary.matchedCount} ({summary.matchedAmountFormatted})
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-amber-500" />
                <span className="text-xs text-slate-600">Unmatched</span>
              </div>
              <span className="text-xs text-slate-500">
                {summary.unmatchedCount} ({summary.unmatchedAmountFormatted})
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-500" />
                <span className="text-xs text-slate-600">Auto-Matched</span>
              </div>
              <span className="text-xs text-slate-500">
                {summary.autoMatchedCount} ({summary.autoMatchedPercent}%)
              </span>
            </div>
          </div>
        </div>

        {/* Ask me anything */}
        <div>
          <div className="space-y-2">
            {quickActions.map((action, i) => (
              <button
                key={i}
                className="w-full text-left flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg border border-slate-200 transition-colors"
              >
                <Bot className="h-4 w-4 text-slate-400" />
                {action}
              </button>
            ))}
          </div>
        </div>

        {/* Transaction Details */}
        {transactionDetail && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-slate-900">
                Transaction Details
              </h4>
              <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                Needs Attention
              </span>
            </div>
            <div className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-slate-900">
                  {transactionDetail.description}
                </p>
                <span className="text-sm font-medium text-red-600">
                  {transactionDetail.amountFormatted}
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-3">
                {transactionDetail.date} • {transactionDetail.bankName}
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Reference</span>
                  <span className="text-slate-900">
                    {transactionDetail.reference}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Type</span>
                  <span className="text-slate-900">
                    {transactionDetail.type}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Description</span>
                  <span className="text-slate-900">
                    {transactionDetail.description}
                  </span>
                </div>
              </div>
              <button className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">
                <Search className="h-4 w-4" />
                Find Match
              </button>
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
            placeholder="Ask a question..."
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <button className="h-9 w-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white hover:bg-indigo-700">
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function ReconciliationCenterPage() {
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<
    "all" | "matched" | "unmatched" | "autoMatched" | "ignored"
  >("all");

  // Fetch reconciliation center data
  const { data: centerData } =
    trpc.reconciliation.getReconciliationCenter.useQuery({
      bankAccountId: selectedAccountId || undefined,
    });

  // Fetch AI insights
  const { data: insights } = trpc.reconciliation.getAiInsights.useQuery();

  // Update selected account when data loads
  if (centerData && !selectedAccountId && centerData.accounts.length > 0) {
    setSelectedAccountId(centerData.selectedAccountId);
  }

  const tabs = [
    {
      key: "all" as const,
      label: "All Transactions",
      count: centerData?.tabs.all ?? 0,
    },
    {
      key: "matched" as const,
      label: "Matched",
      count: centerData?.tabs.matched ?? 0,
    },
    {
      key: "unmatched" as const,
      label: "Unmatched",
      count: centerData?.tabs.unmatched ?? 0,
    },
    {
      key: "autoMatched" as const,
      label: "Auto-Matched",
      count: centerData?.tabs.autoMatched ?? 0,
    },
    { key: "ignored" as const, label: "Ignored", count: 0 },
  ];

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                <span className="text-2xl">🔄</span>
                Reconciliation Center
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Automatically reconcile your bank transactions with your books.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <AiSimulationTrigger
                traceId="reconciliation-automatch"
                label="AI Auto-Reconcile"
              />
              <button className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                <Settings className="h-4 w-4" />
                Rules
              </button>
              <button className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                <Upload className="h-4 w-4" />
                Import Statement
              </button>
            </div>
          </div>

          {/* Account and Date Selector */}
          <div className="flex items-center gap-4 mb-4">
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {centerData?.accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-2">
              <input
                type="text"
                defaultValue={centerData?.dateRange.startDate}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 w-32"
              />
              <span className="text-slate-400">—</span>
              <input
                type="text"
                defaultValue={centerData?.dateRange.endDate}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 w-32"
              />
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
              <Clock className="h-3 w-3" />
              In Progress
            </span>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                  activeTab === tab.key
                    ? "bg-indigo-50 text-indigo-600"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-50",
                )}
              >
                {tab.label}
                <span
                  className={cn(
                    "ml-2 px-2 py-0.5 rounded-full text-xs",
                    activeTab === tab.key
                      ? "bg-indigo-100 text-indigo-700"
                      : "bg-slate-100 text-slate-600",
                  )}
                >
                  {tab.count}
                </span>
              </button>
            ))}
            <div className="flex-1" />
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search transactions..."
                className="rounded-lg border border-slate-200 pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              <Filter className="h-4 w-4" />
              Filters
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        {centerData?.summary && (
          <div className="p-4 bg-slate-50 border-b border-slate-200">
            <SummaryCards summary={centerData.summary} />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Transaction Table */}
          {centerData && (
            <TransactionTable
              matched={centerData.matched}
              unmatched={centerData.unmatched}
              activeTab={activeTab}
            />
          )}

          {/* AI Match Suggestions */}
          {centerData?.suggestions && centerData.suggestions.length > 0 && (
            <AiMatchSuggestions suggestions={centerData.suggestions} />
          )}

          {/* Show more link */}
          {centerData && centerData.unmatched.length > 5 && (
            <div className="text-center">
              <button className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
                Show more →
              </button>
            </div>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="border-t border-slate-200 bg-white p-4">
          <div className="flex items-center justify-end gap-3">
            <button className="px-6 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">
              Finish Later
            </button>
            <button className="px-6 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 inline-flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Finalize Reconciliation
            </button>
          </div>
        </div>
      </div>

      {/* AI Copilot Panel */}
      <div className="w-[360px]">
        <AiCopilotPanel
          insights={insights ?? []}
          summary={
            centerData?.summary ?? {
              matchedCount: 0,
              matchedAmount: 0,
              matchedAmountFormatted: "GMD 0",
              matchedPercent: 0,
              unmatchedCount: 0,
              unmatchedAmount: 0,
              unmatchedAmountFormatted: "GMD 0",
              autoMatchedCount: 0,
              autoMatchedPercent: 0,
            }
          }
          transactionDetail={
            centerData?.unmatched[0]
              ? {
                  description: centerData.unmatched[0].description,
                  date: centerData.unmatched[0].date,
                  amount: centerData.unmatched[0].statementAmount,
                  amountFormatted: centerData.unmatched[0].statementFormatted,
                  reference: "002583",
                  type: "Cheque Payment",
                  bankName: "GTBank Gambia Ltd",
                }
              : null
          }
        />
      </div>
    </div>
  );
}
