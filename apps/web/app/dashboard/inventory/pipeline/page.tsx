"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { InventoryLiveness } from "@/components/agents/inventory-liveness";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/loading";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Badge,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui";
import {
  Package,
  AlertTriangle,
  PlayCircle,
  CheckCircle2,
  RefreshCw,
  FileText,
  DollarSign,
  TrendingDown,
  ClipboardCheck,
  Gavel,
  Warehouse,
  Boxes,
  BarChart3,
} from "lucide-react";
import { cn, formatDate, formatCurrency } from "@/lib/utils";

const STEP_ICONS: Record<string, typeof Package> = {
  item_master_scan: Package,
  po_management: FileText,
  grn_recording: ClipboardCheck,
  stock_tracking: BarChart3,
  valuation: DollarSign,
  cogs_calculation: TrendingDown,
  confidence_gate: CheckCircle2,
  journal_posting: TrendingDown,
  low_stock_alerts: AlertTriangle,
  stock_count: Boxes,
  audit_trail: Gavel,
};

const STEP_LABELS: Record<string, string> = {
  item_master_scan: "Item Master Scan",
  po_management: "PO Management",
  grn_recording: "GRN Recording",
  stock_tracking: "Stock Tracking",
  valuation: "Valuation",
  cogs_calculation: "COGS Calc",
  confidence_gate: "Confidence Gate",
  journal_posting: "Journal Posting",
  low_stock_alerts: "Low Stock Alerts",
  stock_count: "Stock Count",
  audit_trail: "Audit Trail",
};

const STEP_AGENTS: Record<string, string> = {
  item_master_scan: "Inventory Agent",
  po_management: "Inventory Agent",
  grn_recording: "Inventory Agent",
  stock_tracking: "Inventory Agent",
  valuation: "Inventory Agent",
  cogs_calculation: "Inventory Agent",
  confidence_gate: "Inventory Agent",
  journal_posting: "Controller → Ledger",
  low_stock_alerts: "Inventory Agent (→ CFO)",
  stock_count: "Inventory Agent",
  audit_trail: "Inventory Agent",
};

function stepStatusColor(status: string): string {
  switch (status) {
    case "completed":
      return "bg-emerald-500/20 text-emerald-700 border-emerald-200";
    case "in_progress":
      return "bg-blue-500/20 text-blue-700 border-blue-200";
    case "skipped":
      return "bg-muted text-muted-foreground border-border";
    case "flagged":
      return "bg-amber-500/20 text-amber-700 border-amber-200";
    case "failed":
      return "bg-red-500/20 text-red-700 border-red-200";
    default:
      return "bg-muted/50 text-muted-foreground border-border";
  }
}

