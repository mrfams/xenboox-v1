import { useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@xenboox/ui"
import { Card, CardContent, CardHeader, CardTitle } from "@xenboox/ui"
import { Badge } from "@xenboox/ui"
import { Button } from "@xenboox/ui"
import { trpc } from "@/lib/trpc"
import { formatCurrency } from "@/lib/utils"
import { Plus } from "lucide-react"
import { AddAssetDialog } from "@/components/modals/add-asset"

function statusBadge(status: string) {
  const variant =
    status === "active"
      ? "success"
      : status === "disposed"
        ? "destructive"
        : status === "under-maintenance"
          ? "warning"
          : "secondary"
  return (
    <Badge variant={variant} className="capitalize">
      {status}
    </Badge>
  )
}

export default function AssetList() {
  const navigate = useNavigate()
  const [showAdd, setShowAdd] = useState(false)
  const { data, isLoading } = trpc.fixedAssets.listAssets.useQuery()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Fixed Assets</h1>
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Asset
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Assets</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Asset Class</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Accum. Depr.</TableHead>
                  <TableHead>NBV</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.map((asset: any) => (
                  <TableRow
                    key={asset.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/fixed-assets/${asset.id}`)}
                  >
                    <TableCell className="font-medium">{asset.name}</TableCell>
                    <TableCell>{asset.assetClass}</TableCell>
                    <TableCell>{asset.location}</TableCell>
                    <TableCell>{formatCurrency(asset.cost)}</TableCell>
                    <TableCell>{formatCurrency(asset.accumulatedDepreciation)}</TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(asset.netBookValue)}
                    </TableCell>
                    <TableCell>{statusBadge(asset.status)}</TableCell>
                  </TableRow>
                ))}
                {data && data.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No assets found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AddAssetDialog open={showAdd} onClose={() => setShowAdd(false)} onSuccess={() => setShowAdd(false)} />
    </div>
  )
}
