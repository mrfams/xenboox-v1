import { Card, CardContent, CardHeader, CardTitle } from "@xenboox/ui"
import { Button } from "@xenboox/ui"
import { Badge } from "@xenboox/ui"
import { Alert, AlertDescription } from "@xenboox/ui"
import { Users, Building, Bot, CreditCard, BarChart3, AlertCircle, CheckCircle2, Server, Cloud } from "lucide-react"
import { trpc } from "@/lib/trpc"

export default function AdminDashboardPage() {
  const { data: overview, isLoading } = trpc.admin.getSystemOverview.useQuery()
  const { data: comparison } = trpc.admin.getAIComparison.useQuery()
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
        <Alert className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription>
            <div className="flex items-center gap-2">
              <span className="font-medium">{alerts.length} alert(s) require attention</span>
              <Badge variant="destructive">{alerts.filter(a => a.alertLevel === "critical").length} critical</Badge>
            </div>
          </AlertDescription>
        </Alert>
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

      {/* AI Provider Status */}
      <Card>
        <CardHeader>
          <CardTitle>AI Provider Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {comparison?.map((provider) => {
              const isActive = provider.utilization < 80
              return (
                <Card key={`${provider.provider}-${provider.model}`} className="border-2">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      {provider.deploymentMode === "self-hosted" ? <Server className="h-4 w-4" /> : <Cloud className="h-4 w-4" />}
                      {provider.provider}
                    </CardTitle>
                    <Badge variant={isActive ? "default" : "destructive"}>
                      {provider.deploymentMode}
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">{provider.model}</p>
                    <p className="text-lg font-bold mt-2">${provider.monthlySpend.toLocaleString()} / ${provider.budgetLimit.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{provider.utilization.toFixed(0)}% of budget used</p>
                    <div className="mt-3">
                      <Badge variant={provider.recommendation === "self-host" ? "default" : "outline"}>
                        {provider.recommendation.replace('-', ' ')}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}