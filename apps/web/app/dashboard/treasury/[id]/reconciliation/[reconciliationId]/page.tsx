"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { trpc } from "@/lib/trpc/client"
import { DetailShell } from "@/components/dashboard/detail-shell"
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog"
import { TableSkeleton } from "@/components/shared/loading"
import { Badge, Button } from "@/components/ui"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui"
import { CheckCircle, XCircle } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils"
import { statusBadgeClass } from "@/lib/badge-variants"
import { toast } from "sonner"

export default function ReconciliationDetailPage() {
  const params = useParams()
  const bankAccountId = params.id as string
  const reconId = params.reconciliationId as string

  const { data: reconciliation, isLoading } = trpc.treasury.getReconciliationById.useQuery({ id: reconId })
  const utils = trpc.useUtils()

  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false)

  const closeReconciliation = trpc.treasury.closeReconciliation.useMutation({
    onSuccess: () => {
      toast.success("Reconciliation closed")
      utils.treasury.getReconciliationById.invalidate({ id: reconId })
      utils.treasury.listReconciliations.invalidate({ bankAccountId })
      setCloseConfirmOpen(false)
    },
    onError: (err) => toast.error(err.message),
  })

  if (isLoading) {
    return (
      <DetailShell title="Reconciliation" backHref={`/dashboard/treasury/${bankAccountId}`}>
        <TableSkeleton rows={4} columns={4} />
      </DetailShell>
    )
  }

  if (!reconciliation) {
    return (
      <DetailShell title="Reconciliation not found" backHref={`/dashboard/treasury/${bankAccountId}`}>
        <p className="text-muted-foreground">The requested reconciliation does not exist.</p>
      </DetailShell>
    )
  }

  const statementBalance = Number(reconciliation.statementBalance)
  const bookBalance = Number(reconciliation.bookBalance)
  const difference = statementBalance - bookBalance

  return (
    <>
      <DetailShell
        title={`Reconciliation — ${formatDate(reconciliation.statementDate)}`}
        backHref={`/dashboard/treasury/${bankAccountId}`}
        actions={
          reconciliation.status === "unmatched" && (
            <Button
              size="sm"
              onClick={() => setCloseConfirmOpen(true)}
            >
              <CheckCircle className="mr-2 h-4 w-4" /> Close Reconciliation
            </Button>
          )
        }
      >
        <div className="grid gap-6 sm:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Statement Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-mono font-bold">{formatCurrency(statementBalance)}</span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Book Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-mono font-bold">{formatCurrency(bookBalance)}</span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Difference</CardTitle>
            </CardHeader>
            <CardContent>
              <span
                className={`text-2xl font-mono font-bold ${Math.abs(difference) < 0.01 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
              >
                {formatCurrency(difference)}
              </span>
            </CardContent>
          </Card>
        </div>

        <div className="rounded-lg border bg-card">
          <div className="p-4 flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">Reconciliation Status</h3>
            <Badge variant="secondary" className={statusBadgeClass(reconciliation.status)}>
              {reconciliation.status}
            </Badge>
          </div>
        </div>

        <div className="rounded-lg border bg-card">
          <div className="p-4">
            <h3 className="text-sm font-medium text-muted-foreground">Matched Items</h3>
          </div>
          {!reconciliation.items || reconciliation.items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No items matched yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transaction Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reconciliation.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-sm">
                      {formatDate(item.bankTransaction?.transactionDate ?? "")}
                    </TableCell>
                    <TableCell className="text-sm">{item.bankTransaction?.description ?? "—"}</TableCell>
                    <TableCell className="text-sm">{item.bankTransaction?.type ?? "—"}</TableCell>
                    <TableCell className="text-sm text-right font-mono">
                      {formatCurrency(Number(item.bankTransaction?.amount ?? 0))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {reconciliation.notes && (
          <div className="rounded-lg border bg-card p-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Notes</h3>
            <p className="text-sm text-muted-foreground">{reconciliation.notes}</p>
          </div>
        )}
      </DetailShell>

      <ConfirmDialog
        open={closeConfirmOpen}
        onOpenChange={setCloseConfirmOpen}
        title="Close Reconciliation"
        description="Closing this reconciliation will finalize it. This action cannot be undone."
        confirmText="Close Reconciliation"
        variant="default"
        isLoading={closeReconciliation.isPending}
        onConfirm={() => closeReconciliation.mutate({ id: reconId })}
      />
    </>
  )
}
