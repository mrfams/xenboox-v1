"use client";

import { useParams, useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { DetailShell } from "@/components/dashboard/detail-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/loading";
import { Badge } from "@/components/ui";
import { FileText } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { statusBadgeClass } from "@/lib/badge-variants";
import { toast } from "sonner";

export default function PODetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = (params?.id as string) ?? "";

  const { data: po, isLoading } = trpc.ap.getPOById.useQuery({ id });
  const { data: suppliers } = trpc.ap.listSuppliers.useQuery();
  const utils = trpc.useUtils();

  const updatePO = trpc.ap.updatePO.useMutation({
    onSuccess: () => {
      toast.success("Purchase order updated");
      utils.ap.getPOById.invalidate({ id });
      utils.ap.listPOs.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) return <TableSkeleton rows={3} columns={4} />;
  if (!po) {
    return (
      <EmptyState
        icon={<FileText className="h-12 w-12" />}
        title="Purchase order not found"
        description="The requested purchase order does not exist."
      />
    );
  }

  const supplier = suppliers?.find((s) => s.id === po.supplierId);
  const lineItems = (po as Record<string, unknown>).lineItems as
    | Array<{
        id: string;
        description: string;
        quantity: string;
        unitPrice: string;
        totalAmount: string;
      }>
    | undefined;

  function handleStatusChange(newStatus: string) {
    updatePO.mutate({
      id,
      status: newStatus as "submitted" | "approved" | "received" | "cancelled",
    });
  }

  return (
    <DetailShell
      title={`PO ${po.poNumber}`}
      description={`Supplier: ${supplier?.name ?? "—"}`}
      backHref="/dashboard/ap/pos"
      actions={
        <div className="flex items-center gap-2">
          {po.status === "draft" && (
            <button
              onClick={() => handleStatusChange("submitted")}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Submit
            </button>
          )}
          {po.status === "submitted" && (
            <button
              onClick={() => handleStatusChange("approved")}
              className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:text-white"
            >
              Approve
            </button>
          )}
          {po.status === "approved" && (
            <button
              onClick={() => handleStatusChange("received")}
              className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:text-white"
            >
              Mark Received
            </button>
          )}
        </div>
      }
    >
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-4 rounded-lg border bg-card p-6">
          <h3 className="text-sm font-medium text-muted-foreground">
            Order Info
          </h3>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-muted-foreground">PO Number</dt>
              <dd className="text-sm font-mono font-medium">{po.poNumber}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-muted-foreground">Supplier</dt>
              <dd className="text-sm">{supplier?.name ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-muted-foreground">Order Date</dt>
              <dd className="text-sm">{formatDate(po.orderDate)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-muted-foreground">Expected Date</dt>
              <dd className="text-sm">
                {po.expectedDate ? formatDate(po.expectedDate) : "—"}
              </dd>
            </div>
          </dl>
        </div>

        <div className="space-y-4 rounded-lg border bg-card p-6">
          <h3 className="text-sm font-medium text-muted-foreground">
            Financials
          </h3>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-muted-foreground">Currency</dt>
              <dd className="text-sm">{po.currency}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-muted-foreground">Total Amount</dt>
              <dd className="text-sm font-mono font-medium">
                {formatCurrency(Number(po.totalAmount))}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-muted-foreground">Status</dt>
              <dd>
                <Badge
                  variant="secondary"
                  className={statusBadgeClass(po.status)}
                >
                  {po.status}
                </Badge>
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {po.notes && (
        <div className="rounded-lg border bg-card p-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">
            Notes
          </h3>
          <p className="text-sm">{po.notes}</p>
        </div>
      )}

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Line Items</h3>
        {!lineItems || lineItems.length === 0 ? (
          <EmptyState
            icon={<FileText className="h-8 w-8" />}
            title="No line items"
            description="This purchase order has no line items."
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
    </DetailShell>
  );
}
