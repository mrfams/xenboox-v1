"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ArrowUpRight,
  FileText,
} from "lucide-react";

import { useEntity } from "@/lib/entity-context";
import { trpc } from "@/lib/trpc/client";
import { cn, formatCurrency } from "@/lib/utils";

// ─── ProactiveBriefing ────────────────────────────────────────────────────
//
// AI-generated top alerts. The AI tells you what matters — you don't go
// looking for it. Each alert links to the surface where you can act on it.

type BriefingItem = {
  id: string;
  type: "negative" | "warning" | "positive" | "neutral";
  title: string;
  value: string;
  detail: string;
  href?: string;
  actionLabel?: string;
};

const statusConfig: Record<
  string,
  { icon: typeof TrendingUp; iconColor: string; iconBg: string; accent: string }
> = {
  positive: {
    icon: TrendingUp,
    iconColor: "text-balanced-green",
    iconBg: "bg-balanced-green/10",
    accent: "bg-balanced-green",
  },
  negative: {
    icon: AlertTriangle,
    iconColor: "text-error-clay",
    iconBg: "bg-error-clay/10",
    accent: "bg-error-clay",
  },
  warning: {
    icon: Clock,
    iconColor: "text-attention-amber",
    iconBg: "bg-attention-amber/10",
    accent: "bg-attention-amber",
  },
  neutral: {
    icon: FileText,
    iconColor: "text-primary",
    iconBg: "bg-primary/10",
    accent: "bg-primary",
  },
};

function BriefingCard({ item }: { item: BriefingItem }) {
  const config = statusConfig[item.type] ?? statusConfig.neutral;
  const Icon = config.icon;
  const isAttention = item.type === "negative" || item.type === "warning";

  const inner = (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105",
          config.iconBg,
        )}
      >
        <Icon className={cn("h-5 w-5", config.iconColor)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-medium text-foreground">
            {item.title}
          </p>
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
              isAttention
                ? item.type === "negative"
                  ? "bg-error-clay/10 text-error-clay"
                  : "bg-attention-amber/10 text-attention-amber"
                : "bg-balanced-green/10 text-balanced-green",
            )}
          >
            {item.value}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground/70">{item.detail}</p>
      </div>
      {item.href && (
        <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground/40 transition-all duration-200 group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      )}
    </div>
  );

  const cardClass = cn(
    "flex rounded-xl border p-3 transition-all duration-200 group",
    isAttention
      ? "border-attention-amber/20 bg-attention-amber/[0.03] hover:border-attention-amber/40 hover:shadow-md"
      : "border-border/50 bg-card/60 hover:border-border/80 hover:shadow-md",
  );

  return item.href ? (
    <Link href={item.href} className={cn(cardClass, "hover:-translate-y-px")}>
      {inner}
    </Link>
  ) : (
    <div className={cardClass}>{inner}</div>
  );
}

