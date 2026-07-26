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
  Building2,
  Users,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Search,
  Plus,
  RefreshCw,
  Clock,
  ArrowUpRight,
  Landmark,
  Briefcase,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────

type ClientEngagement = {
  engagementId: string;
  engagementType: string;
  addedAt: string;
  clientConsentedAt: string | null;
  entity: {
    id: string;
    name: string;
    currency: string;
    country: string;
    type: string;
    isActive: boolean;
  };
  snapshot: {
    healthStatus: "healthy" | "needs_review" | "critical";
    booksCurrent: boolean;
    unreconciledItems: number;
    overdueInvoices: number;
    pendingApprovals: number;
    daysUntilClose: number;
    lastClosePeriod: string | null;
    cashBalance: number;
    lastRefreshedAt: string | null;
  } | null;
};

// ─── Health Status Badge ──────────────────────────────────────────────

function HealthBadge({
  status,
}: {
  status: "healthy" | "needs_review" | "critical";
}) {
  const config = {
    healthy: {
      label: "Healthy",
      color: "text-emerald-600",
      bg: "bg-emerald-100",
      dot: "bg-emerald-500",
    },
    needs_review: {
      label: "Needs Review",
      color: "text-amber-600",
      bg: "bg-amber-100",
      dot: "bg-amber-500",
    },
    critical: {
      label: "Critical",
      color: "text-red-600",
      bg: "bg-red-100",
      dot: "bg-red-500",
    },
  };

  const c = config[status] ?? config.needs_review;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        c.color,
        c.bg,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", c.dot)} />
      {c.label}
    </span>
  );
}

// ─── Client Search & Filter Bar ─────────────────────────────────────

