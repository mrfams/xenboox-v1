"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { DetailShell } from "@/components/dashboard/detail-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/loading";
import { EditSupplierDialog } from "./edit-dialog";
import { Badge } from "@/components/ui";
import { Users, FileText, CreditCard, Wallet } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { statusBadgeClass } from "@/lib/badge-variants";

const paymentMethodLabels: Record<string, string> = {
  bank_transfer: "Bank Transfer",
  cash: "Cash",
  mobile_money: "Mobile Money",
  check: "Check",
  card: "Card",
};

export default function SupplierDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = (params?.id as string) ?? "";

  const { data: supplier, isLoading } = trpc.ap.getSupplierById.useQuery({
    id,
  });
  const { data: pos } = trpc.ap.listPOs.useQuery();
  const { data: invoices } = trpc.ap.listInvoices.useQuery();
  const { data: payments } = trpc.ap.listPayments.useQuery();

  const [editOpen, setEditOpen] = useState(false);

  if (isLoading) return <TableSkeleton rows={3} columns={4} />;
  if (!supplier) {
    return (
      <EmptyState
        icon={<Users className="h-12 w-12" />}
        title="Supplier not found"
        description="The requested supplier does not exist."
      />
    );
  }

  const supplierPOs = pos?.filter((p) => p.supplierId === id) ?? [];
  const supplierInvoices = invoices?.filter((i) => i.supplierId === id) ?? [];
  const supplierInvoiceIds = new Set(supplierInvoices.map((i) => i.id));
  const supplierPayments =
    payments?.filter((p) => supplierInvoiceIds.has(p.invoiceApId)) ?? [];

  return (
    <>
      <DetailShell
        title={supplier.name}
        description={supplier.contactEmail ?? undefined}
        backHref="/dashboard/ap/suppliers"
        actions={
          <button
            onClick={() => setEditOpen(true)}
            className="inline-flex items-center gap-2 rounded-md border bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            Edit
          </button>
        }
        tabs={[
          {
            value: "details",
            label: "Details",
            content: (
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-4 rounded-lg border bg-card p-6">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Contact
                  </h3>
                  <dl className="space-y-3">
                    <div className="flex justify-between">
                      <dt className="text-sm text-muted-foreground">Email</dt>
                      <dd className="text-sm">
                        {supplier.contactEmail ?? "—"}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-muted-foreground">Phone</dt>
                      <dd className="text-sm">
                        {supplier.contactPhone ?? "—"}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-muted-foreground">Tax ID</dt>
                      <dd className="text-sm font-mono">
                        {supplier.taxId ?? "—"}
                      </dd>
                    </div>
                  </dl>
                </div>
                <div className="space-y-4 rounded-lg border bg-card p-6">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Terms & Status
                  </h3>
                  <dl className="space-y-3">
                    <div className="flex justify-between">
                      <dt className="text-sm text-muted-foreground">Address</dt>
                      <dd className="text-sm text-right max-w-[200px]">
                        {supplier.address ?? "—"}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-muted-foreground">
                        Payment Terms
                      </dt>
                      <dd className="text-sm">
                        {supplier.paymentTerms ?? "—"}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-muted-foreground">Status</dt>
                      <dd>
                        <Badge
                          variant={supplier.isActive ? "success" : "secondary"}
                        >
                          {supplier.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            ),
          },
          {
            value: "pos",
            label: `Purchase Orders (${supplierPOs.length})`,
            content:
              supplierPOs.length === 0 ? (
                <EmptyState
                  icon={<FileText className="h-8 w-8" />}
                  title="No purchase orders"
                  description="No purchase orders found for this supplier."
                />
              ) : (
                <div className="overflow-x-auto rounded-lg border bg-card">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                          PO #
                        </th>
                        <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                          Date
                        </th>
                        <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground">
                          Amount
                        </th>
                        <th className="py-3 px-4 text-center text-xs font-medium text-muted-foreground">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {supplierPOs.map((po) => (
                        <tr
                          key={po.id}
                          className="border-b hover:bg-muted/50 cursor-pointer"
                          onClick={() =>
                            router.push(`/dashboard/ap/pos/${po.id}`)
                          }
                        >
                          <td className="py-3 px-4 text-sm font-mono font-medium">
                            {po.poNumber}
                          </td>
                          <td className="py-3 px-4 text-sm">
                            {formatDate(po.orderDate)}
                          </td>
                          <td className="py-3 px-4 text-sm text-right font-mono">
                            {formatCurrency(Number(po.totalAmount))}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Badge
                              variant="secondary"
                              className={statusBadgeClass(po.status)}
                            >
                              {po.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ),
          },
          {
            value: "invoices",
            label: `Bills (${supplierInvoices.length})`,
            content:
              supplierInvoices.length === 0 ? (
                <EmptyState
                  icon={<CreditCard className="h-8 w-8" />}
                  title="No bills"
                  description="No bills found for this supplier."
                />
              ) : (
                <div className="overflow-x-auto rounded-lg border bg-card">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                          Invoice #
                        </th>
                        <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                          Date
                        </th>
                        <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground">
                          Total
                        </th>
                        <th className="py-3 px-4 text-center text-xs font-medium text-muted-foreground">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {supplierInvoices.map((inv) => (
                        <tr
                          key={inv.id}
                          className="border-b hover:bg-muted/50 cursor-pointer"
                          onClick={() =>
                            router.push(`/dashboard/ap/invoices/${inv.id}`)
                          }
                        >
                          <td className="py-3 px-4 text-sm font-mono font-medium">
                            {inv.invoiceNumber}
                          </td>
                          <td className="py-3 px-4 text-sm">
                            {formatDate(inv.invoiceDate)}
                          </td>
                          <td className="py-3 px-4 text-sm text-right font-mono">
                            {formatCurrency(Number(inv.totalAmount))}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Badge
                              variant="secondary"
                              className={statusBadgeClass(inv.status)}
                            >
                              {inv.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ),
          },
          {
            value: "payments",
            label: `Payments (${supplierPayments.length})`,
            content:
              supplierPayments.length === 0 ? (
                <EmptyState
                  icon={<Wallet className="h-8 w-8" />}
                  title="No payments"
                  description="No payments found for this supplier."
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
                      {supplierPayments.map((pmt) => (
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
              ),
          },
        ]}
      />

      <EditSupplierDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        supplier={supplier}
      />
    </>
  );
}
