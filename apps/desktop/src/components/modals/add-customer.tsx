import { useState } from "react"
import { Dialog } from "@/components/ui/dialog"
import { Button, Alert, AlertDescription } from "@xenboox/ui"
import { trpc } from "@/lib/trpc"

type Props = { open: boolean; onClose: () => void; onSuccess: () => void }

export function AddCustomerDialog({ open, onClose, onSuccess }: Props) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [paymentTerms, setPaymentTerms] = useState("Net 30")
  const [creditLimit, setCreditLimit] = useState("")
  const [error, setError] = useState<string | null>(null)
  const utils = trpc.useUtils()
  const mutation = trpc.ar.createCustomer.useMutation({
    onSuccess: () => {
      setError(null)
      utils.ar.listCustomers.invalidate()
      setName(""); setEmail(""); setPhone(""); setPaymentTerms("Net 30"); setCreditLimit("")
      onSuccess()
    },
    onError: (err) => {
      setError(err.message)
    }
  })

  return (
    <Dialog open={open} onClose={onClose} title="Add Customer">
      <div className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <div>
          <label className="text-sm font-medium">Name *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" type="email" />
          </div>
          <div>
            <label className="text-sm font-medium">Phone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Payment Terms</label>
            <select value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
              <option>Net 15</option>
              <option>Net 30</option>
              <option>Net 60</option>
              <option>Due on Receipt</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Credit Limit</label>
            <input value={creditLimit} onChange={(e) => setCreditLimit(e.target.value)} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" type="number" placeholder="0.00" />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mutation.mutate({ name, contactEmail: email || undefined, contactPhone: phone || undefined, paymentTerms, creditLimit: creditLimit || undefined })} disabled={!name || mutation.isPending}>
            {mutation.isPending ? "Creating..." : "Create Customer"}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}