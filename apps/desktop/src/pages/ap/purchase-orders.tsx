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

function statusBadge(status: string) {
  const variant =
    status === "approved" ? "success" :
    status === "received" ? "success" :
    status === "cancelled" ? "destructive" :
    "secondary"
  return <Badge variant={variant} className="capitalize">{status}</Badge>
}

export default function PurchaseOrdersPage() {
  const { data, isLoading } = trpc.ap.listPOs.useQuery()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Purchase Orders</h1>
        <Button disabled>
          <Plus className="mr-2 h-4 w-4" />
          New PO
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Purchase Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO Number</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Order Date</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.map((po: any) => (
                  <TableRow key={po.id} className="cursor-pointer">
                    <TableCell className="font-medium">{po.poNumber}</TableCell>
                    <TableCell>{po.supplierId}</TableCell>
                    <TableCell>{po.orderDate}</TableCell>
                    <TableCell>{formatCurrency(po.totalAmount)}</TableCell>
                    <TableCell>{statusBadge(po.status)}</TableCell>
                  </TableRow>
                ))}
                {data && data.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No purchase orders found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}