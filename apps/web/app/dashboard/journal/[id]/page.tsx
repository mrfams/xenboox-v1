"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { trpc } from "@/lib/trpc/client"
import { DetailShell } from "@/components/dashboard/detail-shell"
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog"
import { Badge, Button, Input, Label, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui"
import { TableSkeleton } from "@/components/shared/loading"
import { Send, RotateCcw } from "lucide-react"
import { formatDate, formatCurrency } from "@/lib/utils"
import { toast } from "sonner"
import { statusBadgeClass } from "@/lib/badge-variants"

export default function JournalDetailPage() {
  const params = useParams()
  const id = params.id as string

  const { data: entry, isLoading } = trpc.journal.getById.useQuery({ id })
  const utils = trpc.useUtils()

  const [postConfirmOpen, setPostConfirmOpen] = useState(false)
  const [reverseConfirmOpen, setReverseConfirmOpen] = useState(false)
  const [reverseReason, setReverseReason] = useState("")

  const postEntry = trpc.journal.post.useMutation({
    onSuccess: () => {
      toast.success("Journal entry posted")
      utils.journal.getById.invalidate({ id })
      setPostConfirmOpen(false)
    },
    onError: (err) => toast.error(err.message),
  })

  const reverseEntry = trpc.journal.reverse.useMutation({
    onSuccess: () => {
      toast.success("Journal entry reversed")
      utils.journal.getById.invalidate({ id })
      setReverseConfirmOpen(false)
      setReverseReason("")
    },
    onError: (err) => toast.error(err.message),
  })

  if (isLoading) {
    return (
      <DetailShell title="Journal Entry" backHref="/dashboard/journal">
        <TableSkeleton rows={4} columns={4} />
      </DetailShell>
    )
  }

  if (!entry) {
    return (
      <DetailShell title="Entry not found" backHref="/dashboard/journal">
        <p className="text-muted-foreground">The requested journal entry does not exist.</p>
      </DetailShell>
    )
  }

  const totalDebit = entry.lines.reduce((sum, l) => sum + Number(l.debit), 0)
  const totalCredit = entry.lines.reduce((sum, l) => sum + Number(l.credit), 0)
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01

  return (
    <DetailShell
      title={`Entry #${entry.entryNumber}`}
      description={entry.description}
      backHref="/dashboard/journal"
      actions={
        <>
          {entry.status === "draft" && (
            <Button size="sm" onClick={() => setPostConfirmOpen(true)}>
              <Send className="mr-2 h-4 w-4" /> Post Entry
            </Button>
          )}
          {entry.status === "posted" && (
            <Button size="sm" variant="destructive" onClick={() => setReverseConfirmOpen(true)}>
              <RotateCcw className="mr-2 h-4 w-4" /> Reverse Entry
            </Button>
          )}
        </>
      }
    >
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-lg border bg-card p-4 space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Details</h3>
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date</span>
              <span>{formatDate(entry.date)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Reference</span>
              <span className="font-mono">{entry.reference || `#${entry.entryNumber}`}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <Badge variant="secondary" className={statusBadgeClass(entry.status)}>
                {entry.status}
              </Badge>
            </div>
            {entry.postedAt && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Posted</span>
                <span>{formatDate(entry.postedAt)}</span>
              </div>
            )}
            {entry.reversedAt && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Reversed</span>
                <span>{formatDate(entry.reversedAt)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <div className="p-4">
          <h3 className="text-sm font-medium text-muted-foreground">Journal Lines</h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Account</TableHead>
              <TableHead className="text-right">Debit</TableHead>
              <TableHead className="text-right">Credit</TableHead>
              <TableHead>Description</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entry.lines.map((line) => (
              <TableRow key={line.id}>
                <TableCell className="font-mono text-sm">{line.accountId.slice(0, 8)}…</TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {Number(line.debit) > 0 ? formatCurrency(Number(line.debit)) : "—"}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {Number(line.credit) > 0 ? formatCurrency(Number(line.credit)) : "—"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{line.description || "—"}</TableCell>
              </TableRow>
            ))}
            <TableRow className="font-medium border-t">
              <TableCell>Total</TableCell>
              <TableCell className="text-right font-mono text-sm">{formatCurrency(totalDebit)}</TableCell>
              <TableCell className="text-right font-mono text-sm">{formatCurrency(totalCredit)}</TableCell>
              <TableCell>
                {!isBalanced && (
                  <span className="text-destructive text-sm">Unbalanced</span>
                )}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <ConfirmDialog
        open={postConfirmOpen}
        onOpenChange={setPostConfirmOpen}
        title="Post Journal Entry"
        description="Posting this entry will make it permanent. This action cannot be undone."
        confirmText="Post Entry"
        variant="default"
        isLoading={postEntry.isPending}
        onConfirm={() => postEntry.mutate({ id })}
      />

      <Dialog open={reverseConfirmOpen} onOpenChange={setReverseConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reverse Journal Entry</DialogTitle>
            <DialogDescription>
              This will create a new reversing entry. Please provide a reason.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="reverse-reason">Reason</Label>
            <Input
              id="reverse-reason"
              placeholder="Enter reason for reversal"
              value={reverseReason}
              onChange={(e) => setReverseReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReverseConfirmOpen(false)}
              disabled={reverseEntry.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={reverseEntry.isPending}
              onClick={() => {
                if (!reverseReason.trim()) {
                  toast.error("Please provide a reason for reversal")
                  return
                }
                reverseEntry.mutate({ id, reason: reverseReason.trim() })
              }}
            >
              {reverseEntry.isPending ? "Reversing..." : "Reverse Entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DetailShell>
  )
}
