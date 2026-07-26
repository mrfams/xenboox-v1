"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
} from "@/components/ui";
import { StatCard } from "@/components/dashboard/stat-card";
import { Skeleton } from "@/components/shared/loading";
import { EmptyState } from "@/components/shared/empty-state";
import { trpc } from "@/lib/trpc/client";
import { useEntity } from "@/lib/entity-context";
import { formatCurrency, cn } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Users,
  DollarSign,
  PieChart,
  Clock,
  FileText,
  ArrowUpRight,
  MessageSquare,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────

type Budget = {
  id: string;
  name: string;
  fiscalYear: number;
  status: string;
  totalAmount?: string;
  currency?: string;
};

type BudgetLine = {
  id: string;
  lineDescription: string;
  annualAmount: string;
  account?: { name: string; code: string };
};

type ExpenseClaim = {
  id: string;
  claimNumber: string;
  claimantName: string;
  totalAmount: string;
  status: string;
  category: string;
  description?: string;
  createdAt: string;
};

// ─── Budget vs Actual Overview ──────────────────────────────────────────

function BudgetVsActualOverview({
  budgets,
  isLoading,
}: {
  budgets: Budget[];
  isLoading: boolean;
}) {
  const currentYear = new Date().getFullYear();
  const currentBudget = budgets.find((b) => b.fiscalYear === currentYear);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Budget vs Actual
          </CardTitle>
          <Badge variant="outline" className="text-[10px]">
            FY {currentYear}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-48 rounded-lg" />
        ) : currentBudget ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Annual Budget</p>
                <p className="text-2xl font-bold">{formatCurrency(0)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Actual Spend</p>
                <p className="text-2xl font-bold">{formatCurrency(0)}</p>
              </div>
            </div>

            {/* Budget Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0% utilized</span>
                <span>Budget: {formatCurrency(0)}</span>
              </div>
              <div className="h-3 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{ width: "0%" }}
                />
              </div>
            </div>

            {/* Variance Summary */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/10 p-2">
                <p className="text-xs text-emerald-600 font-semibold">
                  On Track
                </p>
                <p className="text-lg font-bold">0</p>
              </div>
              <div className="rounded-lg bg-amber-500/5 border border-amber-500/10 p-2">
                <p className="text-xs text-amber-600 font-semibold">Warning</p>
                <p className="text-lg font-bold">0</p>
              </div>
              <div className="rounded-lg bg-red-500/5 border border-red-500/10 p-2">
                <p className="text-xs text-red-600 font-semibold">
                  Over Budget
                </p>
                <p className="text-lg font-bold">0</p>
              </div>
            </div>

            <Link href="/dashboard/budget/pipeline">
              <Button variant="ghost" size="sm" className="w-full text-xs">
                Open Budget Dashboard <ChevronRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </div>
        ) : (
          <EmptyState
            icon={<PieChart className="h-8 w-8" />}
            title="No budget set for this year"
            description="Create a budget to track spending against your plan."
            action={
              <Link href="/dashboard/budget">
                <Button size="sm">Create Budget</Button>
              </Link>
            }
            className="py-4"
          />
        )}
      </CardContent>
    </Card>
  );
}

// ─── Team Expense Approvals ────────────────────────────────────────────

