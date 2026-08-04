"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import {
  ArrowUp,
  Paperclip,
  Mic,
  Plus,
  FileText,
  Image,
  FileSpreadsheet,
  X,
  Loader2,
  Check,
  Slash,
  Command,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

// ─── File Types ──────────────────────────────────────────────────────────

interface UploadedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  status: "uploading" | "processing" | "ready" | "error";
  progress?: number;
  preview?: string;
  documentId?: string;
  error?: string;
}

// ─── Slash Commands ──────────────────────────────────────────────────────

const slashCommands = [
  {
    command: "/create",
    label: "Create",
    description: "Create invoices, bills, journal entries",
    icon: Plus,
  },
  {
    command: "/reconcile",
    label: "Reconcile",
    description: "Run bank reconciliation",
    icon: Check,
  },
  {
    command: "/report",
    label: "Report",
    description: "Generate financial reports",
    icon: FileText,
  },
  {
    command: "/analyze",
    label: "Analyze",
    description: "Analyze transactions or trends",
    icon: Sparkles,
  },
  {
    command: "/find",
    label: "Find",
    description: "Search documents, invoices, customers",
    icon: Command,
  },
];

// ─── File Preview Component ──────────────────────────────────────────────

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
    file.status === "uploading" || file.status === "processing";

  return (
    <div
      className={cn(
        "relative flex items-center gap-3 rounded-xl border bg-card p-3 transition-all",
        file.status === "error"
          ? "border-red-200 bg-red-50"
          : "border-border/50",
      )}
    >
      {/* File Icon */}
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
          file.type.includes("pdf")
            ? "bg-red-100"
            : file.type.includes("image")
              ? "bg-blue-100"
              : file.type.includes("spreadsheet") || file.type.includes("excel")
                ? "bg-green-100"
                : "bg-gray-100",
        )}
      >
        <Icon
          className={cn(
            "h-5 w-5",
            file.type.includes("pdf")
              ? "text-red-600"
              : file.type.includes("image")
                ? "text-blue-600"
                : file.type.includes("spreadsheet") ||
                    file.type.includes("excel")
                  ? "text-green-600"
                  : "text-gray-600",
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
                {file.status === "uploading" ? "Uploading..." : "Processing..."}
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

// ─── Slash Command Menu ──────────────────────────────────────────────────

function SlashCommandMenu({
  commands,
  onSelect,
  query,
}: {
  commands: typeof slashCommands;
  onSelect: (command: string) => void;
  query: string;
}) {
  const filtered = commands.filter(
    (cmd) =>
      cmd.command.includes(query.toLowerCase()) ||
      cmd.label.toLowerCase().includes(query.toLowerCase()),
  );

  if (filtered.length === 0) return null;

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 rounded-xl border border-border/50 bg-card shadow-xl overflow-hidden z-50">
      <div className="p-2">
        <p className="text-[10px] font-medium text-muted-foreground px-2 py-1">
          Commands
        </p>
        {filtered.map((cmd) => (
          <button
            key={cmd.command}
            type="button"
            onClick={() => onSelect(cmd.command)}
            className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-accent transition-colors text-left"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <cmd.icon className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground">{cmd.label}</p>
              <p className="text-[10px] text-muted-foreground">
                {cmd.description}
              </p>
            </div>
            <span className="text-[10px] text-muted-foreground font-mono">
              {cmd.command}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main Composer Component ─────────────────────────────────────────────

interface AIComposerProps {
  onSend: (message: string, files?: UploadedFile[]) => void;
  isStreaming?: boolean;
  onCancel?: () => void;
  placeholder?: string;
  disabled?: boolean;
  entityId?: string;
}

export function AIComposer({
  onSend,
  isStreaming = false,
  onCancel,
  placeholder = "Ask Xenboox anything or assign work...",
  disabled = false,
}: AIComposerProps) {
  const [inputValue, setInputValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashQuery, setSlashQuery] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);

  // tRPC mutations for file upload
  const getUploadUrl = trpc.document.getUploadUrl.useMutation();
  const confirmUpload = trpc.document.confirmUpload.useMutation();

  // Handle slash commands
  useEffect(() => {
    if (inputValue.startsWith("/")) {
      setShowSlashMenu(true);
      setSlashQuery(inputValue);
    } else {
      setShowSlashMenu(false);
    }
  }, [inputValue]);

  // Handle drag and drop
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

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFiles(files);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

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

    // Start real upload for each file
    newFiles.forEach((f) => {
      uploadFile(f);
    });
  };

  // Real upload to R2
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
            ? { ...f, status: "processing" as const, progress: 60 }
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

  // Infer document type from filename and MIME type
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

    if (lower.includes("invoice") || lower.includes("inv-")) return "invoice";
    if (lower.includes("receipt")) return "receipt";
    if (lower.includes("contract") || lower.includes("agreement"))
      return "contract";
    if (lower.includes("voucher") || lower.includes("journal"))
      return "voucher";
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

    if (mimeType.includes("spreadsheet") || mimeType.includes("excel"))
      return "supporting";
    if (mimeType.includes("pdf")) return "supporting";
    if (mimeType.includes("image")) return "supporting";

    return "supporting";
  }

  const removeFile = (fileId: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const handleSend = () => {
    if ((!inputValue.trim() && uploadedFiles.length === 0) || isStreaming)
      return;
    onSend(inputValue, uploadedFiles.length > 0 ? uploadedFiles : undefined);
    setInputValue("");
    setUploadedFiles([]);
  };

  const handleSlashSelect = (command: string) => {
    setInputValue(command + " ");
    setShowSlashMenu(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      ref={composerRef}
      className={cn(
        "relative rounded-2xl border-2 bg-card transition-all duration-300",
        isFocused
          ? "border-primary/50 shadow-lg shadow-primary/5"
          : "border-border/50 hover:border-border/80 hover:shadow-md",
        isDragging && "border-primary bg-primary/5",
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Slash Command Menu */}
      {showSlashMenu && (
        <SlashCommandMenu
          commands={slashCommands}
          onSelect={handleSlashSelect}
          query={slashQuery}
        />
      )}

      {/* Drag Overlay */}
      {isDragging && (
        <div className="absolute inset-0 rounded-2xl bg-primary/10 flex items-center justify-center z-10 border-2 border-dashed border-primary">
          <div className="flex flex-col items-center gap-2">
            <Paperclip className="h-8 w-8 text-primary" />
            <p className="text-sm font-medium text-primary">Drop files here</p>
            <p className="text-xs text-primary/70">
              PDF, Excel, CSV, Images, and more
            </p>
          </div>
        </div>
      )}

      {/* Uploaded Files */}
      {uploadedFiles.length > 0 && (
        <div className="p-3 border-b border-border/50 space-y-2">
          <div className="flex items-center gap-2">
            <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[10px] font-medium text-muted-foreground">
              {uploadedFiles.length} file{uploadedFiles.length > 1 ? "s" : ""}{" "}
              attached
            </span>
          </div>
          <div className="grid gap-2">
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
      <div className="flex items-center gap-2 px-4 py-3">
        {/* Action Buttons */}
        <div className="flex items-center gap-1">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.xlsx,.xls,.csv,.doc,.docx,.png,.jpg,.jpeg,.gif,.zip,.txt"
            className="hidden"
            onChange={handleFileSelect}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="h-9 w-9 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            title="Attach file"
          >
            <Paperclip className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="h-9 w-9 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            title="Voice input (coming soon)"
          >
            <Mic className="h-4 w-4" />
          </button>
        </div>

        {/* Text Input */}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isStreaming}
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-none disabled:opacity-50"
        />

        {/* Send / Cancel Button */}
        {isStreaming ? (
          <button
            type="button"
            onClick={onCancel}
            className="h-10 w-10 rounded-xl bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSend}
            disabled={
              (!inputValue.trim() && uploadedFiles.length === 0) || disabled
            }
            className={cn(
              "h-10 w-10 rounded-xl flex items-center justify-center transition-all",
              inputValue.trim() || uploadedFiles.length > 0
                ? "bg-primary hover:bg-primary/90 text-white shadow-sm"
                : "bg-muted text-muted-foreground",
            )}
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Hints */}
      <div className="px-4 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-muted-foreground">
            <kbd className="px-1 py-0.5 rounded bg-muted text-[9px] font-mono">
              /
            </kbd>{" "}
            for commands
          </span>
          <span className="text-[10px] text-muted-foreground">
            <kbd className="px-1 py-0.5 rounded bg-muted text-[9px] font-mono">
              Enter
            </kbd>{" "}
            to send
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground">
          Drop files anywhere
        </span>
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}
