"use client"

import { useState } from "react"
import { trpc } from "@/lib/trpc/client"
import { CreateDialog } from "@/components/dashboard/create-dialog"
import { Input } from "@/components/ui"

type CreatePayrollRunDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreatePayrollRunDialog({ open, onOpenChange }: CreatePayrollRunDialogProps) {
  const utils = trpc.useUtils()
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7))
  const [notes, setNotes] = useState("")

  const createRun = trpc.payroll.createPayrollRun.useMutation({
    onSuccess: () => {
      utils.payroll.listPayrollRuns.invalidate()
      onOpenChange(false)
      setPeriod(new Date().toISOString().slice(0, 7))
      setNotes("")
    },
  })

  return (
    <CreateDialog
      open={open}
      onOpenChange={onOpenChange}
      title="New Payroll Run"
      description="Create a new payroll run for processing."
      onSubmit={() => createRun.mutate({ period, notes: notes || undefined })}
      isLoading={createRun.isPending}
    >
      <div className="grid gap-4 py-2">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Period (YYYY-MM) *</label>
          <Input
            placeholder="2026-07"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">Format: YYYY-MM (e.g. 2026-07)</p>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Notes</label>
          <Input placeholder="July 2026 payroll" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>
    </CreateDialog>
  )
}
