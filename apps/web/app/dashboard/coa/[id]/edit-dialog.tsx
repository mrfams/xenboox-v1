"use client"

import { useEffect, useState } from "react"
import { trpc } from "@/lib/trpc/client"
import { AccountPicker } from "@/components/dashboard/account-picker"
import { CreateDialog } from "@/components/dashboard/create-dialog"
import {
  Input,
  Label,
} from "@/components/ui"
import { toast } from "sonner"

type Account = {
  id: string
  code: string
  name: string
  type: string
  subtype: string
  description: string | null
  parentId: string | null
  isActive: boolean
}

type EditAccountDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  account: Account
}

export function EditAccountDialog({ open, onOpenChange, account }: EditAccountDialogProps) {
  const utils = trpc.useUtils()
  const [name, setName] = useState(account.name)
  const [description, setDescription] = useState(account.description ?? "")
  const [parentId, setParentId] = useState<string | null>(account.parentId)

  useEffect(() => {
    if (open) {
      setName(account.name)
      setDescription(account.description ?? "")
      setParentId(account.parentId)
    }
  }, [open, account])

  const updateAccount = trpc.coa.update.useMutation({
    onSuccess: () => {
      toast.success("Account updated")
      utils.coa.getById.invalidate({ id: account.id })
      utils.coa.listHierarchy.invalidate()
      onOpenChange(false)
    },
    onError: (err) => toast.error(err.message),
  })

  function handleSubmit() {
    if (!name.trim()) {
      toast.error("Name is required")
      return
    }
    updateAccount.mutate({
      id: account.id,
      name: name.trim(),
      description: description.trim() || undefined,
      parentId: parentId || undefined,
    })
  }

  return (
    <CreateDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Edit Account"
      description={`Editing ${account.code} — ${account.name}`}
      onSubmit={handleSubmit}
      isLoading={updateAccount.isPending}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="edit-name">Name</Label>
          <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-description">Description</Label>
          <Input
            id="edit-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description"
          />
        </div>
        <div className="space-y-2">
          <Label>Parent Account</Label>
          <AccountPicker value={parentId} onChange={setParentId} />
        </div>
      </div>
    </CreateDialog>
  )
}
