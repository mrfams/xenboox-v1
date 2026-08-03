"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  Input,
  Skeleton,
} from "@xenboox/ui";
import {
  Search,
  Filter,
  Download,
  Clock,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Minus,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  ExternalLink,
} from "lucide-react";

// KPI Card Component
function KpiCard({
  title,
  value,
  delta,
  deltaLabel,
  icon,
  iconColor,
  iconBg,
}: {
  title: string;
  value: string | number;
  delta?: number;
  deltaLabel?: string;
  icon: React.ReactNode;
  iconColor: string;
  iconBg: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">{title}</p>
            <p className="text-3xl font-bold">{value}</p>
            {delta !== undefined && (
              <div className="flex items-center gap-1 mt-2">
                {delta > 0 ? (
                  <span className="flex items-center text-sm text-emerald-600">
                    <ArrowUp className="h-3 w-3" />
                    {delta}
                  </span>
                ) : delta < 0 ? (
                  <span className="flex items-center text-sm text-red-600">
                    <ArrowDown className="h-3 w-3" />
                    {Math.abs(delta)}
                  </span>
                ) : (
                  <span className="flex items-center text-sm text-muted-foreground">
                    <Minus className="h-3 w-3" />
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  {deltaLabel}
                </span>
              </div>
            )}
          </div>
          <div className={`p-2.5 rounded-xl ${iconBg}`}>
            <div className={iconColor}>{icon}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Status Badge Component
function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700",
    in_progress: "bg-blue-100 text-blue-700",
    escalated: "bg-red-100 text-red-700",
    resolved: "bg-emerald-100 text-emerald-700",
    dismissed: "bg-gray-100 text-gray-700",
  };

  return (
    <Badge variant="secondary" className={colors[status] || colors.pending}>
      {status.charAt(0).toUpperCase() + status.slice(1).replace("_", " ")}
    </Badge>
  );
}

// Priority Badge Component
function PriorityBadge({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    low: "bg-blue-100 text-blue-700",
    medium: "bg-amber-100 text-amber-700",
    high: "bg-red-100 text-red-700",
    critical: "bg-purple-100 text-purple-700",
  };

  return (
    <Badge variant="secondary" className={colors[priority] || colors.medium}>
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </Badge>
  );
}

// Type Badge Component
function TypeBadge({ type }: { type: string }) {
  const labels: Record<string, string> = {
    data_validation: "Data Validation",
    entity_resolution: "Entity Resolution",
    duplicate_detection: "Duplicate Detection",
    compliance: "Compliance",
    missing_data: "Missing Data",
    approval: "Approval",
    anomaly: "Anomaly",
    review: "Review",
    configuration: "Configuration",
  };

  return (
    <Badge variant="outline" className="bg-slate-100">
      {labels[type] || type}
    </Badge>
  );
}

// Agent Badge Component
function AgentBadge({ agentId }: { agentId: string }) {
  const agents: Record<string, { name: string; abbr: string; color: string }> =
    {
      "reconciliation-agent": {
        name: "Reconciliation Agent",
        abbr: "RC",
        color: "bg-emerald-500",
      },
      "ap-agent": {
        name: "AP Automation Agent",
        abbr: "AP",
        color: "bg-blue-500",
      },
      "invoice-agent": {
        name: "Invoice Processing Agent",
        abbr: "IN",
        color: "bg-amber-500",
      },
      "payments-agent": {
        name: "Payments Agent",
        abbr: "PA",
        color: "bg-purple-500",
      },
      "bookkeeping-agent": {
        name: "Bookkeeping Agent",
        abbr: "BK",
        color: "bg-indigo-500",
      },
      "tax-agent": {
        name: "Tax Preparation Agent",
        abbr: "TX",
        color: "bg-red-500",
      },
      "document-agent": {
        name: "Document Agent",
        abbr: "DC",
        color: "bg-cyan-500",
      },
      "payroll-agent": {
        name: "Payroll Agent",
        abbr: "PR",
        color: "bg-pink-500",
      },
      "cash-agent": {
        name: "Cash Flow Agent",
        abbr: "CF",
        color: "bg-teal-500",
      },
    };

  const agent = agents[agentId] || {
    name: agentId,
    abbr: "AG",
    color: "bg-gray-500",
  };

  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-7 h-7 rounded-full ${agent.color} flex items-center justify-center text-white text-xs font-medium`}
      >
        {agent.abbr}
      </div>
      <span className="text-sm">{agent.name}</span>
    </div>
  );
}

// Detail Panel Component
function DetailPanel({ item, onClose }: { item: any; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<
    "details" | "evidence" | "history"
  >("details");

  return (
    <div className="w-[400px] border-l bg-white flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-500" />
            <h3 className="font-semibold">{item.title}</h3>
          </div>
          <div className="flex items-center gap-2">
            <PriorityBadge priority={item.priority} />
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              <XCircle className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        {(["details", "evidence", "history"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-sm font-medium ${
              activeTab === tab
                ? "text-purple-600 border-b-2 border-purple-600"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === "details" && (
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Description</h4>
              <p className="text-sm text-muted-foreground">
                {item.description}
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Type</span>
                <TypeBadge type={item.type} />
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Agent</span>
                <AgentBadge agentId={item.agentId} />
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  Organization
                </span>
                <span className="text-sm font-medium">
                  {item.organizationId}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Run ID</span>
                <span className="text-sm font-mono">{item.runId || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  Created At
                </span>
                <span className="text-sm">
                  {item.createdAt
                    ? new Date(item.createdAt).toLocaleString()
                    : "N/A"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">SLA</span>
                <span
                  className={`text-sm ${item.slaBreached ? "text-red-600 font-medium" : ""}`}
                >
                  {item.slaBreached ? "-15m (Breached)" : "35m"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Priority</span>
                <PriorityBadge priority={item.priority} />
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <StatusBadge status={item.status} />
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  Assigned To
                </span>
                <span className="text-sm">
                  {item.assignedTo || "Unassigned"}{" "}
                  <button className="text-purple-600 hover:underline">
                    Assign
                  </button>
                </span>
              </div>
            </div>

            {/* AI Recommendation */}
            {item.aiRecommendation && (
              <div className="mt-4">
                <h4 className="font-medium mb-2">AI Recommendation</h4>
                <div className="p-3 bg-slate-50 rounded-lg text-sm">
                  {item.aiRecommendation}
                </div>
                <button className="flex items-center gap-1 mt-2 text-sm text-purple-600 hover:underline">
                  View AI reasoning <ExternalLink className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === "evidence" && (
          <div className="text-center text-muted-foreground py-8">
            No evidence attached yet.
          </div>
        )}

        {activeTab === "history" && (
          <div className="text-center text-muted-foreground py-8">
            No history available.
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-4 border-t space-y-2">
        <Button className="w-full bg-purple-600 hover:bg-purple-700">
          Approve Match
        </Button>
        <Button variant="outline" className="w-full">
          Create New Record
        </Button>
        <Button variant="outline" className="w-full">
          Request More Info
        </Button>
        <Button
          variant="outline"
          className="w-full text-red-600 border-red-200 hover:bg-red-50"
        >
          Escalate
        </Button>
      </div>
    </div>
  );
}

export default function ReviewQueuePage() {
  const [activeTab, setActiveTab] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [typeFilter] = useState<string>("all");
  const [agentFilter] = useState<string>("all");
  const [priorityFilter] = useState<string>("all");

  // Fetch overview data
  const { data: overview, isLoading } = trpc.reviewQueue.getOverview.useQuery({
    tab: activeTab as any,
    search: search || undefined,
    type: typeFilter !== "all" ? typeFilter : undefined,
    agentId: agentFilter !== "all" ? agentFilter : undefined,
    priority: priorityFilter !== "all" ? priorityFilter : undefined,
    page,
    pageSize: 10,
  });

  // Seed demo data mutation
  const seedMutation = trpc.reviewQueue.seedDemoData.useMutation({
    onSuccess: () => {
      window.location.reload();
    },
  });

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setPage(1);
  };

  const tabs = [
    { id: "all", label: "All", count: overview?.tabs?.all ?? 0 },
    {
      id: "high_priority",
      label: "High Priority",
      count: overview?.tabs?.highPriority ?? 0,
    },
    { id: "pending", label: "Pending", count: overview?.tabs?.pending ?? 0 },
    {
      id: "escalated",
      label: "Escalated",
      count: overview?.tabs?.escalated ?? 0,
    },
    {
      id: "sla_breached",
      label: "SLA Breached",
      count: overview?.tabs?.slaBreached ?? 0,
    },
    { id: "resolved", label: "Resolved", count: overview?.tabs?.resolved ?? 0 },
  ];

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">7</span>
                <h1 className="text-2xl font-bold">Human Review Queue</h1>
              </div>
              <p className="text-sm text-muted-foreground">
                Review and resolve items that require human attention.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search runs, agents, or organizations..."
                  value={search}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setSearch(e.target.value)
                  }
                  className="pl-9 w-[300px]"
                />
              </div>
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button
                onClick={() => seedMutation.mutate()}
                variant="outline"
                size="sm"
              >
                Seed Data
              </Button>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="px-6 py-4">
          <div className="grid grid-cols-6 gap-4">
            <KpiCard
              title="Pending Review"
              value={overview?.kpis?.pendingReview ?? 0}
              delta={overview?.kpis?.pendingDelta}
              deltaLabel="vs yesterday"
              icon={<Clock className="h-5 w-5" />}
              iconColor="text-amber-600"
              iconBg="bg-amber-100"
            />
            <KpiCard
              title="High Priority"
              value={overview?.kpis?.highPriority ?? 0}
              delta={overview?.kpis?.highPriorityDelta}
              deltaLabel="vs yesterday"
              icon={<AlertTriangle className="h-5 w-5" />}
              iconColor="text-red-600"
              iconBg="bg-red-100"
            />
            <KpiCard
              title="SLA Breached"
              value={overview?.kpis?.slaBreached ?? 0}
              delta={overview?.kpis?.slaBreachedDelta}
              deltaLabel="vs yesterday"
              icon={<AlertTriangle className="h-5 w-5" />}
              iconColor="text-red-600"
              iconBg="bg-red-100"
            />
            <KpiCard
              title="Escalated"
              value={overview?.kpis?.escalated ?? 0}
              delta={overview?.kpis?.escalatedDelta}
              deltaLabel="vs yesterday"
              icon={<ArrowUp className="h-5 w-5" />}
              iconColor="text-purple-600"
              iconBg="bg-purple-100"
            />
            <KpiCard
              title="Completed (24h)"
              value={overview?.kpis?.completed24h ?? 0}
              delta={overview?.kpis?.completedDelta}
              deltaLabel="vs yesterday"
              icon={<CheckCircle className="h-5 w-5" />}
              iconColor="text-emerald-600"
              iconBg="bg-emerald-100"
            />
            <KpiCard
              title="Avg. Resolution Time"
              value={overview?.kpis?.avgResolutionTime ?? "0m"}
              delta={overview?.kpis?.resolutionTimeDelta}
              deltaLabel="vs yesterday"
              icon={<Clock className="h-5 w-5" />}
              iconColor="text-blue-600"
              iconBg="bg-blue-100"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 border-b">
          <div className="flex gap-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-purple-600 text-purple-600"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
        </div>

        {/* Filter Bar */}
        <div className="px-6 py-3 bg-white border-b flex items-center gap-4">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search items..." className="pl-9" />
          </div>
          <select className="px-3 py-2 border rounded-md text-sm">
            <option>All Types</option>
            <option>Data Validation</option>
            <option>Entity Resolution</option>
            <option>Duplicate Detection</option>
            <option>Compliance</option>
            <option>Missing Data</option>
            <option>Approval</option>
            <option>Anomaly</option>
            <option>Review</option>
            <option>Configuration</option>
          </select>
          <select className="px-3 py-2 border rounded-md text-sm">
            <option>All Agents</option>
            <option>Reconciliation Agent</option>
            <option>AP Automation Agent</option>
            <option>Invoice Processing Agent</option>
            <option>Payments Agent</option>
            <option>Bookkeeping Agent</option>
            <option>Tax Preparation Agent</option>
            <option>Document Agent</option>
            <option>Payroll Agent</option>
            <option>Cash Flow Agent</option>
          </select>
          <select className="px-3 py-2 border rounded-md text-sm">
            <option>All Organizations</option>
            <option>Acme Solutions Ltd.</option>
            <option>Power Solutions Ltd.</option>
            <option>GTM Traders</option>
            <option>Bakau Traders Co.</option>
            <option>Ministry of Health</option>
            <option>Africell Gambia Ltd.</option>
            <option>Delta Shipping Co.</option>
            <option>Indigo Farms Ltd.</option>
            <option>OMC Group</option>
            <option>Sunu Supermarket</option>
          </select>
          <select className="px-3 py-2 border rounded-md text-sm">
            <option>All Priority</option>
            <option>Low</option>
            <option>Medium</option>
            <option>High</option>
            <option>Critical</option>
          </select>
          <button className="text-sm text-muted-foreground hover:text-foreground">
            Clear
          </button>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : overview?.items?.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <p>No review items found.</p>
              <Button
                onClick={() => seedMutation.mutate()}
                variant="link"
                className="mt-2"
              >
                Seed demo data
              </Button>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="w-10 px-4 py-3">
                    <input type="checkbox" className="rounded" />
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                    Item
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                    Type
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                    Agent
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                    Organization
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                    Priority
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                    Created At
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                    SLA
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="w-10 px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {overview?.items?.map((item: any) => (
                  <tr
                    key={item.id}
                    className={`hover:bg-slate-50 cursor-pointer ${
                      selectedItem?.id === item.id ? "bg-purple-50" : ""
                    }`}
                    onClick={() => setSelectedItem(item)}
                  >
                    <td className="px-4 py-3">
                      <input type="checkbox" className="rounded" />
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-sm">{item.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {item.description}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <TypeBadge type={item.type} />
                    </td>
                    <td className="px-4 py-3">
                      <AgentBadge agentId={item.agentId} />
                    </td>
                    <td className="px-4 py-3 text-sm">{item.organizationId}</td>
                    <td className="px-4 py-3">
                      <PriorityBadge priority={item.priority} />
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {item.createdAt
                        ? new Date(item.createdAt).toLocaleString()
                        : "N/A"}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {item.slaBreached ? (
                        <span className="text-red-600 font-medium">-15m</span>
                      ) : (
                        <span>35m</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-4 py-3">
                      <button className="p-1 hover:bg-slate-100 rounded">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        <div className="px-6 py-3 bg-white border-t flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * 10 + 1} to{" "}
            {Math.min(page * 10, overview?.pagination?.total ?? 0)} of{" "}
            {overview?.pagination?.total ?? 0} items
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from(
              { length: Math.min(5, overview?.pagination?.totalPages ?? 0) },
              (_, i) => i + 1,
            ).map((p) => (
              <Button
                key={p}
                variant={p === page ? "default" : "outline"}
                size="sm"
                onClick={() => setPage(p)}
                className={
                  p === page ? "bg-purple-600 hover:bg-purple-700" : ""
                }
              >
                {p}
              </Button>
            ))}
            {(overview?.pagination?.totalPages ?? 0) > 5 && <span>...</span>}
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setPage(
                  Math.min(overview?.pagination?.totalPages ?? 1, page + 1),
                )
              }
              disabled={page === (overview?.pagination?.totalPages ?? 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <select className="px-2 py-1 border rounded text-sm ml-2">
              <option value="10">10 / page</option>
              <option value="25">25 / page</option>
              <option value="50">50 / page</option>
            </select>
          </div>
        </div>
      </div>

      {/* Detail Panel */}
      {selectedItem && (
        <DetailPanel
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
}
