import { Card, CardContent, CardHeader, CardTitle } from "@xenboox/ui"
import { Badge } from "@xenboox/ui"
import { formatCurrency } from "@/lib/utils"
import { Landmark } from "lucide-react"
import { trpc } from "@/lib/trpc"

export default function TreasuryPage() {
  const { data: bankAccounts, isLoading, error } = trpc.treasury.listBankAccounts.useQuery()

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Landmark className="h-6 w-6 text-muted-foreground" />
          <h1 className="text-3xl font-bold tracking-tight">Bank Accounts</h1>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Loading...</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-8 w-32 bg-muted rounded animate-pulse" />
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Landmark className="h-6 w-6 text-muted-foreground" />
          <h1 className="text-3xl font-bold tracking-tight">Bank Accounts</h1>
        </div>
        <p className="text-destructive">Failed to load bank accounts. Please try again.</p>
      </div>
    )
  }

  const totalBalance = bankAccounts?.reduce((sum, account) => {
    return sum + parseFloat(account.currentBalance || "0")
  }, 0) || 0

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Landmark className="h-6 w-6 text-muted-foreground" />
        <h1 className="text-3xl font-bold tracking-tight">Bank Accounts</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {bankAccounts?.map((account) => (
          <Card key={account.id}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{account.name}</CardTitle>
              <Badge variant={account.isActive ? "success" : "secondary"}>{account.isActive ? "Active" : "Inactive"}</Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(parseFloat(account.currentBalance || "0"))}</div>
              <p className="text-xs text-muted-foreground mt-1">{account.bankName} • •••{account.accountNumber.slice(-4)}</p>
            </CardContent>
          </Card>
        ))}

        {bankAccounts?.length === 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">No accounts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">GMD 0</div>
              <p className="text-xs text-muted-foreground mt-1">No bank accounts configured</p>
            </CardContent>
          </Card>
        )}

        {bankAccounts && bankAccounts.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Cash</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalBalance)}</div>
              <p className="text-xs text-muted-foreground mt-1">Across {bankAccounts.length} account{bankAccounts.length > 1 ? "s" : ""}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}