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
import { AddInventoryItemDialog } from "@/components/modals/add-inventory-item"

function statusBadge(status: string) {
  const variant =
    status === "active"
      ? "success"
      : status === "discontinued"
        ? "destructive"
        : "secondary"
  return (
    <Badge variant={variant} className="capitalize">
      {status}
    </Badge>
  )
}

export default function InventoryList() {
  const navigate = useNavigate()
  const [showAdd, setShowAdd] = useState(false)
  const { data, isLoading } = trpc.inventory.listItems.useQuery()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Item
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Items</CardTitle>
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
                  <TableHead>SKU</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Qty On Hand</TableHead>
                  <TableHead>Reorder Level</TableHead>
                  <TableHead>Standard Cost</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.map((item: any) => (
                  <TableRow
                    key={item.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/inventory/${item.id}`)}
                  >
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.sku}</TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell>
                      <span
                        className={
                          item.quantityOnHand <= item.reorderLevel
                            ? "text-destructive font-medium"
                            : ""
                        }
                      >
                        {item.quantityOnHand}
                      </span>
                    </TableCell>
                    <TableCell>{item.reorderLevel}</TableCell>
                    <TableCell>{formatCurrency(item.standardCost)}</TableCell>
                    <TableCell>{statusBadge(item.status)}</TableCell>
                  </TableRow>
                ))}
                {data && data.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No inventory items found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AddInventoryItemDialog open={showAdd} onClose={() => setShowAdd(false)} onSuccess={() => setShowAdd(false)} />
    </div>
  )
}
