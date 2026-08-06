"use client";

import { useState } from "react";
import {
  FileText,
  Download,
  BarChart3,
  RefreshCw,
  Search,
  Filter,
  ArrowLeft,
  Package,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { ArtifactList } from "@/components/documents/artifact-list";
import Link from "next/link";

// ─── Types ─────────────────────────────────────────────────────────────────

type KindFilter =
  | "all"
  | "report"
  | "export"
  | "invoice_pdf"
  | "credit_note"
  | "filing"
  | "statement"
  | "contract"
  | "custom";

type StatusFilter = "all" | "generating" | "ready" | "expired" | "failed";

// ─── Summary Cards ─────────────────────────────────────────────────────────

function SummaryCards({
  summary,
}: {
  summary: {
    total: number;
    totalSize: number;
    byKind: Record<string, number>;
    byStatus: Record<string, number>;
  };
}) {
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const cards = [
    {
      label: "Total Artifacts",
      value: summary.total.toLocaleString(),
      icon: Package,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
    },
    {
      label: "Storage Used",
      value: formatBytes(summary.totalSize),
      icon: BarChart3,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      label: "Ready",
      value: (summary.byStatus["ready"] ?? 0).toLocaleString(),
      icon: FileText,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
    {
      label: "Generating",
      value: (summary.byStatus["generating"] ?? 0).toLocaleString(),
      icon: RefreshCw,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-xl border border-slate-200 bg-white p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-slate-500">{card.label}</p>
            <div className={cn("rounded-lg p-2", card.bgColor)}>
              <card.icon className={cn("h-4 w-4", card.color)} />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{card.value}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function ArtifactsPage() {
  const [activeKind, setActiveKind] = useState<KindFilter>("all");
  const [activeStatus, setActiveStatus] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch artifact summary
  const { data: summary, isLoading: summaryLoading } =
    trpc.artifact.getSummary.useQuery();

  // Fetch artifacts list
  const { data: artifacts, isLoading: artifactsLoading } =
    trpc.artifact.list.useQuery({
      kind: activeKind === "all" ? undefined : activeKind,
      status: activeStatus === "all" ? undefined : activeStatus,
      limit: 100,
    });

  // Download mutation
  const downloadMutation = trpc.artifact.download.useMutation();

  // Delete mutation
  const utils = trpc.useUtils();
  const deleteMutation = trpc.artifact.delete.useMutation({
    onSuccess: () => {
      utils.artifact.list.invalidate();
      utils.artifact.getSummary.invalidate();
    },
  });

  const handleDownload = async (artifact: { id: string; name: string }) => {
    try {
      const result = await downloadMutation.mutateAsync({ id: artifact.id });
      // Open download URL in new tab
      window.open(result.downloadUrl, "_blank");
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  const handleDelete = async (artifact: { id: string; name: string }) => {
    if (
      !confirm(
        `Are you sure you want to delete "${artifact.name}"? This cannot be undone.`,
      )
    ) {
      return;
    }
    try {
      await deleteMutation.mutateAsync({ id: artifact.id, hardDelete: true });
    } catch (error) {
      console.error("Delete failed:", error);
    }
  };

  const kindTabs: Array<{ key: KindFilter; label: string }> = [
    { key: "all", label: "All" },
    { key: "report", label: "Reports" },
    { key: "export", label: "Exports" },
    { key: "invoice_pdf", label: "Invoices" },
    { key: "filing", label: "Filings" },
    { key: "statement", label: "Statements" },
    { key: "contract", label: "Contracts" },
    { key: "custom", label: "Custom" },
  ];

  const statusTabs: Array<{ key: StatusFilter; label: string }> = [
    { key: "all", label: "All Status" },
    { key: "ready", label: "Ready" },
    { key: "generating", label: "Generating" },
    { key: "expired", label: "Expired" },
    { key: "failed", label: "Failed" },
  ];

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/documents"
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-slate-500" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Generated Artifacts
              </h1>
              <p className="text-sm text-slate-500">
                Reports, exports, invoices, and filings generated by your
                accounting team.
              </p>
            </div>
          </div>
        </div>

        {/* Kind Tabs */}
        <div className="flex items-center gap-1 border-b border-slate-200 -mb-px">
          {kindTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveKind(tab.key)}
              className={cn(
                "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
                activeKind === tab.key
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-700",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
        {/* Summary Cards */}
        {summary && <SummaryCards summary={summary} />}

        {/* Filters + Search */}
        <div className="flex items-center gap-3">
          {/* Status Filter */}
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
            {statusTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveStatus(tab.key)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                  activeStatus === tab.key
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search artifacts..."
              className="w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Artifact List */}
        <div className="rounded-xl border border-slate-200 bg-white">
          <ArtifactList
            artifacts={(artifacts ?? []).filter((a) =>
              searchQuery
                ? a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  (a.description ?? "")
                    .toLowerCase()
                    .includes(searchQuery.toLowerCase())
                : true,
            )}
            isLoading={artifactsLoading}
            onDownload={handleDownload}
            onDelete={handleDelete}
            searchQuery={searchQuery}
          />
        </div>
      </div>
    </div>
  );
}
