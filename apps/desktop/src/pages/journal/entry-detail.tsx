import { useNavigate } from "react-router-dom"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@xenboox/ui"
import { Card, CardContent, CardHeader, CardTitle } from "@xenboox/ui"
import { Badge } from "@xenboox/ui"
import { Button } from "@xenboox/ui"
import { trpc } from "@/lib/trpc"
import { formatCurrency } from "@/lib/utils"
import { ArrowLeft } from "lucide-react"

export default function JournalEntryDetail() {
  const navigate = useNavigate()
  const id = window.location.pathname.split("/").pop() || ""
  const { data: entry, isLoading } = trpc.journal.getById.useQuery({ id })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="h-64 bg-muted rounded animate-pulse" />
      </div>
    )
  }

  if (!entry) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Entry Not Found</h1>
        <Button variant="outline" onClick={() => navigate("/journal")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Journal
        </Button>
      </div>
    )
  }

  const totalDebit = entry.lines?.reduce(
    (sum: number, l: any) => sum + parseFloat(l.debit || "0"),
    0
  ) || 0
  const totalCredit = entry.lines?.reduce(
    (sum: number, l: any) => sum + parseFloat(l.credit || "0"),
    0
  ) || 0

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate("/journal")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">JE-{entry.entryNumber}</h1>
          <p className="text-muted-foreground">{entry.description}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Entry Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">Date</span><span className="text-sm font-medium">{entry.date}</span></div>
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">Status</span><Badge variant={entry.status === "posted" ? "success" : entry.status === "voided" ? "destructive" : "secondary"}>{entry.status}</Badge></div>
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">Posted By</span><span className="text-sm font-medium">{entry.postedBy || "—"}</span></div>
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">Source</span><span className="text-sm font-medium">{entry.source || "—"}</span></div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Lines</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entry.lines?.map((line: any) => (
                  <TableRow key={line.id}>
                    <TableCell className="font-mono text-sm">{line.accountId}</TableCell>
                    <TableCell>{line.description}</TableCell>
                    <TableCell className="text-right">
                      {parseFloat(line.debit || "0") > 0 ? formatCurrency(parseFloat(line.debit)) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {parseFloat(line.credit || "0") > 0 ? formatCurrency(parseFloat(line.credit)) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-4 flex items-center justify-between border-t pt-4">
              <div className="flex gap-8">
                <div>
                  <span className="text-sm text-muted-foreground">Total Debit: </span>
                  <span className="text-sm font-bold">{formatCurrency(totalDebit)}</span>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Total Credit: </span>
                  <span className="text-sm font-bold">{formatCurrency(totalCredit)}</span>
                </div>
              </div>
              <Badge variant={Math.abs(totalDebit - totalCredit) < 0.01 ? "success" : "destructive"}>
                {Math.abs(totalDebit - totalCredit) < 0.01 ? "Balanced" : "Unbalanced"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}