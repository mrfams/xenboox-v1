"use client";

import { useState, useMemo } from "react";
import {
  History,
  Clock,
  User,
  Shield,
  Settings,
  CreditCard,
  FileText,
  Bot,
  Filter,
  Download,
  Search,
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Eye,
  BookOpen,
  Users,
  RefreshCw,
} from "lucide-react";

import { trpc } from "@/lib/trpc/client";
import { useEntity } from "@/lib/entity-context";
import { cn } from "@/lib/utils";
import { ModulePageShell } from "@/components/module/module-page-shell";
import { useSurfaceSync } from "@/lib/hooks/use-surface-sync";

// ─── Audit Trail ──────────────────────────────────────────────────────────
//
// Dedicated page showing all actions across every surface.
// Replaces the buried Settings > Audit Log section with a first-class view.

type ActionCategory = {
  label: string;
  icon: typeof Shield;
  color: string;
  surface: string;
};

const ACTION_CATEGORIES: Record<string, ActionCategory> = {
  "settings.": {
    label: "Settings",
    icon: Settings,
    color: "text-blue-600 bg-blue-50",
    surface: "Settings",
  },
  "auth.": {
    label: "Authentication",
    icon: Shield,
    color: "text-amber-600 bg-amber-50",
    surface: "Auth",
  },
  "billing.": {
    label: "Billing",
    icon: CreditCard,
    color: "text-emerald-600 bg-emerald-50",
    surface: "Billing",
  },
  "document.": {
    label: "Documents",
    icon: FileText,
    color: "text-purple-600 bg-purple-50",
    surface: "Documents",
  },
  "agent.": {
    label: "AI Agents",
    icon: Bot,
    color: "text-cyan-600 bg-cyan-50",
    surface: "Agents",
  },
  "journal.": {
    label: "Journal",
    icon: BookOpen,
    color: "text-indigo-600 bg-indigo-50",
    surface: "Ledger",
  },
  "invoice.": {
    label: "Invoices",
    icon: FileText,
    color: "text-pink-600 bg-pink-50",
    surface: "AR",
  },
  "payroll.": {
    label: "Payroll",
    icon: Users,
    color: "text-orange-600 bg-orange-50",
    surface: "Payroll",
  },
  "approvals.": {
    label: "Approvals",
    icon: CheckCircle2,
    color: "text-emerald-600 bg-emerald-50",
    surface: "Activity Hub",
  },
  "invitations.": {
    label: "Invitations",
    icon: User,
    color: "text-violet-600 bg-violet-50",
    surface: "Team",
  },
  "coa.": {
    label: "Chart of Accounts",
    icon: BookOpen,
    color: "text-indigo-600 bg-indigo-50",
    surface: "Ledger",
  },
  "reconciliation.": {
    label: "Reconciliation",
    icon: RefreshCw,
    color: "text-teal-600 bg-teal-50",
    surface: "Operations",
  },
};

function getCategoryForAction(action: string): ActionCategory {
  for (const [prefix, category] of Object.entries(ACTION_CATEGORIES)) {
    if (action.startsWith(prefix)) return category;
  }
  return {
    label: "Other",
    icon: History,
    color: "text-slate-600 bg-slate-50",
    surface: "Other",
  };
}

