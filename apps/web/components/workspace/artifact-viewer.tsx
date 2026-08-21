"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Download,
  ExternalLink,
  FileBarChart,
  FileSpreadsheet,
  FileText,
  FileImage,
  Loader2,
  X,
  AlertTriangle,
  Sparkles,
  ArrowUp,
  RotateCcw,
  Check,
} from "lucide-react";

import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import {
  formatFileSize,
  type ChatArtifactRef,
} from "@/lib/chat/artifact-types";
import type { ArtifactEditMode } from "@/lib/chat/artifact-edit";

// ─── Props ─────────────────────────────────────────────────────────────────

interface ArtifactViewerProps {
  artifact: ChatArtifactRef;
  onClose: () => void;
}

interface SelectionState {
  text: string;
  top: number;
  left: number;
}

interface AiToolbarState {
  mode: ArtifactEditMode;
  position: { top: number; left: number };
}

// ─── AI edit quick actions ─────────────────────────────────────────────────

const AI_SELECTION_CHIPS = [
  "Redo this",
  "Make it clearer",
  "Keep numbers, rephrase",
];
const AI_WHOLE_CHIPS = [
  "Redo the document",
  "Improve the layout",
  "Rewrite in plain language",
];

// ─── CSV parsing (lightweight) ─────────────────────────────────────────────

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows;
}

// ─── Selection capture helpers ─────────────────────────────────────────────

function readSelection(win: Window | null): SelectionState | null {
  if (!win) return null;
  const sel = win.getSelection?.();
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null;
  const text = sel.toString().trim();
  if (!text) return null;
  const range = sel.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  if (!rect || (rect.width === 0 && rect.height === 0)) return null;
  const vw = win.innerWidth ?? 1200;
  const vh = win.innerHeight ?? 800;
  return {
    text: text.slice(0, 4000),
    top: Math.min(Math.max(rect.bottom + 10, 8), vh - 240),
    left: Math.min(Math.max(rect.left, 8), vw - 350),
  };
}

// ─── AI Edit Toolbar (floating prompt bar) ────────────────────────────────

interface AiEditToolbarProps {
  mode: ArtifactEditMode;
  position: { top: number; left: number };
  onSubmit: (instruction: string) => void;
  onClose: () => void;
  editing: boolean;
  error: string | null;
}

export function AiEditToolbar({
  mode,
  position,
  onSubmit,
  onClose,
  editing,
  error,
}: AiEditToolbarProps) {
  const [instruction, setInstruction] = useState("");
  const chips = mode === "selection" ? AI_SELECTION_CHIPS : AI_WHOLE_CHIPS;
  const canSend = instruction.trim().length >= 2 && !editing;

  const send = () => {
    const value = instruction.trim();
    if (value.length < 2 || editing) return;
    onSubmit(value);
  };

  return (
    <div
      role="dialog"
      aria-label="Edit document with AI"
      className="fixed z-[95] w-[340px] overflow-hidden rounded-xl border border-border/60 bg-background shadow-2xl"
      style={{ top: position.top, left: position.left }}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-border/50 bg-primary/5 px-3 py-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary" />
          <p className="truncate text-xs font-semibold text-foreground">
            Edit with AI
          </p>
          <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
            {mode === "selection" ? "selection" : "whole document"}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close AI editor"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {editing ? (
        <div className="flex items-center gap-2 px-3 py-4 text-xs text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          AI is editing this document…
        </div>
      ) : (
        <div className="space-y-2 p-3">
          <div className="flex flex-wrap gap-1.5">
            {chips.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => setInstruction(chip)}
                className={cn(
                  "rounded-full border border-border/50 bg-card px-2 py-1 text-[11px] font-medium text-muted-foreground transition-all hover:border-primary/30 hover:text-primary",
                  instruction === chip &&
                    "border-primary/40 bg-primary/5 text-primary",
                )}
              >
                {chip}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <input
              autoFocus
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") send();
              }}
              placeholder="What should I change?"
              aria-label="AI edit instruction"
              className="min-w-0 flex-1 rounded-lg border border-border/60 bg-background px-2.5 py-1.5 text-xs text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/50"
            />
            <button
              type="button"
              onClick={send}
              disabled={!canSend}
              aria-label="Send AI edit request"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-all hover:bg-primary-hover active:scale-95 disabled:opacity-40"
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="border-t border-border/50 bg-error-clay-bg px-3 py-2 text-[11px] text-error-clay">
          {error}
        </p>
      )}
    </div>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────

