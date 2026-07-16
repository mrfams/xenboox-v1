"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { trpc } from "@/lib/trpc/client"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { TableSkeleton } from "@/components/shared/loading"
import { FilterBar } from "@/components/dashboard/filter-bar"
import { Badge } from "@/components/ui"
import { Package, Plus, AlertTriangle } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { CreateItemDialog } from "./create-item-dialog"
import { statusBadgeClass } from "@/lib/badge-variants"
import type { FilterState } from "@/components/dashboard/filter-bar"

export default function InventoryPage() {
  const router = useRouter()
  const { data: items, isLoading } = trpc.inventory.listItems.useQuery()
  const [itemOpen, setItemOpen] = useState(false)
  const [filters, setFilters] = useState<FilterState>({
    search: "", dateFrom: "", dateTo: "", status: "", sort: "name-asc",
  })

  const filteredItems = useMemo(() => {
    if (!items) return []
    let result = [...items]
    if (filters.search) {
      const q = filters.search.toLowerCase()
      result = result.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.sku.toLowerCase().includes(q) ||
          (i.category ?? "").toLowerCase().includes(q)
      )
    }
    if (filters.status) {
      result = result.filter((i) => (filters.status === "active" ? i.isActive : !i.isActive))
    }
    if (filters.sort === "name-desc") {
      result.sort((a, b) => b.name.localeCompare(a.name))
    } else if (filters.sort === "amount-desc") {
      result.sort((a, b) => Number(b.standardCost) - Number(a.standardCost))
    } else if (filters.sort === "amount-asc") {
      result.sort((a, b) => Number(a.standardCost) - Number(b.standardCost))
    } else {
      result.sort((a, b) => a.name.localeCompare(b.name))
    }
    return result
  }, [items, filters])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        description="Manage inventory items, stock levels, and warehouses"
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
          { value: "amount-desc", label: "Cost (highest)" },
          { value: "amount-asc", label: "Cost (lowest)" },
        ]}
      />

      {isLoading ? (
        <TableSkeleton rows={5} columns={7} />
      ) : filteredItems.length === 0 ? (
        <EmptyState
          icon={<Package className="h-12 w-12" />}
          title="No inventory items"
          description="Add your first inventory item to start tracking stock."
        />
      ) : (
          <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">Name</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">SKU</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">Category</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">Unit</th>
                <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground">Standard Cost</th>
                <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground">Qty On Hand</th>
                <th className="py-3 px-4 text-center text-xs font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => {
                const lowStock = Number(item.quantityOnHand) < Number(item.reorderLevel)
                return (
                  <tr
                    key={item.id}
                    className="border-b hover:bg-muted/50 cursor-pointer"
                    onClick={() => router.push(`/dashboard/inventory/${item.id}`)}
                  >
                    <td className="py-3 px-4 text-sm font-medium">
                      <span className="flex items-center gap-2">
                        {item.name}
                        {lowStock && (
                          <AlertTriangle className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                        )}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-muted-foreground font-mono">{item.sku}</td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">{item.category ?? "—"}</td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">{item.unitOfMeasure}</td>
                    <td className="py-3 px-4 text-sm text-right font-mono">
                      {formatCurrency(Number(item.standardCost))}
                    </td>
                    <td className="py-3 px-4 text-sm text-right font-mono">
                      <span className={lowStock ? "text-amber-600 dark:text-amber-400 font-medium" : ""}>
                        {Number(item.quantityOnHand)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge variant="secondary" className={statusBadgeClass(item.isActive ? "active" : "inactive")}>
                        {item.isActive ? "active" : "inactive"}
                      </Badge>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={() => setItemOpen(true)}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New Item
        </button>
      </div>

      <CreateItemDialog open={itemOpen} onOpenChange={setItemOpen} />
    </div>
  )
}
