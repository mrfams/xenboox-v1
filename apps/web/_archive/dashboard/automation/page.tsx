"use client";

import { useMemo, useState } from "react";
import {
  Zap,
  Clock,
  CheckCircle2,
  Plus,
  Pause,
  Play,
  Trash2,
  RefreshCw,
  Sparkles,
  CalendarClock,
  Receipt,
  FileText,
  BellRing,
} from "lucide-react";

import { AiSimulationTrigger } from "@/components/ai-ux/simulation-trigger";
import { Button } from "@/components/ui";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

type ActionType =
  | "recurring_transaction"
  | "invoice_reminder"
  | "bill_reminder"
  | "report_export";

const ACTION_META: Record<
  ActionType,
  {
    label: string;
    icon: typeof Zap;
    color: string;
    defaultConfig: Record<string, unknown>;
  }
> = {
  recurring_transaction: {
    label: "Recurring transaction",
    icon: RefreshCw,
    color: "bg-indigo-50 text-indigo-600",
    defaultConfig: { amount: "0.00" },
  },
  invoice_reminder: {
    label: "Invoice reminder",
    icon: BellRing,
    color: "bg-emerald-50 text-emerald-600",
    defaultConfig: { daysBeforeDue: 3, channel: "email" },
  },
  bill_reminder: {
    label: "Bill payment reminder",
    icon: Receipt,
    color: "bg-amber-50 text-amber-600",
    defaultConfig: { daysBeforeDue: 3, channel: "email" },
  },
  report_export: {
    label: "Scheduled report export",
    icon: FileText,
    color: "bg-blue-50 text-blue-600",
    defaultConfig: { reportType: "pnl" },
  },
};