export default function InventoryPipelinePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  const currentPeriod = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;

  const { data: status, isLoading: statusLoading } =
    trpc.inventoryPipeline.getStatus.useQuery();
  const { data: discrepancies } =
    trpc.inventoryPipeline.listDiscrepancies.useQuery({ limit: 10 });
  const { data: grns } = trpc.inventoryPipeline.listGRNs.useQuery({ limit: 5 });

  const runPipeline = trpc.inventoryPipeline.runPipeline.useMutation({
    onSuccess: () => router.refresh(),
  });

  const summary = status?.summary;
  const lowStockAlerts = status?.lowStockAlerts ?? [];
  const discrepanciesList = status?.discrepancies ?? [];

  if (statusLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Inventory Pipeline"
          description="Stock tracking, COGS, valuation, and discrepancy handling"
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <div className="h-5 w-24 animate-pulse rounded bg-muted mb-2" />
                <div className="h-8 w-20 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
        <TableSkeleton rows={4} columns={5} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory Pipeline"
        description={`Stock tracking · COGS · Valuation · ${summary?.totalItems ?? 0} items · ${summary?.locationCount ?? 0} locations`}
        action={{
          label: "Run Inventory Pipeline",
          icon: <PlayCircle className="mr-2 h-4 w-4" />,
          onClick: () => runPipeline.mutate({ period: currentPeriod }),
        }}
      />

      <InventoryLiveness />

      {/* ── Summary Stat Cards ──────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-primary/5 to-background">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Total Items
                </p>
                <p className="text-2xl font-bold">{summary?.totalItems ?? 0}</p>
              </div>
              <div className="rounded-lg bg-primary/10 p-2.5">
                <Package className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <BarChart3 className="h-3 w-3" />
              <span>{summary?.locationCount ?? 0} locations</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-background dark:from-emerald-950/20">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Stock Value
                </p>
                <p className="text-2xl font-bold text-emerald-600">
                  {formatCurrency(summary?.totalValue ?? 0)}
                </p>
              </div>
              <div className="rounded-lg bg-emerald-100 p-2.5 dark:bg-emerald-900/30">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <span>{summary?.activeItems ?? 0} active items</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-background dark:from-amber-950/20">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Low Stock
                </p>
                <div className="flex items-baseline gap-1.5">
                  <p className="text-2xl font-bold">{lowStockAlerts.length}</p>
                  {(summary?.outOfStockItems ?? 0) > 0 && (
                    <p className="text-lg font-bold text-red-500">
                      ({summary?.outOfStockItems} OOS)
                    </p>
                  )}
                </div>
              </div>
              <div className="rounded-lg bg-amber-100 p-2.5 dark:bg-amber-900/30">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <span>{status?.pendingGRNs ?? 0} pending GRNs</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-background dark:from-red-950/20">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Discrepancies
                </p>
                <p
                  className={cn(
                    "text-2xl font-bold",
                    discrepanciesList.length > 0
                      ? "text-red-600"
                      : "text-foreground",
                  )}
                >
                  {discrepanciesList.length}
                </p>
              </div>
              <div className="rounded-lg bg-red-100 p-2.5 dark:bg-red-900/30">
                <Boxes className="h-5 w-5 text-red-600" />
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <CheckCircle2 className="h-3 w-3" />
              <span>{status?.openPOS ?? 0} open POs</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Main Content Tabs ─────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start border-b rounded-none h-auto pb-0 bg-transparent gap-0">
          <TabsTrigger
            value="overview"
            className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 pb-3"
          >
            <BarChart3 className="h-4 w-4" /> Overview
          </TabsTrigger>
          <TabsTrigger
            value="discrepancies"
            className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 pb-3"
          >
            <Boxes className="h-4 w-4" /> Discrepancies
            {discrepanciesList.length > 0 && ` (${discrepanciesList.length})`}
          </TabsTrigger>
          <TabsTrigger
            value="grn"
            className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 pb-3"
          >
            <ClipboardCheck className="h-4 w-4" /> GRN
          </TabsTrigger>
          <TabsTrigger
            value="steps"
            className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 pb-3"
          >
            <RefreshCw className="h-4 w-4" /> Pipeline Steps
          </TabsTrigger>
        </TabsList>

        {/* ── Tab: Overview ────────────────────────────────────────── */}
        <TabsContent value="overview" className="space-y-6 pt-4">
          {/* Low Stock Alerts */}
          {lowStockAlerts.length > 0 && (
            <Card className="border-amber-200 dark:border-amber-900 bg-amber-50/30 dark:bg-amber-950/10">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                      {lowStockAlerts.length} Low Stock Alert(s)
                    </p>
                    <div className="space-y-1 mt-2">
                      {lowStockAlerts.slice(0, 5).map((a) => (
                        <p
                          key={a.itemId}
                          className="text-xs text-muted-foreground"
                        >
                          {a.itemName} ({a.sku}): {a.currentQty} remaining,
                          reorder at {a.reorderLevel}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Discrepancy Warning */}
          {discrepanciesList.length > 0 && (
            <Card className="border-red-200 dark:border-red-900 bg-red-50/30 dark:bg-red-950/10">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Boxes className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-red-800 dark:text-red-300">
                      {discrepanciesList.length} Stock Count Discrepancy(ies)
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Every discrepancy requires an explicit, human-attached
                      reason — never absorbed into COGS without explanation.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Item Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Package className="h-4 w-4" /> Item Portfolio Summary
              </CardTitle>
              <CardDescription className="text-xs">
                Total value: {formatCurrency(summary?.totalValue ?? 0)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-4">
                <div className="text-center p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20">
                  <p className="text-lg font-bold text-emerald-600">
                    {summary?.activeItems ?? 0}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Active</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20">
                  <p className="text-lg font-bold text-amber-600">
                    {lowStockAlerts.length}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Low Stock</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-red-50 dark:bg-red-950/20">
                  <p className="text-lg font-bold text-red-600">
                    {summary?.outOfStockItems ?? 0}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Out of Stock
                  </p>
                </div>
                <div className="text-center p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                  <p className="text-lg font-bold text-blue-600">
                    {summary?.locationCount ?? 0}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Locations</p>
                </div>
              </div>

              {summary && summary.totalItems > 0 && (
                <div className="mt-4">
                  <p className="text-[10px] text-muted-foreground mb-1.5">
                    Item Status Distribution
                  </p>
                  <div className="h-3 rounded-full bg-muted overflow-hidden flex">
                    {summary.activeItems > 0 && (
                      <div
                        className="bg-emerald-400 h-full transition-all"
                        style={{
                          width: `${(summary.activeItems / summary.totalItems) * 100}%`,
                        }}
                      />
                    )}
                    {lowStockAlerts.length > 0 && (
                      <div
                        className="bg-amber-400 h-full transition-all"
                        style={{
                          width: `${(lowStockAlerts.length / summary.totalItems) * 100}%`,
                        }}
                      />
                    )}
                    {(summary.outOfStockItems ?? 0) > 0 && (
                      <div
                        className="bg-red-400 h-full transition-all"
                        style={{
                          width: `${((summary.outOfStockItems ?? 0) / summary.totalItems) * 100}%`,
                        }}
                      />
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pipeline Run Status */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <RefreshCw className="h-4 w-4" /> Latest Pipeline Run
              </CardTitle>
            </CardHeader>
            <CardContent>
              {status?.latestRun ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 rounded bg-muted/50">
                      <p className="text-lg font-bold">
                        {status.latestRun.itemsScanned}
                      </p>
                      <p className="text-[9px] text-muted-foreground">
                        Items Scanned
                      </p>
                    </div>
                    <div className="p-2 rounded bg-muted/50">
                      <p className="text-lg font-bold">
                        {status.latestRun.lowStockCount}
                      </p>
                      <p className="text-[9px] text-muted-foreground">
                        Low Stock
                      </p>
                    </div>
                    <div className="p-2 rounded bg-muted/50">
                      <p className="text-lg font-bold">
                        {status.latestRun.discrepancyCount}
                      </p>
                      <p className="text-[9px] text-muted-foreground">
                        Discrepancies
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-4">
                  <RefreshCw className="h-8 w-8 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">
                    No pipeline runs yet
                  </p>
                  <p className="text-xs text-muted-foreground/70">
                    Click "Run Inventory Pipeline" to start
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab: Discrepancies ────────────────────────────────────── */}
        <TabsContent value="discrepancies" className="space-y-4 pt-4">
          {discrepanciesList.length > 0 ? (
            <div className="space-y-2">
              {discrepanciesList.map((d) => (
                <div
                  key={d.recordId}
                  className="flex items-center justify-between rounded-lg border border-red-200 dark:border-red-900 bg-red-50/30 dark:bg-red-950/10 p-4"
                >
                  <div className="flex items-start gap-3">
                    <Boxes className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-medium">
                        {d.itemName} ({d.sku})
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Expected: {d.expectedQty} · Counted: {d.countedQty} ·
                        Variance: {d.variance}
                        {d.reason
                          ? ` · Reason: ${d.reason}`
                          : " ⚠️ No reason recorded"}
                      </p>
                    </div>
                  </div>
                  <Badge className="text-[9px] bg-red-500/20 text-red-700">
                    {d.status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Boxes className="h-12 w-12" />}
              title="No discrepancies"
              description="All stock counts match the system. Run a physical count session to check."
            />
          )}
        </TabsContent>

        {/* ── Tab: GRN ─────────────────────────────────────────────── */}
        <TabsContent value="grn" className="space-y-4 pt-4">
          {grns && grns.length > 0 ? (
            <div className="space-y-2">
              {grns.map((g) => (
                <div
                  key={g.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-start gap-3">
                    <ClipboardCheck className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-medium">
                        GRN — {g.receivedDate}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        PO: {g.poId?.slice(0, 8) ?? "N/A"} · Status: {g.status}{" "}
                        · {g.lineItems?.length ?? 0} item(s)
                      </p>
                    </div>
                  </div>
                  <Badge
                    className={cn(
                      "text-[9px]",
                      g.status === "completed"
                        ? "bg-emerald-500/20 text-emerald-700"
                        : "bg-amber-500/20 text-amber-700",
                    )}
                  >
                    {g.status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<ClipboardCheck className="h-12 w-12" />}
              title="No goods received notes"
              description="GRNs will appear here when deliveries are received against purchase orders."
            />
          )}
        </TabsContent>

        {/* ── Tab: Pipeline Steps ──────────────────────────────────── */}
        <TabsContent value="steps" className="space-y-4 pt-4">
          <div className="space-y-3">
            {Object.entries(STEP_LABELS).map(([stepId, label]) => {
              const IconComponent = STEP_ICONS[stepId] ?? RefreshCw;
              const agent = STEP_AGENTS[stepId] ?? "Inventory Agent";
              return (
                <div
                  key={stepId}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-muted p-2">
                      <IconComponent className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs font-medium">{label}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {agent}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="secondary"
                    className="text-[9px] bg-muted/50 text-muted-foreground"
                  >
                    Pending
                  </Badge>
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
