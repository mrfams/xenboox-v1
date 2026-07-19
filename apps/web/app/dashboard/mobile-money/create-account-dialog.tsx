"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@xenboox/ui"
import { Button } from "@xenboox/ui"
import { Input } from "@xenboox/ui"
import { Label } from "@xenboox/ui"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@xenboox/ui"
import { trpc } from "@/lib/trpc/client"
import { toast } from "sonner"

const PROVIDERS = [
  { value: "mpesa", label: "M-Pesa" },
  { value: "wave", label: "Wave" },
  { value: "modempay", label: "ModemPay" },
  { value: "afrimoney", label: "Afrimoney" },
  { value: "qmoney", label: "QMoney" },
] as const

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateAccountDialog({ open, onOpenChange }: Props) {
  const [provider, setProvider] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [accountName, setAccountName] = useState("")
  const [currency, setCurrency] = useState("GMD")
  const [errors, setErrors] = useState<Record<string, string>>({})

  const utils = trpc.useUtils()
  const createMutation = trpc.mobileMoney.createAccount.useMutation({
    onSuccess: () => {
      toast.success("Mobile money account created")
      onOpenChange(false)
      utils.mobileMoney.listAccounts.invalidate()
      resetForm()
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create account")
    },
  })

  const resetForm = () => {
    setProvider("")
    setPhoneNumber("")
    setAccountName("")
    setCurrency("GMD")
    setErrors({})
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: Record<string, string> = {}
    if (!provider) newErrors.provider = "Provider is required"
    if (!phoneNumber.trim()) newErrors.phoneNumber = "Phone number is required"
    if (!accountName.trim()) newErrors.accountName = "Account name is required"
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return }

    createMutation.mutate({
      provider: provider as "mpesa" | "wave" | "modempay" | "afrimoney" | "qmoney",
      phoneNumber: phoneNumber.trim(),
      accountName: accountName.trim(),
      currency,
      isActive: true,
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o) }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>New Mobile Money Account</DialogTitle>
          <DialogDescription>
            Add a mobile money provider account to start tracking transactions.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="provider">Provider</Label>
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger className={errors.provider ? "border-destructive" : ""}>
                <SelectValue placeholder="Select provider..." />
              </SelectTrigger>
              <SelectContent>
                {PROVIDERS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.provider && <p className="text-sm text-destructive">{errors.provider}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="accountName">Account Name</Label>
            <Input id="accountName" value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="e.g. Main M-Pesa Account" className={errors.accountName ? "border-destructive" : ""} />
            {errors.accountName && <p className="text-sm text-destructive">{errors.accountName}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="phoneNumber">Phone Number</Label>
            <Input id="phoneNumber" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="+220 123 4567" className={errors.phoneNumber ? "border-destructive" : ""} />
            {errors.phoneNumber && <p className="text-sm text-destructive">{errors.phoneNumber}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="GMD">GMD - Gambian Dalasi</SelectItem>
                <SelectItem value="NGN">NGN - Nigerian Naira</SelectItem>
                <SelectItem value="KES">KES - Kenyan Shilling</SelectItem>
                <SelectItem value="GHS">GHS - Ghanaian Cedi</SelectItem>
                <SelectItem value="XOF">XOF - CFA Franc</SelectItem>
                <SelectItem value="USD">USD - US Dollar</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? "Creating..." : "Create Account"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
