import { Card, CardContent, CardHeader, CardTitle } from "@xenboox/ui"
import { Button } from "@xenboox/ui"
import { Badge } from "@xenboox/ui"
import { Alert, AlertDescription } from "@xenboox/ui"
import { Users, Building, Bot, CreditCard, BarChart3, AlertCircle, CheckCircle2 } from "lucide-react"
import { trpc } from "@/lib/trpc"

export default function AdminDashboardPage() {
  const { data: overview, isLoading } = trpc.admin.getSystemOverview.useQuery()
  const { data: alerts } = trpc.admin.getSpendAlerts.useQuery()

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i}>
              <CardContent className="flex justify-center py-6">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <Button asChild>
          <a href="/admin/alerts">
            View Alerts ({alerts?.length || 0})
          </a>
        </Button>
      </div>

      {/* Spend Alerts */}
      {alerts && alerts.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              Spending Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div key={`${alert.provider}-${alert.model}`} className="flex items-center justify-between p-3 rounded-md bg-white dark:bg-yellow-900">
                  <div>
                    <p className="font-medium">{alert.model}</p>
                    <p className="text-sm text-muted-foreground">
                      ${alert.currentSpend.toLocaleString()} / ${alert.budgetLimit.toLocaleString()}
                    </p>
                  </div>
                  <Badge variant={alert.alertLevel === "critical" ? "destructive" : alert.alertLevel === "warning" ? "default" : "secondary"}>
                    {alert.percentage.toFixed(0)}%
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* System Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview?.users || 0}</div>
            <p className="text-xs text-muted-foreground">Total registered users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Organizations</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview?.organizations || 0}</div>
            <p className="text-xs text-muted-foreground">Total organizations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Bank Balance</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${overview?.totalBankBalance?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">Total cash in bank</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Journal Entries</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview?.journalEntries || 0}</div>
            <p className="text-xs text-muted-foreground">Total entries posted</p>
          </CardContent>
        </Card>
      </div>

      {/* AI Provider Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>AI Provider Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm">Anthropic</CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">Claude Sonnet 4.6</p>
                  <p className="text-lg font-bold mt-2">$12,500 / $25,000</p>
                  <p className="text-xs text-muted-foreground">50% of budget used</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm">OpenAI</CardTitle>
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">GPT-4.1</p>
                  <p className="text-lg font-bold mt-2">$9,200 / $20,000</p>
                  <p className="text-xs text-muted-foreground">46% of budget used</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm">Anthropic Haiku</CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">Claude Haiku 4.5</p>
                  <p className="text-lg font-bold mt-2">$850 / $5,000</p>
                  <p className="text-xs text-muted-foreground">17% of budget used</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}