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

type CreateBankAccountDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateBankAccountDialog({
  open,
  onOpenChange,
}: CreateBankAccountDialogProps) {
  const utils = trpc.useUtils()

  const [name, setName] = useState("")
  const [bankName, setBankName] = useState("")
  const [accountNumber, setAccountNumber] = useState("")
  const [currency, setCurrency] = useState("GMD")
  const [openingBalance, setOpeningBalance] = useState("")
  const [type, setType] = useState("checking")
  const [notes, setNotes] = useState("")

  const createAccount = trpc.treasury.createBankAccount.useMutation({
    onSuccess: () => {
      toast.success("Bank account created")
      utils.treasury.listBankAccounts.invalidate()
      onOpenChange(false)
      resetForm()
    },
    onError: (err) => toast.error(err.message),
  })

  function resetForm() {
    setName("")
    setBankName("")
    setAccountNumber("")
    setCurrency("GMD")
    setOpeningBalance("")
    setType("checking")
    setNotes("")
  }

  function handleSubmit() {
    if (!name.trim()) {
      toast.error("Account name is required")
      return
    }
    if (!bankName.trim()) {
      toast.error("Bank name is required")
      return
    }
    if (!accountNumber.trim()) {
      toast.error("Account number is required")
      return
    }

    createAccount.mutate({
      name: name.trim(),
      bankName: bankName.trim(),
      accountNumber: accountNumber.trim(),
      currency,
      openingBalance: openingBalance || "0",
      type: type as "checking" | "savings" | "fixed_deposit",
      notes: notes.trim() || undefined,
    })
  }

  return (
    <CreateDialog
      open={open}
      onOpenChange={(o) => {
        if (!o) resetForm()
        onOpenChange(o)
      }}
      title="New Bank Account"
      description="Add a new bank account to track transactions and reconciliation."
      onSubmit={handleSubmit}
      isLoading={createAccount.isPending}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Account Name</Label>
          <Input
            id="name"
            placeholder="e.g. Operations Account"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bankName">Bank Name</Label>
          <Input
            id="bankName"
            placeholder="e.g. Trust Bank"
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="accountNumber">Account Number</Label>
          <Input
            id="accountNumber"
            placeholder="e.g. 1234567890"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger id="currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GMD">GMD</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="GBP">GBP</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="openingBalance">Opening Balance</Label>
            <Input
              id="openingBalance"
              type="number"
              placeholder="0.00"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="type">Account Type</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger id="type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="checking">Checking</SelectItem>
              <SelectItem value="savings">Savings</SelectItem>
              <SelectItem value="fixed_deposit">Fixed Deposit</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            placeholder="Optional notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>
      </div>
    </CreateDialog>
  )
}
