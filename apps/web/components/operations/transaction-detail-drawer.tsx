"use client";

import { useEffect } from "react";
import {
  X,
  Bot,
  ArrowDownRight,
  ArrowUpRight,
  FileText,
  Landmark,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";

// ─── Transaction Detail Drawer ─────────────────────────────────────────────
//
// Slides in from the right when a user clicks a transaction in Operations.
// Shows full transaction context with linked documents and journal entries.

export function TransactionDetailDrawer({
  transactionId,
  onClose,
}: {
  transactionId: string;
  onClose: () => void;
}) {
  const { data: detail, isLoading } =
    trpc.transactions.getTransactionDetail.useQuery(
      { transactionId },
      { enabled: !!transactionId },
    );

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!transactionId) return null;

  const amount = detail ? parseFloat(detail.amount) : 0;
  const isPositive = amount > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/10 backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Transaction details"
        className="flex h-full w-full max-w-[480px] flex-col border-l border-border/60 bg-card shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                isPositive ? "bg-emerald-500/10" : "bg-red-500/10",
              )}
            >
              {isPositive ? (
                <ArrowDownRight className="h-4 w-4 text-emerald-500" />
              ) : (
                <ArrowUpRight className="h-4 w-4 text-red-500" />
              )}
            </div>
            <div className="min-w-0">
              {isLoading ? (
                <div className="h-4 w-32 animate-pulse rounded bg-muted" />
              ) : (
                <p className="truncate text-sm font-semibold text-foreground">
                  {detail?.description ?? "Transaction"}
                </p>
              )}
              <p className="truncate text-[11px] text-muted-foreground">
                Transaction Details
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-16 animate-pulse rounded-lg bg-muted/30"
                />
              ))}
            </div>
          ) : !detail ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertTriangle className="h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">
                Transaction not found
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Amount */}
              <div className="rounded-xl border border-border/50 bg-muted/30 p-4">
                <p className="text-xs text-muted-foreground mb-1">Amount</p>
                <p
                  className={cn(
                    "text-2xl font-bold",
                    isPositive ? "text-emerald-600" : "text-red-600",
                  )}
                >
                  {isPositive ? "+" : "-"}
                  {formatCurrency(Math.abs(amount))}
                </p>
              </div>

              {/* Metadata */}
              <div className="rounded-xl border border-border/50 bg-muted/30 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Date</span>
                  <span className="text-xs font-medium text-foreground">
                    {detail.transactionDate
                      ? new Date(detail.transactionDate).toLocaleDateString(
                          "en-US",
                          {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          },
                        )
                      : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Type</span>
                  <span className="text-xs font-medium text-foreground capitalize">
                    {detail.type?.replace(/_/g, " ") ?? "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Reference
                  </span>
                  <span className="text-xs font-medium text-foreground">
                    {detail.reference ?? "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Status</span>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold",
                      detail.isReconciled
                        ? "bg-emerald-500/10 text-emerald-500"
                        : "bg-amber-500/10 text-amber-500",
                    )}
                  >
                    {detail.isReconciled ? (
                      <>
                        <CheckCircle2 className="h-2.5 w-2.5" />
                        Reconciled
                      </>
                    ) : (
                      "Unreconciled"
                    )}
                  </span>
                </div>
              </div>

              {/* Bank Account */}
              {detail.bankAccount && (
                <div className="rounded-xl border border-border/50 bg-muted/30 p-3">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    Bank Account
                  </p>
                  <div className="flex items-center gap-2">
                    <Landmark className="h-4 w-4 text-primary/60" />
                    <div>
                      <p className="text-xs font-medium text-foreground">
                        {detail.bankAccount.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {detail.bankAccount.bankName ?? "—"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Linked Journal Entry */}
              {detail.journalEntry && (
                <div className="rounded-xl border border-border/50 bg-muted/30 p-3">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    Journal Entry
                  </p>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary/60" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground">
                        JE-
                        {String(detail.journalEntry.entryNumber ?? "").padStart(
                          4,
                          "0",
                        )}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {detail.journalEntry.description ?? "—"}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold",
                        detail.journalEntry.status === "posted"
                          ? "bg-blue-500/10 text-blue-500"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {detail.journalEntry.status}
                    </span>
                  </div>
                </div>
              )}

              {/* AI Categorization */}
              {detail.category && (
                <div className="rounded-xl border border-primary/10 bg-primary/[0.02] p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Bot className="h-3.5 w-3.5 text-primary/60" />
                    <p className="text-[10px] font-medium text-primary uppercase tracking-wider">
                      AI Categorization
                    </p>
                  </div>
                  <p className="text-xs text-foreground">{detail.category}</p>
                  {detail.aiConfidence !== undefined &&
                    detail.aiConfidence !== null && (
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Confidence: {Math.round(detail.aiConfidence * 100)}%
                      </p>
                    )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        {detail && (
          <div className="sticky bottom-0 border-t border-border bg-card/95 backdrop-blur-sm px-4 py-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground hover:bg-accent transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