export function ArtifactViewer({ artifact, onClose }: ArtifactViewerProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const selectionTimer = useRef<number | null>(null);
  const flashTimer = useRef<number | null>(null);
  const editingRef = useRef(false);

  // Local content overrides the fetched copy after an AI edit / undo.
  const [localContent, setLocalContent] = useState<string | null>(null);
  const [editCount, setEditCount] = useState(0);
  const [selection, setSelection] = useState<SelectionState | null>(null);
  const [aiToolbar, setAiToolbar] = useState<AiToolbarState | null>(null);
  const [editing, setEditing] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [undoError, setUndoError] = useState<string | null>(null);
  const [updatedFlash, setUpdatedFlash] = useState(false);

  // Keep Tab cycling inside the dialog while it is open.
  const trapFocus = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== "Tab") return;
    const panel = panelRef.current;
    if (!panel) return;
    const focusables = panel.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), iframe, input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;
    if (e.shiftKey) {
      if (active === first || !panel.contains(active)) {
        e.preventDefault();
        last.focus();
      }
    } else if (active === last || !panel.contains(active)) {
      e.preventDefault();
      first.focus();
    }
  }, []);

  // Fetch the artifact row (inline content lives in its metadata) and a
  // presigned download URL in parallel.
  const {
    data: artifactRow,
    isLoading,
    isError,
  } = trpc.artifact.getById.useQuery({ id: artifact.artifactId }, { retry: 1 });
  const downloadMutation = trpc.artifact.download.useMutation();
  const editMutation = trpc.artifact.editContent.useMutation();
  const undoMutation = trpc.artifact.undoEdit.useMutation();

  const inlineContent = useMemo(() => {
    const meta = artifactRow?.metadata as Record<string, unknown> | null;
    const content = meta?.content;
    return typeof content === "string" && content.length > 0 ? content : null;
  }, [artifactRow]);

  const displayContent = localContent ?? inlineContent;

  // Sync edit count + content when the artifact row (re)loads.
  useEffect(() => {
    if (!artifactRow) return;
    const meta = artifactRow.metadata as Record<string, unknown> | null;
    const count = meta?.editCount;
    setEditCount(typeof count === "number" ? count : 0);
    const content = meta?.content;
    if (typeof content !== "string" || content.length === 0) {
      setLocalContent(null);
    }
  }, [artifactRow]);

  // Body scroll lock while the viewer is open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
      if (selectionTimer.current) window.clearTimeout(selectionTimer.current);
      if (flashTimer.current) window.clearTimeout(flashTimer.current);
    };
  }, []);

  // Escape closes the viewer.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const mime = artifact.mimeType ?? "";
  const isImage = mime.startsWith("image/");
  const isPdf =
    mime === "application/pdf" || artifact.name.toLowerCase().endsWith(".pdf");
  const isCsv =
    mime === "text/csv" || artifact.name.toLowerCase().endsWith(".csv");
  const isHtml =
    mime === "text/html" || artifact.name.toLowerCase().endsWith(".html");
  const isText =
    mime.startsWith("text/") || mime.includes("json") || mime.includes("xml");
  const isPlainText =
    mime === "text/plain" || artifact.name.toLowerCase().endsWith(".txt");

  // AI editing is limited to HTML / CSV / plain text (mirrors the server's
  // editable set — JSON/XML splicing would corrupt structure).
  const canEdit = !!(displayContent && (isHtml || isCsv || isPlainText));

  const csvRows = useMemo(
    () => (isCsv && displayContent ? parseCsv(displayContent) : []),
    [isCsv, displayContent],
  );

  // ── Selection capture ───────────────────────────────────────────────────
  // Reads a non-empty selection from the iframe (HTML reports) or the parent
  // document (CSV table / plain text) and positions the AI bar near it.
  // NOTE: getBoundingClientRect() inside the iframe returns coordinates
  // relative to the iframe's own viewport, so they are translated by the
  // iframe element's on-screen rect before clamping to the main window.
  const captureSelection = useCallback(() => {
    if (!canEdit || editingRef.current) return;
    if (selectionTimer.current) window.clearTimeout(selectionTimer.current);
    selectionTimer.current = window.setTimeout(() => {
      let next: SelectionState | null = null;
      if (isHtml && iframeRef.current) {
        const frame = iframeRef.current;
        const inner = readSelection(frame.contentWindow);
        if (inner) {
          const frameRect = frame.getBoundingClientRect();
          next = {
            text: inner.text,
            top: Math.min(
              Math.max(frameRect.top + inner.top, 8),
              window.innerHeight - 240,
            ),
            left: Math.min(
              Math.max(frameRect.left + inner.left, 8),
              window.innerWidth - 350,
            ),
          };
        }
      }
      if (!next) next = readSelection(window);
      if (next) {
        setSelection(next);
      } else {
        setSelection(null);
      }
    }, 120);
  }, [canEdit, isHtml]);

  useEffect(() => {
    if (!canEdit) return;
    document.addEventListener("mouseup", captureSelection);
    document.addEventListener("selectionchange", captureSelection);
    return () => {
      document.removeEventListener("mouseup", captureSelection);
      document.removeEventListener("selectionchange", captureSelection);
    };
  }, [canEdit, captureSelection]);

  const handleFrameLoad = useCallback(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    doc.addEventListener("mouseup", captureSelection);
    doc.addEventListener("selectionchange", captureSelection);
  }, [captureSelection]);

  const clearDomSelection = useCallback(() => {
    window.getSelection()?.removeAllRanges();
    iframeRef.current?.contentWindow?.getSelection()?.removeAllRanges();
  }, []);

  // Open the whole-document editor from the header.
  const openWholeEditor = () => {
    setEditError(null);
    setUndoError(null);
    setAiToolbar({
      mode: "whole",
      position: {
        top: Math.max(8, window.innerHeight - 240),
        left: Math.max(8, window.innerWidth / 2 - 170),
      },
    });
  };

  // Open the selection editor from a highlighted passage.
  const openSelectionEditor = () => {
    if (!selection) return;
    setEditError(null);
    setUndoError(null);
    setAiToolbar({
      mode: "selection",
      position: { top: selection.top, left: selection.left },
    });
  };

  const handleAiSubmit = (instruction: string) => {
    if (!aiToolbar) return;
    setEditing(true);
    editingRef.current = true;
    setEditError(null);
    const mode = aiToolbar.mode;
    editMutation.mutate(
      {
        id: artifact.artifactId,
        instruction,
        mode,
        selection: mode === "selection" ? selection?.text : undefined,
      },
      {
        onSuccess: (res) => {
          setLocalContent(res.content);
          setEditCount(res.editCount);
          setAiToolbar(null);
          setSelection(null);
          setUpdatedFlash(true);
          clearDomSelection();
          if (flashTimer.current) window.clearTimeout(flashTimer.current);
          flashTimer.current = window.setTimeout(
            () => setUpdatedFlash(false),
            2600,
          );
        },
        onError: (err) => setEditError(err.message),
        onSettled: () => {
          setEditing(false);
          editingRef.current = false;
        },
      },
    );
  };

  const handleUndo = () => {
    setUndoError(null);
    undoMutation.mutate(
      { id: artifact.artifactId },
      {
        onSuccess: (res) => {
          setLocalContent(res.content);
          setEditCount(res.editCount);
          setUpdatedFlash(false);
          if (flashTimer.current) window.clearTimeout(flashTimer.current);
        },
        onError: (err) => setUndoError(err.message),
      },
    );
  };

  // Download: use the displayed (possibly edited) content → client blob;
  // otherwise the presigned URL.
  const handleDownload = useCallback(() => {
    if (displayContent) {
      const blob = new Blob([displayContent], {
        type: artifact.mimeType || "text/plain",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = artifact.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      return;
    }
    downloadMutation.mutate(
      { id: artifact.artifactId },
      {
        onSuccess: (res) => {
          const a = document.createElement("a");
          a.href = res.downloadUrl;
          a.download = artifact.name;
          a.click();
        },
      },
    );
  }, [
    displayContent,
    artifact.mimeType,
    artifact.name,
    artifact.artifactId,
    downloadMutation,
  ]);

  const kindIcon = isCsv
    ? FileSpreadsheet
    : isImage
      ? FileImage
      : isPdf
        ? FileText
        : FileBarChart;
  const KindIcon = kindIcon;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${artifact.name} document viewer`}
      ref={panelRef}
      onKeyDown={trapFocus}
      className="fixed inset-0 z-[90] flex items-center justify-center p-4 sm:p-8"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 animate-[fade-in_0.2s_ease-out] bg-slate-950/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative flex h-full max-h-[86vh] w-full max-w-4xl animate-in flex-col overflow-hidden rounded-2xl border border-border/60 bg-background shadow-2xl fade-in-0 zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-border/50 bg-background/90 px-4 py-3 backdrop-blur-md sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <KindIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">
                {artifact.name}
              </p>
              <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                <span className="rounded-full bg-muted px-2 py-0.5 font-medium text-foreground">
                  {artifact.docType}
                </span>
                {artifact.mimeType && <span>{artifact.mimeType}</span>}
                {formatFileSize(artifact.sizeBytes) && (
                  <span>{formatFileSize(artifact.sizeBytes)}</span>
                )}
                {editCount > 0 && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 font-semibold text-primary">
                    Edited ×{editCount}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            {canEdit && (
              <button
                type="button"
                onClick={openWholeEditor}
                disabled={editing || !!aiToolbar}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border/50 bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-all hover:border-primary/30 hover:text-primary active:scale-95 disabled:opacity-50"
                title="Ask AI to redo or change this document"
              >
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span className="hidden sm:inline">Ask AI</span>
              </button>
            )}
            {editCount > 0 && (
              <button
                type="button"
                onClick={handleUndo}
                disabled={undoMutation.isPending}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border/50 bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-all hover:border-primary/30 hover:text-primary active:scale-95 disabled:opacity-50"
                title="Undo the last AI edit"
              >
                {undoMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="h-3.5 w-3.5" />
                )}
                <span className="hidden sm:inline">Undo</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloadMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border/50 bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-all hover:border-primary/30 hover:text-primary active:scale-95 disabled:opacity-50"
              title="Download file"
            >
              {downloadMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">Download</span>
            </button>
            <Link
              href="/dashboard"
              target="_blank"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border/50 bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:border-primary/30 hover:text-primary"
              title="Open in Documents"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Documents</span>
            </Link>
            <button
              type="button"
              ref={closeRef}
              onClick={onClose}
              className="ml-1 flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              title="Close (Esc)"
              aria-label="Close viewer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Undo error */}
        {undoError && (
          <div className="flex items-center justify-between gap-2 border-b border-border/50 bg-error-clay-bg px-4 py-2">
            <p className="text-[11px] text-error-clay">{undoError}</p>
            <button
              type="button"
              onClick={() => setUndoError(null)}
              className="text-[11px] font-medium text-error-clay hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Body */}
        <div
          className="relative flex-1 overflow-auto bg-muted/30"
          onScroll={() => {
            // Scrolling detaches the floating selection bar from the passage
            // it annotates — clear it (an open editor dialog is unaffected).
            if (selection && !aiToolbar) setSelection(null);
          }}
        >
          {isLoading && (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-3 p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">
                Opening document...
              </p>
            </div>
          )}

          {!isLoading && isError && (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-3 p-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-error-clay-bg">
                <AlertTriangle className="h-6 w-6 text-error-clay" />
              </div>
              <p className="text-sm font-medium text-foreground">
                Couldn&apos;t open this document
              </p>
              <p className="max-w-sm text-xs text-muted-foreground">
                It may have been moved or deleted. Try downloading it from the
                Documents module instead.
              </p>
              <Link
                href="/dashboard"
                className="mt-1 rounded-lg border border-border/50 bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
              >
                Go to Documents
              </Link>
            </div>
          )}

          {!isLoading && !isError && displayContent && isHtml && (
            <iframe
              title={artifact.name}
              ref={iframeRef}
              srcDoc={displayContent}
              sandbox=""
              onLoad={handleFrameLoad}
              className="h-full min-h-[320px] w-full bg-white"
            />
          )}

          {!isLoading && !isError && displayContent && isCsv && (
            <div className="p-4 sm:p-6">
              <div className="overflow-x-auto rounded-xl border border-border/50 bg-card">
                <table className="w-full border-collapse text-xs">
                  <tbody>
                    {csvRows.map((row, i) => (
                      <tr key={i} className={cn(i === 0 && "bg-primary/5")}>
                        {row.map((cell, j) => (
                          <td
                            key={j}
                            className={cn(
                              "whitespace-nowrap px-3 py-1.5",
                              i === 0
                                ? "font-semibold text-foreground"
                                : "text-muted-foreground",
                              j > 0 && "tabular-nums text-right",
                            )}
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!isLoading &&
            !isError &&
            displayContent &&
            isText &&
            !isHtml &&
            !isCsv && (
              <pre className="whitespace-pre-wrap break-words p-5 font-mono text-xs leading-relaxed text-foreground">
                {displayContent}
              </pre>
            )}

          {!isLoading && !isError && (isImage || isPdf) && (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center bg-slate-950/5 p-4">
              <div className="h-full w-full overflow-auto rounded-xl bg-card p-2 shadow-sm">
                {isImage ? (
                  // Presigned URL fetched lazily when needed
                  <RemoteImage
                    artifactId={artifact.artifactId}
                    name={artifact.name}
                  />
                ) : (
                  <RemotePdf
                    artifactId={artifact.artifactId}
                    name={artifact.name}
                  />
                )}
              </div>
            </div>
          )}

          {!isLoading && !isError && !displayContent && !isImage && !isPdf && (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-3 p-8 text-center">
              <FileText className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-xs text-muted-foreground">
                No inline preview available for this file type.
              </p>
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
              >
                <Download className="h-3.5 w-3.5" />
                Download {artifact.name}
              </button>
            </div>
          )}

          {/* Selection AI bar (appears over a highlighted passage) */}
          {selection && canEdit && !aiToolbar && (
            <div
              className="fixed z-[94]"
              style={{ top: selection.top, left: selection.left }}
            >
              <div className="flex items-center gap-1 rounded-full border border-border/60 bg-background px-2 py-1 shadow-lg">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <p className="max-w-[180px] truncate px-1 text-[11px] font-medium text-foreground">
                  &ldquo;
                  {selection.text.length > 40
                    ? `${selection.text.slice(0, 40)}…`
                    : selection.text}
                  &rdquo;
                </p>
                <button
                  type="button"
                  onClick={openSelectionEditor}
                  className="rounded-full bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground transition-all hover:bg-primary-hover active:scale-95"
                >
                  Ask AI
                </button>
              </div>
            </div>
          )}

          {/* Edit hint (discoverability, first paint only) */}
          {canEdit && !selection && !aiToolbar && editCount === 0 && (
            <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
              <p className="rounded-full border border-border/40 bg-background/90 px-3 py-1.5 text-[11px] text-muted-foreground shadow-sm backdrop-blur-sm">
                ✏️ Select any text to ask AI to change or redo it
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Floating AI editor */}
      {aiToolbar && (
        <AiEditToolbar
          mode={aiToolbar.mode}
          position={aiToolbar.position}
          onSubmit={handleAiSubmit}
          onClose={() => {
            setAiToolbar(null);
            setEditError(null);
            setSelection(null);
          }}
          editing={editing}
          error={editError}
        />
      )}

      {/* Updated flash */}
      {updatedFlash && (
        <div className="fixed left-1/2 top-4 z-[96] flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-emerald-300/40 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
          <Check className="h-3.5 w-3.5" />
          Document updated
        </div>
      )}
    </div>
  );
}

// ─── Lazy presigned-URL image/PDF helpers ───────────────────────────────────

function RemoteImage({
  artifactId,
  name,
}: {
  artifactId: string;
  name: string;
}) {
  const download = trpc.artifact.download.useMutation();
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const requestedRef = useRef(false);

  useEffect(() => {
    // Fire the presigned-URL request exactly once, even if the mutation
    // object identity changes across re-renders (avoids duplicate audit
    // log entries from repeated artifact.download calls).
    if (requestedRef.current || url || failed) return;
    requestedRef.current = true;
    download.mutate(
      { id: artifactId },
      {
        onSuccess: (res) => setUrl(res.downloadUrl),
        onError: () => setFailed(true),
      },
    );
  }, [artifactId, url, failed, download]);

  if (failed) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-8 text-center">
        <AlertTriangle className="h-6 w-6 text-error-clay" />
        <p className="text-xs text-muted-foreground">Preview unavailable.</p>
      </div>
    );
  }
  if (!url) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  return (
    <img
      src={url}
      alt={name}
      className="mx-auto max-h-[70vh] w-auto rounded-lg"
    />
  );
}

function RemotePdf({ artifactId, name }: { artifactId: string; name: string }) {
  const download = trpc.artifact.download.useMutation();
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const requestedRef = useRef(false);

  useEffect(() => {
    if (requestedRef.current || url || failed) return;
    requestedRef.current = true;
    download.mutate(
      { id: artifactId },
      {
        onSuccess: (res) => setUrl(res.downloadUrl),
        onError: () => setFailed(true),
      },
    );
  }, [artifactId, url, failed, download]);

  if (failed) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-8 text-center">
        <AlertTriangle className="h-6 w-6 text-error-clay" />
        <p className="text-xs text-muted-foreground">Preview unavailable.</p>
      </div>
    );
  }
  if (!url) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  return (
    <iframe
      title={name}
      src={url}
      className="h-[70vh] w-full rounded-lg border-0 bg-white"
    />
  );
}
