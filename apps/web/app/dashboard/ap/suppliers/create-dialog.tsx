"use client"

import { useState } from "react"
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
} from "@/components/ui"
import { toast } from "sonner"

type CreateSupplierDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const paymentTermOptions = [
  { value: "net15", label: "Net 15" },
  { value: "net30", label: "Net 30" },
  { value: "net60", label: "Net 60" },
  { value: "net90", label: "Net 90" },
]

export function CreateSupplierDialog({
  open,
  onOpenChange,
}: CreateSupplierDialogProps) {
  const utils = trpc.useUtils()

  const [name, setName] = useState("")
  const [contactEmail, setContactEmail] = useState("")
  const [contactPhone, setContactPhone] = useState("")
  const [taxId, setTaxId] = useState("")
  const [address, setAddress] = useState("")
  const [paymentTerms, setPaymentTerms] = useState("net30")

  const createSupplier = trpc.ap.createSupplier.useMutation({
    onSuccess: () => {
      toast.success("Supplier created")
      utils.ap.listSuppliers.invalidate()
      onOpenChange(false)
      resetForm()
    },
    onError: (err) => toast.error(err.message),
  })

  function resetForm() {
    setName("")
    setContactEmail("")
    setContactPhone("")
    setTaxId("")
    setAddress("")
    setPaymentTerms("net30")
  }

  function handleSubmit() {
    if (!name.trim()) {
      toast.error("Supplier name is required")
      return
    }

    createSupplier.mutate({
      name: name.trim(),
      contactEmail: contactEmail.trim() || undefined,
      contactPhone: contactPhone.trim() || undefined,
      taxId: taxId.trim() || undefined,
      address: address.trim() || undefined,
      paymentTerms: paymentTerms as "net15" | "net30" | "net60" | "net90",
    })
  }

  return (
    <CreateDialog
      open={open}
      onOpenChange={(o) => {
        if (!o) resetForm()
        onOpenChange(o)
      }}
      title="New Supplier"
      description="Add a supplier to your accounts payable directory."
      onSubmit={handleSubmit}
      isLoading={createSupplier.isPending}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="supplierName">Name</Label>
          <Input
            id="supplierName"
            placeholder="e.g. ABC Trading Co."
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="contactEmail">Contact Email</Label>
            <Input
              id="contactEmail"
              type="email"
              placeholder="e.g. billing@abc.com"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contactPhone">Contact Phone</Label>
            <Input
              id="contactPhone"
              placeholder="e.g. +220 123 4567"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="taxId">Tax ID</Label>
          <Input
            id="taxId"
            placeholder="Optional tax identification number"
            value={taxId}
            onChange={(e) => setTaxId(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">Address</Label>
          <Textarea
            id="address"
            placeholder="Full address"
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
      </div>
    </CreateDialog>
  )
}
