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
} from "@/components/ui"
import { toast } from "sonner"

type CreatePettyCashDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const categories = [
  "Office Supplies",
  "Transport",
  "Meals & Entertainment",
  "Communications",
  "Utilities",
  "Maintenance",
  "Other",
]

export function CreatePettyCashDialog({
  open,
  onOpenChange,
}: CreatePettyCashDialogProps) {
  const utils = trpc.useUtils()

  const { data: cashAccounts } = trpc.cash.listCashAccounts.useQuery()

  const [cashAccountId, setCashAccountId] = useState("")
  const [transactionDate, setTransactionDate] = useState("")
  const [description, setDescription] = useState("")
  const [debit, setDebit] = useState("")
  const [credit, setCredit] = useState("")
  const [category, setCategory] = useState("")
  const [reference, setReference] = useState("")

  const createEntry = trpc.cash.createPettyCashEntry.useMutation({
    onSuccess: () => {
      toast.success("Petty cash entry created")
      utils.cash.listPettyCash.invalidate()
      onOpenChange(false)
      resetForm()
    },
    onError: (err) => toast.error(err.message),
  })

  function resetForm() {
    setCashAccountId("")
    setTransactionDate("")
    setDescription("")
    setDebit("")
    setCredit("")
    setCategory("")
    setReference("")
  }

  function handleSubmit() {
    if (!cashAccountId) {
      toast.error("Cash account is required")
      return
    }
    if (!transactionDate) {
      toast.error("Transaction date is required")
      return
    }
    if (!description.trim()) {
      toast.error("Description is required")
      return
    }
    if ((!debit || Number(debit) <= 0) && (!credit || Number(credit) <= 0)) {
      toast.error("Either debit or credit must be greater than zero")
      return
    }
    if (Number(debit) > 0 && Number(credit) > 0) {
      toast.error("Only one of debit or credit can be set")
      return
    }

    createEntry.mutate({
      cashAccountId,
      transactionDate,
      description: description.trim(),
      debit: debit || undefined,
      credit: credit || undefined,
      balance: "0",
      category: category || undefined,
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
      title="New Petty Cash Entry"
      description="Record a petty cash transaction."
      onSubmit={handleSubmit}
      isLoading={createEntry.isPending}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Cash Account</Label>
          <Select value={cashAccountId} onValueChange={setCashAccountId}>
            <SelectTrigger>
              <SelectValue placeholder="Select cash account" />
            </SelectTrigger>
            <SelectContent>
              {cashAccounts?.map((acct) => (
                <SelectItem key={acct.id} value={acct.id}>
                  {acct.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="transactionDate">Transaction Date</Label>
          <Input
            id="transactionDate"
            type="date"
            value={transactionDate}
            onChange={(e) => setTransactionDate(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            placeholder="e.g. Office supplies purchase"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="debit">Debit (GMD)</Label>
            <Input
              id="debit"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={debit}
              onChange={(e) => {
                setDebit(e.target.value)
                if (e.target.value) setCredit("")
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="credit">Credit (GMD)</Label>
            <Input
              id="credit"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={credit}
              onChange={(e) => {
                setCredit(e.target.value)
                if (e.target.value) setDebit("")
              }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="reference">Reference</Label>
            <Input
              id="reference"
              placeholder="Optional reference"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </div>
        </div>
      </div>
    </CreateDialog>
  )
}
