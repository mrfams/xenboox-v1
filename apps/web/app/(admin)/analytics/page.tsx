import { Card, CardContent, CardHeader, CardTitle } from "@xenboox/ui"
import { Button } from "@xenboox/ui"
import { Badge } from "@xenboox/ui"
import { BarChart3, Clock, CheckCircle2, AlertCircle } from "lucide-react"
import { trpc } from "@/lib/trpc"

export default function AnalyticsPage() {
  const { data: aiUsage, isLoading } = trpc.admin.getAIUsage.useQuery()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">AI Usage Analytics</h1>
        <Button>Export Report</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {aiUsage?.reduce((sum, a) => sum + a.count, 0) || 0}
            </div>
            <p className="text-xs text-muted-foreground">+12% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Latency</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {aiUsage?.length ? 
                Math.round(aiUsage.reduce((sum, a) => sum + a.avgLatency, 0) / aiUsage.length) + "ms" : 
                "0ms"
              }
            </div>
            <p className="text-xs text-muted-foreground">Across all agents</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">98.2%</div>
            <p className="text-xs text-muted-foreground">+0.3% from last week</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Agent Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-8">Loading analytics...</div>
            ) : aiUsage?.length ? (
              aiUsage.map((agent) => (
                <div key={agent.agent} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{agent.agent}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {agent.count} calls
                      </span>
                    </div>
                    <span className="text-sm font-medium">
                      {agent.avgLatency.toFixed(0)}ms avg
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Confidence: {(agent.avgConfidence * 100).toFixed(0)}%</span>
                    <span>Duration: {agent.totalDuration}ms total</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">No AI usage data available</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}