function TeamExpenseApprovals({
  claims,
  isLoading,
}: {
  claims: ExpenseClaim[];
  isLoading: boolean;
}) {
  const pendingClaims = claims.filter(
    (c) => c.status === "submitted" || c.status === "flagged",
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Team Expense Approvals
          </CardTitle>
          {pendingClaims.length > 0 && (
            <Badge variant="destructive" className="text-[10px]">
              {pendingClaims.length} pending
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 rounded-lg" />
            <Skeleton className="h-16 rounded-lg" />
          </div>
        ) : pendingClaims.length > 0 ? (
          <div className="space-y-2">
            {pendingClaims.slice(0, 5).map((claim) => (
              <Link
                key={claim.id}
                href={`/dashboard/expense/${claim.id}`}
                className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-accent/50"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">
                      {claim.claimantName}
                    </span>
                    {claim.status === "flagged" && (
                      <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {claim.description ?? claim.category}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(claim.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className="text-sm font-semibold tabular-nums">
                    {formatCurrency(parseFloat(claim.totalAmount))}
                  </p>
                  <Badge
                    variant={
                      claim.status === "flagged" ? "destructive" : "secondary"
                    }
                    className="text-[10px]"
                  >
                    {claim.status}
                  </Badge>
                </div>
              </Link>
            ))}
            {pendingClaims.length > 5 && (
              <p className="text-center text-xs text-muted-foreground">
                +{pendingClaims.length - 5} more pending
              </p>
            )}
            <Link href="/dashboard/expense">
              <Button
                variant="default"
                size="sm"
                className="w-full mt-2 gap-1.5"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                Review All Claims
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        ) : (
          <EmptyState
            icon={<CheckCircle2 className="h-8 w-8 text-emerald-500" />}
            title="All claims reviewed"
            description="No pending expense approvals from your team."
            className="py-4"
          />
        )}
      </CardContent>
    </Card>
  );
}

// ─── Department Team Overview ──────────────────────────────────────────

function DepartmentTeamOverview() {
  // Sample team data — in production this would come from a tRPC endpoint
  const teamMembers = [
    { name: "Sarah Mensah", pendingExpenses: 2, totalMonth: 450.0 },
    { name: "John Osei", pendingExpenses: 0, totalMonth: 120.0 },
    { name: "Ama Boateng", pendingExpenses: 1, totalMonth: 780.0 },
    { name: "Kwame Asante", pendingExpenses: 3, totalMonth: 320.0 },
    { name: "Esi Quansah", pendingExpenses: 0, totalMonth: 0 },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Team Overview
          </CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {teamMembers.map((member) => (
            <div
              key={member.name}
              className="flex items-center justify-between rounded-lg border px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{member.name}</p>
                <p className="text-xs text-muted-foreground">
                  {member.pendingExpenses > 0
                    ? `${member.pendingExpenses} pending`
                    : "All caught up"}
                </p>
              </div>
              <div className="text-right shrink-0 ml-3">
                <p className="text-sm font-semibold tabular-nums">
                  {formatCurrency(member.totalMonth)}
                </p>
                <p className="text-xs text-muted-foreground">This month</p>
              </div>
            </div>
          ))}
        </div>
        <Link href="/dashboard/team">
          <Button variant="ghost" size="sm" className="w-full mt-3 text-xs">
            View full team <ChevronRight className="ml-1 h-3 w-3" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

// ─── Main Dashboard Component ──────────────────────────────────────────

export function DepartmentManagerDashboard() {
  const { entityId } = useEntity();

  const { data: budgets, isLoading: budgetLoading } =
    trpc.budget.listBudgets.useQuery(undefined, { enabled: !!entityId });
  const { data: expenseClaimsData, isLoading: expenseLoading } =
    trpc.expense.listClaims.useQuery(undefined, { enabled: !!entityId });
  const expenseClaims = (expenseClaimsData ?? []) as unknown as ExpenseClaim[];
  const { data: pendingApprovals } = trpc.ingestion.getStats.useQuery(
    undefined,
    { enabled: !!entityId, refetchInterval: 60000 },
  );

  const isLoading = budgetLoading || expenseLoading;

  // Compute metrics
  const pendingClaimCount = useMemo(
    () =>
      expenseClaims.filter(
        (c) => c.status === "submitted" || c.status === "flagged",
      ).length,
    [expenseClaims],
  );

  const pendingApprovalCount = useMemo(
    () =>
      (pendingApprovals as { pendingReview?: number } | undefined)
        ?.pendingReview ?? 0,
    [pendingApprovals],
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-64 lg:col-span-2 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Department Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Budget tracking, team expense approvals, and variance monitoring.
          </p>
        </div>
        <Badge variant="outline" className="text-xs gap-1">
          <Users className="h-3 w-3" />
          Department Manager
        </Badge>
      </div>

      {/* Stats Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<DollarSign className="h-4 w-4" />}
          label="Dept Budget (FY)"
          value={formatCurrency(0)}
          changeLabel="Annual allocation"
          href="/dashboard/budget"
        />
        <StatCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Spent This Month"
          value={formatCurrency(0)}
          changeLabel="Department total"
          href="/dashboard/expense"
        />
        <StatCard
          icon={<Clock className="h-4 w-4" />}
          label="Pending Approvals"
          value={String(pendingClaimCount + pendingApprovalCount)}
          changeLabel={
            pendingClaimCount > 0
              ? `${pendingClaimCount} expense claims`
              : "No pending items"
          }
          href="/dashboard/expense"
        />
        <StatCard
          icon={<Users className="h-4 w-4" />}
          label="Team Size"
          value="5"
          changeLabel="Department members"
          href="/dashboard/team"
        />
      </div>

      {/* Main Content */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <BudgetVsActualOverview
            budgets={(budgets ?? []) as unknown as Budget[]}
            isLoading={budgetLoading}
          />
          <TeamExpenseApprovals
            claims={expenseClaims}
            isLoading={expenseLoading}
          />
        </div>
        <div className="space-y-4">
          <DepartmentTeamOverview />

          {/* Quick Links */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Quick Links
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[
                  {
                    label: "Submit Expense Claim",
                    href: "/dashboard/expense/pipeline",
                    icon: FileText,
                  },
                  {
                    label: "View Budget Report",
                    href: "/dashboard/reports/budget-vs-actual",
                    icon: PieChart,
                  },
                  {
                    label: "Team Members",
                    href: "/dashboard/team",
                    icon: Users,
                  },
                ].map((link) => {
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.label}
                      href={link.href}
                      className="flex items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-accent/50"
                    >
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span>{link.label}</span>
                      <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
