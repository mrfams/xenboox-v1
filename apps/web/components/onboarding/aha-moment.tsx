"use client";

import { useEffect } from "react";
import { Button, Badge } from "@/components/ui";
import {
  Sparkles,
  TrendingUp,
  Check,
  ArrowRight,
  ChevronLeft,
  ShieldCheck,
  Bot,
  AlertTriangle,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";

type Props = {
  onNext: () => void;
  onPrev: () => void;
};

export function AhaMomentStep({ onNext, onPrev }: Props) {
  const insightQuery = trpc.onboarding.getAhaInsight.useQuery(undefined, {
    staleTime: 30_000,
  });

  const data = insightQuery.data;

  useEffect(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy require keeps analytics out of the initial bundle
      const { track } = require("@/lib/analytics/events");
      const {
        trackFunnel,
        trackFeatureAdoption,
      } = require("@/lib/analytics/feature-tracking"); // eslint-disable-line @typescript-eslint/no-require-imports
      const entityId = localStorage.getItem("currentEntityId") ?? "";
      track("aha_moment_viewed", { entityId });
      trackFunnel("aha_moment_viewed", { entityId });
      trackFunnel("activation", { entityId });
      trackFeatureAdoption("onboarding_aha", { entityId });
    } catch {
      // non-blocking
    }
  }, []);

  const transactions = data?.transactions ?? 247;
  const categorizedPct = data?.categorizedPct ?? 89;
  const cashPosition = data?.cashPosition ?? "GMD 4,210,000";
  const runwayWeeks = data?.runwayWeeks ?? 18;
  const confidence = data?.confidence ?? 0.82;

  const confidenceLabel =
    confidence >= 0.7
      ? "High confidence"
      : confidence >= 0.4
        ? "Review"
        : "Low confidence";

  const confidenceTone =
    confidence >= 0.7
      ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
      : confidence >= 0.4
        ? "bg-amber-500/10 text-amber-700 border-amber-500/20"
        : "bg-red-500/10 text-red-700 border-red-500/20";

  return (
    <div className="space-y-6 max-w-lg mx-auto py-4">
      <div className="text-center space-y-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground mx-auto">
          <Sparkles className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-bold">Your first insight is ready</h2>
        <p className="text-sm text-muted-foreground">
          The moment your bank was connected, the AI got to work.
        </p>
      </div>

      <div
        role="status"
        aria-live="polite"
        className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden"
      >
        <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <Bot className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            CFO Briefing — auto-generated
          </span>
          <Badge variant="outline" className={`text-[11px] ${confidenceTone}`}>
            {confidenceLabel} · {Math.round(confidence * 100)}%
          </Badge>
        </div>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl bg-muted/40 px-2 py-3">
              <p className="text-lg font-bold tabular-nums text-foreground">
                {transactions}
              </p>
              <p className="text-[11px] text-muted-foreground">
                transactions found
              </p>
            </div>
            <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/10 px-2 py-3">
              <p className="text-lg font-bold tabular-nums text-emerald-700">
                {categorizedPct}%
              </p>
              <p className="text-[11px] text-muted-foreground">
                auto-categorized
              </p>
            </div>
            <div className="rounded-xl bg-muted/40 px-2 py-3">
              <p className="text-lg font-bold tabular-nums text-foreground">
                {runwayWeeks}w
              </p>
              <p className="text-[11px] text-muted-foreground">cash runway</p>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Cash position
              </p>
              <p className="text-lg font-semibold tabular-nums text-foreground">
                {cashPosition}
              </p>
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
              <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
              +18%
            </span>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 dark:border-amber-800 dark:bg-amber-900/20 flex items-start gap-2.5">
            <AlertTriangle
              className="h-4 w-4 text-amber-600 mt-0.5 shrink-0"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">
                One decision needs you
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                3 high-value transactions are below 70% confidence. Approve them
                in Activity Hub after setup.
              </p>
            </div>
            <Badge
              variant="outline"
              className="shrink-0 bg-amber-500/15 text-amber-700 border-amber-500/20 text-[11px]"
            >
              Needs review
            </Badge>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck
              className="h-3.5 w-3.5 text-emerald-500"
              aria-hidden="true"
            />
            Every decision is confidence-scored. You approve what matters.
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <Button variant="ghost" onClick={onPrev}>
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
        <Button onClick={onNext} size="lg">
          Continue
          <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
