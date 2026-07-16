"use client"

import { useState, useEffect } from "react"
import { trpc } from "@/lib/trpc/client"
import { CreateDialog } from "@/components/dashboard/create-dialog"
import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  Switch,
} from "@/components/ui"
import { toast } from "sonner"

type Supplier = {
  id: string
  name: string
  contactEmail: string | null
  contactPhone: string | null
  taxId: string | null
  address: string | null
  paymentTerms: string | null
  isActive: boolean
}

type EditSupplierDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  supplier: Supplier
}

const paymentTermOptions = [
  { value: "net15", label: "Net 15" },
  { value: "net30", label: "Net 30" },
  { value: "net60", label: "Net 60" },
  { value: "net90", label: "Net 90" },
]

export function EditSupplierDialog({
  open,
  onOpenChange,
  supplier,
}: EditSupplierDialogProps) {
  const utils = trpc.useUtils()

  const [name, setName] = useState(supplier.name)
  const [contactEmail, setContactEmail] = useState(supplier.contactEmail ?? "")
  const [contactPhone, setContactPhone] = useState(supplier.contactPhone ?? "")
  const [taxId, setTaxId] = useState(supplier.taxId ?? "")
  const [address, setAddress] = useState(supplier.address ?? "")
  const [paymentTerms, setPaymentTerms] = useState(supplier.paymentTerms ?? "net30")
  const [isActive, setIsActive] = useState(supplier.isActive)

  useEffect(() => {
    if (open) {
      setName(supplier.name)
      setContactEmail(supplier.contactEmail ?? "")
      setContactPhone(supplier.contactPhone ?? "")
      setTaxId(supplier.taxId ?? "")
      setAddress(supplier.address ?? "")
      setPaymentTerms(supplier.paymentTerms ?? "net30")
      setIsActive(supplier.isActive)
    }
  }, [open, supplier])

  const updateSupplier = trpc.ap.updateSupplier.useMutation({
    onSuccess: () => {
      toast.success("Supplier updated")
      utils.ap.listSuppliers.invalidate()
      utils.ap.getSupplierById.invalidate({ id: supplier.id })
      onOpenChange(false)
    },
    onError: (err) => toast.error(err.message),
  })

  function handleSubmit() {
    if (!name.trim()) {
      toast.error("Supplier name is required")
      return
    }

    updateSupplier.mutate({
      id: supplier.id,
      name: name.trim(),
      contactEmail: contactEmail.trim() || undefined,
      contactPhone: contactPhone.trim() || undefined,
      taxId: taxId.trim() || undefined,
      address: address.trim() || undefined,
      paymentTerms: paymentTerms as "net15" | "net30" | "net60" | "net90",
      isActive,
    })
  }

  return (
    <CreateDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Edit Supplier"
      description="Update supplier details."
      onSubmit={handleSubmit}
      isLoading={updateSupplier.isPending}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="editName">Name</Label>
          <Input
            id="editName"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="editEmail">Contact Email</Label>
            <Input
              id="editEmail"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="editPhone">Contact Phone</Label>
            <Input
              id="editPhone"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="editTaxId">Tax ID</Label>
          <Input
            id="editTaxId"
            value={taxId}
            onChange={(e) => setTaxId(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="editAddress">Address</Label>
          <Textarea
            id="editAddress"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label>Payment Terms</Label>
          <Select value={paymentTerms} onValueChange={setPaymentTerms}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {paymentTermOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label>Active</Label>
            <p className="text-sm text-muted-foreground">Inactive suppliers cannot be selected for new transactions.</p>
          </div>
          <Switch checked={isActive} onCheckedChange={setIsActive} />
        </div>
      </div>
    </CreateDialog>
  )
}
