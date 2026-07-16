"use client"

import { useState } from "react"
import { trpc } from "@/lib/trpc/client"
import { AccountPicker } from "@/components/dashboard/account-picker"
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
  Button,
} from "@/components/ui"
import { toast } from "sonner"
import { Plus, Trash2 } from "lucide-react"

type CreatePODialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type LineItem = {
  description: string
  accountId: string | null
  quantity: string
  unitPrice: string
}

export function CreatePODialog({ open, onOpenChange }: CreatePODialogProps) {
  const utils = trpc.useUtils()

  const { data: suppliers } = trpc.ap.listSuppliers.useQuery()

  const [supplierId, setSupplierId] = useState("")
  const [poNumber, setPoNumber] = useState("")
  const [orderDate, setOrderDate] = useState("")
  const [expectedDate, setExpectedDate] = useState("")
  const [currency, setCurrency] = useState("GMD")
  const [notes, setNotes] = useState("")
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: "", accountId: null, quantity: "", unitPrice: "" },
  ])

  const createPO = trpc.ap.createPO.useMutation({
    onSuccess: () => {
      toast.success("Purchase order created")
      utils.ap.listPOs.invalidate()
      onOpenChange(false)
      resetForm()
    },
    onError: (err) => toast.error(err.message),
  })

  function resetForm() {
    setSupplierId("")
    setPoNumber("")
    setOrderDate("")
    setExpectedDate("")
    setCurrency("GMD")
    setNotes("")
    setLineItems([{ description: "", accountId: null, quantity: "", unitPrice: "" }])
  }

  function addLineItem() {
    setLineItems((prev) => [
      ...prev,
      { description: "", accountId: null, quantity: "", unitPrice: "" },
    ])
  }

  function removeLineItem(index: number) {
    setLineItems((prev) => prev.filter((_, i) => i !== index))
  }

  function updateLineItem(index: number, field: keyof LineItem, value: string | null) {
    setLineItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    )
  }

  function handleSubmit() {
    if (!supplierId) {
      toast.error("Supplier is required")
      return
    }
    if (!poNumber.trim()) {
      toast.error("PO number is required")
      return
    }
    if (!orderDate) {
      toast.error("Order date is required")
      return
    }

    const validItems = lineItems.filter(
      (item) => item.description.trim() && item.quantity && item.unitPrice
    )
    if (validItems.length === 0) {
      toast.error("At least one line item with description, quantity, and price is required")
      return
    }

    createPO.mutate({
      supplierId,
      poNumber: poNumber.trim(),
      orderDate,
      expectedDate: expectedDate || undefined,
      currency,
      notes: notes.trim() || undefined,
      lines: validItems.map((item) => ({
        description: item.description.trim(),
        accountId: item.accountId!,
        quantity: Number(item.quantity),
        unitPrice: item.unitPrice,
      })),
    })
  }

  return (
    <CreateDialog
      open={open}
      onOpenChange={(o) => {
        if (!o) resetForm()
        onOpenChange(o)
      }}
      title="New Purchase Order"
      description="Create a purchase order for a supplier."
      onSubmit={handleSubmit}
      isLoading={createPO.isPending}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Supplier</Label>
          <Select value={supplierId} onValueChange={setSupplierId}>
            <SelectTrigger>
              <SelectValue placeholder="Select supplier" />
            </SelectTrigger>
            <SelectContent>
              {suppliers?.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="poNumber">PO Number</Label>
          <Input
            id="poNumber"
            placeholder="e.g. PO-2026-001"
            value={poNumber}
            onChange={(e) => setPoNumber(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="orderDate">Order Date</Label>
            <Input
              id="orderDate"
              type="date"
              value={orderDate}
              onChange={(e) => setOrderDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="expectedDate">Expected Date</Label>
            <Input
              id="expectedDate"
              type="date"
              value={expectedDate}
              onChange={(e) => setExpectedDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GMD">GMD</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="poNotes">Notes</Label>
          <Textarea
            id="poNotes"
            placeholder="Optional notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Line Items</Label>
            <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
              <Plus className="mr-1 h-3 w-3" />
              Add Line
            </Button>
          </div>

          {lineItems.map((item, idx) => (
            <div key={idx} className="grid grid-cols-[1fr_200px_80px_100px_32px] items-end gap-2 rounded-lg border p-3">
              <div className="space-y-1">
                <Label className="text-xs">Description</Label>
                <Input
                  placeholder="Item description"
                  value={item.description}
                  onChange={(e) => updateLineItem(idx, "description", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Account</Label>
                <AccountPicker
                  value={item.accountId}
                  onChange={(v) => updateLineItem(idx, "accountId", v)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Qty</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={item.quantity}
                  onChange={(e) => updateLineItem(idx, "quantity", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Unit Price</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={item.unitPrice}
                  onChange={(e) => updateLineItem(idx, "unitPrice", e.target.value)}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => removeLineItem(idx)}
                disabled={lineItems.length === 1}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </CreateDialog>
  )
}
