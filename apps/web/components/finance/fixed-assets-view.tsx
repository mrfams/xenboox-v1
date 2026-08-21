/**
 * Fixed Assets View — Real asset management with depreciation schedules.
 *
 * Features:
 * - List of fixed assets with status
 * - Summary stats (total cost, depreciation, NBV)
 * - Depreciation schedule per asset
 * - Actions (view, edit, dispose)
 */

"use client";

import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc/client";
import { useEntity } from "@/lib/entity-context";
import { Card, CardContent, CardHeader, CardTitle } from "@xenboox/ui";
import { Button } from "@xenboox/ui";
import { Badge } from "@xenboox/ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@xenboox/ui";
import {
  DollarSign,
  TrendingDown,
  Package,
  AlertTriangle,
  Eye,
  Loader2,
  Plus,
  ChevronDown,
  ChevronUp,
  Calendar,
  BarChart3,
} from "lucide-react";
import { cn } from "@xenboox/ui";
import { formatCurrency } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────

interface FixedAsset {
  id: string;
  name: string;
  description: string | null;
  assetClass: string;
  location: string | null;
  purchaseDate: string;
  cost: string;
  salvageValue: string;
  usefulLifeMonths: number;
  depreciationMethod: string;
  accumulatedDepreciation: string;
  netBookValue: string;
  status: string;
  responsiblePerson: string | null;
}

interface AssetOverview {
  summary: {
    totalAssets: number;
    totalDepreciation: number;
    netBookValue: number;
    activeAssets: number;
    disposedThisMonth: number;
    assetsCount: number;
  };
}

// ─── Component ────────────────────────────────────────────────────────────

export function FixedAssetsView() {
  const { entityId } = useEntity();
  const [expandedAsset, setExpandedAsset] = useState<string | null>(null);

  // Fetch assets
  const { data: assets, isLoading: assetsLoading } =
    trpc.fixedAssets.listAssets.useQuery(undefined, {
      enabled: !!entityId,
    });

  // Fetch overview
  const { data: overview } = trpc.fixedAssets.getOverview.useQuery(undefined, {
    enabled: !!entityId,
  });

  const assetList = (assets ?? []) as FixedAsset[];
  const summary = (overview as AssetOverview | undefined)?.summary;

  // Filter assets by status
  const activeAssets = assetList.filter((a) => a.status === "active");
  const disposedAssets = assetList.filter((a) => a.status === "disposed");

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {summary?.assetsCount ?? 0}
                </div>
                <div className="text-xs text-muted-foreground">
                  Total Assets
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {formatCurrency(summary?.totalAssets ?? 0)}
                </div>
                <div className="text-xs text-muted-foreground">Total Cost</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <TrendingDown className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {formatCurrency(summary?.totalDepreciation ?? 0)}
                </div>
                <div className="text-xs text-muted-foreground">
                  Depreciation
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <BarChart3 className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {formatCurrency(summary?.netBookValue ?? 0)}
                </div>
                <div className="text-xs text-muted-foreground">
                  Net Book Value
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Tabs defaultValue="active">
          <TabsList>
            <TabsTrigger value="active">
              Active ({activeAssets.length})
            </TabsTrigger>
            <TabsTrigger value="disposed">
              Disposed ({disposedAssets.length})
            </TabsTrigger>
            <TabsTrigger value="all">All ({assetList.length})</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add Asset
        </Button>
      </div>

      {/* Assets List */}
      <Card>
        <CardContent className="p-0">
          {assetsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 text-primary animate-spin" />
            </div>
          ) : assetList.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No fixed assets yet</p>
              <p className="text-sm mt-1">
                Add your first asset to start tracking depreciation
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {assetList.map((asset) => (
                <AssetRow
                  key={asset.id}
                  asset={asset}
                  isExpanded={expandedAsset === asset.id}
                  onToggle={() =>
                    setExpandedAsset((prev) =>
                      prev === asset.id ? null : asset.id,
                    )
                  }
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Asset Row ────────────────────────────────────────────────────────────

function AssetRow({
  asset,
  isExpanded,
  onToggle,
}: {
  asset: FixedAsset;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  // Status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case "disposed":
        return <Badge variant="secondary">Disposed</Badge>;
      case "fully_depreciated":
        return (
          <Badge className="bg-blue-100 text-blue-800">Fully Depreciated</Badge>
        );
      case "under_maintenance":
        return (
          <Badge className="bg-amber-100 text-amber-800">Maintenance</Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Depreciation method label
  const getDepreciationLabel = (method: string) => {
    switch (method) {
      case "straight_line":
        return "Straight Line";
      case "reducing_balance":
        return "Reducing Balance";
      case "units_of_production":
        return "Units of Production";
      default:
        return method;
    }
  };

  // Calculate depreciation percentage
  const cost = parseFloat(asset.cost ?? "0");
  const accumulated = parseFloat(asset.accumulatedDepreciation ?? "0");
  const depreciationPercent = cost > 0 ? (accumulated / cost) * 100 : 0;

  return (
    <div className="hover:bg-muted/50 transition-colors">
      {/* Main Row */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer"
        onClick={onToggle}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            onToggle();
          }
        }}
      >
        <div className="flex items-center gap-4 min-w-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium text-sm truncate">{asset.name}</p>
              {getStatusBadge(asset.status)}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {asset.assetClass} • Purchased {asset.purchaseDate}
              {asset.location && ` • ${asset.location}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* Cost */}
          <div className="text-right">
            <p className="font-medium text-sm">{formatCurrency(cost)}</p>
            <p className="text-xs text-muted-foreground">Cost</p>
          </div>

          {/* NBV */}
          <div className="text-right">
            <p className="font-medium text-sm">
              {formatCurrency(parseFloat(asset.netBookValue ?? "0"))}
            </p>
            <p className="text-xs text-muted-foreground">NBV</p>
          </div>

          {/* Depreciation Progress */}
          <div className="w-24">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>{depreciationPercent.toFixed(0)}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${Math.min(100, depreciationPercent)}%` }}
              />
            </div>
          </div>

          {/* Expand */}
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border-border/30 p-4 bg-muted/30">
          <div className="grid grid-cols-3 gap-6">
            {/* Asset Details */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Asset Details</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Salvage Value</span>
                  <span>
                    {formatCurrency(parseFloat(asset.salvageValue ?? "0"))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Useful Life</span>
                  <span>{asset.usefulLifeMonths} months</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Depreciation Method
                  </span>
                  <span>{getDepreciationLabel(asset.depreciationMethod)}</span>
                </div>
                {asset.responsiblePerson && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Responsible</span>
                    <span>{asset.responsiblePerson}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Financial Summary */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Financial Summary</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Original Cost</span>
                  <span className="font-medium">{formatCurrency(cost)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Accumulated Depreciation
                  </span>
                  <span className="text-red-600">
                    -{formatCurrency(accumulated)}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-medium">Net Book Value</span>
                  <span className="font-medium">
                    {formatCurrency(parseFloat(asset.netBookValue ?? "0"))}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Actions</h4>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Depreciation Schedule
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Run Depreciation
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  AI Depreciation Analysis
                </Button>
              </div>
            </div>
          </div>

          {/* Description */}
          {asset.description && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                {asset.description}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
