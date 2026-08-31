"use client";

import { useState, useEffect, useCallback } from "react";
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
  Activity,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  XCircle,
  RefreshCw,
  Database,
  Mail,
  Bug,
  BarChart3,
  Brain,
  Cloud,
  CreditCard,
  Building2,
  Wifi,
  Clock,
  Zap,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

type ComponentStatus = "up" | "down" | "degraded" | "not_configured";

type ComponentHealth = {
  status: ComponentStatus;
  latencyMs?: number;
  error?: string;
  deepChecked?: boolean;
};

type HealthResponse = {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  uptime: number;
  version: string;
  region: string;
  latencyMs: number;
  mode?: "deep";
  checks: Record<string, ComponentHealth>;
};

// ─── Integration Metadata ───────────────────────────────────────────────────

const INTEGRATION_META: Record<
  string,
  {
    name: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    category: "critical" | "communication" | "observability" | "storage" | "banking";
  }
> = {
  database: {
    name: "Database",
    description: "Neon PostgreSQL",
    icon: Database,
    category: "critical",
  },
  redis: {
    name: "Redis Cache",
    description: "Upstash Redis",
    icon: Zap,
    category: "critical",
  },
  resend: {
    name: "Email",
    description: "Resend transactional emails",
    icon: Mail,
    category: "communication",
  },
  sentry: {
    name: "Error Tracking",
    description: "Sentry error monitoring",
    icon: Bug,
    category: "observability",
  },
  posthog: {
    name: "Analytics",
    description: "PostHog product analytics",
    icon: BarChart3,
    category: "observability",
  },
  langfuse: {
    name: "AI Observability",
    description: "LangFuse agent tracing",
    icon: Brain,
    category: "observability",
  },
  r2: {
    name: "File Storage",
    description: "Cloudflare R2 object storage",
    icon: Cloud,
    category: "storage",
  },
  plaid: {
    name: "Bank Connections",
    description: "Plaid bank account linking",
    icon: CreditCard,
    category: "banking",
  },
  mono: {
    name: "Banking (Africa)",
    description: "Mono API for African banks",
    icon: Building2,
    category: "banking",
  },
};

const CATEGORY_LABELS: Record<string, string> = {
  critical: "Critical Infrastructure",
  communication: "Communication",
  observability: "Observability & Monitoring",
  storage: "Storage",
  banking: "Banking & Payments",
};

// ─── Status Helpers ─────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: ComponentStatus }) {
  const size = "h-4 w-4";
  switch (status) {
    case "up":
      return <CheckCircle2 className={`${size} text-balanced-green`} />;
    case "down":
      return <XCircle className={`${size} text-error-clay`} />;
    case "degraded":
      return <AlertTriangle className={`${size} text-attention-amber`} />;
    case "not_configured":
      return <AlertCircle className={`${size} text-muted-foreground`} />;
  }
}

function StatusBadge({ status }: { status: ComponentStatus }) {
  const colors: Record<ComponentStatus, string> = {
    up: "bg-balanced-green/10 text-balanced-green",
    down: "bg-error-clay/10 text-error-clay",
    degraded: "bg-attention-amber/10 text-attention-amber",
    not_configured: "bg-muted text-muted-foreground",
  };
  const labels: Record<ComponentStatus, string> = {
    up: "Operational",
    down: "Down",
    degraded: "Degraded",
    not_configured: "Not Configured",
  };
  return (
    <Badge variant="secondary" className={`${colors[status]} text-[10px]`}>
      {labels[status]}
    </Badge>
  );
}

function OverallStatusBadge({ status }: { status: HealthResponse["status"] }) {
  const colors = {
    healthy: "bg-balanced-green/10 text-balanced-green border-balanced-green/20",
    degraded: "bg-attention-amber/10 text-attention-amber border-attention-amber/20",
    unhealthy: "bg-error-clay/10 text-error-clay border-error-clay/20",
  };
  const labels = {
    healthy: "All Systems Operational",
    degraded: "Partial System Degradation",
    unhealthy: "System Outage",
  };
  return (
    <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${colors[status]}`}>
      {status === "healthy" ? (
        <CheckCircle2 className="h-5 w-5" />
      ) : status === "degraded" ? (
        <AlertTriangle className="h-5 w-5" />
      ) : (
        <XCircle className="h-5 w-5" />
      )}
      <span className="text-sm font-semibold">{labels[status]}</span>
    </div>
  );
}

// ─── Main Widget ────────────────────────────────────────────────────────────

export function HealthCheckWidget() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchHealth = useCallback(async (deep = false) => {
    try {
      if (!health) setIsLoading(true);
      else setIsRefreshing(true);

      const url = deep ? "/api/health/deep" : "/api/health";
      const response = await fetch(url);
      const data: HealthResponse = await response.json();
      setHealth(data);
      setLastRefresh(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch health status");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [health]);

  // Initial fetch
  useEffect(() => {
    fetchHealth(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => fetchHealth(false), 30_000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  // Group checks by category
  const checksByCategory = Object.entries(INTEGRATION_META).reduce(
    (acc, [key, meta]) => {
      if (!acc[meta.category]) acc[meta.category] = [];
      acc[meta.category].push({ key, ...meta, health: health?.checks[key] });
      return acc;
    },
    {} as Record<string, Array<{ key: string; name: string; description: string; icon: React.ComponentType<{ className?: string }>; category: string; health?: ComponentHealth }>>,
  );

  const totalChecks = health ? Object.keys(health.checks).length : 0;
  const upCount = health ? Object.values(health.checks).filter((c) => c.status === "up").length : 0;
  const downCount = health ? Object.values(health.checks).filter((c) => c.status === "down").length : 0;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Activity className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-sm font-semibold">
              Integration Health
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {upCount}/{totalChecks} services operational
              {downCount > 0 && (
                <span className="text-error-clay ml-1">
                  · {downCount} down
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {lastRefresh && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchHealth(true)}
            disabled={isRefreshing}
            className="h-8 px-2"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Overall Status */}
        {health && <OverallStatusBadge status={health.status} />}

        {/* Error State */}
        {error && (
          <div className="rounded-lg border border-error-clay/20 bg-error-clay/5 p-3 text-sm text-error-clay">
            {error}
          </div>
        )}

        {/* Integration Groups */}
        {Object.entries(checksByCategory).map(([category, integrations]) => (
          <div key={category}>
            <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
              {CATEGORY_LABELS[category] || category}
            </h4>
            <div className="space-y-1">
              {integrations.map(({ key, name, description, icon: Icon, health: check }) => (
                <div
                  key={key}
                  className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded-md bg-muted/50">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {check?.latencyMs !== undefined && (
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {check.latencyMs}ms
                      </span>
                    )}
                    {check?.deepChecked && (
                      <Wifi className="h-3 w-3 text-balanced-green" />
                    )}
                    <StatusBadge status={check?.status ?? "not_configured"} />
                    <StatusIcon status={check?.status ?? "not_configured"} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Footer */}
        {health && (
          <div className="flex items-center justify-between pt-2 border-t text-[10px] text-muted-foreground">
            <span>
              v{health.version} · {health.region} · {health.latencyMs}ms
            </span>
            <span>
              Uptime: {Math.floor(health.uptime / 3600)}h{" "}
              {Math.floor((health.uptime % 3600) / 60)}m
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
