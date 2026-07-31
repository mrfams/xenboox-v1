"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { useEntity } from "@/lib/entity-context";
import { PageHeader } from "@/components/shared/page-header";
import { SubPageTabs } from "@/components/shared/sub-page-tabs";
import { MODULE_TABS } from "@/components/shared/module-tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/shared/loading";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Badge,
} from "@/components/ui";
import {
  Building2,
  Shuffle,
  Percent,
  CheckCircle2,
  PlayCircle,
  TrendingUp,
  Network,
  Landmark,
  Wallet,
  FileText,
  BarChart3,
  ChevronDown,
  ChevronUp,
  CalendarDays,
  Download,
  Printer,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

// ─── Type ───────────────────────────────────────────────────────────────

type EntityFinancialData = {
  entityId: string;
  entityName: string;
  currency: string;
  country: string;
  isParent: boolean;
  relationship: {
    ownershipPct: number;
    consolidationMethod: string;
  } | null;
  financials: {
    totalRevenue: number;
    totalExpenses: number;
    netIncome: number;
    totalAssets: number;
    totalLiabilities: number;
    equity: number;
    cashBalance: number;
    outstandingAr: number;
    outstandingAp: number;
    transactionCount: number;
  };
};

type ConsolidationRun = {
  id: string;
  status: string;
  period: string;
  eliminationCount: number;
  minorityInterestCount: number;
  completedAt: string | null;
  integrityCheckPassed: boolean | null;
  confidence: number | null;
};

// ─── Color helpers ──────────────────────────────────────────────────────

function valueColor(value: number, inverse = false): string {
  if (inverse) {
    if (value < 0) return "text-emerald-600";
    if (value > 0) return "text-red-600";
  } else {
    if (value > 0) return "text-emerald-600";
    if (value < 0) return "text-red-600";
  }
  return "text-muted-foreground";
}

function bgForEntity(index: number): string {
  const colors = [
    "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800",
    "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800",
    "bg-violet-50 dark:bg-violet-950/20 border-violet-200 dark:border-violet-800",
    "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800",
    "bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800",
    "bg-cyan-50 dark:bg-cyan-950/20 border-cyan-200 dark:border-cyan-800",
  ];
  return colors[index % colors.length];
}

function accentForEntity(index: number): string {
  const colors = [
    "text-blue-600",
    "text-emerald-600",
    "text-violet-600",
    "text-amber-600",
    "text-rose-600",
    "text-cyan-600",
  ];
  return colors[index % colors.length];
}

// ─── Metric Row ─────────────────────────────────────────────────────────

function MetricRow({
  label,
  tooltip,
  values,
  consolidatedValue,
  format = "currency",
  inverseColor = false,
  gridCols,
}: {
  label: string;
  tooltip?: string;
  values: (number | string)[];
  consolidatedValue?: number | string;
  format?: "currency" | "number" | "percentage";
  inverseColor?: boolean;
  gridCols: string;
}) {
  const formatVal = (v: number | string) => {
    const n = typeof v === "string" ? Number(v) : v;
    if (format === "currency") return formatCurrency(n);
    if (format === "percentage") return `${n.toFixed(1)}%`;
    return n.toLocaleString();
  };

  return (
    <div
      className="grid gap-3 items-center py-2.5 px-3 rounded-lg hover:bg-muted/30 transition-colors text-xs"
      style={{ gridTemplateColumns: gridCols }}
    >
      <div className="flex items-center gap-1.5">
        <span
          className="font-medium text-slate-700 truncate"
          title={tooltip ?? label}
        >
          {label}
        </span>
        {tooltip && (
          <span
            className="text-[9px] text-muted-foreground cursor-help shrink-0"
            title={tooltip}
          >
            ⓘ
          </span>
        )}
      </div>
      {values.map((v, i) => (
        <div
          key={i}
          className={cn(
            "text-right font-semibold tabular-nums",
            typeof v === "number"
              ? valueColor(v, inverseColor)
              : "text-slate-700",
          )}
        >
          {formatVal(v)}
        </div>
      ))}
      {consolidatedValue !== undefined ? (
        <div
          className={cn(
            "text-right font-bold tabular-nums border-l border-border pl-3",
            typeof consolidatedValue === "number"
              ? valueColor(consolidatedValue, inverseColor)
              : "text-slate-900",
          )}
        >
          {formatVal(consolidatedValue)}
        </div>
      ) : (
        <div className="border-l border-border pl-3" />
      )}
    </div>
  );
}

// ─── Period Options Generator ─────────────────────────────────────────

function generatePeriodOptions(): string[] {
  const options: string[] = [];
  const now = new Date();
  // Include current month + last 11 months = 12 periods
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    options.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
    );
  }
  return options;
}

