"use client"

import { useParams } from "next/navigation"
import { trpc } from "@/lib/trpc/client"
import { DetailShell } from "@/components/dashboard/detail-shell"
import { EmptyState } from "@/components/shared/empty-state"
import { TableSkeleton } from "@/components/shared/loading"
import { Badge } from "@/components/ui"
import { Landmark } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils"
import { statusBadgeClass } from "@/lib/badge-variants"

export default function FixedAssetDetailPage() {
  const params = useParams()
  const id = params.id as string

  const { data: asset, isLoading } = trpc.fixedAssets.getAssetById.useQuery({ id })

  if (isLoading) {
    return <TableSkeleton rows={3} columns={4} />
  }

  if (!asset) {
    return (
      <EmptyState
        icon={<Landmark className="h-12 w-12" />}
        title="Asset not found"
        description="The requested fixed asset does not exist."
      />
    )
  }

  const schedule = (asset as Record<string, unknown>).schedule as Array<{
    id: string
    period: string
    depreciationAmount: string
    accumulatedDepreciation: string
    netBookValue: string
  }> | undefined

  return (
    <DetailShell
      title={asset.name}
      description={asset.description ?? undefined}
      backHref="/dashboard/fixed-assets"
    >
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-4 rounded-lg border bg-card p-6">
          <h3 className="text-sm font-medium text-muted-foreground">Details</h3>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-muted-foreground">Asset Class</dt>
              <dd className="text-sm font-medium">{asset.assetClass ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-muted-foreground">Location</dt>
              <dd className="text-sm">{asset.location ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-muted-foreground">Purchase Date</dt>
              <dd className="text-sm">{formatDate(asset.purchaseDate)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-muted-foreground">Condition</dt>
              <dd className="text-sm">{asset.condition ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-muted-foreground">Responsible Person</dt>
              <dd className="text-sm">{asset.responsiblePerson ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-muted-foreground">Status</dt>
              <dd>
                <Badge variant="secondary" className={statusBadgeClass(asset.status)}>
                  {asset.status}
                </Badge>
              </dd>
            </div>
          </dl>
        </div>

        <div className="space-y-4 rounded-lg border bg-card p-6">
          <h3 className="text-sm font-medium text-muted-foreground">Financials</h3>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-muted-foreground">Cost</dt>
              <dd className="text-sm font-mono font-medium">{formatCurrency(Number(asset.cost))}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-muted-foreground">Salvage Value</dt>
              <dd className="text-sm font-mono font-medium">{formatCurrency(Number(asset.salvageValue ?? 0))}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-muted-foreground">Useful Life (months)</dt>
              <dd className="text-sm">{asset.usefulLifeMonths}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-muted-foreground">Depreciation Method</dt>
              <dd className="text-sm">{asset.depreciationMethod}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-muted-foreground">Accumulated Depreciation</dt>
              <dd className="text-sm font-mono font-medium">{formatCurrency(Number(asset.accumulatedDepreciation ?? 0))}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-muted-foreground">Net Book Value</dt>
              <dd className="text-sm font-mono font-medium">{formatCurrency(Number(asset.netBookValue ?? asset.cost))}</dd>
            </div>
          </dl>
        </div>
      </div>

      {schedule && schedule.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Depreciation Schedule</h3>
            <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">Period</th>
                  <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground">Depreciation</th>
                  <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground">Accum. Depreciation</th>
                  <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground">Net Book Value</th>
                </tr>
              </thead>
              <tbody>
                {schedule.map((row) => (
                  <tr key={row.id} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-4 text-sm">{row.period}</td>
                    <td className="py-3 px-4 text-sm text-right font-mono">
                      {formatCurrency(Number(row.depreciationAmount))}
                    </td>
                    <td className="py-3 px-4 text-sm text-right font-mono">
                      {formatCurrency(Number(row.accumulatedDepreciation))}
                    </td>
                    <td className="py-3 px-4 text-sm text-right font-mono">
                      {formatCurrency(Number(row.netBookValue))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </DetailShell>
  )
}
