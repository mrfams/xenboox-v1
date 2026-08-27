"use client";

import { useState, useCallback } from "react";
import {
  Zap,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  Loader2,
  X,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

import { trpc } from "@/lib/trpc/client";
import { useEntity } from "@/lib/entity-context";
import { cn, formatCurrency } from "@/lib/utils";

// ─── Auto-Approve Rules UI ─────────────────────────────────────────────────
//
// Smart approval automation. Shows rules learned from patterns,
// lets users create/toggle/delete rules, and displays audit log.

type RuleTab = "rules" | "log" | "stats";

export function AutoApproveRules() {
  const { entityId, entityCurrency } = useEntity();
  const [activeTab, setActiveTab] = useState<RuleTab>("rules");
  const [showCreateModal, setShowCreateModal] = useState(false);

  const {
    data: rules,
    isLoading,
    isError: rulesError,
    error: rulesErr,
    refetch: refetchRules,
  } = trpc.autoApprove.getRules.useQuery(undefined, { enabled: !!entityId });

  const { data: stats, isError: statsError } =
    trpc.autoApprove.getStats.useQuery(undefined, {
      enabled: !!entityId,
    });

  const {
    data: logData,
    isLoading: isLogLoading,
    isError: logError,
  } = trpc.autoApprove.getLog.useQuery(
    { limit: 50 },
    { enabled: !!entityId && activeTab === "log" },
  );

  const suggestRulesMutation = trpc.autoApprove.suggestRules.useMutation({
    onSuccess: () => refetchRules(),
  });

  const tabs: { key: RuleTab; label: string }[] = [
    { key: "rules", label: "Rules" },
    { key: "log", label: "Audit Log" },
    { key: "stats", label: "Stats" },
  ];

  return (
    <div className="space-y-4">
      {(rulesError || statsError || logError) && (
        <div className="rounded-lg border border-attention-amber/20 bg-attention-amber/5 p-3 text-xs text-attention-amber dark:text-attention-amber">
          <p className="font-medium">
            Some data failed to load — policies still enforced server-side.
          </p>
          {rulesErr?.message && (
            <p className="mt-1 text-muted-foreground">{rulesErr.message}</p>
          )}
        </div>
      )}
      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Active Rules"
          value={stats?.activeRules ?? 0}
          icon={Zap}
          color="text-primary"
        />
        <StatCard
          label="Auto-Approved"
          value={stats?.totalAutoApproved ?? 0}
          icon={CheckCircle2}
          color="text-balanced-green"
        />
        <StatCard
          label="Escalated"
          value={stats?.totalEscalated ?? 0}
          icon={AlertTriangle}
          color="text-attention-amber"
        />
        <StatCard
          label="Pending"
          value={stats?.pendingApprovals ?? 0}
          icon={Clock}
          color="text-primary"
        />
      </div>

      {/* Tab navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                activeTab === tab.key
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => suggestRulesMutation.mutate()}
            disabled={suggestRulesMutation.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
          >
            {suggestRulesMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            AI Suggest
          </button>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Rule
          </button>
        </div>
      </div>

      {/* Tab content */}
      {activeTab === "rules" && (
        <RulesList
          rules={
            (rules ?? []) as unknown as Parameters<typeof RulesList>[0]["rules"]
          }
          isLoading={isLoading}
          onRefresh={refetchRules}
          currency={entityCurrency ?? ""}
        />
      )}

      {activeTab === "log" && (
        <AuditLog
          logs={
            (logData?.logs ?? []) as unknown as Parameters<
              typeof AuditLog
            >[0]["logs"]
          }
          isLoading={isLogLoading}
          currency={entityCurrency ?? ""}
        />
      )}

      {activeTab === "stats" && (
        <StatsView stats={stats} currency={entityCurrency ?? ""} />
      )}

      {/* Create modal */}
      {showCreateModal && (
        <CreateRuleModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            refetchRules();
          }}
          currency={entityCurrency ?? ""}
        />
      )}
    </div>
  );
}

// ─── Stat Card ─────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={cn("h-3.5 w-3.5", color)} />
        <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className="text-lg font-semibold text-foreground tabular-nums">
        {value}
      </p>
    </div>
  );
}

// ─── Rules List ────────────────────────────────────────────────────────────

