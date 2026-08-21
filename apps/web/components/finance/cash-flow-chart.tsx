/**
 * Cash Flow Chart — Visual representation of money flow.
 *
 * Features:
 * - Waterfall chart showing incoming vs outgoing
 * - Time range selector
 * - Summary stats
 * - Interactive tooltips
 */

"use client";

import { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@xenboox/ui";
import { Button } from "@xenboox/ui";
import { Badge } from "@xenboox/ui";
import { Tabs, TabsList, TabsTrigger } from "@xenboox/ui";
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
} from "lucide-react";
import { cn } from "@xenboox/ui";
import { formatCurrency } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────

interface CashFlowData {
  dailyBalances: Record<string, number>;
  currentBalance: number;
  incoming: number;
  outgoing: number;
  netChange: number;
  periodStart: string;
  periodEnd: string;
}

type TimeRange = "7d" | "30d" | "90d" | "ytd";

// ─── Component ────────────────────────────────────────────────────────────

export function CashFlowChart({
  data,
  isLoading,
}: {
  data?: CashFlowData;
  isLoading?: boolean;
}) {
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");

  // Process data for chart
  const chartData = useMemo(() => {
    if (!data?.dailyBalances) return [];

    const entries = Object.entries(data.dailyBalances)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-30); // Last 30 days

    return entries.map(([date, balance], index) => {
      const prevBalance = index > 0 ? entries[index - 1][1] : 0;
      const dailyChange = balance - prevBalance;

      return {
        date: new Date(date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        balance,
        incoming: dailyChange > 0 ? dailyChange : 0,
        outgoing: dailyChange < 0 ? Math.abs(dailyChange) : 0,
      };
    });
  }, [data]);

  // Summary stats
  const stats = useMemo(() => {
    if (!data) return null;

    return {
      currentBalance: data.currentBalance,
      incoming: data.incoming,
      outgoing: data.outgoing,
      netChange: data.netChange,
      netChangePercent:
        data.outgoing > 0
          ? ((data.netChange / data.outgoing) * 100).toFixed(1)
          : "0",
    };
  }, [data]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Cash Flow</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">
              Loading...
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || chartData.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Cash Flow</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No cash flow data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Cash Flow</CardTitle>
          <Tabs
            value={timeRange}
            onValueChange={(v) => setTimeRange(v as TimeRange)}
          >
            <TabsList className="h-7">
              <TabsTrigger value="7d" className="text-[10px] px-2">
                7D
              </TabsTrigger>
              <TabsTrigger value="30d" className="text-[10px] px-2">
                30D
              </TabsTrigger>
              <TabsTrigger value="90d" className="text-[10px] px-2">
                90D
              </TabsTrigger>
              <TabsTrigger value="ytd" className="text-[10px] px-2">
                YTD
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div>
            <p className="text-xs text-muted-foreground">Current Balance</p>
            <p className="text-lg font-bold">
              {formatCurrency(stats!.currentBalance)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Incoming</p>
            <p className="text-lg font-bold text-green-600">
              +{formatCurrency(stats!.incoming)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Outgoing</p>
            <p className="text-lg font-bold text-red-600">
              -{formatCurrency(stats!.outgoing)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Net Change</p>
            <p
              className={cn(
                "text-lg font-bold",
                stats!.netChange >= 0 ? "text-green-600" : "text-red-600",
              )}
            >
              {stats!.netChange >= 0 ? "+" : ""}
              {formatCurrency(stats!.netChange)}
            </p>
          </div>
        </div>

        {/* Waterfall Chart */}
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                formatter={(value: number, name: string) => [
                  formatCurrency(value),
                  name === "incoming"
                    ? "Incoming"
                    : name === "outgoing"
                      ? "Outgoing"
                      : "Balance",
                ]}
              />
              <Legend
                wrapperStyle={{ fontSize: "11px" }}
                formatter={(value) =>
                  value === "incoming"
                    ? "Incoming"
                    : value === "outgoing"
                      ? "Outgoing"
                      : "Balance"
                }
              />
              <ReferenceLine y={0} stroke="#000" strokeDasharray="3 3" />
              <Bar
                dataKey="incoming"
                fill="#10b981"
                stackId="stack"
                radius={[2, 2, 0, 0]}
              />
              <Bar
                dataKey="outgoing"
                fill="#ef4444"
                stackId="stack"
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Cash Runway Indicator */}
        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Cash Runway</span>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold">
                {stats!.outgoing > 0
                  ? `${Math.floor(stats!.currentBalance / (stats!.outgoing / 30))} days`
                  : "∞"}
              </p>
              <p className="text-[10px] text-muted-foreground">
                Based on 30-day average spend
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
