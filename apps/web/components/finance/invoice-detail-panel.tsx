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
} from "lucide-react";

import { trpc } from "@/lib/trpc/client";
import { useEntity } from "@/lib/entity-context";
import { cn, formatCurrency } from "@/lib/utils";
import { Button } from "@xenboox/ui";
import { toast } from "sonner";
import { RecordPaymentDialog } from "@/components/dashboard/record-payment-dialog";
import { CreatePaymentLinkDialog } from "@/components/dashboard/create-payment-link-dialog";
import { useFormatCurrency } from "@/lib/hooks/use-currency";

// ─── Types ─────────────────────────────────────────────────────────────────

interface InvoiceDetailPanelProps {
  invoiceId: string;
  onClose: () => void;
  onRecordPayment?: () => void;
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

export function InvoiceDetailPanel({
  invoiceId,
  onClose,
}: InvoiceDetailPanelProps) {
  const { format } = useFormatCurrency();
  const { entityId } = useEntity();
  const [showRecordPayment, setShowRecordPayment] = useState(false);
  const [showPaymentLink, setShowPaymentLink] = useState(false);

  const { data: detail, isLoading } = trpc.invoicing.getInvoiceDetail.useQuery(
    { invoiceId },
    { enabled: !!entityId && !!invoiceId },
  );

  const generatePdf = trpc.invoicing.generatePdf.useQuery(
    { invoiceId },
    { enabled: false },
  );

  const sendEmail = trpc.invoicing.sendInvoiceEmail.useMutation({
    onSuccess: (data) => {
      toast.success(`Invoice sent to ${data.sentTo}`);
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const handleDownloadPdf = async () => {
    try {
      const result = await generatePdf.refetch();
      if (result.data) {
        const byteChars = atob(result.data.pdf);
        const byteArray = new Uint8Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) {
          byteArray[i] = byteChars.charCodeAt(i);
        }
        const blob = new Blob([byteArray], { type: result.data.mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = result.data.fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("PDF downloaded");
      }
    } catch {
      toast.error("Failed to generate PDF");
    }
  };

  const handleSendInvoice = () => {
    sendEmail.mutate({ invoiceId });
  };

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

  if (!detail) {
    return null;
  }

  const status = STATUS_CONFIG[detail.status] ?? STATUS_CONFIG.pending;
  const StatusIcon = status.icon;
  const isPaid = detail.status === "paid";
  const isVoided = detail.status === "voided";
  const canPay = !isPaid && !isVoided;

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
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  {detail.invoiceNumber}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {detail.customer?.name ?? "No customer"}
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
                {new Date(detail.dueDate).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
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

            {/* Action Buttons */}
            {canPay && (
              <div className="mb-6 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSendInvoice}
                  disabled={sendEmail.isPending}
                >
                  {sendEmail.isPending ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Send Invoice
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowPaymentLink(true)}
                >
                  <Link2 className="mr-1.5 h-3.5 w-3.5" />
                  Share Payment Link
                </Button>
                <Button size="sm" onClick={() => setShowRecordPayment(true)}>
                  <DollarSign className="mr-1.5 h-3.5 w-3.5" />
                  Record Payment
                </Button>
              </div>
            )}

            <Button
              size="sm"
              variant="ghost"
              onClick={handleDownloadPdf}
              className="mb-6"
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Download PDF
            </Button>

            {/* Line Items */}
            <div className="mb-6">
              <h3 className="mb-3 text-sm font-semibold text-foreground">
                Line Items
              </h3>
              <div className="rounded-xl border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                        Description
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">
                        Qty
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">
                        Price
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.payments && detail.payments.length > 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-3 py-4 text-center text-muted-foreground"
                        >
                          Line items loaded from invoice
                        </td>
                      </tr>
                    ) : (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-3 py-4 text-center text-muted-foreground"
                        >
                          No line items
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Customer Info */}
            {detail.customer && (
              <div className="mb-6">
                <h3 className="mb-3 text-sm font-semibold text-foreground">
                  Customer
                </h3>
                <div className="rounded-xl border border-border p-4">
                  <p className="text-sm font-medium text-foreground">
                    {detail.customer.name}
                  </p>
                  {detail.customer.email && (
                    <p className="text-sm text-muted-foreground">
                      {detail.customer.email}
                    </p>
                  )}
                  {detail.customer.phone && (
                    <p className="text-sm text-muted-foreground">
                      {detail.customer.phone}
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

      {/* Dialogs */}
      {showRecordPayment && (
        <RecordPaymentDialog
          invoiceId={invoiceId}
          balance={detail.balance}
          onClose={() => setShowRecordPayment(false)}
          onPaymentRecorded={() => {
            setShowRecordPayment(false);
          }}
        />
      )}

      {showPaymentLink && (
        <CreatePaymentLinkDialog
          invoiceId={invoiceId}
          balance={detail.balance}
          currency={detail.currency}
          onClose={() => setShowPaymentLink(false)}
        />
      )}
    </>
  );
}
