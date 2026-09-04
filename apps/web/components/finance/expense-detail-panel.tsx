/**
 * Expense Detail Panel — slide-over panel for viewing expense details,
 * approving/rejecting, recording payments, and viewing audit trail.
 */

"use client";

import { useState } from "react";
import {
  X,
  ReceiptText,
  CheckCircle2,
  Clock,
  AlertCircle,
  Send,
  XCircle,
  Building2,
  Mail,
  Phone,
  FileText,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

import { toast } from "sonner";

import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { useFormatCurrency } from "@/lib/hooks/use-currency";

// ─── Types ────────────────────────────────────────────────────────────────

type ExpenseDetail = {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string | null;
  totalAmount: number;
  paidAmount: number;
  balance: number;
  status: string;
  notes: string | null;
  currency: string | null;
  supplierId: string | null;
  supplierName: string | null;
  supplierEmail: string | null;
  supplierPhone: string | null;
  category: string;
  createdAt: Date | null;
  payments: Array<{
    id: string;
    amount: number;
    paymentDate: Date | null;
    method: string | null;
    reference: string | null;
  }>;
  lines: Array<{
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }>;
  auditTrail: Array<{
    action: string;
    createdAt: Date | null;
    details: Record<string, unknown> | null;
  }>;
};

// ─── Status Config ────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  string,
  { icon: typeof CheckCircle2; className: string; label: string }
> = {
  paid: {
    icon: CheckCircle2,
    className: "bg-balanced-green/10 text-balanced-green",
    label: "Approved",
  },
  pending: {
    icon: Clock,
    className: "bg-attention-amber/10 text-attention-amber",
    label: "Pending Approval",
  },
  overdue: {
    icon: AlertCircle,
    className: "bg-error-clay/10 text-error-clay",
    label: "Overdue",
  },
  voided: {
    icon: XCircle,
    className: "bg-muted text-muted-foreground",
    label: "Rejected",
  },
};

// ─── Component ────────────────────────────────────────────────────────────

export function ExpenseDetailPanel({
  expenseId,
  onClose,
}: {
  expenseId: string;
  onClose: () => void;
}) {
  const { format } = useFormatCurrency();
  const [showPayments, setShowPayments] = useState(true);
  const [showAudit, setShowAudit] = useState(false);
  const [approveNote, setApproveNote] = useState("");
  // P6-D: how the money actually left — drives the settlement account.
  const [approveMethod, setApproveMethod] = useState<
    "bank_transfer" | "cash" | "mobile_money" | "check" | "card"
  >("bank_transfer");

  const { data: detail, isLoading } = trpc.expenses.getExpenseDetail.useQuery(
    { expenseId },
    { enabled: !!expenseId },
  );

  const utils = trpc.useUtils();

  const approveExpense = trpc.expenses.approveExpense.useMutation({
    onSuccess: () => {
      toast.success("Expense approved and posted");
      utils.expenses.invalidate();
      onClose();
    },
    // P6-D: approval failures (closed period etc.) must never be silent.
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex justify-end">
        <div className="absolute inset-0 bg-black/20" onClick={onClose} />
        <div className="relative flex w-full max-w-lg flex-col bg-card shadow-xl">
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="fixed inset-0 z-50 flex justify-end">
        <div className="absolute inset-0 bg-black/20" onClick={onClose} />
        <div className="relative flex w-full max-w-lg flex-col bg-card shadow-xl">
          <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
            Expense not found
          </div>
        </div>
      </div>
    );
  }

  const expense = detail as ExpenseDetail;
  const statusConfig = STATUS_CONFIG[expense.status] ?? STATUS_CONFIG.pending;
  const StatusIcon = statusConfig.icon;
  const isPending = expense.status === "pending";
  const totalPaid = expense.payments.reduce((s, p) => s + p.amount, 0);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />

      {/* Panel */}
      <div className="relative flex w-full max-w-lg flex-col bg-card shadow-xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border/50 bg-card px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <ReceiptText className="h-4.5 w-4.5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {expense.invoiceNumber}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold",
                    statusConfig.className,
                  )}
                >
                  <StatusIcon className="h-2.5 w-2.5" />
                  {statusConfig.label}
                </span>
                {expense.dueDate && (
                  <span className="text-[10px] text-muted-foreground">
                    Due{" "}
                    {new Date(expense.dueDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 p-6 space-y-5">
          {/* Amount Summary */}
          <div className="rounded-xl border border-border/50 bg-background p-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
                  Total
                </p>
                <p className="mt-0.5 text-lg font-bold tabular-nums text-foreground">
                  {format(expense.totalAmount, expense.currency ?? "USD")}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
                  Paid
                </p>
                <p className="mt-0.5 text-lg font-bold tabular-nums text-balanced-green">
                  {format(totalPaid, expense.currency ?? "USD")}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
                  Balance
                </p>
                <p
                  className={cn(
                    "mt-0.5 text-lg font-bold tabular-nums",
                    expense.balance > 0
                      ? "text-attention-amber"
                      : "text-balanced-green",
                  )}
                >
                  {format(expense.balance, expense.currency ?? "USD")}
                </p>
              </div>
            </div>
          </div>

          {/* Actions for pending expenses */}
          {isPending && (
            <div className="rounded-xl border border-attention-amber/20 bg-attention-amber/[0.03] p-4">
              <p className="text-xs font-semibold text-foreground mb-3">
                Approve or Reject
              </p>
              <input
                type="text"
                placeholder="Optional note..."
                value={approveNote}
                onChange={(e) => setApproveNote(e.target.value)}
                className="flex h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 mb-3"
              />
              <div className="mb-3">
                <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
                  Payment method
                </p>
                <div className="flex flex-wrap gap-1">
                  {[
                    "bank_transfer",
                    "mobile_money",
                    "cash",
                    "check",
                    "card",
                  ].map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setApproveMethod(method)}
                      className={cn(
                        "rounded-lg px-2.5 py-1 text-[10px] font-medium capitalize transition-colors",
                        approveMethod === method
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "border border-border bg-background text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {method.replace("_", " ")}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    approveExpense.mutate({
                      expenseId,
                      decision: "rejected",
                      note: approveNote || undefined,
                    })
                  }
                  disabled={approveExpense.isPending}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-error-clay/30 bg-error-clay/5 px-3 py-1.5 text-xs font-medium text-error-clay hover:bg-error-clay/10 transition-colors disabled:opacity-50"
                >
                  {approveExpense.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <XCircle className="h-3 w-3" />
                  )}
                  Reject
                </button>
                <button
                  type="button"
                  onClick={() =>
                    approveExpense.mutate({
                      expenseId,
                      decision: "approved",
                      paymentMethod: approveMethod,
                      note: approveNote || undefined,
                    })
                  }
                  disabled={approveExpense.isPending}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-balanced-green px-3 py-1.5 text-xs font-medium text-white hover:bg-balanced-green/90 transition-colors disabled:opacity-50"
                >
                  {approveExpense.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-3 w-3" />
                  )}
                  Approve & Pay
                </button>
              </div>
            </div>
          )}

          {/* Description */}
          {expense.notes && (
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-1">
                Description
              </p>
              <p className="text-sm text-foreground">{expense.notes}</p>
            </div>
          )}

          {/* Category */}
          <div className="flex items-center gap-4">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-1">
                Category
              </p>
              <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                {expense.category}
              </span>
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-1">
                Date
              </p>
              <p className="text-sm text-foreground">
                {new Date(expense.invoiceDate).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>

          {/* Vendor Info */}
          {expense.supplierName && (
            <div className="rounded-xl border border-border/50 bg-background p-4">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-xs font-semibold text-foreground">Vendor</p>
              </div>
              <p className="text-sm font-medium text-foreground">
                {expense.supplierName}
              </p>
              {expense.supplierEmail && (
                <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                  <Mail className="h-3 w-3" />
                  {expense.supplierEmail}
                </div>
              )}
              {expense.supplierPhone && (
                <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  {expense.supplierPhone}
                </div>
              )}
            </div>
          )}

          {/* Payments */}
          {expense.payments.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setShowPayments(!showPayments)}
                className="flex items-center gap-2 mb-2"
              >
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
                  Payment History ({expense.payments.length})
                </p>
                {showPayments ? (
                  <ChevronUp className="h-3 w-3 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                )}
              </button>
              {showPayments && (
                <div className="space-y-2">
                  {expense.payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between rounded-lg border border-border/30 bg-background px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-balanced-green" />
                        <div>
                          <p className="text-xs font-medium text-foreground">
                            {format(payment.amount, expense.currency ?? "USD")}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {payment.paymentDate
                              ? new Date(
                                  payment.paymentDate,
                                ).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                })
                              : "—"}{" "}
                            · {payment.method ?? "bank_transfer"}
                            {payment.reference ? ` · ${payment.reference}` : ""}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Audit Trail */}
          {expense.auditTrail.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setShowAudit(!showAudit)}
                className="flex items-center gap-2 mb-2"
              >
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
                  Activity ({expense.auditTrail.length})
                </p>
                {showAudit ? (
                  <ChevronUp className="h-3 w-3 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                )}
              </button>
              {showAudit && (
                <div className="space-y-2">
                  {expense.auditTrail.map((entry, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 rounded-lg bg-background px-3 py-2"
                    >
                      <FileText className="h-3 w-3 mt-0.5 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-xs text-foreground">
                          {entry.action.replace(".", " → ")}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {entry.createdAt
                            ? new Date(entry.createdAt).toLocaleString()
                            : "—"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