const SCHEDULE_OPTIONS = [
  { value: "daily", label: "Every day" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
] as const;

export default function AutomationPage() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.automation.list.useQuery();
  const suggestionsQuery = trpc.automation.getSuggestions.useQuery();

  const createMutation = trpc.automation.create.useMutation({
    onSuccess: () => utils.automation.list.invalidate(),
  });
  const toggleMutation = trpc.automation.toggle.useMutation({
    onSuccess: () => utils.automation.list.invalidate(),
  });
  const runMutation = trpc.automation.runNow.useMutation({
    onSuccess: () => utils.automation.list.invalidate(),
  });
  const deleteMutation = trpc.automation.delete.useMutation({
    onSuccess: () => utils.automation.list.invalidate(),
  });

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<{
    name: string;
    actionType: ActionType;
    scheduleKind: "daily" | "weekly" | "monthly";
    scheduleDay: string;
    amount: string;
  }>({
    name: "",
    actionType: "recurring_transaction",
    scheduleKind: "monthly",
    scheduleDay: "1",
    amount: "0.00",
  });

  const rules = data?.rules ?? [];
  const counts = data?.counts ?? { active: 0, totalRuns: 0, totalRules: 0 };

  const grouped = useMemo(() => {
    const byAction = new Map<ActionType, typeof rules>();
    for (const rule of rules) {
      const list = byAction.get(rule.actionType as ActionType) ?? [];
      list.push(rule);
      byAction.set(rule.actionType as ActionType, list);
    }
    return byAction;
  }, [rules]);

  const handleCreate = () => {
    if (!form.name.trim()) return;
    const day = Number(form.scheduleDay);
    createMutation.mutate({
      name: form.name.trim(),
      actionType: form.actionType,
      triggerType: "schedule",
      scheduleKind: form.scheduleKind,
      scheduleDay: Number.isFinite(day) ? day : 1,
      scheduleLabel: `${SCHEDULE_OPTIONS.find((s) => s.value === form.scheduleKind)?.label ?? "Monthly"}${form.scheduleKind === "monthly" ? ` (day ${form.scheduleDay})` : ""}`,
      config: {
        ...ACTION_META[form.actionType].defaultConfig,
        ...(form.actionType === "recurring_transaction"
          ? { amount: form.amount }
          : {}),
      },
    });
    setShowCreate(false);
    setForm({
      name: "",
      actionType: "recurring_transaction",
      scheduleKind: "monthly",
      scheduleDay: "1",
      amount: "0.00",
    });
  };

  const addSuggestion = (s: {
    name: string;
    description?: string;
    actionType: ActionType;
    scheduleLabel?: string;
    scheduleKind: "daily" | "weekly" | "monthly";
    scheduleDay?: number;
    config: Record<string, unknown>;
  }) => {
    createMutation.mutate({
      name: s.name,
      description: s.description,
      actionType: s.actionType,
      triggerType: "schedule",
      scheduleKind: s.scheduleKind,
      scheduleDay: s.scheduleDay ?? 1,
      scheduleLabel: s.scheduleLabel,
      config: s.config,
    });
  };

  const formatRunTime = (iso: string | Date | null) => {
    if (!iso) return "Never";
    return new Date(iso).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900">
              <Zap className="h-5 w-5 text-amber-500" />
              Automation Studio
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Recurring transactions, scheduled reminders, and report exports
              that run without manual setup — entity-scoped and yours.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <AiSimulationTrigger
              traceId="automation-suggestion"
              label="AI Build Workflow"
              variant="outline"
            />
            <Button size="sm" onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4 mr-1" />
              New automation
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            {
              label: "Active rules",
              value: counts.active,
              icon: Play,
              color: "text-emerald-600",
            },
            {
              label: "Total rules",
              value: counts.totalRules,
              icon: Zap,
              color: "text-amber-600",
            },
            {
              label: "Runs executed",
              value: counts.totalRuns,
              icon: Clock,
              color: "text-blue-600",
            },
            {
              label: "Schedule type",
              value: "Cron-free",
              icon: CalendarClock,
              color: "text-indigo-600",
            },
          ].map((s) => (
            <div
              key={s.label}
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3"
            >
              <s.icon className={cn("h-4 w-4", s.color)} />
              <div>
                <p className="text-lg font-bold leading-5 text-slate-900">
                  {s.value}
                </p>
                <p className="text-[11px] text-slate-500">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-6xl space-y-6 p-6">
        {/* AI suggestions */}
        {suggestionsQuery.data &&
          suggestionsQuery.data.suggestions.length > 0 && (
            <section>
              <div className="mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-500" />
                <h2 className="text-sm font-semibold text-slate-900">
                  Suggested from your data
                </h2>
                <span className="text-xs text-slate-400">
                  — recurring vendor patterns detected
                </span>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {suggestionsQuery.data.suggestions.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-start justify-between gap-3 rounded-xl border border-indigo-200 bg-indigo-50/50 p-4"
                  >
                    <div>
                      <p className="text-[13px] font-semibold text-slate-900">
                        {s.name}
                      </p>
                      <p className="mt-1 text-[11px] leading-4 text-slate-500">
                        {s.description}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0"
                      onClick={() => addSuggestion(s)}
                      disabled={createMutation.isPending}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Add
                    </Button>
                  </div>
                ))}
              </div>
            </section>
          )}

        {/* Rules by action type */}
        {isLoading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-400">
            Loading automations…
          </div>
        ) : rules.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50">
              <Zap className="h-7 w-7 text-amber-500" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">
              No automations yet
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              Create your first rule — a recurring transaction, a reminder
              before bills come due, or a scheduled report export. Or accept an
              AI suggestion above.
            </p>
            <Button className="mt-6" onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4 mr-1" />
              New automation
            </Button>
          </div>
        ) : (
          (Object.keys(ACTION_META) as ActionType[]).map((actionType) => {
            const list = grouped.get(actionType) ?? [];
            if (list.length === 0) return null;
            const meta = ACTION_META[actionType];
            return (
              <section key={actionType}>
                <div className="mb-3 flex items-center gap-2">
                  <span
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-lg",
                      meta.color,
                    )}
                  >
                    <meta.icon className="h-3.5 w-3.5" />
                  </span>
                  <h2 className="text-sm font-semibold text-slate-900">
                    {meta.label}s
                  </h2>
                  <span className="text-xs text-slate-400">{list.length}</span>
                </div>
                <div className="space-y-3">
                  {list.map((rule) => {
                    const Icon =
                      ACTION_META[rule.actionType as ActionType]?.icon ?? Zap;
                    return (
                      <div
                        key={rule.id}
                        className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4"
                      >
                        <div className="flex min-w-0 items-start gap-3">
                          <div
                            className={cn(
                              "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                              ACTION_META[rule.actionType as ActionType]
                                ?.color ?? "bg-slate-50 text-slate-500",
                            )}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-[13px] font-semibold text-slate-900">
                                {rule.name}
                              </p>
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                                  rule.enabled
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-slate-100 text-slate-500",
                                )}
                              >
                                <span
                                  className={cn(
                                    "h-1.5 w-1.5 rounded-full",
                                    rule.enabled
                                      ? "bg-emerald-500"
                                      : "bg-slate-400",
                                  )}
                                />
                                {rule.enabled ? "Active" : "Paused"}
                              </span>
                            </div>
                            {rule.description && (
                              <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-500">
                                {rule.description}
                              </p>
                            )}
                            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
                              <span className="inline-flex items-center gap-1">
                                <CalendarClock className="h-3 w-3" />
                                {rule.scheduleLabel ?? "On demand"}
                              </span>
                              <span>Next: {formatRunTime(rule.nextRunAt)}</span>
                              <span>
                                Last run: {formatRunTime(rule.lastRunAt)}
                              </span>
                              {rule.lastRunSummary && (
                                <span className="inline-flex items-center gap-1 text-emerald-600">
                                  <CheckCircle2 className="h-3 w-3" />
                                  {rule.lastRunSummary}
                                </span>
                              )}
                              <span>{rule.runCount} runs</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => runMutation.mutate({ id: rule.id })}
                            disabled={runMutation.isPending}
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                            Run
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              toggleMutation.mutate({ id: rule.id })
                            }
                          >
                            {rule.enabled ? (
                              <Pause className="h-3.5 w-3.5" />
                            ) : (
                              <Play className="h-3.5 w-3.5" />
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:border-red-200 hover:bg-red-50"
                            onClick={() =>
                              deleteMutation.mutate({ id: rule.id })
                            }
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })
        )}
      </div>

      {/* Create dialog */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900">New automation</h3>
            <p className="mt-1 text-sm text-slate-500">
              Set up a rule that runs on its own schedule.
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Rule name
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Monthly rent payment"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Action
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(ACTION_META) as ActionType[]).map((t) => {
                    const meta = ACTION_META[t];
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setForm({ ...form, actionType: t })}
                        className={cn(
                          "flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs font-medium transition-colors",
                          form.actionType === t
                            ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                            : "border-slate-200 text-slate-600 hover:border-slate-300",
                        )}
                      >
                        <meta.icon className="h-3.5 w-3.5" />
                        {meta.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Schedule
                  </label>
                  <select
                    value={form.scheduleKind}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        scheduleKind: e.target
                          .value as typeof form.scheduleKind,
                      })
                    }
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
                  >
                    {SCHEDULE_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
                {form.scheduleKind === "monthly" && (
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                      Day of month
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={28}
                      value={form.scheduleDay}
                      onChange={(e) =>
                        setForm({ ...form, scheduleDay: e.target.value })
                      }
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
                    />
                  </div>
                )}
                {form.actionType === "recurring_transaction" && (
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                      Amount
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={form.amount}
                      onChange={(e) =>
                        setForm({ ...form, amount: e.target.value })
                      }
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={!form.name.trim()}>
                Create rule
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
