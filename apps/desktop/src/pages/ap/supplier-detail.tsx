import { Card, CardContent, CardHeader, CardTitle } from "@xenboox/ui"
import { Button } from "@xenboox/ui"
import { trpc } from "@/lib/trpc"
import { ArrowLeft } from "lucide-react"
import { useNavigate } from "react-router-dom"

function DetailRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value ?? "—"}</span>
    </div>
  )
}

export default function SupplierDetail() {
  const navigate = useNavigate()
  const id = window.location.pathname.split("/").pop() || ""
  const { data: supplier, isLoading } = trpc.ap.getSupplierById.useQuery({ id })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="h-64 bg-muted rounded animate-pulse" />
      </div>
    )
  }

  if (!supplier) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Supplier Not Found</h1>
        <Button variant="outline" onClick={() => navigate("/ap/suppliers")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Suppliers
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate("/ap/suppliers")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">{supplier.name}</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Contact Details</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailRow label="Email" value={supplier.contactEmail} />
            <DetailRow label="Phone" value={supplier.contactPhone} />
            <DetailRow label="Tax ID" value={supplier.taxId} />
            <DetailRow label="Address" value={supplier.address} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment Info</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailRow label="Payment Terms" value={supplier.paymentTerms} />
            <DetailRow label="Status" value={supplier.isActive ? "Active" : "Inactive"} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}