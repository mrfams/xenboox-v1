"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useEntity } from "@/lib/entity-context";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui";
import {
  ArrowRight,
  ArrowUp,
  BookOpen,
  Wallet,
  FileText,
  Search,
  BarChart3,
  RefreshCw,
  Calendar,
  Paperclip,
  X,
  Loader2,
  Check,
  Image,
  FileSpreadsheet,
  type LucideIcon,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────

interface UploadedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  status: "uploading" | "processing" | "ready" | "error" | "uploading-to-r2";
  progress?: number;
  r2Key?: string;
  documentId?: string;
  error?: string;
}

type DashboardInputProps = {
  className?: string;
};

type Suggestion = {
  label: string;
  prompt: string;
  icon: typeof BookOpen;
};

// ─── Suggestions ───────────────────────────────────────────────────────────

const SUGGESTIONS: Suggestion[] = [
  {
    label: "Close July books",
    prompt: "Close the books for July 2025",
    icon: BookOpen,
  },
  {
    label: "Explain cash position",
    prompt: "Explain my current cash position",
    icon: Wallet,
  },
  {
    label: "Create payroll",
    prompt: "Create a new payroll run",
    icon: FileText,
  },
  {
    label: "Find duplicate expenses",
    prompt: "Scan for duplicate expenses this month",
    icon: Search,
  },
  {
    label: "Forecast next month",
    prompt: "Forecast cash flow for next month",
    icon: BarChart3,
  },
  {
    label: "Show unpaid invoices",
    prompt: "Show all unpaid invoices",
    icon: Calendar,
  },
];

// ─── File Preview Card ─────────────────────────────────────────────────────

