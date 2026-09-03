"use client";

import { useState, useCallback, useRef } from "react";
import {
  Upload,
  FileText,
  X,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  FileSpreadsheet,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import { useEntity } from "@/lib/entity-context";

// ─── Types ─────────────────────────────────────────────────────────────────

type UploadPhase =
  | "idle"
  | "validating"
  | "uploading"
  | "processing"
  | "done"
  | "error";

type UploadState = {
  phase: UploadPhase;
  file: File | null;
  progress: number;
  error: string | null;
  result: {
    transactionsFound: number;
    transactionsInserted: number;
    bankName?: string;
    warnings?: string[];
  } | null;
};

const ACCEPTED_TYPES = [
  "application/pdf",
  "text/csv",
  "application/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
] as const;

const MAX_SIZE_MB = 25;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

// ─── Component ─────────────────────────────────────────────────────────────

export function StatementUploadZone({
  onUploadComplete,
}: {
  onUploadComplete?: () => void;
}) {
  const { entityId } = useEntity();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<UploadState>({
    phase: "idle",
    file: null,
    progress: 0,
    error: null,
    result: null,
  });
  const [isDragOver, setIsDragOver] = useState(false);

  const getUploadUrl = trpc.document.getUploadUrl.useMutation();
  const confirmUpload = trpc.document.confirmUpload.useMutation();

  // ── Reset ──
  const reset = useCallback(() => {
    setState({
      phase: "idle",
      file: null,
      progress: 0,
      error: null,
      result: null,
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  // ── Validate file ──
  const validateFile = useCallback((file: File): string | null => {
    if (
      !ACCEPTED_TYPES.includes(file.type as (typeof ACCEPTED_TYPES)[number])
    ) {
      return "Unsupported file type. Please upload a PDF, CSV, or Excel file.";
    }
    if (file.size > MAX_SIZE_BYTES) {
      return `File too large — maximum ${MAX_SIZE_MB}MB. Try splitting large statements.`;
    }
    if (file.size === 0) {
      return "File is empty.";
    }
    return null;
  }, []);

  // ── Upload flow ──
  const handleUpload = useCallback(
    async (file: File) => {
      // Phase 1: Validate
      setState((s) => ({ ...s, phase: "validating", file, error: null }));
      const validationError = validateFile(file);
      if (validationError) {
        setState((s) => ({ ...s, phase: "error", error: validationError }));
        return;
      }

      try {
        // Phase 2: Get presigned URL
        setState((s) => ({ ...s, phase: "uploading", progress: 10 }));
        const { uploadUrl, storagePath } = await getUploadUrl.mutateAsync({
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type as (typeof ACCEPTED_TYPES)[number],
        });

        // Phase 3: Upload to R2
        setState((s) => ({ ...s, progress: 30 }));
        const putResponse = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });

        if (!putResponse.ok) {
          throw new Error("Upload to storage failed. Please try again.");
        }

        setState((s) => ({ ...s, progress: 60 }));

        // Phase 4: Confirm and trigger processing
        const docType =
          file.type === "text/csv" || file.type === "application/csv"
            ? "bank_statement"
            : "bank_statement";

        const res = await confirmUpload.mutateAsync({
          r2Key: storagePath,
          r2Bucket: "xenboox-uploads",
          name: file.name,
          type: docType,
          mimeType: file.type,
          fileSize: file.size,
        });

        setState((s) => ({ ...s, progress: 80, phase: "processing" }));

        // Phase 5: Poll for processing completion (max 60 seconds)
        const pollInterval = 2000;
        const maxPolls = 30;
        let pollCount = 0;

        while (pollCount < maxPolls) {
          await new Promise((resolve) => setTimeout(resolve, pollInterval));
          pollCount++;

          try {
            const status = await trpc.client.document.getStatus.query({
              id: res.documentId,
            });

            if (
              status.status === "done" ||
              status.status === "agent_processing"
            ) {
              // Processing complete — extract results from metadata
              const meta = status.metadata as Record<string, unknown> | null;
              const bankImport = meta?.bankImport as
                | {
                    bankAccountId?: string;
                    transactionsFound?: number;
                    transactionsInserted?: number;
                    transactionsSkipped?: number;
                    bankName?: string;
                    parseErrors?: string[];
                  }
                | undefined;

              setState((s) => ({
                ...s,
                phase: "done",
                progress: 100,
                result: bankImport
                  ? {
                      transactionsFound: bankImport.transactionsFound ?? 0,
                      transactionsInserted:
                        bankImport.transactionsInserted ?? 0,
                      bankName: bankImport.bankName,
                      warnings: bankImport.parseErrors ?? [],
                    }
                  : {
                      transactionsFound: 0,
                      transactionsInserted: 0,
                      warnings: [],
                    },
              }));

              onUploadComplete?.();
              return;
            }

            if (status.status === "failed") {
              const meta = (status.metadata ?? {}) as Record<string, unknown>;
              const bankImport = meta.bankImport as
                | { fatalErrors?: string[] }
                | undefined;
              const fatalErrors = bankImport?.fatalErrors ?? [];
              const errorMsg =
                (meta.error as string | undefined) ??
                "Processing failed. The file may not be a valid bank statement.";
              throw new Error(
                fatalErrors.length > 1
                  ? `${errorMsg} ${fatalErrors.slice(1).join(" ")}`
                  : errorMsg,
              );
            }

            // Update progress based on pipeline stage
            const stageProgress: Record<string, number> = {
              detected: 82,
              processing: 85,
              extracted: 88,
              synced: 92,
              validated: 95,
              agent_processing: 98,
            };
            const p = stageProgress[status.status] ?? 80;
            setState((s) => ({ ...s, progress: p }));
          } catch {
            // Query might fail during processing — keep polling
          }
        }

        // Timed out — but processing may still be running
        setState((s) => ({
          ...s,
          phase: "done",
          progress: 100,
          result: {
            transactionsFound: 0,
            transactionsInserted: 0,
          },
        }));
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Upload failed. Please try again.";
        setState((s) => ({ ...s, phase: "error", error: message }));
      }
    },
    [entityId, validateFile, getUploadUrl, confirmUpload, onUploadComplete],
  );

  // ── Drag handlers ──
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const file = e.dataTransfer.files?.[0];
      if (file) handleUpload(file);
    },
    [handleUpload],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleUpload(file);
    },
    [handleUpload],
  );

  // ── Render: Done state ──
  if (state.phase === "done") {
    return (
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/10">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground">
              Statement imported successfully
            </p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              {state.result?.bankName && `${state.result.bankName} — `}
              {state.result?.transactionsInserted ?? 0} transactions imported
              {(state.result?.transactionsFound ?? 0) >
                (state.result?.transactionsInserted ?? 0) &&
                ` (${state.result!.transactionsFound - state.result!.transactionsInserted} duplicates skipped)`}
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              AI will auto-categorize transactions shortly.
            </p>
          </div>
          <button
            onClick={reset}
            className="shrink-0 rounded-lg border border-border/50 bg-background px-3 py-1.5 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Upload Another
          </button>
        </div>
        {state.result?.warnings && state.result.warnings.length > 0 && (
          <div className="mt-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5">
            <p className="text-[10px] font-medium text-amber-600">
              Needs your attention
            </p>
            <ul className="mt-1 space-y-0.5">
              {state.result.warnings.slice(0, 3).map((w, i) => (
                <li
                  key={i}
                  className="text-[10px] leading-relaxed text-muted-foreground"
                >
                  {w}
                </li>
              ))}
              {state.result.warnings.length > 3 && (
                <li className="text-[10px] text-muted-foreground">
                  …and {state.result.warnings.length - 3} more
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
    );
  }

  // ── Render: Error state ──
  if (state.phase === "error") {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-500/10">
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground">Upload failed</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              {state.error}
            </p>
          </div>
          <button
            onClick={reset}
            className="shrink-0 rounded-lg border border-border/50 bg-background px-3 py-1.5 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // ── Render: Processing state ──
  if (state.phase === "uploading" || state.phase === "processing") {
    return (
      <div className="rounded-xl border border-border/50 bg-card p-4">
        <div className="flex items-start gap-3">
          <Loader2 className="h-5 w-5 text-primary animate-spin shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground">
              {state.phase === "uploading"
                ? "Uploading statement..."
                : "Processing transactions..."}
            </p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              {state.phase === "uploading"
                ? `${state.file?.name}`
                : "AI is extracting and categorizing transactions"}
            </p>
            {/* Progress bar */}
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                style={{ width: `${state.progress}%` }}
              />
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">
              {state.progress}% complete
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: Idle state (drag-drop zone) ──
  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      className={cn(
        "group relative cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-all",
        isDragOver
          ? "border-primary bg-primary/5 scale-[1.01]"
          : "border-border/50 bg-card/50 hover:border-primary/30 hover:bg-primary/[0.02]",
      )}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.csv,.xls,.xlsx"
        onChange={handleFileSelect}
        className="hidden"
        aria-label="Upload bank statement"
      />

      <div className="flex flex-col items-center gap-3">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl transition-colors",
            isDragOver
              ? "bg-primary/15"
              : "bg-muted/50 group-hover:bg-primary/10",
          )}
        >
          <Upload
            className={cn(
              "h-5 w-5 transition-colors",
              isDragOver
                ? "text-primary"
                : "text-muted-foreground group-hover:text-primary",
            )}
          />
        </div>

        <div>
          <p className="text-xs font-medium text-foreground">
            {isDragOver
              ? "Drop your statement here"
              : "Upload a bank statement"}
          </p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            Drag & drop or click to browse
          </p>
        </div>

        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            PDF
          </span>
          <span className="flex items-center gap-1">
            <FileSpreadsheet className="h-3 w-3" />
            CSV
          </span>
          <span className="flex items-center gap-1">
            <FileSpreadsheet className="h-3 w-3" />
            Excel
          </span>
          <span className="text-muted-foreground/50">•</span>
          <span>Max {MAX_SIZE_MB}MB</span>
        </div>

        <div className="flex items-center gap-1.5 rounded-lg bg-primary/[0.03] px-3 py-1.5">
          <Sparkles className="h-3 w-3 text-primary" />
          <span className="text-[10px] text-foreground/70">
            AI auto-categorizes all transactions
          </span>
        </div>
      </div>
    </div>
  );
}
