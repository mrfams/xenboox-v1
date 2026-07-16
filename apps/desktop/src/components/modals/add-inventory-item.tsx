import { useState } from "react"
import { Dialog } from "@/components/ui/dialog"
import { Button, Alert, AlertDescription } from "@xenboox/ui"
import { trpc } from "@/lib/trpc"

type Props = { open: boolean; onClose: () => void; onSuccess: () => void }

export function AddInventoryItemDialog({ open, onClose, onSuccess }: Props) {
  const [name, setName] = useState("")
  const [sku, setSku] = useState("")
  const [category, setCategory] = useState("general")
  const [unitOfMeasure, setUnitOfMeasure] = useState("unit")
  const [standardCost, setStandardCost] = useState("")
  const [reorderLevel, setReorderLevel] = useState("0")
  const [error, setError] = useState<string | null>(null)
  const utils = trpc.useUtils()
  const mutation = trpc.inventory.createItem.useMutation({
    onSuccess: () => {
      setError(null)
      utils.inventory.listItems.invalidate()
      setName(""); setSku(""); setCategory("general"); setStandardCost(""); setReorderLevel("0")
      onSuccess()
    },
    onError: (err) => {
      setError(err.message)
    }
  })

  return (
    <Dialog open={open} onClose={onClose} title="Add Inventory Item">
      <div className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium">SKU *</label>
            <input value={sku} onChange={(e) => setSku(e.target.value)} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
              <option value="general">General</option>
              <option value="food">Food</option>
              <option value="household">Household</option>
              <option value="electronics">Electronics</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Unit of Measure</label>
            <select value={unitOfMeasure} onChange={(e) => setUnitOfMeasure(e.target.value)} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
              <option value="unit">Unit</option>
              <option value="kg">Kilogram</option>
              <option value="bag">Bag</option>
              <option value="carton">Carton</option>
              <option value="bottle">Bottle</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Standard Cost *</label>
            <input value={standardCost} onChange={(e) => setStandardCost(e.target.value)} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" type="number" placeholder="0.00" />
          </div>
          <div>
            <label className="text-sm font-medium">Reorder Level</label>
            <input value={reorderLevel} onChange={(e) => setReorderLevel(e.target.value)} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" type="number" />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mutation.mutate({ name, sku, category, unitOfMeasure, standardCost, reorderLevel: parseInt(reorderLevel), costMethod: "weighted_average" })} disabled={!name || !sku || !standardCost || mutation.isPending}>
            {mutation.isPending ? "Creating..." : "Create Item"}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}