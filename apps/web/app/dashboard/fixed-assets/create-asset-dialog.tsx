"use client"

import { useState } from "react"
import { trpc } from "@/lib/trpc/client"
import { CreateDialog } from "@/components/dashboard/create-dialog"
import { Input } from "@/components/ui"

type CreateAssetDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateAssetDialog({ open, onOpenChange }: CreateAssetDialogProps) {
  const utils = trpc.useUtils()
  const [form, setForm] = useState({
    name: "",
    description: "",
    assetClass: "",
    location: "",
    purchaseDate: new Date().toISOString().split("T")[0],
    cost: "",
    salvageValue: "0",
    usefulLifeMonths: "60",
    depreciationMethod: "straight_line" as "straight_line" | "reducing_balance" | "units_of_production",
    responsiblePerson: "",
  })

  const createAsset = trpc.fixedAssets.createAsset.useMutation({
    onSuccess: () => {
      utils.fixedAssets.listAssets.invalidate()
      onOpenChange(false)
      setForm({
        name: "", description: "", assetClass: "", location: "",
        purchaseDate: new Date().toISOString().split("T")[0],
        cost: "", salvageValue: "0", usefulLifeMonths: "60",
        depreciationMethod: "straight_line", responsiblePerson: "",
      })
    },
  })

  const handleSubmit = () => {
    createAsset.mutate({
      name: form.name,
      description: form.description || undefined,
      assetClass: form.assetClass,
      location: form.location || undefined,
      purchaseDate: form.purchaseDate,
      cost: form.cost,
      salvageValue: form.salvageValue,
      usefulLifeMonths: parseInt(form.usefulLifeMonths) || 60,
      depreciationMethod: form.depreciationMethod,
      responsiblePerson: form.responsiblePerson || undefined,
    })
  }

  const update = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }))

  return (
    <CreateDialog
      open={open}
      onOpenChange={onOpenChange}
      title="New Fixed Asset"
      description="Register a new fixed asset for depreciation tracking."
      onSubmit={handleSubmit}
      isLoading={createAsset.isPending}
    >
      <div className="grid gap-4 py-2">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Asset Name *</label>
          <Input placeholder="Company Vehicle" value={form.name} onChange={(e) => update("name", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Description</label>
          <Input placeholder="2024 Toyota Hilux" value={form.description} onChange={(e) => update("description", e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Asset Class *</label>
            <Input placeholder="Vehicles" value={form.assetClass} onChange={(e) => update("assetClass", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Location</label>
            <Input placeholder="Banjul Office" value={form.location} onChange={(e) => update("location", e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Purchase Date *</label>
            <Input type="date" value={form.purchaseDate} onChange={(e) => update("purchaseDate", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Depreciation Method</label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={form.depreciationMethod}
              onChange={(e) => update("depreciationMethod", e.target.value)}
            >
              <option value="straight_line">Straight Line</option>
              <option value="reducing_balance">Reducing Balance</option>
              <option value="units_of_production">Units of Production</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Cost (GMD) *</label>
            <Input type="number" placeholder="850000" value={form.cost} onChange={(e) => update("cost", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Salvage Value</label>
            <Input type="number" placeholder="0" value={form.salvageValue} onChange={(e) => update("salvageValue", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Useful Life (months)</label>
            <Input type="number" placeholder="60" value={form.usefulLifeMonths} onChange={(e) => update("usefulLifeMonths", e.target.value)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Responsible Person</label>
          <Input placeholder="Fleet Manager" value={form.responsiblePerson} onChange={(e) => update("responsiblePerson", e.target.value)} />
        </div>
      </div>
    </CreateDialog>
  )
}
