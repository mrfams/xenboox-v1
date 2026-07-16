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

type CreateCustomerDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const paymentTermOptions = [
  { value: "net15", label: "Net 15" },
  { value: "net30", label: "Net 30" },
  { value: "net60", label: "Net 60" },
  { value: "net90", label: "Net 90" },
]

export function CreateCustomerDialog({
  open,
  onOpenChange,
}: CreateCustomerDialogProps) {
  const utils = trpc.useUtils()

  const [name, setName] = useState("")
  const [contactEmail, setContactEmail] = useState("")
  const [contactPhone, setContactPhone] = useState("")
  const [taxId, setTaxId] = useState("")
  const [address, setAddress] = useState("")
  const [paymentTerms, setPaymentTerms] = useState("net30")
  const [creditLimit, setCreditLimit] = useState("")

  const createCustomer = trpc.ar.createCustomer.useMutation({
    onSuccess: () => {
      toast.success("Customer created")
      utils.ar.listCustomers.invalidate()
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
    setCreditLimit("")
  }

  function handleSubmit() {
    if (!name.trim()) {
      toast.error("Customer name is required")
      return
    }

    createCustomer.mutate({
      name: name.trim(),
      contactEmail: contactEmail.trim() || undefined,
      contactPhone: contactPhone.trim() || undefined,
      taxId: taxId.trim() || undefined,
      address: address.trim() || undefined,
      paymentTerms,
      creditLimit: creditLimit || undefined,
    })
  }

  return (
    <CreateDialog
      open={open}
      onOpenChange={(o) => {
        if (!o) resetForm()
        onOpenChange(o)
      }}
      title="New Customer"
      description="Add a customer to your accounts receivable directory."
      onSubmit={handleSubmit}
      isLoading={createCustomer.isPending}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="customerName">Name</Label>
          <Input
            id="customerName"
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

        <div className="grid grid-cols-2 gap-4">
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
          <div className="space-y-2">
            <Label htmlFor="creditLimit">Credit Limit (GMD)</Label>
            <Input
              id="creditLimit"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={creditLimit}
              onChange={(e) => setCreditLimit(e.target.value)}
            />
          </div>
        </div>
      </div>
    </CreateDialog>
  )
}
