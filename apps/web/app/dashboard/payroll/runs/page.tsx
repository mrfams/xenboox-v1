"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { trpc } from "@/lib/trpc/client"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { TableSkeleton } from "@/components/shared/loading"
import { FilterBar } from "@/components/dashboard/filter-bar"
import { Badge } from "@/components/ui"
import { FileText, Plus } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { CreatePayrollRunDialog } from "./create-run-dialog"
import { statusBadgeClass } from "@/lib/badge-variants"
import type { FilterState } from "@/components/dashboard/filter-bar"

export default function PayrollRunsPage() {
  const router = useRouter()
  const { data: runs, isLoading } = trpc.payroll.listPayrollRuns.useQuery()
  const [runOpen, setRunOpen] = useState(false)
  const [filters, setFilters] = useState<FilterState>({
    search: "", dateFrom: "", dateTo: "", status: "", sort: "date-desc",
  })

  const filteredRuns = useMemo(() => {
    if (!runs) return []
    let result = [...runs]
    if (filters.search) {
      const q = filters.search.toLowerCase()
      result = result.filter((r) => r.period.toLowerCase().includes(q))
    }
    if (filters.status) {
      result = result.filter((r) => r.status === filters.status)
    }
    if (filters.sort === "date-asc") {
      result.sort((a, b) => a.period.localeCompare(b.period))
    } else {
      result.sort((a, b) => b.period.localeCompare(a.period))
    }
    return result
  }, [runs, filters])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payroll Runs"
        description="View and manage payroll processing runs"
      />

      <FilterBar
        onFilterChange={setFilters}
        statusOptions={[
          { value: "draft", label: "Draft" },
          { value: "validated", label: "Validated" },
          { value: "approved", label: "Approved" },
          { value: "paid", label: "Paid" },
          { value: "closed", label: "Closed" },
        ]}
        sortOptions={[
          { value: "date-desc", label: "Period (newest first)" },
          { value: "date-asc", label: "Period (oldest first)" },
        ]}
      />

      {isLoading ? (
        <TableSkeleton rows={4} columns={6} />
      ) : filteredRuns.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-12 w-12" />}
          title="No payroll runs"
          description="Create your first payroll run to process employee pay."
        />
      ) : (
          <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">Period</th>
                <th className="py-3 px-4 text-center text-xs font-medium text-muted-foreground">Employees</th>
                <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground">Gross Pay</th>
                <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground">Deductions</th>
                <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground">Net Pay</th>
                <th className="py-3 px-4 text-center text-xs font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredRuns.map((run) => (
                <tr
                  key={run.id}
                  className="border-b hover:bg-muted/50 cursor-pointer"
                  onClick={() => router.push(`/dashboard/payroll/runs/${run.id}`)}
                >
                  <td className="py-3 px-4 text-sm font-medium">{run.period}</td>
                  <td className="py-3 px-4 text-sm text-center">{run.employeeCount}</td>
                  <td className="py-3 px-4 text-sm text-right font-mono">
                    {formatCurrency(Number(run.grossPay))}
                  </td>
                  <td className="py-3 px-4 text-sm text-right font-mono">
                    {formatCurrency(Number(run.totalDeductions))}
                  </td>
                  <td className="py-3 px-4 text-sm text-right font-mono">
                    {formatCurrency(Number(run.netPay))}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <Badge variant="secondary" className={statusBadgeClass(run.status)}>
                      {run.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={() => setRunOpen(true)}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New Payroll Run
        </button>
      </div>

      <CreatePayrollRunDialog open={runOpen} onOpenChange={setRunOpen} />
    </div>
  )
}
