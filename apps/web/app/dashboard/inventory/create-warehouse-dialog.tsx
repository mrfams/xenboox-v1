"use client"

import { useState } from "react"
import { trpc } from "@/lib/trpc/client"
import { CreateDialog } from "@/components/dashboard/create-dialog"
import { Input } from "@/components/ui"

type CreateWarehouseDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateWarehouseDialog({ open, onOpenChange }: CreateWarehouseDialogProps) {
  const utils = trpc.useUtils()
  const [form, setForm] = useState({
    name: "",
    location: "",
    managerName: "",
  })

  const createWarehouse = trpc.inventory.createWarehouse.useMutation({
    onSuccess: () => {
      utils.inventory.listWarehouses.invalidate()
      onOpenChange(false)
      setForm({ name: "", location: "", managerName: "" })
    },
  })

  const handleSubmit = () => {
    createWarehouse.mutate({
      name: form.name,
      location: form.location || undefined,
      managerName: form.managerName || undefined,
    })
  }

  const update = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }))

  return (
    <CreateDialog
      open={open}
      onOpenChange={onOpenChange}
      title="New Warehouse"
      description="Add a new warehouse or storage location."
      onSubmit={handleSubmit}
      isLoading={createWarehouse.isPending}
    >
      <div className="grid gap-4 py-2">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Warehouse Name *</label>
          <Input placeholder="Main Warehouse" value={form.name} onChange={(e) => update("name", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Location</label>
          <Input placeholder="Serrekunda" value={form.location} onChange={(e) => update("location", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Manager Name</label>
          <Input placeholder="Omar Jallow" value={form.managerName} onChange={(e) => update("managerName", e.target.value)} />
        </div>
      </div>
    </CreateDialog>
  )
}
