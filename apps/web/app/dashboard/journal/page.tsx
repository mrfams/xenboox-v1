"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";

import { AICopilotSidebar } from "@/components/dashboard/ai-copilot-sidebar";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/loading";
import {
  Badge,
  Button,
  Input,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui";
import {
  FileText,
  Plus,
  MoreHorizontal,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  Bot,
  Upload,
  RefreshCw,
} from "lucide-react";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

const sourceColors: Record<string, string> = {
  manual: "bg-blue-100 text-blue-700",
  bank_import: "bg-emerald-100 text-emerald-700",
  payroll: "bg-purple-100 text-purple-700",
  inventory: "bg-amber-100 text-amber-700",
  automation: "bg-indigo-100 text-indigo-700",
  ingestion: "bg-cyan-100 text-cyan-700",
};

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  pending_review: "bg-amber-100 text-amber-700",
  posted: "bg-emerald-100 text-emerald-700",
  reversed: "bg-red-100 text-red-700",
  voided: "bg-red-100 text-red-700",
};

type JournalEntry = {
  id: string;
  entityId: string;
  entryNumber: number;
  description: string;
  reference?: string | null;
  date: string;
  periodId: string;
  status: string;
  source?: string | null;
  confidence?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export default function JournalPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [statusFilter, setStatusFilter] = useState<string | undefined>(
    undefined,
  );
  const [copilotOpen, setCopilotOpen] = useState(true);

  // Fetch real journal entries from the database with entity scoping
  const { data: entriesData, isLoading } = trpc.journal.list.useQuery({
    limit: 50,
    offset: 0,
    status: statusFilter as
      | "draft"
      | "pending_review"
      | "posted"
      | "reversed"
      | "voided"
      | undefined,
  });

  const entries = useMemo(() => {
    if (!entriesData) return [];
    let result = [...entriesData];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.description.toLowerCase().includes(q) ||
          String(e.entryNumber).includes(q) ||
          (e.reference ?? "").toLowerCase().includes(q),
      );
    }
    return result;
  }, [entriesData, search]);

  // Compute KPI metrics from real data
  const kpis = useMemo(() => {
    if (!entriesData) return null;
    const totalEntries = entriesData.length;
    const draftCount = entriesData.filter((e) => e.status === "draft").length;
    const pendingCount = entriesData.filter(
      (e) => e.status === "pending_review",
    ).length;
    const postedCount = entriesData.filter((e) => e.status === "posted").length;
    const voidedCount = entriesData.filter(
      (e) => e.status === "voided" || e.status === "reversed",
    ).length;
    const aiGenerated = entriesData.filter(
      (e) => e.source === "automation" || e.source === "ingestion",
    ).length;
    const aiPct =
      totalEntries > 0 ? Math.round((aiGenerated / totalEntries) * 100) : 0;
    return {
      totalEntries,
      draftCount,
      pendingCount,
      postedCount,
      voidedCount,
      aiGenerated,
      aiPct,
    };
  }, [entriesData]);

  // AI Copilot insights based on real data
  const insights = useMemo(() => {
    if (!kpis) return [];
    return [
      {
        id: "1",
        type: "warning" as const,
        title: `${kpis.pendingCount} entries need your review`,
        description: "These entries are awaiting approval",
        action: { label: "Review pending entries", onClick: () => {} },
      },
      {
        id: "2",
        type: "info" as const,
        title: `${kpis.aiPct}% of entries are AI-generated`,
        description: `${kpis.aiGenerated} of ${kpis.totalEntries} entries created by AI`,
        action: { label: "View automation log", onClick: () => {} },
      },
    ];
  }, [kpis]);

  const tabs = [
    { id: "all", label: "All Entries", count: kpis?.totalEntries ?? 0 },
    { id: "draft", label: "Draft", count: kpis?.draftCount ?? 0 },
    {
      id: "pending_review",
      label: "Pending Approval",
      count: kpis?.pendingCount ?? 0,
    },
    { id: "posted", label: "Posted", count: kpis?.postedCount ?? 0 },
    { id: "voided", label: "Voided", count: kpis?.voidedCount ?? 0 },
  ];

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-6 p-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <FileText className="h-6 w-6 text-primary" />
                Journal Entries
              </h1>
              <p className="text-sm text-muted-foreground">
                Create, review, and manage journal entries with AI assistance.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Upload className="mr-2 h-4 w-4" />
                Import
              </Button>
              <Button variant="outline" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                onClick={() => router.push("/dashboard/journal/new")}
              >
                <Plus className="mr-2 h-4 w-4" />
                New Journal Entry
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 border-b overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (tab.id === "all") {
                    setStatusFilter(undefined);
                  } else {
                    setStatusFilter(tab.id);
                  }
                }}
                className={cn(
                  "px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap",
                  activeTab === tab.id
                    ? "border-b-2 border-primary text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}{" "}
                <span className="ml-1.5 text-xs">({tab.count})</span>
              </button>
            ))}
          </div>

          {/* KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              {
                label: "Total Entries (MTD)",
                value: (kpis?.totalEntries ?? 0).toString(),
                icon: FileText,
                color: "text-primary",
                bgColor: "bg-primary/10",
              },
              {
                label: "Draft",
                value: (kpis?.draftCount ?? 0).toString(),
                icon: Clock,
                color: "text-gray-600",
                bgColor: "bg-gray-50",
              },
              {
                label: "Pending Approval",
                value: (kpis?.pendingCount ?? 0).toString(),
                icon: AlertTriangle,
                color: "text-amber-600",
                bgColor: "bg-amber-50",
              },
              {
                label: "Posted",
                value: (kpis?.postedCount ?? 0).toString(),
                icon: CheckCircle,
                color: "text-emerald-600",
                bgColor: "bg-emerald-50",
              },
              {
                label: "Auto-Generated (MTD)",
                value: `${kpis?.aiPct ?? 0}%`,
                subtext: `${kpis?.aiGenerated ?? 0} of ${kpis?.totalEntries ?? 0} entries`,
                icon: Bot,
                color: "text-emerald-600",
                bgColor: "bg-emerald-50",
              },
            ].map((kpi) => {
              const Icon = kpi.icon;
              return (
                <div
                  key={kpi.label}
                  className="rounded-xl border bg-card p-4 transition-all duration-200 hover:shadow-md"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      {kpi.label}
                    </p>
                    <div
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-lg",
                        kpi.bgColor,
                      )}
                    >
                      <Icon className={cn("h-4 w-4", kpi.color)} />
                    </div>
                  </div>
                  <p className="text-xl font-bold tracking-tight tabular-nums">
                    {kpi.value}
                  </p>
                  {kpi.subtext && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {kpi.subtext}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search journal entries..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Button variant="outline" size="sm">
              <Filter className="mr-2 h-4 w-4" />
              Filters
            </Button>
          </div>

          {/* Data Table */}
          {isLoading ? (
            <TableSkeleton rows={6} columns={7} />
          ) : entries.length === 0 ? (
            <EmptyState
              icon={<FileText className="h-12 w-12" />}
              title="No journal entries"
              description="Create your first journal entry to start recording transactions."
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border bg-card">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground w-10">
                      <input type="checkbox" className="rounded" />
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                      Entry #
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                      Date
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                      Description
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                      Source
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                      Reference
                    </th>
                    <th className="py-3 px-4 text-center text-xs font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="py-3 px-4 text-center text-xs font-medium text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr
                      key={entry.id}
                      className="border-b hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() =>
                        router.push(`/dashboard/journal/${entry.id}`)
                      }
                    >
                      <td
                        className="py-3 px-4"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input type="checkbox" className="rounded" />
                      </td>
                      <td className="py-3 px-4 text-sm font-mono font-medium text-primary">
                        JE-{String(entry.entryNumber).padStart(4, "0")}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {formatDate(entry.date)}
                      </td>
                      <td className="py-3 px-4 text-sm font-medium">
                        {entry.description}
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-[10px]",
                            sourceColors[entry.source ?? "manual"] ??
                              "bg-gray-100 text-gray-700",
                          )}
                        >
                          {(entry.source ?? "manual").replace(/_/g, " ")}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-sm font-mono text-muted-foreground">
                        {entry.reference ?? "—"}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-[10px]",
                            statusColors[entry.status] ??
                              "bg-gray-100 text-gray-700",
                          )}
                        >
                          {entry.status.replace(/_/g, " ")}
                        </Badge>
                      </td>
                      <td
                        className="py-3 px-4 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex items-center justify-between border-t px-4 py-3">
                <p className="text-sm text-muted-foreground">
                  Showing 1 to {Math.min(entries.length, 50)} of{" "}
                  {entries.length} entries
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled>
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-primary text-primary-foreground"
                  >
                    1
                  </Button>
                  <Button variant="outline" size="sm" disabled>
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AI Copilot Sidebar */}
      {copilotOpen && (
        <div className="w-80 border-l bg-card hidden lg:block">
          <AICopilotSidebar
            title="Xenboox AI Copilot"
            subtitle="I analyzed your journal entries and found a few insights."
            insights={insights}
            suggestedActions={[
              {
                id: "1",
                icon: <Plus className="h-4 w-4" />,
                label: "New Journal Entry",
                description: "Create manual entry",
              },
              {
                id: "2",
                icon: <Upload className="h-4 w-4" />,
                label: "Import Entries",
                description: "Import from Excel/CSV",
              },
              {
                id: "3",
                icon: <RefreshCw className="h-4 w-4" />,
                label: "Recurring Entries",
                description: "Manage recurring",
              },
              {
                id: "4",
                icon: <FileText className="h-4 w-4" />,
                label: "Journal Entry Report",
                description: "View reports",
              },
            ]}
            onClose={() => setCopilotOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
