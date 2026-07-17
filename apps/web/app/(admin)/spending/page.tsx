"use client"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  Input,
} from "@xenboox/ui";
import {
  AlertCircle,
  CheckCircle2,
  Settings,
  Plus,
  Server,
  Cloud,
  Calculator,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { AIComparison, SpendAlert } from "@/lib/types";
import { useState } from "react";

function Progress({ value }: { value: number }) {
  return (
    <div className="w-full bg-muted rounded-full h-2">
      <div
        className="h-full bg-primary rounded-full transition-all duration-300"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

function Alert({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`p-4 rounded-lg border ${className || ""}`}>{children}</div>
  );
}

export default function SpendingPage() {
  const [showComparison, setShowComparison] = useState(true);
  const { data: comparison, isLoading } = trpc.admin.getAIComparison.useQuery();
  const { data: alerts } = trpc.admin.getSpendAlerts.useQuery();

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
    );
  }

  const getAlertVariant = (level: string) => {
    if (level === "critical") return "destructive";
    if (level === "warning") return "default";
    return "secondary";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Spending & Budget
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitor AI spending against budgets with cost optimization insights
          </p>
        </div>
        <Button variant="outline">
          <Settings className="h-4 w-4 mr-2" />
          Manage Budgets
        </Button>
      </div>

      {/* Active Alerts */}
      {alerts && alerts.length > 0 && (
        <div className="space-y-3">
          {alerts.map((alert: SpendAlert) => (
            <Alert
              key={`${alert.provider}-${alert.model}`}
              className={
                alert.alertLevel === "critical"
                  ? "border-red-200 bg-red-50"
                  : alert.alertLevel === "warning"
                    ? "border-yellow-200 bg-yellow-50"
                    : "border-green-200 bg-green-50"
              }
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{alert.model}</p>
                  <p className="text-sm">
                    ${alert.currentSpend.toLocaleString()} of $
                    {alert.budgetLimit.toLocaleString()} budget used
                  </p>
                </div>
                <Badge variant={getAlertVariant(alert.alertLevel)}>
                  {alert.percentage.toFixed(0)}%
                </Badge>
              </div>
            </Alert>
          ))}
        </div>
      )}

      {(!alerts || alerts.length === 0) && (
        <Alert className="border-green-200 bg-green-50">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span className="text-sm">
              All AI providers are within budget limits. No alerts at this time.
            </span>
          </div>
        </Alert>
      )}

      {/* Budget Progress */}
      <div className="grid gap-4">
        {comparison?.map((provider: AIComparison) => (
          <Card key={`${provider.provider}-${provider.model}`}>
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
                    variant={getAlertVariant(
                      provider.utilization >= 90
                        ? "critical"
                        : provider.utilization >= 80
                          ? "warning"
                          : "low",
                    )}
                  >
                    {provider.utilization.toFixed(0)}%
                  </Badge>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">
                    Spending
                  </span>
                  <span className="text-sm font-medium">
                    ${provider.monthlySpend.toLocaleString()} / $
                    {provider.budgetLimit.toLocaleString()}
                  </span>
                </div>
                <Progress value={provider.utilization} />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>
                    {provider.utilization >= 80
                      ? "⚠️ Critical"
                      : provider.utilization >= 60
                        ? "⚡ Warning"
                        : "✅ OK"}
                  </span>
                  <span>{provider.utilization.toFixed(0)}%</span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">API Cost</p>
                  <p className="font-medium">
                    ${provider.monthlySpend.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Self-Host Cost</p>
                  <p className="font-medium">
                    ${provider.selfHostCostPerMonth.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Cost per 1M tokens</p>
                  <p className="font-medium">
                    ${provider.costPerMTokens.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Avg Latency</p>
                  <p className="font-medium">{provider.avgLatencyMs}ms</p>
                </div>
              </div>

              {provider.monthlySpend > provider.selfHostCostPerMonth && (
                <Button variant="outline" size="sm" className="w-full">
                  <Calculator className="h-4 w-4 mr-2" />
                  Switch to Self-Host ($
                  {Math.max(
                    0,
                    provider.monthlySpend - provider.selfHostCostPerMonth,
                  ).toFixed(0)}
                  /mo savings)
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Cost Optimization */}
      <Card>
        <CardHeader>
          <CardTitle>Cost Optimization</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <h4 className="font-medium">Alert Thresholds</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>
                    • <span className="text-yellow-600">Warning</span>: 70-79%
                    of budget
                  </li>
                  <li>
                    • <span className="text-red-600">Critical</span>: 80%+ of
                    budget
                  </li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">Notification Settings</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Email alerts: Enabled</li>
                  <li>• Slack integration: Available</li>
                  <li>• SMS alerts: Available</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">Cost Optimization</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Auto-budget increase: Disabled</li>
                  <li>• Provider fallback: Enabled</li>
                  <li>• Self-host recommendation: Available</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
