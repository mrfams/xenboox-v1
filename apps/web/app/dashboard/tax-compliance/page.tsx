"use client";

import { useMemo, useState } from "react";
import {
  Landmark,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  Shield,
  Bot,
  RefreshCw,
  ChevronDown,
  Download,
  Search,
  Calendar,
  Percent,
  Banknote,
  FileCheck2,
  Scale,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { AiSimulationTrigger } from "@/components/ai-ux/simulation-trigger";

// ─── Types ─────────────────────────────────────────────────────────────────

type TabType =
  | "overview"
  | "deadlines"
  | "vat"
  | "withholding"
  | "1099"
  | "packages"
  | "rule-changes";

const JURISDICTION_LABELS: Record<string, string> = {
  GM: "The Gambia",
  SN: "Senegal",
  GH: "Ghana",
  NG: "Nigeria",
  KE: "Kenya",
  US: "United States",
};

const FILING_TYPE_LABELS: Record<string, string> = {
  vat: "VAT",
  paye: "PAYE",
  withholding: "Withholding",
  corporate_tax: "Corporate Tax",
  social_security: "Social Security",
};

// ─── Summary Cards ─────────────────────────────────────────────────────────

function SummaryCards({
  stats,
}: {
  stats: {
    total: number;
    normal: number;
    approaching: number;
    critical: number;
    overdue: number;
    clean: number;
    itemsPending: number;
  };
}) {
  const cards = [
    {
      label: "Filing Deadlines",
      value: stats.total.toString(),
      subtitle: `${stats.overdue} overdue · ${stats.critical} critical`,
      icon: Calendar,
      color: "text-indigo-600",
      iconBg: "bg-indigo-100",
    },
    {
      label: "Overdue",
      value: stats.overdue.toString(),
      subtitle: "Require immediate action",
      icon: AlertTriangle,
      color: "text-red-600",
      iconBg: "bg-red-100",
    },
    {
      label: "Critical (≤7 days)",
      value: stats.critical.toString(),
      subtitle: `${stats.approaching} approaching (≤14 days)`,
      icon: Clock,
      color: "text-amber-600",
      iconBg: "bg-amber-100",
    },
    {
      label: "Regulatory Status",
      value: `${stats.clean} / ${stats.total} clean`,
      subtitle: `${stats.itemsPending} items pending review`,
      icon: Shield,
      color: "text-emerald-600",
      iconBg: "bg-emerald-100",
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
            <div className={cn("rounded-lg p-2", card.iconBg)}>
              <card.icon className={cn("h-4 w-4", card.color)} />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{card.value}</p>
          <p className="text-xs text-slate-400 mt-1">{card.subtitle}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Deadline Table ────────────────────────────────────────────────────────

function DeadlineTable({
  deadlines,
  isLoading,
}: {
  deadlines: Array<{
    id: string;
    name: string;
    jurisdiction: string;
    filingType: string;
    dueDate: string;
    daysUntilDue: number;
    urgency: string;
    status: string;
    packageReady: boolean;
    estimatedAmount: string | null;
  }>;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <RefreshCw className="h-8 w-8 text-slate-400 animate-spin" />
      </div>
    );
  }

  const urgencyStyles: Record<string, string> = {
    normal: "bg-blue-100 text-blue-700",
    approaching: "bg-amber-100 text-amber-700",
    critical: "bg-red-100 text-red-700",
    overdue: "bg-red-100 text-red-700",
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Filing
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Jurisdiction
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Type
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Due Date
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Countdown
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Status
            </th>
            <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">
              Estimated Amount
            </th>
          </tr>
        </thead>
        <tbody>
          {deadlines.length === 0 && (
            <tr>
              <td colSpan={7} className="py-12 text-center">
                <div className="flex flex-col items-center gap-2">
                  <Calendar className="h-8 w-8 text-slate-300" />
                  <p className="text-sm text-slate-400">
                    No filing deadlines yet. Run the tax pipeline to generate
                    them.
                  </p>
                </div>
              </td>
            </tr>
          )}
          {deadlines.map((d) => (
            <tr
              key={d.id}
              className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
            >
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-slate-400" />
                  <span className="text-sm font-medium text-slate-900">
                    {d.name}
                  </span>
                  {d.packageReady && (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  )}
                </div>
              </td>
              <td className="py-3 px-4">
                <span className="text-sm text-slate-700">
                  {JURISDICTION_LABELS[d.jurisdiction] ?? d.jurisdiction}
                </span>
              </td>
              <td className="py-3 px-4">
                <span className="text-sm text-slate-600">
                  {FILING_TYPE_LABELS[d.filingType] ?? d.filingType}
                </span>
              </td>
              <td className="py-3 px-4 text-sm text-slate-600">
                {new Date(d.dueDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </td>
              <td className="py-3 px-4">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium",
                    urgencyStyles[d.urgency] ?? "bg-blue-100 text-blue-700",
                  )}
                >
                  {d.daysUntilDue <= 0
                    ? `${Math.abs(d.daysUntilDue)}d overdue`
                    : `${d.daysUntilDue}d left`}
                </span>
              </td>
              <td className="py-3 px-4">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium",
                    d.status === "filed"
                      ? "bg-emerald-100 text-emerald-700"
                      : d.status === "overdue"
                        ? "bg-red-100 text-red-700"
                        : "bg-slate-100 text-slate-600",
                  )}
                >
                  {d.status}
                </span>
              </td>
              <td className="py-3 px-4 text-right text-sm font-medium text-slate-900">
                {d.estimatedAmount
                  ? Number(d.estimatedAmount).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                    })
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── 1099 Contractor Table (US) ───────────────────────────────────────────

function Contractor1099Table({
  contractors,
  year,
  isLoading,
}: {
  contractors: Array<{
    payeeId: string;
    payeeName: string;
    totalPayments: number;
    totalWithheld: number;
    count: number;
    thresholdMet: boolean;
  }>;
  year: string;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
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
              Contractor
            </th>
            <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">
              Total Payments ({year})
            </th>
            <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">
              Tax Withheld
            </th>
            <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">
              Transactions
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              1099 Required
            </th>
          </tr>
        </thead>
        <tbody>
          {contractors.length === 0 && (
            <tr>
              <td colSpan={5} className="py-12 text-center">
                <div className="flex flex-col items-center gap-2">
                  <Banknote className="h-8 w-8 text-slate-300" />
                  <p className="text-sm text-slate-400">
                    No US contractor payments recorded in {year}. Payments are
                    tracked via withholding records when invoices are processed.
                  </p>
                </div>
              </td>
            </tr>
          )}
          {contractors.map((c) => (
            <tr
              key={c.payeeId}
              className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
            >
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center">
                    <span className="text-xs font-bold text-slate-600">
                      {c.payeeName
                        .split(" ")
                        .slice(0, 2)
                        .map((w) => w[0])
                        .join("")
                        .toUpperCase()}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-slate-900">
                    {c.payeeName}
                  </span>
                </div>
              </td>
              <td className="py-3 px-4 text-right text-sm font-medium text-slate-900">
                $
                {c.totalPayments.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                })}
              </td>
              <td className="py-3 px-4 text-right text-sm text-slate-600">
                $
                {c.totalWithheld.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                })}
              </td>
              <td className="py-3 px-4 text-right text-sm text-slate-600">
                {c.count}
              </td>
              <td className="py-3 px-4">
                {c.thresholdMet ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">
                    <FileCheck2 className="h-3 w-3" /> 1099-NEC (≥ $600)
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-500">
                    Below threshold
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Generic Data Table (VAT / WHT / Packages) ────────────────────────────

function GenericTable({
  title,
  columns,
  rows,
  emptyMessage,
  isLoading,
}: {
  title: string;
  columns: Array<{ key: string; label: string; align?: "right" }>;
  rows: Array<Record<string, string | number | null>>;
  emptyMessage: string;
  isLoading: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-slate-900">{title}</h3>
        <button className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
          <Download className="h-3.5 w-3.5" /> Export
        </button>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <RefreshCw className="h-6 w-6 text-slate-400 animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-12">
          <FileText className="h-8 w-8 text-slate-300" />
          <p className="text-sm text-slate-400">{emptyMessage}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                {columns.map((c) => (
                  <th
                    key={c.key}
                    className={cn(
                      "py-3 px-4 text-sm font-medium text-slate-600",
                      c.align === "right" ? "text-right" : "text-left",
                    )}
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={i}
                  className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                >
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className={cn(
                        "py-3 px-4 text-sm",
                        c.align === "right"
                          ? "text-right font-medium text-slate-900"
                          : "text-slate-700",
                      )}
                    >
                      {row[c.key] ?? "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function TaxCompliancePage() {
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [period, setPeriod] = useState(() =>
    new Date().toISOString().slice(0, 7),
  );
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);

  const today = new Date();
  const currentYear = String(today.getFullYear());
  const lastMonth = useMemo(() => {
    const d = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  const deadlineStats = trpc.complianceLiveness.getDeadlineStats.useQuery();
  const deadlines = trpc.complianceLiveness.listDeadlines.useQuery();
  const vatCalc = trpc.taxCompliance.listVatCalculations.useQuery({
    period: activeTab === "vat" ? lastMonth : undefined,
  });
  const wht = trpc.taxCompliance.listWithholdingRecords.useQuery();
  const taxPackages = trpc.taxCompliance.listTaxPackages.useQuery();
  const taxRules = trpc.taxCompliance.listTaxRules.useQuery();
  const filingDeadlines = trpc.taxCompliance.listFilingDeadlines.useQuery();
  const ruleProposals =
    trpc.complianceLiveness.listRuleChangeProposals.useQuery();
  const status = trpc.taxCompliance.getStatus.useQuery({ period });
  const form1099 = trpc.taxCompliance.list1099Summary.useQuery({
    year: currentYear,
  });

  const runPipeline = trpc.taxCompliance.runPipeline.useMutation({
    onMutate: () => {
      setRunning(true);
      setRunError(null);
    },
    onSettled: () => setRunning(false),
    onError: (e) => setRunError(e.message),
    onSuccess: () => {
      deadlineStats.refetch();
      deadlines.refetch();
      vatCalc.refetch();
      wht.refetch();
      taxPackages.refetch();
      filingDeadlines.refetch();
      status.refetch();
    },
  });

  const tabs = [
    { key: "overview" as TabType, label: "Overview" },
    { key: "deadlines" as TabType, label: "Deadlines" },
    { key: "vat" as TabType, label: "VAT" },
    { key: "withholding" as TabType, label: "Withholding" },
    { key: "1099" as TabType, label: "1099 Forms" },
    { key: "packages" as TabType, label: "Tax Packages" },
    { key: "rule-changes" as TabType, label: "Rule Changes" },
  ];

  const vatRows =
    vatCalc.data?.map((v) => ({
      period: v.period,
      input: Number(v.inputVat).toLocaleString("en-US", {
        minimumFractionDigits: 2,
      }),
      output: Number(v.outputVat).toLocaleString("en-US", {
        minimumFractionDigits: 2,
      }),
      net: Number(v.netPosition).toLocaleString("en-US", {
        minimumFractionDigits: 2,
      }),
      status: v.status,
    })) ?? [];

  const whtRows =
    wht.data?.map((w) => ({
      period: w.period,
      payee: w.payeeName ?? w.payeeId.slice(0, 8),
      jurisdiction: w.jurisdiction,
      amount: Number(w.amount).toLocaleString("en-US", {
        minimumFractionDigits: 2,
      }),
      rate: `${(Number(w.rate) * 100).toFixed(2)}%`,
      withheld: Number(w.taxWithheld).toLocaleString("en-US", {
        minimumFractionDigits: 2,
      }),
      filed: w.filed ? "Filed" : "Pending",
    })) ?? [];

  const packageRows =
    taxPackages.data?.map((p) => ({
      period: p.period,
      type: p.packageType.toUpperCase(),
      status: p.status,
      compliance: p.complianceChecked ? "Checked" : "Pending",
      submitted: p.submitted ? "Submitted" : "Not submitted",
    })) ?? [];

  const ruleRows =
    ruleProposals.data?.map((r) => ({
      jurisdiction: r.jurisdiction,
      rule: r.ruleName,
      type: r.ruleType,
      detected: r.detectedAt
        ? new Date(r.detectedAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })
        : "—",
      confidence:
        r.sourceConfidence != null
          ? `${(r.sourceConfidence * 100).toFixed(0)}%`
          : "—",
      status: r.status,
    })) ?? [];

  return (
    <div className="min-h-full bg-slate-50">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Landmark className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Tax &amp; Compliance Center
              </h1>
              <p className="text-sm text-slate-500">
                AI-monitored filing deadlines, VAT / withholding, corporate tax,
                and 1099 preparation across 6 jurisdictions.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <AiSimulationTrigger
              traceId="tax-filing-prep"
              label="AI Prep Filing"
              variant="outline"
            />
            <AiSimulationTrigger
              traceId="tax-compliance-check"
              label="AI Compliance Check"
              variant="outline"
            />
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
              <input
                type="month"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="text-sm text-slate-700 focus:outline-none"
              />
            </div>
            <button
              onClick={() =>
                runPipeline.mutate({
                  period,
                  triggerSource: "manual",
                  jurisdictions: ["GM", "SN", "GH", "NG", "US"],
                  includeCorporateTax: true,
                })
              }
              disabled={running}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {running ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Bot className="h-4 w-4" />
              )}
              {running ? "Running pipeline..." : "Run Tax Pipeline"}
            </button>
          </div>
        </div>

        {runError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {runError}
          </div>
        )}

        {/* Pipeline status strip */}
        {status.data && (
          <div className="mb-4 grid grid-cols-5 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div>
              <p className="text-xs text-slate-500">Period</p>
              <p className="text-sm font-medium text-slate-900">{period}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Pipeline</p>
              <p className="text-sm font-medium capitalize text-slate-900">
                {status.data.hasActivePipeline ? "Active" : "Idle"}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">VAT Net Position</p>
              <p
                className={cn(
                  "text-sm font-medium",
                  (status.data.vatSummary?.totalNetPosition ?? 0) >= 0
                    ? "text-amber-600"
                    : "text-emerald-600",
                )}
              >
                {(status.data.vatSummary?.totalNetPosition ?? 0) >= 0
                  ? "Payable"
                  : "Refundable"}{" "}
                ·{" "}
                {Math.abs(
                  status.data.vatSummary?.totalNetPosition ?? 0,
                ).toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Upcoming Filings</p>
              <p className="text-sm font-medium text-slate-900">
                {status.data.upcomingDeadlines.length}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Active Jurisdictions</p>
              <p className="text-sm font-medium text-slate-900">
                {status.data.activeJurisdictions.join(", ")}
              </p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-slate-200 -mb-px overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                activeTab === tab.key
                  ? "border-emerald-600 text-emerald-600"
                  : "border-transparent text-slate-500 hover:text-slate-700",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {activeTab === "overview" && (
          <>
            <SummaryCards
              stats={
                deadlineStats.data ?? {
                  total: 0,
                  normal: 0,
                  approaching: 0,
                  critical: 0,
                  overdue: 0,
                  clean: 0,
                  itemsPending: 0,
                }
              }
            />

            <div className="grid grid-cols-3 gap-4">
              {/* Upcoming deadlines */}
              <div className="col-span-2 rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-slate-900">
                    Upcoming Filing Deadlines
                  </h3>
                  <button
                    onClick={() => setActiveTab("deadlines")}
                    className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
                  >
                    View all →
                  </button>
                </div>
                <DeadlineTable
                  deadlines={(deadlines.data ?? []).slice(0, 6)}
                  isLoading={deadlines.isLoading}
                />
              </div>

              {/* Right column */}
              <div className="space-y-4">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Percent className="h-4 w-4 text-emerald-600" />
                    <h3 className="font-medium text-slate-900">
                      VAT Position (last month)
                    </h3>
                  </div>
                  {vatCalc.data && vatCalc.data.length > 0 ? (
                    <div className="space-y-3">
                      {vatCalc.data.slice(0, 3).map((v) => {
                        const net = Number(v.netPosition);
                        return (
                          <div
                            key={v.id}
                            className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
                          >
                            <div>
                              <p className="text-sm font-medium text-slate-900">
                                {v.period}
                              </p>
                              <p className="text-xs text-slate-400 capitalize">
                                {v.status}
                              </p>
                            </div>
                            <span
                              className={cn(
                                "text-sm font-bold",
                                net >= 0
                                  ? "text-amber-600"
                                  : "text-emerald-600",
                              )}
                            >
                              {net >= 0 ? "Payable" : "Refundable"} ·{" "}
                              {Math.abs(net).toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                              })}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">
                      No VAT calculations yet for {lastMonth}. Run the pipeline.
                    </p>
                  )}
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Scale className="h-4 w-4 text-emerald-600" />
                    <h3 className="font-medium text-slate-900">
                      Active Tax Rules
                    </h3>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-3xl font-bold text-slate-900">
                      {taxRules.data?.length ?? 0}
                    </span>
                    <div className="flex flex-wrap gap-1 justify-end">
                      {["GM", "SN", "GH", "NG", "US"].map((j) => (
                        <span
                          key={j}
                          className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600"
                        >
                          {j}
                        </span>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Versioned statutory rules per jurisdiction
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === "deadlines" && (
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search filings..."
                  className="w-64 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
              <div className="flex items-center gap-2">
                <select className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  <option>All jurisdictions</option>
                  {Object.entries(JURISDICTION_LABELS).map(([code, label]) => (
                    <option key={code} value={code}>
                      {label}
                    </option>
                  ))}
                </select>
                <button className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                  All statuses <ChevronDown className="h-4 w-4" />
                </button>
              </div>
            </div>
            <DeadlineTable
              deadlines={deadlines.data ?? []}
              isLoading={deadlines.isLoading}
            />
          </div>
        )}

        {activeTab === "vat" && (
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <GenericTable
              title={`VAT Calculations — ${lastMonth}`}
              columns={[
                { key: "period", label: "Period" },
                { key: "input", label: "Input VAT", align: "right" },
                { key: "output", label: "Output VAT", align: "right" },
                { key: "net", label: "Net Position", align: "right" },
                { key: "status", label: "Status" },
              ]}
              rows={vatRows}
              emptyMessage="No VAT calculations for this period yet."
              isLoading={vatCalc.isLoading}
            />
          </div>
        )}

        {activeTab === "withholding" && (
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <GenericTable
              title="Withholding Records"
              columns={[
                { key: "period", label: "Period" },
                { key: "payee", label: "Payee" },
                { key: "jurisdiction", label: "Jurs." },
                { key: "amount", label: "Amount", align: "right" },
                { key: "rate", label: "Rate" },
                { key: "withheld", label: "Withheld", align: "right" },
                { key: "filed", label: "Filing" },
              ]}
              rows={whtRows}
              emptyMessage="No withholding records yet."
              isLoading={wht.isLoading}
            />
          </div>
        )}

        {activeTab === "1099" && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-sm text-slate-500">
                  Contractors ({currentYear})
                </p>
                <p className="text-2xl font-bold text-slate-900">
                  {form1099.data?.totalContractors ?? 0}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-sm text-slate-500">Forms Required</p>
                <p className="text-2xl font-bold text-slate-900">
                  {form1099.data?.formsRequired ?? 0}
                </p>
                <p className="text-xs text-slate-400">1099-NEC (≥ $600)</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-sm text-slate-500">Total Payments</p>
                <p className="text-2xl font-bold text-slate-900">
                  $
                  {(form1099.data?.totalPayments ?? 0).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-sm text-slate-500">Backup Withholding</p>
                <p className="text-2xl font-bold text-slate-900">
                  $
                  {(form1099.data?.totalWithheld ?? 0).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <Contractor1099Table
                contractors={form1099.data?.contractors ?? []}
                year={currentYear}
                isLoading={form1099.isLoading}
              />
            </div>
          </div>
        )}

        {activeTab === "packages" && (
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <GenericTable
              title="Tax Filing Packages"
              columns={[
                { key: "period", label: "Period" },
                { key: "type", label: "Type" },
                { key: "status", label: "Status" },
                { key: "compliance", label: "Compliance" },
                { key: "submitted", label: "Submission" },
              ]}
              rows={packageRows}
              emptyMessage="No tax packages assembled yet. Run the pipeline."
              isLoading={taxPackages.isLoading}
            />
          </div>
        )}

        {activeTab === "rule-changes" && (
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <GenericTable
              title="Detected Tax Rule Changes (require human confirmation)"
              columns={[
                { key: "jurisdiction", label: "Jurs." },
                { key: "rule", label: "Rule" },
                { key: "type", label: "Type" },
                { key: "detected", label: "Detected" },
                { key: "confidence", label: "Confidence" },
                { key: "status", label: "Status" },
              ]}
              rows={ruleRows}
              emptyMessage="No rule change proposals detected. Run detectRuleChanges to scan."
              isLoading={ruleProposals.isLoading}
            />
          </div>
        )}
      </div>
    </div>
  );
}
