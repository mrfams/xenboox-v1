"use client";

import { useState } from "react";
import {
  Search,
  Download,
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
  Trash2,
} from "lucide-react";

import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { ModulePageShell } from "@/components/module/module-page-shell";
import type { SummaryCardItem } from "@/components/module/module-page-shell.types";
import { RowAiAction } from "@/components/module/row-ai-action";
import { RowActionsMenu } from "@/components/module/row-actions-menu";
import { DocumentUploadButton } from "@/components/module/document-upload-button";
import { DocumentViewer } from "@/components/documents/document-viewer";

// ─── Types ─────────────────────────────────────────────────────────────────

type TabFilter =
  | "all"
  | "invoices"
  | "receipts"
  | "contracts"
  | "reports"
  | "other";

type DocCategory =
  | "invoice"
  | "receipt"
  | "contract"
  | "voucher"
  | "bank_statement"
  | "tax_return"
  | "payroll_report"
  | "journal_entry"
  | "po"
  | "supporting";

// ─── Summary Cards ─────────────────────────────────────────────────────────

function buildSummaryCards(summary: {
  totalDocuments: number;
  totalDocumentsChange: number;
  storageUsed: number;
  storageLimit: number;
  recentUploads: number;
  pendingReview: number;
}): SummaryCardItem[] {
  const cards: SummaryCardItem[] = [
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

  return cards;
}

// ─── Documents Table ───────────────────────────────────────────────────────

function DocumentsTable({
  documents,
  isLoading,
  onViewDocument,
  onDownload,
  onDelete,
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
  /** Opens the document (presigned URL) and records the per-user view. */
  onViewDocument?: (documentId: string) => void;
  /** Downloads the document without recording a view. */
  onDownload?: (documentId: string) => void;
  /** Deletes the document after confirmation. */
  onDelete?: (documentId: string) => void;
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
                onClick={() => onViewDocument?.(doc.id)}
                className="group relative border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
              >
                <RowAiAction
                  focus={{
                    kind: "Document",
                    name: doc.name,
                    id: doc.id,
                    fields: [
                      { label: "Type", value: doc.type },
                      { label: "Category", value: doc.category },
                      { label: "Uploaded by", value: doc.uploadedBy },
                      { label: "Uploaded", value: doc.uploadedAt },
                    ],
                  }}
                />
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
                    <button
                      type="button"
                      title="Open document"
                      aria-label={`Open ${doc.name}`}
                      onClick={(e) => {
                        // Stop the row click from double-firing the handler.
                        e.stopPropagation();
                        onViewDocument?.(doc.id);
                      }}
                      className="p-1 hover:bg-slate-100 rounded transition-colors"
                    >
                      <Eye className="h-4 w-4 text-slate-400" />
                    </button>
                    <button
                      type="button"
                      title="Download"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDownload?.(doc.id);
                      }}
                      className="p-1 hover:bg-slate-100 rounded transition-colors"
                    >
                      <Download className="h-4 w-4 text-slate-400" />
                    </button>
                    <RowActionsMenu
                      items={[
                        {
                          label: "Open document",
                          icon: <Eye className="h-3.5 w-3.5" />,
                          onSelect: () => onViewDocument?.(doc.id),
                        },
                        {
                          label: "Download",
                          icon: <Download className="h-3.5 w-3.5" />,
                          onSelect: () => onDownload?.(doc.id),
                        },
                        {
                          label: "Delete",
                          icon: <Trash2 className="h-3.5 w-3.5" />,
                          destructive: true,
                          onSelect: () => onDelete?.(doc.id),
                        },
                      ]}
                    />
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
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
            Live
          </span>
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

// ─── Helpers ───────────────────────────────────────────────────────────────

function fileTypeFromMime(mimeType: string | null | undefined): string {
  if (!mimeType) return "document";
  if (mimeType.startsWith("image/")) return "image";
  if (
    mimeType.includes("spreadsheet") ||
    mimeType.includes("excel") ||
    mimeType.includes("csv")
  ) {
    return "spreadsheet";
  }
  if (mimeType === "application/pdf") return "pdf";
  return "document";
}

const CATEGORY_LABELS: Record<string, string> = {
  invoice: "Invoice",
  receipt: "Receipt",
  contract: "Contract",
  voucher: "Voucher",
  bank_statement: "Bank Statement",
  tax_return: "Tax Return",
  payroll_report: "Payroll Report",
  journal_entry: "Journal Entry",
  po: "Purchase Order",
  supporting: "Supporting",
};

function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category;
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function DocumentsPage() {
  const [activeTab, setActiveTab] = useState<TabFilter>("all");
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);

  // Fetch overview data
  const { data: overviewData, isLoading: overviewLoading } =
    trpc.document?.getOverview?.useQuery?.() ?? {
      data: undefined,
      isLoading: false,
    };

  // Fetch documents list — every tab maps to real doc types so the list
  // always reflects the selected category (never an unfiltered fallback).
  const categoryFilter: {
    category?: DocCategory;
    categories?: DocCategory[];
  } =
    activeTab === "invoices"
      ? { category: "invoice" }
      : activeTab === "receipts"
        ? { category: "receipt" }
        : activeTab === "contracts"
          ? { category: "contract" }
          : activeTab === "reports"
            ? { categories: ["tax_return", "payroll_report"] }
            : activeTab === "other"
              ? {
                  categories: [
                    "voucher",
                    "bank_statement",
                    "journal_entry",
                    "po",
                    "supporting",
                  ],
                }
              : {};

  const { data: documentsData, isLoading: documentsLoading } =
    trpc.document?.listDocuments?.useQuery?.(categoryFilter) ?? {
      data: undefined,
      isLoading: false,
    };

  // Fetch AI insights
  const { data: aiInsights } = trpc.document?.getAiInsights?.useQuery?.() ?? {
    data: undefined,
  };

  // Record a document view (clears the dashboard's "New" badge for this
  // user) and open the file through a presigned URL.
  const markViewed = trpc.document?.markDocumentViewed?.useMutation?.();
  const downloadDoc = trpc.document?.download?.useMutation?.();
  const deleteDoc = trpc.document?.delete?.useMutation?.();
  const utils = trpc.useUtils();

  const handleOpenDocument = (documentId: string) => {
    // Fire-and-forget: a failed view record must never block opening the file.
    markViewed?.mutate({ documentId }, { onError: () => undefined });
    // Open the professional in-app viewer (preview + AI workspace).
    setActiveDocumentId(documentId);
  };

  const handleDownloadDocument = (documentId: string) => {
    downloadDoc?.mutate(
      { id: documentId },
      {
        onSuccess: (res) => {
          if (res?.downloadUrl) {
            window.open(res.downloadUrl, "_blank", "noopener,noreferrer");
          }
        },
        onError: () => undefined,
      },
    );
  };

  const handleDeleteDocument = (documentId: string) => {
    deleteDoc?.mutate(
      { id: documentId },
      {
        onSuccess: () => {
          utils.document?.listDocuments?.invalidate?.();
          utils.document?.getOverview?.invalidate?.();
        },
        onError: () => undefined,
      },
    );
  };

  const handleExport = () => {
    const rows = documentsData ?? [];
    const header = [
      "Name",
      "Type",
      "Uploaded By",
      "Uploaded At",
      "Size (MB)",
      "Status",
    ];
    const csv = [
      header.join(","),
      ...rows.map((doc) =>
        [
          `"${doc.name.replace(/"/g, '""')}"`,
          `"${doc.type}"`,
          `"${doc.uploadedByName ?? ""}"`,
          `"${doc.createdAt ?? ""}"`,
          ((doc.sizeBytes ?? 0) / 1024).toFixed(2),
          `"${doc.status}"`,
        ].join(","),
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `xenboox-documents-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const tabs = [
    { key: "all" as TabFilter, label: "All Documents" },
    { key: "invoices" as TabFilter, label: "Invoices" },
    { key: "receipts" as TabFilter, label: "Receipts" },
    { key: "contracts" as TabFilter, label: "Contracts" },
    { key: "reports" as TabFilter, label: "Reports" },
    { key: "other" as TabFilter, label: "Other" },
  ];

  // Empty state for new users
  const isEmpty =
    !documentsLoading && (!documentsData || documentsData.length === 0);

  return (
    <ModulePageShell
      title="Documents"
      description="Store, organize, and manage all your financial documents."
      icon={FolderOpen}
      actions={
        <>
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
          <DocumentUploadButton
            docType="supporting"
            label="Upload Document"
            onUploaded={() => {
              utils.document?.listDocuments?.invalidate?.();
              utils.document?.getOverview?.invalidate?.();
            }}
          />
        </>
      }
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={(key) => setActiveTab(key as TabFilter)}
      summaryCards={
        overviewData?.summary ? buildSummaryCards(overviewData.summary) : []
      }
    >
      <div className="min-h-full space-y-6 bg-slate-50 p-4">
        {/* Empty State for New Users */}
        {isEmpty && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12">
            <div className="max-w-md text-center space-y-4 mx-auto">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-100">
                <FolderOpen className="h-8 w-8 text-indigo-600" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-slate-900">
                  Upload your first document
                </h3>
                <p className="text-sm text-slate-500">
                  Store invoices, receipts, contracts, and reports. AI will
                  automatically categorize and extract data from your documents.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors">
                  <Upload className="h-4 w-4" />
                  Upload Document
                </button>
                <button className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                  <FileText className="h-4 w-4" />
                  Scan with AI
                </button>
              </div>
              <div className="flex items-center justify-center gap-4 text-xs text-slate-400 pt-2">
                <span>✓ PDF, images, spreadsheets</span>
                <span>✓ Auto-categorization</span>
                <span>✓ OCR extraction</span>
              </div>
            </div>
          </div>
        )}

        {/* Documents Table */}
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between p-4 border-b border-slate-200">
            <h3 className="font-medium text-slate-900">
              Documents ({documentsData?.length ?? 0})
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
            documents={(documentsData ?? []).map((doc) => ({
              id: doc.id,
              name: doc.name,
              // File-type icon comes from the MIME type (pdf/image/…) while
              // the category stays the document kind (invoice/receipt/…).
              type: fileTypeFromMime(doc.mimeType),
              category: categoryLabel(doc.type),
              uploadedBy: doc.uploadedByName ?? "—",
              uploadedAt: doc.createdAt ?? new Date().toISOString(),
              size: doc.sizeBytes ?? 0,
            }))}
            isLoading={documentsLoading}
            onViewDocument={handleOpenDocument}
            onDownload={handleDownloadDocument}
            onDelete={handleDeleteDocument}
          />
        </div>
      </div>

      {/* Professional in-app document viewer with AI workspace */}
      {activeDocumentId && (
        <DocumentViewer
          documentId={activeDocumentId}
          onClose={() => setActiveDocumentId(null)}
        />
      )}
    </ModulePageShell>
  );
}
