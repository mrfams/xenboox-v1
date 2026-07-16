import { useState } from "react"
import { Dialog } from "@/components/ui/dialog"
import { Button, Alert, AlertDescription } from "@xenboox/ui"
import { trpc } from "@/lib/trpc"

type Props = { open: boolean; onClose: () => void; onSuccess: () => void }

export function AddEmployeeDialog({ open, onClose, onSuccess }: Props) {
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [department, setDepartment] = useState("")
  const [jobTitle, setJobTitle] = useState("")
  const [error, setError] = useState<string | null>(null)
  const utils = trpc.useUtils()
  const mutation = trpc.payroll.createEmployee.useMutation({
    onSuccess: () => {
      setError(null)
      utils.payroll.listEmployees.invalidate()
      setFirstName(""); setLastName(""); setEmail(""); setDepartment(""); setJobTitle("")
      onSuccess()
    },
    onError: (err) => {
      setError(err.message)
    }
  })

  return (
    <Dialog open={open} onClose={onClose} title="Add Employee">
      <div className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">First Name *</label>
            <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium">Last Name *</label>
            <input value={lastName} onChange={(e) => setLastName(e.target.value)} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium">Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" type="email" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Department</label>
            <input value={department} onChange={(e) => setDepartment(e.target.value)} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium">Job Title</label>
            <input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mutation.mutate({ firstName, lastName, email: email || undefined, department: department || undefined, jobTitle: jobTitle || undefined })} disabled={!firstName || !lastName || mutation.isPending}>
            {mutation.isPending ? "Creating..." : "Create Employee"}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}