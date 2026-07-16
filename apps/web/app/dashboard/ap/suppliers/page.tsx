"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { trpc } from "@/lib/trpc/client"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { TableSkeleton } from "@/components/shared/loading"
import { FilterBar } from "@/components/dashboard/filter-bar"
import { CreateSupplierDialog } from "./create-dialog"
import { Badge } from "@/components/ui"
import { Users, Plus } from "lucide-react"
import type { FilterState } from "@/components/dashboard/filter-bar"

export default function SuppliersPage() {
  const router = useRouter()
  const { data: suppliers, isLoading } = trpc.ap.listSuppliers.useQuery()
  const [createOpen, setCreateOpen] = useState(false)
  const [filters, setFilters] = useState<FilterState>({
    search: "", dateFrom: "", dateTo: "", status: "", sort: "name-asc",
  })

  const filtered = useMemo(() => {
    if (!suppliers) return []
    let result = [...suppliers]
    if (filters.search) {
      const q = filters.search.toLowerCase()
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.contactEmail ?? "").toLowerCase().includes(q)
      )
    }
    if (filters.status === "active") {
      result = result.filter((s) => s.isActive)
    } else if (filters.status === "inactive") {
      result = result.filter((s) => !s.isActive)
    }
    if (filters.sort === "name-desc") {
      result.sort((a, b) => b.name.localeCompare(a.name))
    } else {
      result.sort((a, b) => a.name.localeCompare(b.name))
    }
    return result
  }, [suppliers, filters])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Suppliers"
        description="Manage your supplier directory"
        action={{
          label: "New Supplier",
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
        ]}
      />

      {isLoading ? (
        <TableSkeleton rows={6} columns={5} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Users className="h-12 w-12" />}
          title="No suppliers"
          description="Add your first supplier to start creating purchase orders."
        />
      ) : (
        <div className="rounded-lg border bg-card">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">Name</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">Contact</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">Payment Terms</th>
                <th className="py-3 px-4 text-center text-xs font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((supplier) => (
                <tr
                  key={supplier.id}
                  className="border-b hover:bg-muted/50 cursor-pointer"
                  onClick={() => router.push(`/dashboard/ap/suppliers/${supplier.id}`)}
                >
                  <td className="py-3 px-4 text-sm font-medium">{supplier.name}</td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">{supplier.contactEmail || "—"}</td>
                  <td className="py-3 px-4 text-sm">{supplier.paymentTerms}</td>
                  <td className="py-3 px-4 text-center">
                    <Badge variant={supplier.isActive ? "success" : "secondary"}>
                      {supplier.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CreateSupplierDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
