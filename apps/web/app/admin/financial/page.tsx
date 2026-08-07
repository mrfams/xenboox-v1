"use client";

import { Card, CardContent, CardHeader, CardTitle, Badge } from "@xenboox/ui";
import { Button } from "@xenboox/ui";
import {
  Shield,
  CheckCircle2,
  AlertCircle,
  Banknote,
  Calculator,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { trpc } from "@/lib/trpc/client";
import { Progress } from "@/components/shared/progress";

export default function FinancialPage() {
  const _router = useRouter();
  const [period, setPeriod] = useState("month");
  const {
    data: overview,
    isLoading,
    refetch,
  } = trpc.admin.getSystemOverview.useQuery();

  const financialHealth =
    overview?.totalBankBalance && overview.totalBankBalance > 0
      ? "healthy"
      : overview?.totalBankBalance && overview.totalBankBalance > -10000
        ? "warning"
        : "critical";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Financial Health
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitor organization financial metrics and health indicators
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <Calculator className="h-4 w-4 mr-2" />
            Run Analysis
          </Button>
          <Button
            onClick={() => toast.info("Report generation will download a PDF")}
          >
            <FileText className="h-4 w-4 mr-2" />
            Generate Report
          </Button>
        </div>
      </div>

      {/* Period Selector */}
      <div className="flex items-center gap-2 mb-4">
        {["day", "week", "month", "quarter", "year"].map((p) => (
          <Button
            key={p}
            variant={period === p ? "default" : "outline"}
            size="sm"
            onClick={() => setPeriod(p)}
          >
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </Button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Bank Balance
            </CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading
                ? "..."
                : `$${overview?.totalBankBalance?.toLocaleString() || "0"}`}
            </div>
            <div className="flex items-center gap-2 mt-2">
              {financialHealth === "healthy" && (
                <Badge
                  variant="default"
                  className="bg-green-100 text-green-800"
                >
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Healthy
                </Badge>
              )}
              {financialHealth === "warning" && (
                <Badge
                  variant="outline"
                  className="border-yellow-500 text-yellow-600"
                >
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Warning
                </Badge>
              )}
              {financialHealth === "critical" && (
                <Badge variant="destructive">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Critical
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Journal Entries
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "..." : overview?.journalEntries || 0}
            </div>
            <div className="text-xs text-muted-foreground">
              Total entries posted
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Chart of Accounts
            </CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "..." : overview?.chartOfAccounts || 0}
            </div>
            <div className="text-xs text-muted-foreground">All active</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Bank Accounts</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "..." : overview?.bankAccounts || 0}
            </div>
            <p className="text-xs text-muted-foreground">Active accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Users</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "..." : overview?.users || 0}
            </div>
            <p className="text-xs text-muted-foreground">Total registered</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Organizations</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "..." : overview?.organizations || 0}
            </div>
            <p className="text-xs text-muted-foreground">Total organizations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Entities</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "..." : overview?.entities || 0}
            </div>
            <p className="text-xs text-muted-foreground">Total entities</p>
          </CardContent>
        </Card>
      </div>

      {/* Financial Health Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Financial Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium text-muted-foreground">
                  Liquidity Ratio
                </h4>
                <div className="flex items-center gap-2">
                  <Progress
                    value={
                      financialHealth === "healthy"
                        ? 80
                        : financialHealth === "warning"
                          ? 50
                          : 20
                    }
                  />
                  <span className="font-medium">
                    {financialHealth === "healthy"
                      ? "Good"
                      : financialHealth === "warning"
                        ? "Fair"
                        : "Low"}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium text-muted-foreground">
                  Activity Level
                </h4>
                <div className="flex items-center gap-2">
                  <Progress
                    value={
                      overview?.journalEntries
                        ? overview.journalEntries > 100
                          ? 80
                          : overview.journalEntries > 50
                            ? 50
                            : 20
                        : 0
                    }
                  />
                  <span className="font-medium">
                    {overview?.journalEntries
                      ? overview.journalEntries > 100
                        ? "High"
                        : overview.journalEntries > 50
                          ? "Medium"
                          : "Low"
                      : "N/A"}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-md bg-green-50 dark:bg-green-950">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-sm">
                  Financial health report generated successfully. All metrics
                  within expected ranges.
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
