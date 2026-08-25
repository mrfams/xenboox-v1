"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  Skeleton,
} from "@xenboox/ui";
import {
  Heart,
  HeartHandshake,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Users,
  Shield,
  Clock,
  Mail,
  Phone,
  ExternalLink,
  RefreshCw,
  ArrowRight,
  Info,
  ChevronRight,
} from "lucide-react";

import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

// ─── Health Score Badge ──────────────────────────────────────────────────────

function HealthBadge({ score }: { score: number }) {
  const config =
    score >= 80
      ? { label: "Healthy", color: "text-emerald-500 bg-emerald-500/10" }
      : score >= 50
        ? { label: "At Risk", color: "text-amber-500 bg-amber-500/10" }
        : { label: "Critical", color: "text-red-500 bg-red-500/10" };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        config.color,
      )}
    >
      <Heart className="h-3 w-3" />
      {config.label}
    </span>
  );
}

// ─── Risk Level Badge ────────────────────────────────────────────────────────

function RiskBadge({ level }: { level: string }) {
  const config =
    level === "rescue"
      ? { label: "Rescue", color: "text-red-500 bg-red-500/10" }
      : level === "outreach"
        ? { label: "Outreach", color: "text-amber-500 bg-amber-500/10" }
        : { label: "Nudge", color: "text-blue-500 bg-blue-500/10" };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        config.color,
      )}
    >
      {config.label}
    </span>
  );
}

// ─── Component Score Bar ─────────────────────────────────────────────────────

