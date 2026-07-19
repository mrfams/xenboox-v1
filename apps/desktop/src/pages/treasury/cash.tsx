import { Card, CardContent, CardHeader, CardTitle } from "@xenboox/ui"
import { Badge } from "@xenboox/ui"
import { trpc } from "@/lib/trpc"
import { formatCurrency } from "@/lib/utils"
import { Wallet } from "lucide-react"

export default function CashPage() {
  const { data: accounts, isLoading } = trpc.cash.listCashAccounts.useQuery()

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Wallet className="h-6 w-6 text-muted-foreground" />
          <h1 className="text-3xl font-bold tracking-tight">Cash & Imprest</h1>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Wallet className="h-12 w-12 text-muted-foreground mb-4 animate-pulse" />
            <h3 className="text-lg font-medium mb-2">Loading cash accounts...</h3>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Wallet className="h-6 w-6 text-muted-foreground" />
        <h1 className="text-3xl font-bold tracking-tight">Cash & Imprest</h1>
      </div>

      {accounts?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Wallet className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No cash accounts configured</h3>
            <p className="text-sm text-muted-foreground">Create your first cash account to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {accounts?.map((account: any) => (
            <Card key={account.id}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{account.name}</CardTitle>
                <Badge variant={account.isActive ? "success" : "secondary"}>
                  {account.isActive ? "Active" : "Inactive"}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(account.currentBalance)}</div>
                <p className="text-xs text-muted-foreground mt-1">{account.currency}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}