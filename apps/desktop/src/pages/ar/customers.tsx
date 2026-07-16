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
import { Plus } from "lucide-react"
import { AddCustomerDialog } from "@/components/modals/add-customer"

export default function CustomerList() {
  const navigate = useNavigate()
  const [showAdd, setShowAdd] = useState(false)
  const { data, isLoading } = trpc.ar.listCustomers.useQuery()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Customer
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Customers</CardTitle>
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
                  <TableHead>Email</TableHead>
                  <TableHead>Payment Terms</TableHead>
                  <TableHead>Credit Limit</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.map((customer: any) => (
                  <TableRow
                    key={customer.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/ar/customers/${customer.id}`)}
                  >
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell>{customer.contactEmail || "—"}</TableCell>
                    <TableCell>{customer.paymentTerms}</TableCell>
                    <TableCell>{customer.creditLimit || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={customer.isActive ? "success" : "secondary"}>
                        {customer.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {data && data.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No customers found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AddCustomerDialog open={showAdd} onClose={() => setShowAdd(false)} onSuccess={() => setShowAdd(false)} />
    </div>
  )
}