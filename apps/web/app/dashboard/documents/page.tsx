"use client";

import { useState } from "react";
import {
  Search,
  Plus,
  Download,
  ChevronDown,
  MoreHorizontal,
  FileText,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Bot,
  Eye,
  Send,
  Filter,
  FolderOpen,
  Upload,
  Image,
  File,
  FileSpreadsheet,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────────────────────

type TabFilter =
  | "all"
  | "invoices"
  | "receipts"
  | "contracts"
  | "reports"
  | "other";

// ─── Summary Cards ─────────────────────────────────────────────────────────

function SummaryCards({
  summary,
}: {
  summary: {
    totalDocuments: number;
    totalDocumentsChange: number;
    storageUsed: number;
    storageLimit: number;
    recentUploads: number;
    pendingReview: number;
  };
}) {
  const cards = [
    {
      label: "Total Documents",
      value: summary.totalDocuments.toLocaleString(),
      change: summary.totalDocumentsChange,
      icon: FolderOpen,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
    },
    {
      label: "Storage Used",
      value: `${(summary.storageUsed / 1024).toFixed(1)} GB`,
      subtitle: `of ${(summary.storageLimit / 1024).toFixed(0)} GB`,
      icon: FileSpreadsheet,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      label: "Recent Uploads",
      value: summary.recentUploads.toString(),
      subtitle: "This week",
      icon: Upload,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
    {
      label: "Pending Review",
      value: summary.pendingReview.toString(),
      icon: AlertTriangle,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-4">
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
          {card.change !== undefined && (
            <div className="flex items-center gap-1 mt-1">
              <span className="text-sm text-emerald-600">+{card.change}%</span>
              <span className="text-xs text-slate-400">vs last month</span>
            </div>
          )}
          {card.subtitle && (
            <p className="text-xs text-slate-400 mt-1">{card.subtitle}</p>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Documents Table ───────────────────────────────────────────────────────

function DocumentsTable({
  documents,
  isLoading,
}: {
  documents: Array<{
    id: string;
    name: string;
    type: string;
    category: string;
    uploadedBy: string;
    uploadedAt: string;
    size: number;
    linkedTo?: string;
  }>;
  isLoading: boolean;
}) {
  const typeIcons: Record<string, typeof FileText> = {
    pdf: FileText,
    image: Image,
    spreadsheet: FileSpreadsheet,
    document: File,
  };

  const typeColors: Record<string, string> = {
    pdf: "bg-red-100 text-red-600",
    image: "bg-blue-100 text-blue-600",
    spreadsheet: "bg-emerald-100 text-emerald-600",
    document: "bg-purple-100 text-purple-600",
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
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Document
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Category
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Uploaded By
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Date
            </th>
            <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">
              Size
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Linked To
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {documents.map((doc) => {
            const IconComponent = typeIcons[doc.type] ?? File;
            const iconColor =
              typeColors[doc.type] ?? "bg-slate-100 text-slate-600";

            return (
              <tr
                key={doc.id}
                className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
              >
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "h-10 w-10 rounded-lg flex items-center justify-center",
                        iconColor,
                      )}
                    >
                      <IconComponent className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {doc.name}
                      </p>
                      <p className="text-xs text-slate-400 uppercase">
                        {doc.type}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className="text-sm text-slate-600">{doc.category}</span>
                </td>
                <td className="py-3 px-4 text-sm text-slate-600">
                  {doc.uploadedBy}
                </td>
                <td className="py-3 px-4 text-sm text-slate-600">
                  {new Date(doc.uploadedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </td>
                <td className="py-3 px-4 text-right">
                  <span className="text-sm text-slate-600">
                    {(doc.size / 1024).toFixed(1)} MB
                  </span>
                </td>
                <td className="py-3 px-4">
                  {doc.linkedTo ? (
                    <span className="text-sm text-indigo-600 hover:underline cursor-pointer">
                      {doc.linkedTo}
                    </span>
                  ) : (
                    <span className="text-sm text-slate-400">—</span>
                  )}
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1">
                    <button className="p-1 hover:bg-slate-100 rounded">
                      <Eye className="h-4 w-4 text-slate-400" />
                    </button>
                    <button className="p-1 hover:bg-slate-100 rounded">
                      <Download className="h-4 w-4 text-slate-400" />
                    </button>
                    <button className="p-1 hover:bg-slate-100 rounded">
                      <MoreHorizontal className="h-4 w-4 text-slate-400" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── AI Copilot Panel ──────────────────────────────────────────────────────

function AiCopilotPanel({
  insights,
}: {
  insights: Array<{
    id: string;
    type: "warning" | "info" | "success";
    title: string;
    description: string;
    actionLabel: string;
  }>;
}) {
  const [message, setMessage] = useState("");

  const quickActions = [
    "Find invoice for GTBank",
    "Show receipts from last month",
    "Documents pending review",
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
                AI Document Assistant
              </h3>
              <span className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                Beta
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
        {/* AI Insights */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-slate-900">AI Insights</h4>
            <span className="text-xs text-slate-400">Generated 3 min ago</span>
          </div>
          <div className="space-y-3">
            {insights.map((insight) => (
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
                      {insight.actionLabel}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h4 className="font-medium text-slate-900 mb-3">Quick Actions</h4>
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
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-slate-200 p-4">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Search documents..."
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

export default function DocumentsPage() {
  const [activeTab, setActiveTab] = useState<TabFilter>("all");

  // Fetch overview data
  const { data: overviewData, isLoading: overviewLoading } =
    trpc.documents?.getOverview?.useQuery?.() ?? {
      data: undefined,
      isLoading: false,
    };

  // Fetch documents list
  const { data: documentsData, isLoading: documentsLoading } =
    trpc.documents?.listDocuments?.useQuery?.({ category: activeTab }) ?? {
      data: undefined,
      isLoading: false,
    };

  // Fetch AI insights
  const { data: aiInsights } = trpc.documents?.getAiInsights?.useQuery?.() ?? {
    data: undefined,
  };

  const tabs = [
    { key: "all" as TabFilter, label: "All Documents" },
    { key: "invoices" as TabFilter, label: "Invoices" },
    { key: "receipts" as TabFilter, label: "Receipts" },
    { key: "contracts" as TabFilter, label: "Contracts" },
    { key: "reports" as TabFilter, label: "Reports" },
    { key: "other" as TabFilter, label: "Other" },
  ];

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Documents</h1>
              <p className="text-sm text-slate-500">
                Store, organize, and manage all your financial documents.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                <Download className="h-4 w-4" />
                Export
              </button>
              <button className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
                <Upload className="h-4 w-4" />
                Upload Document
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
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50">
          {/* Summary Cards */}
          {overviewData?.summary && (
            <SummaryCards summary={overviewData.summary} />
          )}

          {/* Documents Table */}
          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="font-medium text-slate-900">
                Documents ({documentsData?.documents?.length ?? 0})
              </h3>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search documents..."
                    className="rounded-lg border border-slate-200 pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <button className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                  <Filter className="h-4 w-4" />
                  Filters
                </button>
              </div>
            </div>
            <DocumentsTable
              documents={documentsData?.documents ?? []}
              isLoading={documentsLoading}
            />
          </div>
        </div>
      </div>

      {/* AI Copilot Panel */}
      <div className="w-[360px]">
        <AiCopilotPanel insights={aiInsights ?? []} />
      </div>
    </div>
  );
}
