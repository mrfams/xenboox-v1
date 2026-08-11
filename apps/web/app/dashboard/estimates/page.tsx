"use client";

import { useMemo, useState } from "react";
import {
  FileText,
  Plus,
  Search,
  ChevronDown,
  MoreHorizontal,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Bot,
  TrendingUp,
  Eye,
  X,
  Send,
  ArrowRight,
  Clock,
  FileCheck2,
  Ban,
  Sparkles,
  User,
  Loader2,
  Trash2,
} from "lucide-react";

import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { RowActionsMenu } from "@/components/module/row-actions-menu";
import { AiSimulationTrigger } from "@/components/ai-ux/simulation-trigger";

// ─── Types ─────────────────────────────────────────────────────────────────

type TabType =
  | "overview"
  | "all"
  | "draft"
  | "sent"
  | "viewed"
  | "accepted"
  | "declined"
  | "converted";

type Estimate = {
  id: string;
  estimateNumber: string;
  estimateDate: string;
  expiryDate: string | null;
  status: string;
  totalAmount: string;
  currency: string;
  notes: string | null;
  customerId: string;
  customerName: string;
  customerEmail: string | null;
  convertedInvoiceId: string | null;
  createdAt: string;
  amount: number;
  daysLeft: number | null;
  expired: boolean;
};

// ─── Summary Cards ─────────────────────────────────────────────────────────

