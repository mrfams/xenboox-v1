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

export default function ItemDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: item, isLoading } = trpc.inventory.getItemById.useQuery(
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

  if (!item) {
    return <div className="text-muted-foreground">Item not found</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/inventory")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{item.name}</h1>
          <p className="text-muted-foreground">{item.sku} · {item.category}</p>
        </div>
        <Badge
          variant={
            item.status === "active"
              ? "success"
              : item.status === "discontinued"
                ? "destructive"
                : "secondary"
          }
          className="ml-auto capitalize"
        >
          {item.status}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="SKU" value={item.sku} />
            <InfoRow label="Category" value={item.category} />
            <InfoRow label="Unit of Measure" value={item.unitOfMeasure} />
            <InfoRow label="Description" value={item.description ?? "—"} />
            <InfoRow label="Warehouse" value={item.warehouseName ?? "—"} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stock & Costing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="Quantity On Hand" value={String(item.quantityOnHand)} />
            <InfoRow label="Reorder Level" value={String(item.reorderLevel)} />
            <InfoRow
              label="Reorder Status"
              value={item.quantityOnHand <= item.reorderLevel ? "Below Reorder Level" : "OK"}
            />
            <InfoRow label="Standard Cost" value={formatCurrency(item.standardCost)} />
            <InfoRow label="Total Value" value={formatCurrency(item.standardCost * item.quantityOnHand)} />
          </CardContent>
        </Card>
      </div>

      {item.recentTransactions && item.recentTransactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Unit Cost</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {item.recentTransactions.map((txn: Record<string, unknown>) => (
                  <TableRow key={txn.id as string}>
                    <TableCell>{formatDate(txn.date as string)}</TableCell>
                    <TableCell>
                      <Badge variant={txn.type === "in" ? "success" : "warning"} className="capitalize">
                        {txn.type === "in" ? "Received" : "Issued"}
                      </Badge>
                    </TableCell>
                    <TableCell>{txn.quantity as number}</TableCell>
                    <TableCell>{formatCurrency(txn.unitCost as number)}</TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency((txn.quantity as number) * (txn.unitCost as number))}
                    </TableCell>
                    <TableCell>{txn.reference as string}</TableCell>
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
