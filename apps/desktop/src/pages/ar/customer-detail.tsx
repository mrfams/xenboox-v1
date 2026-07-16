import { useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@xenboox/ui"
import { Button } from "@xenboox/ui"
import { trpc } from "@/lib/trpc"
import { ArrowLeft } from "lucide-react"

function DetailRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value ?? "—"}</span>
    </div>
  )
}

export default function CustomerDetail() {
  const navigate = useNavigate()
  const id = window.location.pathname.split("/").pop() || ""
  const { data: customer, isLoading } = trpc.ar.getCustomerById.useQuery({ id })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="h-64 bg-muted rounded animate-pulse" />
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Customer Not Found</h1>
        <Button variant="outline" onClick={() => navigate("/ar/customers")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Customers
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate("/ar/customers")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">{customer.name}</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Contact Details</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailRow label="Email" value={customer.contactEmail} />
            <DetailRow label="Phone" value={customer.contactPhone} />
            <DetailRow label="Tax ID" value={customer.taxId} />
            <DetailRow label="Address" value={customer.address} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Credit Info</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailRow label="Payment Terms" value={customer.paymentTerms} />
            <DetailRow label="Credit Limit" value={customer.creditLimit} />
            <DetailRow label="Status" value={customer.isActive ? "Active" : "Inactive"} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}