function SummaryCards({
  overview,
}: {
  overview: {
    totalEstimates: number;
    statusCounts: Record<string, number>;
    openTotal: number;
    acceptedTotal: number;
    conversionRate: number;
    expiringSoon: number;
  } | null;
}) {
  const cards = [
    {
      label: "Total Estimates",
      value: (overview?.totalEstimates ?? 0).toString(),
      subtitle: "All time",
      icon: FileText,
      color: "text-indigo-600",
      iconBg: "bg-indigo-100",
    },
    {
      label: "Open Value",
      value: (overview?.openTotal ?? 0).toLocaleString("en-US", {
        minimumFractionDigits: 2,
      }),
      subtitle: "Draft + sent + viewed + accepted",
      icon: Clock,
      color: "text-blue-600",
      iconBg: "bg-blue-100",
    },
    {
      label: "Accepted Value",
      value: (overview?.acceptedTotal ?? 0).toLocaleString("en-US", {
        minimumFractionDigits: 2,
      }),
      subtitle: "Awaiting conversion",
      icon: CheckCircle2,
      color: "text-emerald-600",
      iconBg: "bg-emerald-100",
    },
    {
      label: "Conversion Rate",
      value: `${overview?.conversionRate ?? 0}%`,
      subtitle: "Estimates → invoices",
      icon: TrendingUp,
      color: "text-purple-600",
      iconBg: "bg-purple-100",
    },
    {
      label: "Expiring Soon",
      value: (overview?.expiringSoon ?? 0).toString(),
      subtitle: "Within 7 days",
      icon: AlertTriangle,
      color: "text-amber-600",
      iconBg: "bg-amber-100",
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
            <div className={cn("rounded-lg p-2", card.iconBg)}>
              <card.icon className={cn("h-4 w-4", card.color)} />
            </div>
          </div>
          <p className="text-xl font-bold text-slate-900">{card.value}</p>
          <p className="text-xs text-slate-400 mt-1">{card.subtitle}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Overview Panel ────────────────────────────────────────────────────────
// Executive snapshot for the Overview tab: quote pipeline distribution and
// value/conversion stats. The filterable estimates table lives on the status
// tabs.

function EstimatesOverview({
  overview,
}: {
  overview: {
    totalEstimates: number;
    statusCounts: Record<string, number>;
    openTotal: number;
    acceptedTotal: number;
    conversionRate: number;
    expiringSoon: number;
  } | null;
}) {
  const pipeline = [
    { label: "Draft", key: "draft", color: "bg-slate-400" },
    { label: "Sent", key: "sent", color: "bg-blue-500" },
    { label: "Viewed", key: "viewed", color: "bg-indigo-500" },
    { label: "Accepted", key: "accepted", color: "bg-emerald-500" },
    { label: "Declined", key: "declined", color: "bg-red-500" },
    { label: "Converted", key: "converted", color: "bg-purple-500" },
  ];
  const total = overview?.totalEstimates ?? 0;

  const stats = [
    {
      label: "Open Value",
      value: `GMD ${(overview?.openTotal ?? 0).toLocaleString()}`,
      subtitle: "Draft + sent + viewed + accepted",
    },
    {
      label: "Accepted Value",
      value: `GMD ${(overview?.acceptedTotal ?? 0).toLocaleString()}`,
      subtitle: "Awaiting conversion",
    },
    {
      label: "Conversion Rate",
      value: `${overview?.conversionRate ?? 0}%`,
      subtitle: "Estimates → invoices",
    },
    {
      label: "Expiring Soon",
      value: `${overview?.expiringSoon ?? 0}`,
      subtitle: "Within 7 days",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Quote Pipeline */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="font-medium text-slate-900 mb-4">Quote Pipeline</h3>
        {total > 0 ? (
          <div className="space-y-3">
            {pipeline.map((stage) => {
              const count = overview?.statusCounts[stage.key] ?? 0;
              const percent = total > 0 ? (count / total) * 100 : 0;
              return (
                <div key={stage.key} className="flex items-center gap-3">
                  <div className="flex items-center gap-2 w-28">
                    <div className={cn("h-3 w-3 rounded", stage.color)} />
                    <span className="text-xs text-slate-600">
                      {stage.label}
                    </span>
                  </div>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full", stage.color)}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-slate-900 w-12 text-right">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-slate-500">No estimates yet.</p>
        )}
      </div>

      {/* Value & Conversion */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="font-medium text-slate-900 mb-4">
          Value &amp; Conversion
        </h3>
        <div className="grid grid-cols-2 gap-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg border border-slate-100 bg-slate-50/60 p-4"
            >
              <p className="text-xs text-slate-500">{stat.label}</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
                {stat.value}
              </p>
              <p className="mt-0.5 text-[10px] text-slate-400">
                {stat.subtitle}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Estimates Table ───────────────────────────────────────────────────────

function EstimatesTable({
  estimates,
  isLoading,
  onSelect,
  onConvert,
  onStatusChange,
  onDelete,
}: {
  estimates: Estimate[];
  isLoading: boolean;
  onSelect: (id: string) => void;
  onConvert: (e: Estimate) => void;
  onStatusChange: (
    e: Estimate,
    status:
      | "draft"
      | "sent"
      | "viewed"
      | "accepted"
      | "declined"
      | "expired"
      | "voided",
  ) => void;
  onDelete: (id: string) => void;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <RefreshCw className="h-8 w-8 text-slate-400 animate-spin" />
      </div>
    );
  }

  const statusStyles: Record<string, string> = {
    draft: "bg-slate-100 text-slate-600",
    sent: "bg-blue-100 text-blue-700",
    viewed: "bg-indigo-100 text-indigo-700",
    accepted: "bg-emerald-100 text-emerald-700",
    declined: "bg-red-100 text-red-700",
    expired: "bg-amber-100 text-amber-700",
    converted: "bg-purple-100 text-purple-700",
    voided: "bg-slate-100 text-slate-400",
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Estimate #
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Customer
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Date
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Expiry
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Status
            </th>
            <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">
              Amount
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {estimates.length === 0 && (
            <tr>
              <td colSpan={7} className="py-14 text-center">
                <div className="flex flex-col items-center gap-2">
                  <FileText className="h-8 w-8 text-slate-300" />
                  <p className="text-sm text-slate-400">
                    No estimates yet. Create your first quote — or ask the AI
                    command center to draft one for a customer.
                  </p>
                </div>
              </td>
            </tr>
          )}
          {estimates.map((e) => (
            <tr
              key={e.id}
              onClick={() => onSelect(e.id)}
              className="border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-slate-400" />
                  <span className="text-sm font-medium text-slate-900">
                    {e.estimateNumber}
                  </span>
                  {e.convertedInvoiceId && (
                    <CheckCircle2 className="h-4 w-4 text-purple-500" />
                  )}
                </div>
              </td>
              <td className="py-3 px-4">
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {e.customerName}
                  </p>
                  {e.customerEmail && (
                    <p className="text-xs text-slate-400">{e.customerEmail}</p>
                  )}
                </div>
              </td>
              <td className="py-3 px-4 text-sm text-slate-600">
                {e.estimateDate}
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-600">
                    {e.expiryDate ?? "—"}
                  </span>
                  {e.daysLeft !== null && !e.expired && (
                    <span className="text-[10px] text-amber-600">
                      {e.daysLeft}d
                    </span>
                  )}
                  {e.expired && (
                    <span className="text-[10px] text-red-500">expired</span>
                  )}
                </div>
              </td>
              <td className="py-3 px-4">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium capitalize",
                    statusStyles[e.status] ?? statusStyles.draft,
                  )}
                >
                  {e.status}
                </span>
              </td>
              <td className="py-3 px-4 text-right">
                <span className="text-sm font-semibold text-slate-900">
                  {e.currency}{" "}
                  {e.amount.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </td>
              <td className="py-3 px-4" onClick={(ev) => ev.stopPropagation()}>
                <div className="flex items-center gap-1">
                  {e.status === "accepted" && (
                    <button
                      onClick={() => onConvert(e)}
                      title="Convert to invoice"
                      className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-700"
                    >
                      <FileCheck2 className="h-3 w-3" /> Convert
                    </button>
                  )}
                  {(e.status === "draft" || e.status === "viewed") && (
                    <button
                      onClick={() => onStatusChange(e, "sent")}
                      title="Mark as sent"
                      className="p-1.5 hover:bg-blue-50 rounded"
                    >
                      <Send className="h-4 w-4 text-blue-500" />
                    </button>
                  )}
                  {e.status !== "declined" &&
                    e.status !== "voided" &&
                    e.status !== "converted" && (
                      <button
                        onClick={() => onStatusChange(e, "declined")}
                        title="Mark as declined"
                        className="p-1.5 hover:bg-red-50 rounded"
                      >
                        <Ban className="h-4 w-4 text-red-400" />
                      </button>
                    )}
                  <RowActionsMenu
                    items={[
                      {
                        label: "View details",
                        icon: <Eye className="h-3.5 w-3.5" />,
                        onSelect: () => onSelect(e.id),
                      },
                      {
                        label: "Mark as sent",
                        icon: <Send className="h-3.5 w-3.5" />,
                        disabled:
                          e.status === "sent" ||
                          e.status === "accepted" ||
                          e.status === "converted" ||
                          e.status === "voided",
                        onSelect: () => onStatusChange(e, "sent"),
                      },
                      {
                        label: "Mark as declined",
                        icon: <Ban className="h-3.5 w-3.5" />,
                        destructive: true,
                        disabled:
                          e.status === "declined" ||
                          e.status === "voided" ||
                          e.status === "converted",
                        onSelect: () => onStatusChange(e, "declined"),
                      },
                      {
                        label: "Delete",
                        icon: <Trash2 className="h-3.5 w-3.5" />,
                        destructive: true,
                        onSelect: () => onDelete(e.id),
                      },
                    ]}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Create Estimate Modal ─────────────────────────────────────────────────

function CreateEstimateModal({
  onClose,
  onCreated,
  initialDraft,
}: {
  onClose: () => void;
  onCreated: () => void;
  initialDraft?: AiDraftPayload;
}) {
  const { data: customers } = trpc.invoicing.getCustomers.useQuery();
  const { data: accounts } = trpc.chartOfAccounts.getOverview.useQuery();

  // Flatten account tree into a selectable list
  type AccountNode = {
    id: string;
    name: string;
    code: string | null;
    children?: AccountNode[];
  };
  const accountList = useMemo(() => {
    const flat: Array<{ id: string; name: string; code: string | null }> = [];
    const walk = (nodes: AccountNode[]) => {
      for (const node of nodes) {
        flat.push({ id: node.id, name: node.name, code: node.code ?? null });
        if (node.children) walk(node.children);
      }
    };
    walk((accounts?.accountTree ?? []) as AccountNode[]);
    return flat;
  }, [accounts]);
  const createEstimate = trpc.estimates.createEstimate.useMutation({
    onSuccess: () => {
      onCreated();
      onClose();
    },
  });

  const [customerId, setCustomerId] = useState(initialDraft?.customerId ?? "");
  const [estimateNumber, setEstimateNumber] = useState(
    `EST-${Date.now().toString().slice(-6)}`,
  );
  const [estimateDate, setEstimateDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [expiryDate, setExpiryDate] = useState(() => {
    const d = new Date();
    if (initialDraft?.expiryDays) {
      d.setDate(d.getDate() + initialDraft.expiryDays);
    } else {
      d.setDate(d.getDate() + 30);
    }
    return d.toISOString().slice(0, 10);
  });
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState(initialDraft?.terms ?? "");
  const [lines, setLines] = useState(
    initialDraft && initialDraft.lines.length > 0
      ? initialDraft.lines.map((l) => ({
          description: l.description,
          accountId: "",
          quantity: l.quantity,
          unitPrice: l.unitPrice,
        }))
      : [{ description: "", accountId: "", quantity: 1, unitPrice: "0" }],
  );

  const total = lines.reduce(
    (sum, l) => sum + l.quantity * parseFloat(l.unitPrice || "0"),
    0,
  );

  const canSubmit =
    customerId &&
    estimateNumber &&
    lines.length > 0 &&
    lines.every(
      (l) => l.description && l.accountId && parseFloat(l.unitPrice) >= 0,
    );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-3xl rounded-xl bg-white shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-200 p-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-indigo-100 flex items-center justify-center">
              <FileText className="h-4 w-4 text-indigo-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              New Estimate / Quote
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg"
          >
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-600">
                Customer *
              </label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select customer...</option>
                {(customers ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">
                Estimate # *
              </label>
              <input
                type="text"
                value={estimateNumber}
                onChange={(e) => setEstimateNumber(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">
                Estimate Date
              </label>
              <input
                type="date"
                value={estimateDate}
                onChange={(e) => setEstimateDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">
                Expiry Date
              </label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Line items */}
          <div>
            <label className="text-xs font-medium text-slate-600">
              Line Items *
            </label>
            <div className="mt-1 rounded-lg border border-slate-200">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left py-2 px-3 text-xs font-medium text-slate-500">
                      Description
                    </th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-slate-500">
                      Account
                    </th>
                    <th className="text-right py-2 px-3 text-xs font-medium text-slate-500 w-20">
                      Qty
                    </th>
                    <th className="text-right py-2 px-3 text-xs font-medium text-slate-500 w-28">
                      Unit Price
                    </th>
                    <th className="text-right py-2 px-3 text-xs font-medium text-slate-500 w-28">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, i) => (
                    <tr key={i} className="border-b border-slate-100">
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          placeholder="Service or product"
                          value={line.description}
                          onChange={(e) =>
                            setLines((ls) =>
                              ls.map((l, j) =>
                                j === i
                                  ? { ...l, description: e.target.value }
                                  : l,
                              ),
                            )
                          }
                          className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <select
                          value={line.accountId}
                          onChange={(e) =>
                            setLines((ls) =>
                              ls.map((l, j) =>
                                j === i
                                  ? { ...l, accountId: e.target.value }
                                  : l,
                              ),
                            )
                          }
                          className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="">Select account...</option>
                          {accountList.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.code ? `${a.code} — ` : ""}
                              {a.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          min={1}
                          value={line.quantity}
                          onChange={(e) =>
                            setLines((ls) =>
                              ls.map((l, j) =>
                                j === i
                                  ? { ...l, quantity: Number(e.target.value) }
                                  : l,
                              ),
                            )
                          }
                          className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={line.unitPrice}
                          onChange={(e) =>
                            setLines((ls) =>
                              ls.map((l, j) =>
                                j === i
                                  ? { ...l, unitPrice: e.target.value }
                                  : l,
                              ),
                            )
                          }
                          className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="py-2 px-3 text-right text-sm font-medium text-slate-900">
                        {(
                          line.quantity * parseFloat(line.unitPrice || "0")
                        ).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3} className="py-2 px-3">
                      <button
                        onClick={() =>
                          setLines((ls) => [
                            ...ls,
                            {
                              description: "",
                              accountId: "",
                              quantity: 1,
                              unitPrice: "0",
                            },
                          ])
                        }
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                      >
                        + Add line
                      </button>
                    </td>
                    <td className="py-2 px-3 text-right text-xs font-medium text-slate-500">
                      Total
                    </td>
                    <td className="py-2 px-3 text-right text-sm font-bold text-slate-900">
                      {total.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-600">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Internal notes"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">
                Terms
              </label>
              <textarea
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Payment terms shown to customer (e.g. Net 30)"
              />
            </div>
          </div>

          {createEstimate.isError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {createEstimate.error.message}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 p-4">
          <p className="text-xs text-slate-400">
            {initialDraft ? (
              <span className="inline-flex items-center gap-1 text-purple-600">
                <Sparkles className="h-3 w-3" /> Pre-filled by the CFO agent —
                review before creating
              </span>
            ) : (
              "Manual entry — or use Ask AI to draft from the estimates page."
            )}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={() =>
                createEstimate.mutate({
                  customerId,
                  estimateNumber,
                  estimateDate,
                  expiryDate,
                  notes: notes || undefined,
                  terms: terms || undefined,
                  lines: lines.map((l) => ({
                    description: l.description,
                    accountId: l.accountId,
                    quantity: l.quantity,
                    unitPrice: l.unitPrice,
                  })),
                })
              }
              disabled={!canSubmit || createEstimate.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {createEstimate.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Create Estimate
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── AI Draft Modal ────────────────────────────────────────────────────────
//
// User types a request ("5 days consulting at $500/day for Acme"), the CFO
// agent parses it into a structured draft (LLM extraction with deterministic
// fallback), and the user reviews + edits before creating the estimate.

function AiDraftModal({
  onClose,
  onApplyDraft,
}: {
  onClose: () => void;
  onApplyDraft: (draft: {
    customerId: string | null;
    lines: Array<{ description: string; quantity: number; unitPrice: string }>;
    terms: string | null;
    expiryDays: number | null;
    currency: string;
    source: "llm" | "deterministic";
    confidence: number;
  }) => void;
}) {
  const [prompt, setPrompt] = useState(
    "5 days of consulting at $500 per day for the customer, net 30, valid 30 days",
  );
  const [draft, setDraft] = useState<
    (typeof onApplyDraft extends (d: infer T) => void ? T : never) | null
  >(null);
  const aiDraft = trpc.estimates.aiDraftEstimate.useQuery(
    { prompt },
    { enabled: false, retry: false },
  );

  const runDraft = async () => {
    if (prompt.trim().length < 3) return;
    const res = await aiDraft.refetch();
    if (res.data) setDraft(res.data);
  };

  const examples = [
    "3 days of training at $400 per day for Acme, net 30",
    "10 hours of support at $100 per hour, valid 14 days",
    "Monthly retainer at $2,500 per month, net 15",
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-200 p-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Ask AI to Draft a Quote
              </h2>
              <p className="text-xs text-slate-500">
                Describe what to quote — the CFO agent drafts it for you.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg"
          >
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Prompt input */}
          <div>
            <label className="text-xs font-medium text-slate-600">
              Describe the quote
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              placeholder="e.g. 5 days of consulting at $500 per day for Acme, net 30"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {examples.map((ex) => (
                <button
                  key={ex}
                  onClick={() => setPrompt(ex)}
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={runDraft}
            disabled={prompt.trim().length < 3 || aiDraft.isFetching}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white hover:from-purple-700 hover:to-indigo-700 disabled:opacity-60 w-full justify-center"
          >
            {aiDraft.isFetching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Bot className="h-4 w-4" />
            )}
            {aiDraft.isFetching ? "CFO agent drafting..." : "Draft with AI"}
          </button>

          {aiDraft.isError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {aiDraft.error.message}
            </div>
          )}

          {/* Draft preview */}
          {draft && (
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-indigo-600" />
                  <h3 className="font-medium text-slate-900">Draft ready</h3>
                </div>
                <div className="flex items-center gap-2">
                  {draft.source === "llm" ? (
                    <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-medium text-purple-700">
                      AI parsed
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                      Auto-parsed
                    </span>
                  )}
                  <span className="text-[10px] text-slate-500">
                    {(draft.confidence * 100).toFixed(0)}% confidence
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-lg bg-white border border-slate-200 px-3 py-2">
                <User className="h-4 w-4 text-slate-400" />
                <span className="text-sm text-slate-700">
                  {draft.customerId
                    ? "Customer matched from your contacts"
                    : "No customer matched — pick one when saving"}
                </span>
              </div>

              <div className="rounded-lg bg-white border border-slate-200 divide-y divide-slate-100">
                {draft.lines.map((line, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {line.description}
                      </p>
                      <p className="text-xs text-slate-400">
                        {line.quantity} × {draft.currency}{" "}
                        {Number(line.unitPrice).toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-slate-900">
                      {draft.currency}{" "}
                      {(line.quantity * Number(line.unitPrice)).toLocaleString(
                        "en-US",
                        { minimumFractionDigits: 2 },
                      )}
                    </span>
                  </div>
                ))}
              </div>

              {(draft.terms || draft.expiryDays) && (
                <div className="flex gap-4 text-xs text-slate-600">
                  {draft.terms && (
                    <span>
                      Terms:{" "}
                      <span className="font-medium text-slate-800">
                        {draft.terms}
                      </span>
                    </span>
                  )}
                  {draft.expiryDays && (
                    <span>
                      Valid for{" "}
                      <span className="font-medium text-slate-800">
                        {draft.expiryDays} days
                      </span>
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 p-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={() => draft && onApplyDraft(draft)}
            disabled={!draft}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40"
          >
            <ArrowRight className="h-4 w-4" />
            Review &amp; Create Estimate
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Convert Modal ─────────────────────────────────────────────────────────

function ConvertModal({
  estimate,
  onClose,
  onConverted,
}: {
  estimate: Estimate;
  onClose: () => void;
  onConverted: () => void;
}) {
  const convert = trpc.estimates.convertToInvoice.useMutation({
    onSuccess: () => {
      onConverted();
      onClose();
    },
  });
  const [invoiceNumber, setInvoiceNumber] = useState(
    `INV-${Date.now().toString().slice(-6)}`,
  );
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 p-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center">
              <FileCheck2 className="h-4 w-4 text-emerald-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              Convert to Invoice
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg"
          >
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="rounded-lg bg-slate-50 p-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">
                {estimate.estimateNumber} · {estimate.customerName}
              </span>
              <span className="font-semibold text-slate-900">
                {estimate.currency}{" "}
                {estimate.amount.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">
              Invoice Number *
            </label>
            <input
              type="text"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">
              Due Date *
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          {convert.isError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {convert.error.message}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 p-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={() =>
              convert.mutate({
                estimateId: estimate.id,
                invoiceNumber,
                dueDate,
              })
            }
            disabled={!invoiceNumber || convert.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {convert.isPending ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowRight className="h-4 w-4" />
            )}
            Convert &amp; Create Invoice
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Detail Drawer ─────────────────────────────────────────────────────────

type EstimateDetail = {
  id: string;
  estimateNumber: string;
  estimateDate: string;
  expiryDate: string | null;
  status: string;
  totalAmount: string;
  currency: string;
  notes: string | null;
  terms: string | null;
  amount: number;
  customer: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  } | null;
  lines: Array<{
    id: string;
    accountId: string;
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }>;
};

function DetailDrawer({
  estimate,
  onClose,
}: {
  estimate: EstimateDetail;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/30">
      <div className="w-full max-w-md h-full bg-white shadow-xl overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-200 p-4 sticky top-0 bg-white">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-indigo-100 flex items-center justify-center">
              <Eye className="h-4 w-4 text-indigo-600" />
            </div>
            <h2 className="font-bold text-slate-900">
              {estimate.estimateNumber}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg"
          >
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-900">
                {estimate.customer?.name ?? "Customer"}
              </p>
              {estimate.customer?.email && (
                <p className="text-xs text-slate-400">
                  {estimate.customer.email}
                </p>
              )}
            </div>
            <span className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-1 text-xs font-medium capitalize text-indigo-700">
              {estimate.status}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3 text-sm">
            <div>
              <p className="text-xs text-slate-500">Estimate Date</p>
              <p className="font-medium text-slate-900">
                {estimate.estimateDate}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Expiry</p>
              <p className="font-medium text-slate-900">
                {estimate.expiryDate ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Total</p>
              <p className="font-semibold text-slate-900">
                {estimate.currency}{" "}
                {estimate.amount.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                })}
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-slate-900 mb-2">
              Line Items
            </h3>
            <div className="space-y-2">
              {estimate.lines.map((l) => (
                <div
                  key={l.id}
                  className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {l.description}
                    </p>
                    <p className="text-xs text-slate-400">
                      {l.quantity} × {l.unitPrice.toFixed(2)}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-slate-900">
                    {l.amount.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {estimate.notes && (
            <div>
              <h3 className="text-sm font-medium text-slate-900 mb-1">Notes</h3>
              <p className="text-sm text-slate-600">{estimate.notes}</p>
            </div>
          )}
          {estimate.terms && (
            <div>
              <h3 className="text-sm font-medium text-slate-900 mb-1">Terms</h3>
              <p className="text-sm text-slate-600">{estimate.terms}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────

type AiDraftPayload = {
  customerId: string | null;
  lines: Array<{ description: string; quantity: number; unitPrice: string }>;
  terms: string | null;
  expiryDays: number | null;
  currency: string;
  source: "llm" | "deterministic";
  confidence: number;
};

export default function EstimatesPage() {
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [showCreate, setShowCreate] = useState(false);
  const [showAiDraft, setShowAiDraft] = useState(false);
  const [aiDraftPrefill, setAiDraftPrefill] = useState<AiDraftPayload | null>(
    null,
  );
  const [showConvert, setShowConvert] = useState<Estimate | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const overview = trpc.estimates.getOverview.useQuery();
  const [pageSize, setPageSize] = useState(20);
  const list = trpc.estimates.listEstimates.useQuery({
    status: activeTab === "overview" ? "all" : activeTab,
    limit: pageSize,
    offset: 0,
  });
  const detail = trpc.estimates.getEstimateById.useQuery(
    { id: selectedId ?? "" },
    { enabled: !!selectedId },
  );
  const statusMutation = trpc.estimates.updateEstimateStatus.useMutation({
    onSuccess: () => {
      list.refetch();
      overview.refetch();
    },
  });
  const deleteMutation = trpc.estimates.deleteEstimate.useMutation({
    onSuccess: () => {
      list.refetch();
      overview.refetch();
    },
  });

  const refresh = () => {
    list.refetch();
    overview.refetch();
  };

  const tabs = [
    { key: "overview" as TabType, label: "Overview" },
    { key: "all" as TabType, label: "All" },
    { key: "draft" as TabType, label: "Draft" },
    { key: "sent" as TabType, label: "Sent" },
    { key: "viewed" as TabType, label: "Viewed" },
    { key: "accepted" as TabType, label: "Accepted" },
    { key: "declined" as TabType, label: "Declined" },
    { key: "converted" as TabType, label: "Converted" },
  ];

  return (
    <div className="min-h-full bg-slate-50">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Estimates &amp; Quotes
              </h1>
              <p className="text-sm text-slate-500">
                Create, send, and convert quotes into invoices — with AI-driven
                tracking of acceptance and expiry.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <AiSimulationTrigger
              traceId="estimate-conversion"
              label="AI Convert"
              variant="outline"
            />
            <AiSimulationTrigger
              traceId="estimate-margin-review"
              label="AI Review Margins"
              variant="outline"
            />
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" /> New Estimate
            </button>
            <button
              onClick={() => setShowAiDraft(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-purple-200 hover:text-purple-700 transition-colors"
            >
              <Sparkles className="h-4 w-4 text-purple-500" /> Ask AI to draft
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-slate-200 -mb-px overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                activeTab === tab.key
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-700",
              )}
            >
              {tab.label}
              {overview.data?.statusCounts &&
                tab.key !== "all" &&
                tab.key !== "overview" &&
                (overview.data.statusCounts[tab.key] ?? 0) > 0 && (
                  <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
                    {overview.data.statusCounts[tab.key] ?? 0}
                  </span>
                )}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="p-4">
        <SummaryCards overview={overview.data ?? null} />
      </div>

      {/* Search + table */}
      <div className="px-4 pb-4 space-y-4">
        {activeTab === "overview" ? (
          <EstimatesOverview overview={overview.data ?? null} />
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center gap-4 border-b border-slate-200 p-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search estimates..."
                  className="w-full rounded-lg border border-slate-200 pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <button className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                All customers <ChevronDown className="h-4 w-4" />
              </button>
            </div>
            <EstimatesTable
              estimates={list.data?.estimates ?? []}
              isLoading={list.isLoading}
              onSelect={(id) => setSelectedId(id)}
              onConvert={(e) => setShowConvert(e)}
              onStatusChange={(e, status) =>
                statusMutation.mutate({ id: e.id, status })
              }
              onDelete={(id) => deleteMutation.mutate({ id })}
            />
            <div className="flex items-center justify-between border-t border-slate-200 p-3">
              <p className="text-sm text-slate-500">
                Showing {list.data?.estimates.length ?? 0} of{" "}
                {list.data?.totalCount ?? 0} estimates
              </p>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700"
              >
                <option value={20}>20 / page</option>
                <option value={50}>50 / page</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {showAiDraft && (
        <AiDraftModal
          onClose={() => setShowAiDraft(false)}
          onApplyDraft={(draft) => {
            setAiDraftPrefill(draft);
            setShowAiDraft(false);
            setShowCreate(true);
          }}
        />
      )}
      {showCreate && (
        <CreateEstimateModal
          initialDraft={aiDraftPrefill ?? undefined}
          onClose={() => {
            setShowCreate(false);
            setAiDraftPrefill(null);
          }}
          onCreated={() => {
            refresh();
            setAiDraftPrefill(null);
          }}
        />
      )}
      {showConvert && (
        <ConvertModal
          estimate={showConvert}
          onClose={() => setShowConvert(null)}
          onConverted={refresh}
        />
      )}
      {selectedId && detail.data && (
        <DetailDrawer
          estimate={detail.data}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
