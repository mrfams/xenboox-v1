import { useState } from "react"
import { Dialog } from "@/components/ui/dialog"
import { Button, Alert, AlertDescription } from "@xenboox/ui"
import { trpc } from "@/lib/trpc"

type Props = { open: boolean; onClose: () => void; onSuccess: () => void }

export function AddAssetDialog({ open, onClose, onSuccess }: Props) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [assetClass, setAssetClass] = useState("office_equipment")
  const [cost, setCost] = useState("")
  const [salvageValue, setSalvageValue] = useState("0")
  const [usefulLife, setUsefulLife] = useState("5")
  const [location, setLocation] = useState("")
  const [error, setError] = useState<string | null>(null)
  const utils = trpc.useUtils()
  const mutation = trpc.fixedAssets.createAsset.useMutation({
    onSuccess: () => {
      setError(null)
      utils.fixedAssets.listAssets.invalidate()
      setName(""); setDescription(""); setCost(""); setSalvageValue("0"); setUsefulLife("5"); setLocation("")
      onSuccess()
    },
    onError: (err) => {
      setError(err.message)
    }
  })

  return (
    <Dialog open={open} onClose={onClose} title="Add Fixed Asset">
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
        <div>
          <label className="text-sm font-medium">Description</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Asset Class</label>
            <select value={assetClass} onChange={(e) => setAssetClass(e.target.value)} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
              <option value="office_equipment">Office Equipment</option>
              <option value="furniture">Furniture</option>
              <option value="vehicle">Vehicle</option>
              <option value="building">Building</option>
              <option value="machinery">Machinery</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Location</label>
            <input value={location} onChange={(e) => setLocation(e.target.value)} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium">Cost *</label>
            <input value={cost} onChange={(e) => setCost(e.target.value)} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" type="number" placeholder="0.00" />
          </div>
          <div>
            <label className="text-sm font-medium">Salvage Value</label>
            <input value={salvageValue} onChange={(e) => setSalvageValue(e.target.value)} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" type="number" placeholder="0.00" />
          </div>
          <div>
            <label className="text-sm font-medium">Useful Life (yrs)</label>
            <input value={usefulLife} onChange={(e) => setUsefulLife(e.target.value)} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" type="number" />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mutation.mutate({ name, description: description || undefined, assetClass, cost, salvageValue, usefulLife: parseInt(usefulLife), location: location || undefined, depreciationMethod: "straight_line" })} disabled={!name || !cost || mutation.isPending}>
            {mutation.isPending ? "Creating..." : "Create Asset"}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}