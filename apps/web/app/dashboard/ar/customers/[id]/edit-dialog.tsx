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

type Customer = {
  id: string
  name: string
  contactEmail: string | null
  contactPhone: string | null
  taxId: string | null
  address: string | null
  paymentTerms: string | null
  creditLimit: string | null
  isActive: boolean
}

type EditCustomerDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  customer: Customer
}

const paymentTermOptions = [
  { value: "net15", label: "Net 15" },
  { value: "net30", label: "Net 30" },
  { value: "net60", label: "Net 60" },
  { value: "net90", label: "Net 90" },
]

export function EditCustomerDialog({
  open,
  onOpenChange,
  customer,
}: EditCustomerDialogProps) {
  const utils = trpc.useUtils()

  const [name, setName] = useState(customer.name)
  const [contactEmail, setContactEmail] = useState(customer.contactEmail ?? "")
  const [contactPhone, setContactPhone] = useState(customer.contactPhone ?? "")
  const [taxId, setTaxId] = useState(customer.taxId ?? "")
  const [address, setAddress] = useState(customer.address ?? "")
  const [paymentTerms, setPaymentTerms] = useState(customer.paymentTerms ?? "net30")
  const [creditLimit, setCreditLimit] = useState(customer.creditLimit ?? "")
  const [isActive, setIsActive] = useState(customer.isActive)

  useEffect(() => {
    if (open) {
      setName(customer.name)
      setContactEmail(customer.contactEmail ?? "")
      setContactPhone(customer.contactPhone ?? "")
      setTaxId(customer.taxId ?? "")
      setAddress(customer.address ?? "")
      setPaymentTerms(customer.paymentTerms ?? "net30")
      setCreditLimit(customer.creditLimit ?? "")
      setIsActive(customer.isActive)
    }
  }, [open, customer])

  const updateCustomer = trpc.ar.updateCustomer.useMutation({
    onSuccess: () => {
      toast.success("Customer updated")
      utils.ar.listCustomers.invalidate()
      utils.ar.getCustomerById.invalidate({ id: customer.id })
      onOpenChange(false)
    },
    onError: (err) => toast.error(err.message),
  })

  function handleSubmit() {
    if (!name.trim()) {
      toast.error("Customer name is required")
      return
    }

    updateCustomer.mutate({
      id: customer.id,
      name: name.trim(),
      contactEmail: contactEmail.trim() || undefined,
      contactPhone: contactPhone.trim() || undefined,
      taxId: taxId.trim() || undefined,
      address: address.trim() || undefined,
      paymentTerms,
      creditLimit: creditLimit || undefined,
      isActive,
    })
  }

  return (
    <CreateDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Edit Customer"
      description="Update customer details."
      onSubmit={handleSubmit}
      isLoading={updateCustomer.isPending}
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
            <Label htmlFor="editCreditLimit">Credit Limit (GMD)</Label>
            <Input
              id="editCreditLimit"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={creditLimit}
              onChange={(e) => setCreditLimit(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label>Active</Label>
            <p className="text-sm text-muted-foreground">Inactive customers cannot be selected for new invoices.</p>
          </div>
          <Switch checked={isActive} onCheckedChange={setIsActive} />
        </div>
      </div>
    </CreateDialog>
  )
}
