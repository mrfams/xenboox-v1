"use client"

import { useParams, useRouter } from "next/navigation"
import { trpc } from "@/lib/trpc/client"
import { PageHeader } from "@/components/shared/page-header"
import { TableSkeleton } from "@/components/shared/loading"
import { Badge } from "@/components/ui"
import { ArrowLeft } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils"
import { statusBadgeClass } from "@/lib/badge-variants"

export default function EmployeeDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const { data: employee, isLoading } = trpc.payroll.getEmployeeById.useQuery({ id })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <TableSkeleton rows={6} columns={4} />
      </div>
    )
  }

  if (!employee) {
    return (
      <div className="space-y-6">
        <PageHeader title="Employee Not Found" />
        <button
          onClick={() => router.push("/dashboard/payroll")}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Payroll
        </button>
      </div>
    )
  }

  const activeContract = employee.contracts.find((c) => c.isActive) ?? employee.contracts[0]

  return (
    <div className="space-y-6">
      <button
        onClick={() => router.push("/dashboard/payroll")}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Payroll
      </button>

      <PageHeader
        title={employee.name}
        description={employee.jobTitle ?? employee.employeeNumber}
      >
        <Badge
          variant="secondary"
          className={statusBadgeClass(employee.isActive ? "active" : "inactive")}
        >
          {employee.isActive ? "active" : "inactive"}
        </Badge>
      </PageHeader>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground">Personal Information</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Email</span>
              <p className="font-medium">{employee.email ?? "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Phone</span>
              <p className="font-medium">{employee.phone ?? "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Department</span>
              <p className="font-medium">{employee.department ?? "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Job Title</span>
              <p className="font-medium">{employee.jobTitle ?? "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Hire Date</span>
              <p className="font-medium">{formatDate(employee.hireDate)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Employment Type</span>
              <p className="font-medium">{employee.employmentType}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground">Bank Details</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Bank Name</span>
              <p className="font-medium">{employee.bankName ?? "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Account Number</span>
              <p className="font-medium">{employee.bankAccountNumber ?? "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Sort Code</span>
              <p className="font-medium">{employee.bankSortCode ?? "—"}</p>
            </div>
          </div>
        </div>
      </div>

      {activeContract && (
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground">Current Contract</h3>
          <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
            <div>
              <span className="text-muted-foreground">Basic Salary</span>
              <p className="font-medium font-mono">{formatCurrency(Number(activeContract.basicSalary))}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Pay Frequency</span>
              <p className="font-medium">{activeContract.payFrequency}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Effective Date</span>
              <p className="font-medium">{formatDate(activeContract.effectiveDate)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">End Date</span>
              <p className="font-medium">
                {activeContract.endDate ? formatDate(activeContract.endDate) : "Ongoing"}
              </p>
            </div>
          </div>
        </div>
      )}

      {employee.loans.length > 0 && (
          <div className="overflow-x-auto rounded-lg border bg-card">
          <div className="p-6 space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground">Staff Loans</h3>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">Loan Amount</th>
                <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground">Monthly Deduction</th>
                <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground">Remaining Balance</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">Start Date</th>
                <th className="py-3 px-4 text-center text-xs font-medium text-muted-foreground">Active</th>
              </tr>
            </thead>
            <tbody>
              {employee.loans.map((loan) => (
                <tr key={loan.id} className="border-b last:border-b-0">
                  <td className="py-3 px-4 text-sm font-mono">{formatCurrency(Number(loan.loanAmount))}</td>
                  <td className="py-3 px-4 text-sm text-right font-mono">{formatCurrency(Number(loan.monthlyDeduction))}</td>
                  <td className="py-3 px-4 text-sm text-right font-mono">{formatCurrency(Number(loan.remainingBalance))}</td>
                  <td className="py-3 px-4 text-sm">{formatDate(loan.startDate)}</td>
                  <td className="py-3 px-4 text-center">
                    <Badge
                      variant="secondary"
                      className={statusBadgeClass(loan.isActive ? "active" : "inactive")}
                    >
                      {loan.isActive ? "active" : "closed"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
