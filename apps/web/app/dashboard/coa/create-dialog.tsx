"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { trpc } from "@/lib/trpc/client"
import { AccountPicker } from "@/components/dashboard/account-picker"
import { CreateDialog } from "@/components/dashboard/create-dialog"
import {
  Input,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui"
import { toast } from "sonner"

const accountTypes = ["asset", "liability", "equity", "revenue", "expense"] as const

const subtypesByType: Record<string, { value: string; label: string }[]> = {
  asset: [
    { value: "current_asset", label: "Current Asset" },
    { value: "fixed_asset", label: "Fixed Asset" },
    { value: "bank_account", label: "Bank Account" },
    { value: "cash", label: "Cash" },
    { value: "accounts_receivable", label: "Accounts Receivable" },
    { value: "inventory", label: "Inventory" },
    { value: "prepaid", label: "Prepaid" },
  ],
  liability: [
    { value: "current_liability", label: "Current Liability" },
    { value: "long_term_liability", label: "Long-Term Liability" },
    { value: "accounts_payable", label: "Accounts Payable" },
    { value: "tax_liability", label: "Tax Liability" },
    { value: "accrued_liability", label: "Accrued Liability" },
  ],
  equity: [
    { value: "owner_equity", label: "Owner Equity" },
    { value: "retained_earnings", label: "Retained Earnings" },
    { value: "current_year_earnings", label: "Current Year Earnings" },
  ],
  revenue: [
    { value: "sales_revenue", label: "Sales Revenue" },
    { value: "service_revenue", label: "Service Revenue" },
    { value: "other_income", label: "Other Income" },
    { value: "interest_income", label: "Interest Income" },
  ],
  expense: [
    { value: "cost_of_goods_sold", label: "Cost of Goods Sold" },
    { value: "operating_expense", label: "Operating Expense" },
    { value: "payroll_expense", label: "Payroll Expense" },
    { value: "tax_expense", label: "Tax Expense" },
    { value: "depreciation", label: "Depreciation" },
    { value: "interest_expense", label: "Interest Expense" },
    { value: "other_expense", label: "Other Expense" },
  ],
}

const formSchema = z.object({
  code: z.string().min(1, "Code is required").max(20),
  name: z.string().min(1, "Name is required").max(200),
  type: z.enum(accountTypes),
  subtype: z.string().min(1, "Subtype is required"),
  description: z.string().optional(),
  parentId: z.string().uuid().optional().or(z.literal("")),
})

type FormData = z.infer<typeof formSchema>

type CreateAccountDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateAccountDialog({ open, onOpenChange }: CreateAccountDialogProps) {
  const utils = trpc.useUtils()
  const [parentId, setParentId] = useState<string | null>(null)

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: "",
      name: "",
      type: "asset",
      subtype: "current_asset",
      description: "",
      parentId: "",
    },
  })

  const watchedType = form.watch("type")
  const subtypes = subtypesByType[watchedType] ?? []

  const createAccount = trpc.coa.create.useMutation({
    onSuccess: () => {
      toast.success("Account created")
      utils.coa.listHierarchy.invalidate()
      form.reset()
      setParentId(null)
      onOpenChange(false)
    },
    onError: (err) => {
      toast.error(err.message)
    },
  })

  function handleTypeChange(value: string) {
    form.setValue("type", value as FormData["type"])
    const firstSubtype = subtypesByType[value]?.[0]?.value
    if (firstSubtype) {
      form.setValue("subtype", firstSubtype)
    }
  }

  function handleSubmit() {
    form.handleSubmit((data) => {
      createAccount.mutate({
        code: data.code,
        name: data.name,
        type: data.type,
        subtype: data.subtype as "current_asset" | "fixed_asset" | "bank_account" | "cash" | "accounts_receivable" | "inventory" | "prepaid" | "current_liability" | "long_term_liability" | "accounts_payable" | "tax_liability" | "accrued_liability" | "owner_equity" | "retained_earnings" | "current_year_earnings" | "sales_revenue" | "service_revenue" | "other_income" | "interest_income" | "cost_of_goods_sold" | "operating_expense" | "payroll_expense" | "tax_expense" | "depreciation" | "interest_expense" | "other_expense",
        description: data.description || undefined,
        parentId: parentId || undefined,
      })
    })()
  }

  return (
    <CreateDialog
      open={open}
      onOpenChange={onOpenChange}
      title="New Account"
      description="Add a new account to the chart of accounts"
      onSubmit={handleSubmit}
      isLoading={createAccount.isPending}
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="code">Code</Label>
            <Input id="code" placeholder="e.g. 1000" {...form.register("code")} />
            {form.formState.errors.code && (
              <p className="text-sm text-destructive">{form.formState.errors.code.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" placeholder="e.g. Cash" {...form.register("name")} />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={form.getValues("type")} onValueChange={handleTypeChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {accountTypes.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Subtype</Label>
            <Select
              value={form.getValues("subtype")}
              onValueChange={(v) => form.setValue("subtype", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {subtypes.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.subtype && (
              <p className="text-sm text-destructive">{form.formState.errors.subtype.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Input id="description" placeholder="Optional description" {...form.register("description")} />
        </div>

        <div className="space-y-2">
          <Label>Parent Account</Label>
          <AccountPicker value={parentId} onChange={setParentId} />
        </div>
      </div>
    </CreateDialog>
  )
}
