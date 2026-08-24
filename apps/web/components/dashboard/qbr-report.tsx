"use client";

import { useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  FileText,
  Target,
  Lightbulb,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { Badge } from "@/components/ui";

type Quarter = "Q1" | "Q2" | "Q3" | "Q4";

function getCurrentQuarter(): {
  quarter: Quarter;
  year: number;
  label: string;
} {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  const q = Math.floor(month / 3) + 1;
  return {
    quarter: `Q${q}` as Quarter,
    year,
    label: `Q${q} ${year}`,
  };
}

function getPreviousQuarter(
  quarter: Quarter,
  year: number,
): { quarter: Quarter; year: number; label: string } {
  const qNum = parseInt(quarter.slice(1));
  if (qNum === 1) {
    return { quarter: "Q4", year: year - 1, label: `Q4 ${year - 1}` };
  }
  return {
    quarter: `Q${qNum - 1}` as Quarter,
    year,
    label: `Q${qNum - 1} ${year}`,
  };
}

interface KPICardProps {
  title: string;
  value: string;
  change?: number;
  icon: typeof DollarSign;
  description?: string;
}

function KPICard({
  title,
  value,
  change,
  icon: Icon,
  description,
}: KPICardProps) {
  const isPositive = change !== undefined && change >= 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change !== undefined && (
          <div className="flex items-center gap-1 mt-1">
            {isPositive ? (
              <ArrowUpRight className="h-3 w-3 text-green-500" />
            ) : (
              <ArrowDownRight className="h-3 w-3 text-red-500" />
            )}
            <span
              className={`text-xs ${isPositive ? "text-green-500" : "text-red-500"}`}
            >
              {Math.abs(change).toFixed(1)}% vs last quarter
            </span>
          </div>
        )}
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

export function QBRReport() {
  const current = useMemo(() => getCurrentQuarter(), []);
  const previous = useMemo(
    () => getPreviousQuarter(current.quarter, current.year),
    [current],
  );

  const { data: overview, isLoading } = trpc.reports.getOverview.useQuery({});

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-4 w-24 bg-muted animate-pulse rounded mb-2" />
                <div className="h-8 w-32 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Calculate QBR metrics from available data
  const totalRevenue = overview?.revenue ?? 0;
  const totalExpenses = overview?.operatingExpenses ?? 0;
  const netIncome = overview?.netProfit ?? 0;
  const margin = totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Quarter Header */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">
                {current.label} Business Review
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Comparing to {previous.label}
              </p>
            </div>
            <Badge variant="secondary" className="text-sm">
              AI-Generated
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* KPI Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Revenue"
          value={`$${totalRevenue.toLocaleString()}`}
          icon={DollarSign}
          description="Total income this quarter"
        />
        <KPICard
          title="Expenses"
          value={`$${totalExpenses.toLocaleString()}`}
          icon={TrendingDown}
          description="Total costs this quarter"
        />
        <KPICard
          title="Net Income"
          value={`$${netIncome.toLocaleString()}`}
          change={margin}
          icon={TrendingUp}
          description={`${margin.toFixed(1)}% profit margin`}
        />
        <KPICard
          title="Gross Profit"
          value={`$${(overview?.grossProfit ?? 0).toLocaleString()}`}
          icon={TrendingUp}
          description={`${(((overview?.grossProfit ?? 0) / Math.max(totalRevenue, 1)) * 100).toFixed(1)}% margin`}
        />
      </div>

      {/* Financial Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Financial Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border p-4">
                <h4 className="text-sm font-medium text-muted-foreground">
                  Revenue Breakdown
                </h4>
                <p className="text-2xl font-bold mt-1">
                  ${totalRevenue.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  COGS: ${(overview?.cogs ?? 0).toLocaleString()}
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <h4 className="text-sm font-medium text-muted-foreground">
                  Expense Breakdown
                </h4>
                <p className="text-2xl font-bold mt-1">
                  ${totalExpenses.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Gross Profit: ${(overview?.grossProfit ?? 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            AI Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {margin < 10 && (
              <div className="flex items-start gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-950">
                <Target className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">
                    Low profit margin ({margin.toFixed(1)}%)
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Consider reviewing expense categories for cost optimization
                    opportunities.
                  </p>
                </div>
              </div>
            )}
            {margin >= 10 && (
              <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
                <Target className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">
                    Healthy profit margin ({margin.toFixed(1)}%)
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Financial performance is strong. Consider reinvesting in
                    growth initiatives.
                  </p>
                </div>
              </div>
            )}
            <div className="flex items-start gap-3 rounded-lg border p-4">
              <Lightbulb className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium">Next quarter focus</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Review outstanding receivables and follow up on overdue
                  invoices to improve cash flow.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
