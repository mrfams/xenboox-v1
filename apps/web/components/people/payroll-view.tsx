"use client";

import { Users, Plus, Bot } from "lucide-react";
import { useEntity } from "@/lib/entity-context";
import { trpc } from "@/lib/trpc/client";
import { DataTable, type Column } from "@/components/shared/data-table";
import { useModuleAi } from "@/components/module/module-ai-context";
import { useFormatCurrency } from "@/lib/hooks/use-currency";

type EmployeeRow = {
  id: string;
  name: string;
  employeeNumber: string;
  department: string;
  jobTitle?: string;
  employmentType: string;
};

export function PayrollView() {
  const { format } = useFormatCurrency();
  const { entityId, entityCurrency } = useEntity();
  const { openWithFocus } = useModuleAi();

  const { data, isLoading } = trpc.payroll.listEmployeesWithPayroll.useQuery(
    { limit: 50, offset: 0 },
    { enabled: !!entityId },
  );

  const employees = (data?.employees ?? []) as EmployeeRow[];
  const totalCount = data?.totalCount ?? employees.length;

  const columns: Column<EmployeeRow>[] = [
    {
      key: "name",
      label: "Employee",
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary text-xs font-bold">
            {row.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{row.name}</p>
            <p className="text-[10px] text-muted-foreground">{row.employeeNumber}</p>
          </div>
        </div>
      ),
    },
    { key: "department", label: "Department", render: (r) => <span className="text-xs text-muted-foreground">{r.department}</span> },
    { key: "jobTitle", label: "Role", render: (r) => <span className="text-xs">{r.jobTitle ?? "—"}</span> },
    {
      key: "employmentType",
      label: "Type",
      render: (r) => <span className="text-xs capitalize">{r.employmentType.replace("_", " ")}</span>,
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-muted-foreground">{isLoading ? "Loading..." : `${totalCount} employees`}</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => openWithFocus({ kind: "Payroll", name: "Payroll" }, "Show me this month's payroll, who is paid and what is owed?")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10"
          >
            <Bot className="h-3.5 w-3.5" /> Ask AI
          </button>
          <button
            type="button"
            onClick={() => openWithFocus({ kind: "Payroll", name: "New Employee" }, "Help me create a new employee")}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-3.5 w-3.5" /> Add Employee
          </button>
        </div>
      </div>
      <DataTable<EmployeeRow>
        columns={columns}
        data={employees}
        isLoading={isLoading}
        searchPlaceholder="Search employees..."
        emptyIcon={Users}
        emptyTitle="No employees yet"
        emptyDescription="Add employees to run payroll. AI will draft payslips and you approve."
        onRowClick={(row) => openWithFocus({ kind: "Employee", name: row.name, id: row.id }, `Show me details for ${row.name}`)}
        showSearch
        showPagination
        pageSize={20}
      />
    </div>
  );
}
