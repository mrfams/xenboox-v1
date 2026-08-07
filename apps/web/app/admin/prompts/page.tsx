"use client";

import { useState } from "react";
import { Card, CardContent, Badge, Button, Skeleton } from "@xenboox/ui";
import {
  Search,
  Plus,
  ChevronRight,
  ChevronLeft,
  Star,
  MoreHorizontal,
  Edit,
  Copy,
  Play,
  Trash2,
  X,
} from "lucide-react";

import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

// ─── Status Badge ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-700",
    draft: "bg-slate-100 text-slate-700",
    deprecated: "bg-red-100 text-red-700",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
        styles[status] ?? styles.draft,
      )}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// ─── Model Badge ────────────────────────────────────────────────────────────

function ModelBadge({ model }: { model: string }) {
  const isClaude = model.toLowerCase().includes("claude");
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
        isClaude
          ? "bg-violet-100 text-violet-700"
          : "bg-blue-100 text-blue-700",
      )}
    >
      {model}
    </span>
  );
}

// ─── KPI Card ───────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <Card className="transition-all hover:shadow-md">
      <CardContent className="p-4">
        <span className="text-[11px] font-medium text-muted-foreground">
          {label}
        </span>
        <p className={cn("text-2xl font-bold tracking-tight mt-1", color)}>
          {value}
        </p>
        {sub && (
          <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Detail Panel ───────────────────────────────────────────────────────────

function DetailPanel({
  prompt,
  onClose,
}: {
  prompt: {
    promptId: string;
    name: string;
    description: string | null;
    agentName: string;
    model: string;
    version: string;
    status: string;
    createdAt: Date | string;
    updatedAt: Date | string;
    tags: string[];
    promptContent: string | null;
    createdBy: string | null;
  };
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<
    "overview" | "versions" | "usage" | "evaluations" | "history"
  >("overview");

  return (
    <div className="w-96 border-l border-border/50 bg-card overflow-y-auto">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border/50 bg-card p-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{prompt.name}</span>
          <StatusBadge status={prompt.status} />
        </div>
        <button
          onClick={onClose}
          className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="px-4 py-2">
        <p className="text-[10px] text-muted-foreground">
          Prompt ID: {prompt.promptId}
        </p>
      </div>
      <div className="flex border-b border-border/50 px-4">
        {(
          ["overview", "versions", "usage", "evaluations", "history"] as const
        ).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-3 py-2 text-xs font-medium capitalize border-b-2 transition-colors",
              activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab}
          </button>
        ))}
      </div>
      <div className="p-4 space-y-4">
        {activeTab === "overview" && (
          <>
            <div>
              <h4 className="text-xs font-semibold mb-1">Description</h4>
              <p className="text-xs text-muted-foreground">
                {prompt.description}
              </p>
            </div>
            <div className="space-y-2">
              {[
                ["Agent", prompt.agentName],
                ["Model", prompt.model],
                ["Version", `${prompt.version} (Latest)`],
                ["Created by", prompt.createdBy ?? "System"],
                [
                  "Created at",
                  new Date(prompt.createdAt).toLocaleDateString("en", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  }),
                ],
                [
                  "Updated at",
                  new Date(prompt.updatedAt).toLocaleDateString("en", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  }),
                ],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between">
                  <span className="text-xs text-muted-foreground">{label}</span>
                  <span className="text-xs font-medium">{value}</span>
                </div>
              ))}
            </div>
            {prompt.tags.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold mb-1">Tags</h4>
                <div className="flex flex-wrap gap-1">
                  {prompt.tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="text-[10px]"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {prompt.promptContent && (
              <div>
                <h4 className="text-xs font-semibold mb-1">Prompt</h4>
                <div className="rounded-lg border border-border/50 bg-muted/30 p-3">
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">
                    {prompt.promptContent}
                  </pre>
                </div>
                <button className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 mt-2">
                  View full prompt <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            )}
            <div>
              <h4 className="text-xs font-semibold mb-2">Quick Actions</h4>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" className="justify-start">
                  <Edit className="h-3 w-3 mr-1" />
                  Edit Prompt
                </Button>
                <Button variant="outline" size="sm" className="justify-start">
                  <Copy className="h-3 w-3 mr-1" />
                  Duplicate
                </Button>
                <Button variant="outline" size="sm" className="justify-start">
                  <Play className="h-3 w-3 mr-1" />
                  Test Prompt
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="justify-start text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Deprecate
                </Button>
              </div>
            </div>
          </>
        )}
        {activeTab !== "overview" && (
          <div className="text-xs text-muted-foreground text-center py-8">
            Coming soon
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function PromptLibraryPage() {
  const [activeTab, setActiveTab] = useState<
    "all" | "my" | "favorites" | "deprecated"
  >("all");
  const [search, setSearch] = useState("");
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const pageSize = 10;

  const { data, isLoading } = trpc.promptLibrary.getOverview.useQuery({
    tab: activeTab,
    search: search || undefined,
    limit: pageSize,
    offset: page * pageSize,
  });

  const { data: selectedPrompt } = trpc.promptLibrary.getDetail.useQuery(
    { promptId: selectedPromptId ?? "" },
    { enabled: !!selectedPromptId },
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-80" />
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const totalPages = data ? Math.ceil(data.total / pageSize) : 1;

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 lg:p-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-700 text-sm font-bold">
                  6
                </div>
                <h1 className="text-2xl font-bold tracking-tight">
                  Prompt Library
                </h1>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Create, manage, version, and reuse prompts across your AI
                agents.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-3 py-2 w-80">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search prompts, tags, or descriptions..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(0);
                  }}
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                />
                <kbd className="hidden lg:inline-flex items-center gap-0.5 rounded border border-border/50 bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  ⌘K
                </kbd>
              </div>
              <Button size="sm" className="bg-violet-600 hover:bg-violet-700">
                <Plus className="h-4 w-4 mr-1" />
                New Prompt
              </Button>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
            <KpiCard
              label="Total Prompts"
              value={data?.summary.totalPrompts ?? 0}
              sub={`↑ 12 vs last 30 days`}
            />
            <KpiCard
              label="Active Prompts"
              value={data?.summary.activePrompts ?? 0}
              sub={`${data?.summary.activePercent ?? 0}% of total`}
              color="text-emerald-600"
            />
            <KpiCard
              label="Draft Prompts"
              value={data?.summary.draftPrompts ?? 0}
              sub={`${data?.summary.draftPercent ?? 0}% of total`}
              color="text-amber-600"
            />
            <KpiCard
              label="Deprecated"
              value={data?.summary.deprecatedCount ?? 0}
              sub={`${data?.summary.deprecatedPercent ?? 0}% of total`}
              color="text-red-600"
            />
            <KpiCard
              label="Avg. Success Rate"
              value={`${data?.summary.avgSuccessRate ?? 0}%`}
              sub={`↑ 2.6% vs last 30 days`}
            />
            <KpiCard
              label="Total Usage (30d)"
              value={data?.summary.totalUsageDisplay ?? "0"}
              sub={`↑ 18.7% vs last 30 days`}
            />
          </div>

          {/* Tabs */}
          <div className="flex gap-1 rounded-lg bg-muted p-1 w-fit">
            {(["all", "my", "favorites", "deprecated"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setPage(0);
                }}
                className={cn(
                  "px-4 py-1.5 text-sm font-medium rounded-md transition-colors capitalize",
                  activeTab === tab
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tab === "all"
                  ? "All Prompts"
                  : tab === "my"
                    ? "My Prompts"
                    : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/50">
                      {[
                        "Prompt",
                        "Agent",
                        "Model",
                        "Version",
                        "Status",
                        "Success Rate",
                        "Usage (30d)",
                        "Updated",
                        "Actions",
                      ].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left text-xs font-medium text-muted-foreground"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data?.prompts.map((p) => (
                      <tr
                        key={p.id}
                        onClick={() => setSelectedPromptId(p.promptId)}
                        className={cn(
                          "border-b border-border/50 cursor-pointer transition-colors hover:bg-muted/50",
                          selectedPromptId === p.promptId && "bg-muted/50",
                        )}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Star
                              className={cn(
                                "h-4 w-4 shrink-0",
                                p.isFavorite
                                  ? "fill-amber-400 text-amber-400"
                                  : "text-muted-foreground",
                              )}
                            />
                            <div>
                              <p className="text-sm font-medium">{p.name}</p>
                              <p className="text-[10px] text-muted-foreground truncate max-w-[200px]">
                                {p.description}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {p.agentName}
                        </td>
                        <td className="px-4 py-3">
                          <ModelBadge model={p.model} />
                        </td>
                        <td className="px-4 py-3 text-xs font-mono">
                          {p.version}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={p.status} />
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {p.successRate !== "0" ? `${p.successRate}%` : "—"}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {p.totalUsage > 0
                            ? p.totalUsage.toLocaleString()
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {Math.floor(
                            (Date.now() - new Date(p.updatedAt).getTime()) /
                              3600000,
                          )}
                          h ago
                        </td>
                        <td className="px-4 py-3">
                          <button className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted">
                            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Pagination */}
              <div className="flex items-center justify-between border-t border-border/50 px-4 py-3">
                <span className="text-xs text-muted-foreground">
                  Showing {page * pageSize + 1} to{" "}
                  {Math.min((page + 1) * pageSize, data?.total ?? 0)} of{" "}
                  {data?.total ?? 0} prompts
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(Math.max(0, page - 1))}
                    disabled={page === 0}
                    className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted disabled:opacity-50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  {Array.from({ length: Math.min(totalPages, 6) }).map(
                    (_, i) => (
                      <button
                        key={i}
                        onClick={() => setPage(i)}
                        className={cn(
                          "h-7 w-7 flex items-center justify-center rounded text-xs font-medium",
                          page === i
                            ? "bg-violet-600 text-white"
                            : "text-muted-foreground hover:bg-muted",
                        )}
                      >
                        {i + 1}
                      </button>
                    ),
                  )}
                  {totalPages > 6 && (
                    <span className="text-muted-foreground text-xs">...</span>
                  )}
                  <button
                    onClick={() => setPage(Math.min(page + 1, totalPages - 1))}
                    disabled={page >= totalPages - 1}
                    className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted disabled:opacity-50"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex items-center gap-1 rounded-lg border border-border/50 px-2 py-1">
                  <span className="text-xs text-muted-foreground">
                    10 / page
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Detail Panel */}
      {selectedPromptId && selectedPrompt && (
        <DetailPanel
          prompt={selectedPrompt}
          onClose={() => setSelectedPromptId(null)}
        />
      )}
    </div>
  );
}
