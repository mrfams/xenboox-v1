"use client";

import { Card, CardContent, CardHeader, CardTitle, Badge } from "@xenboox/ui";
import { Button } from "@xenboox/ui";
import {
  LayoutDashboard,
  Users,
  Building,
  Bot,
  CreditCard,
  BarChart3,
  Settings,
  Activity,
  TrendingUp,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import Link from "next/link";

function StatCard({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  href?: string;
}) {
  const content = (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}

export default function AdminOverviewPage() {
  const { data: overview, isLoading } = trpc.admin.getSystemOverview.useQuery();
  const { data: aiUsage } = trpc.admin.getAIUsage.useQuery();
  const { data: alerts } = trpc.admin.getSpendAlerts.useQuery();

  const criticalAlerts =
    alerts?.filter((a) => a.alertLevel === "critical") ?? [];
  const warningAlerts = alerts?.filter((a) => a.alertLevel === "warning") ?? [];

  const totalAiCalls = aiUsage?.reduce((sum, a) => sum + a.count, 0) ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Overview</h1>
          <p className="text-muted-foreground mt-1">
            System-wide metrics and health indicators
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/settings">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Link>
          </Button>
        </div>
      </div>

      {/* Alert Banners */}
      {criticalAlerts.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950 p-4">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-red-600" />
            <div>
              <p className="font-medium text-red-800 dark:text-red-200">
                {criticalAlerts.length} critical alert
                {criticalAlerts.length !== 1 ? "s" : ""} require attention
              </p>
              <p className="text-sm text-red-600 dark:text-red-300">
                Some AI providers have exceeded their budget thresholds.
              </p>
            </div>
          </div>
        </div>
      )}

      {warningAlerts.length > 0 && criticalAlerts.length === 0 && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 dark:bg-yellow-950 p-4">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-yellow-600" />
            <div>
              <p className="font-medium text-yellow-800 dark:text-yellow-200">
                {warningAlerts.length} warning alert
                {warningAlerts.length !== 1 ? "s" : ""}
              </p>
              <p className="text-sm text-yellow-600 dark:text-yellow-300">
                Some AI providers are approaching their budget limits.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Users className="h-4 w-4" />}
          label="Total Users"
          value={isLoading ? "..." : (overview?.users ?? 0)}
          href="/admin/users"
        />
        <StatCard
          icon={<Building className="h-4 w-4" />}
          label="Organizations"
          value={isLoading ? "..." : (overview?.organizations ?? 0)}
          href="/admin/organizations"
        />
        <StatCard
          icon={<Bot className="h-4 w-4" />}
          label="AI Calls (30d)"
          value={isLoading ? "..." : totalAiCalls.toLocaleString()}
          href="/admin/analytics"
        />
        <StatCard
          icon={<CreditCard className="h-4 w-4" />}
          label="Total Bank Balance"
          value={
            isLoading
              ? "..."
              : `$${(overview?.totalBankBalance ?? 0).toLocaleString()}`
          }
          href="/admin/financial"
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<BarChart3 className="h-4 w-4" />}
          label="Journal Entries"
          value={isLoading ? "..." : (overview?.journalEntries ?? 0)}
          href="/admin/financial"
        />
        <StatCard
          icon={<Activity className="h-4 w-4" />}
          label="Chart of Accounts"
          value={isLoading ? "..." : (overview?.chartOfAccounts ?? 0)}
        />
        <StatCard
          icon={<Building className="h-4 w-4" />}
          label="Bank Accounts"
          value={isLoading ? "..." : (overview?.bankAccounts ?? 0)}
        />
        <StatCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Documents Processed"
          value={isLoading ? "..." : (overview?.documents ?? 0)}
        />
      </div>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Links</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Button
              variant="outline"
              className="justify-start h-auto py-3"
              asChild
            >
              <Link href="/admin/users">
                <Users className="h-4 w-4 mr-2 shrink-0" />
                Manage Users
              </Link>
            </Button>
            <Button
              variant="outline"
              className="justify-start h-auto py-3"
              asChild
            >
              <Link href="/admin/organizations">
                <Building className="h-4 w-4 mr-2 shrink-0" />
                Manage Organizations
              </Link>
            </Button>
            <Button
              variant="outline"
              className="justify-start h-auto py-3"
              asChild
            >
              <Link href="/admin/analytics">
                <BarChart3 className="h-4 w-4 mr-2 shrink-0" />
                AI Usage Analytics
              </Link>
            </Button>
            <Button
              variant="outline"
              className="justify-start h-auto py-3"
              asChild
            >
              <Link href="/admin/alerts">
                <Activity className="h-4 w-4 mr-2 shrink-0" />
                System Alerts
              </Link>
            </Button>
            <Button
              variant="outline"
              className="justify-start h-auto py-3"
              asChild
            >
              <Link href="/admin/spending">
                <CreditCard className="h-4 w-4 mr-2 shrink-0" />
                Spending & Budget
              </Link>
            </Button>
            <Button
              variant="outline"
              className="justify-start h-auto py-3"
              asChild
            >
              <Link href="/admin/settings">
                <Settings className="h-4 w-4 mr-2 shrink-0" />
                Admin Settings
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