function ScoreBar({
  label,
  score,
  weight,
}: {
  label: string;
  score: number;
  weight: number;
}) {
  const color =
    score >= 70
      ? "bg-emerald-500"
      : score >= 40
        ? "bg-amber-500"
        : "bg-red-500";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{score}/100</span>
      </div>
      <div className="h-2 rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all", color)}
          style={{ width: `${score}%` }}
        />
      </div>
      <p className="text-[10px] text-muted-foreground">
        Weight: {Math.round(weight * 100)}%
      </p>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function CustomerHealthPage() {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const { data: overview, isLoading: overviewLoading } =
    trpc.customerHealth.getOverview.useQuery();

  const { data: churnRisk, isLoading: churnLoading } =
    trpc.customerHealth.getChurnRisk.useQuery();

  const { data: distribution, isLoading: distLoading } =
    trpc.customerHealth.getDistribution.useQuery();

  const { data: userHealth, isLoading: userLoading } =
    trpc.customerHealth.getUserHealth.useQuery(
      { userId: selectedUserId! },
      { enabled: !!selectedUserId },
    );

  const logInterventionMutation =
    trpc.customerHealth.logIntervention.useMutation();

  if (overviewLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Customer Health</h1>
        <p className="text-sm text-muted-foreground">
          Monitor customer engagement, health scores, and churn risk.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">
                Total Customers
              </span>
            </div>
            <p className="text-2xl font-bold">{overview?.summary.total ?? 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
                <HeartHandshake className="h-4 w-4 text-emerald-500" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">
                Healthy
              </span>
            </div>
            <p className="text-2xl font-bold text-emerald-500">
              {overview?.summary.healthy ?? 0}
            </p>
            <p className="text-xs text-muted-foreground">Score ≥ 80</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">
                At Risk
              </span>
            </div>
            <p className="text-2xl font-bold text-amber-500">
              {overview?.summary.atRisk ?? 0}
            </p>
            <p className="text-xs text-muted-foreground">Score 50-79</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10">
                <AlertTriangle className="h-4 w-4 text-red-500" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">
                Critical
              </span>
            </div>
            <p className="text-2xl font-bold text-red-500">
              {overview?.summary.critical ?? 0}
            </p>
            <p className="text-xs text-muted-foreground">Score &lt; 50</p>
          </CardContent>
        </Card>
      </div>

      {/* Average Score */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Average Health Score
              </p>
              <p className="text-3xl font-bold mt-1">
                {overview?.summary.avgScore ?? 0}
                <span className="text-lg text-muted-foreground">/100</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-muted-foreground">
                Component Averages
              </p>
              <div className="mt-2 space-y-1">
                <p className="text-xs">
                  <span className="text-muted-foreground">Product Usage:</span>{" "}
                  <span className="font-medium">
                    {distribution?.componentAverages.productUsage ?? 0}
                  </span>
                </p>
                <p className="text-xs">
                  <span className="text-muted-foreground">Engagement:</span>{" "}
                  <span className="font-medium">
                    {distribution?.componentAverages.engagement ?? 0}
                  </span>
                </p>
                <p className="text-xs">
                  <span className="text-muted-foreground">
                    Financial Health:
                  </span>{" "}
                  <span className="font-medium">
                    {distribution?.componentAverages.financialHealth ?? 0}
                  </span>
                </p>
                <p className="text-xs">
                  <span className="text-muted-foreground">Support:</span>{" "}
                  <span className="font-medium">
                    {distribution?.componentAverages.support ?? 0}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* At-Risk Users */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Churn Risk Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            {churnLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : churnRisk?.riskUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <HeartHandshake className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No at-risk users detected</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {churnRisk?.riskUsers.map((user) => (
                  <div
                    key={user.userId}
                    className={cn(
                      "flex items-center justify-between rounded-lg border p-3 transition-colors cursor-pointer",
                      selectedUserId === user.userId
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted/50",
                    )}
                    onClick={() => setSelectedUserId(user.userId)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">
                          {user.name || user.email}
                        </p>
                        <RiskBadge level={user.riskLevel} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {user.daysSinceLastLogin !== null
                          ? `${user.daysSinceLastLogin} days since last login`
                          : "Never logged in"}
                        {" · "}
                        {user.interventionCount} interventions
                      </p>
                    </div>
                    <div className="ml-3 text-right">
                      <p className="text-lg font-bold">
                        {user.healthScore.overallScore}
                      </p>
                      <HealthBadge score={user.healthScore.overallScore} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* User Detail Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-primary" />
              {userHealth
                ? `${userHealth.name || userHealth.email}`
                : "Select a User"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedUserId && userLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-8" />
                ))}
              </div>
            ) : !userHealth ? (
              <div className="text-center py-8 text-muted-foreground">
                <Heart className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">
                  Click a user to view their health details
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Score */}
                <div className="text-center">
                  <p className="text-5xl font-bold">
                    {userHealth.overallScore}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Overall Health Score
                  </p>
                  <HealthBadge score={userHealth.overallScore} />
                </div>

                {/* Components */}
                <div className="space-y-3">
                  <ScoreBar
                    label="Product Usage"
                    score={userHealth.components.productUsage.score}
                    weight={userHealth.components.productUsage.weight}
                  />
                  <ScoreBar
                    label="Engagement"
                    score={userHealth.components.engagement.score}
                    weight={userHealth.components.engagement.weight}
                  />
                  <ScoreBar
                    label="Financial Health"
                    score={userHealth.components.financialHealth.score}
                    weight={userHealth.components.financialHealth.weight}
                  />
                  <ScoreBar
                    label="Support"
                    score={userHealth.components.support.score}
                    weight={userHealth.components.support.weight}
                  />
                </div>

                {/* Factors */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Risk Factors
                  </p>
                  {userHealth.riskFactors.length === 0 ? (
                    <p className="text-xs text-emerald-500">No risk factors</p>
                  ) : (
                    <ul className="space-y-1">
                      {userHealth.riskFactors.map((factor) => (
                        <li
                          key={factor}
                          className="flex items-center gap-2 text-xs text-red-500"
                        >
                          <AlertTriangle className="h-3 w-3" />
                          {factor}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Positive Factors
                  </p>
                  {userHealth.positiveFactors.length === 0 ? (
                    <p className="text-xs text-muted-foreground">None yet</p>
                  ) : (
                    <ul className="space-y-1">
                      {userHealth.positiveFactors.map((factor) => (
                        <li
                          key={factor}
                          className="flex items-center gap-2 text-xs text-emerald-500"
                        >
                          <Heart className="h-3 w-3" />
                          {factor}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      logInterventionMutation.mutate({
                        userId: userHealth.userId,
                        tier: "nudge",
                        action: "In-app tip sent",
                      });
                    }}
                    disabled={logInterventionMutation.isPending}
                  >
                    <Mail className="h-3.5 w-3.5 mr-1" />
                    Send Nudge
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      logInterventionMutation.mutate({
                        userId: userHealth.userId,
                        tier: "outreach",
                        action: "Email from success team",
                      });
                    }}
                    disabled={logInterventionMutation.isPending}
                  >
                    <Mail className="h-3.5 w-3.5 mr-1" />
                    Outreach
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      logInterventionMutation.mutate({
                        userId: userHealth.userId,
                        tier: "rescue",
                        action: "Personal call scheduled",
                      });
                    }}
                    disabled={logInterventionMutation.isPending}
                  >
                    <Phone className="h-3.5 w-3.5 mr-1" />
                    Rescue
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Churn Prevention Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="text-center">
              <p className="text-3xl font-bold">
                {churnRisk?.totalAtRisk ?? 0}
              </p>
              <p className="text-sm text-muted-foreground">Total At Risk</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-500">
                {churnRisk?.nudges ?? 0}
              </p>
              <p className="text-sm text-muted-foreground">Nudges</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-amber-500">
                {churnRisk?.outreach ?? 0}
              </p>
              <p className="text-sm text-muted-foreground">Outreach</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-red-500">
                {churnRisk?.rescue ?? 0}
              </p>
              <p className="text-sm text-muted-foreground">Rescue</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
