"use client";

import { useParams, useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/loading";
import { Badge } from "@/components/ui";
import { Package, ArrowLeft, AlertTriangle } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { statusBadgeClass } from "@/lib/badge-variants";

export default function InventoryItemDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = (params?.id as string) ?? "";

  const { data: item, isLoading } = trpc.inventory.getItemById.useQuery({ id });

  if (isLoading) {
    return <TableSkeleton rows={3} columns={4} />;
  }

  if (!item) {
    return (
      <EmptyState
        icon={<Package className="h-12 w-12" />}
        title="Item not found"
        description="The requested inventory item does not exist."
      />
    );
  }

  const lowStock = Number(item.quantityOnHand) < Number(item.reorderLevel);
  const transactions = (item as Record<string, unknown>).transactions as
    | Array<{
        id: string;
        type: string;
        quantity: number;
        referenceDate: string;
        notes: string | null;
      }>
    | undefined;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push("/dashboard/inventory")}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Inventory
        </button>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{item.name}</h1>
          <p className="text-muted-foreground">
            {item.description ?? item.sku}
          </p>
        </div>
        <Badge
          variant="secondary"
          className={statusBadgeClass(item.isActive ? "active" : "inactive")}
        >
          {item.isActive ? "active" : "inactive"}
        </Badge>
      </div>

      {lowStock && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20 p-4 text-sm text-amber-800 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4" />
          Low stock warning: quantity on hand ({Number(item.quantityOnHand)}) is
          below reorder level ({Number(item.reorderLevel)}).
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-4 rounded-lg border bg-card p-6">
          <h3 className="text-sm font-medium text-muted-foreground">
            Item Details
          </h3>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-muted-foreground">SKU</dt>
              <dd className="text-sm font-mono font-medium">{item.sku}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-muted-foreground">Category</dt>
              <dd className="text-sm">{item.category ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-muted-foreground">Unit of Measure</dt>
              <dd className="text-sm">{item.unitOfMeasure}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-muted-foreground">Cost Method</dt>
              <dd className="text-sm">{item.costMethod}</dd>
            </div>
          </dl>
        </div>

        <div className="space-y-4 rounded-lg border bg-card p-6">
          <h3 className="text-sm font-medium text-muted-foreground">
            Stock & Costing
          </h3>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-muted-foreground">Standard Cost</dt>
              <dd className="text-sm font-mono font-medium">
                {formatCurrency(Number(item.standardCost))}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-muted-foreground">
                Quantity On Hand
              </dt>
              <dd className="text-sm font-mono font-medium">
                {Number(item.quantityOnHand)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-muted-foreground">Reorder Level</dt>
              <dd className="text-sm font-mono">{Number(item.reorderLevel)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-muted-foreground">
                Reorder Quantity
              </dt>
              <dd className="text-sm font-mono">
                {Number(item.reorderQuantity)}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Recent Transactions</h3>

        {!transactions || transactions.length === 0 ? (
          <EmptyState
            icon={<Package className="h-8 w-8" />}
            title="No transactions"
            description="No inventory transactions have been recorded for this item yet."
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
                    Type
                  </th>
                  <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground">
                    Quantity
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-4 text-sm">
                      {formatDate(tx.referenceDate)}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <Badge variant="secondary">{tx.type}</Badge>
                    </td>
                    <td className="py-3 px-4 text-sm text-right font-mono">
                      {tx.quantity}
                    </td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">
                      {tx.notes ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
