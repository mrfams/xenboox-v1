"use client"

import { useState } from "react"
import { trpc } from "@/lib/trpc/client"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { TableSkeleton } from "@/components/shared/loading"
import { Badge } from "@/components/ui"
import { Warehouse, Plus } from "lucide-react"
import { CreateWarehouseDialog } from "../create-warehouse-dialog"
import { statusBadgeClass } from "@/lib/badge-variants"

export default function WarehousesPage() {
  const { data: warehouses, isLoading } = trpc.inventory.listWarehouses.useQuery()
  const [whOpen, setWhOpen] = useState(false)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Warehouses"
        description="Manage warehouse locations and assignments"
      />

      {isLoading ? (
        <TableSkeleton rows={4} columns={4} />
      ) : !warehouses || warehouses.length === 0 ? (
        <EmptyState
          icon={<Warehouse className="h-12 w-12" />}
          title="No warehouses"
          description="Add your first warehouse to start managing locations."
        />
      ) : (
        <div className="rounded-lg border bg-card">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">Name</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">Location</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">Manager</th>
                <th className="py-3 px-4 text-center text-xs font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {warehouses.map((wh) => (
                <tr key={wh.id} className="border-b hover:bg-muted/50">
                  <td className="py-3 px-4 text-sm font-medium">{wh.name}</td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">{wh.location ?? "—"}</td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">{wh.managerName ?? "—"}</td>
                  <td className="py-3 px-4 text-center">
                    <Badge
                      variant="secondary"
                      className={statusBadgeClass(wh.isActive ? "active" : "inactive")}
                    >
                      {wh.isActive ? "active" : "inactive"}
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
          onClick={() => setWhOpen(true)}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New Warehouse
        </button>
      </div>

      <CreateWarehouseDialog open={whOpen} onOpenChange={setWhOpen} />
    </div>
  )
}
