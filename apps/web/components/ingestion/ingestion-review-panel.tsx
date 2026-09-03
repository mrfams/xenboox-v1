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
  Bot,
  Eye,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";

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

  const approveMutation = trpc.ingestion.approveReview.useMutation({
    onSuccess: () => {
      toast.success("Document approved and posted to ledger");
      utils.ingestion.getPendingReviews.invalidate();
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  const rejectMutation = trpc.ingestion.rejectReview.useMutation({
    onSuccess: () => {
      toast.success("Document rejected");
      utils.ingestion.getPendingReviews.invalidate();
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

  const trustGuard = detail?.metadata?.ingestion?.trustGuard as
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

  const totalDebit =
    proposedEntry?.lines?.reduce((s, l) => s + l.debit, 0) ?? 0;
  const totalCredit =
    proposedEntry?.lines?.reduce((s, l) => s + l.credit, 0) ?? 0;

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
                {detail?.classification?.category ?? "Processing"} • Confidence{" "}
                {((detail?.review?.confidence ?? 0) * 100).toFixed(0)}%
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
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

              {/* ── Extraction Data ───────────────────────────────── */}
              <Section
                title="Extracted Data"
                icon={<Bot className="h-3.5 w-3.5" />}
                defaultOpen
              >
                <div className="space-y-2">
                  {Object.entries(detail.extraction.data).map(
                    ([key, value]) => {
                      const conf = detail.extraction.fieldConfidence?.[key];
                      return (
                        <div
                          key={key}
                          className="flex items-center justify-between rounded-lg bg-background/60 px-3 py-2"
                        >
                          <span className="text-xs text-muted-foreground capitalize">
                            {key.replace(/([A-Z])/g, " $1").trim()}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-foreground">
                              {typeof value === "object"
                                ? JSON.stringify(value)
                                : String(value ?? "—")}
                            </span>
                            {conf !== undefined && (
                              <ConfidenceBadge confidence={conf} />
                            )}
                          </div>
                        </div>
                      );
                    },
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
                        </tr>
                      </thead>
                      <tbody>
                        {proposedEntry.lines?.map((line, i) => (
                          <tr
                            key={i}
                            className="border-b border-border/30 last:border-0"
                          >
                            <td className="px-3 py-2">
                              <span className="font-medium text-foreground">
                                {line.accountCode ?? ""}
                              </span>{" "}
                              <span className="text-muted-foreground">
                                {line.accountName ?? ""}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums text-foreground">
                              {line.debit > 0
                                ? line.debit.toLocaleString("en-US", {
                                    minimumFractionDigits: 2,
                                  })
                                : "—"}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums text-foreground">
                              {line.credit > 0
                                ? line.credit.toLocaleString("en-US", {
                                    minimumFractionDigits: 2,
                                  })
                                : "—"}
                            </td>
                          </tr>
                        ))}
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
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  {totalDebit !== totalCredit && (
                    <p className="mt-2 text-xs text-error-clay font-medium">
                      ⚠ Debits ({totalDebit}) ≠ Credits ({totalCredit}) — entry
                      is unbalanced
                    </p>
                  )}
                </Section>
              )}

              {/* ── Raw Metadata ──────────────────────────────────── */}
              <Section
                title="Raw Metadata"
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
                    placeholder="Why are you rejecting?"
                    className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                    autoFocus
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
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowRejectForm(true)}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
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
                  disabled={approveMutation.isPending}
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
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  onToggle?: () => void;
  isOpen?: boolean;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const open = controlledOpen ?? uncontrolledOpen;
  const toggle = onToggle ?? (() => setUncontrolledOpen(!uncontrolledOpen));

  return (
    <div className="rounded-xl border border-border">
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium text-foreground hover:bg-accent/50 transition-colors"
      >
        {icon}
        {title}
        <span className="ml-auto">
          {open ? (
            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </span>
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const tone =
    confidence >= 0.85
      ? "bg-balanced-green/10 text-balanced-green"
      : confidence >= 0.7
        ? "bg-attention-amber/10 text-attention-amber"
        : "bg-error-clay/10 text-error-clay";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold tabular-nums",
        tone,
      )}
    >
      {pct}%
    </span>
  );
}
