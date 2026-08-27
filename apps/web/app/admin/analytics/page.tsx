"use client";

import { Card, CardContent, CardHeader, CardTitle, Badge } from "@xenboox/ui";
import { Button } from "@xenboox/ui";
import {
  BarChart3,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

import { trpc } from "@/lib/trpc/client";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState("30d");
  const {
    data: aiUsage,
    isLoading,
    isError,
    error,
    refetch,
  } = trpc.admin.getAIUsage.useQuery();

  const totalCalls = aiUsage?.reduce((sum, a) => sum + a.count, 0) || 0;
  const avgLatency = aiUsage?.length
    ? Math.round(
        aiUsage.reduce((sum, a) => sum + a.avgLatency, 0) / aiUsage.length,
      )
    : 0;
  const avgConfidence = aiUsage?.length
    ? (aiUsage.reduce((sum, a) => sum + a.avgConfidence, 0) / aiUsage.length) *
      100
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            AI Usage Analytics
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitor agent performance and usage patterns
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
            className="transition-all duration-300 hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            variant="outline"
            className="transition-all duration-300 hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2"
            onClick={() => {
              if (!aiUsage?.length) {
                toast.info("No AI usage data to export yet");
                return;
              }
              const rows: Array<Array<string | number>> = [
                [
                  "Agent",
                  "Calls",
                  "Avg Latency (ms)",
                  "Confidence",
                  "Total Duration (ms)",
                ],
                ...aiUsage.map((a) => [
                  a.agent,
                  a.count,
                  a.avgLatency.toFixed(0),
                  (a.avgConfidence * 100).toFixed(1),
                  a.totalDuration,
                ]),
              ];
              const csv = rows
                .map((r) =>
                  r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","),
                )
                .join("\n");
              downloadBlob(
                new Blob([csv], { type: "text/csv;charset=utf-8;" }),
                `xenboox-ai-usage-${new Date().toISOString().slice(0, 10)}.csv`,
              );
            }}
          >
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        {(
          [
            { key: "7d", label: "Last 7 days" },
            { key: "30d", label: "Last 30 days" },
            { key: "90d", label: "Last 90 days" },
            { key: "1y", label: "Last year" },
          ] as const
        ).map(({ key, label }) => (
          <Button
            key={key}
            variant={timeRange === key ? "default" : "outline"}
            size="sm"
            onClick={() => setTimeRange(key)}
            className="transition-all duration-300 hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2"
          >
            {label}
          </Button>
        ))}
      </div>

      {/* Error State */}
      {isError && (
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-error-clay mx-auto mb-4" />
            <p className="text-sm text-muted-foreground mb-4">
              {error?.message ||
                "We couldn't load the analytics data. Check your connection and try again."}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void refetch()}
              className="transition-all duration-300 hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try again
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:shadow-lg hover:-translate-y-0.5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total AI Calls
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? (
                <div className="h-8 w-20 bg-muted animate-pulse rounded" />
              ) : (
                totalCalls.toLocaleString()
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              {isLoading ? (
                <div className="h-3 w-24 bg-muted animate-pulse rounded mt-1" />
              ) : (
                <>Across all agents</>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:shadow-lg hover:-translate-y-0.5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Response Time
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? (
                <div className="h-8 w-20 bg-muted animate-pulse rounded" />
              ) : (
                <>{avgLatency}ms</>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              {isLoading ? (
                <div className="h-3 w-24 bg-muted animate-pulse rounded mt-1" />
              ) : (
                <>Across all agents</>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:shadow-lg hover:-translate-y-0.5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Confidence
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-balanced-green" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? (
                <div className="h-8 w-20 bg-muted animate-pulse rounded" />
              ) : (
                <>{avgConfidence.toFixed(1)}%</>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              {isLoading ? (
                <div className="h-3 w-24 bg-muted animate-pulse rounded mt-1" />
              ) : (
                <>
                  {avgConfidence >= 95
                    ? "Excellent"
                    : avgConfidence >= 90
                      ? "Good"
                      : "Needs attention"}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:shadow-lg">
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
                      <Badge variant="outline" className="text-xs">
                        {agent.agent}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {agent.count.toLocaleString()} calls
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {agent.avgLatency.toFixed(0)}ms avg
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {(agent.avgConfidence * 100).toFixed(1)}% confidence
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Total Duration</p>
                      <p className="font-medium">
                        {agent.totalDuration.toLocaleString()}ms
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Avg Duration/Call</p>
                      <p className="font-medium">
                        {(agent.totalDuration / agent.count).toFixed(0)}ms
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No AI usage data available for this period
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {aiUsage && aiUsage.length > 0 && (
        <Card className="transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:shadow-lg">
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 p-3 rounded-md bg-balanced-green/10">
              <CheckCircle2 className="h-4 w-4 text-balanced-green" />
              <span className="text-sm text-foreground">
                All agents operating within expected parameters. No critical
                issues detected.
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
