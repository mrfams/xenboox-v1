import { Card, CardContent, CardHeader, CardTitle } from "@xenboox/ui"
import { Button } from "@xenboox/ui"
import { Badge } from "@xenboox/ui"
import { Alert, AlertDescription } from "@xenboox/ui"
import { CheckCircle2, AlertCircle, TrendingUp, Cloud, Server } from "lucide-react"
import { trpc } from "@/lib/trpc"
import { AIComparison } from "@/lib/types"

export default function AIComparisonPage() {
  const { data: comparison, isLoading } = trpc.admin.getAIComparison.useQuery()
  const { data: alerts } = trpc.admin.getSpendAlerts.useQuery()

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">AI Provider Comparison</h1>
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

  const getRecommendation = (provider: AIComparison) => {
    if (provider.deploymentMode === "self-hosted") {
      return `Self-hosted: $${provider.selfHostCostPerMonth}/mo (break-even: ${provider.breakEvenTokens.toLocaleString()} tokens)`
    }
    
    const apiVsSelfHost = provider.monthlySpend - provider.selfHostCostPerMonth
    if (apiVsSelfHost > 0) {
      return `API recommended - $${(apiVsSelfHost).toFixed(0)}/mo savings vs self-host`
    }
    return `Self-host recommended - $${(-apiVsSelfHost).toFixed(0)}/mo savings`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Provider Comparison</h1>
          <p className="text-muted-foreground mt-1">API vs Self-hosted cost analysis with break-even calculations</p>
        </div>
      </div>

      {/* Cost Comparison Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Cost Comparison Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {comparison?.map((provider) => (
              <Card key={`${provider.provider}-${provider.model}`} className="border-2">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    {provider.deploymentMode === "self-hosted" ? <Server className="h-4 w-4" /> : <Cloud className="h-4 w-4" />}
                    {provider.provider} - {provider.model}
                  </CardTitle>
                  <Badge variant={
                    provider.recommendation === "self-host" ? "default" : 
                    provider.recommendation === "hybrid" ? "secondary" : "outline"
                  }>
                    {provider.deploymentMode}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <p className="text-xs text-muted-foreground">API Cost</p>
                      <p className="font-bold">${provider.monthlySpend.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Self-Host</p>
                      <p className="font-bold">${provider.selfHostCostPerMonth.toLocaleString()}</p>
                    </div>
                  </div>
                  <Alert className={
                    provider.recommendation === "self-host" ? "border-green-200 bg-green-50" :
                    provider.recommendation === "hybrid" ? "border-yellow-200 bg-yellow-50" :
                    "border-blue-200 bg-blue-50"
                  }>
                    <AlertDescription className="text-center">
                      {getRecommendation(provider)}
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Alerts Section */}
      {alerts && alerts.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              Spending Alerts (80%+ threshold)
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

      {/* Detailed Provider Cards */}
      <div className="grid gap-4">
        {comparison?.map((provider) => (
          <Card key={`${provider.provider}-${provider.model}`}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{provider.provider} - {provider.model}</span>
                <Badge variant={provider.utilization >= 80 ? "destructive" : provider.utilization >= 60 ? "default" : "secondary"}>
                  {provider.utilization.toFixed(0)}% utilized
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">Performance</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Cost per 1K tokens</span>
                    <span className="font-medium">${provider.costPer1kTokens}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Avg Latency</span>
                    <span className="font-medium">{provider.avgLatencyMs}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Success Rate</span>
                    <span className="font-medium">{(provider.successRate * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">Usage</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Monthly Tokens</span>
                    <span className="font-medium">{(provider.monthlyTokens / 1000000).toFixed(1)}M</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Break-even Point</span>
                    <span className="font-medium">{(provider.breakEvenTokens / 1000000).toFixed(1)}M tokens</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Deployment</span>
                    <Badge variant={provider.deploymentMode === "self-hosted" ? "default" : "outline"}>
                      {provider.deploymentMode}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">Spending</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">API Cost</span>
                    <span className="font-medium">${provider.monthlySpend.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Self-Host Cost</span>
                    <span className="font-medium">${provider.selfHostCostPerMonth.toLocaleString()}</span>
                  </div>
                  <div className="pt-2 border-t">
                    <Button 
                      variant={provider.recommendation === "self-host" ? "default" : "outline"}
                      className="w-full"
                    >
                      {provider.recommendation === "self-host" ? "Switch to Self-Host" : "Optimize for Cost"}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}