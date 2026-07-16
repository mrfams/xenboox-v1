"use client"

import { useState } from "react"
import { trpc } from "@/lib/trpc/client"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { TableSkeleton } from "@/components/shared/loading"
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog"
import { CreatePeriodDialog } from "./create-dialog"
import { Badge, Button } from "@/components/ui"
import { Landmark, Plus, Lock, Unlock } from "lucide-react"
import { formatDate } from "@/lib/utils"
import { statusBadgeClass } from "@/lib/badge-variants"
import { toast } from "sonner"

export default function FiscalPage() {
  const { data: periods, isLoading } = trpc.fiscal.list.useQuery({})
  const utils = trpc.useUtils()

  const [createOpen, setCreateOpen] = useState(false)
  const [confirmAction, setConfirmAction] = useState<{
    type: "close" | "lock"
    periodId: string
    label: string
  } | null>(null)

  const closePeriod = trpc.fiscal.closePeriod.useMutation({
    onSuccess: () => {
      toast.success("Period closed")
      utils.fiscal.list.invalidate({})
      setConfirmAction(null)
    },
    onError: (err) => toast.error(err.message),
  })

  const lockPeriod = trpc.fiscal.lockPeriod.useMutation({
    onSuccess: () => {
      toast.success("Period locked")
      utils.fiscal.list.invalidate({})
      setConfirmAction(null)
    },
    onError: (err) => toast.error(err.message),
  })

  function handleConfirm() {
    if (!confirmAction) return
    if (confirmAction.type === "close") {
      closePeriod.mutate({ periodId: confirmAction.periodId })
    } else {
      lockPeriod.mutate({ periodId: confirmAction.periodId })
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fiscal Periods"
        description="Manage accounting periods and year-end closing"
        action={{ label: "New Period", onClick: () => setCreateOpen(true), icon: <Plus className="mr-2 h-4 w-4" /> }}
      />

      {isLoading ? (
        <TableSkeleton rows={5} columns={5} />
      ) : !periods || periods.length === 0 ? (
        <EmptyState
          icon={<Landmark className="h-12 w-12" />}
          title="No fiscal periods"
          description="Create your first fiscal period to start accounting."
        />
      ) : (
        <div className="rounded-lg border bg-card">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">Period</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">Start Date</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">End Date</th>
                <th className="py-3 px-4 text-center text-xs font-medium text-muted-foreground">Status</th>
                <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {periods.map((period) => (
                <tr key={period.id} className="border-b hover:bg-muted/50">
                  <td className="py-3 px-4 text-sm font-medium">
                    {period.year}-{String(period.month).padStart(2, "0")}
                  </td>
                  <td className="py-3 px-4 text-sm">{formatDate(period.startDate)}</td>
                  <td className="py-3 px-4 text-sm">{formatDate(period.endDate)}</td>
                  <td className="py-3 px-4 text-center">
                    <Badge variant="secondary" className={statusBadgeClass(period.status)}>
                      {period.status}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-right">
                    {period.status === "open" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setConfirmAction({
                            type: "close",
                            periodId: period.id,
                            label: `${period.year}-${String(period.month).padStart(2, "0")}`,
                          })
                        }
                      >
                        <Lock className="mr-1 h-3 w-3" /> Close
                      </Button>
                    )}
                    {period.status === "closed" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setConfirmAction({
                            type: "lock",
                            periodId: period.id,
                            label: `${period.year}-${String(period.month).padStart(2, "0")}`,
                          })
                        }
                      >
                        <Unlock className="mr-1 h-3 w-3" /> Lock
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CreatePeriodDialog open={createOpen} onOpenChange={setCreateOpen} />

      <ConfirmDialog
        open={!!confirmAction}
        onOpenChange={(open) => !open && setConfirmAction(null)}
        title={confirmAction?.type === "close" ? "Close Period" : "Lock Period"}
        description={
          confirmAction?.type === "close"
            ? `Closing period ${confirmAction?.label} will generate a trial balance snapshot and prevent new entries.`
            : `Locking period ${confirmAction?.label} is permanent and cannot be undone.`
        }
        confirmText={confirmAction?.type === "close" ? "Close Period" : "Lock Period"}
        variant={confirmAction?.type === "lock" ? "destructive" : "default"}
        isLoading={closePeriod.isPending || lockPeriod.isPending}
        onConfirm={handleConfirm}
      />
    </div>
  )
}
