"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { trpc } from "@/lib/trpc/client"
import { DetailShell } from "@/components/dashboard/detail-shell"
import { EmptyState } from "@/components/shared/empty-state"
import { TableSkeleton } from "@/components/shared/loading"
import { EditCustomerDialog } from "./edit-dialog"
import { Badge } from "@/components/ui"
import { Users, FileText, CreditCard, Wallet } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils"
import { statusBadgeClass } from "@/lib/badge-variants"

const paymentMethodLabels: Record<string, string> = {
  bank_transfer: "Bank Transfer",
  cash: "Cash",
  mobile_money: "Mobile Money",
  check: "Check",
  card: "Card",
}

export default function CustomerDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const { data: customer, isLoading } = trpc.ar.getCustomerById.useQuery({ id })
  const { data: invoices } = trpc.ar.listInvoices.useQuery()
  const { data: payments } = trpc.ar.listPayments.useQuery()

  const [editOpen, setEditOpen] = useState(false)

  if (isLoading) return <TableSkeleton rows={3} columns={4} />
  if (!customer) {
    return (
      <EmptyState
        icon={<Users className="h-12 w-12" />}
        title="Customer not found"
        description="The requested customer does not exist."
      />
    )
  }

  const customerInvoices = invoices?.filter((i) => i.customerId === id) ?? []
  const invoiceIds = new Set(customerInvoices.map((i) => i.id))
  const customerPayments = payments?.filter((p) => invoiceIds.has(p.salesInvoiceId)) ?? []

  return (
    <>
    <DetailShell
      title={customer.name}
      description={customer.contactEmail ?? undefined}
      backHref="/dashboard/ar/customers"
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
                <h3 className="text-sm font-medium text-muted-foreground">Contact</h3>
                <dl className="space-y-3">
                  <div className="flex justify-between">
                    <dt className="text-sm text-muted-foreground">Email</dt>
                    <dd className="text-sm">{customer.contactEmail ?? "—"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-muted-foreground">Phone</dt>
                    <dd className="text-sm">{customer.contactPhone ?? "—"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-muted-foreground">Tax ID</dt>
                    <dd className="text-sm font-mono">{customer.taxId ?? "—"}</dd>
                  </div>
                </dl>
              </div>
              <div className="space-y-4 rounded-lg border bg-card p-6">
                <h3 className="text-sm font-medium text-muted-foreground">Terms & Status</h3>
                <dl className="space-y-3">
                  <div className="flex justify-between">
                    <dt className="text-sm text-muted-foreground">Address</dt>
                    <dd className="text-sm text-right max-w-[200px]">{customer.address ?? "—"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-muted-foreground">Payment Terms</dt>
                    <dd className="text-sm">{customer.paymentTerms}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-muted-foreground">Credit Limit</dt>
                    <dd className="text-sm font-mono">
                      {customer.creditLimit ? formatCurrency(Number(customer.creditLimit)) : "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-muted-foreground">Status</dt>
                    <dd>
                      <Badge variant={customer.isActive ? "success" : "secondary"}>
                        {customer.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          ),
        },
        {
          value: "invoices",
          label: `Invoices (${customerInvoices.length})`,
          content: customerInvoices.length === 0 ? (
            <EmptyState
              icon={<FileText className="h-8 w-8" />}
              title="No invoices"
              description="No invoices found for this customer."
            />
          ) : (
              <div className="overflow-x-auto rounded-lg border bg-card">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">Invoice #</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">Date</th>
                    <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground">Total</th>
                    <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground">Balance</th>
                    <th className="py-3 px-4 text-center text-xs font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {customerInvoices.map((inv) => (
                    <tr
                      key={inv.id}
                      className="border-b hover:bg-muted/50 cursor-pointer"
                      onClick={() => router.push(`/dashboard/ar/invoices/${inv.id}`)}
                    >
                      <td className="py-3 px-4 text-sm font-mono font-medium">{inv.invoiceNumber}</td>
                      <td className="py-3 px-4 text-sm">{formatDate(inv.invoiceDate)}</td>
                      <td className="py-3 px-4 text-sm text-right font-mono">
                        {formatCurrency(Number(inv.totalAmount))}
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-mono">
                        {formatCurrency(Number(inv.balance))}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant="secondary" className={statusBadgeClass(inv.status)}>
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
          label: `Payments (${customerPayments.length})`,
          content: customerPayments.length === 0 ? (
            <EmptyState
              icon={<Wallet className="h-8 w-8" />}
              title="No payments"
              description="No payments found for this customer."
            />
          ) : (
              <div className="overflow-x-auto rounded-lg border bg-card">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">Date</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">Method</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">Reference</th>
                    <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {customerPayments.map((pmt) => (
                    <tr key={pmt.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4 text-sm">{formatDate(pmt.paymentDate)}</td>
                      <td className="py-3 px-4 text-sm">{paymentMethodLabels[pmt.method] ?? pmt.method}</td>
                      <td className="py-3 px-4 text-sm font-mono text-muted-foreground">{pmt.reference ?? "—"}</td>
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

    <EditCustomerDialog
      open={editOpen}
      onOpenChange={setEditOpen}
      customer={customer}
    />
    </>
  )
}
