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
import { trpc } from "@/lib/trpc"
import { formatCurrency } from "@/lib/utils"

function statusBadge(status: string) {
  const variant =
    status === "approved"
      ? "success"
      : status === "draft"
        ? "secondary"
        : status === "processing"
          ? "info"
          : status === "failed"
            ? "destructive"
            : "secondary"
  return (
    <Badge variant={variant} className="capitalize">
      {status}
    </Badge>
  )
}

export default function PayrollRuns() {
  const { data, isLoading } = trpc.payroll.listPayrollRuns.useQuery()

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Payroll Runs</h1>

      <Card>
        <CardHeader>
          <CardTitle>All Payroll Runs</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Employees</TableHead>
                  <TableHead>Gross Pay</TableHead>
                  <TableHead>Deductions</TableHead>
                  <TableHead>Net Pay</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.map((run: any) => (
                  <TableRow key={run.id}>
                    <TableCell className="font-medium">{run.period}</TableCell>
                    <TableCell>{statusBadge(run.status)}</TableCell>
                    <TableCell>{run.employeeCount}</TableCell>
                    <TableCell>{formatCurrency(run.grossPay)}</TableCell>
                    <TableCell>{formatCurrency(run.deductions)}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(run.netPay)}</TableCell>
                  </TableRow>
                ))}
                {data && data.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No payroll runs found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
