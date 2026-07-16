"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { trpc } from "@/lib/trpc/client"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { TableSkeleton } from "@/components/shared/loading"
import { FilterBar } from "@/components/dashboard/filter-bar"
import { CreatePODialog } from "./create-dialog"
import { Badge } from "@/components/ui"
import { FileText, Plus } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils"
import { statusBadgeClass } from "@/lib/badge-variants"
import type { FilterState } from "@/components/dashboard/filter-bar"

export default function POsPage() {
  const router = useRouter()
  const { data: pos, isLoading } = trpc.ap.listPOs.useQuery()
  const [createOpen, setCreateOpen] = useState(false)
  const [filters, setFilters] = useState<FilterState>({
    search: "", dateFrom: "", dateTo: "", status: "", sort: "date-desc",
  })

  const filtered = useMemo(() => {
    if (!pos) return []
    let result = [...pos]
    if (filters.search) {
      const q = filters.search.toLowerCase()
      result = result.filter((p) => p.poNumber.toLowerCase().includes(q))
    }
    if (filters.status) {
      result = result.filter((p) => p.status === filters.status)
    }
    if (filters.sort === "date-asc") {
      result.sort((a, b) => new Date(a.orderDate).getTime() - new Date(b.orderDate).getTime())
    } else if (filters.sort === "amount-desc") {
      result.sort((a, b) => Number(b.totalAmount) - Number(a.totalAmount))
    } else if (filters.sort === "amount-asc") {
      result.sort((a, b) => Number(a.totalAmount) - Number(b.totalAmount))
    } else {
      result.sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime())
    }
    return result
  }, [pos, filters])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase Orders"
        description="Track supplier purchase orders"
        action={{
          label: "New PO",
          onClick: () => setCreateOpen(true),
          icon: <Plus className="mr-2 h-4 w-4" />,
        }}
      />

      <FilterBar
        onFilterChange={setFilters}
        statusOptions={[
          { value: "draft", label: "Draft" },
          { value: "submitted", label: "Submitted" },
          { value: "approved", label: "Approved" },
          { value: "received", label: "Received" },
          { value: "cancelled", label: "Cancelled" },
        ]}
        showDateRange
        sortOptions={[
          { value: "date-desc", label: "Date (newest first)" },
          { value: "date-asc", label: "Date (oldest first)" },
          { value: "amount-desc", label: "Amount (highest)" },
          { value: "amount-asc", label: "Amount (lowest)" },
        ]}
      />

      {isLoading ? (
        <TableSkeleton rows={6} columns={5} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-12 w-12" />}
          title="No purchase orders"
          description="Create your first purchase order to procure goods or services."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">PO Number</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">Date</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">Expected</th>
                <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground">Amount</th>
                <th className="py-3 px-4 text-center text-xs font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((po) => (
                <tr
                  key={po.id}
                  className="border-b hover:bg-muted/50 cursor-pointer"
                  onClick={() => router.push(`/dashboard/ap/pos/${po.id}`)}
                >
                  <td className="py-3 px-4 text-sm font-mono font-medium">{po.poNumber}</td>
                  <td className="py-3 px-4 text-sm">{formatDate(po.orderDate)}</td>
                  <td className="py-3 px-4 text-sm">{po.expectedDate ? formatDate(po.expectedDate) : "—"}</td>
                  <td className="py-3 px-4 text-sm text-right font-mono">
                    {formatCurrency(Number(po.totalAmount))}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <Badge variant="secondary" className={statusBadgeClass(po.status)}>
                      {po.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CreatePODialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