function ClientFilterBar({
  search,
  onSearchChange,
  filterStatus,
  onFilterChange,
  clientCount,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  filterStatus: string;
  onFilterChange: (v: string) => void;
  clientCount: number;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search clients..."
          className="w-full rounded-lg border bg-background py-2 pl-10 pr-4 text-sm outline-none transition-colors focus:border-primary/50"
        />
      </div>
      <div className="flex items-center gap-2">
        <select
          value={filterStatus}
          onChange={(e) => onFilterChange(e.target.value)}
          className="rounded-lg border bg-background px-3 py-2 text-xs outline-none"
        >
          <option value="all">All Clients</option>
          <option value="healthy">Healthy</option>
          <option value="needs_review">Needs Review</option>
          <option value="critical">Critical</option>
        </select>
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {clientCount} client{clientCount !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );
}

// ─── Client Card ──────────────────────────────────────────────────────

function ClientCard({ client }: { client: ClientEngagement }) {
  const snapshot = client.snapshot;

  return (
    <Link
      href={`/dashboard/firm/clients/${client.entity.id}`}
      className="group block rounded-xl border bg-card p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600">
              <Building2 className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate group-hover:text-blue-600 transition-colors">
                {client.entity.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {client.entity.country} · {client.entity.currency}
              </p>
            </div>
          </div>
        </div>
        {snapshot && <HealthBadge status={snapshot.healthStatus} />}
      </div>

      {snapshot ? (
        <>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="rounded-lg bg-muted/50 p-2 text-center">
              <p className="text-xs text-muted-foreground">Cash</p>
              <p className="text-sm font-semibold tabular-nums">
                {formatCurrency(snapshot.cashBalance)}
              </p>
            </div>
            <div className="rounded-lg bg-muted/50 p-2 text-center">
              <p className="text-xs text-muted-foreground">Overdue</p>
              <p className="text-sm font-semibold tabular-nums">
                {snapshot.overdueInvoices}
              </p>
            </div>
          </div>

          <div className="space-y-1.5 text-xs text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>Unreconciled items</span>
              <span className="font-medium">{snapshot.unreconciledItems}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Pending approvals</span>
              <span className="font-medium">{snapshot.pendingApprovals}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>Close in {snapshot.daysUntilClose}d</span>
              </div>
              {snapshot.booksCurrent ? (
                <span className="text-emerald-600 font-medium">Current</span>
              ) : (
                <span className="text-amber-600 font-medium">Overdue</span>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="py-4 text-center">
          <RefreshCw className="h-5 w-5 mx-auto text-muted-foreground animate-spin" />
          <p className="mt-2 text-xs text-muted-foreground">
            Loading snapshot...
          </p>
        </div>
      )}

      <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {client.engagementType === "full"
            ? "Full service"
            : client.engagementType === "review"
              ? "Review only"
              : client.engagementType === "tax_only"
                ? "Tax only"
                : "Audit only"}
        </span>
        <span className="flex items-center gap-1 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
          Open <ArrowUpRight className="h-3 w-3" />
        </span>
      </div>
    </Link>
  );
}

// ─── Engagement Summary Stats ──────────────────────────────────────────

function EngagementSummary({
  clients,
  isLoading,
}: {
  clients: ClientEngagement[];
  isLoading: boolean;
}) {
  const stats = useMemo(() => {
    const total = clients.length;
    const withSnapshot = clients.filter((c) => c.snapshot);
    const healthy = withSnapshot.filter(
      (c) => c.snapshot?.healthStatus === "healthy",
    ).length;
    const needsReview = withSnapshot.filter(
      (c) => c.snapshot?.healthStatus === "needs_review",
    ).length;
    const critical = withSnapshot.filter(
      (c) => c.snapshot?.healthStatus === "critical",
    ).length;
    const totalCash = withSnapshot.reduce(
      (s, c) => s + (c.snapshot?.cashBalance ?? 0),
      0,
    );
    return { total, healthy, needsReview, critical, totalCash };
  }, [clients]);

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        icon={<Briefcase className="h-4 w-4" />}
        label="Active Clients"
        value={String(stats.total)}
        changeLabel="All engagements"
        href="/dashboard/firm"
      />
      <StatCard
        icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />}
        label="Healthy"
        value={String(stats.healthy)}
        changeLabel={
          stats.total > 0
            ? `${Math.round((stats.healthy / stats.total) * 100)}% of clients`
            : "No data"
        }
        href="/dashboard/firm"
      />
      <StatCard
        icon={<AlertCircle className="h-4 w-4 text-amber-500" />}
        label="Needs Review"
        value={String(stats.needsReview)}
        changeLabel="Requires attention"
        href="/dashboard/firm"
      />
      <StatCard
        icon={<Landmark className="h-4 w-4" />}
        label="Total Client Cash"
        value={formatCurrency(stats.totalCash)}
        changeLabel="Across all clients"
        href="/dashboard/firm"
      />
    </div>
  );
}

// ─── Main Dashboard Component ──────────────────────────────────────────

export function ExternalAccountantDashboard() {
  const { entityId } = useEntity();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const { data: firmData, isLoading } = trpc.firm.listClients.useQuery(
    { status: "active" },
    { enabled: !!entityId, refetchInterval: 120000 },
  );

  const clients = useMemo(() => {
    const all = (firmData?.clients ?? []) as ClientEngagement[];
    return all.filter((c) => {
      if (search) {
        const term = search.toLowerCase();
        if (!c.entity.name.toLowerCase().includes(term)) return false;
      }
      if (filterStatus !== "all" && c.snapshot) {
        if (c.snapshot.healthStatus !== filterStatus) return false;
      }
      return true;
    });
  }, [firmData, search, filterStatus]);

  if (isLoading && !firmData) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Firm Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Multi-client oversight — health status, financial snapshots, and
            engagement management.
          </p>
        </div>
        <Badge variant="outline" className="text-xs gap-1">
          <Users className="h-3 w-3" />
          External Accountant
        </Badge>
      </div>

      {/* No clients state */}
      {clients.length === 0 && !isLoading && (
        <EmptyState
          icon={<Building2 className="h-12 w-12" />}
          title="No active clients"
          description="Link a client entity to start monitoring their financial health from this dashboard."
          action={
            <Link href="/dashboard/firm/add-client">
              <Button size="sm" className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                Add Client
              </Button>
            </Link>
          }
        />
      )}

      {clients.length > 0 && (
        <>
          {/* Stats */}
          <EngagementSummary
            clients={(firmData?.clients ?? []) as ClientEngagement[]}
            isLoading={isLoading}
          />

          {/* Active firms */}
          {firmData?.firms && firmData.firms.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Building2 className="h-3.5 w-3.5" />
              <span>Firm:</span>
              {firmData.firms.map((f) => (
                <Badge key={f.id} variant="secondary" className="text-[10px]">
                  {f.name}
                </Badge>
              ))}
            </div>
          )}

          {/* Search & Filter */}
          <ClientFilterBar
            search={search}
            onSearchChange={setSearch}
            filterStatus={filterStatus}
            onFilterChange={setFilterStatus}
            clientCount={clients.length}
          />

          {/* Client Cards Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {clients.map((client) => (
              <ClientCard key={client.engagementId} client={client} />
            ))}
          </div>

          {/* Engagement Management */}
          <div className="flex items-center justify-between rounded-xl border bg-card px-5 py-4">
            <div>
              <p className="text-sm font-medium">Client Management</p>
              <p className="text-xs text-muted-foreground">
                Add new clients, manage engagements, or view history.
              </p>
            </div>
            <div className="flex gap-2">
              <Link href="/dashboard/firm/add-client">
                <Button size="sm" variant="outline" className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  Add Client
                </Button>
              </Link>
              <Link href="/dashboard/firm/history">
                <Button size="sm" variant="ghost" className="gap-1.5">
                  History
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
