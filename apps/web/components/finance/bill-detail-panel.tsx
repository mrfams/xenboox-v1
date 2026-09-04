"use client";

import { useState } from "react";
import {
  X,
  Send,
  Link2,
  DollarSign,
  Download,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  CreditCard,
  Building2,
  Smartphone,
  Loader2,
  ShoppingCart,
} from "lucide-react";

import { trpc } from "@/lib/trpc/client";
import { useEntity } from "@/lib/entity-context";
import { cn } from "@/lib/utils";
import { Button } from "@xenboox/ui";
import { toast } from "sonner";
import { useFormatCurrency } from "@/lib/hooks/use-currency";

// ─── Types ─────────────────────────────────────────────────────────────────

interface BillDetailPanelProps {
  billId: string;
  onClose: () => void;
}

// ─── Status Config ─────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  string,
  { icon: typeof CheckCircle2; label: string; className: string }
> = {
  pending: {
    icon: Clock,
    label: "Pending",
    className: "bg-blue-500/10 text-blue-600",
  },
  partial: {
    icon: AlertCircle,
    label: "Partial",
    className: "bg-amber-500/10 text-amber-600",
  },
  paid: {
    icon: CheckCircle2,
    label: "Paid",
    className: "bg-emerald-500/10 text-emerald-600",
  },
  overdue: {
    icon: AlertCircle,
    label: "Overdue",
    className: "bg-red-500/10 text-red-600",
  },
  voided: {
    icon: X,
    label: "Voided",
    className: "bg-muted text-muted-foreground",
  },
};

const METHOD_ICONS: Record<string, typeof CreditCard> = {
  bank_transfer: Building2,
  cash: DollarSign,
  mobile_money: Smartphone,
  check: FileText,
  card: CreditCard,
};

// ─── Component ─────────────────────────────────────────────────────────────

