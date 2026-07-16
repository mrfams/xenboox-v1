"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { trpc } from "@/lib/trpc/client"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { TableSkeleton } from "@/components/shared/loading"
import { FilterBar } from "@/components/dashboard/filter-bar"
import { CreateBankAccountDialog } from "./create-dialog"
import { Badge } from "@/components/ui"
import { Landmark, Plus } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import type { FilterState } from "@/components/dashboard/filter-bar"

type BankAccount = {
  id: string
  name: string
  bankName: string
  accountNumber: string
  currentBalance: string
  isActive: boolean
  type: string
}

export default function TreasuryPage() {
  const router = useRouter()
  const { data: accounts, isLoading } = trpc.treasury.listBankAccounts.useQuery()
  const [createOpen, setCreateOpen] = useState(false)
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    dateFrom: "",
    dateTo: "",
    status: "",
    sort: "name-asc",
  })

  const filtered = useMemo(() => {
    if (!accounts) return []
    let result = [...(accounts as BankAccount[])]

    if (filters.search) {
      const q = filters.search.toLowerCase()
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.bankName.toLowerCase().includes(q) ||
          a.accountNumber.toLowerCase().includes(q)
      )
    }

    if (filters.status === "active") {
      result = result.filter((a) => a.isActive)
    } else if (filters.status === "inactive") {
      result = result.filter((a) => !a.isActive)
    }

    if (filters.sort === "name-asc") {
      result.sort((a, b) => a.name.localeCompare(b.name))
    } else if (filters.sort === "name-desc") {
      result.sort((a, b) => b.name.localeCompare(a.name))
    } else if (filters.sort === "amount-desc") {
      result.sort((a, b) => Number(b.currentBalance) - Number(a.currentBalance))
    } else if (filters.sort === "amount-asc") {
      result.sort((a, b) => Number(a.currentBalance) - Number(b.currentBalance))
    }

    return result
  }, [accounts, filters])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bank Accounts"
        description="Manage bank accounts and reconcile transactions"
        action={{
          label: "New Account",
          onClick: () => setCreateOpen(true),
          icon: <Plus className="mr-2 h-4 w-4" />,
        }}
      />

      <FilterBar
        onFilterChange={setFilters}
        statusOptions={[
          { value: "active", label: "Active" },
          { value: "inactive", label: "Inactive" },
        ]}
        sortOptions={[
          { value: "name-asc", label: "Name (A–Z)" },
          { value: "name-desc", label: "Name (Z–A)" },
          { value: "amount-desc", label: "Balance (highest)" },
          { value: "amount-asc", label: "Balance (lowest)" },
        ]}
      />

      {isLoading ? (
        <TableSkeleton rows={4} columns={5} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Landmark className="h-12 w-12" />}
          title="No bank accounts"
          description="Add your first bank account to start tracking transactions."
        />
      ) : (
        <div className="rounded-lg border bg-card">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">Name</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">Bank</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">Account #</th>
                <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground">Balance</th>
                <th className="py-3 px-4 text-center text-xs font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((account) => (
                <tr
                  key={account.id}
                  className="border-b hover:bg-muted/50 cursor-pointer"
                  onClick={() => router.push(`/dashboard/treasury/${account.id}`)}
                >
                  <td className="py-3 px-4 text-sm font-medium">{account.name}</td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">{account.bankName}</td>
                  <td className="py-3 px-4 text-sm font-mono">{account.accountNumber}</td>
                  <td className="py-3 px-4 text-sm text-right font-mono">
                    {formatCurrency(Number(account.currentBalance))}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <Badge variant={account.isActive ? "success" : "secondary"}>
                      {account.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CreateBankAccountDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
