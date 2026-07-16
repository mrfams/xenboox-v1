"use client"

import { useState } from "react"
import { trpc } from "@/lib/trpc/client"
import { CreateDialog } from "@/components/dashboard/create-dialog"
import {
  Input,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui"
import { toast } from "sonner"

const months = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
]

type CreatePeriodDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreatePeriodDialog({ open, onOpenChange }: CreatePeriodDialogProps) {
  const utils = trpc.useUtils()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  const createPeriod = trpc.fiscal.create.useMutation({
    onSuccess: () => {
      toast.success("Fiscal period created")
      utils.fiscal.list.invalidate({})
      onOpenChange(false)
    },
    onError: (err) => toast.error(err.message),
  })

  function handleSubmit() {
    if (!year || year < 2000 || year > 2100) {
      toast.error("Year must be between 2000 and 2100")
      return
    }
    createPeriod.mutate({ year, month })
  }

  return (
    <CreateDialog
      open={open}
      onOpenChange={onOpenChange}
      title="New Fiscal Period"
      description="Create a new accounting period"
      onSubmit={handleSubmit}
      isLoading={createPeriod.isPending}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="year">Year</Label>
          <Input
            id="year"
            type="number"
            min={2000}
            max={2100}
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          />
        </div>
        <div className="space-y-2">
          <Label>Month</Label>
          <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((m) => (
                <SelectItem key={m.value} value={String(m.value)}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </CreateDialog>
  )
}
