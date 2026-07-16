import { Card, CardContent, CardHeader, CardTitle } from "@xenboox/ui"
import { Badge } from "@xenboox/ui"
import { trpc } from "@/lib/trpc"
import { formatCurrency } from "@/lib/utils"
import { Wallet } from "lucide-react"

export default function CashPage() {
  const { data: accounts } = trpc.cash.listCashAccounts.useQuery()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Wallet className="h-6 w-6 text-muted-foreground" />
        <h1 className="text-3xl font-bold tracking-tight">Cash & Imprest</h1>
      </div>

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
              <p className="text-xs text-muted-foreground mt-1">{account.currency} • {account.accountType}</p>
            </CardContent>
          </Card>
        ))}

        {(!accounts || accounts.length === 0) && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Petty Cash</CardTitle>
                <Badge variant="success">Active</Badge>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(25000)}</div>
                <p className="text-xs text-muted-foreground mt-1">GMD • Cash</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Imprest Float</CardTitle>
                <Badge variant="success">Active</Badge>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(50000)}</div>
                <p className="text-xs text-muted-foreground mt-1">GMD • Float</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}