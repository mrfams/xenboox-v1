"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { DetailShell } from "@/components/dashboard/detail-shell";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { TableSkeleton } from "@/components/shared/loading";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { CheckCircle, AlertTriangle } from "lucide-react";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { toast } from "sonner";

export default function ReconciliationDetailPage() {
  const params = useParams();
  const bankAccountId = (params?.id as string) ?? "";
  const reconId = (params?.reconciliationId as string) ?? "";

  const { data: reconciliation, isLoading } =
    trpc.treasury.getReconciliationById.useQuery({ id: reconId });
  const utils = trpc.useUtils();

  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);

  const closeReconciliation = trpc.treasury.closeReconciliation.useMutation({
    onSuccess: () => {
      toast.success("Reconciliation closed");
      utils.treasury.getReconciliationById.invalidate({ id: reconId });
      utils.treasury.listReconciliations.invalidate({ bankAccountId });
      setCloseConfirmOpen(false);
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <DetailShell
        title="Reconciliation"
        backHref={`/dashboard/treasury/${bankAccountId}`}
      >
        <TableSkeleton rows={4} columns={4} />
      </DetailShell>
    );
  }

  if (!reconciliation) {
    return (
      <DetailShell
        title="Reconciliation not found"
        backHref={`/dashboard/treasury/${bankAccountId}`}
      >
        <p className="text-muted-foreground">
          The requested reconciliation does not exist.
        </p>
      </DetailShell>
    );
  }

  const statementBalance = Number(reconciliation.statementBalance);
  const bookBalance = Number(reconciliation.bookBalance);
  const difference = statementBalance - bookBalance;
  const isBalanced = Math.abs(difference) < 0.01;

  const matchedItems = (reconciliation.items ?? []).filter(
    (i) => i.status === "matched",
  );
  const unmatchedItems = (reconciliation.items ?? []).filter(
    (i) => i.status !== "matched",
  );
  const unresolvedTransactions = (
    reconciliation.unmatchedBankTransactions ?? []
  ).length;
  const hasUnresolvedItems =
    unmatchedItems.length > 0 || unresolvedTransactions > 0;

  const statusLabel =
    reconciliation.status === "matched"
      ? "Matched"
      : reconciliation.status === "closed"
        ? "Closed"
        : reconciliation.status === "unmatched" &&
            isBalanced &&
            !hasUnresolvedItems
          ? "Ready to Close"
          : "Unmatched";

  const statusColor =
    reconciliation.status === "closed"
      ? "bg-emerald-500/10 text-emerald-600"
      : reconciliation.status === "matched"
        ? "bg-emerald-500/10 text-emerald-600"
        : isBalanced && !hasUnresolvedItems
          ? "bg-amber-500/10 text-amber-600"
          : "bg-red-500/10 text-red-600";

  const canClose =
    reconciliation.status === "unmatched" && isBalanced && !hasUnresolvedItems;

  return (
    <>
      <DetailShell
        title={`Reconciliation — ${formatDate(reconciliation.statementDate)}`}
        backHref={`/dashboard/treasury/${bankAccountId}`}
        actions={
          reconciliation.status !== "closed" && (
            <div className="flex items-center gap-2">
              {!canClose && (
                <Badge
                  variant="outline"
                  className="bg-amber-500/10 text-amber-600 border-amber-200 gap-1"
                >
                  <AlertTriangle className="h-3 w-3" />
                  Resolve items before closing
                </Badge>
              )}
              <Button
                size="sm"
                onClick={() => setCloseConfirmOpen(true)}
                disabled={!canClose}
                title={
                  !canClose
                    ? "All items must be resolved before closing"
                    : "Close Reconciliation"
                }
              >
                <CheckCircle className="mr-2 h-4 w-4" /> Close Reconciliation
              </Button>
            </div>
          )
        }
      >
        {/* Balance Summary Cards */}
        <div className="grid gap-6 sm:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">
                Statement Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-mono font-bold">
                {formatCurrency(statementBalance)}
              </span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">
                Book Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-mono font-bold">
                {formatCurrency(bookBalance)}
              </span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">
                Difference
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span
                className={`text-2xl font-mono font-bold ${isBalanced ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
              >
                {formatCurrency(difference)}
              </span>
            </CardContent>
          </Card>
        </div>

        {/* Status Banner */}
        <div
          className={cn(
            "rounded-lg border px-4 py-3 flex items-center justify-between",
            statusColor,
          )}
        >
          <div className="flex items-center gap-2">
            {reconciliation.status === "closed" || isBalanced ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertTriangle className="h-4 w-4" />
            )}
            <span className="text-sm font-medium">{statusLabel}</span>
            {!isBalanced && (
              <span className="text-xs opacity-70">
                — Difference must be zero to close
              </span>
            )}
            {isBalanced && hasUnresolvedItems && (
              <span className="text-xs opacity-70">
                — {unmatchedItems.length + unresolvedTransactions} item(s) still
                need matching
              </span>
            )}
          </div>
        </div>

        {/* Split View: Matched (left) vs Unmatched (right) */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left: Matched Items */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  Matched
                </CardTitle>
                <Badge variant="secondary" className="text-[10px]">
                  {matchedItems.length} item
                  {matchedItems.length !== 1 ? "s" : ""}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {matchedItems.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No items matched yet. Match bank transactions with ledger
                  entries.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {matchedItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-lg bg-emerald-500/5 border border-emerald-200/50 px-3 py-2 text-sm"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {item.bankTransaction?.description ?? "—"}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {formatDate(
                            item.bankTransaction?.transactionDate ?? "",
                          )}
                        </p>
                      </div>
                      <span className="font-mono text-sm font-medium text-emerald-600 ml-3">
                        {formatCurrency(
                          Number(
                            item.matchedAmount ??
                              item.bankTransaction?.amount ??
                              0,
                          ),
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right: Unmatched Transactions */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Unmatched
                </CardTitle>
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-[10px]",
                    (unmatchedItems.length > 0 || unresolvedTransactions > 0) &&
                      "bg-amber-500/10 text-amber-600",
                  )}
                >
                  {unmatchedItems.length + unresolvedTransactions} item
                  {unmatchedItems.length + unresolvedTransactions !== 1
                    ? "s"
                    : ""}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {unmatchedItems.length === 0 && unresolvedTransactions === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  All items matched. Ready to close.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {/* Items in reconciliation marked as unmatched/pending */}
                  {unmatchedItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-lg bg-amber-500/5 border border-amber-200/50 px-3 py-2 text-sm"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {item.bankTransaction?.description ?? "—"}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {formatDate(
                            item.bankTransaction?.transactionDate ?? "",
                          )}
                        </p>
                      </div>
                      <span className="font-mono text-sm font-medium text-amber-600 ml-3">
                        {formatCurrency(
                          Number(
                            item.matchedAmount ??
                              item.bankTransaction?.amount ??
                              0,
                          ),
                        )}
                      </span>
                    </div>
                  ))}

                  {/* Bank transactions not yet part of this reconciliation */}
                  {(reconciliation.unmatchedBankTransactions ?? []).map(
                    (tx) => (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between rounded-lg border border-dashed border-muted-foreground/30 px-3 py-2 text-sm"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {tx.description ?? "—"}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {formatDate(tx.transactionDate ?? "")} ·{" "}
                            {tx.type ?? "Unknown"}
                          </p>
                        </div>
                        <span className="font-mono text-sm font-medium ml-3">
                          {formatCurrency(Number(tx.amount ?? 0))}
                        </span>
                      </div>
                    ),
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Notes */}
        {reconciliation.notes && (
          <div className="rounded-lg border bg-card p-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">
              Notes
            </h3>
            <p className="text-sm text-muted-foreground">
              {reconciliation.notes}
            </p>
          </div>
        )}
      </DetailShell>

      <ConfirmDialog
        open={closeConfirmOpen}
        onOpenChange={setCloseConfirmOpen}
        title={
          canClose ? "Close Reconciliation" : "Cannot Close Reconciliation"
        }
        description={
          !canClose
            ? hasUnresolvedItems
              ? "This reconciliation has unresolved items. Per system rules, it cannot be closed until all items are resolved. Match or mark all items before closing."
              : !isBalanced
                ? "The difference between statement and book balance is not zero. Post adjusting entries before closing."
                : "Closing this reconciliation will finalize it. This action cannot be undone."
            : "Closing this reconciliation will finalize it. This action cannot be undone."
        }
        confirmText="Close Reconciliation"
        variant="default"
        isLoading={closeReconciliation.isPending}
        onConfirm={() => {
          if (canClose) closeReconciliation.mutate({ id: reconId });
        }}
      />
    </>
  );
}
