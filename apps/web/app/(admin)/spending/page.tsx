import { Card, CardContent, CardHeader, CardTitle, Progress, Badge } from "@xenboox/ui"
import { Button } from "@xenboox/ui"
import { Alert, AlertDescription } from "@xenboox/ui"
import { AlertCircle, CheckCircle2, Settings, Plus } from "lucide-react"
import { trpc } from "@/lib/trpc"

export default function SpendingPage() {
  const { data: comparison, isLoading } = trpc.admin.getAIComparison.useQuery()
  const { data: alerts } = trpc.admin.getSpendAlerts.useQuery()

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Spending & Budget</h1>
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
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

  const getAlertVariant = (level: string) => {
    if (level === "critical") return "destructive"
    if (level === "warning") return "default"
    return "secondary"
  }

  const getAlertColor = (level: string) => {
    if (level === "critical") return "text-red-600"
    if (level === "warning") return "text-yellow-600"
    return "text-green-600"
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Spending & Budget</h1>
          <p className="text-muted-foreground mt-1">Monitor AI spending against budgets</p>
        </div>
        <Button variant="outline">
          <Settings className="h-4 w-4 mr-2" />
          Manage Budgets
        </Button>
      </div>

      {/* Active Alerts */}
      {alerts && alerts.length > 0 && (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <Alert key={`${alert.provider}-${alert.model}`} className={alert.alertLevel === "critical" ? "border-red-200 bg-red-50" : alert.alertLevel === "warning" ? "border-yellow-200 bg-yellow-50" : "border-green-200 bg-green-50"}>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{alert.model}</p>
                    <p className="text-sm">
                      ${alert.currentSpend.toLocaleString()} of ${alert.budgetLimit.toLocaleString()} budget used
                    </p>
                  </div>
                  <Badge variant={getAlertVariant(alert.alertLevel)}>
                    {alert.percentage.toFixed(0)}%
                  </Badge>
                </div>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {(!alerts || alerts.length === 0) && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription>
            All AI providers are within budget limits. No alerts at this time.
          </AlertDescription>
        </Alert>
      )}

      {/* Budget Progress */}
      <div className="grid gap-4 md:grid-cols-3">
        {comparison?.map((provider) => (
          <Card key={`${provider.provider}-${provider.model}`}>
            <CardHeader>
              <CardTitle className="text-base">{provider.model}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Spending</span>
                  <span className="text-sm font-medium">
                    ${provider.monthlySpend.toLocaleString()} / ${provider.budgetLimit.toLocaleString()}
                  </span>
                </div>
                <Progress 
                  value={provider.utilization} 
                  className={`h-2 ${provider.utilization >= 80 ? "bg-red-100" : provider.utilization >= 60 ? "bg-yellow-100" : "bg-green-100"}`}
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>{provider.utilization >= 80 ? "⚠️ Critical" : provider.utilization >= 60 ? "⚡ Warning" : "✅ OK"}</span>
                  <span>{provider.utilization.toFixed(0)}%</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Cost per 1K tokens</p>
                  <p className="font-medium">${provider.costPer1kTokens}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Avg Latency</p>
                  <p className="font-medium">{provider.avgLatencyMs}ms</p>
                </div>
              </div>

              <Button variant="outline" size="sm" className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Adjust Budget
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Budget Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Budget Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <h4 className="font-medium">Alert Thresholds</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• <span className="text-yellow-600">Warning</span>: 70-79% of budget</li>
                  <li>• <span className="text-red-600">Critical</span>: 80%+ of budget</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">Notification Settings</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Email alerts: Enabled</li>
                  <li>• Slack alerts: Disabled</li>
                  <li>• SMS alerts: Disabled</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">Auto-scaling</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Auto-budget increase: Disabled</li>
                  <li>• Provider fallback: Enabled</li>
                  <li>• Cost optimization: Active</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}