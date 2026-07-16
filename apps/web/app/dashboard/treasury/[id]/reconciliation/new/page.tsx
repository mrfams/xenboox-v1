"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { trpc } from "@/lib/trpc/client"
import { DetailShell } from "@/components/dashboard/detail-shell"
import { Button, Input, Label, Textarea } from "@/components/ui"
import { toast } from "sonner"

export default function NewReconciliationPage() {
  const params = useParams()
  const router = useRouter()
  const bankAccountId = params.id as string
  const utils = trpc.useUtils()

  const [statementDate, setStatementDate] = useState(() => {
    return new Date().toISOString().split("T")[0]
  })
  const [statementBalance, setStatementBalance] = useState("")
  const [bookBalance, setBookBalance] = useState("")
  const [notes, setNotes] = useState("")

  const createReconciliation = trpc.treasury.createReconciliation.useMutation({
    onSuccess: () => {
      toast.success("Reconciliation created")
      utils.treasury.listReconciliations.invalidate({ bankAccountId })
      router.push(`/dashboard/treasury/${bankAccountId}`)
    },
    onError: (err) => toast.error(err.message),
  })

  function handleSubmit() {
    if (!statementDate) {
      toast.error("Statement date is required")
      return
    }
    if (!statementBalance || Number(statementBalance) < 0) {
      toast.error("Statement balance is required")
      return
    }
    if (!bookBalance || Number(bookBalance) < 0) {
      toast.error("Book balance is required")
      return
    }

    createReconciliation.mutate({
      bankAccountId,
      statementDate,
      statementBalance: statementBalance,
      bookBalance: bookBalance,
      notes: notes.trim() || undefined,
    })
  }

  return (
    <DetailShell
      title="New Reconciliation"
      description="Create a new bank reconciliation statement."
      backHref={`/dashboard/treasury/${bankAccountId}`}
    >
      <div className="max-w-lg space-y-4">
        <div className="space-y-2">
          <Label htmlFor="statementDate">Statement Date</Label>
          <Input
            id="statementDate"
            type="date"
            value={statementDate}
            onChange={(e) => setStatementDate(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="statementBalance">Statement Balance</Label>
          <Input
            id="statementBalance"
            type="number"
            placeholder="0.00"
            value={statementBalance}
            onChange={(e) => setStatementBalance(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bookBalance">Book Balance</Label>
          <Input
            id="bookBalance"
            type="number"
            placeholder="0.00"
            value={bookBalance}
            onChange={(e) => setBookBalance(e.target.value)}
          />
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
        <div className="flex justify-end gap-3 pt-4">
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/treasury/${bankAccountId}`)}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={createReconciliation.isPending}>
            {createReconciliation.isPending ? "Creating..." : "Create Reconciliation"}
          </Button>
        </div>
      </div>
    </DetailShell>
  )
}
