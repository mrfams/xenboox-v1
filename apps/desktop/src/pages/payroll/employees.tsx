import { useState } from "react"
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
import { Plus } from "lucide-react"
import { AddEmployeeDialog } from "@/components/modals/add-employee"

function statusBadge(status: string) {
  const variant =
    status === "active"
      ? "success"
      : status === "terminated"
        ? "destructive"
        : "secondary"
  return (
    <Badge variant={variant} className="capitalize">
      {status}
    </Badge>
  )
}

export default function EmployeeList() {
  const navigate = useNavigate()
  const [showAdd, setShowAdd] = useState(false)
  const { data, isLoading } = trpc.payroll.listEmployees.useQuery()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Employees</h1>
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Employee
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Employees</CardTitle>
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
                  <TableHead>Name</TableHead>
                  <TableHead>Employee #</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Job Title</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.map((emp: any) => (
                  <TableRow
                    key={emp.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/payroll/employees/${emp.id}`)}
                  >
                    <TableCell className="font-medium">{emp.name}</TableCell>
                    <TableCell>{emp.employeeNumber}</TableCell>
                    <TableCell>{emp.department}</TableCell>
                    <TableCell>{emp.jobTitle}</TableCell>
                    <TableCell>{statusBadge(emp.status)}</TableCell>
                  </TableRow>
                ))}
                {data && data.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No employees found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AddEmployeeDialog open={showAdd} onClose={() => setShowAdd(false)} onSuccess={() => setShowAdd(false)} />
    </div>
  )
}
