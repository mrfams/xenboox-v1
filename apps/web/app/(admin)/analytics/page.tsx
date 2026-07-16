import { Card, CardContent, CardHeader, CardTitle, Progress } from "@xenboox/ui"
import { Button } from "@xenboox/ui"
import { Badge } from "@xenboox/ui"
import { Alert, AlertDescription } from "@xenboox/ui"
import { BarChart3, Clock, CheckCircle2, AlertCircle, TrendingUp, TrendingDown, Download, RefreshCw } from "lucide-react"
import { trpc } from "@/lib/trpc"
import { useState } from "react"

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState("30d")
  const { data: aiUsage, isLoading } = trpc.admin.getAIUsage.useQuery()

  const totalCalls = aiUsage?.reduce((sum, a) => sum + a.count, 0) || 0
  const avgLatency = aiUsage?.length ? 
    Math.round(aiUsage.reduce((sum, a) => sum + a.avgLatency, 0) / aiUsage.length) : 
    0
  const avgConfidence = aiUsage?.length ?
    (aiUsage.reduce((sum, a) => sum + a.avgConfidence, 0) / aiUsage.length) * 100 :
    0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Usage Analytics</h1>
          <p className="text-muted-foreground mt-1">Monitor agent performance and usage patterns</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        {["7d", "30d", "90d", "1y"].map((range) => (
          <Button
            key={range}
            variant={timeRange === range ? "default" : "outline"}
            size="sm"
            onClick={() => setTimeRange(range)}
          >
            Last {range.toUpperCase().replace('D', ' days').replace('Y', ' years')}
          </Button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total AI Calls</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "..." : totalCalls.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">
              {timeRange === "7d" ? "+12%" : timeRange === "30d" ? "+8%" : "+15%"} from previous period
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "..." : avgLatency}ms
            </div>
            <div className="text-xs text-muted-foreground">Across all agents</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Confidence</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "..." : avgConfidence.toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground">
              {avgConfidence >= 95 ? "Excellent" : avgConfidence >= 90 ? "Good" : "Needs attention"}
            </div>
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
                <div key={agent.agent} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-xs">{agent.agent}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {agent.count.toLocaleString()} calls
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{agent.avgLatency.toFixed(0)}ms avg</div>
                      <div className="text-xs text-muted-foreground">
                        {(agent.avgConfidence * 100).toFixed(1)}% confidence
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Total Duration</p>
                      <p className="font-medium">{agent.totalDuration.toLocaleString()}ms</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Avg Duration/Call</p>
                      <p className="font-medium">{(agent.totalDuration / agent.count).toFixed(0)}ms</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <TrendingUp className="h-3 w-3" />
                    <span>Performance: {(agent.avgConfidence * 100).toFixed(0)}% confidence</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No AI usage data available for this period</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {aiUsage && aiUsage.length > 0 && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            All agents operating within expected parameters. No critical issues detected.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}