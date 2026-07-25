"use client";

import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc/client";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Badge,
  Input,
  Label,
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui";
import {
  Shield,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  DollarSign,
  Ban,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────────

interface PolicyRulesEditorProps {
  rules: Array<{
    id: string;
    category: string;
    role: string;
    limitAmount: string;
    requiresApprovalAbove: string | null;
    requiresReceiptAbove: string | null;
    maxPerMonth: string | null;
    isActive: boolean;
    description: string | null;
  }>;
  onRulesChanged: () => void;
}

const CATEGORY_OPTIONS = [
  { value: "travel", label: "Travel" },
  { value: "meals", label: "Meals" },
  { value: "office_supplies", label: "Office Supplies" },
  { value: "transportation", label: "Transportation" },
  { value: "accommodation", label: "Accommodation" },
  { value: "training", label: "Training & Development" },
  { value: "software", label: "Software & Subscriptions" },
  { value: "other", label: "Other" },
];

const ROLE_OPTIONS = [
  { value: "employee", label: "Employee" },
  { value: "manager", label: "Manager" },
  { value: "director", label: "Director" },
  { value: "executive", label: "Executive" },
];

// ─── Component ──────────────────────────────────────────────────────────────

export function PolicyRulesEditor({
  rules,
  onRulesChanged,
}: PolicyRulesEditorProps) {
  const createRule = trpc.expense.createPolicyRule.useMutation({
    onSuccess: () => {
      onRulesChanged();
      setDialogOpen(false);
      resetForm();
    },
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [newCategory, setNewCategory] = useState("travel");
  const [newRole, setNewRole] = useState("employee");
  const [newLimit, setNewLimit] = useState("");
  const [newApprovalAbove, setNewApprovalAbove] = useState("");
  const [newReceiptAbove, setNewReceiptAbove] = useState("");
  const [newMaxMonthly, setNewMaxMonthly] = useState("");
  const [newDescription, setNewDescription] = useState("");

  const resetForm = useCallback(() => {
    setNewCategory("travel");
    setNewRole("employee");
    setNewLimit("");
    setNewApprovalAbove("");
    setNewReceiptAbove("");
    setNewMaxMonthly("");
    setNewDescription("");
  }, []);

  const handleCreateRule = useCallback(() => {
    if (!newLimit) return;
    createRule.mutate({
      category: newCategory,
      role: newRole,
      limitAmount: Number(newLimit),
      requiresApprovalAbove: newApprovalAbove
        ? Number(newApprovalAbove)
        : undefined,
      requiresReceiptAbove: newReceiptAbove
        ? Number(newReceiptAbove)
        : undefined,
      maxPerMonth: newMaxMonthly ? Number(newMaxMonthly) : undefined,
      description: newDescription || undefined,
    });
  }, [
    newCategory,
    newRole,
    newLimit,
    newApprovalAbove,
    newReceiptAbove,
    newMaxMonthly,
    newDescription,
    createRule,
  ]);

  const rulesByCategory = CATEGORY_OPTIONS.map((cat) => ({
    ...cat,
    rules: rules.filter((r) => r.category === cat.value),
  }));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            Expense Policy Rules
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure per-category, per-role spending limits. Over-limit items
            are flagged for manager review.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setDialogOpen(true)}
          className="gap-1.5"
        >
          <PlusCircle className="h-3.5 w-3.5" />
          Add Rule
        </Button>
      </div>

      {/* Critical Rule Reminder */}
      <Card className="border-amber-200 dark:border-amber-900 bg-amber-50/30 dark:bg-amber-950/10">
        <CardContent className="p-3 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
              Out-of-Policy Claims Require Human Decision
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Flagged items are never auto-approved or auto-rejected without a
              recorded manager decision.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Rules Grid */}
      {rules.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-8 text-center">
            <Shield className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              No policy rules configured
            </p>
            <p className="text-xs text-muted-foreground/70">
              Add rules to define spending limits per category and role
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setDialogOpen(true)}
              className="mt-2 gap-1.5"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              Add First Rule
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {rulesByCategory.map(
            ({ value: catValue, label: catLabel, rules: catRules }) => {
              if (catRules.length === 0) return null;
              return (
                <Card key={catValue}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {catLabel}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {catRules.map((rule) => (
                        <div
                          key={rule.id}
                          className={cn(
                            "flex items-center justify-between rounded-lg border p-3 transition-colors",
                            rule.isActive
                              ? "border-border"
                              : "border-gray-200 dark:border-gray-800 opacity-60",
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5">
                              {rule.isActive ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                              ) : (
                                <Ban className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge
                                  variant="secondary"
                                  className="text-[10px]"
                                >
                                  {rule.role}
                                </Badge>
                                <span className="text-xs font-medium">
                                  <DollarSign className="h-3 w-3 inline" />
                                  {Number(
                                    rule.limitAmount,
                                  ).toLocaleString()}{" "}
                                  limit
                                </span>
                                {rule.requiresApprovalAbove && (
                                  <span className="text-[10px] text-muted-foreground">
                                    Approval above{" "}
                                    {Number(
                                      rule.requiresApprovalAbove,
                                    ).toLocaleString()}
                                  </span>
                                )}
                                {rule.requiresReceiptAbove && (
                                  <span className="text-[10px] text-muted-foreground">
                                    · Receipt above{" "}
                                    {Number(
                                      rule.requiresReceiptAbove,
                                    ).toLocaleString()}
                                  </span>
                                )}
                                {rule.maxPerMonth && (
                                  <span className="text-[10px] text-muted-foreground">
                                    · Max{" "}
                                    {Number(rule.maxPerMonth).toLocaleString()}
                                    /mo
                                  </span>
                                )}
                              </div>
                              {rule.description && (
                                <p className="text-[10px] text-muted-foreground mt-1">
                                  {rule.description}
                                </p>
                              )}
                            </div>
                          </div>
                          <Badge
                            className={cn(
                              "text-[9px] ml-2",
                              rule.isActive
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                                : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
                            )}
                          >
                            {rule.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            },
          )}
        </div>
      )}

      {/* ── Create Rule Dialog ─────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogPortal>
          <DialogOverlay />
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Add Policy Rule
              </DialogTitle>
              <DialogDescription>
                Configure spending limits. Over-limit claims are flagged for
                manager review.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ruleCategory">Category</Label>
                  <select
                    id="ruleCategory"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {CATEGORY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ruleRole">Role</Label>
                  <select
                    id="ruleRole"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {ROLE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="limitAmount">Limit Amount</Label>
                <Input
                  id="limitAmount"
                  type="number"
                  min={0}
                  value={newLimit}
                  onChange={(e) => setNewLimit(e.target.value)}
                  placeholder="e.g., 50000"
                />
                <p className="text-[10px] text-muted-foreground">
                  Maximum amount per claim item before flagging
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="approvalAbove">
                    Approval Required Above (optional)
                  </Label>
                  <Input
                    id="approvalAbove"
                    type="number"
                    min={0}
                    value={newApprovalAbove}
                    onChange={(e) => setNewApprovalAbove(e.target.value)}
                    placeholder="e.g., 10000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="receiptAbove">
                    Receipt Required Above (optional)
                  </Label>
                  <Input
                    id="receiptAbove"
                    type="number"
                    min={0}
                    value={newReceiptAbove}
                    onChange={(e) => setNewReceiptAbove(e.target.value)}
                    placeholder="e.g., 1000"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxMonthly">Max per Month (optional)</Label>
                <Input
                  id="maxMonthly"
                  type="number"
                  min={0}
                  value={newMaxMonthly}
                  onChange={(e) => setNewMaxMonthly(e.target.value)}
                  placeholder="e.g., 150000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ruleDescription">Description (optional)</Label>
                <Input
                  id="ruleDescription"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Brief description of this policy rule..."
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateRule}
                disabled={!newLimit || createRule.isPending}
                className="gap-1.5"
              >
                {createRule.isPending ? "Creating..." : "Create Rule"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </DialogPortal>
      </Dialog>
    </div>
  );
}
