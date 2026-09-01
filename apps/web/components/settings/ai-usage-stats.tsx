"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { trpc } from "@/lib/trpc/client";
import {
  BarChart3,
  Brain,
  Zap,
  AlertCircle,
  Mail,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type UsageStats = {
  autoReconcile: number;
  autoCategorize: number;
  aiAlerts: number;
  dailyDigest: number;
  totalActions: number;
  lastUsed: string | null;
};

type UsageFeature = {
  key: keyof Omit<UsageStats, "totalActions" | "lastUsed">;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
};

// ─── Default Stats ────────────────────────────────────────────────────────────

const DEFAULT_STATS: UsageStats = {
  autoReconcile: 0,
  autoCategorize: 0,
  aiAlerts: 0,
  dailyDigest: 0,
  totalActions: 0,
  lastUsed: null,
};

// ─── Feature Config ───────────────────────────────────────────────────────────

const FEATURES: UsageFeature[] = [
  {
    key: "autoReconcile",
    label: "Auto-Reconciliation",
    description: "Bank transactions matched to journal entries",
    icon: Zap,
    color: "text-balanced-green",
  },
  {
    key: "autoCategorize",
    label: "Smart Categorization",
    description: "Transactions categorized by AI",
    icon: Brain,
    color: "text-primary",
  },
  {
    key: "aiAlerts",
    label: "Anomaly Alerts",
    description: "Unusual patterns detected",
    icon: AlertCircle,
    color: "text-attention-amber",
  },
  {
    key: "dailyDigest",
    label: "Daily Digest",
    description: "Morning summaries generated",
    icon: Mail,
    color: "text-signal-indigo",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatNumber(n: number): string {
  try {
    return new Intl.NumberFormat(undefined, {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(n);
  } catch {
    return String(n);
  }
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "Never";
  try {
    const then = new Date(dateStr).getTime();
    if (Number.isNaN(then)) return "—";
    const diffMs = Date.now() - then;
    const locale =
      typeof navigator !== "undefined" ? navigator.language : "en-US";
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
    const minutes = Math.floor(diffMs / 60_000);
    const hours = Math.floor(diffMs / 3_600_000);
    const days = Math.floor(diffMs / 86_400_000);
    if (minutes < 1) return rtf.format(0, "second");
    if (minutes < 60) return rtf.format(-minutes, "minute");
    if (hours < 24) return rtf.format(-hours, "hour");
    return rtf.format(-days, "day");
  } catch {
    return "—";
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AIUsageStats() {
  const {
    data: serverStats,
    isLoading,
    isError,
  } = (
    trpc as unknown as {
      settings: {
        get: {
          useQuery: (a?: unknown) => {
            data?: unknown;
            isLoading: boolean;
            isError: boolean;
          };
        };
      };
    }
  ).settings.get.useQuery(undefined as never) as unknown as {
    data?: { usage?: UsageStats };
    isLoading: boolean;
    isError: boolean;
  };
  const stats: UsageStats =
    (serverStats as { usage?: UsageStats } | undefined)?.usage ?? DEFAULT_STATS;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-5 w-32 animate-pulse rounded bg-muted" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded bg-muted/50" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="p-4">
          <p className="text-sm text-destructive">Failed to load usage stats</p>
        </CardContent>
      </Card>
    );
  }

  const maxUsage = Math.max(...FEATURES.map((f) => stats[f.key]), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          AI Usage Statistics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          <StatBox
            label="Total AI Actions"
            value={formatNumber(stats.totalActions)}
            icon={<Zap className="h-4 w-4 text-primary" />}
          />
          <StatBox
            label="Features Active"
            value={`${FEATURES.filter((f) => stats[f.key] > 0).length}/${FEATURES.length}`}
            icon={<Brain className="h-4 w-4 text-primary" />}
          />
          <StatBox
            label="Last Used"
            value={timeAgo(stats.lastUsed)}
            icon={<TrendingUp className="h-4 w-4 text-balanced-green" />}
          />
        </div>

        {/* Feature breakdown */}
        <div className="space-y-3">
          {FEATURES.map((feature) => {
            const count = stats[feature.key];
            const pct = maxUsage > 0 ? (count / maxUsage) * 100 : 0;
            const Icon = feature.icon;
            return (
              <div key={feature.key} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={cn("h-3.5 w-3.5", feature.color)} />
                    <span className="text-sm font-medium">{feature.label}</span>
                  </div>
                  <span className="text-sm font-mono text-muted-foreground">
                    {formatNumber(count)}
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      feature.color.replace("text-", "bg-"),
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Usage tip */}
        <div className="rounded-lg border bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">
            💡 <span className="font-medium">Tip:</span> Usage stats are
            securely stored and synced across your devices.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Stat Box ─────────────────────────────────────────────────────────────────

function StatBox({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-[10px] text-muted-foreground">{label}</span>
      </div>
      <p className="text-lg font-bold font-mono">{value}</p>
    </div>
  );
}
