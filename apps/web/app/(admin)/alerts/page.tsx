import { Card, CardContent, CardHeader, CardTitle } from "@xenboox/ui"
import { Badge } from "@xenboox/ui"
import { AlertCircle, CheckCircle2, Shield, TrendingUp, User, FileText } from "lucide-react"
import { trpc } from "@/lib/trpc"

export default function AlertsPage() {
  const { data: alerts } = trpc.admin.getSpendAlerts.useQuery()

  const criticalAlerts = alerts?.filter(a => a.alertLevel === "critical") || []
  const warningAlerts = alerts?.filter(a => a.alertLevel === "warning") || []
  const lowAlerts = alerts?.filter(a => a.alertLevel === "low") || []

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Alerts</h1>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Critical</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{criticalAlerts.length}</div>
            <p className="text-xs text-muted-foreground">Requires immediate attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Warning</CardTitle>
            <Shield className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{warningAlerts.length}</div>
            <p className="text-xs text-muted-foreground">Monitor closely</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">All Clear</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{lowAlerts.length}</div>
            <p className="text-xs text-muted-foreground">Within normal limits</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {alerts && alerts.length > 0 ? (
              alerts.map((alert) => (
                <div key={`${alert.provider}-${alert.model}`} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{alert.model}</p>
                      <p className="text-sm text-muted-foreground">
                        ${alert.currentSpend.toLocaleString()} of ${alert.budgetLimit.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <Badge variant={alert.alertLevel === "critical" ? "destructive" : alert.alertLevel === "warning" ? "default" : "secondary"}>
                    {alert.percentage.toFixed(0)}%
                  </Badge>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <p className="text-muted-foreground">No active alerts</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}