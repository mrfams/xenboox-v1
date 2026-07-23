"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { DetailShell } from "@/components/dashboard/detail-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/loading";
import { CreatePaymentDialog } from "./create-payment-dialog";
import { InvoiceCorrectionDialog } from "@/components/dashboard/invoices/invoice-correction-dialog";
import { Badge } from "@/components/ui";
import { CreditCard, Plus, Pencil } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { statusBadgeClass } from "@/lib/badge-variants";

const paymentMethodLabels: Record<string, string> = {
  bank_transfer: "Bank Transfer",
  cash: "Cash",
  mobile_money: "Mobile Money",
  check: "Check",
  card: "Card",
};

export default function BillDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const { data: invoice, isLoading } = trpc.ap.getInvoiceById.useQuery({ id });
  const { data: suppliers } = trpc.ap.listSuppliers.useQuery();
  const { data: payments } = trpc.ap.listPayments.useQuery();

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  if (isLoading) return <TableSkeleton rows={3} columns={4} />;
  if (!invoice) {
    return (
      <EmptyState
        icon={<CreditCard className="h-12 w-12" />}
        title="Bill not found"
        description="The requested bill does not exist."
      />
    );
  }

  const supplier = suppliers?.find((s) => s.id === invoice.supplierId);
  const invoicePayments = payments?.filter((p) => p.invoiceApId === id) ?? [];
  const lineItems = (invoice as Record<string, unknown>).lineItems as
    | Array<{
        id: string;
        description: string;
        quantity: string;
        unitPrice: string;
        totalAmount: string;
      }>
    | undefined;

  const totalPaid = invoicePayments.reduce(
    (sum, p) => sum + Number(p.amount),
    0,
  );
  const balance = Number(invoice.totalAmount) - totalPaid;

  return (
    <DetailShell
      title={`Bill ${invoice.invoiceNumber}`}
      description={`Supplier: ${supplier?.name ?? "—"}`}
      backHref="/dashboard/ap/invoices"
      actions={
        invoice.status !== "paid" && invoice.status !== "voided" ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setEditOpen(true)}
              className="inline-flex items-center gap-2 rounded-md border bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              <Pencil className="h-4 w-4" />
              Correct
            </button>
            <button
              onClick={() => setPaymentOpen(true)}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Record Payment
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditOpen(true)}
            className="inline-flex items-center gap-2 rounded-md border bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            <Pencil className="h-4 w-4" />
            Correct
          </button>
        )
      }
    >
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-4 rounded-lg border bg-card p-6">
          <h3 className="text-sm font-medium text-muted-foreground">
            Bill Info
          </h3>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-muted-foreground">Invoice #</dt>
              <dd className="text-sm font-mono font-medium">
                {invoice.invoiceNumber}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-muted-foreground">Supplier</dt>
              <dd className="text-sm">{supplier?.name ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-muted-foreground">Invoice Date</dt>
              <dd className="text-sm">{formatDate(invoice.invoiceDate)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-muted-foreground">Due Date</dt>
              <dd className="text-sm">{formatDate(invoice.dueDate)}</dd>
            </div>
          </dl>
        </div>

        <div className="space-y-4 rounded-lg border bg-card p-6">
          <h3 className="text-sm font-medium text-muted-foreground">
            Financials
          </h3>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-muted-foreground">Total</dt>
              <dd className="text-sm font-mono font-medium">
                {formatCurrency(Number(invoice.totalAmount))}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-muted-foreground">Paid</dt>
              <dd className="text-sm font-mono">{formatCurrency(totalPaid)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-muted-foreground">Balance</dt>
              <dd className="text-sm font-mono font-medium">
                {formatCurrency(balance)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-muted-foreground">Status</dt>
              <dd>
                <Badge
                  variant="secondary"
                  className={statusBadgeClass(invoice.status)}
                >
                  {invoice.status}
                </Badge>
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {invoice.notes && (
        <div className="rounded-lg border bg-card p-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">
            Notes
          </h3>
          <p className="text-sm">{invoice.notes}</p>
        </div>
      )}

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Line Items</h3>
        {!lineItems || lineItems.length === 0 ? (
          <EmptyState
            icon={<CreditCard className="h-8 w-8" />}
            title="No line items"
            description="This bill has no line items."
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                    Description
                  </th>
                  <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground">
                    Qty
                  </th>
                  <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground">
                    Unit Price
                  </th>
                  <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item) => (
                  <tr key={item.id} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-4 text-sm">{item.description}</td>
                    <td className="py-3 px-4 text-sm text-right font-mono">
                      {item.quantity}
                    </td>
                    <td className="py-3 px-4 text-sm text-right font-mono">
                      {formatCurrency(Number(item.unitPrice))}
                    </td>
                    <td className="py-3 px-4 text-sm text-right font-mono">
                      {formatCurrency(Number(item.totalAmount))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Payments</h3>
        {invoicePayments.length === 0 ? (
          <EmptyState
            icon={<CreditCard className="h-8 w-8" />}
            title="No payments"
            description="No payments have been recorded for this bill."
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                    Date
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                    Method
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                    Reference
                  </th>
                  <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoicePayments.map((pmt) => (
                  <tr key={pmt.id} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-4 text-sm">
                      {formatDate(pmt.paymentDate)}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {paymentMethodLabels[pmt.method] ?? pmt.method}
                    </td>
                    <td className="py-3 px-4 text-sm font-mono text-muted-foreground">
                      {pmt.reference ?? "—"}
                    </td>
                    <td className="py-3 px-4 text-sm text-right font-mono">
                      {formatCurrency(Number(pmt.amount))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CreatePaymentDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        invoiceId={id}
        balance={balance}
      />

      <InvoiceCorrectionDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        invoice={{
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          invoiceDate: invoice.invoiceDate,
          dueDate: invoice.dueDate,
          totalAmount: String(invoice.totalAmount),
          status: invoice.status as "pending" | "partial" | "overdue",
          notes: invoice.notes,
        }}
        onConfirmed={() => {}}
        type="ap"
      />
    </DetailShell>
  );
}
