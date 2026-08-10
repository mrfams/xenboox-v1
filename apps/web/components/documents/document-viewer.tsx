"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowUp,
  Bot,
  Check,
  ChevronRight,
  Copy,
  Download,
  File,
  FileImage,
  FileSpreadsheet,
  FileText,
  Loader2,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";

import { trpc } from "@/lib/trpc/client";
import { useEntity } from "@/lib/entity-context";
import { cn } from "@/lib/utils";
import { formatFileSize } from "@/lib/chat/artifact-types";
import type { ArtifactEditMode } from "@/lib/chat/artifact-edit";
import { useStreamingChat } from "@/lib/hooks/use-streaming-chat";
import { StreamingMessage } from "@/components/workspace/streaming-message";
import { AiEditToolbar } from "@/components/workspace/artifact-viewer";
import { Button } from "@/components/ui";

// ─── Types ─────────────────────────────────────────────────────────────────

type ViewerTab = "preview" | "text";

interface DocumentViewerProps {
  documentId: string;
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

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  status: "completed" | "error";
};

const AI_WHOLE_CHIPS = [
  "Rewrite in plain language",
  "Make it clearer",
  "Reorganize the sections",
];

const CHAT_SUGGESTIONS = [
  {
    label: "Summarize this document",
    prompt: "Summarize this document and flag anything that needs attention.",
  },
  {
    label: "Extract key details",
    prompt:
      "Extract the key details from this document — parties, dates, amounts, terms.",
  },
  {
    label: "What should I review?",
    prompt: "What should I review or double-check in this document?",
  },
  {
    label: "Draft a cleaner version",
    prompt: "Draft a cleaner, more professional version of this document.",
  },
];

// ─── Selection helpers ─────────────────────────────────────────────────────

function readSelection(): SelectionState | null {
  const sel = window.getSelection?.();
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null;
  const text = sel.toString().trim();
  if (!text) return null;
  const range = sel.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  if (!rect || (rect.width === 0 && rect.height === 0)) return null;
  return {
    text: text.slice(0, 4000),
    top: Math.min(Math.max(rect.bottom + 10, 8), window.innerHeight - 240),
    left: Math.min(Math.max(rect.left, 8), window.innerWidth - 350),
  };
}

// ─── Component ─────────────────────────────────────────────────────────────

