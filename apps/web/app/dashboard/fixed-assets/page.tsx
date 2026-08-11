"use client";

import { useState } from "react";
import {
  Search,
  Plus,
  Download,
  MoreHorizontal,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Bot,
  TrendingUp,
  TrendingDown,
  Send,
  Package,
  BarChart3,
  Trash2,
} from "lucide-react";

import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { CreateAssetDialog } from "@/components/dashboard/create-asset-dialog";
import { AiSimulationTrigger } from "@/components/ai-ux/simulation-trigger";
import { RowActionsMenu } from "@/components/module/row-actions-menu";

// ─── Types ─────────────────────────────────────────────────────────────────

type TabFilter = "overview" | "assets" | "depreciation" | "disposals";

// ─── Summary Cards ─────────────────────────────────────────────────────────

function SummaryCards({
  summary,
}: {
  summary: {
    totalAssets: number;
    totalAssetsChange: number;
    totalDepreciation: number;
    netBookValue: number;
    assetsCount: number;
    disposedThisMonth: number;
  };
}) {
  const cards = [
    {
      label: "Total Assets",
      value: `GMD ${summary.totalAssets.toLocaleString()}`,
      change: summary.totalAssetsChange,
      icon: Package,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
    },
    {
      label: "Total Depreciation",
      value: `GMD ${summary.totalDepreciation.toLocaleString()}`,
      icon: TrendingDown,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
    },
    {
      label: "Net Book Value",
      value: `GMD ${summary.netBookValue.toLocaleString()}`,
      icon: BarChart3,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
    {
      label: "Total Assets Count",
      value: summary.assetsCount.toString(),
      icon: Package,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      label: "Disposed (This Month)",
      value: summary.disposedThisMonth.toString(),
      icon: AlertTriangle,
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
  ];

  return (
    <div className="grid grid-cols-5 gap-4">
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
          {card.change !== undefined && (
            <div className="flex items-center gap-1 mt-1">
              {card.change >= 0 ? (
                <TrendingUp className="h-3 w-3 text-emerald-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
              <span
                className={cn(
                  "text-sm",
                  card.change >= 0 ? "text-emerald-600" : "text-red-600",
                )}
              >
                {card.change >= 0 ? "+" : ""}
                {card.change}%
              </span>
              <span className="text-xs text-slate-400">vs last month</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Assets Table ──────────────────────────────────────────────────────────

function AssetsTable({
  assets,
  isLoading,
  onDelete,
}: {
  assets: Array<{
    id: string;
    name: string;
    category: string;
    purchaseDate: string;
    purchaseCost: number;
    depreciationMethod: string;
    usefulLife: number;
    accumulatedDepreciation: number;
    netBookValue: number;
    status: string;
  }>;
  isLoading: boolean;
  onDelete?: (id: string) => void;
}) {
  const statusColors: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-700",
    disposed: "bg-slate-100 text-slate-600",
    fully_depreciated: "bg-amber-100 text-amber-700",
  };

  const categoryColors: Record<string, string> = {
    Vehicles: "bg-blue-500",
    Equipment: "bg-purple-500",
    Furniture: "bg-amber-500",
    Buildings: "bg-emerald-500",
    Land: "bg-indigo-500",
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 text-slate-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Asset
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Category
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Purchase Date
            </th>
            <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">
              Purchase Cost
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Depreciation
            </th>
            <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">
              Accum. Depr.
            </th>
            <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">
              Net Book Value
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Status
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {assets.map((asset) => {
            const categoryColor =
              categoryColors[asset.category] ?? "bg-slate-400";
            return (
              <tr
                key={asset.id}
                className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
              >
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center">
                      <Package className="h-4 w-4 text-slate-600" />
                    </div>
                    <span className="text-sm font-medium text-slate-900">
                      {asset.name}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium",
                      categoryColor.replace("bg-", "bg-").replace("500", "100"),
                      "text-slate-700",
                    )}
                  >
                    {asset.category}
                  </span>
                </td>
                <td className="py-3 px-4 text-sm text-slate-600">
                  {new Date(asset.purchaseDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </td>
                <td className="py-3 px-4 text-right">
                  <span className="text-sm font-medium text-slate-900">
                    GMD {asset.purchaseCost.toLocaleString()}
                  </span>
                </td>
                <td className="py-3 px-4 text-sm text-slate-600">
                  {asset.depreciationMethod} ({asset.usefulLife} yrs)
                </td>
                <td className="py-3 px-4 text-right">
                  <span className="text-sm text-slate-600">
                    GMD {asset.accumulatedDepreciation.toLocaleString()}
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  <span className="text-sm font-medium text-slate-900">
                    GMD {asset.netBookValue.toLocaleString()}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium",
                      statusColors[asset.status] ||
                        "bg-slate-100 text-slate-600",
                    )}
                  >
                    {asset.status.replace("_", " ")}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <RowActionsMenu
                    items={[
                      {
                        label: "Delete asset",
                        icon: <Trash2 className="h-3.5 w-3.5" />,
                        destructive: true,
                        onSelect: () => onDelete?.(asset.id),
                      },
                    ]}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── AI Copilot Panel ──────────────────────────────────────────────────────

function AiCopilotPanel({
  insights,
}: {
  insights: Array<{
    id: string;
    type: "warning" | "info" | "success";
    title: string;
    description: string;
    actionLabel: string;
  }>;
}) {
  const [message, setMessage] = useState("");

  const quickActions = [
    "Show me assets due for depreciation",
    "Which assets need disposal?",
    "Depreciation schedule for next quarter",
  ];

  return (
    <div className="h-full flex flex-col bg-white border-l border-slate-200">
      {/* Header */}
      <div className="border-b border-slate-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="font-medium text-slate-900">
                AI Fixed Asset Assistant
              </h3>
              <span className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                Beta
              </span>
            </div>
          </div>
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
            Live
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* AI Insights */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-slate-900">AI Insights</h4>
            <span className="text-xs text-slate-400">Generated 5 min ago</span>
          </div>
          <div className="space-y-3">
            {insights.map((insight) => (
              <div
                key={insight.id}
                className={cn(
                  "rounded-lg border p-3",
                  insight.type === "warning"
                    ? "border-amber-200 bg-amber-50"
                    : insight.type === "success"
                      ? "border-emerald-200 bg-emerald-50"
                      : "border-blue-200 bg-blue-50",
                )}
              >
                <div className="flex items-start gap-2">
                  <div
                    className={cn(
                      "h-5 w-5 rounded-full flex items-center justify-center mt-0.5",
                      insight.type === "warning"
                        ? "bg-amber-100"
                        : insight.type === "success"
                          ? "bg-emerald-100"
                          : "bg-blue-100",
                    )}
                  >
                    {insight.type === "warning" ? (
                      <AlertTriangle className="h-3 w-3 text-amber-600" />
                    ) : insight.type === "success" ? (
                      <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                    ) : (
                      <Bot className="h-3 w-3 text-blue-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">
                      {insight.title}
                    </p>
                    <p className="text-xs text-slate-600 mt-1">
                      {insight.description}
                    </p>
                    <button className="text-xs font-medium text-indigo-600 hover:text-indigo-700 mt-2">
                      {insight.actionLabel}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h4 className="font-medium text-slate-900 mb-3">Quick Actions</h4>
          <div className="space-y-2">
            {quickActions.map((action, i) => (
              <button
                key={i}
                className="w-full text-left rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
              >
                {action}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-slate-200 p-4">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask anything about assets..."
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <button className="h-9 w-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white hover:bg-indigo-700">
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function FixedAssetsPage() {
  const [activeTab, setActiveTab] = useState<TabFilter>("overview");
  const [showCreate, setShowCreate] = useState(false);
  const [assetSearch, setAssetSearch] = useState("");
  const [assetCategory, setAssetCategory] = useState("");

  // Fetch overview data
  const { data: overviewData, isLoading: overviewLoading } =
    trpc.fixedAssets?.getOverview?.useQuery?.() ?? {
      data: undefined,
      isLoading: false,
    };

  // Fetch assets list
  const { data: assetsData, isLoading: assetsLoading } =
    trpc.fixedAssets?.listAssets?.useQuery?.() ?? {
      data: undefined,
      isLoading: false,
    };

  // Fetch AI insights
  const { data: aiInsights } =
    trpc.fixedAssets?.getAiInsights?.useQuery?.() ?? { data: undefined };

  const utils = trpc.useUtils();
  const deleteAsset = trpc.fixedAssets?.deleteAsset?.useMutation?.({
    onSuccess: () => {
      utils.fixedAssets.listAssets.invalidate();
      utils.fixedAssets.getOverview.invalidate();
    },
    onError: () => undefined,
  });

  const tabs = [
    { key: "overview" as TabFilter, label: "Overview" },
    { key: "assets" as TabFilter, label: "Assets" },
    { key: "depreciation" as TabFilter, label: "Depreciation" },
    { key: "disposals" as TabFilter, label: "Disposals" },
  ];

  const allAssets = (assetsData ?? []).map((asset) => ({
    id: asset.id,
    name: asset.name,
    category: asset.assetClass,
    purchaseDate: asset.purchaseDate,
    purchaseCost: parseFloat(asset.cost ?? "0"),
    depreciationMethod: asset.depreciationMethod,
    usefulLife: asset.usefulLifeMonths ?? 0,
    accumulatedDepreciation: parseFloat(asset.accumulatedDepreciation ?? "0"),
    netBookValue: parseFloat(asset.netBookValue ?? "0"),
    status: asset.status,
  }));

  const filteredAssets = allAssets.filter((asset) => {
    if (
      assetSearch &&
      !asset.name.toLowerCase().includes(assetSearch.toLowerCase())
    )
      return false;
    if (assetCategory && asset.category !== assetCategory) return false;
    return true;
  });

  const renderPanel = () => {
    switch (activeTab) {
      case "assets":
        return (
          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="font-medium text-slate-900">
                Assets ({filteredAssets.length})
              </h3>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={assetSearch}
                    onChange={(e) => setAssetSearch(e.target.value)}
                    placeholder="Search assets..."
                    className="rounded-lg border border-slate-200 pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <select
                  value={assetCategory}
                  onChange={(e) => setAssetCategory(e.target.value)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">All Categories</option>
                  {Array.from(new Set(allAssets.map((a) => a.category))).map(
                    (cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ),
                  )}
                </select>
              </div>
            </div>
            <AssetsTable
              assets={filteredAssets}
              isLoading={assetsLoading}
              onDelete={(id) => deleteAsset.mutate({ id })}
            />
          </div>
        );

      case "depreciation":
        return (
          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="p-4 border-b border-slate-200">
              <h3 className="font-medium text-slate-900">
                Depreciation Schedule
              </h3>
              <p className="text-sm text-slate-500 mt-0.5">
                Accumulated depreciation and remaining useful life for active
                assets.
              </p>
            </div>
            {assetsLoading ? (
              <div className="flex items-center justify-center h-64">
                <RefreshCw className="h-8 w-8 text-slate-400 animate-spin" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
                        Asset
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
                        Method
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">
                        Useful Life
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">
                        Cost
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">
                        Accum. Depreciation
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">
                        Net Book Value
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {allAssets.map((asset) => (
                      <tr
                        key={asset.id}
                        className="border-b border-slate-100 hover:bg-slate-50"
                      >
                        <td className="py-3 px-4 text-sm font-medium text-slate-900">
                          {asset.name}
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-600 capitalize">
                          {asset.depreciationMethod.replace("_", " ")}
                        </td>
                        <td className="py-3 px-4 text-right text-sm tabular-nums text-slate-700">
                          {asset.usefulLife} mo
                        </td>
                        <td className="py-3 px-4 text-right text-sm tabular-nums text-slate-900">
                          GMD {asset.purchaseCost.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right text-sm tabular-nums text-amber-600">
                          GMD {asset.accumulatedDepreciation.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right text-sm font-medium tabular-nums text-slate-900">
                          GMD {asset.netBookValue.toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium",
                              asset.status === "active"
                                ? "bg-emerald-100 text-emerald-700"
                                : asset.status === "disposed"
                                  ? "bg-slate-100 text-slate-600"
                                  : "bg-amber-100 text-amber-700",
                            )}
                          >
                            {asset.status.replace("_", " ")}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );

      case "disposals":
        const disposedAssets = filteredAssets.filter(
          (a) => a.status === "disposed",
        );
        return (
          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <div>
                <h3 className="font-medium text-slate-900">
                  Disposed Assets ({disposedAssets.length})
                </h3>
                <p className="text-sm text-slate-500 mt-0.5">
                  Assets that have been written off, sold, or scrapped.
                </p>
              </div>
            </div>
            {disposedAssets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Package className="h-10 w-10 text-slate-300 mb-3" />
                <p className="text-sm font-medium text-slate-900">
                  No disposed assets
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Disposed assets will appear here once you write off or sell an
                  asset.
                </p>
              </div>
            ) : (
              <AssetsTable
                assets={disposedAssets}
                isLoading={false}
                onDelete={(id) => deleteAsset.mutate({ id })}
              />
            )}
          </div>
        );

      default:
        // Overview — summary cards + recent assets + AI insights
        return (
          <>
            {overviewData?.summary && (
              <SummaryCards summary={overviewData.summary} />
            )}
            <div className="grid grid-cols-3 gap-6">
              <div className="col-span-2 rounded-xl border border-slate-200 bg-white">
                <div className="flex items-center justify-between p-4 border-b border-slate-200">
                  <h3 className="font-medium text-slate-900">Recent Assets</h3>
                  <button
                    onClick={() => setActiveTab("assets")}
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                  >
                    View all →
                  </button>
                </div>
                <AssetsTable
                  assets={allAssets.slice(0, 5)}
                  isLoading={assetsLoading}
                  onDelete={(id) => deleteAsset.mutate({ id })}
                />
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <h3 className="font-medium text-slate-900 mb-3">AI Insights</h3>
                {aiInsights && aiInsights.length > 0 ? (
                  <div className="space-y-3">
                    {aiInsights.map((insight) => (
                      <div
                        key={insight.id}
                        className={cn(
                          "rounded-lg border p-3",
                          insight.type === "warning" &&
                            "border-amber-200 bg-amber-50",
                          insight.type === "info" &&
                            "border-blue-200 bg-blue-50",
                        )}
                      >
                        <p className="text-sm font-medium text-slate-900">
                          {insight.title}
                        </p>
                        <p className="text-xs text-slate-600 mt-1">
                          {insight.description}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">
                    No insights at this time.
                  </p>
                )}
              </div>
            </div>
          </>
        );
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Fixed Assets
              </h1>
              <p className="text-sm text-slate-500">
                Track and manage your fixed assets, depreciation, and disposals.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <AiSimulationTrigger
                traceId="depreciation-run"
                label="Run Depreciation"
                variant="outline"
              />
              <AiSimulationTrigger
                traceId="fixed-assets-health"
                label="AI Asset Health"
                variant="outline"
              />
              <button className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                <Download className="h-4 w-4" />
                Export
              </button>
              <button
                onClick={() => setShowCreate(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4" />
                Add Asset
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 border-b border-slate-200 -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
                  activeTab === tab.key
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
        <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50">
          {renderPanel()}
        </div>
      </div>

      {/*
        AI Copilot Panel - DISABLED
        <div className="w-[360px]">
          <AiCopilotPanel insights={aiInsights ?? []} />
        </div>
      */}
      <CreateAssetDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
      />
    </div>
  );
}
