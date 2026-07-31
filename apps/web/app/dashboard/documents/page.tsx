"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { DocumentLiveness } from "@/components/agents/document-liveness";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/loading";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { UploadDialog } from "./upload-dialog";
import { DocumentViewer } from "@/components/dashboard/document-viewer";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui";
import {
  FolderOpen,
  Plus,
  FileText,
  Receipt,
  Upload,
  X,
  Camera,
  FileSignature,
  FileSpreadsheet,
  BookOpen,
  Landmark,
  FileCheck,
  ScrollText,
  ShoppingCart,
  Paperclip,
  Download,
  AlertCircle,
  Copy,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { toast } from "sonner";
import type { FilterState } from "@/components/dashboard/filter-bar";
import { cn } from "@/lib/utils";
import { statusBadgeClass } from "@/lib/badge-variants";

const typeLabels: Record<string, string> = {
  invoice: "Invoice",
  receipt: "Receipt",
  contract: "Contract",
  voucher: "Voucher",
  bank_statement: "Bank Statement",
  tax_return: "Tax Return",
  payroll_report: "Payroll Report",
  journal_entry: "Journal Entry",
  po: "Purchase Order",
  supporting: "Supporting Doc",
};

const typeIcons: Record<string, React.ReactNode> = {
  invoice: <FileText className="h-4 w-4" />,
  receipt: <Receipt className="h-4 w-4" />,
  contract: <FileSignature className="h-4 w-4" />,
  voucher: <FileSpreadsheet className="h-4 w-4" />,
  bank_statement: <Landmark className="h-4 w-4" />,
  tax_return: <ScrollText className="h-4 w-4" />,
  payroll_report: <FileCheck className="h-4 w-4" />,
  journal_entry: <BookOpen className="h-4 w-4" />,
  po: <ShoppingCart className="h-4 w-4" />,
  supporting: <Paperclip className="h-4 w-4" />,
};

const typeBadgeColors: Record<string, string> = {
  invoice: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  receipt:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  contract:
    "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  voucher:
    "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  bank_statement:
    "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400",
  tax_return: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  payroll_report:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  journal_entry:
    "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
  po: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400",
  supporting: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
};

const PIPELINE_LABELS: Record<string, string> = {
  detected: "Detected",
  processing: "Processing",
  extracted: "Extracted",
  synced: "Synced",
  agent_processing: "Agent Processing",
  done: "Done",
  failed: "Failed",
};

const PIPELINE_STEPS = [
  "detected",
  "processing",
  "extracted",
  "synced",
  "agent_processing",
  "done",
];

function PipelineBadge({ status }: { status: string }) {
  const stepIndex = PIPELINE_STEPS.indexOf(status);
  const isFailed = status === "failed";
  const isDone = status === "done";

  return (
    <div className="flex items-center gap-1.5">
      {isFailed ? (
        <Badge variant="destructive" className="text-[10px] px-1.5">
          Failed
        </Badge>
      ) : (
        <div className="flex items-center gap-0.5">
          {PIPELINE_STEPS.map((step, i) => (
            <div
              key={step}
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                i <= stepIndex
                  ? isDone
                    ? "bg-emerald-500"
                    : "bg-primary"
                  : "bg-muted-foreground/20",
              )}
            />
          ))}
        </div>
      )}
      <span
        className={cn(
          "text-[10px] font-medium",
          isDone
            ? "text-emerald-600"
            : isFailed
              ? "text-red-600"
              : "text-muted-foreground",
        )}
      >
        {PIPELINE_LABELS[status] ?? status}
      </span>
    </div>
  );
}

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/tiff",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
] as const;

type AllowedMime = (typeof ALLOWED_MIME_TYPES)[number];

