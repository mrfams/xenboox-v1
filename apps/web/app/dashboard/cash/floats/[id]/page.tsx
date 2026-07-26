"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { DetailShell } from "@/components/dashboard/detail-shell";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/loading";
import { AddReceiptDialog } from "./add-receipt-dialog";
import { Badge } from "@/components/ui";
import { Wallet, Plus } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { statusBadgeClass } from "@/lib/badge-variants";
import { toast } from "sonner";

export default function ImprestFloatDetailPage() {
  const params = useParams();
  const id = (params?.id as string) ?? "";

  const { data: float, isLoading } = trpc.cash.getImprestFloatById.useQuery({
    id,
  });
  const utils = trpc.useUtils();

  const [addReceiptOpen, setAddReceiptOpen] = useState(false);
  const [settleOpen, setSettleOpen] = useState(false);

  const settleFloat = trpc.cash.settleImprestFloat.useMutation({
    onSuccess: () => {
      toast.success("Imprest float settled");
      utils.cash.getImprestFloatById.invalidate({ id });
      utils.cash.listImprestFloats.invalidate();
      setSettleOpen(false);
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) {
    return <TableSkeleton rows={3} columns={4} />;
  }

  if (!float) {
    return (
      <EmptyState
        icon={<Wallet className="h-12 w-12" />}
        title="Float not found"
        description="The requested imprest float does not exist."
      />
    );
  }

  const receipts = (float as Record<string, unknown>).receipts as
    | Array<{
        id: string;
        description: string;
        amount: string;
        receiptDate: string;
      }>
    | undefined;

  return (
    <DetailShell
      title={`Imprest Float — ${float.assigneeName}`}
      description={float.purpose ?? undefined}
      backHref="/dashboard/cash"
      actions={
        float.status === "active" ? (
          <button
            onClick={() => setAddReceiptOpen(true)}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Add Receipt
          </button>
        ) : undefined
      }
    >
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-4 rounded-lg border bg-card p-6">
          <h3 className="text-sm font-medium text-muted-foreground">Details</h3>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-muted-foreground">Assignee</dt>
              <dd className="text-sm font-medium">{float.assigneeName}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-muted-foreground">Purpose</dt>
              <dd className="text-sm">{float.purpose ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-muted-foreground">Issued Date</dt>
              <dd className="text-sm">{formatDate(float.issuedDate!)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-muted-foreground">Settle By</dt>
              <dd className="text-sm">
                {float.settleByDate ? formatDate(float.settleByDate) : "—"}
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
              <dt className="text-sm text-muted-foreground">Amount Issued</dt>
              <dd className="text-sm font-mono font-medium">
                {formatCurrency(Number(float.amount))}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-muted-foreground">Remaining</dt>
              <dd className="text-sm font-mono font-medium">
                {formatCurrency(Number(float.remainingBalance))}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-muted-foreground">Status</dt>
              <dd>
                <Badge
                  variant="secondary"
                  className={statusBadgeClass(float.status)}
                >
                  {float.status}
                </Badge>
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Receipts</h3>
          {float.status === "active" && (
            <button
              onClick={() => setAddReceiptOpen(true)}
              className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent"
            >
              <Plus className="h-4 w-4" />
              Add Receipt
            </button>
          )}
        </div>

        {!receipts || receipts.length === 0 ? (
          <EmptyState
            icon={<Wallet className="h-8 w-8" />}
            title="No receipts"
            description="Add receipts to track spending against this float."
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
                    Description
                  </th>
                  <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {receipts.map((r) => (
                  <tr key={r.id} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-4 text-sm">
                      {formatDate(r.receiptDate)}
                    </td>
                    <td className="py-3 px-4 text-sm">{r.description}</td>
                    <td className="py-3 px-4 text-sm text-right font-mono">
                      {formatCurrency(Number(r.amount))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {float.status === "active" && (
        <div className="flex justify-end">
          <button
            onClick={() => setSettleOpen(true)}
            className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
          >
            Settle Float
          </button>
        </div>
      )}

      <AddReceiptDialog
        open={addReceiptOpen}
        onOpenChange={setAddReceiptOpen}
        floatId={id}
      />

      <ConfirmDialog
        open={settleOpen}
        onOpenChange={setSettleOpen}
        title="Settle Imprest Float"
        description="This will mark the float as settled and reconcile the remaining balance. This action cannot be undone."
        confirmText="Settle Float"
        onConfirm={() => settleFloat.mutate({ id })}
        isLoading={settleFloat.isPending}
      />
    </DetailShell>
  );
}
