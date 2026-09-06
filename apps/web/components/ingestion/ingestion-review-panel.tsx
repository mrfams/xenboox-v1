"use client";

import { useEffect, useState } from "react";
import {
  X,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Shield,
  ChevronDown,
  ChevronUp,
  Loader2,
  Pencil,
  Trash2,
  Eye,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import {
  computeLineTotals,
  isBalanced,
} from "@/components/ingestion/review-panel-logic";

// ─── Types ─────────────────────────────────────────────────────────────────

type ReviewDetail = {
  id: string;
  name: string;
  type: string;
  status: string;
  mimeType: string | null;
  sizeBytes: number | null;
  ocrText: string | null;
  ocrConfidence: string | null;
  createdAt: string;
  metadata: Record<string, unknown>;
  review: {
    confidence: number;
    workflow: string;
    action: string;
    dominantSignal: string;
    reason: string;
    reviewItems: Array<Record<string, unknown>>;
    proposedEntry: Record<string, unknown> | null;
  };
  classification: {
    category: string;
    confidence: number;
    reasoning: string;
  };
  extraction: {
    data: Record<string, unknown>;
    fieldConfidence: Record<string, number>;
    confidence: number;
  };
};

// ─── Component ─────────────────────────────────────────────────────────────

export function IngestionReviewPanel({
  documentId,
  onClose,
}: {
  documentId: string;
  onClose: () => void;
}) {
  const utils = trpc.useUtils();
  const { data: detail, isLoading } = trpc.ingestion.getReviewDetails.useQuery(
    { documentId },
    { enabled: !!documentId },
  );

  const [showOcr, setShowOcr] = useState(false);
  const [showRawData, setShowRawData] = useState(false);
  const [editedEntry, setEditedEntry] = useState<{
    description?: string;
    lines?: Array<{
      accountId: string;
      debit: number;
      credit: number;
      description?: string;
    }>;
  } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // ── Inline line editing ───────────────────────────────────────────
  type EditableLine = {
    accountId: string;
    debit: number;
    credit: number;
    description?: string;
  };

  const baseProposed = detail?.review?.proposedEntry as
    | { description?: string; lines?: EditableLine[] }
    | null
    | undefined;

  const getCurrentLines = (): EditableLine[] => {
    const from = editedEntry?.lines ?? baseProposed?.lines ?? [];
    return from.map((l) => ({ ...l }));
  };

  const updateEditedLine = (
    index: number,
    patch: Partial<Pick<EditableLine, "accountId" | "debit" | "credit">>,
  ) => {
    const lines = getCurrentLines();
    if (!lines[index]) return;
    lines[index] = { ...lines[index], ...patch };
    setEditedEntry({
      description: editedEntry?.description ?? baseProposed?.description,
      lines,
    });
  };

  const removeEditedLine = (index: number) => {
    setEditedEntry({
      description: editedEntry?.description ?? baseProposed?.description,
      lines: getCurrentLines().filter((_, i) => i !== index),
    });
  };

  const addEditedLine = () => {
    const lines = getCurrentLines();
    lines.push({ accountId: "", debit: 0, credit: 0 });
    setEditedEntry({
      description: editedEntry?.description ?? baseProposed?.description,
      lines,
    });
  };

  const approveMutation = trpc.ingestion.approveReview.useMutation({
    onSuccess: () => {
      toast.success("Document approved and posted to ledger");
      utils.ingestion.listPendingReviews.invalidate();
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  const rejectMutation = trpc.ingestion.rejectReview.useMutation({
    onSuccess: () => {
      toast.success("Document rejected");
      utils.ingestion.listPendingReviews.invalidate();
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!documentId) return null;

  const trustGuard = (
    (detail?.metadata as Record<string, unknown> | null | undefined)
      ?.ingestion as Record<string, unknown> | undefined
  )?.trustGuard as
    | {
        passed: boolean;
        checks: number;
        passedCount: number;
        failedChecks: Array<{
          name: string;
          message: string;
          severity: string;
        }>;
        summary: string;
      }
    | undefined;

  const proposedEntry = (editedEntry ?? detail?.review?.proposedEntry) as
    | {
        description?: string;
        date?: string;
        lines?: Array<{
          accountId: string;
          accountCode?: string;
          accountName?: string;
          debit: number;
          credit: number;
          description?: string;
        }>;
      }
    | undefined;

  const { totalDebit, totalCredit } = computeLineTotals(
    proposedEntry?.lines ?? [],
  );
  const entryIsBalanced = isBalanced(totalDebit, totalCredit);

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/10 backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex h-full w-full max-w-2xl flex-col border-l border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <FileText className="h-4.5 w-4.5 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                {detail?.name ?? "Document Review"}
              </h2>
              <p className="text-[11px] text-muted-foreground">
                {detail?.classification?.category ?? "Processing"}
                {detail?.createdAt
                  ? ` · ${new Date(detail.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                  : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* N32 — the reviewer must SEE the actual document before
                accepting or rejecting an escalated extraction. The file
                streams from R2 through an entity-scoped, authenticated
                route; inline disposition renders PDFs/images in the tab. */}
            <a
              href={`/api/documents/${documentId}/file`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary/40 hover:text-primary transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              View document
            </a>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              aria-label="Close review panel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !detail ? (
            <div className="py-20 text-center text-sm text-muted-foreground">
              Document not found
            </div>
          ) : (
            <div className="space-y-5 p-5">
              {/* ── TrustGuard Banner ─────────────────────────────── */}
              {trustGuard && (
                <div
                  className={cn(
                    "rounded-xl border p-4",
                    trustGuard.passed
                      ? "border-balanced-green/30 bg-balanced-green/[0.03]"
                      : "border-error-clay/30 bg-error-clay/[0.03]",
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Shield
                      className={cn(
                        "h-4 w-4",
                        trustGuard.passed
                          ? "text-balanced-green"
                          : "text-error-clay",
                      )}
                    />
                    <span className="text-sm font-semibold text-foreground">
                      TrustGuard:{" "}
                      {trustGuard.passed
                        ? "All checks passed"
                        : "Checks failed"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    {trustGuard.summary}
                  </p>
                  {!trustGuard.passed && trustGuard.failedChecks && (
                    <div className="space-y-1.5 mt-3">
                      {trustGuard.failedChecks.map((check, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-2 rounded-lg bg-background/60 px-3 py-2"
                        >
                          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-error-clay" />
                          <div>
                            <p className="text-xs font-medium text-foreground">
                              {check.name}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {check.message}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Review Items — what the AI is unsure about ──────── */}
              {detail.review.reviewItems.length > 0 && (
                <Section
                  title="Needs Your Verification"
                  icon={<AlertTriangle className="h-3.5 w-3.5" />}
                  defaultOpen
                >
                  <div className="space-y-2">
                    {detail.review.reviewItems.map((item, i) => {
                      const itemData = item as Record<string, unknown>;
                      const label = String(
                        itemData.label ?? itemData.field ?? "field",
                      );
                      const expected =
                        itemData.expected ?? itemData.suggestedValue;
                      const actual = itemData.actual ?? itemData.extractedValue;
                      return (
                        <div
                          key={i}
                          className="flex items-center justify-between gap-3 rounded-lg border border-attention-amber/30 bg-attention-amber/[0.04] px-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-foreground capitalize">
                              {label.replace(/([A-Z])/g, " $1").trim()}
                            </p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              Extracted:{" "}
                              <span className="font-medium text-error-clay">
                                {formatValue(actual)}
                              </span>
                              {" → expected: "}
                              <span className="font-medium text-balanced-green">
                                {formatValue(expected)}
                              </span>
                            </p>
                          </div>
                          <span className="shrink-0 rounded-full bg-attention-amber/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-attention-amber">
                            Check
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </Section>
              )}

              {/* ── Extraction Data ───────────────────────────────── */}
              <Section
                title="Extracted Data"
                icon={<FileText className="h-3.5 w-3.5" />}
                defaultOpen
              >
                <div className="space-y-2">
                  {Object.entries(detail.extraction.data).map(
                    ([key, value]) => (
                      <div
                        key={key}
                        className="flex items-center justify-between rounded-lg bg-background/60 px-3 py-2"
                      >
                        <span className="text-xs text-muted-foreground capitalize">
                          {key.replace(/([A-Z])/g, " $1").trim()}
                        </span>
                        <span className="text-xs font-medium text-foreground">
                          {typeof value === "object"
                            ? JSON.stringify(value)
                            : String(value ?? "—")}
                        </span>
                      </div>
                    ),
                  )}
                </div>
              </Section>

              {/* ── OCR Text ──────────────────────────────────────── */}
              {detail.ocrText && (
                <Section
                  title="OCR Text"
                  icon={<Eye className="h-3.5 w-3.5" />}
                  defaultOpen={false}
                  onToggle={() => setShowOcr(!showOcr)}
                  isOpen={showOcr}
                >
                  <pre className="max-h-60 overflow-auto rounded-lg bg-background/60 p-3 text-[11px] leading-relaxed text-muted-foreground whitespace-pre-wrap font-mono">
                    {detail.ocrText}
                  </pre>
                </Section>
              )}

              {/* ── Proposed Journal Entry ────────────────────────── */}
              {proposedEntry && (
                <Section
                  title="Proposed Journal Entry"
                  icon={<FileText className="h-3.5 w-3.5" />}
                  defaultOpen
                  action={
                    <button
                      type="button"
                      onClick={() => setIsEditing(!isEditing)}
                      className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      <Pencil className="h-3 w-3" />
                      {isEditing ? "Done editing" : "Edit"}
                    </button>
                  }
                >
                  {proposedEntry.description && (
                    <p className="mb-3 text-xs text-muted-foreground">
                      {proposedEntry.description}
                    </p>
                  )}
                  <div className="rounded-xl border border-border overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                            Account
                          </th>
                          <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                            Debit
                          </th>
                          <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                            Credit
                          </th>
                          {isEditing && (
                            <th
                              className="px-2 py-2 w-8"
                              aria-label="Remove line"
                            />
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {proposedEntry.lines?.map((line, i) => (
                          <tr
                            key={i}
                            className="border-b border-border/30 last:border-0"
                          >
                            <td className="px-3 py-2">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={
                                    editedEntry?.lines?.[i]?.accountId ??
                                    line.accountId
                                  }
                                  onChange={(e) =>
                                    updateEditedLine(i, {
                                      accountId: e.target.value,
                                    })
                                  }
                                  className="w-full rounded border border-border bg-background px-1.5 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                  aria-label={`Line ${i + 1} account`}
                                />
                              ) : (
                                <>
                                  <span className="font-medium text-foreground">
                                    {line.accountCode ?? ""}
                                  </span>{" "}
                                  <span className="text-muted-foreground">
                                    {line.accountName ?? ""}
                                  </span>
                                </>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums text-foreground">
                              {isEditing ? (
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={
                                    editedEntry?.lines?.[i]?.debit ?? line.debit
                                  }
                                  onChange={(e) =>
                                    updateEditedLine(i, {
                                      debit: Number(e.target.value) || 0,
                                    })
                                  }
                                  className="w-24 rounded border border-border bg-background px-1.5 py-1 text-right text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                  aria-label={`Line ${i + 1} debit`}
                                />
                              ) : line.debit > 0 ? (
                                line.debit.toLocaleString("en-US", {
                                  minimumFractionDigits: 2,
                                })
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums text-foreground">
                              {isEditing ? (
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={
                                    editedEntry?.lines?.[i]?.credit ??
                                    line.credit
                                  }
                                  onChange={(e) =>
                                    updateEditedLine(i, {
                                      credit: Number(e.target.value) || 0,
                                    })
                                  }
                                  className="w-24 rounded border border-border bg-background px-1.5 py-1 text-right text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                  aria-label={`Line ${i + 1} credit`}
                                />
                              ) : line.credit > 0 ? (
                                line.credit.toLocaleString("en-US", {
                                  minimumFractionDigits: 2,
                                })
                              ) : (
                                "—"
                              )}
                            </td>
                            {isEditing && (
                              <td className="px-2 py-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => removeEditedLine(i)}
                                  className="rounded p-1 text-muted-foreground transition-colors hover:bg-error-clay/10 hover:text-error-clay"
                                  aria-label={`Remove line ${i + 1}`}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                        {isEditing && (
                          <tr>
                            <td
                              colSpan={isEditing ? 4 : 3}
                              className="px-3 py-2"
                            >
                              <button
                                type="button"
                                onClick={addEditedLine}
                                className="inline-flex items-center gap-1 rounded-md border border-dashed border-border px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                              >
                                + Add line
                              </button>
                            </td>
                          </tr>
                        )}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-border bg-muted/20 font-medium">
                          <td className="px-3 py-2 text-foreground">Total</td>
                          <td className="px-3 py-2 text-right tabular-nums text-foreground">
                            {totalDebit.toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                            })}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-foreground">
                            {totalCredit.toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                            })}
                          </td>
                          {isEditing && <td />}
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  {!entryIsBalanced && (
                    <p className="mt-2 text-xs text-error-clay font-medium">
                      ⚠ Debits ({totalDebit}) ≠ Credits ({totalCredit}) — entry
                      is unbalanced
                    </p>
                  )}
                </Section>
              )}

              {/* ── Technical details (collapsed) ───────────────────── */}
              <Section
                title="Technical details"
                icon={<Eye className="h-3.5 w-3.5" />}
                defaultOpen={false}
                onToggle={() => setShowRawData(!showRawData)}
                isOpen={showRawData}
              >
                <pre className="max-h-60 overflow-auto rounded-lg bg-background/60 p-3 text-[10px] leading-relaxed text-muted-foreground whitespace-pre-wrap font-mono">
                  {JSON.stringify(detail.metadata, null, 2)}
                </pre>
              </Section>
            </div>
          )}
        </div>

        {/* Footer — Actions */}
        {detail && (
          <div className="border-t border-border px-5 py-4">
            <div className="flex items-center gap-3">
              {showRejectForm ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="text"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="What should have happened instead…"
                    className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                    autoFocus
                    aria-label="Rejection reason"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (rejectReason.trim()) {
                        rejectMutation.mutate({
                          documentId,
                          reason: rejectReason.trim(),
                        });
                      }
                    }}
                    disabled={!rejectReason.trim() || rejectMutation.isPending}
                    className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                  >
                    {rejectMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    Confirm Reject
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowRejectForm(false);
                      setRejectReason("");
                    }}
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground hover:bg-accent"
                    aria-label="Cancel rejection"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowRejectForm(true)}
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent"
                  aria-label="Reject document"
                >
                  <Trash2 className="h-4 w-4" />
                  Reject
                </button>
              )}
              <div className="ml-auto flex items-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    approveMutation.mutate({
                      documentId,
                      editedEntry: editedEntry ?? undefined,
                    })
                  }
                  disabled={
                    approveMutation.isPending ||
                    !entryIsBalanced ||
                    !proposedEntry ||
                    (proposedEntry.lines?.length ?? 0) === 0
                  }
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {approveMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Approve & Post
                </button>
              </div>
            </div>
            <p className="mt-2 text-[10px] text-muted-foreground text-center">
              Approve posts the journal entry to the ledger. Reject discards
              this extraction.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function Section({
  title,
  icon,
  children,
  defaultOpen = true,
  onToggle,
  isOpen: controlledOpen,
  action,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  onToggle?: () => void;
  isOpen?: boolean;
  action?: React.ReactNode;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const open = controlledOpen ?? uncontrolledOpen;
  const toggle = onToggle ?? (() => setUncontrolledOpen(!uncontrolledOpen));

  return (
    <div className="rounded-xl border border-border">
      {" "}
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium text-foreground hover:bg-accent/50 transition-colors"
        aria-expanded={open}
        aria-controls={`section-${title.replace(/\s+/g, "-").toLowerCase()}`}
      >
        {icon}
        {title}
        <span className="ml-auto flex items-center gap-2">
          {action}
          {open ? (
            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </span>
      </button>
      {open && (
        <div
          className="px-4 pb-4"
          id={`section-${title.replace(/\s+/g, "-").toLowerCase()}`}
        >
          {children}
        </div>
      )}
    </div>
  );
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "number") {
    return value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}


