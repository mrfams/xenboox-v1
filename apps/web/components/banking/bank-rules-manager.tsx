"use client";

import { useState } from "react";
import {
  Zap,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Sparkles,
  ChevronDown,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";

type Rule = {
  id: string;
  name: string;
  matchType: string;
  matchValue: string;
  category: string;
  glAccountId: string | null;
  isActive: boolean;
  priority: number;
};

const MATCH_TYPES = [
  { value: "contains", label: "Contains" },
  { value: "starts_with", label: "Starts with" },
  { value: "exact", label: "Exact match" },
  { value: "regex", label: "Regex" },
];

const CATEGORIES = [
  "Office Supplies",
  "Travel & Transport",
  "Meals & Entertainment",
  "Software & Subscriptions",
  "Professional Services",
  "Utilities",
  "Revenue",
  "Payroll",
  "Bank Fees",
  "Marketing",
  "Rent & Lease",
  "Insurance",
  "Taxes",
  "Cost of Goods Sold",
];

export function BankRulesManager({ entityId }: { entityId: string }) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);

  const {
    data: rules,
    isLoading,
    refetch,
  } = trpc.banking.listRules.useQuery(undefined, { enabled: !!entityId });

  const createMutation = trpc.banking.createRule.useMutation({
    onSuccess: () => {
      setShowCreateForm(false);
      refetch();
    },
  });

  const updateMutation = trpc.banking.updateRule.useMutation({
    onSuccess: () => {
      setEditingRule(null);
      refetch();
    },
  });

  const deleteMutation = trpc.banking.deleteRule.useMutation({
    onSuccess: () => refetch(),
  });

  const handleCreate = (data: {
    name: string;
    matchType: string;
    matchValue: string;
    category: string;
  }) => {
    createMutation.mutate(data);
  };

  const handleUpdate = (data: {
    id: string;
    name: string;
    matchType: string;
    matchValue: string;
    category: string;
    isActive: boolean;
  }) => {
    updateMutation.mutate(data);
  };

  const handleDelete = (id: string) => {
    if (confirm("Delete this rule?")) {
      deleteMutation.mutate({ id });
    }
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">
            {rules?.length ?? 0} rules · AI learns from your categorizations
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/15 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Rule
        </button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <RuleForm
          onSubmit={handleCreate}
          onCancel={() => setShowCreateForm(false)}
          isLoading={createMutation.isPending}
        />
      )}

      {/* Rules List */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-lg bg-muted/30"
            />
          ))}
        </div>
      ) : rules?.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/50 py-12 text-center">
          <Zap className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground mb-1">
            No categorization rules
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            Rules help the AI categorize transactions faster. Create rules for
            recurring vendors like &quot;Stripe&quot; → &quot;Bank Fees&quot;.
          </p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-4 py-2 text-xs font-medium text-primary hover:bg-primary/15 transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Create First Rule
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
          <div className="divide-y divide-border/30">
            {rules?.map((rule) => (
              <RuleRow
                key={rule.id}
                rule={rule}
                isEditing={editingRule?.id === rule.id}
                onEdit={() => setEditingRule(rule)}
                onCancelEdit={() => setEditingRule(null)}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </div>
      )}

      {/* AI Learning Note */}
      <div className="rounded-lg bg-primary/[0.03] p-3 flex items-start gap-2">
        <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="text-xs text-foreground/80">
            <strong>AI Learning:</strong> When you override a category on a
            transaction, the AI remembers. After 3 overrides for the same
            vendor, it automatically creates a rule.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Rule Row ──────────────────────────────────────────────────────────────

function RuleRow({
  rule,
  isEditing,
  onEdit,
  onCancelEdit,
  onUpdate,
  onDelete,
}: {
  rule: Rule;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onUpdate: (data: {
    id: string;
    name: string;
    matchType: string;
    matchValue: string;
    category: string;
    isActive: boolean;
  }) => void;
  onDelete: (id: string) => void;
}) {
  if (isEditing) {
    return (
      <div className="p-3 bg-accent/30">
        <RuleForm
          initial={rule}
          onSubmit={(data) =>
            onUpdate({
              id: rule.id,
              ...data,
              isActive: rule.isActive,
            })
          }
          onCancel={onCancelEdit}
          isLoading={false}
        />
      </div>
    );
  }

  const matchTypeLabel =
    MATCH_TYPES.find((m) => m.value === rule.matchType)?.label ??
    rule.matchType;

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 hover:bg-accent/30 transition-colors">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Zap className="h-4 w-4 text-primary" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground">{rule.name}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          When description{" "}
          <span className="font-medium">{matchTypeLabel.toLowerCase()}</span>{" "}
          <span className="font-mono text-foreground/70">
            &quot;{rule.matchValue}&quot;
          </span>{" "}
          → <span className="font-medium">{rule.category}</span>
        </p>
      </div>

      <div
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
          rule.isActive
            ? "bg-emerald-500/10 text-emerald-600"
            : "bg-muted/50 text-muted-foreground",
        )}
      >
        {rule.isActive ? "Active" : "Inactive"}
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={onEdit}
          className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <Edit2 className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => onDelete(rule.id)}
          className="rounded-lg p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/5 transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Rule Form ─────────────────────────────────────────────────────────────

