"use client";

import { useState, useRef, useCallback, useEffect } from "react";
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
  Command,
  Sparkles,
  AtSign,
  Receipt,
  FileDigit,
  Wallet,
  Users,
  Truck,
  type LucideIcon,
} from "lucide-react";

import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import {
  MENTION_KIND_LABELS,
  type MentionItem,
  type PinnedContext,
} from "@/lib/chat/mention-types";

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

// ─── Mention Picker ──────────────────────────────────────────────────────

const MENTION_ICONS: Record<MentionItem["kind"], LucideIcon> = {
  document: FileText,
  transaction: FileDigit,
  invoice: Receipt,
  bill: Receipt,
  account: Wallet,
  customer: Users,
  supplier: Truck,
};

function MentionPicker({
  results,
  query,
  fetching,
  onSelect,
}: {
  results: MentionItem[];
  query: string;
  fetching: boolean;
  onSelect: (item: MentionItem) => void;
}) {
  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 rounded-xl border border-border/50 bg-card shadow-xl overflow-hidden z-50">
      <div className="p-2">
        <p className="text-[10px] font-medium text-muted-foreground px-2 py-1">
          Pin context — documents, transactions, accounts…
        </p>
        {fetching && results.length === 0 ? (
          <div className="flex items-center gap-2 px-3 py-3">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Searching…</span>
          </div>
        ) : results.length === 0 ? (
          <p className="px-3 py-3 text-xs text-muted-foreground">
            No matches for “{query}”.
          </p>
        ) : (
          results.map((item) => {
            const Icon = MENTION_ICONS[item.kind] ?? FileText;
            return (
              <button
                key={`${item.kind}:${item.id}`}
                type="button"
                onClick={() => onSelect(item)}
                className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-accent transition-colors text-left"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">
                    {item.label}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {item.subtitle}
                  </p>
                </div>
                <span className="text-[9px] font-medium text-primary bg-primary/10 rounded px-1.5 py-0.5 flex-shrink-0">
                  {MENTION_KIND_LABELS[item.kind]}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── Main Composer Component ─────────────────────────────────────────────

interface AIComposerProps {
  onSend: (
    message: string,
    files?: UploadedFile[],
    pinned?: PinnedContext[],
  ) => void;
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
  entityId,
}: AIComposerProps) {
  const [inputValue, setInputValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [pinned, setPinned] = useState<PinnedContext[]>([]);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashQuery, setSlashQuery] = useState("");
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionActive, setMentionActive] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);

  // Entity-scoped search for '@'-mentions. Empty query returns recent
  // documents/accounts so the picker has something to show on first '@'.
  const { data: mentionResults, isFetching: mentionsFetching } =
    trpc.chat.searchMentions.useQuery(
      { query: mentionQuery, limit: 6 },
      {
        enabled: mentionActive && !!entityId,
        placeholderData: (prev) => prev,
      },
    );

  // tRPC mutations for file upload
  const getUploadUrl = trpc.document.getUploadUrl.useMutation();
  const confirmUpload = trpc.document.confirmUpload.useMutation();

  // Handle slash commands
  useEffect(() => {
    if (inputValue.startsWith("/") && !mentionActive) {
      setShowSlashMenu(true);
      setSlashQuery(inputValue);
    } else {
      setShowSlashMenu(false);
    }
  }, [inputValue, mentionActive]);

  // Handle '@'-mentions — detect the token after the last '@' (bounded to a
  // single word) and open the entity-scoped picker. Typing a space or sending
  // closes it.
  useEffect(() => {
    if (disabled || isStreaming) {
      setMentionActive(false);
      return;
    }
    const at = inputValue.lastIndexOf("@");
    if (at === -1) {
      setMentionActive(false);
      return;
    }
    const after = inputValue.slice(at + 1);
    if (after.includes(" ")) {
      // '@' followed by a full word already committed — not an active trigger.
      setMentionActive(false);
      return;
    }
    setMentionActive(true);
    setMentionQuery(after.trim());
  }, [inputValue, disabled, isStreaming]);

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
    onSend(
      inputValue,
      uploadedFiles.length > 0 ? uploadedFiles : undefined,
      pinned.length > 0 ? pinned : undefined,
    );
    setInputValue("");
    setUploadedFiles([]);
    setPinned([]);
  };

  const handleSlashSelect = (command: string) => {
    setInputValue(command + " ");
    setShowSlashMenu(false);
    inputRef.current?.focus();
  };

  /**
   * Selecting a mention replaces the raw '@word' trigger with the pinned
   * label inline (readable in the sent message) and pins the record itself
   * as structured context the stream route re-resolves entity-scoped.
   */
  const handleMentionSelect = (item: MentionItem) => {
    const at = inputValue.lastIndexOf("@");
    const before = at > 0 ? inputValue.slice(0, at) : "";
    // Trim a stray space left before '@' so the pin reads naturally inline.
    const prefix = before.replace(/\s+$/, "");
    const next = (prefix ? prefix + " " : "") + "@" + item.label + " ";
    setInputValue(next);
    setPinned((prev) => [
      ...prev.filter((p) => !(p.kind === item.kind && p.id === item.id)),
      { kind: item.kind, id: item.id, label: item.label },
    ]);
    setMentionActive(false);
    inputRef.current?.focus();
  };

  const removePinned = (kind: PinnedContext["kind"], id: string) => {
    setPinned((prev) => prev.filter((p) => !(p.kind === kind && p.id === id)));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Esc closes the mention picker without sending.
    if (e.key === "Escape" && mentionActive) {
      e.preventDefault();
      setMentionActive(false);
      return;
    }
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
      {showSlashMenu && !mentionActive && (
        <SlashCommandMenu
          commands={slashCommands}
          onSelect={handleSlashSelect}
          query={slashQuery}
        />
      )}

      {/* @-mention Picker */}
      {mentionActive && (
        <MentionPicker
          results={mentionResults ?? []}
          query={mentionQuery}
          fetching={mentionsFetching}
          onSelect={handleMentionSelect}
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

      {/* Pinned Context Chips */}
      {pinned.length > 0 && (
        <div className="p-3 pb-0 flex flex-wrap gap-1.5">
          {pinned.map((p) => {
            const Icon = MENTION_ICONS[p.kind] ?? FileText;
            return (
              <span
                key={`${p.kind}:${p.id}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-[10px] text-primary"
              >
                <Icon className="h-3 w-3" />
                <AtSign className="h-3 w-3" />
                <span className="max-w-[180px] truncate font-medium">
                  {p.label}
                </span>
                <button
                  type="button"
                  onClick={() => removePinned(p.kind, p.id)}
                  className="ml-0.5 rounded-full hover:bg-primary/10 p-0.5 transition-colors"
                  aria-label={`Remove ${p.label}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}
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
            commands
          </span>
          <span className="text-[10px] text-muted-foreground">
            <kbd className="px-1 py-0.5 rounded bg-muted text-[9px] font-mono">
              @
            </kbd>{" "}
            pin context
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
