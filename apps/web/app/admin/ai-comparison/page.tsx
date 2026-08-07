"use client";

import { Card, CardContent, CardHeader, CardTitle, Badge } from "@xenboox/ui";
import { Button } from "@xenboox/ui";
import {
  AlertCircle,
  Server,
  Cloud,
  Calculator,
  BarChart3,
} from "lucide-react";
import { useState } from "react";
import { Alert } from "@xenboox/ui";

import { trpc } from "@/lib/trpc/client";
import { AIComparison } from "@/lib/types";

export default function AIComparisonPage() {
  const [viewMode, setViewMode] = useState<"cards" | "graph">("cards");
  const { data: comparison, isLoading } = trpc.admin.getAIComparison.useQuery();
  const { data: alerts } = trpc.admin.getSpendAlerts.useQuery();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">
          AI Provider Comparison
        </h1>
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
    );
  }

  const totalTokens =
    comparison?.reduce((sum, c) => sum + c.monthlyTokens, 0) ?? 0;
  const totalSpend =
    comparison?.reduce((sum, c) => sum + c.monthlySpend, 0) ?? 0;
  const ___comparisonLength = comparison?.length ?? 1;
  const avgLatency =
    comparison?.reduce((sum, c) => sum + c.avgLatencyMs, 0) ?? 0;
  const avgSuccessRate =
    comparison?.reduce((sum, c) => sum + c.successRate, 0) ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            AI Provider Comparison
          </h1>
          <p className="text-muted-foreground mt-1">
            API vs Self-hosted cost analysis with break-even calculations
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === "cards" ? "default" : "outline"}
            onClick={() => setViewMode("cards")}
          >
            Cards View
          </Button>
          <Button
            variant={viewMode === "graph" ? "default" : "outline"}
            onClick={() => setViewMode("graph")}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Graph View
          </Button>
        </div>
      </div>

      {/* Performance Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Xenboox AI Performance Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground">Total Tokens</p>
              <p className="font-bold text-2xl">
                {(totalTokens / 1000000).toFixed(1)}M
              </p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground">Total Spend</p>
              <p className="font-bold text-2xl">
                ${totalSpend.toLocaleString()}
              </p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground">Avg Latency</p>
              <p className="font-bold text-2xl">{avgLatency.toFixed(0)}ms</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground">Success Rate</p>
              <p className="font-bold text-2xl">
                {(avgSuccessRate * 100).toFixed(0)}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cost Comparison Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Cost Comparison Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {comparison?.map((provider: AIComparison) => (
              <Card
                key={`${provider.provider}-${provider.model}`}
                className="border-2"
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    {provider.deploymentMode === "self-hosted" ? (
                      <Server className="h-4 w-4" />
                    ) : (
                      <Cloud className="h-4 w-4" />
                    )}
                    {provider.provider} - {provider.model}
                  </CardTitle>
                  <Badge
                    variant={
                      provider.deploymentMode === "self-hosted"
                        ? "default"
                        : "outline"
                    }
                  >
                    {provider.deploymentMode}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <p className="text-xs text-muted-foreground">API Cost</p>
                      <p className="font-bold">
                        ${provider.monthlySpend.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Self-Host</p>
                      <p className="font-bold">
                        ${provider.selfHostCostPerMonth.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <Alert
                    className={
                      provider.recommendation === "self-host"
                        ? "border-green-200 bg-green-50"
                        : provider.recommendation === "hybrid"
                          ? "border-yellow-200 bg-yellow-50"
                          : "border-blue-200 bg-blue-50"
                    }
                  >
                    {provider.recommendation === "self-host"
                      ? `Self-host recommended - $${(provider.monthlySpend - provider.selfHostCostPerMonth).toFixed(0)}/mo savings`
                      : provider.recommendation === "hybrid"
                        ? `Hybrid approach - $${(provider.monthlySpend - provider.selfHostCostPerMonth).toFixed(0)}/mo potential savings`
                        : `API recommended - within budget limits`}
                  </Alert>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Graph View */}
      {viewMode === "graph" && comparison && (
        <Card>
          <CardHeader>
            <CardTitle>Cost Comparison Graph</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="h-80 flex items-end justify-around px-4">
                {comparison.slice(0, 8).map((provider, idx) => {
                  const maxSpend = Math.max(
                    ...comparison.map((p) => p.monthlySpend),
                  );
                  const apiHeight = (provider.monthlySpend / maxSpend) * 200;
                  const selfHostHeight =
                    (provider.selfHostCostPerMonth / maxSpend) * 200;
                  const height = Math.max(apiHeight, selfHostHeight);

                  return (
                    <div key={idx} className="flex flex-col items-center">
                      <div
                        className="w-16 bg-gray-100 dark:bg-gray-800 rounded-t-lg relative"
                        style={{ height: `${height}px` }}
                      >
                        <div className="absolute -top-6 left-0 right-0 text-center">
                          <div className="text-xs font-medium truncate max-w-20">
                            {provider.provider}
                          </div>
                        </div>
                        <div
                          className="absolute -top-4 left-1/2 transform -translate-x-1/2 w-8 h-4 bg-blue-500 rounded-sm"
                          title={`API: $${provider.monthlySpend}`}
                        ></div>
                        <div
                          className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 w-8 h-4 bg-green-500 rounded-sm"
                          title={`Self-host: $${provider.selfHostCostPerMonth}`}
                        ></div>
                      </div>
                      <span className="text-xs mt-2 w-16 text-center truncate">
                        {provider.model.split("-")[0]}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-center gap-8 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-500 rounded"></div>
                  <span>API Cost</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500 rounded"></div>
                  <span>Self-Host Cost</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
                <div
                  key={`${alert.provider}-${alert.model}`}
                  className="flex items-center justify-between p-3 rounded-md bg-white dark:bg-yellow-900"
                >
                  <div>
                    <p className="font-medium">{alert.model}</p>
                    <p className="text-sm text-muted-foreground">
                      ${alert.currentSpend.toLocaleString()} / $
                      {alert.budgetLimit.toLocaleString()}
                    </p>
                  </div>
                  <Badge
                    variant={
                      alert.alertLevel === "critical"
                        ? "destructive"
                        : alert.alertLevel === "warning"
                          ? "default"
                          : "secondary"
                    }
                  >
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
        {comparison?.map((provider: AIComparison) => (
          <Card
            key={`${provider.provider}-${provider.model}`}
            className="border-2"
          >
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{provider.model}</span>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      provider.deploymentMode === "self-hosted"
                        ? "default"
                        : "outline"
                    }
                  >
                    {provider.deploymentMode === "self-hosted" ? (
                      <Server className="h-3 w-3 mr-1" />
                    ) : (
                      <Cloud className="h-3 w-3 mr-1" />
                    )}
                    {provider.deploymentMode}
                  </Badge>
                  <Badge
                    variant={
                      provider.utilization >= 80
                        ? "destructive"
                        : provider.utilization >= 60
                          ? "default"
                          : "secondary"
                    }
                  >
                    {provider.utilization.toFixed(0)}%
                  </Badge>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">
                  Performance
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Cost per M tokens</span>
                    <span className="font-medium">
                      ${provider.costPerMTokens.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Avg Latency</span>
                    <span className="font-medium">
                      {provider.avgLatencyMs}ms
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Success Rate</span>
                    <span className="font-medium">
                      {(provider.successRate * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">
                  Usage
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Monthly Tokens</span>
                    <span className="font-medium">
                      {(provider.monthlyTokens / 1000000).toFixed(1)}M
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Break-even Point</span>
                    <span className="font-medium">
                      {(provider.breakEvenTokens / 1000000).toFixed(1)}M tokens
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Hosting</span>
                    <Badge variant="outline">
                      {provider.hostingProvider || "N/A"}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">
                  Spending
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">API Cost</span>
                    <span className="font-medium">
                      ${provider.monthlySpend.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Self-Host Cost</span>
                    <span className="font-medium">
                      ${provider.selfHostCostPerMonth.toLocaleString()}
                    </span>
                  </div>
                  {provider.monthlySpend > provider.selfHostCostPerMonth && (
                    <Button variant="outline" size="sm" className="w-full">
                      <Calculator className="h-4 w-4 mr-2" />
                      Switch to Self-Host
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
