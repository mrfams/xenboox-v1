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

type CreatePaymentDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoiceId: string
  balance: number
}

const paymentMethods = [
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "cash", label: "Cash" },
  { value: "mobile_money", label: "Mobile Money" },
  { value: "check", label: "Check" },
  { value: "card", label: "Card" },
]

export function CreatePaymentDialog({
  open,
  onOpenChange,
  invoiceId,
  balance,
}: CreatePaymentDialogProps) {
  const utils = trpc.useUtils()

  const [amount, setAmount] = useState("")
  const [paymentDate, setPaymentDate] = useState("")
  const [method, setMethod] = useState("bank_transfer")
  const [reference, setReference] = useState("")
  const [notes, setNotes] = useState("")

  const createPayment = trpc.ap.createPayment.useMutation({
    onSuccess: () => {
      toast.success("Payment recorded")
      utils.ap.listPayments.invalidate()
      utils.ap.getInvoiceById.invalidate({ id: invoiceId })
      utils.ap.listInvoices.invalidate()
      onOpenChange(false)
      resetForm()
    },
    onError: (err) => toast.error(err.message),
  })

  function resetForm() {
    setAmount("")
    setPaymentDate("")
    setMethod("bank_transfer")
    setReference("")
    setNotes("")
  }

  function handleSubmit() {
    if (!amount || Number(amount) <= 0) {
      toast.error("Amount must be greater than zero")
      return
    }
    if (Number(amount) > balance) {
      toast.error(`Amount cannot exceed the outstanding balance of ${balance.toLocaleString("en-GM", { style: "currency", currency: "GMD" })}`)
      return
    }
    if (!paymentDate) {
      toast.error("Payment date is required")
      return
    }

    createPayment.mutate({
      invoiceApId: invoiceId,
      amount,
      paymentDate,
      method: method as "bank_transfer" | "cash" | "mobile_money" | "check" | "card",
      reference: reference.trim() || undefined,
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
      title="Record Payment"
      description={`Outstanding balance: ${balance.toLocaleString("en-GM", { style: "currency", currency: "GMD" })}`}
      onSubmit={handleSubmit}
      isLoading={createPayment.isPending}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="payAmount">Amount (GMD)</Label>
          <Input
            id="payAmount"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="payDate">Payment Date</Label>
          <Input
            id="payDate"
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Payment Method</Label>
          <Select value={method} onValueChange={setMethod}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {paymentMethods.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="payRef">Reference</Label>
          <Input
            id="payRef"
            placeholder="e.g. Transaction ID, check number"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="payNotes">Notes</Label>
          <Textarea
            id="payNotes"
            placeholder="Optional notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
        </div>
      </div>
    </CreateDialog>
  )
}
