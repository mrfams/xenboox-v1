import { useParams, useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@xenboox/ui"
import { Badge } from "@xenboox/ui"
import { Button } from "@xenboox/ui"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@xenboox/ui"
import { trpc } from "@/lib/trpc"
import { formatCurrency, formatDate } from "@/lib/utils"
import { ArrowLeft } from "lucide-react"

export default function AssetDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: asset, isLoading } = trpc.fixedAssets.getAssetById.useQuery(
    { id: id! },
    { enabled: !!id }
  )

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((j) => (
                    <div key={j} className="h-4 bg-muted rounded w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!asset) {
    return <div className="text-muted-foreground">Asset not found</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/fixed-assets")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{asset.name}</h1>
          <p className="text-muted-foreground">{asset.assetClass} · {asset.location}</p>
        </div>
        <Badge
          variant={
            asset.status === "active"
              ? "success"
              : asset.status === "disposed"
                ? "destructive"
                : "secondary"
          }
          className="ml-auto capitalize"
        >
          {asset.status}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="Asset Tag" value={asset.assetTag ?? "—"} />
            <InfoRow label="Serial Number" value={asset.serialNumber ?? "—"} />
            <InfoRow label="Purchase Date" value={asset.purchaseDate ? formatDate(asset.purchaseDate) : "—"} />
            <InfoRow label="Placed in Service" value={asset.placedInServiceDate ? formatDate(asset.placedInServiceDate) : "—"} />
            <InfoRow label="Useful Life" value={asset.usefulLifeYears ? `${asset.usefulLifeYears} years` : "—"} />
            <InfoRow label="Salvage Value" value={asset.salvageValue != null ? formatCurrency(asset.salvageValue) : "—"} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Financials</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="Cost" value={formatCurrency(asset.cost)} />
            <InfoRow label="Accumulated Depreciation" value={formatCurrency(asset.accumulatedDepreciation)} />
            <InfoRow label="Net Book Value" value={formatCurrency(asset.netBookValue)} />
            <InfoRow label="Depreciation Method" value={asset.depreciationMethod ?? "—"} />
            <InfoRow label="Annual Depreciation" value={asset.annualDepreciation != null ? formatCurrency(asset.annualDepreciation) : "—"} />
          </CardContent>
        </Card>
      </div>

      {asset.depreciationSchedule && asset.depreciationSchedule.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Depreciation Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Year</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Depreciation</TableHead>
                  <TableHead>Accumulated</TableHead>
                  <TableHead>Net Book Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {asset.depreciationSchedule.map((entry: Record<string, unknown>) => (
                  <TableRow key={entry.id as string}>
                    <TableCell>{entry.year as number}</TableCell>
                    <TableCell>{entry.period as string}</TableCell>
                    <TableCell>{formatCurrency(entry.depreciation as number)}</TableCell>
                    <TableCell>{formatCurrency(entry.accumulatedDepreciation as number)}</TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(entry.netBookValue as number)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b pb-2 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  )
}
