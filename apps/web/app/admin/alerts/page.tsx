"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
} from "@xenboox/ui";
import {
  AlertCircle,
  CheckCircle2,
  Shield,
  Settings,
  RefreshCw,
} from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription } from "@xenboox/ui";
import { useRouter } from "next/navigation";

import { trpc } from "@/lib/trpc/client";

export default function AlertsPage() {
  const router = useRouter();
  const [_showResolved, _setShowResolved] = useState(false);
  const { data: alerts, refetch } = trpc.admin.getSpendAlerts.useQuery();

  const criticalAlerts =
    alerts?.filter((a) => a.alertLevel === "critical") || [];
  const warningAlerts = alerts?.filter((a) => a.alertLevel === "warning") || [];
  const lowAlerts = alerts?.filter((a) => a.alertLevel === "low") || [];
  const activeAlerts = [...criticalAlerts, ...warningAlerts, ...lowAlerts];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Alerts</h1>
          <p className="text-muted-foreground mt-1">
            Monitor and manage system alerts across all services
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => router.push("/admin/settings")}
          >
            <Settings className="h-4 w-4 mr-2" />
            Alert Settings
          </Button>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Critical</CardTitle>
            <AlertCircle className="h-4 w-4 text-error-clay" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {criticalAlerts.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Requires immediate attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Warning</CardTitle>
            <Shield className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {warningAlerts.length}
            </div>
            <p className="text-xs text-muted-foreground">Monitor closely</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">All Clear</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-balanced-green" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {lowAlerts.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Within normal limits
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activeAlerts.length > 0 ? (
              activeAlerts.map((alert) => (
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
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{alert.model}</p>
                        <p className="text-sm">
                          ${alert.currentSpend.toLocaleString()} of $
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
                  </AlertDescription>
                </Alert>
              ))
            ) : (
              <div className="text-center py-8">
                <CheckCircle2 className="h-12 w-12 text-balanced-green mx-auto mb-4" />
                <p className="text-muted-foreground">No active alerts</p>
                <p className="text-sm text-muted-foreground mt-1">
                  All systems operating normally
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {activeAlerts.length === 0 && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription>
            All systems are healthy. No active alerts to report.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
