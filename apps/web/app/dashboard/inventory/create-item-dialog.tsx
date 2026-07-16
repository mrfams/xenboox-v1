"use client"

import { useState } from "react"
import { trpc } from "@/lib/trpc/client"
import { CreateDialog } from "@/components/dashboard/create-dialog"
import { Input } from "@/components/ui"

type CreateItemDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateItemDialog({ open, onOpenChange }: CreateItemDialogProps) {
  const utils = trpc.useUtils()
  const [form, setForm] = useState({
    name: "",
    sku: "",
    description: "",
    category: "",
    unitOfMeasure: "piece",
    costMethod: "weighted_average" as "fifo" | "lifo" | "weighted_average",
    standardCost: "0",
    reorderLevel: "0",
    reorderQuantity: "0",
  })

  const createItem = trpc.inventory.createItem.useMutation({
    onSuccess: () => {
      utils.inventory.listItems.invalidate()
      onOpenChange(false)
      setForm({
        name: "", sku: "", description: "", category: "",
        unitOfMeasure: "piece", costMethod: "weighted_average",
        standardCost: "0", reorderLevel: "0", reorderQuantity: "0",
      })
    },
  })

  const handleSubmit = () => {
    createItem.mutate({
      name: form.name,
      sku: form.sku,
      description: form.description || undefined,
      category: form.category || undefined,
      unitOfMeasure: form.unitOfMeasure,
      costMethod: form.costMethod,
      standardCost: form.standardCost,
      reorderLevel: parseInt(form.reorderLevel) || 0,
      reorderQuantity: parseInt(form.reorderQuantity) || 0,
    })
  }

  const update = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }))

  return (
    <CreateDialog
      open={open}
      onOpenChange={onOpenChange}
      title="New Inventory Item"
      description="Add a new item to your inventory."
      onSubmit={handleSubmit}
      isLoading={createItem.isPending}
    >
      <div className="grid gap-4 py-2">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Item Name *</label>
            <Input placeholder="Basmati Rice" value={form.name} onChange={(e) => update("name", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">SKU *</label>
            <Input placeholder="RICE-001" value={form.sku} onChange={(e) => update("sku", e.target.value)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Description</label>
          <Input placeholder="50kg bag" value={form.description} onChange={(e) => update("description", e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Category</label>
            <Input placeholder="Food & Beverage" value={form.category} onChange={(e) => update("category", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Unit of Measure</label>
            <Input placeholder="piece" value={form.unitOfMeasure} onChange={(e) => update("unitOfMeasure", e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Cost Method</label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={form.costMethod}
              onChange={(e) => update("costMethod", e.target.value)}
            >
              <option value="weighted_average">Weighted Average</option>
              <option value="fifo">FIFO</option>
              <option value="lifo">LIFO</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Standard Cost (GMD)</label>
            <Input type="number" placeholder="0" value={form.standardCost} onChange={(e) => update("standardCost", e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Reorder Level</label>
            <Input type="number" placeholder="0" value={form.reorderLevel} onChange={(e) => update("reorderLevel", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Reorder Quantity</label>
            <Input type="number" placeholder="0" value={form.reorderQuantity} onChange={(e) => update("reorderQuantity", e.target.value)} />
          </div>
        </div>
      </div>
    </CreateDialog>
  )
}
