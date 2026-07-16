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

type CreateTransactionDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  bankAccountId: string
}

export function CreateTransactionDialog({
  open,
  onOpenChange,
  bankAccountId,
}: CreateTransactionDialogProps) {
  const utils = trpc.useUtils()

  const [type, setType] = useState("deposit")
  const [amount, setAmount] = useState("")
  const [description, setDescription] = useState("")
  const [transactionDate, setTransactionDate] = useState(() => {
    return new Date().toISOString().split("T")[0]
  })
  const [reference, setReference] = useState("")

  const createTx = trpc.treasury.createBankTransaction.useMutation({
    onSuccess: () => {
      toast.success("Transaction recorded")
      utils.treasury.listBankTransactions.invalidate({ bankAccountId })
      utils.treasury.getBankAccountById.invalidate({ id: bankAccountId })
      onOpenChange(false)
      resetForm()
    },
    onError: (err) => toast.error(err.message),
  })

  function resetForm() {
    setType("deposit")
    setAmount("")
    setDescription("")
    setTransactionDate(new Date().toISOString().split("T")[0])
    setReference("")
  }

  function handleSubmit() {
    if (!amount || Number(amount) <= 0) {
      toast.error("Amount must be greater than zero")
      return
    }
    if (!description.trim()) {
      toast.error("Description is required")
      return
    }
    if (!transactionDate) {
      toast.error("Transaction date is required")
      return
    }

    createTx.mutate({
      bankAccountId,
      type: type as "deposit" | "withdrawal" | "transfer" | "fee" | "interest",
      amount: amount,
      description: description.trim(),
      transactionDate,
      reference: reference.trim() || undefined,
    })
  }

  return (
    <CreateDialog
      open={open}
      onOpenChange={(o) => {
        if (!o) resetForm()
        onOpenChange(o)
      }}
      title="New Transaction"
      description="Record a new bank transaction."
      onSubmit={handleSubmit}
      isLoading={createTx.isPending}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="tx-type">Type</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger id="tx-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="deposit">Deposit</SelectItem>
              <SelectItem value="withdrawal">Withdrawal</SelectItem>
              <SelectItem value="transfer">Transfer</SelectItem>
              <SelectItem value="fee">Fee</SelectItem>
              <SelectItem value="interest">Interest</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="tx-amount">Amount</Label>
          <Input
            id="tx-amount"
            type="number"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tx-description">Description</Label>
          <Input
            id="tx-description"
            placeholder="e.g. Office rent payment"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tx-date">Transaction Date</Label>
          <Input
            id="tx-date"
            type="date"
            value={transactionDate}
            onChange={(e) => setTransactionDate(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tx-reference">Reference</Label>
          <Input
            id="tx-reference"
            placeholder="Optional reference number"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
          />
        </div>
      </div>
    </CreateDialog>
  )
}