function PeriodLabel(period: string): string {
  const [year, month] = period.split("-").map(Number);
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${months[month - 1]} ${year}`;
}

// ─── Entity Color Dot ──────────────────────────────────────────────────

function EntityDot({ index, label }: { index: number; label: string }) {
  const dotColors = [
    "bg-blue-500",
    "bg-emerald-500",
    "bg-violet-500",
    "bg-amber-500",
    "bg-rose-500",
    "bg-cyan-500",
  ];
  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <span
        className={cn(
          "h-2 w-2 rounded-full shrink-0",
          dotColors[index % dotColors.length],
        )}
      />
      <span className="truncate max-w-[120px]">{label}</span>
    </span>
  );
}

// ─── Print Styles ──────────────────────────────────────────────────────

const printStyles = `
@media print {
  @page { margin: 0.5in; }
  body { background: white !important; }
  nav, header, footer, [role="navigation"], .sidebar, .top-nav,
  .no-print, button:not(.print\:inline), .PageHeader-action {
    display: none !important;
  }
  * {
    background: white !important;
    box-shadow: none !important;
    text-shadow: none !important;
  }
  .text-emerald-600, [class*="text-emerald"] { color: #059669 !important; }
  .text-red-600, [class*="text-red"] { color: #dc2626 !important; }
  .text-blue-600, [class*="text-blue"] { color: #2563eb !important; }
  .text-slate-700, .text-slate-900 { color: #1e293b !important; }
  .text-muted-foreground { color: #64748b !important; }
  .bg-gradient-to-br, .bg-gradient-to-r, [class*="bg-gradient"] {
    background: white !important;
  }
  .bg-muted\/30, .bg-muted { background: #f3f4f6 !important; }
  .border, .border-b, .border-t, .border-l, [class*="border-"] {
    border-color: #e2e8f0 !important;
  }
  a { text-decoration: none !important; }
  .rounded-lg, .rounded-xl, .rounded-2xl { border-radius: 0 !important; }
}
`;

// ─── Export Helpers ────────────────────────────────────────────────────

function escapeCSV(val: string | number): string {
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

type ConsolidationExportData = {
  period: string;
  parentEntity: { name: string };
  entities: EntityFinancialData[];
  eliminations: {
    eliminationType: string;
    description: string;
    entityName: string;
    counterpartyName: string;
    amount: number;
    debitCredit: string;
  }[];
  consolidatedTotals: {
    totalRevenue: number;
    totalExpenses: number;
    netIncome: number;
    totalAssets: number;
    totalLiabilities: number;
    cashBalance: number;
  } | null;
  eliminationsByType: Record<string, number>;
};

function exportConsolidatedCSV(data: ConsolidationExportData) {
  const lines: string[] = [];

  // ── Helper to add a section ──
  const section = (title: string, rows: string[][]) => {
    lines.push("");
    lines.push(`"${title}"`);
    rows.forEach((r) => lines.push(r.join(",")));
  };

  // ── Entity Column Headers ──
  const entityHeaders = data.entities.map(
    (e: { entityName: string; isParent: boolean }) =>
      `${e.isParent ? "[Parent]" : "[Sub]"} ${e.entityName}`,
  );
  const metricHeaders = ["Metric", ...entityHeaders, "Consolidated"];

  // ── Income Statement ──
  section("Income Statement", [
    metricHeaders,
    [
      "Total Revenue",
      ...data.entities.map((e: EntityFinancialData) =>
        escapeCSV(formatCurrency(e.financials.totalRevenue)),
      ),
      escapeCSV(formatCurrency(data.consolidatedTotals?.totalRevenue ?? 0)),
    ],
    [
      "Total Expenses",
      ...data.entities.map((e: EntityFinancialData) =>
        escapeCSV(formatCurrency(e.financials.totalExpenses)),
      ),
      escapeCSV(formatCurrency(data.consolidatedTotals?.totalExpenses ?? 0)),
    ],
    [
      "Net Income",
      ...data.entities.map((e: EntityFinancialData) =>
        escapeCSV(formatCurrency(e.financials.netIncome)),
      ),
      escapeCSV(formatCurrency(data.consolidatedTotals?.netIncome ?? 0)),
    ],
  ]);

  // ── Balance Sheet ──
  section("Balance Sheet", [
    metricHeaders,
    [
      "Cash & Bank",
      ...data.entities.map((e: EntityFinancialData) =>
        escapeCSV(formatCurrency(e.financials.cashBalance)),
      ),
      escapeCSV(formatCurrency(data.consolidatedTotals?.cashBalance ?? 0)),
    ],
    [
      "Accounts Receivable",
      ...data.entities.map((e: EntityFinancialData) =>
        escapeCSV(formatCurrency(e.financials.outstandingAr)),
      ),
      "",
    ],
    [
      "Total Assets",
      ...data.entities.map((e: EntityFinancialData) =>
        escapeCSV(formatCurrency(e.financials.totalAssets)),
      ),
      escapeCSV(formatCurrency(data.consolidatedTotals?.totalAssets ?? 0)),
    ],
    [
      "Accounts Payable",
      ...data.entities.map((e: EntityFinancialData) =>
        escapeCSV(formatCurrency(e.financials.outstandingAp)),
      ),
      escapeCSV(formatCurrency(data.consolidatedTotals?.totalLiabilities ?? 0)),
    ],
    [
      "Equity",
      ...data.entities.map((e: EntityFinancialData) =>
        escapeCSV(
          formatCurrency(
            e.financials.totalAssets - e.financials.totalLiabilities,
          ),
        ),
      ),
      escapeCSV(
        formatCurrency(
          (data.consolidatedTotals?.totalAssets ?? 0) -
            (data.consolidatedTotals?.totalLiabilities ?? 0),
        ),
      ),
    ],
  ]);

  // ── Activity ──
  section("Activity", [
    metricHeaders,
    [
      "Transaction Count",
      ...data.entities.map((e: EntityFinancialData) =>
        String(e.financials.transactionCount),
      ),
      String(
        data.entities.reduce(
          (s: number, e: EntityFinancialData) =>
            s + e.financials.transactionCount,
          0,
        ),
      ),
    ],
  ]);

  // ── Elimination Entries ──
  if (data.eliminations.length > 0) {
    const elimSection: string[][] = [
      [
        "Type",
        "Description",
        "Entity",
        "Counterparty",
        "Amount",
        "Debit/Credit",
      ],
    ];
    data.eliminations.forEach(
      (elim: {
        eliminationType: string;
        description: string;
        entityName: string;
        counterpartyName: string;
        amount: number;
        debitCredit: string;
      }) => {
        elimSection.push([
          escapeCSV(elim.eliminationType),
          escapeCSV(elim.description),
          escapeCSV(elim.entityName),
          escapeCSV(elim.counterpartyName),
          escapeCSV(formatCurrency(elim.amount)),
          escapeCSV(elim.debitCredit),
        ]);
      },
    );
    section("Elimination Entries", elimSection);
  }

  lines.push("");
  lines.push(`"Generated by Xenboox — ${new Date().toISOString()}"`);

  downloadBlob(
    lines.join("\n"),
    `consolidated-view-${data.period}.csv`,
    "text/csv;charset=utf-8;",
  );
}

function ExportDropdown({ data }: { data: ConsolidationExportData }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 text-xs"
        onClick={() => setOpen(!open)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      >
        <Download className="h-3.5 w-3.5" />
        Export
        <ChevronDown className="h-3 w-3" />
      </Button>
      {open && (
        <div className="absolute right-0 mt-1 w-48 rounded-lg border bg-card shadow-lg z-50 overflow-hidden">
          <button
            type="button"
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm transition-colors hover:bg-accent"
            onClick={() => {
              setOpen(false);
              exportConsolidatedCSV(data);
            }}
          >
            <FileText className="h-4 w-4 text-emerald-500" />
            <span>Download CSV</span>
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm transition-colors hover:bg-accent"
            onClick={() => {
              setOpen(false);
              window.print();
            }}
          >
            <Printer className="h-4 w-4 text-blue-500" />
            <span>Print / Save as PDF</span>
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────

export default function ConsolidatedViewPage() {
  const { entityId } = useEntity();
  const [selectedPeriod, setSelectedPeriod] = useState<string>(
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`,
  );
  const [showAllEliminations, setShowAllEliminations] = useState(false);

  const { data, isLoading } = trpc.consolidation.getConsolidatedView.useQuery(
    { period: selectedPeriod },
    { enabled: !!entityId },
  );

  const entities = useMemo(() => {
    if (!data?.entities) return [];
    // Sort: parent first, then subsidiaries
    return [...data.entities].sort((a, b) =>
      a.isParent === b.isParent ? 0 : a.isParent ? -1 : 1,
    ) as EntityFinancialData[];
  }, [data]);

  const eliminations = data?.eliminations ?? [];
  const minorityInterests = data?.minorityInterests ?? [];
  const totals = data?.consolidatedTotals;
  const latestRun = data?.latestRun as ConsolidationRun | null;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Consolidated View"
          description="Side-by-side entity comparison with elimination entries"
        />
        <SubPageTabs tabs={MODULE_TABS.accounting} />
        <Skeleton className="h-8 w-96" />
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Consolidated View"
          description="Side-by-side entity comparison with elimination entries"
        />
        <SubPageTabs tabs={MODULE_TABS.accounting} />
        <EmptyState
          icon={<Network className="h-12 w-12" />}
          title="Entity data not available"
          description="Could not load entity information for consolidated view."
        />
      </div>
    );
  }

  const entityGridCols =
    entities.length > 0
      ? `160px repeat(${entities.length},1fr) 120px`
      : "160px 1fr 120px";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Consolidated View"
        description={
          entities.length > 1
            ? `${entities.length} entities · ${data.parentEntity.name} group · ${selectedPeriod}`
            : "Side-by-side entity comparison with elimination entries"
        }
        action={{
          label: "Run Consolidation",
          icon: <PlayCircle className="mr-2 h-4 w-4" />,
          onClick: () => {
            window.location.href = "/dashboard/consolidation/pipeline";
          },
        }}
      />

      <SubPageTabs tabs={MODULE_TABS.accounting} />

      {/* Print styles injected inline */}
      <style>{printStyles}</style>

      {/* Period Selector & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <label
            htmlFor="period-select"
            className="text-sm text-muted-foreground"
          >
            Period:
          </label>
          <select
            id="period-select"
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="rounded-lg border bg-background px-3 py-1.5 text-sm font-medium outline-none transition-colors focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
          >
            {generatePeriodOptions().map((p) => (
              <option key={p} value={p}>
                {PeriodLabel(p)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <ExportDropdown data={data} />
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {latestRun && (
              <>
                <Badge
                  className={cn(
                    "text-[9px]",
                    latestRun.status === "completed"
                      ? "bg-emerald-500/20 text-emerald-700"
                      : latestRun.status === "reviewing"
                        ? "bg-amber-500/20 text-amber-700"
                        : "bg-muted/50 text-muted-foreground",
                  )}
                >
                  {latestRun.status}
                </Badge>
                {latestRun.confidence !== null && (
                  <span>
                    Confidence: {(latestRun.confidence * 100).toFixed(0)}%
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-primary/5 to-background">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Entities</p>
                <p className="text-xl font-bold">{totals?.entityCount ?? 0}</p>
              </div>
              <Building2 className="h-5 w-5 text-primary/60" />
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">
              {totals?.subsidiaryCount ?? 0} subsidiaries
            </p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-50 to-background dark:from-emerald-950/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Group Revenue</p>
                <p className="text-xl font-bold text-emerald-600">
                  {formatCurrency(totals?.totalRevenue ?? 0)}
                </p>
              </div>
              <TrendingUp className="h-5 w-5 text-emerald-500/60" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-background dark:from-blue-950/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Group Cash</p>
                <p className="text-xl font-bold text-blue-600">
                  {formatCurrency(totals?.cashBalance ?? 0)}
                </p>
              </div>
              <Wallet className="h-5 w-5 text-blue-500/60" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-background dark:from-purple-950/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Eliminations</p>
                <p className="text-xl font-bold text-purple-600">
                  {formatCurrency(data.totalEliminationAmount)}
                </p>
              </div>
              <Shuffle className="h-5 w-5 text-purple-500/60" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Entity Header Row */}
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          <div
            className="grid gap-3 items-center mb-1 px-3"
            style={{ gridTemplateColumns: entityGridCols }}
          >
            <div />
            {entities.map((entity, i) => (
              <div
                key={entity.entityId}
                className={cn(
                  "text-center rounded-t-lg px-3 py-2 border border-b-0",
                  bgForEntity(i),
                )}
              >
                <div className="flex items-center justify-center gap-1.5">
                  <span className={cn("text-xs font-bold", accentForEntity(i))}>
                    {entity.isParent ? "Parent" : "Subsidiary"}
                  </span>
                  {entity.relationship &&
                    entity.relationship.ownershipPct < 100 && (
                      <Badge variant="outline" className="text-[8px] px-1 h-4">
                        {entity.relationship.ownershipPct}%
                      </Badge>
                    )}
                </div>
                <p className="text-sm font-semibold truncate mt-0.5">
                  {entity.entityName}
                </p>
                <p className="text-[9px] text-muted-foreground mt-0.5">
                  {entity.currency} · {entity.country}
                  {entity.relationship && (
                    <> · {entity.relationship.consolidationMethod}</>
                  )}
                </p>
              </div>
            ))}
            <div className="text-center rounded-t-lg px-3 py-2 border border-b-0 bg-slate-900 text-white">
              <BarChart3 className="h-4 w-4 mx-auto mb-0.5" />
              <p className="text-xs font-bold">Consolidated</p>
              <p className="text-[9px] text-slate-300 mt-0.5">Group Total</p>
            </div>
          </div>

          {/* Financial Section: Revenue */}
          <Card className="rounded-t-none border-t-0">
            <CardContent className="p-0">
              <div className="border-b bg-muted/30 px-3 py-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                  Income Statement
                </p>
              </div>

              <MetricRow
                label="Total Revenue"
                values={entities.map((e) => e.financials.totalRevenue)}
                consolidatedValue={totals?.totalRevenue ?? 0}
                gridCols={entityGridCols}
              />
              <MetricRow
                label="Total Expenses"
                values={entities.map((e) => e.financials.totalExpenses)}
                consolidatedValue={totals?.totalExpenses ?? 0}
                inverseColor
                gridCols={entityGridCols}
              />
              <div className="border-t border-dashed mx-3" />
              <MetricRow
                label="Net Income"
                values={entities.map((e) => e.financials.netIncome)}
                consolidatedValue={totals?.netIncome ?? 0}
                gridCols={entityGridCols}
              />
            </CardContent>
          </Card>

          {/* Financial Section: Balance Sheet */}
          <Card className="mt-4">
            <CardContent className="p-0">
              <div className="border-b bg-muted/30 px-3 py-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Landmark className="h-3.5 w-3.5 text-blue-500" />
                  Balance Sheet
                </p>
              </div>

              <MetricRow
                label="Cash & Bank"
                values={entities.map((e) => e.financials.cashBalance)}
                consolidatedValue={totals?.cashBalance ?? 0}
                gridCols={entityGridCols}
              />
              <MetricRow
                label="Accounts Receivable"
                values={entities.map((e) => e.financials.outstandingAr)}
                consolidatedValue={
                  entities.reduce((s, e) => s + e.financials.outstandingAr, 0) -
                  (data.eliminationsByType.ic_receivable_payable ?? 0)
                }
                gridCols={entityGridCols}
              />
              <div className="border-t border-dashed mx-3" />
              <MetricRow
                label="Total Assets"
                values={entities.map((e) => e.financials.totalAssets)}
                consolidatedValue={totals?.totalAssets ?? 0}
                gridCols={entityGridCols}
              />
              <MetricRow
                label="Accounts Payable"
                values={entities.map((e) => e.financials.outstandingAp)}
                consolidatedValue={totals?.totalLiabilities ?? 0}
                inverseColor
                gridCols={entityGridCols}
              />
              <div className="border-t border-dashed mx-3" />
              <MetricRow
                label="Equity"
                values={entities.map((e) => e.financials.equity)}
                consolidatedValue={
                  (totals?.totalAssets ?? 0) - (totals?.totalLiabilities ?? 0)
                }
                gridCols={entityGridCols}
              />
            </CardContent>
          </Card>

          {/* Transaction Count */}
          <Card className="mt-4">
            <CardContent className="p-0">
              <div className="border-b bg-muted/30 px-3 py-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-violet-500" />
                  Activity
                </p>
              </div>
              <MetricRow
                label="Transaction Count"
                values={entities.map((e) => e.financials.transactionCount)}
                format="number"
                consolidatedValue={entities.reduce(
                  (s, e) => s + e.financials.transactionCount,
                  0,
                )}
                gridCols={entityGridCols}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Elimination Entries Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shuffle className="h-4 w-4 text-purple-500" />
              Elimination Entries
              <Badge variant="secondary" className="text-[9px] font-normal">
                {eliminations.length} entries
              </Badge>
            </CardTitle>
            {eliminations.length > 5 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setShowAllEliminations(!showAllEliminations)}
              >
                {showAllEliminations ? (
                  <>
                    Show Less <ChevronUp className="ml-1 h-3 w-3" />
                  </>
                ) : (
                  <>
                    Show All <ChevronDown className="ml-1 h-3 w-3" />
                  </>
                )}
              </Button>
            )}
          </div>
          <CardDescription className="text-xs">
            Inter-company eliminations — these exist ONLY in the consolidation
            layer and never touch entity-level ledgers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {eliminations.length > 0 ? (
            <div className="space-y-2">
              {/* Summary by type */}
              {Object.entries(data.eliminationsByType).length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {Object.entries(data.eliminationsByType).map(
                    ([type, amount]) => (
                      <Badge
                        key={type}
                        variant="outline"
                        className="text-[10px] gap-1.5 py-1"
                      >
                        <Shuffle className="h-3 w-3" />
                        {type.replace(/_/g, " ")}: {formatCurrency(amount)}
                      </Badge>
                    ),
                  )}
                </div>
              )}

              {/* Elimination entries */}
              {(showAllEliminations
                ? eliminations
                : eliminations.slice(0, 5)
              ).map((elim) => (
                <div
                  key={elim.id}
                  className="flex items-center justify-between rounded-lg border p-3 text-xs"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <Shuffle className="h-4 w-4 text-purple-500 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium capitalize">
                        {elim.eliminationType.replace(/_/g, " ")}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                        {elim.description}
                      </p>
                      <p className="text-[9px] text-muted-foreground mt-0.5">
                        {elim.entityName} → {elim.counterpartyName}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className="font-medium tabular-nums">
                      {formatCurrency(elim.amount)}
                    </p>
                    <Badge
                      className={cn(
                        "text-[9px] mt-0.5",
                        elim.debitCredit === "debit"
                          ? "bg-red-500/20 text-red-700"
                          : "bg-emerald-500/20 text-emerald-700",
                      )}
                    >
                      {elim.debitCredit}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center">
              <Shuffle className="h-8 w-8 mx-auto text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">
                No elimination entries for this period
              </p>
              <p className="mt-1 text-xs text-muted-foreground/70">
                Run consolidation to generate eliminations from inter-company
                transactions.
              </p>
              <Link href="/dashboard/consolidation/pipeline">
                <Button size="sm" variant="outline" className="mt-3 gap-1.5">
                  <PlayCircle className="h-3.5 w-3.5" />
                  Run Consolidation
                </Button>
              </Link>
            </div>
          )}

          {/* Confidence & Integrity */}
          {latestRun && (
            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground border-t pt-3">
              <span className="flex items-center gap-1">
                Latest run: {latestRun.period}
              </span>
              <Badge
                className={cn(
                  "text-[9px]",
                  latestRun.status === "completed"
                    ? "bg-emerald-500/20 text-emerald-700"
                    : latestRun.status === "reviewing"
                      ? "bg-amber-500/20 text-amber-700"
                      : "bg-muted/50 text-muted-foreground",
                )}
              >
                {latestRun.status}
              </Badge>
              {latestRun.integrityCheckPassed !== null && (
                <span
                  className={cn(
                    "flex items-center gap-1",
                    latestRun.integrityCheckPassed
                      ? "text-emerald-600"
                      : "text-red-600",
                  )}
                >
                  <CheckCircle2 className="h-3 w-3" />
                  Integrity:{" "}
                  {latestRun.integrityCheckPassed ? "Passed" : "Failed"}
                </span>
              )}
              {latestRun.confidence !== null && (
                <span>
                  Confidence: {(latestRun.confidence * 100).toFixed(0)}%
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Minority Interest Section */}
      {minorityInterests.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Percent className="h-4 w-4 text-amber-500" />
              Minority Interest
              <Badge variant="secondary" className="text-[9px] font-normal">
                {minorityInterests.length} subsidiaries
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs">
              Non-controlling interest breakdown for subsidiaries with &lt;100%
              ownership.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {minorityInterests.map((mi, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg border p-3 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <Percent className="h-4 w-4 text-amber-500" />
                    <div>
                      <p className="font-medium">{mi.subsidiaryName}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {mi.minorityPct}% minority · {mi.ownershipPct}% owned
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium tabular-nums">
                      {formatCurrency(mi.minorityShareIncome)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Income share
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium tabular-nums">
                      {formatCurrency(mi.minorityShareEquity)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Equity share
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Entity Comparison Legend */}
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground mb-2">
            Legend — Entity Colors
          </p>
          <div className="flex flex-wrap gap-4">
            {entities.map((entity, i) => (
              <EntityDot
                key={entity.entityId}
                index={i}
                label={entity.entityName}
              />
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mt-3">
            Consolidated figures are the sum of all entities minus inter-company
            eliminations. Elimination entries exist ONLY in the consolidation
            layer — entity-level ledgers are never modified.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
