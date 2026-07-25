"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
} from "@/components/ui";
import { Skeleton } from "@/components/shared/loading";
import { EmptyState } from "@/components/shared/empty-state";
import { trpc } from "@/lib/trpc/client";
import { useEntity } from "@/lib/entity-context";
import { cn, formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import {
  Building2,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowLeft,
  RefreshCw,
  Wallet,
  FileText,
  Receipt,
  Users,
  CalendarDays,
} from "lucide-react";

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;

  const { data, isLoading, error, refetch } =
    trpc.firm.getClientHealth.useQuery(
      { clientEntityId: clientId },
      { enabled: !!clientId },
    );

  const refreshSnapshot = trpc.firm.refreshSnapshot.useMutation({
    onSuccess: () => {
      toast.success("Snapshot refreshed");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={<AlertCircle className="h-10 w-10 text-destructive" />}
        title="Access denied"
        description={error.message}
        action={
          <Button onClick={() => router.push("/dashboard/firm")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Firm Dashboard
          </Button>
        }
      />
    );
  }

  if (!data || !data.entity) {
    return (
      <EmptyState
        icon={<Building2 className="h-8 w-8" />}
        title="Client not found"
        description="This client entity could not be found or you don't have access."
        action={
          <Button onClick={() => router.push("/dashboard/firm")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Firm Dashboard
          </Button>
        }
      />
    );
  }

  const { entity, engagement, snapshot } = data;
  const healthStatus = snapshot?.healthStatus ?? "unknown";

  const healthConfig = {
    healthy: {
      label: "Healthy",
      className: "text-emerald-600 bg-emerald-500/10",
      icon: CheckCircle2,
    },
    needs_review: {
      label: "Needs Review",
      className: "text-amber-600 bg-amber-500/10",
      icon: Clock,
    },
    critical: {
      label: "Critical",
      className: "text-red-600 bg-red-500/10",
      icon: AlertCircle,
    },
    unknown: {
      label: "Unknown",
      className: "text-muted-foreground bg-muted",
      icon: AlertCircle,
    },
  };

  const hc = healthConfig[healthStatus];
  const HealthIcon = hc.icon;

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/dashboard/firm")}
          >
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{entity.name}</h1>
            <p className="text-sm text-muted-foreground">
              {entity.currency} · {entity.country} ·{" "}
              {engagement.engagementType.replace("_", " ")} engagement
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refreshSnapshot.mutate({ clientEntityId: clientId })}
            disabled={refreshSnapshot.isPending}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${refreshSnapshot.isPending ? "animate-spin" : ""}`}
            />
            {refreshSnapshot.isPending ? "Refreshing..." : "Refresh Data"}
          </Button>
        </div>
      </div>

      {/* Health Status */}
      <div className={cn("rounded-xl border p-6", hc.className)}>
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-background/50">
            <HealthIcon className="h-8 w-8" />
          </div>
          <div>
            <p className="text-lg font-semibold">{hc.label}</p>
            <p className="text-sm text-muted-foreground">
              {healthStatus === "healthy" &&
                "All metrics are within normal ranges."}
              {healthStatus === "needs_review" &&
                "Some items need attention. Review overdue invoices and unreconciled transactions."}
              {healthStatus === "critical" &&
                "Immediate attention required. Books may not be current or there are significant outstanding items."}
              {healthStatus === "unknown" &&
                "Run a data refresh to see this client's health status."}
            </p>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">
                Cash Balance
              </p>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-2 text-2xl font-bold">
              {formatCurrency(snapshot?.cashBalance ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">
                Overdue Invoices
              </p>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-2 text-2xl font-bold">
              {snapshot?.overdueInvoices ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">
                Unreconciled Items
              </p>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-2 text-2xl font-bold">
              {snapshot?.unreconciledItems ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">
                Days Until Close
              </p>
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-2 text-2xl font-bold">
              {snapshot?.daysUntilClose ?? "-"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detail Cards */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Books Status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Books Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full",
                    snapshot?.booksCurrent
                      ? "bg-emerald-500/10"
                      : "bg-amber-500/10",
                  )}
                >
                  {snapshot?.booksCurrent ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Clock className="h-4 w-4 text-amber-500" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {snapshot?.booksCurrent ? "Current" : "Not current"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {snapshot?.lastClosePeriod
                      ? `Last closed: ${snapshot.lastClosePeriod}`
                      : "No close data available"}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/10">
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm font-medium">Next close due</p>
                  <p className="text-xs text-muted-foreground">
                    {snapshot?.daysUntilClose
                      ? `In ${snapshot.daysUntilClose} days`
                      : "No close scheduled"}
                  </p>
                </div>
              </div>
              <Badge
                variant={
                  snapshot && snapshot.daysUntilClose <= 7
                    ? "destructive"
                    : snapshot && snapshot.daysUntilClose <= 14
                      ? "secondary"
                      : "outline"
                }
              >
                {snapshot?.daysUntilClose ? `${snapshot.daysUntilClose}d` : "-"}
              </Badge>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/10">
                  <Users className="h-4 w-4 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm font-medium">Pending approvals</p>
                  <p className="text-xs text-muted-foreground">
                    Items awaiting review
                  </p>
                </div>
              </div>
              <Badge
                variant={
                  (snapshot?.pendingApprovals ?? 0) > 5
                    ? "destructive"
                    : "secondary"
                }
              >
                {snapshot?.pendingApprovals ?? 0}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Engagement Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Engagement Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Type</p>
                <p className="text-xs text-muted-foreground">
                  {engagement.engagementType.replace("_", " ")}
                </p>
              </div>
              <Badge variant="outline">{engagement.status}</Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Engaged since</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(engagement.addedAt).toLocaleDateString([], {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>
            {engagement.clientConsentedAt && (
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Client consent</p>
                    <p className="text-xs text-muted-foreground">
                      Obtained{" "}
                      {new Date(
                        engagement.clientConsentedAt,
                      ).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            )}
            {engagement.notes && (
              <div className="rounded-lg border p-3">
                <p className="text-xs font-medium text-muted-foreground">
                  Notes
                </p>
                <p className="mt-1 text-sm">{engagement.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
