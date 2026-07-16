"use client"

import { useState } from "react"
import { trpc } from "@/lib/trpc/client"
import { CreateDialog } from "@/components/dashboard/create-dialog"
import { Input, Label } from "@/components/ui"
import { toast } from "sonner"

type AddReceiptDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  floatId: string
}

export function AddReceiptDialog({
  open,
  onOpenChange,
  floatId,
}: AddReceiptDialogProps) {
  const utils = trpc.useUtils()

  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")
  const [receiptDate, setReceiptDate] = useState("")

  const addReceipt = trpc.cash.addImprestReceipt.useMutation({
    onSuccess: () => {
      toast.success("Receipt added")
      utils.cash.getImprestFloatById.invalidate({ id: floatId })
      onOpenChange(false)
      resetForm()
    },
    onError: (err) => toast.error(err.message),
  })

  function resetForm() {
    setDescription("")
    setAmount("")
    setReceiptDate("")
  }

  function handleSubmit() {
    if (!description.trim()) {
      toast.error("Description is required")
      return
    }
    if (!amount || Number(amount) <= 0) {
      toast.error("Amount must be greater than zero")
      return
    }
    if (!receiptDate) {
      toast.error("Receipt date is required")
      return
    }

    addReceipt.mutate({
      imprestFloatId: floatId,
      description: description.trim(),
      amount: amount,
      receiptDate,
    })
  }

  return (
    <CreateDialog
      open={open}
      onOpenChange={(o) => {
        if (!o) resetForm()
        onOpenChange(o)
      }}
      title="Add Receipt"
      description="Record a receipt against this imprest float."
      onSubmit={handleSubmit}
      isLoading={addReceipt.isPending}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="receiptDesc">Description</Label>
          <Input
            id="receiptDesc"
            placeholder="e.g. Transport fare"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="receiptAmount">Amount (GMD)</Label>
          <Input
            id="receiptAmount"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="receiptDate">Receipt Date</Label>
          <Input
            id="receiptDate"
            type="date"
            value={receiptDate}
            onChange={(e) => setReceiptDate(e.target.value)}
          />
        </div>
      </div>
    </CreateDialog>
  )
}