function RulesList({
  rules,
  isLoading,
  onRefresh,
  currency,
}: {
  rules: Array<{
    id: string;
    name: string;
    description: string | null;
    conditions: Record<string, unknown>;
    action: string;
    maxAmount: string | null;
    confidence: string | null;
    learnedFrom: number | null;
    triggerCount: number;
    isActive: boolean;
    createdBy: string | null;
  }>;
  isLoading: boolean;
  onRefresh: () => void;
  currency: string;
}) {
  const toggleMutation = trpc.autoApprove.toggleRule.useMutation({
    onSuccess: () => onRefresh(),
  });

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const deleteMutation = trpc.autoApprove.deleteRule.useMutation({
    onSuccess: () => {
      onRefresh();
      setDeleteConfirmId(null);
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-muted/30" />
        ))}
      </div>
    );
  }

  if (rules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/50 py-12 text-center">
        <Zap className="h-12 w-12 text-muted-foreground/30 mb-3" />
        <p className="text-sm font-medium text-foreground">
          No auto-approve rules
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Create rules or let AI suggest them from your approval history
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className={cn(
              "rounded-xl border bg-card p-4 transition-all",
              rule.isActive
                ? "border-border/50 hover:shadow-md"
                : "border-border/30 opacity-60",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl",
                    rule.isActive ? "bg-primary/10" : "bg-muted/30",
                  )}
                >
                  {rule.createdBy === "ai" ? (
                    <Sparkles className="h-5 w-5 text-primary" />
                  ) : (
                    <Zap className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {rule.name}
                  </p>
                  {rule.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {rule.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold",
                        rule.action === "auto_approve"
                          ? "bg-balanced-green/10 text-balanced-green"
                          : rule.action === "auto_approve_with_limit"
                            ? "bg-attention-amber/10 text-attention-amber"
                            : "bg-error-clay/10 text-error-clay",
                      )}
                    >
                      {rule.action === "auto_approve"
                        ? "Auto-Approve"
                        : rule.action === "auto_approve_with_limit"
                          ? "With Limit"
                          : "Escalate"}
                    </span>
                    {rule.maxAmount && (
                      <span className="text-[10px] text-muted-foreground">
                        Max:{" "}
                        {formatCurrency(parseFloat(rule.maxAmount), currency)}
                      </span>
                    )}
                    {rule.confidence && parseFloat(rule.confidence) > 0 && (
                      <span className="text-[10px] text-muted-foreground">
                        {Math.round(parseFloat(rule.confidence) * 100)}%
                        confidence
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleMutation.mutate({ ruleId: rule.id })}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  {rule.isActive ? (
                    <ToggleRight className="h-5 w-5 text-primary" />
                  ) : (
                    <ToggleLeft className="h-5 w-5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteConfirmId(rule.id)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-error-clay/10 hover:text-error-clay"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Trigger count */}
            <div className="mt-3 pt-3 border-t border-border/30 flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">
                Triggered {rule.triggerCount} time
                {rule.triggerCount !== 1 ? "s" : ""}
              </span>
              <span className="text-[10px] text-muted-foreground">
                Created by {rule.createdBy === "ai" ? "AI" : "User"}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteConfirmId && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/50"
            onClick={() => setDeleteConfirmId(null)}
          />
          <div className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm">
            <div className="rounded-xl border bg-card p-6 shadow-lg">
              <h3 className="text-sm font-semibold text-foreground mb-2">
                Delete Rule
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                Are you sure you want to delete this auto-approve rule? This
                action cannot be undone.
              </p>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmId(null)}
                  className="rounded-lg border border-border/50 bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() =>
                    deleteMutation.mutate({ ruleId: deleteConfirmId })
                  }
                  disabled={deleteMutation.isPending}
                  className="rounded-lg bg-error-clay px-3 py-1.5 text-xs font-medium text-white hover:bg-error-clay/90 disabled:opacity-50"
                >
                  {deleteMutation.isPending ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

// ─── Audit Log ─────────────────────────────────────────────────────────────

function AuditLog({
  logs,
  isLoading,
  currency,
}: {
  logs: Array<{
    id: string;
    ruleId: string | null;
    approvalType: string;
    targetRecordType: string;
    action: string;
    amount: string | null;
    confidence: string | null;
    approvedAt: Date | null;
  }>;
  isLoading: boolean;
  currency: string;
}) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-muted/30" />
        ))}
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/50 py-12 text-center">
        <Clock className="h-12 w-12 text-muted-foreground/30 mb-3" />
        <p className="text-sm font-medium text-foreground">
          No auto-approval history
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Auto-approvals will appear here as they happen
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {logs.map((log) => (
        <div
          key={log.id}
          className="flex items-center justify-between rounded-lg border border-border/50 bg-card p-3"
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg",
                log.action === "auto_approved"
                  ? "bg-balanced-green/10"
                  : "bg-attention-amber/10",
              )}
            >
              {log.action === "auto_approved" ? (
                <CheckCircle2 className="h-4 w-4 text-balanced-green" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-attention-amber" />
              )}
            </div>
            <div>
              <p className="text-xs font-medium text-foreground">
                {log.approvalType.replace(/_/g, " ")}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {log.targetRecordType} ·{" "}
                {log.approvedAt
                  ? new Date(log.approvedAt).toLocaleString()
                  : "—"}
              </p>
            </div>
          </div>
          <div className="text-right">
            {log.amount && (
              <p className="text-xs font-medium text-foreground tabular-nums">
                {formatCurrency(parseFloat(log.amount), currency)}
              </p>
            )}
            {log.confidence && (
              <p className="text-[10px] text-muted-foreground">
                {Math.round(parseFloat(log.confidence) * 100)}% confidence
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Stats View ────────────────────────────────────────────────────────────

function StatsView({
  stats,
  currency,
}: {
  stats?: {
    totalRules: number;
    activeRules: number;
    totalAutoApproved: number;
    totalEscalated: number;
    pendingApprovals: number;
  };
  currency: string;
}) {
  const timeSaved = (stats?.totalAutoApproved ?? 0) * 2; // Assume 2 min per approval
  const hours = Math.floor(timeSaved / 60);
  const minutes = timeSaved % 60;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/50 bg-card p-6">
        <h4 className="text-sm font-semibold text-foreground mb-4">
          Impact Summary
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-2xl font-bold text-foreground tabular-nums">
              {stats?.totalAutoApproved ?? 0}
            </p>
            <p className="text-xs text-muted-foreground">Approvals automated</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-primary tabular-nums">
              {hours}h {minutes}m
            </p>
            <p className="text-xs text-muted-foreground">Time saved</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-attention-amber tabular-nums">
              {stats?.totalEscalated ?? 0}
            </p>
            <p className="text-xs text-muted-foreground">Escalated to human</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-primary tabular-nums">
              {stats?.activeRules ?? 0}
            </p>
            <p className="text-xs text-muted-foreground">Active rules</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-semibold text-foreground">
            How it works
          </h4>
        </div>
        <ul className="space-y-2 text-xs text-muted-foreground">
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
            AI observes which approvals are always approved
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
            Creates rules with confidence thresholds
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
            Rules auto-approve matching transactions
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
            Every auto-approval is logged for audit trail
          </li>
        </ul>
      </div>
    </div>
  );
}

// ─── Create Rule Modal ─────────────────────────────────────────────────────

function CreateRuleModal({
  onClose,
  onSuccess,
  currency,
}: {
  onClose: () => void;
  onSuccess: () => void;
  currency: string;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [approvalType, setApprovalType] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [action, setAction] = useState<
    "auto_approve" | "auto_approve_with_limit" | "escalate"
  >("auto_approve");

  const createMutation = trpc.autoApprove.createRule.useMutation({
    onSuccess: () => onSuccess(),
  });

  const handleSubmit = () => {
    if (!name) return;

    createMutation.mutate({
      name,
      description: description || undefined,
      conditions: {
        approvalType: approvalType || undefined,
      },
      action,
      maxAmount: maxAmount ? parseFloat(maxAmount) : undefined,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/10 backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-xl border border-border/60 bg-card shadow-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground">
            Create Auto-Approve Rule
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">
              Rule Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Auto-approve small expenses"
              className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/10"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/10"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">
              Approval Type
            </label>
            <select
              value={approvalType}
              onChange={(e) => setApprovalType(e.target.value)}
              className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm text-foreground focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/10"
            >
              <option value="">All types</option>
              <option value="journal_entry">Journal Entry</option>
              <option value="expense_claim">Expense Claim</option>
              <option value="payroll_run">Payroll Run</option>
              <option value="month_end_close">Month-End Close</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">
              Action
            </label>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value as typeof action)}
              className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm text-foreground focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/10"
            >
              <option value="auto_approve">Auto-Approve</option>
              <option value="auto_approve_with_limit">
                Auto-Approve with Limit
              </option>
              <option value="escalate">Escalate (never auto-approve)</option>
            </select>
          </div>

          {action === "auto_approve_with_limit" && (
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">
                Max Amount ({currency})
              </label>
              <input
                type="number"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/10"
              />
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border/50 bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!name || createMutation.isPending}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90 disabled:opacity-50"
          >
            {createMutation.isPending ? "Creating..." : "Create Rule"}
          </button>
        </div>
      </div>
    </div>
  );
}
