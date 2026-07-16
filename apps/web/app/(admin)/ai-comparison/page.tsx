import { Card, CardContent, CardHeader, CardTitle } from "@xenboox/ui"
import { Button } from "@xenboox/ui"
import { Badge } from "@xenboox/ui"
import { CheckCircle2, AlertCircle, TrendingUp } from "lucide-react"
import { trpc } from "@/lib/trpc"
import { AIProvider } from "@/lib/types"

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

  const getRecommendation = () => {
    if (!comparison) return "Continue with current providers"
    
    const anthropicCost = comparison.find(c => c.provider === "anthropic" && c.model.includes("sonnet"))
    const openaiCost = comparison.find(c => c.provider === "openai" && c.model.includes("gpt"))
    
    if (anthropicCost && anthropicCost.utilization < 70 && openaiCost && openaiCost.utilization > 80) {
      return "Consider shifting load to Anthropic - lower cost, similar performance"
    }
    
    return "Current provider mix is optimal"
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Provider Comparison</h1>
          <p className="text-muted-foreground mt-1">Cost, performance, and utilization metrics</p>
        </div>
        <Button>{getRecommendation()}</Button>
      </div>

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

      {/* Provider Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {comparison?.map((provider) => (
          <Card key={`${provider.provider}-${provider.model}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm">{provider.provider}</CardTitle>
              <Badge variant={provider.utilization >= 80 ? "destructive" : provider.utilization >= 60 ? "default" : "secondary"}>
                {provider.utilization.toFixed(0)}% utilized
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground">Model</p>
                <p className="font-medium">{provider.model}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Cost per 1K tokens</p>
                  <p className="font-medium">${provider.costPer1kTokens}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Avg Latency</p>
                  <p className="font-medium">{provider.avgLatencyMs}ms</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Success Rate</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-muted rounded-full">
                    <div 
                      className="h-full bg-green-500 rounded-full" 
                      style={{ width: `${provider.successRate * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium">{provider.successRate * 100}%</span>
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Spending</p>
                <div className="flex items-center justify-between">
                  <span className="font-medium">${provider.monthlySpend.toLocaleString()}</span>
                  <span className="text-muted-foreground">/${provider.budgetLimit.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="p-3 rounded-md bg-green-50 dark:bg-green-950">
              <p className="font-medium text-green-800 dark:text-green-200">
                ✅ Anthropic Sonnet 4.6 is under budget - continue using for complex tasks
              </p>
            </div>
            <div className="p-3 rounded-md bg-yellow-50 dark:bg-yellow-950">
              <p className="font-medium text-yellow-800 dark:text-yellow-200">
                ⚠️ OpenAI GPT-4.1 approaching budget limit - consider cost optimization
              </p>
            </div>
            <div className="p-3 rounded-md bg-green-50 dark:bg-green-950">
              <p className="font-medium text-green-800 dark:text-green-200">
                ✅ Anthropic Haiku 4.5 is most cost-effective - good for simple queries
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}