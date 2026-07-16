import { Card, CardContent, CardHeader, CardTitle } from "@xenboox/ui"
import { Button } from "@xenboox/ui"
import { Badge } from "@xenboox/ui"
import { Shield, CheckCircle2, AlertCircle, TrendingUp, TrendingDown } from "lucide-react"
import { trpc } from "@/lib/trpc"

export default function FinancialPage() {
  const { data: overview, isLoading } = trpc.admin.getSystemOverview.useQuery()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Financial Health</h1>
        <Button>Generate Report</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Bank Balance</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${isLoading ? "..." : overview?.totalBankBalance?.toLocaleString() || "0"}
            </div>
            <Badge variant="outline" className="mt-2">
              <CheckCircle2 className="h-3 w-3 mr-1 text-green-500" />
              Healthy
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Journal Entries</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "..." : overview?.journalEntries || 0}
            </div>
            <p className="text-xs text-muted-foreground">+8% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Chart of Accounts</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "..." : overview?.chartOfAccounts || 0}
            </div>
            <p className="text-xs text-muted-foreground">All active</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Financial Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{overview?.bankAccounts || 0}</p>
                <p className="text-xs text-muted-foreground">Bank Accounts</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{overview?.users || 0}</p>
                <p className="text-xs text-muted-foreground">Users</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{overview?.organizations || 0}</p>
                <p className="text-xs text-muted-foreground">Organizations</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{overview?.entities || 0}</p>
                <p className="text-xs text-muted-foreground">Entities</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}