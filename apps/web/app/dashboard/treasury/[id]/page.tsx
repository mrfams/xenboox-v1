"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { trpc } from "@/lib/trpc/client"
import { DetailShell } from "@/components/dashboard/detail-shell"
import { TableSkeleton } from "@/components/shared/loading"
import { EditBankAccountDialog } from "./edit-dialog"
import { CreateTransactionDialog } from "./create-transaction-dialog"
import { Badge, Button } from "@/components/ui"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui"
import { Pencil, Plus, ArrowRightLeft } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils"
import Link from "next/link"
import { statusBadgeClass } from "@/lib/badge-variants"

const typeLabels: Record<string, string> = {
  checking: "Checking",
  savings: "Savings",
  fixed_deposit: "Fixed Deposit",
}

export default function BankAccountDetailPage() {
  const params = useParams()
  const id = params.id as string

  const { data: account, isLoading: accountLoading } = trpc.treasury.getBankAccountById.useQuery({ id })
  const { data: transactions, isLoading: txLoading } = trpc.treasury.listBankTransactions.useQuery({ bankAccountId: id })
  const { data: reconciliations, isLoading: reconLoading } = trpc.treasury.listReconciliations.useQuery({ bankAccountId: id })

  const [editOpen, setEditOpen] = useState(false)
  const [createTxOpen, setCreateTxOpen] = useState(false)

  if (accountLoading) {
    return (
      <DetailShell title="Bank Account" backHref="/dashboard/treasury">
        <TableSkeleton rows={3} columns={3} />
      </DetailShell>
    )
  }

  if (!account) {
    return (
      <DetailShell title="Account not found" backHref="/dashboard/treasury">
        <p className="text-muted-foreground">The requested bank account does not exist.</p>
      </DetailShell>
    )
  }

  const infoCard = (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Account Details</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Bank</span>
            <span>{account.bankName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Account #</span>
            <span className="font-mono">{account.accountNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Current Balance</span>
            <span className="font-mono font-medium">{formatCurrency(Number(account.currentBalance))}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Type</span>
            <span>{typeLabels[account.type] ?? account.type}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Currency</span>
            <span>{account.currency}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Status</span>
            <Badge variant={account.isActive ? "success" : "secondary"}>
              {account.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
          {account.notes && (
            <div className="pt-2 border-t">
              <span className="text-muted-foreground text-xs">{account.notes}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )

  const transactionsTab = (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setCreateTxOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> New Transaction
        </Button>
      </div>
      {txLoading ? (
        <TableSkeleton rows={3} columns={5} />
      ) : !transactions || transactions.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No transactions yet.</p>
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell className="text-sm">{formatDate(tx.transactionDate)}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={statusBadgeClass(tx.type)}>
                      {tx.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{tx.description}</TableCell>
                  <TableCell className="text-sm font-mono">{tx.reference ?? "—"}</TableCell>
                  <TableCell className="text-sm text-right font-mono">
                    {formatCurrency(Number(tx.amount))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )

  const reconciliationTab = (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" asChild>
          <Link href={`/dashboard/treasury/${id}/reconciliation/new`}>
            <Plus className="mr-2 h-4 w-4" /> New Reconciliation
          </Link>
        </Button>
      </div>
      {reconLoading ? (
        <TableSkeleton rows={3} columns={5} />
      ) : !reconciliations || reconciliations.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No reconciliations yet.</p>
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Statement Date</TableHead>
                <TableHead className="text-right">Statement Balance</TableHead>
                <TableHead className="text-right">Book Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {reconciliations.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-sm">{formatDate(r.statementDate)}</TableCell>
                  <TableCell className="text-sm text-right font-mono">
                    {formatCurrency(Number(r.statementBalance))}
                  </TableCell>
                  <TableCell className="text-sm text-right font-mono">
                    {formatCurrency(Number(r.bookBalance))}
                  </TableCell>
                  <TableCell>
                    <Badge variant={r.status === "closed" ? "success" : "secondary"}>
                      {r.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/dashboard/treasury/${id}/reconciliation/${r.id}`}>
                        <ArrowRightLeft className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )

  return (
    <>
      <DetailShell
        title={account.name}
        description={`${account.bankName} — ${account.accountNumber}`}
        backHref="/dashboard/treasury"
        actions={
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" /> Edit
          </Button>
        }
        tabs={[
          { value: "info", label: "Overview", content: infoCard },
          { value: "transactions", label: "Transactions", content: transactionsTab },
          { value: "reconciliation", label: "Reconciliation", content: reconciliationTab },
        ]}
      />

      <EditBankAccountDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        account={account}
      />
      <CreateTransactionDialog
        open={createTxOpen}
        onOpenChange={setCreateTxOpen}
        bankAccountId={id}
      />
    </>
  )
}
