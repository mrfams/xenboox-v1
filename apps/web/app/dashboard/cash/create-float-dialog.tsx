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

type CreateImprestFloatDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateImprestFloatDialog({
  open,
  onOpenChange,
}: CreateImprestFloatDialogProps) {
  const utils = trpc.useUtils()

  const { data: cashAccounts } = trpc.cash.listCashAccounts.useQuery()

  const [cashAccountId, setCashAccountId] = useState("")
  const [assigneeName, setAssigneeName] = useState("")
  const [purpose, setPurpose] = useState("")
  const [amount, setAmount] = useState("")
  const [issuedDate, setIssuedDate] = useState("")
  const [settleByDate, setSettleByDate] = useState("")

  const createFloat = trpc.cash.createImprestFloat.useMutation({
    onSuccess: () => {
      toast.success("Imprest float created")
      utils.cash.listImprestFloats.invalidate()
      onOpenChange(false)
      resetForm()
    },
    onError: (err) => toast.error(err.message),
  })

  function resetForm() {
    setCashAccountId("")
    setAssigneeName("")
    setPurpose("")
    setAmount("")
    setIssuedDate("")
    setSettleByDate("")
  }

  function handleSubmit() {
    if (!cashAccountId) {
      toast.error("Cash account is required")
      return
    }
    if (!assigneeName.trim()) {
      toast.error("Assignee name is required")
      return
    }
    if (!amount || Number(amount) <= 0) {
      toast.error("Amount must be greater than zero")
      return
    }
    if (!issuedDate) {
      toast.error("Issued date is required")
      return
    }

    createFloat.mutate({
      cashAccountId,
      assigneeName: assigneeName.trim(),
      purpose: purpose.trim() || undefined,
      amount: amount,
      issuedDate,
      settleByDate: settleByDate || undefined,
    })
  }

  return (
    <CreateDialog
      open={open}
      onOpenChange={(o) => {
        if (!o) resetForm()
        onOpenChange(o)
      }}
      title="New Imprest Float"
      description="Issue an imprest advance to an assignee."
      onSubmit={handleSubmit}
      isLoading={createFloat.isPending}
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
          <Label htmlFor="assignee">Assignee Name</Label>
          <Input
            id="assignee"
            placeholder="e.g. John Doe"
            value={assigneeName}
            onChange={(e) => setAssigneeName(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="purpose">Purpose</Label>
          <Textarea
            id="purpose"
            placeholder="Optional purpose for the float"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="amount">Amount (GMD)</Label>
          <Input
            id="amount"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="issuedDate">Issued Date</Label>
            <Input
              id="issuedDate"
              type="date"
              value={issuedDate}
              onChange={(e) => setIssuedDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="settleBy">Settle By Date</Label>
            <Input
              id="settleBy"
              type="date"
              value={settleByDate}
              onChange={(e) => setSettleByDate(e.target.value)}
            />
          </div>
        </div>
      </div>
    </CreateDialog>
  )
}
