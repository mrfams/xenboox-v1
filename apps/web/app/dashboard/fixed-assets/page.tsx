"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { trpc } from "@/lib/trpc/client"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { TableSkeleton } from "@/components/shared/loading"
import { FilterBar } from "@/components/dashboard/filter-bar"
import { Badge } from "@/components/ui"
import { Landmark, Plus } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils"
import { CreateAssetDialog } from "./create-asset-dialog"
import { statusBadgeClass } from "@/lib/badge-variants"
import type { FilterState } from "@/components/dashboard/filter-bar"

export default function FixedAssetsPage() {
  const router = useRouter()
  const { data: assets, isLoading } = trpc.fixedAssets.listAssets.useQuery()
  const [assetOpen, setAssetOpen] = useState(false)
  const [filters, setFilters] = useState<FilterState>({
    search: "", dateFrom: "", dateTo: "", status: "", sort: "date-desc",
  })

  const filtered = useMemo(() => {
    if (!assets) return []
    let result = [...assets]
    if (filters.search) {
      const q = filters.search.toLowerCase()
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          (a.assetClass ?? "").toLowerCase().includes(q) ||
          (a.location ?? "").toLowerCase().includes(q)
      )
    }
    if (filters.status) {
      result = result.filter((a) => a.status === filters.status)
    }
    if (filters.sort === "date-asc") {
      result.sort((a, b) => new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime())
    } else {
      result.sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime())
    }
    return result
  }, [assets, filters])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fixed Assets"
        description="Track and manage your organization's fixed assets"
        action={{ label: "New Asset", icon: <Plus className="h-4 w-4" />, onClick: () => {} }}
      />

      <FilterBar
        onFilterChange={setFilters}
        statusOptions={[
          { value: "active", label: "Active" },
          { value: "disposed", label: "Disposed" },
          { value: "fully_depreciated", label: "Fully Depreciated" },
          { value: "under_maintenance", label: "Under Maintenance" },
        ]}
        showDateRange
        sortOptions={[
          { value: "date-desc", label: "Date (newest first)" },
          { value: "date-asc", label: "Date (oldest first)" },
        ]}
      />

      {isLoading ? (
        <TableSkeleton rows={4} columns={6} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Landmark className="h-12 w-12" />}
          title="No fixed assets"
          description="Register your first fixed asset to begin tracking depreciation."
        />
      ) : (
          <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">Name</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">Class</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">Location</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">Purchase Date</th>
                <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground">Cost</th>
                <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground">Accum. Depr.</th>
                <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground">NBV</th>
                <th className="py-3 px-4 text-center text-xs font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((asset) => (
                <tr
                  key={asset.id}
                  className="border-b hover:bg-muted/50 cursor-pointer"
                  onClick={() => router.push(`/dashboard/fixed-assets/${asset.id}`)}
                >
                  <td className="py-3 px-4 text-sm font-medium">{asset.name}</td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">{asset.assetClass ?? "—"}</td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">{asset.location ?? "—"}</td>
                  <td className="py-3 px-4 text-sm">{formatDate(asset.purchaseDate)}</td>
                  <td className="py-3 px-4 text-sm text-right font-mono">
                    {formatCurrency(Number(asset.cost))}
                  </td>
                  <td className="py-3 px-4 text-sm text-right font-mono">
                    {formatCurrency(Number(asset.accumulatedDepreciation ?? 0))}
                  </td>
                  <td className="py-3 px-4 text-sm text-right font-mono">
                    {formatCurrency(Number(asset.netBookValue ?? asset.cost))}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <Badge variant="secondary" className={statusBadgeClass(asset.status)}>
                      {asset.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={() => setAssetOpen(true)}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New Asset
        </button>
      </div>

      <CreateAssetDialog open={assetOpen} onOpenChange={setAssetOpen} />
    </div>
  )
}
