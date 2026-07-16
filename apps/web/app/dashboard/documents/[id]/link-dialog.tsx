"use client"

import { useState } from "react"
import { trpc } from "@/lib/trpc/client"
import { CreateDialog } from "@/components/dashboard/create-dialog"
import { Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui"
import { toast } from "sonner"

type LinkEntityDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  documentId: string
}

const entityTypeOptions = [
  { value: "invoice", label: "Invoice" },
  { value: "journal_entry", label: "Journal Entry" },
  { value: "supplier", label: "Supplier" },
  { value: "customer", label: "Customer" },
  { value: "po", label: "Purchase Order" },
]

export function LinkEntityDialog({
  open,
  onOpenChange,
  documentId,
}: LinkEntityDialogProps) {
  const utils = trpc.useUtils()

  const [entityType, setEntityType] = useState("invoice")
  const [entityId, setEntityId] = useState("")

  const createLink = trpc.document.createDocumentLink.useMutation({
    onSuccess: () => {
      toast.success("Entity linked")
      utils.document.getDocumentById.invalidate({ id: documentId })
      onOpenChange(false)
      resetForm()
    },
    onError: (err) => toast.error(err.message),
  })

  function resetForm() {
    setEntityType("invoice")
    setEntityId("")
  }

  function handleSubmit() {
    if (!entityId.trim()) {
      toast.error("Entity ID is required")
      return
    }

    try {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(entityId.trim())) {
        toast.error("Please enter a valid UUID")
        return
      }
    } catch {
      // continue
    }

    createLink.mutate({
      documentId,
      entityType,
      entityId: entityId.trim(),
    })
  }

  return (
    <CreateDialog
      open={open}
      onOpenChange={(o) => {
        if (!o) resetForm()
        onOpenChange(o)
      }}
      title="Link to Entity"
      description="Link this document to an existing entity in the system."
      onSubmit={handleSubmit}
      isLoading={createLink.isPending}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Entity Type</Label>
          <Select value={entityType} onValueChange={setEntityType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {entityTypeOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="entityId">Entity ID</Label>
          <Input
            id="entityId"
            placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
            value={entityId}
            onChange={(e) => setEntityId(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Enter the UUID of the {entityTypeOptions.find((o) => o.value === entityType)?.label.toLowerCase() ?? "entity"} to link.
          </p>
        </div>
      </div>
    </CreateDialog>
  )
}