function getActionVerb(action: string): { verb: string; color: string } {
  if (
    action.includes("create") ||
    action.includes("insert") ||
    action.includes("issue")
  ) {
    return { verb: "Created", color: "text-emerald-600" };
  }
  if (
    action.includes("update") ||
    action.includes("edit") ||
    action.includes("patch")
  ) {
    return { verb: "Updated", color: "text-blue-600" };
  }
  if (
    action.includes("delete") ||
    action.includes("remove") ||
    action.includes("revoke")
  ) {
    return { verb: "Deleted", color: "text-red-600" };
  }
  if (
    action.includes("approve") ||
    action.includes("accept") ||
    action.includes("resolve")
  ) {
    return { verb: "Approved", color: "text-emerald-600" };
  }
  if (
    action.includes("reject") ||
    action.includes("deny") ||
    action.includes("decline")
  ) {
    return { verb: "Rejected", color: "text-red-600" };
  }
  if (action.includes("login") || action.includes("auth")) {
    return { verb: "Authenticated", color: "text-amber-600" };
  }
  return { verb: "Performed", color: "text-slate-600" };
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function AuditTrailPage() {
  const { entityId } = useEntity();
  const [limit, setLimit] = useState(50);

  // ── Cross-surface sync ────────────────────────────────────────────────
  // Listen for data_changed events from other surfaces and refetch
  useSurfaceSync({ entityId, surfaces: ["all"] });
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState("");
  const [surfaceFilter, setSurfaceFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading } = trpc.settings.getAuditLogs.useQuery(
    { limit: 200, offset: 0 },
    { enabled: !!entityId },
  );

  const logs = data?.logs ?? [];
  const total = data?.total ?? 0;

  // Filter logs
  const filteredLogs = useMemo(() => {
    let filtered = logs;

    // Search filter
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (log) =>
          log.action.toLowerCase().includes(q) ||
          log.entityType?.toLowerCase().includes(q) ||
          (log.newValues &&
            JSON.stringify(log.newValues).toLowerCase().includes(q)),
      );
    }

    // Surface filter
    if (surfaceFilter !== "all") {
      filtered = filtered.filter((log) => {
        const category = getCategoryForAction(log.action);
        return category.surface === surfaceFilter;
      });
    }

    return filtered.slice(offset, offset + limit);
  }, [logs, search, surfaceFilter, offset, limit]);

  // Get unique surfaces for filter
  const surfaces = useMemo(() => {
    const surfaceSet = new Set<string>();
    logs.forEach((log) => {
      const category = getCategoryForAction(log.action);
      surfaceSet.add(category.surface);
    });
    return Array.from(surfaceSet).sort();
  }, [logs]);

  // Stats
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayLogs = logs.filter((log) => new Date(log.createdAt) >= today);
    const thisWeek = new Date();
    thisWeek.setDate(thisWeek.getDate() - 7);
    const weekLogs = logs.filter((log) => new Date(log.createdAt) >= thisWeek);

    return {
      total: logs.length,
      today: todayLogs.length,
      thisWeek: weekLogs.length,
    };
  }, [logs]);

  return (
    <ModulePageShell
      title="Audit Trail"
      description="Complete history of all actions across your organization. Who did what, when."
      icon={History}
    >
      <div className="space-y-4 p-3 pb-20 sm:p-6 md:pb-6">
        {/* Stats */}
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border/50 bg-card p-4">
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10"
                aria-hidden="true"
              >
                <History className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {stats.total}
                </p>
                <p className="text-xs text-muted-foreground">Total Actions</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-border/50 bg-card p-4">
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10"
                aria-hidden="true"
              >
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {stats.today}
                </p>
                <p className="text-xs text-muted-foreground">Today</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-border/50 bg-card p-4">
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10"
                aria-hidden="true"
              >
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {stats.thisWeek}
                </p>
                <p className="text-xs text-muted-foreground">This Week</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                type="text"
                placeholder="Search actions..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setOffset(0);
                }}
                aria-label="Search audit log"
                className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <select
              value={surfaceFilter}
              onChange={(e) => {
                setSurfaceFilter(e.target.value);
                setOffset(0);
              }}
              aria-label="Filter by surface"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Surfaces</option>
              {surfaces.map((surface) => (
                <option key={surface} value={surface}>
                  {surface}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              Showing {filteredLogs.length} of {total} entries
            </span>
            <button
              type="button"
              onClick={() => {
                // Export filtered audit logs as CSV
                const headers = [
                  "Date",
                  "Action",
                  "Entity Type",
                  "Entity ID",
                  "User ID",
                  "Changes",
                ];
                const rows = filteredLogs.map((log) => [
                  new Date(log.createdAt).toISOString(),
                  log.action,
                  log.entityType ?? "",
                  log.entityId ?? "",
                  log.userId ?? "",
                  log.newValues ? JSON.stringify(log.newValues) : "",
                ]);
                const csv = [headers, ...rows]
                  .map((row) =>
                    row
                      .map((cell) => {
                        const escaped = String(cell).replace(/"/g, '""');
                        return '"' + escaped + '"';
                      })
                      .join(","),
                  )
                  .join("\n");
                const blob = new Blob([csv], {
                  type: "text/csv;charset=utf-8;",
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `audit-trail-${new Date().toISOString().split("T")[0]}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Audit Log Entries */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/50 py-12 text-center">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3"
              aria-hidden="true"
            >
              <History className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">
              No audit entries found
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {search
                ? "Try a different search term"
                : "Actions will appear here as they happen"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredLogs.map((log) => {
              const category = getCategoryForAction(log.action);
              const Icon = category.icon;
              const { verb, color } = getActionVerb(log.action);
              const isExpanded = expandedId === log.id;
              const logDate = new Date(log.createdAt);

              return (
                <div
                  key={log.id}
                  className="rounded-xl border border-border/50 bg-card overflow-hidden transition-all hover:shadow-sm"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : log.id)}
                    className="flex w-full items-start gap-3 p-4 text-left"
                    aria-expanded={isExpanded}
                  >
                    <div
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                        category.color,
                      )}
                    >
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn("text-xs font-semibold", color)}>
                          {verb}
                        </span>
                        <span className="text-sm font-medium text-foreground truncate">
                          {log.action}
                        </span>
                        {log.entityType && (
                          <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                            {log.entityType}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" aria-hidden="true" />
                          {log.userId
                            ? `User ${log.userId.slice(0, 8)}...`
                            : "System"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" aria-hidden="true" />
                          {formatTimeAgo(logDate)}
                        </span>
                        <span className="hidden sm:inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">
                          {category.surface}
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0 pt-1">
                      {isExpanded ? (
                        <ChevronUp
                          className="h-4 w-4 text-muted-foreground"
                          aria-hidden="true"
                        />
                      ) : (
                        <ChevronDown
                          className="h-4 w-4 text-muted-foreground"
                          aria-hidden="true"
                        />
                      )}
                    </div>
                  </button>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="border-t border-border/50 bg-muted/30 px-4 py-3">
                      <div className="grid gap-3 text-xs">
                        <div>
                          <span className="font-medium text-muted-foreground">
                            Action:
                          </span>
                          <span className="ml-2 text-foreground">
                            {log.action}
                          </span>
                        </div>
                        {log.entityType && (
                          <div>
                            <span className="font-medium text-muted-foreground">
                              Entity Type:
                            </span>
                            <span className="ml-2 text-foreground">
                              {log.entityType}
                            </span>
                          </div>
                        )}
                        {log.entityIdRef && (
                          <div>
                            <span className="font-medium text-muted-foreground">
                              Entity ID:
                            </span>
                            <span className="ml-2 text-foreground font-mono">
                              {log.entityIdRef}
                            </span>
                          </div>
                        )}
                        <div>
                          <span className="font-medium text-muted-foreground">
                            Timestamp:
                          </span>
                          <span className="ml-2 text-foreground">
                            {logDate.toLocaleString()}
                          </span>
                        </div>
                        {log.newValues && (
                          <div>
                            <span className="font-medium text-muted-foreground">
                              Changes:
                            </span>
                            <pre className="mt-1 rounded-lg bg-background p-3 text-[11px] overflow-auto max-h-40">
                              {JSON.stringify(log.newValues, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {filteredLogs.length > 0 && (
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setOffset(Math.max(0, offset - limit))}
              disabled={offset === 0}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-xs text-muted-foreground">
              {offset + 1}–{Math.min(offset + limit, filteredLogs.length)} of{" "}
              {filteredLogs.length}
            </span>
            <button
              type="button"
              onClick={() => setOffset(offset + limit)}
              disabled={offset + limit >= filteredLogs.length}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </ModulePageShell>
  );
}