function isAllowedMime(type: string): type is AllowedMime {
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(type);
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentsPage() {
  const router = useRouter();
  const { data: documents, isLoading } = trpc.document.listDocuments.useQuery();
  const downloadMutation = trpc.document.download.useMutation();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    dateFrom: "",
    dateTo: "",
    status: "",
    sort: "date-desc",
  });
  const [activeTab, setActiveTab] = useState("all");
  const [copied, setCopied] = useState(false);

  // Drop zone state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const utils = trpc.useUtils();
  const getUploadUrl = trpc.document.getUploadUrl.useMutation();
  const confirmUpload = trpc.document.confirmUpload.useMutation();
  const [inlineUploading, setInlineUploading] = useState(false);
  const [inlineProgress, setInlineProgress] = useState(0);
  const [inlineFile, setInlineFile] = useState<File | null>(null);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [unrecognizedFile, setUnrecognizedFile] = useState<File | null>(null);

  const entityEmail = "ap@entity.xenboox.com";

  const filtered = useMemo(() => {
    if (!documents) return [];
    let result = [...documents];

    if (activeTab === "failed") {
      result = result.filter((d) => d.status === "failed");
    } else if (activeTab === "processing") {
      result = result.filter(
        (d) => d.status !== "done" && d.status !== "failed",
      );
    } else if (activeTab === "done") {
      result = result.filter((d) => d.status === "done");
    }

    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter((d) => d.name.toLowerCase().includes(q));
    }
    if (filters.status) {
      result = result.filter((d) => d.type === filters.status);
    }
    if (filters.sort === "date-asc") {
      result.sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
    } else if (filters.sort === "name-asc") {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (filters.sort === "name-desc") {
      result.sort((a, b) => b.name.localeCompare(a.name));
    } else {
      result.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    }
    return result;
  }, [documents, filters, activeTab]);

  const failedCount = (documents ?? []).filter(
    (d) => d.status === "failed",
  ).length;
  const processingCount = (documents ?? []).filter(
    (d) => d.status !== "done" && d.status !== "failed",
  ).length;

  async function handleDownload(docId: string) {
    try {
      const { downloadUrl } = await downloadMutation.mutateAsync({ id: docId });
      window.open(downloadUrl, "_blank");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed");
    }
  }

  function handleDocClick(doc: any) {
    setSelectedDoc(doc);
    setViewerOpen(true);
  }

  // ── Inline drag-and-drop upload ──

  const handleFileSelect = useCallback(
    async (selected: File | null) => {
      if (!selected) return;
      setInlineError(null);
      setUnrecognizedFile(null);

      if (!isAllowedMime(selected.type)) {
        setUnrecognizedFile(selected);
        return;
      }

      setInlineFile(selected);
      setInlineUploading(true);
      setInlineProgress(10);

      try {
        const { uploadUrl, storagePath } = await getUploadUrl.mutateAsync({
          fileName: selected.name,
          fileSize: selected.size,
          mimeType: selected.type as AllowedMime,
        });
        setInlineProgress(40);
        await fetch(uploadUrl, {
          method: "PUT",
          body: selected,
          headers: { "Content-Type": selected.type },
        });
        setInlineProgress(70);
        const r2Bucket = process.env.NEXT_PUBLIC_R2_BUCKET_NAME ?? "";
        await confirmUpload.mutateAsync({
          r2Key: storagePath,
          r2Bucket: r2Bucket || "xenboox-docs",
          name: selected.name,
          type: "invoice" as const,
          mimeType: selected.type,
          fileSize: selected.size,
        });
        setInlineProgress(100);
        toast.success("Document uploaded");
        utils.document.listDocuments.invalidate();
        setInlineFile(null);
        setInlineUploading(false);
      } catch (err) {
        setInlineUploading(false);
        setInlineProgress(0);
        setInlineError(err instanceof Error ? err.message : "Upload failed");
      }
    },
    [getUploadUrl, confirmUpload, utils],
  );

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files[0]);
  }

  function handleCopyEmail() {
    navigator.clipboard.writeText(entityEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Email address copied");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Document Inbox"
        description="Upload, review, and process financial documents"
        action={{
          label: "Upload Document",
          onClick: () => setUploadOpen(true),
          icon: <Plus className="mr-2 h-4 w-4" />,
        }}
      />

      <DocumentLiveness />

      {/* Email address banner */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/[0.02] border-primary/10">
        <CardContent className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">
                  Forward invoices via email
                </p>
                <p className="text-xs text-muted-foreground">
                  Send documents to your dedicated inbox and they&apos;ll appear
                  here automatically
                </p>
              </div>
            </div>
            <button
              onClick={handleCopyEmail}
              className="inline-flex items-center gap-2 rounded-lg border bg-background px-3 py-1.5 text-sm font-mono text-primary hover:bg-accent transition-colors"
            >
              {entityEmail}
              {copied ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Universal drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragOver(false);
        }}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-all",
          dragOver
            ? "border-primary bg-primary/5 scale-[1.01]"
            : "border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/20",
        )}
      >
        {inlineUploading ? (
          <div className="space-y-3 w-full max-w-sm">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium">
              {inlineFile?.name ?? "Uploading..."}
            </p>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${inlineProgress}%` }}
              />
            </div>
          </div>
        ) : inlineError ? (
          <div className="space-y-3">
            <AlertCircle className="mx-auto h-8 w-8 text-destructive" />
            <p className="text-sm font-medium text-destructive">
              Upload failed
            </p>
            <p className="text-xs text-muted-foreground">{inlineError}</p>
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                setInlineError(null);
              }}
            >
              Try again
            </Button>
          </div>
        ) : unrecognizedFile ? (
          <div className="space-y-3">
            <AlertCircle className="mx-auto h-8 w-8 text-amber-500" />
            <p className="text-sm font-medium">
              We couldn&apos;t read this automatically
            </p>
            <p className="text-xs text-muted-foreground max-w-md">
              &ldquo;{unrecognizedFile.name}&rdquo; (
              {formatFileSize(unrecognizedFile.size)}) is in a format we
              don&apos;t support yet.
            </p>
            <div className="flex items-center gap-3 justify-center">
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setUnrecognizedFile(null);
                  setUploadOpen(true);
                }}
              >
                Enter manually
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  setUnrecognizedFile(null);
                }}
              >
                Try a different file
              </Button>
            </div>
          </div>
        ) : (
          <>
            <Upload className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium">
              Drop files here or click to browse
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              PDF, Images, Excel, Word — max 100 MB
            </p>
            <div className="flex items-center gap-2 mt-3">
              <Button size="sm" variant="default" className="gap-1.5">
                <Upload className="h-3.5 w-3.5" />
                Browse files
              </Button>
            </div>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_MIME_TYPES.join(",")}
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="processing" className="gap-1.5">
            In Progress
            {processingCount > 0 && (
              <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[10px] text-primary-foreground">
                {processingCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="failed" className="gap-1.5">
            Failed
            {failedCount > 0 && (
              <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] text-destructive-foreground">
                {failedCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="done">Processed</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Filters */}
      <FilterBar
        onFilterChange={setFilters}
        statusOptions={Object.entries(typeLabels).map(([value, label]) => ({
          value,
          label,
        }))}
        sortOptions={[
          { value: "date-desc", label: "Date (newest first)" },
          { value: "date-asc", label: "Date (oldest first)" },
          { value: "name-asc", label: "Name (A–Z)" },
          { value: "name-desc", label: "Name (Z–A)" },
        ]}
      />

      {/* Document list */}
      {isLoading ? (
        <TableSkeleton rows={6} columns={5} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<FolderOpen className="h-12 w-12" />}
          title="No documents found"
          description="Upload or forward a document to get started. Your agent will process it automatically."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                  Name
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                  Type
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                  Status Pipeline
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                  Uploaded
                </th>
                <th className="py-3 px-4 text-center text-xs font-medium text-muted-foreground">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((doc) => (
                <tr
                  key={doc.id}
                  className="border-b hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => handleDocClick(doc)}
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                        {typeIcons[doc.type] ?? (
                          <FileText className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate max-w-[240px]">
                          {doc.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(doc.sizeBytes)}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <Badge
                      variant="secondary"
                      className={typeBadgeColors[doc.type]}
                    >
                      {typeLabels[doc.type] || doc.type}
                    </Badge>
                  </td>
                  <td className="py-3 px-4">
                    <PipelineBadge status={doc.status} />
                  </td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">
                    {formatDateTime(doc.createdAt)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(doc.id);
                      }}
                      disabled={downloadMutation.isPending}
                      className="inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Document Viewer Drawer */}
      {selectedDoc && (
        <DocumentViewer
          open={viewerOpen}
          onClose={() => {
            setViewerOpen(false);
            setSelectedDoc(null);
          }}
          title={selectedDoc.name}
          type={selectedDoc.type}
          fields={[]}
        />
      )}

      <UploadDialog open={uploadOpen} onOpenChange={setUploadOpen} />
    </div>
  );
}
