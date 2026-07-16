import { useParams, useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@xenboox/ui"
import { Badge } from "@xenboox/ui"
import { Button } from "@xenboox/ui"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@xenboox/ui"
import { trpc } from "@/lib/trpc"
import { formatCurrency, formatDate } from "@/lib/utils"
import { ArrowLeft } from "lucide-react"

export default function EmployeeDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: employee, isLoading } = trpc.payroll.getEmployeeById.useQuery(
    { id: id! },
    { enabled: !!id }
  )

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((j) => (
                    <div key={j} className="h-4 bg-muted rounded w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!employee) {
    return <div className="text-muted-foreground">Employee not found</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/payroll/employees")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{employee.name}</h1>
          <p className="text-muted-foreground">{employee.jobTitle} · {employee.department}</p>
        </div>
        <Badge
          variant={
            employee.status === "active"
              ? "success"
              : employee.status === "terminated"
                ? "destructive"
                : "secondary"
          }
          className="ml-auto capitalize"
        >
          {employee.status}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="Employee Number" value={employee.employeeNumber} />
            <InfoRow label="Email" value={employee.email} />
            <InfoRow label="Phone" value={employee.phone} />
            <InfoRow label="Date of Birth" value={employee.dateOfBirth ? formatDate(employee.dateOfBirth) : "—"} />
            <InfoRow label="Hire Date" value={formatDate(employee.hireDate)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bank Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="Bank Name" value={employee.bankName ?? "—"} />
            <InfoRow label="Account Number" value={employee.bankAccountNumber ?? "—"} />
            <InfoRow label="Routing Number" value={employee.routingNumber ?? "—"} />
            <InfoRow label="Payment Method" value={employee.paymentMethod ?? "—"} />
          </CardContent>
        </Card>
      </div>

      {employee.contracts && employee.contracts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Contracts</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Salary</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employee.contracts.map((contract: Record<string, unknown>) => (
                  <TableRow key={contract.id as string}>
                    <TableCell className="capitalize">{contract.type as string}</TableCell>
                    <TableCell>{formatDate(contract.startDate as string)}</TableCell>
                    <TableCell>{contract.endDate ? formatDate(contract.endDate as string) : "—"}</TableCell>
                    <TableCell>{formatCurrency(contract.salary as number)}</TableCell>
                    <TableCell>
                      <Badge variant={contract.status === "active" ? "success" : "secondary"} className="capitalize">
                        {contract.status as string}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {employee.loans && employee.loans.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Loans</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Monthly Deduction</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employee.loans.map((loan: Record<string, unknown>) => (
                  <TableRow key={loan.id as string}>
                    <TableCell>{loan.type as string}</TableCell>
                    <TableCell>{formatCurrency(loan.amount as number)}</TableCell>
                    <TableCell>{formatCurrency(loan.balance as number)}</TableCell>
                    <TableCell>{formatCurrency(loan.monthlyDeduction as number)}</TableCell>
                    <TableCell>
                      <Badge variant={loan.status === "active" ? "warning" : "secondary"} className="capitalize">
                        {loan.status as string}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b pb-2 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  )
}