export function DocumentViewer({ documentId, onClose }: DocumentViewerProps) {
  const { entityId, isLoaded } = useEntity();
  const [tab, setTab] = useState<ViewerTab>("preview");
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const selectionTimer = useRef<number | null>(null);
  const flashTimer = useRef<number | null>(null);
  const urlRequested = useRef(false);
  const conversationId = useRef<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  // ── Data ────────────────────────────────────────────────────────────────
  const {
    data: doc,
    isLoading,
    isError,
  } = trpc.document.getDocumentById.useQuery({ id: documentId }, { retry: 1 });
  const download = trpc.document.download.useMutation();
  const markViewed = trpc.document.markDocumentViewed.useMutation();
  const editMutation = trpc.document.editDocumentText.useMutation();
  const undoMutation = trpc.document.undoDocumentEdit.useMutation();

  // Fetch the presigned preview URL exactly once (avoids duplicate audit
  // entries from repeated document.download calls).
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [previewFailed, setPreviewFailed] = useState(false);
  useEffect(() => {
    if (!doc || urlRequested.current) return;
    urlRequested.current = true;
    download.mutate(
      { id: doc.id },
      {
        onSuccess: (res) => setDownloadUrl(res.downloadUrl),
        onError: () => setPreviewFailed(true),
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc]);

  // Record the view once when the viewer opens (clears the "New" badge).
  useEffect(() => {
    if (!entityId) return;
    markViewed.mutate({ documentId }, { onError: () => undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId, entityId]);

  // ── Edited copy state (layered on the extraction, never mutating it) ────
  const [editedContent, setEditedContent] = useState<string | null>(null);
  const [editCount, setEditCount] = useState(0);
  const [editing, setEditing] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [selection, setSelection] = useState<SelectionState | null>(null);
  const [aiToolbar, setAiToolbar] = useState<AiToolbarState | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const [updatedFlash, setUpdatedFlash] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!doc) return;
    const meta = doc.metadata as Record<string, unknown> | null;
    const ec = meta?.editedContent;
    setEditedContent(typeof ec === "string" && ec.length > 0 ? ec : null);
    setEditCount(typeof meta?.editCount === "number" ? meta.editCount : 0);
  }, [doc]);

  const displayText =
    (showOriginal ? doc?.ocrText : editedContent) ?? doc?.ocrText ?? "";
  const hasExtractedText = (doc?.ocrText ?? "").trim().length > 0;
  const showEditedBanner = editedContent !== null;

  // ── AI chat bound to this document ──────────────────────────────────────
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const {
    sendMessage,
    cancelStream,
    isStreaming,
    streamedContent,
    agentActivities,
    delegations,
    documents,
    approvals,
  } = useStreamingChat({
    entityId: entityId ?? "",
    onConversationCreated: (id) => {
      conversationId.current = id;
    },
    onComplete: (fullResponse) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: fullResponse,
          status: "completed",
        },
      ]);
    },
    onError: (error) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-error-${Date.now()}`,
          role: "assistant",
          content: `Sorry, I ran into a problem: ${error}. Please try again.`,
          status: "error",
        },
      ]);
    },
  });

  const handleSend = useCallback(
    (text?: string) => {
      const trimmed = (text ?? input).trim();
      if (!trimmed || !entityId || isStreaming || !doc) return;

      setMessages((prev) => [
        ...prev,
        {
          id: `user-${Date.now()}`,
          role: "user",
          content: trimmed,
          status: "completed",
        },
      ]);
      setInput("");

      void sendMessage(
        trimmed,
        conversationId.current ?? undefined,
        [{ documentId: doc.id, name: doc.name, type: doc.type }],
        {
          page: `Document: ${doc.name}`,
          module: "documents",
          view: doc.type,
          count: 1,
          notes: hasExtractedText
            ? `Extracted text begins: ${(doc.ocrText ?? "").replace(/\s+/g, " ").trim().slice(0, 300)}`
            : "No extracted text yet — answer from the attachment metadata.",
        },
      );
    },
    [entityId, input, isStreaming, sendMessage, doc, hasExtractedText],
  );

  // Keep the newest content in view while streaming.
  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ behavior: "smooth", block: "end" });
  }, [messages, streamedContent, isStreaming]);

  // ── Viewer chrome: scroll lock, Escape, focus ───────────────────────────
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (aiToolbar) setAiToolbar(null);
        else if (isStreaming) cancelStream();
        else onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
      if (selectionTimer.current) window.clearTimeout(selectionTimer.current);
      if (flashTimer.current) window.clearTimeout(flashTimer.current);
    };
  }, [aiToolbar, isStreaming, cancelStream, onClose]);

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

  // ── Selection capture on the extracted-text pane ────────────────────────
  const captureSelection = useCallback(() => {
    if (editing) return;
    if (selectionTimer.current) window.clearTimeout(selectionTimer.current);
    selectionTimer.current = window.setTimeout(() => {
      const next = readSelection();
      setSelection(next);
    }, 120);
  }, [editing]);

  useEffect(() => {
    if (tab !== "text" || !hasExtractedText) return;
    document.addEventListener("mouseup", captureSelection);
    document.addEventListener("selectionchange", captureSelection);
    return () => {
      document.removeEventListener("mouseup", captureSelection);
      document.removeEventListener("selectionchange", captureSelection);
    };
  }, [tab, hasExtractedText, captureSelection]);

  const clearDomSelection = useCallback(() => {
    window.getSelection()?.removeAllRanges();
  }, []);

  // ── AI editing flows ────────────────────────────────────────────────────
  const openWholeEditor = () => {
    setEditError(null);
    setAiToolbar({
      mode: "whole",
      position: {
        top: Math.max(8, window.innerHeight - 240),
        left: Math.max(8, window.innerWidth / 2 - 170),
      },
    });
  };

  const openSelectionEditor = () => {
    if (!selection) return;
    setEditError(null);
    setAiToolbar({
      mode: "selection",
      position: { top: selection.top, left: selection.left },
    });
  };

  const handleAiSubmit = (instruction: string) => {
    if (!aiToolbar || !doc) return;
    setEditing(true);
    setEditError(null);
    const mode = aiToolbar.mode;
    editMutation.mutate(
      {
        id: doc.id,
        instruction,
        mode,
        selection: mode === "selection" ? selection?.text : undefined,
      },
      {
        onSuccess: (res) => {
          setEditedContent(res.content);
          setEditCount(res.editCount);
          setShowOriginal(false);
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
        onSettled: () => setEditing(false),
      },
    );
  };

  const handleUndo = () => {
    if (!doc) return;
    setEditError(null);
    undoMutation.mutate(
      { id: doc.id },
      {
        onSuccess: (res) => {
          setEditedContent(res.editCount > 0 ? res.content : null);
          setEditCount(res.editCount);
          setShowOriginal(false);
          setUpdatedFlash(false);
          if (flashTimer.current) window.clearTimeout(flashTimer.current);
        },
        onError: (err) => setEditError(err.message),
      },
    );
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(displayText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  };

  // ── Derived ─────────────────────────────────────────────────────────────
  const mime = doc?.mimeType ?? "";
  const name = doc?.name ?? "";
  const isImage = mime.startsWith("image/");
  const isPdf =
    mime === "application/pdf" || name.toLowerCase().endsWith(".pdf");
  const isCsv = mime === "text/csv" || name.toLowerCase().endsWith(".csv");
  const TypeIcon = isPdf
    ? FileText
    : isImage
      ? FileImage
      : isCsv
        ? FileSpreadsheet
        : File;

  const canEditText = hasExtractedText;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${name || "Document"} viewer`}
      ref={panelRef}
      onKeyDown={trapFocus}
      className="fixed inset-0 z-[90] flex items-center justify-center p-2 sm:p-6"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 animate-[fade-in_0.2s_ease-out] bg-slate-950/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Workspace */}
      <div className="relative flex h-full max-h-[94vh] w-full max-w-7xl animate-in flex-col overflow-hidden rounded-2xl border border-border/60 bg-background shadow-2xl fade-in-0 zoom-in-95 duration-200">
        {/* ── Header ── */}
        <div className="flex items-center justify-between gap-3 border-b border-border/50 bg-background/90 px-4 py-3 backdrop-blur-md">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <TypeIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">
                {doc?.name ?? "Document"}
              </p>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
                <span className="rounded-full bg-muted px-2 py-0.5 font-medium capitalize text-foreground">
                  {doc?.type ?? "document"}
                </span>
                {doc?.status && (
                  <span className="rounded-full bg-muted/60 px-2 py-0.5 capitalize">
                    {doc.status}
                  </span>
                )}
                {formatFileSize(doc?.sizeBytes) && (
                  <span>{formatFileSize(doc?.sizeBytes)}</span>
                )}
                {doc?.uploadedByName && <span>by {doc.uploadedByName}</span>}
                {showEditedBanner && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 font-semibold text-primary">
                    AI-edited ×{editCount}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            {canEditText && (
              <button
                type="button"
                onClick={openWholeEditor}
                disabled={editing || !!aiToolbar}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border/50 bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-all hover:border-primary/30 hover:text-primary active:scale-95 disabled:opacity-50"
                title="Ask the AI to change or redo this document"
              >
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span className="hidden sm:inline">Ask AI to change</span>
                <span className="sm:hidden">Ask AI</span>
              </button>
            )}
            {showEditedBanner && (
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
              onClick={() => {
                if (downloadUrl)
                  window.open(downloadUrl, "_blank", "noopener,noreferrer");
                else if (doc)
                  download.mutate(
                    { id: doc.id },
                    {
                      onSuccess: (res) =>
                        window.open(
                          res.downloadUrl,
                          "_blank",
                          "noopener,noreferrer",
                        ),
                    },
                  );
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border/50 bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-all hover:border-primary/30 hover:text-primary active:scale-95"
              title="Download file"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Download</span>
            </button>
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

        {/* Undo/edit error */}
        {editError && (
          <div className="flex items-center justify-between gap-2 border-b border-border/50 bg-error-clay-bg px-4 py-2">
            <p className="text-[11px] text-error-clay">{editError}</p>
            <button
              type="button"
              onClick={() => setEditError(null)}
              className="text-[11px] font-medium text-error-clay hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* ── Body: document left, AI right ── */}
        <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_360px]">
          {/* Left — document */}
          <div className="flex min-h-0 min-w-0 flex-col border-r border-border/50">
            {/* Pane tabs */}
            <div className="flex items-center gap-1 border-b border-border/40 px-3 pt-2">
              <button
                type="button"
                onClick={() => setTab("preview")}
                className={cn(
                  "relative rounded-t-lg px-3 py-1.5 text-[12px] font-medium transition-colors",
                  tab === "preview"
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Document
              </button>
              {canEditText && (
                <button
                  type="button"
                  onClick={() => setTab("text")}
                  className={cn(
                    "relative rounded-t-lg px-3 py-1.5 text-[12px] font-medium transition-colors",
                    tab === "text"
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Extracted text
                  {showEditedBanner && (
                    <span className="ml-1.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold text-primary">
                      edited
                    </span>
                  )}
                </button>
              )}
              <div className="ml-auto pb-1">
                {tab === "text" && displayText && (
                  <button
                    type="button"
                    onClick={handleCopyText}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    title="Copy extracted text"
                  >
                    {copied ? (
                      <Check className="h-3 w-3 text-emerald-600" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                    {copied ? "Copied" : "Copy"}
                  </button>
                )}
              </div>
            </div>

            {/* Pane content */}
            <div className="min-h-0 flex-1 overflow-auto bg-muted/20">
              {isLoading && (
                <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-3 p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-xs text-muted-foreground">
                    Opening document…
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
                    It may have been moved or deleted. Try downloading it
                    instead.
                  </p>
                </div>
              )}

              {!isLoading && !isError && doc && tab === "preview" && (
                <>
                  {isPdf && downloadUrl && (
                    <iframe
                      title={doc.name}
                      src={downloadUrl}
                      className="h-full min-h-[420px] w-full border-0 bg-white"
                    />
                  )}
                  {isPdf && !downloadUrl && !previewFailed && (
                    <div className="flex h-full min-h-[320px] items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  )}
                  {isImage && downloadUrl && (
                    <div className="flex h-full min-h-[320px] items-center justify-center p-4">
                      <img
                        src={downloadUrl}
                        alt={doc.name}
                        className="max-h-full max-w-full rounded-lg object-contain shadow-sm"
                      />
                    </div>
                  )}
                  {((isImage && !downloadUrl) || previewFailed) && (
                    <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-2 p-8 text-center">
                      <AlertTriangle className="h-6 w-6 text-error-clay" />
                      <p className="text-xs text-muted-foreground">
                        Preview unavailable.
                      </p>
                    </div>
                  )}
                  {!isPdf && !isImage && (
                    <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-3 p-8 text-center">
                      <FileText className="h-8 w-8 text-muted-foreground/40" />
                      <p className="text-xs text-muted-foreground">
                        No inline preview for this file type.
                      </p>
                      {canEditText && (
                        <button
                          type="button"
                          onClick={() => setTab("text")}
                          className="inline-flex items-center gap-1 rounded-lg border border-border/50 bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
                        >
                          View extracted text
                          <ChevronRight className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}

              {!isLoading && !isError && doc && tab === "text" && (
                <div className="relative flex h-full min-h-[320px] flex-col">
                  {showEditedBanner && (
                    <div className="flex items-center justify-between gap-2 border-b border-primary/20 bg-primary/5 px-4 py-2">
                      <p className="text-[11px] font-medium text-primary">
                        Showing AI-edited copy ({editCount} edit
                        {editCount === 1 ? "" : "s"})
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowOriginal((v) => !v)}
                        className="text-[11px] font-semibold text-primary hover:underline"
                      >
                        {showOriginal ? "Show edited copy" : "View original"}
                      </button>
                    </div>
                  )}
                  <pre
                    className="flex-1 select-text whitespace-pre-wrap break-words p-5 font-mono text-xs leading-relaxed text-foreground"
                    onMouseUp={captureSelection}
                  >
                    {displayText || "No extracted text for this document."}
                  </pre>

                  {/* Selection AI bar */}
                  {selection && !aiToolbar && (
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

                  {/* Discoverability hint (first paint only) */}
                  {!selection && !aiToolbar && editCount === 0 && (
                    <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
                      <p className="rounded-full border border-border/40 bg-background/90 px-3 py-1.5 text-[11px] text-muted-foreground shadow-sm backdrop-blur-sm">
                        ✏️ Select any passage and ask the AI to change or redo
                        it
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right — AI workspace */}
          <div className="flex min-h-0 flex-col bg-card/40">
            <div className="flex items-center gap-2.5 border-b border-border/50 px-4 py-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Bot className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-foreground">
                  Ask Xenboox
                </p>
                <p className="truncate text-[10px] text-muted-foreground">
                  Working on this document
                </p>
              </div>
              <div className="ml-auto flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Attached
              </div>
            </div>

            {/* Messages */}
            <div
              role="log"
              aria-live="polite"
              className="flex-1 space-y-4 overflow-y-auto px-4 py-4"
            >
              {messages.length === 0 && !isStreaming && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <p className="text-[13px] font-semibold text-foreground">
                    Ask about this document
                  </p>
                  <p className="mt-1 max-w-[260px] text-[11px] leading-4 text-muted-foreground">
                    Question it, summarize it, or ask for a change — the CFO
                    agent answers with this document in context.
                  </p>
                </div>
              )}

              {messages.map((message) => {
                if (message.role === "user") {
                  return (
                    <div
                      key={message.id}
                      className="flex animate-in flex-col items-end gap-1 fade-in-0 slide-in-from-bottom-2 duration-300"
                    >
                      <div className="max-w-[88%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-xs leading-relaxed text-primary-foreground">
                        {message.content}
                      </div>
                    </div>
                  );
                }
                if (message.status === "error") {
                  return (
                    <div
                      key={message.id}
                      className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
                    >
                      <div className="max-w-[88%] rounded-2xl rounded-bl-md border border-error-clay/30 bg-error-clay-bg px-4 py-2.5 text-xs leading-relaxed text-error-clay">
                        {message.content}
                      </div>
                    </div>
                  );
                }
                return (
                  <StreamingMessage
                    key={message.id}
                    content={message.content}
                    isStreaming={false}
                  />
                );
              })}

              {isStreaming && (
                <StreamingMessage
                  content={streamedContent}
                  isStreaming
                  agentActivities={agentActivities}
                  delegations={delegations}
                  documents={documents}
                  approvals={approvals}
                />
              )}

              <div ref={bottomRef} />
            </div>

            {/* Suggestions */}
            {messages.length === 0 && !isStreaming && (
              <div className="flex flex-wrap gap-1.5 px-4 pb-2">
                {CHAT_SUGGESTIONS.map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => {
                      setInput(s.prompt);
                      composerRef.current?.focus();
                    }}
                    className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/40 px-2.5 py-1 text-[10px] text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
                  >
                    {s.label}
                    <ChevronRight className="h-3 w-3" />
                  </button>
                ))}
              </div>
            )}

            {/* Composer */}
            <div className="border-t border-border/50 px-4 py-3">
              <div className="flex items-end gap-2">
                <textarea
                  ref={composerRef}
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Ask about or change this document…"
                  aria-label="Ask about this document"
                  className="max-h-[120px] min-h-[24px] flex-1 resize-none overflow-y-auto rounded-lg border border-border/60 bg-muted/40 px-3 py-1.5 text-xs leading-normal text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <Button
                  type="button"
                  size="icon"
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isStreaming}
                  aria-label="Send"
                  title="Send message"
                  className="h-8 w-8 shrink-0 rounded-lg"
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
              </div>
              <p className="mt-1.5 text-[9px] text-muted-foreground">
                Enter to send · Shift+Enter for a new line
              </p>
            </div>
          </div>
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