function FilePreviewCard({
  file,
  onRemove,
}: {
  file: UploadedFile;
  onRemove: () => void;
}) {
  const getFileIcon = (type: string): LucideIcon => {
    if (type.includes("pdf")) return FileText;
    if (type.includes("image")) return Image;
    if (
      type.includes("spreadsheet") ||
      type.includes("excel") ||
      type.includes("csv")
    )
      return FileSpreadsheet;
    return FileText;
  };

  const Icon = getFileIcon(file.type);
  const isProcessing =
    file.status === "uploading" ||
    file.status === "processing" ||
    file.status === "uploading-to-r2";

  return (
    <div
      className={cn(
        "relative flex items-center gap-3 rounded-xl border bg-card p-3 transition-all",
        file.status === "error"
          ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30"
          : "border-border/50",
      )}
    >
      {/* File Icon */}
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
          file.type.includes("pdf")
            ? "bg-red-100 dark:bg-red-950/30"
            : file.type.includes("image")
              ? "bg-blue-100 dark:bg-blue-950/30"
              : file.type.includes("spreadsheet") || file.type.includes("excel")
                ? "bg-green-100 dark:bg-green-950/30"
                : "bg-gray-100 dark:bg-gray-800",
        )}
      >
        <Icon
          className={cn(
            "h-5 w-5",
            file.type.includes("pdf")
              ? "text-red-600 dark:text-red-400"
              : file.type.includes("image")
                ? "text-blue-600 dark:text-blue-400"
                : file.type.includes("spreadsheet") ||
                    file.type.includes("excel")
                  ? "text-green-600 dark:text-green-400"
                  : "text-gray-600 dark:text-gray-400",
          )}
        />
      </div>

      {/* File Info */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground truncate">
          {file.name}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] text-muted-foreground">
            {formatFileSize(file.size)}
          </span>
          {isProcessing && (
            <div className="flex items-center gap-1">
              <Loader2 className="h-3 w-3 text-primary animate-spin" />
              <span className="text-[10px] text-primary">
                {file.status === "uploading"
                  ? "Uploading..."
                  : file.status === "uploading-to-r2"
                    ? "Saving..."
                    : "Processing..."}
              </span>
            </div>
          )}
          {file.status === "ready" && (
            <span className="flex items-center gap-1 text-[10px] text-emerald-600">
              <Check className="h-3 w-3" />
              Ready
            </span>
          )}
          {file.status === "error" && (
            <span className="text-[10px] text-red-600">
              {file.error || "Failed"}
            </span>
          )}
        </div>
        {/* Progress bar */}
        {isProcessing && file.progress !== undefined && (
          <div className="mt-2 h-1 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${file.progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Remove button */}
      <button
        type="button"
        onClick={onRemove}
        className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ─── Main Dashboard Input Component ────────────────────────────────────────

export function DashboardInput({ className }: DashboardInputProps) {
  const router = useRouter();
  const { entityId } = useEntity();
  const [inputValue, setInputValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);

  // tRPC utilities
  const utils = trpc.useUtils();

  // Document upload mutations
  const getUploadUrl = trpc.document.getUploadUrl.useMutation();
  const confirmUpload = trpc.document.confirmUpload.useMutation();

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (
      composerRef.current &&
      !composerRef.current.contains(e.relatedTarget as Node)
    ) {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, []);

  // File selection handler
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFiles(files);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Process selected files
  const handleFiles = (files: File[]) => {
    const newFiles: UploadedFile[] = files.map((file) => ({
      id: crypto.randomUUID(),
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      status: "uploading" as const,
      progress: 0,
    }));

    setUploadedFiles((prev) => [...prev, ...newFiles]);

    // Start upload process for each file
    newFiles.forEach((f) => {
      uploadFile(f);
    });
  };

  // Upload file to R2
  const uploadFile = async (fileToUpload: UploadedFile) => {
    try {
      // Step 1: Get presigned upload URL
      setUploadedFiles((prev) =>
        prev.map((f) =>
          f.id === fileToUpload.id
            ? { ...f, status: "uploading" as const, progress: 30 }
            : f,
        ),
      );

      const uploadResult = await getUploadUrl.mutateAsync({
        fileName: fileToUpload.name,
        fileSize: fileToUpload.size,
        mimeType: fileToUpload.type as any,
      });

      // Step 2: Upload file to R2
      setUploadedFiles((prev) =>
        prev.map((f) =>
          f.id === fileToUpload.id
            ? { ...f, status: "uploading-to-r2" as const, progress: 60 }
            : f,
        ),
      );

      const response = await fetch(uploadResult.uploadUrl, {
        method: "PUT",
        body: fileToUpload.file,
        headers: {
          "Content-Type": fileToUpload.type,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to upload file to storage");
      }

      // Step 3: Confirm upload and create document record
      setUploadedFiles((prev) =>
        prev.map((f) =>
          f.id === fileToUpload.id
            ? { ...f, status: "processing" as const, progress: 90 }
            : f,
        ),
      );

      const docType = inferDocumentType(fileToUpload.type, fileToUpload.name);
      const confirmResult = await confirmUpload.mutateAsync({
        r2Key: uploadResult.storagePath,
        r2Bucket: "xenboox-documents",
        name: fileToUpload.name,
        type: docType,
        mimeType: fileToUpload.type,
        fileSize: fileToUpload.size,
      });

      // Mark as ready
      setUploadedFiles((prev) =>
        prev.map((f) =>
          f.id === fileToUpload.id
            ? {
                ...f,
                status: "ready" as const,
                progress: 100,
                r2Key: uploadResult.storagePath,
                documentId: confirmResult.documentId,
              }
            : f,
        ),
      );
    } catch (error) {
      console.error("Upload failed:", error);
      setUploadedFiles((prev) =>
        prev.map((f) =>
          f.id === fileToUpload.id
            ? {
                ...f,
                status: "error" as const,
                error: error instanceof Error ? error.message : "Upload failed",
              }
            : f,
        ),
      );
    }
  };

  // Remove file from list
  const removeFile = (fileId: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  // Submit message with files
  const handleSubmit = async (value: string) => {
    const trimmed = value.trim();
    if ((!trimmed && uploadedFiles.length === 0) || isSubmitting) return;

    setIsSubmitting(true);

    try {
      // Build message context with file references
      let messageContent = trimmed || "Please process the attached files";

      if (uploadedFiles.length > 0) {
        const readyFiles = uploadedFiles.filter((f) => f.status === "ready");
        if (readyFiles.length > 0) {
          const fileContext = readyFiles
            .map(
              (f) =>
                `[Attached: ${f.name} (${f.documentId ? `doc:${f.documentId}` : "processing"})]`,
            )
            .join("\n");
          messageContent = `${messageContent}\n\n${fileContext}`;
        }
      }

      // Navigate to chat with the message
      router.push(
        `/dashboard/chat?initial=${encodeURIComponent(messageContent)}`,
      );

      setInputValue("");
      setUploadedFiles([]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(inputValue);
    }
  };

  const hasFiles = uploadedFiles.length > 0;
  const hasReadyFiles = uploadedFiles.some((f) => f.status === "ready");
  const isUploading = uploadedFiles.some(
    (f) =>
      f.status === "uploading" ||
      f.status === "uploading-to-r2" ||
      f.status === "processing",
  );

  return (
    <div className={cn("space-y-3", className)} ref={composerRef}>
      {/* Prompt Header */}
      <p className="text-sm font-medium text-foreground">
        What would you like Xenboox to do today?
      </p>

      {/* Chat Input with File Upload */}
      <div
        className={cn(
          "relative group rounded-2xl border-2 bg-card transition-all duration-300",
          isFocused
            ? "border-[#6366F1]/50 shadow-lg shadow-[#6366F1]/5"
            : "border-border/50 hover:border-border/80 hover:shadow-md",
          isDragging && "border-primary bg-primary/5",
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drag Overlay */}
        {isDragging && (
          <div className="absolute inset-0 rounded-2xl bg-primary/10 flex items-center justify-center z-10 border-2 border-dashed border-primary">
            <div className="flex flex-col items-center gap-2">
              <Paperclip className="h-8 w-8 text-primary" />
              <p className="text-sm font-medium text-primary">
                Drop files here
              </p>
              <p className="text-xs text-primary/70">
                PDF, Excel, CSV, Images, and more
              </p>
            </div>
          </div>
        )}

        {/* Uploaded Files */}
        {hasFiles && (
          <div className="p-3 border-b border-border/50 space-y-2">
            <div className="flex items-center gap-2">
              <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[10px] font-medium text-muted-foreground">
                {uploadedFiles.length} file
                {uploadedFiles.length > 1 ? "s" : ""} attached
              </span>
            </div>
            <div className="grid gap-2 max-h-40 overflow-y-auto">
              {uploadedFiles.map((file) => (
                <FilePreviewCard
                  key={file.id}
                  file={file}
                  onRemove={() => removeFile(file.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="relative flex items-center gap-3 px-4 py-3.5">
          {/* File Upload Button */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.xlsx,.xls,.csv,.doc,.docx,.png,.jpg,.jpeg,.gif,.zip,.txt,.tiff,.webp"
            className="hidden"
            onChange={handleFileSelect}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="h-9 w-9 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors shrink-0"
            title="Attach files"
          >
            <Paperclip className="h-4 w-4" />
          </button>

          {/* Text Input */}
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={handleKeyDown}
            placeholder={
              hasFiles
                ? "Add a message about your files..."
                : "Ask anything about your accounting..."
            }
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-none"
          />

          {/* Send Button */}
          <Button
            type="button"
            size="icon"
            onClick={() => handleSubmit(inputValue)}
            disabled={
              (!inputValue.trim() && !hasReadyFiles) ||
              isSubmitting ||
              isUploading
            }
            className={cn(
              "h-10 w-10 rounded-xl p-0 transition-all shrink-0",
              inputValue.trim() || hasReadyFiles
                ? "bg-[#6366F1] hover:bg-[#6366F1]/90 text-white shadow-sm"
                : "bg-[#6366F1] text-white",
            )}
          >
            {isSubmitting || isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowRight className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Quick Action Pills */}
      {!hasFiles && (
        <div className="scrollbar-hide flex items-center gap-2 overflow-x-auto py-0.5">
          {SUGGESTIONS.map((suggestion) => {
            const Icon = suggestion.icon;
            return (
              <button
                key={suggestion.label}
                type="button"
                onClick={() => handleSubmit(suggestion.prompt)}
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
      )}

      {/* Hints */}
      {hasFiles && (
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span>
            <kbd className="px-1 py-0.5 rounded bg-muted text-[9px] font-mono">
              Enter
            </kbd>{" "}
            to send with files
          </span>
          <span>•</span>
          <span>Drop files anywhere to attach</span>
        </div>
      )}
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function inferDocumentType(
  mimeType: string,
  fileName: string,
):
  | "invoice"
  | "receipt"
  | "contract"
  | "voucher"
  | "bank_statement"
  | "tax_return"
  | "payroll_report"
  | "journal_entry"
  | "po"
  | "supporting" {
  const lower = fileName.toLowerCase();

  // Check by filename patterns
  if (lower.includes("invoice") || lower.includes("inv-")) return "invoice";
  if (lower.includes("receipt")) return "receipt";
  if (lower.includes("contract") || lower.includes("agreement"))
    return "contract";
  if (lower.includes("voucher") || lower.includes("journal")) return "voucher";
  if (
    lower.includes("bank") ||
    lower.includes("statement") ||
    lower.includes("stmt")
  )
    return "bank_statement";
  if (lower.includes("tax") || lower.includes("return")) return "tax_return";
  if (lower.includes("payroll") || lower.includes("salary"))
    return "payroll_report";
  if (lower.includes("purchase") || lower.includes("po-")) return "po";

  // Check by MIME type
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel"))
    return "supporting";
  if (mimeType.includes("pdf")) return "supporting";
  if (mimeType.includes("image")) return "supporting";

  return "supporting";
}
