"use client";

import { useState, useCallback } from "react";
import {
  Upload,
  FileText,
  Image,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Eye,
  Bot,
  Filter,
  Search,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  ScanLine,
  FileCheck,
  FileWarning,
  Sparkles,
  ArrowRight,
} from "lucide-react";

import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { ModulePageShell } from "@/components/module/module-page-shell";
import type { SummaryCardItem } from "@/components/module/module-page-shell.types";
import { DocumentUploadButton } from "@/components/module/document-upload-button";
import { Badge } from "@xenboox/ui/badge";
import { Button } from "@xenboox/ui/button";
import { Input } from "@xenboox/ui/input";
import { toast } from "sonner";

// ─── Types ─────────────────────────────────────────────────────────────

type DocStatus =
  | "detected"
  | "processing"
  | "extracted"
  | "validated"
  | "synced"
  | "done"
  | "failed";

type ProcessingDocument = {
  id: string;
  name: string;
  type: string;
  status: DocStatus;
  mimeType: string | null;
  sizeBytes: number | null;
  ocrText: string | null;
  ocrConfidence: string | null;
  createdAt: Date;
  metadata: Record<string, unknown>;
};

// ─── Status Config ────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  DocStatus,
  {
    label: string;
    icon: typeof CheckCircle2;
    color: string;
    bgColor: string;
  }
> = {
  detected: {
    label: "Detected",
    icon: FileText,
    color: "text-slate-600",
    bgColor: "bg-slate-100",
  },
  processing: {
    label: "Processing",
    icon: ScanLine,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
  },
  extracted: {
    label: "Extracted",
    icon: Eye,
    color: "text-violet-600",
    bgColor: "bg-violet-100",
  },
  validated: {
    label: "Validated",
    icon: FileCheck,
    color: "text-emerald-600",
    bgColor: "bg-emerald-100",
  },
  synced: {
    label: "Synced",
    icon: CheckCircle2,
    color: "text-green-600",
    bgColor: "bg-green-100",
  },
  done: {
    label: "Complete",
    icon: CheckCircle2,
    color: "text-green-600",
    bgColor: "bg-green-100",
  },
  failed: {
    label: "Failed",
    icon: FileWarning,
    color: "text-red-600",
    bgColor: "bg-red-100",
  },
};

// ─── Helpers ───────────────────────────────────────────────────────────

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getDocTypeIcon(type: string) {
  switch (type) {
    case "receipt":
      return <Receipt className="h-4 w-4" />;
    case "invoice":
      return <FileText className="h-4 w-4" />;
    case "bank_statement":
      return <FileText className="h-4 w-4" />;
    default:
      return <FileText className="h-4 w-4" />;
  }
}

function Receipt(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
      <path d="M14 8h-4" />
      <path d="M16 12h-6" />
      <path d="M11 16H8" />
    </svg>
  );
}

// ─── Document Card ────────────────────────────────────────────────────

