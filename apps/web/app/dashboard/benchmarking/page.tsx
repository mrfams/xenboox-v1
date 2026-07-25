"use client";

import { useState } from "react";
import {
  BarChart3,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  Shield,
  Users,
  TrendingUp,
  Lock,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Separator,
} from "@/components/ui";
import { toast } from "sonner";

// ─── Consent Status Badge ──────────────────────────────────────────────

function ConsentBadge({ hasConsented }: { hasConsented: boolean }) {
  if (hasConsented) {
    return (
      <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-200">
        <CheckCircle2 className="mr-1 h-3 w-3" /> Opted In
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-muted-foreground">
      <XCircle className="mr-1 h-3 w-3" /> Opted Out (Default)
    </Badge>
  );
}

// ─── Cohort Card ──────────────────────────────────────────────────────

function CohortCard({
  cohort,
}: {
  cohort: {
    id: string;
    market: string;
    segment: string;
    memberCount: number;
    meetsMinimum: boolean;
    recommendedMinimum: number;
    hasAggregates: boolean;
    lastComputed: string | null;
  };
}) {
  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
            <Users className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium capitalize">{cohort.market}</p>
            <p className="text-xs text-muted-foreground capitalize">
              {cohort.segment}
            </p>
          </div>
        </div>
        <Badge
          variant={cohort.meetsMinimum ? "default" : "secondary"}
          className="text-[10px]"
        >
          {cohort.memberCount} members
        </Badge>
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        {cohort.hasAggregates ? (
          <span className="flex items-center gap-1 text-emerald-600">
            <CheckCircle2 className="h-3 w-3" /> Aggregates available
          </span>
        ) : (
          <span className="flex items-center gap-1 text-amber-600">
            <AlertCircle className="h-3 w-3" /> No aggregates yet
          </span>
        )}
        <span className="text-muted-foreground/50">·</span>
        <span>Min: {cohort.recommendedMinimum}</span>
      </div>

      {!cohort.meetsMinimum && (
        <p className="mt-2 text-xs text-amber-600 flex items-center gap-1">
          <Lock className="h-3 w-3" /> Below minimum threshold — aggregates
          hidden
        </p>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────

export default function BenchmarkingPage() {
  const [consentOpen, setConsentOpen] = useState(false);
  const [revokeOpen, setRevokeOpen] = useState(false);

  const { data: consentStatus, refetch: refetchConsent } =
    trpc.benchmarking.getConsentStatus.useQuery();
  const { data: cohorts, refetch: refetchCohorts } =
    trpc.benchmarking.listAvailableCohorts.useQuery();
  const { data: availability, refetch: refetchAvailability } =
    trpc.benchmarking.getAvailability.useQuery();

  const grantConsent = trpc.benchmarking.grantConsent.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      refetchConsent();
      refetchAvailability();
      setConsentOpen(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const revokeConsent = trpc.benchmarking.revokeConsent.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      refetchConsent();
      refetchAvailability();
      setRevokeOpen(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const runBenchmarking = trpc.benchmarking.runBenchmarking.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(
          `Benchmark computed — ${data.aggregatesComputed} metrics`,
        );
        refetchCohorts();
      } else {
        toast.error(data.errors[0] ?? "Benchmarking pipeline failed");
      }
    },
    onError: (err) => toast.error(err.message),
  });

  const hasConsented = consentStatus?.hasConsented ?? false;
  const canCompute = cohorts?.canComputeBenchmark ?? false;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Benchmarking &amp; Insights</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Compare your financial metrics against similar organizations in your
            market.
          </p>
        </div>
        {hasConsented ? (
          <Button
            variant="outline"
            className="text-red-500 border-red-200 hover:bg-red-50"
            onClick={() => setRevokeOpen(true)}
            disabled={revokeConsent.isPending}
          >
            {revokeConsent.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Revoking...
              </>
            ) : (
              <>
                <XCircle className="mr-2 h-4 w-4" /> Revoke Consent
              </>
            )}
          </Button>
        ) : (
          <Button onClick={() => setConsentOpen(true)}>
            <CheckCircle2 className="mr-2 h-4 w-4" /> Opt Into Benchmarking
          </Button>
        )}
      </div>

      {/* Consent Status Banner */}
      <Card
        className={cn(
          "border",
          hasConsented
            ? "border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/10"
            : "border-muted",
        )}
      >
        <CardContent className="flex items-start gap-4 p-6">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
              hasConsented
                ? "bg-emerald-100 text-emerald-600"
                : "bg-muted text-muted-foreground",
            )}
          >
            <Shield className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">Data Privacy &amp; Consent</h3>
              <ConsentBadge hasConsented={hasConsented} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
              {hasConsented
                ? "Your anonymized data is contributing to benchmark cohorts. Only ratios and aggregate statistics are shared — your exact figures and identity are never exposed to other organizations."
                : "You are currently opted out of benchmarking (default). Your financial data is never shared with any other organization. Opt in to see how your metrics compare to similar businesses in your market."}
            </p>
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Lock className="h-3 w-3 text-emerald-500" /> Default excluded
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Opt-in
                only
              </span>
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3 text-emerald-500" /> Ratios &amp; bands
                only
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3 text-emerald-500" /> Minimum N={5}{" "}
                enforced
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Shield className="h-4 w-4" /> Consent Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {hasConsented ? "Active" : "Inactive"}
            </p>
            {consentStatus?.consentedAt && (
              <p className="text-xs text-muted-foreground mt-1">
                Since {new Date(consentStatus.consentedAt).toLocaleDateString()}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Users className="h-4 w-4" /> Available Cohorts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{cohorts?.cohorts.length ?? 0}</p>
            {cohorts && cohorts.cohorts.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {cohorts.cohorts.filter((c) => c.meetsMinimum).length} meet
                minimum size
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <TrendingUp className="h-4 w-4" /> Benchmark Ready
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{canCompute ? "Yes" : "No"}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {canCompute
                ? "Enough data for meaningful comparison"
                : !hasConsented
                  ? "Opt in to get started"
                  : "Not enough cohort members yet"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <BarChart3 className="h-4 w-4" /> Metrics Tracked
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">7</p>
            <p className="text-xs text-muted-foreground mt-1">
              Revenue, profitability, liquidity, solvency, overhead, turnover
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Consent Settings Dialog */}
      {consentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-lg">
            <h3 className="text-lg font-semibold">Opt Into Benchmarking</h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              By opting in, your organization&apos;s anonymized financial ratios
              will be included in benchmark cohorts. Your identity and exact
              figures are never shared.
            </p>
            <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
                Only ratios, not exact amounts
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
                Your org name is never visible
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
                You can revoke at any time
              </li>
            </ul>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setConsentOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() =>
                  grantConsent.mutate({
                    agreeToAnonymizedBenchmarking: true,
                  })
                }
                disabled={grantConsent.isPending}
              >
                {grantConsent.isPending ? "Opting in..." : "I Agree — Opt In"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Revoke Consent Dialog */}
      {revokeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-lg">
            <h3 className="text-lg font-semibold">
              Revoke Benchmarking Consent
            </h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Your data will be removed from future cohort computations.
              Already-computed historical aggregates will be preserved (they
              cannot be retroactively falsified), but no new
              personally-attributable inference will be possible going forward.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setRevokeOpen(false)}>
                Keep Consent
              </Button>
              <Button
                variant="destructive"
                onClick={() =>
                  revokeConsent.mutate({ confirmRevocation: true })
                }
                disabled={revokeConsent.isPending}
              >
                {revokeConsent.isPending
                  ? "Revoking..."
                  : "Yes, Revoke Consent"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Benchmark Data Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Benchmark Cohorts</h2>
          {hasConsented && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                runBenchmarking.mutate({
                  period: new Date().toISOString().slice(0, 7),
                })
              }
              disabled={runBenchmarking.isPending}
            >
              {runBenchmarking.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Computing...
                </>
              ) : (
                <>
                  <BarChart3 className="mr-2 h-4 w-4" /> Compute Benchmarks
                </>
              )}
            </Button>
          )}
        </div>

        <Separator />

        {!hasConsented ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
              <Lock className="h-8 w-8 text-muted-foreground/40" />
              <div>
                <p className="text-sm font-medium">
                  Opt in to see benchmark data
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Your data is never shared without your explicit consent.
                </p>
              </div>
              <Button onClick={() => setConsentOpen(true)}>
                Opt Into Benchmarking
              </Button>
            </CardContent>
          </Card>
        ) : cohorts && cohorts.cohorts.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cohorts.cohorts.map((c) => (
              <CohortCard key={c.id} cohort={c} />
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
              <Users className="h-8 w-8 text-muted-foreground/40" />
              <div>
                <p className="text-sm font-medium">No cohorts available yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Cohorts are created when multiple organizations in the same
                  market opt into benchmarking. Check back later.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Run Benchmark Results */}
      {runBenchmarking.data && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4" />
              Benchmark Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {runBenchmarking.data.aggregates.map((agg) => (
                <div key={agg.metric} className="rounded-lg border p-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {agg.metric.replace(/_/g, " ")}
                  </p>
                  <div className="mt-2 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Median</span>
                      <span className="font-semibold">
                        {agg.median.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Q1</span>
                      <span>{agg.quartileLow.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Q3</span>
                      <span>{agg.quartileHigh.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Members</span>
                      <span>{agg.memberCount}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Privacy & Compliance Note */}
      <Card className="border-muted">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <div className="text-xs text-muted-foreground leading-relaxed">
              <p className="font-medium text-foreground">
                Your Privacy Matters
              </p>
              <p className="mt-1">
                Benchmarking data is aggregated across organizations. Individual
                organization figures are never exposed. The minimum cohort size
                of
                {5} organizations is enforced before any benchmark is computed
                or displayed, preventing inference of any single
                organization&apos;s data. You can revoke consent at any time
                from this page.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
