"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { trpc } from "@/lib/trpc/client"
import { PageHeader } from "@/components/shared/page-header"
import { AccountPicker } from "@/components/dashboard/account-picker"
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle, Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui"
import { ArrowLeft, Save, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

type LineInput = {
  accountId: string | null
  description: string
  debit: string
  credit: string
}

export default function NewJournalEntryPage() {
  const router = useRouter()
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split("T")[0])
  const [description, setDescription] = useState("")
  const [reference, setReference] = useState("")
  const [periodId, setPeriodId] = useState("")
  const [lines, setLines] = useState<LineInput[]>([
    { accountId: null, description: "", debit: "", credit: "" },
    { accountId: null, description: "", debit: "", credit: "" },
  ])

  const { data: periods } = trpc.fiscal.list.useQuery({})

  const createEntry = trpc.journal.create.useMutation({
    onSuccess: () => {
      toast.success("Journal entry created")
      router.push("/dashboard/journal")
    },
    onError: (err) => {
      toast.error(err.message)
    },
  })

  const totalDebit = lines.reduce((sum, l) => sum + (parseFloat(l.debit) || 0), 0)
  const totalCredit = lines.reduce((sum, l) => sum + (parseFloat(l.credit) || 0), 0)
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0

  function updateLine(index: number, field: keyof LineInput, value: string | null) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, [field]: value } : l)))
  }

  function addLine() {
    setLines((prev) => [...prev, { accountId: null, description: "", debit: "", credit: "" }])
  }

  function removeLine(index: number) {
    if (lines.length <= 2) return
    setLines((prev) => prev.filter((_, i) => i !== index))
  }

  function handleSubmit() {
    if (!periodId) {
      toast.error("Please select a fiscal period")
      return
    }

    const validLines = lines.filter((l) => l.accountId)
    if (validLines.length < 2) {
      toast.error("At least two lines are required")
      return
    }

    if (!description.trim()) {
      toast.error("Description is required")
      return
    }

    createEntry.mutate({
      date: entryDate,
      periodId,
      description,
      reference: reference || undefined,
      lines: validLines.map((l) => ({
        accountId: l.accountId!,
        description: l.description,
        debit: l.debit || "0",
        credit: l.credit || "0",
      })),
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Journal Entry"
        description="Record a double-entry accounting transaction"
        action={{ label: "Back to Journal", href: "/dashboard/journal" }}
      />

      <Card>
        <CardHeader>
          <CardTitle>Entry Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="entryDate">Date</Label>
              <Input id="entryDate" type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Period</Label>
              <Select value={periodId} onValueChange={setPeriodId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  {periods?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.year}-{String(p.month).padStart(2, "0")} ({p.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reference">Reference</Label>
              <Input id="reference" placeholder="e.g. JE-001" value={reference} onChange={(e) => setReference(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input id="description" placeholder="Transaction description" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Lines</Label>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="py-2 px-3 text-left text-xs font-medium text-muted-foreground">Account</th>
                    <th className="py-2 px-3 text-left text-xs font-medium text-muted-foreground">Description</th>
                    <th className="py-2 px-3 text-right text-xs font-medium text-muted-foreground">Debit</th>
                    <th className="py-2 px-3 text-right text-xs font-medium text-muted-foreground">Credit</th>
                    <th className="py-2 px-3 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-1 px-3">
                        <AccountPicker
                          value={line.accountId}
                          onChange={(v) => updateLine(i, "accountId", v)}
                        />
                      </td>
                      <td className="py-1 px-3">
                        <Input placeholder="Description" value={line.description} onChange={(e) => updateLine(i, "description", e.target.value)} className="h-8 text-xs" />
                      </td>
                      <td className="py-1 px-3">
                        <Input type="number" placeholder="0.00" value={line.debit} onChange={(e) => updateLine(i, "debit", e.target.value)} className="h-8 text-xs text-right" />
                      </td>
                      <td className="py-1 px-3">
                        <Input type="number" placeholder="0.00" value={line.credit} onChange={(e) => updateLine(i, "credit", e.target.value)} className="h-8 text-xs text-right" />
                      </td>
                      <td className="py-1 px-3">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeLine(i)} disabled={lines.length <= 2}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t bg-muted/30 font-medium">
                    <td colSpan={2} className="py-2 px-3 text-sm">Totals</td>
                    <td className="py-2 px-3 text-sm text-right font-mono">{totalDebit.toFixed(2)}</td>
                    <td className="py-2 px-3 text-sm text-right font-mono">{totalCredit.toFixed(2)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={addLine}>
                <Plus className="mr-1 h-3 w-3" /> Add Line
              </Button>
              {!isBalanced && totalDebit > 0 && (
                <p className="text-sm text-destructive">Debits must equal credits</p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => router.push("/dashboard/journal")}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!isBalanced || createEntry.isPending}>
              <Save className="mr-2 h-4 w-4" />
              {createEntry.isPending ? "Creating..." : "Create Entry"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
