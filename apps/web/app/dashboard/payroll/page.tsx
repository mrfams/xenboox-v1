"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { trpc } from "@/lib/trpc/client"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { TableSkeleton } from "@/components/shared/loading"
import { FilterBar } from "@/components/dashboard/filter-bar"
import { Badge } from "@/components/ui"
import { Users, Plus } from "lucide-react"
import { formatDate } from "@/lib/utils"
import { CreateEmployeeDialog } from "./create-employee-dialog"
import { statusBadgeClass } from "@/lib/badge-variants"
import type { FilterState } from "@/components/dashboard/filter-bar"

export default function PayrollPage() {
  const router = useRouter()
  const { data: employees, isLoading } = trpc.payroll.listEmployees.useQuery()
  const [employeeOpen, setEmployeeOpen] = useState(false)
  const [filters, setFilters] = useState<FilterState>({
    search: "", dateFrom: "", dateTo: "", status: "", sort: "name-asc",
  })

  const filteredEmployees = useMemo(() => {
    if (!employees) return []
    let result = [...employees]
    if (filters.search) {
      const q = filters.search.toLowerCase()
      result = result.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.employeeNumber.toLowerCase().includes(q) ||
          (e.department ?? "").toLowerCase().includes(q) ||
          (e.jobTitle ?? "").toLowerCase().includes(q)
      )
    }
    if (filters.status === "active") {
      result = result.filter((e) => e.isActive)
    } else if (filters.status === "inactive") {
      result = result.filter((e) => !e.isActive)
    }
    if (filters.sort === "name-desc") {
      result.sort((a, b) => b.name.localeCompare(a.name))
    } else {
      result.sort((a, b) => a.name.localeCompare(b.name))
    }
    return result
  }, [employees, filters])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payroll"
        description="Manage employees, contracts, and payroll runs"
        action={{
          label: "New Employee",
          icon: <Plus className="mr-2 h-4 w-4" />,
          onClick: () => {},
        }}
      />

      <FilterBar
        onFilterChange={setFilters}
        statusOptions={[
          { value: "active", label: "Active" },
          { value: "inactive", label: "Inactive" },
        ]}
        sortOptions={[
          { value: "name-asc", label: "Name (A–Z)" },
          { value: "name-desc", label: "Name (Z–A)" },
        ]}
      />

      {isLoading ? (
        <TableSkeleton rows={5} columns={7} />
      ) : filteredEmployees.length === 0 ? (
        <EmptyState
          icon={<Users className="h-12 w-12" />}
          title="No employees"
          description="Add your first employee to get started with payroll."
        />
      ) : (
          <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">Name</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">Employee #</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">Department</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">Job Title</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">Type</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">Hire Date</th>
                <th className="py-3 px-4 text-center text-xs font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((emp) => (
                <tr
                  key={emp.id}
                  className="border-b hover:bg-muted/50 cursor-pointer"
                  onClick={() => router.push(`/dashboard/payroll/employees/${emp.id}`)}
                >
                  <td className="py-3 px-4 text-sm font-medium">{emp.name}</td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">{emp.employeeNumber}</td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">{emp.department ?? "—"}</td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">{emp.jobTitle ?? "—"}</td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">{emp.employmentType}</td>
                  <td className="py-3 px-4 text-sm">{formatDate(emp.hireDate)}</td>
                  <td className="py-3 px-4 text-center">
                    <Badge
                      variant="secondary"
                      className={statusBadgeClass(emp.isActive ? "active" : "inactive")}
                    >
                      {emp.isActive ? "active" : "inactive"}
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
          onClick={() => setEmployeeOpen(true)}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New Employee
        </button>
      </div>

      <CreateEmployeeDialog open={employeeOpen} onOpenChange={setEmployeeOpen} />
    </div>
  )
}