export function BillDetailPanel({ billId, onClose }: BillDetailPanelProps) {
  const { format } = useFormatCurrency();
  const { entityId } = useEntity();
  const [showRecordPayment, setShowRecordPayment] = useState(false);

  const utils = trpc.useUtils();

  const { data: detail, isLoading } = trpc.bills.getBillDetail.useQuery(
    { billId },
    { enabled: !!entityId && !!billId },
  );

  // P4-C: a bill created into a closed period (or with missing accounts) is
  // unposted — surface it and let the user post it once the period reopens.
  const retryPost = trpc.ap.retryPostBill.useMutation({
    onSuccess: () => {
      toast.success("Bill posted to the ledger");
      utils.bills.invalidate();
      utils.ap.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const recordPayment = trpc.ap.createPayment.useMutation({
    onSuccess: () => {
      toast.success("Payment recorded");
      setShowRecordPayment(false);
      utils.bills.invalidate();
      utils.ap.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("bank_transfer");
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [payRef, setPayRef] = useState("");

  if (isLoading) {
    return (
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl">
        <div className="absolute inset-0 bg-black/20" onClick={onClose} />
        <div className="relative ml-auto flex w-full items-center justify-center bg-background shadow-xl">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!detail) return null;

  const status = STATUS_CONFIG[detail.status] ?? STATUS_CONFIG.pending;
  const StatusIcon = status.icon;
  const isPaid = detail.status === "paid";
  const isVoided = detail.status === "voided";
  const canPay = !isPaid && !isVoided;
  const isUnposted = !detail.journalEntryId && !isVoided;

  return (
    <>
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/20" onClick={onClose} />

        {/* Panel */}
        <div className="relative ml-auto flex h-full w-full flex-col overflow-hidden bg-background shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10">
                <FileText className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  {detail.invoiceNumber}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {detail.supplier?.name ?? "No vendor"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {/* Status & Dates */}
            <div className="mb-6 flex items-center gap-3">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
                  status.className,
                )}
              >
                <StatusIcon className="h-3.5 w-3.5" />
                {status.label}
              </span>
              <span className="text-sm text-muted-foreground">
                Due{" "}
                {detail.dueDate
                  ? new Date(detail.dueDate).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "—"}
              </span>
            </div>

            {/* Amount Summary */}
            <div className="mb-6 grid grid-cols-3 gap-4">
              <div className="rounded-xl bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-lg font-bold text-foreground tabular-nums">
                  {format(detail.totalAmount)}
                </p>
              </div>
              <div className="rounded-xl bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">Paid</p>
                <p className="text-lg font-bold text-emerald-600 tabular-nums">
                  {format(detail.paidAmount)}
                </p>
              </div>
              <div className="rounded-xl bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">Balance</p>
                <p
                  className={cn(
                    "text-lg font-bold tabular-nums",
                    detail.balance > 0 ? "text-amber-600" : "text-emerald-600",
                  )}
                >
                  {format(detail.balance)}
                </p>
              </div>
            </div>

            {/* P4-C: not in the ledger yet — tell the user and offer the post */}
            {isUnposted && (
              <div className="mb-6 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <p className="flex-1">
                  This bill is not yet in the general ledger (its accounting
                  period may have been closed when it was created).
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-amber-300 bg-white text-amber-800 hover:bg-amber-100"
                  onClick={() => retryPost.mutate({ id: detail.id })}
                  disabled={retryPost.isPending}
                >
                  {retryPost.isPending ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <FileText className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Post to ledger
                </Button>
              </div>
            )}

            {/* Action Buttons */}
            {canPay && (
              <div className="mb-6 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => setShowRecordPayment(true)}
                  disabled={isUnposted || retryPost.isPending}
                  title={
                    isUnposted
                      ? "Post this bill to the ledger before recording payments"
                      : undefined
                  }
                >
                  <DollarSign className="mr-1.5 h-3.5 w-3.5" />
                  Record Payment
                </Button>
                {detail.purchaseOrderId && (
                  <Button size="sm" variant="outline">
                    <ShoppingCart className="mr-1.5 h-3.5 w-3.5" />
                    View PO
                  </Button>
                )}
              </div>
            )}

            {/* Inline Record Payment Form */}
            {showRecordPayment && canPay && (
              <div className="mb-6 rounded-xl border border-border p-4 space-y-3">
                <h4 className="text-sm font-semibold text-foreground">
                  Record Payment
                </h4>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Amount
                  </label>
                  <div className="relative mt-1">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max={detail.balance}
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      placeholder={detail.balance.toFixed(2)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm tabular-nums"
                    />
                  </div>
                  <div className="flex gap-2 mt-1">
                    {[
                      { label: "Full", value: detail.balance },
                      { label: "50%", value: detail.balance * 0.5 },
                      { label: "25%", value: detail.balance * 0.25 },
                    ].map((opt) => (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => setPayAmount(opt.value.toFixed(2))}
                        className="rounded-md border border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground hover:text-foreground"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      Method
                    </label>
                    <select
                      value={payMethod}
                      onChange={(e) => setPayMethod(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    >
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="cash">Cash</option>
                      <option value="mobile_money">Mobile Money</option>
                      <option value="check">Check</option>
                      <option value="card">Card</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      Date
                    </label>
                    <input
                      type="date"
                      value={payDate}
                      onChange={(e) => setPayDate(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Reference (optional)
                  </label>
                  <input
                    value={payRef}
                    onChange={(e) => setPayRef(e.target.value)}
                    placeholder="Transaction ID, check number..."
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowRecordPayment(false)}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const amt = parseFloat(payAmount) || detail.balance;
                      if (amt <= 0 || amt > detail.balance * 1.01) {
                        toast.error("Invalid amount");
                        return;
                      }
                      recordPayment.mutate({
                        invoiceApId: billId,
                        amount: amt.toFixed(2),
                        paymentDate: payDate,
                        method: payMethod as any,
                        reference: payRef || undefined,
                      });
                    }}
                    disabled={recordPayment.isPending}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {recordPayment.isPending && (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    )}
                    Record Payment
                  </button>
                </div>
              </div>
            )}

            {/* Vendor Info */}
            {detail.supplier && (
              <div className="mb-6">
                <h3 className="mb-3 text-sm font-semibold text-foreground">
                  Vendor
                </h3>
                <div className="rounded-xl border border-border p-4">
                  <p className="text-sm font-medium text-foreground">
                    {detail.supplier.name}
                  </p>
                  {detail.supplier.email && (
                    <p className="text-sm text-muted-foreground">
                      {detail.supplier.email}
                    </p>
                  )}
                  {detail.supplier.phone && (
                    <p className="text-sm text-muted-foreground">
                      {detail.supplier.phone}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Payment History */}
            {detail.payments && detail.payments.length > 0 && (
              <div>
                <h3 className="mb-3 text-sm font-semibold text-foreground">
                  Payment History
                </h3>
                <div className="space-y-2">
                  {detail.payments.map((payment) => {
                    const MethodIcon =
                      METHOD_ICONS[payment.method] ?? CreditCard;
                    return (
                      <div
                        key={payment.id}
                        className="flex items-center justify-between rounded-xl border border-border p-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
                            <MethodIcon className="h-4 w-4 text-emerald-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {format(payment.amount)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {payment.method.replace("_", " ")}
                              {payment.reference && ` · ${payment.reference}`}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(payment.paymentDate).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            },
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Notes */}
            {detail.notes && (
              <div className="mt-6">
                <h3 className="mb-3 text-sm font-semibold text-foreground">
                  Notes
                </h3>
                <p className="rounded-xl border border-border p-4 text-sm text-muted-foreground">
                  {detail.notes}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
