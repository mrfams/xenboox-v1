import { useState } from "react"
import { Dialog } from "@/components/ui/dialog"
import { Button, Alert, AlertDescription } from "@xenboox/ui"
import { trpc } from "@/lib/trpc"

type Props = { open: boolean; onClose: () => void; onSuccess: () => void }

export function AddWarehouseDialog({ open, onClose, onSuccess }: Props) {
  const [name, setName] = useState("")
  const [location, setLocation] = useState("")
  const [managerName, setManagerName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const utils = trpc.useUtils()
  const mutation = trpc.inventory.createWarehouse.useMutation({
    onSuccess: () => {
      setError(null)
      utils.inventory.listWarehouses.invalidate()
      setName(""); setLocation(""); setManagerName("")
      onSuccess()
    },
    onError: (err) => {
      setError(err.message)
    }
  })

  return (
    <Dialog open={open} onClose={onClose} title="Add Warehouse">
      <div className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <div>
          <label className="text-sm font-medium">Name *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="e.g. Main Warehouse" />
        </div>
        <div>
          <label className="text-sm font-medium">Location</label>
          <input value={location} onChange={(e) => setLocation(e.target.value)} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="e.g. Banjul" />
        </div>
        <div>
          <label className="text-sm font-medium">Manager</label>
          <input value={managerName} onChange={(e) => setManagerName(e.target.value)} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="e.g. John Doe" />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mutation.mutate({ name, location: location || undefined, managerName: managerName || undefined })} disabled={!name || mutation.isPending}>
            {mutation.isPending ? "Creating..." : "Create Warehouse"}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