export function ProactiveBriefing() {
  const { entityId } = useEntity();
  const [briefingText, setBriefingText] = useState<string | null>(null);
  const [briefingActions, setBriefingActions] = useState<
    Array<{ label: string; href: string }>
  >([]);
  const [isLoadingBriefing, setIsLoadingBriefing] = useState(true);

  // Fetch AI briefing
  // Note: tRPC inference resolves to Record<never, never> for this procedure
  // due to the dynamic import pattern in the server handler. We cast once here.
  const { data: aiBriefing, isError } = trpc.dashboard.getAiBriefing.useQuery(
    undefined,
    {
      enabled: !!entityId,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  ) as {
    data:
      | { text: string; actions?: Array<{ label: string; href: string }> }
      | null
      | undefined;
    isError: boolean;
  };

  // Fallback dashboard data — MUST be called before any early returns (Rules of Hooks)
  const { data: dashboardData, isLoading: isDashboardLoading } =
    trpc.dashboard.getDashboardData.useQuery({}, { enabled: !!entityId });
  const { data: ingestionStats, isLoading: isIngestionLoading } =
    trpc.ingestion.getStats.useQuery(undefined, {
      enabled: !!entityId,
    });

  useEffect(() => {
    if (aiBriefing) {
      setBriefingText(aiBriefing.text);
      setBriefingActions(aiBriefing.actions ?? []);
      setIsLoadingBriefing(false);
    } else if (isError || (!entityId && !aiBriefing)) {
      setIsLoadingBriefing(false);
    }
  }, [aiBriefing, isError, entityId]);

  // Loading state
  if (isLoadingBriefing) {
    return (
      <div className="rounded-2xl border border-border/40 bg-card/30 p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary animate-pulse" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              Generating your briefing...
            </p>
            <p className="text-xs text-muted-foreground/70">
              Analyzing your financial data
            </p>
          </div>
        </div>
      </div>
    );
  }

  // AI-generated briefing
  if (briefingText) {
    return (
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground leading-relaxed">
              {briefingText}
            </p>
            {briefingActions.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {briefingActions.map((action) => (
                  <Link
                    key={action.href}
                    href={action.href}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
                  >
                    {action.label}
                    <ArrowUpRight className="h-3 w-3" />
                  </Link>
                ))}
              </div>
            )}
            <p className="text-[10px] text-muted-foreground/50 mt-2">
              AI-generated briefing • {new Date().toLocaleTimeString()}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Fallback to count-based briefing (AI queries already declared above)

  const items: BriefingItem[] = [];

  if (dashboardData) {
    const { businessHealth, pendingApprovalsCount, deadlines } = dashboardData;
    const { cashBalance, runwayMonths } = businessHealth;

    if (deadlines.length > 0) {
      items.push({
        id: "upcoming-deadlines",
        type: "warning",
        title: `${deadlines.length} deadline${deadlines.length > 1 ? "s" : ""} upcoming`,
        value: `${deadlines.length} due`,
        detail: deadlines[0]?.label ?? "Upcoming deadlines need attention",
        href: "/dashboard/operations",
        actionLabel: "Review",
      });
    }

    if (pendingApprovalsCount > 0) {
      items.push({
        id: "pending-approvals",
        type: "warning",
        title: `${pendingApprovalsCount} item${pendingApprovalsCount > 1 ? "s" : ""} awaiting approval`,
        value: `${pendingApprovalsCount} pending`,
        detail: "Items awaiting your review or posting",
        href: "/dashboard/activity-hub",
        actionLabel: "Review",
      });
    }

    if (cashBalance !== undefined) {
      // Derive sentiment from actual value — negative cash is bad news
      const cashType: BriefingItem["type"] =
        cashBalance < 0
          ? "negative"
          : runwayMonths !== null &&
              runwayMonths !== undefined &&
              runwayMonths < 3
            ? "warning"
            : "positive";
      items.push({
        id: "cash-position",
        type: cashType,
        title: "Cash position",
        value: formatCurrency(cashBalance),
        detail:
          runwayMonths !== null && runwayMonths !== undefined
            ? `${runwayMonths.toFixed(1)} months runway`
            : "Runway unknown \u2014 connect accounts for accurate data",
        href: "/dashboard/operations",
        actionLabel: "Details",
      });
    }
  }

  if (ingestionStats && ingestionStats.pendingReview > 0) {
    items.push({
      id: "pending-review",
      type: "warning",
      title: `${ingestionStats.pendingReview} document${ingestionStats.pendingReview > 1 ? "s" : ""} need review`,
      value: `${ingestionStats.pendingReview} pending`,
      detail: "Documents processed by AI, awaiting your verification",
      href: "/dashboard/activity-hub",
      actionLabel: "Review",
    });
  }

  const isDataLoaded = !isDashboardLoading && !isIngestionLoading;

  if (items.length === 0) {
    // Distinguish between "loaded, zero items" and "failed to load"
    if (!isDataLoaded) {
      return (
        <div className="rounded-2xl border border-border/40 bg-card/30 p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
              <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                Loading your briefing...
              </p>
              <p className="text-xs text-muted-foreground/70">
                Checking approvals, deadlines, and cash position.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="rounded-2xl border border-balanced-green/20 bg-balanced-green/[0.03] p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-balanced-green/10">
            <CheckCircle2 className="h-5 w-5 text-balanced-green" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              All clear — nothing needs your attention right now.
            </p>
            <p className="text-xs text-muted-foreground/70">
              Your AI accounting department is running smoothly.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const sorted = [...items].sort((a, b) => {
    const order = { negative: 0, warning: 1, neutral: 2, positive: 3 };
    return (order[a.type] ?? 2) - (order[b.type] ?? 2);
  });

  return (
    <section className="space-y-3 rounded-2xl border border-border/40 bg-card/30 p-4 sm:p-5">
      <div className="flex items-center gap-2.5">
        {" "}
        <div
          className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/8"
          aria-hidden="true"
        >
          <Sparkles className="h-3.5 w-3.5 text-primary" />
        </div>
        <h2 className="text-sm font-semibold tracking-tight text-foreground">
          Your AI briefing
        </h2>
        <span className="inline-flex items-center gap-1 rounded-full border border-border/40 bg-muted/30 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground/50">
          AI-curated
        </span>
      </div>
      <div className="space-y-2">
        {sorted.map((item) => (
          <BriefingCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}
