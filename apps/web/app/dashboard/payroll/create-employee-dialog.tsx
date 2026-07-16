"use client"

import { useState } from "react"
import { trpc } from "@/lib/trpc/client"
import { CreateDialog } from "@/components/dashboard/create-dialog"
import { Input } from "@/components/ui"

type CreateEmployeeDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateEmployeeDialog({ open, onOpenChange }: CreateEmployeeDialogProps) {
  const utils = trpc.useUtils()
  const [form, setForm] = useState({
    employeeNumber: "",
    name: "",
    email: "",
    phone: "",
    hireDate: new Date().toISOString().split("T")[0],
    department: "",
    jobTitle: "",
    employmentType: "full_time" as "full_time" | "part_time" | "contractor" | "intern",
    bankName: "",
    bankAccountNumber: "",
    taxId: "",
    basicSalary: "",
  })

  const createEmployee = trpc.payroll.createEmployee.useMutation({
    onSuccess: () => {
      utils.payroll.listEmployees.invalidate()
      onOpenChange(false)
      setForm({
        employeeNumber: "", name: "", email: "", phone: "",
        hireDate: new Date().toISOString().split("T")[0],
        department: "", jobTitle: "", employmentType: "full_time",
        bankName: "", bankAccountNumber: "", taxId: "", basicSalary: "",
      })
    },
  })

  const handleSubmit = () => {
    createEmployee.mutate({
      employeeNumber: form.employeeNumber,
      name: form.name,
      email: form.email || undefined,
      phone: form.phone || undefined,
      hireDate: form.hireDate,
      department: form.department || undefined,
      jobTitle: form.jobTitle || undefined,
      employmentType: form.employmentType,
      bankName: form.bankName || undefined,
      bankAccountNumber: form.bankAccountNumber || undefined,
      taxId: form.taxId || undefined,
      basicSalary: form.basicSalary,
    })
  }

  const update = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }))

  return (
    <CreateDialog
      open={open}
      onOpenChange={onOpenChange}
      title="New Employee"
      description="Add a new employee to the payroll system."
      onSubmit={handleSubmit}
      isLoading={createEmployee.isPending}
    >
      <div className="grid gap-4 py-2">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Employee Number *</label>
            <Input placeholder="EMP-001" value={form.employeeNumber} onChange={(e) => update("employeeNumber", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Full Name *</label>
            <Input placeholder="John Doe" value={form.name} onChange={(e) => update("name", e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Email</label>
            <Input type="email" placeholder="john@example.com" value={form.email} onChange={(e) => update("email", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Phone</label>
            <Input placeholder="+220 1234567" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Hire Date *</label>
            <Input type="date" value={form.hireDate} onChange={(e) => update("hireDate", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Employment Type</label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={form.employmentType}
              onChange={(e) => update("employmentType", e.target.value)}
            >
              <option value="full_time">Full Time</option>
              <option value="part_time">Part Time</option>
              <option value="contractor">Contractor</option>
              <option value="intern">Intern</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Department</label>
            <Input placeholder="Finance" value={form.department} onChange={(e) => update("department", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Job Title</label>
            <Input placeholder="Accountant" value={form.jobTitle} onChange={(e) => update("jobTitle", e.target.value)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Basic Salary (GMD) *</label>
          <Input type="number" placeholder="25000" value={form.basicSalary} onChange={(e) => update("basicSalary", e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Bank Name</label>
            <Input placeholder="Trust Bank" value={form.bankName} onChange={(e) => update("bankName", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Bank Account Number</label>
            <Input placeholder="1234567890" value={form.bankAccountNumber} onChange={(e) => update("bankAccountNumber", e.target.value)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Tax ID (TIN)</label>
          <Input placeholder="123456789" value={form.taxId} onChange={(e) => update("taxId", e.target.value)} />
        </div>
      </div>
    </CreateDialog>
  )
}