function RuleForm({
  initial,
  onSubmit,
  onCancel,
  isLoading,
}: {
  initial?: Rule;
  onSubmit: (data: {
    name: string;
    matchType: string;
    matchValue: string;
    category: string;
  }) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [matchType, setMatchType] = useState(initial?.matchType ?? "contains");
  const [matchValue, setMatchValue] = useState(initial?.matchValue ?? "");
  const [category, setCategory] = useState(initial?.category ?? CATEGORIES[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !matchValue.trim()) return;
    onSubmit({
      name: name.trim(),
      matchType,
      matchValue: matchValue.trim(),
      category,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-border/50 bg-background p-3 space-y-3"
    >
      <div className="grid grid-cols-2 gap-3">
        {/* Name */}
        <div>
          <label className="block text-[10px] font-medium text-muted-foreground mb-1">
            Rule Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Stripe fees"
            className="w-full rounded-lg border border-border/50 bg-card px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
          />
        </div>

        {/* Match Type */}
        <div>
          <label className="block text-[10px] font-medium text-muted-foreground mb-1">
            Match Type
          </label>
          <select
            value={matchType}
            onChange={(e) => setMatchType(e.target.value)}
            className="w-full rounded-lg border border-border/50 bg-card px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
          >
            {MATCH_TYPES.map((mt) => (
              <option key={mt.value} value={mt.value}>
                {mt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Match Value */}
        <div>
          <label className="block text-[10px] font-medium text-muted-foreground mb-1">
            Match Value
          </label>
          <input
            type="text"
            value={matchValue}
            onChange={(e) => setMatchValue(e.target.value)}
            placeholder="e.g. STRIPE"
            className="w-full rounded-lg border border-border/50 bg-card px-2.5 py-1.5 text-xs font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-[10px] font-medium text-muted-foreground mb-1">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-lg border border-border/50 bg-card px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Preview */}
      <div className="rounded-lg bg-muted/30 p-2">
        <p className="text-[10px] text-muted-foreground">
          <strong>Preview:</strong> When a transaction description{" "}
          <span className="font-medium">
            {matchType === "contains"
              ? "contains"
              : matchType === "starts_with"
                ? "starts with"
                : "matches"}
          </span>{" "}
          <span className="font-mono text-foreground/70">
            &quot;{matchValue || "..."}&quot;
          </span>
          , categorize as{" "}
          <span className="font-medium text-primary">{category}</span>
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-border/50 bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading || !name.trim() || !matchValue.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {isLoading && <Loader2 className="h-3 w-3 animate-spin" />}
          {initial ? "Update Rule" : "Create Rule"}
        </button>
      </div>
    </form>
  );
}
