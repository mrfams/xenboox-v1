"use client"

import { useEffect, useState } from "react"
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

type BankAccount = {
  id: string
  name: string
  bankName: string
  accountNumber: string
  currency: string
  type: string
  notes: string | null
  isActive: boolean
}

type EditBankAccountDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  account: BankAccount
}

export function EditBankAccountDialog({
  open,
  onOpenChange,
  account,
}: EditBankAccountDialogProps) {
  const utils = trpc.useUtils()

  const [name, setName] = useState(account.name)
  const [bankName, setBankName] = useState(account.bankName)
  const [accountNumber, setAccountNumber] = useState(account.accountNumber)
  const [currency, setCurrency] = useState(account.currency)
  const [type, setType] = useState(account.type)
  const [notes, setNotes] = useState(account.notes ?? "")
  const [isActive, setIsActive] = useState(account.isActive)

  useEffect(() => {
    if (open) {
      setName(account.name)
      setBankName(account.bankName)
      setAccountNumber(account.accountNumber)
      setCurrency(account.currency)
      setType(account.type)
      setNotes(account.notes ?? "")
      setIsActive(account.isActive)
    }
  }, [open, account])

  const updateAccount = trpc.treasury.updateBankAccount.useMutation({
    onSuccess: () => {
      toast.success("Bank account updated")
      utils.treasury.getBankAccountById.invalidate({ id: account.id })
      utils.treasury.listBankAccounts.invalidate()
      onOpenChange(false)
    },
    onError: (err) => toast.error(err.message),
  })

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

    updateAccount.mutate({
      id: account.id,
      name: name.trim(),
      bankName: bankName.trim(),
      accountNumber: accountNumber.trim(),
      currency,
      type: type as "checking" | "savings" | "fixed_deposit",
      notes: notes.trim() || undefined,
      isActive,
    })
  }

  return (
    <CreateDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Edit Bank Account"
      description={`Editing ${account.name}`}
      onSubmit={handleSubmit}
      isLoading={updateAccount.isPending}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="edit-name">Account Name</Label>
          <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-bankName">Bank Name</Label>
          <Input id="edit-bankName" value={bankName} onChange={(e) => setBankName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-accountNumber">Account Number</Label>
          <Input id="edit-accountNumber" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="edit-currency">Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger id="edit-currency">
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
            <Label htmlFor="edit-type">Account Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger id="edit-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="checking">Checking</SelectItem>
                <SelectItem value="savings">Savings</SelectItem>
                <SelectItem value="fixed_deposit">Fixed Deposit</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Label htmlFor="edit-isActive">Active</Label>
          <input
            id="edit-isActive"
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-notes">Notes</Label>
          <Textarea
            id="edit-notes"
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