function DocumentCard({
  doc,
  isExpanded,
  onToggle,
}: {
  doc: ProcessingDocument;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const status = STATUS_CONFIG[doc.status] ?? STATUS_CONFIG.detected;
  const StatusIcon = status.icon;
  const confidence = doc.ocrConfidence
    ? Math.round(parseFloat(doc.ocrConfidence) * 100)
    : null;

  return (
    <div className="rounded-lg border bg-white transition-all hover:shadow-sm">
      {/* Header */}
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        <div className={cn("rounded-lg p-2", status.bgColor)}>
          <StatusIcon className={cn("h-4 w-4", status.color)} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-medium text-slate-900">
              {doc.name}
            </h3>
            {confidence !== null && (
              <Badge
                variant="outline"
                className={cn(
                  "text-xs",
                  confidence >= 90
                    ? "border-green-200 text-green-700"
                    : confidence >= 70
                      ? "border-amber-200 text-amber-700"
                      : "border-red-200 text-red-700",
                )}
              >
                <Sparkles className="mr-1 h-3 w-3" />
                {confidence}% confident
              </Badge>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1">
              {getDocTypeIcon(doc.type)}
              {doc.type.replace("_", " ")}
            </span>
            <span>•</span>
            <span>{formatFileSize(doc.sizeBytes)}</span>
            <span>•</span>
            <span>
              {new Date(doc.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>

        <StatusBadge status={doc.status} />

        <div className="shrink-0 text-slate-400">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t px-4 pb-4 pt-3">
          {/* OCR Text Preview */}
          {doc.ocrText ? (
            <div className="mb-3">
              <h4 className="mb-1 text-xs font-medium text-slate-500 uppercase tracking-wide">
                Extracted Text
              </h4>
              <div className="max-h-48 overflow-y-auto rounded-md bg-slate-50 p-3 font-mono text-xs text-slate-700">
                {doc.ocrText}
              </div>
            </div>
          ) : doc.status === "processing" ? (
            <div className="mb-3 flex items-center gap-2 rounded-md bg-blue-50 p-3 text-sm text-blue-700">
              <ScanLine className="h-4 w-4 animate-pulse" />
              AI is currently reading this document...
            </div>
          ) : doc.status === "failed" ? (
            <div className="mb-3 flex items-center gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700">
              <FileWarning className="h-4 w-4" />
              Processing failed. Try re-uploading the document.
            </div>
          ) : (
            <div className="mb-3 text-sm text-slate-500">
              No extracted text available yet.
            </div>
          )}

          {/* Metadata */}
          {doc.metadata && Object.keys(doc.metadata).length > 0 && (
            <div>
              <h4 className="mb-1 text-xs font-medium text-slate-500 uppercase tracking-wide">
                Extracted Data
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(doc.metadata).map(([key, value]) => (
                  <div key={key} className="rounded-md bg-slate-50 p-2">
                    <div className="text-xs text-slate-500">
                      {key.replace(/([A-Z])/g, " $1").trim()}
                    </div>
                    <div className="text-sm font-medium text-slate-900">
                      {typeof value === "string" || typeof value === "number"
                        ? String(value)
                        : JSON.stringify(value)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="mt-3 flex items-center gap-2">
            <DocumentUploadButton
              docType={
                doc.type as
                  "receipt" | "invoice" | "bank_statement" | "contract"
              }
              label="Re-upload"
              variant="outline"
              size="sm"
            />
            {doc.status === "extracted" && (
              <Button size="sm" variant="default">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Approve & Create Entry
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────

function StatusBadge({ status }: { status: DocStatus }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.detected;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        config.bgColor,
        config.color,
      )}
    >
      {status === "processing" && (
        <ScanLine className="h-3 w-3 animate-pulse" />
      )}
      {config.label}
    </span>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────

export default function DocumentProcessingPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Query documents with processing status
  const {
    data: documents,
    isLoading,
    refetch,
  } = trpc.document.listDocuments.useQuery({
    status: statusFilter === "all" ? undefined : statusFilter,
    limit: 50,
  });

  const docs = (documents?.documents ?? []) as ProcessingDocument[];

  // Filter by search
  const filteredDocs = docs.filter(
    (d) =>
      !searchQuery ||
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.type.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Summary stats
  const stats = {
    total: docs.length,
    processing: docs.filter((d) => d.status === "processing").length,
    extracted: docs.filter((d) => d.status === "extracted").length,
    done: docs.filter((d) => d.status === "done" || d.status === "synced")
      .length,
    failed: docs.filter((d) => d.status === "failed").length,
  };

  const summaryCards: SummaryCardItem[] = [
    {
      label: "Total Documents",
      value: stats.total.toString(),
      icon: FileText,
      color: "text-slate-600",
    },
    {
      label: "Processing",
      value: stats.processing.toString(),
      icon: ScanLine,
      color: "text-blue-600",
    },
    {
      label: "Awaiting Review",
      value: stats.extracted.toString(),
      icon: Eye,
      color: "text-violet-600",
    },
    {
      label: "Completed",
      value: stats.done.toString(),
      icon: CheckCircle2,
      color: "text-green-600",
    },
  ];

  const filters = [
    { key: "all", label: "All" },
    { key: "processing", label: "Processing" },
    { key: "extracted", label: "Awaiting Review" },
    { key: "done", label: "Completed" },
    { key: "failed", label: "Failed" },
  ];

  return (
    <ModulePageShell
      title="Document Processing"
      description="Upload, OCR, and review extracted data from receipts, invoices, and statements"
      summaryCards={summaryCards}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="mr-1 h-4 w-4" />
            Refresh
          </Button>
          <DocumentUploadButton docType="receipt" label="Upload Receipt" />
          <DocumentUploadButton docType="invoice" label="Upload Invoice" />
        </div>
      }
    >
      {/* AI Processing Banner */}
      {stats.processing > 0 && (
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="rounded-full bg-blue-100 p-2">
            <Bot className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-blue-900">
              AI is processing {stats.processing} document
              {stats.processing > 1 ? "s" : ""}
            </p>
            <p className="text-xs text-blue-600">
              Documents are being OCR-scanned and classified automatically.
              Results will appear here when ready.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="ml-auto"
            onClick={() => refetch()}
          >
            <RefreshCw className="mr-1 h-3 w-3" />
            Check Status
          </Button>
        </div>
      )}

      {/* Search + Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 overflow-x-auto">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap",
                statusFilter === f.key
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search documents..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Document List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-lg border bg-white p-4"
            />
          ))}
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 py-16">
          <ScanLine className="mb-4 h-10 w-10 text-slate-400" />
          <h3 className="text-lg font-medium text-slate-900">
            No documents found
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Upload receipts, invoices, or bank statements for AI-powered OCR
            processing.
          </p>
          <div className="mt-4 flex gap-2">
            <DocumentUploadButton docType="receipt" label="Upload Receipt" />
            <DocumentUploadButton docType="invoice" label="Upload Invoice" />
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredDocs.map((doc) => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              isExpanded={expandedId === doc.id}
              onToggle={() =>
                setExpandedId(expandedId === doc.id ? null : doc.id)
              }
            />
          ))}
        </div>
      )}
    </ModulePageShell>
  );
}
