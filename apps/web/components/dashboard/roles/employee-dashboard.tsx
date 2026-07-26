"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
} from "@/components/ui";
import { Skeleton } from "@/components/shared/loading";
import { EmptyState } from "@/components/shared/empty-state";
import { trpc } from "@/lib/trpc/client";
import { useEntity } from "@/lib/entity-context";
import { formatCurrency, cn } from "@/lib/utils";
import {
  Receipt,
  CheckCircle2,
  AlertCircle,
  Clock,
  Camera,
  FileText,
  ChevronRight,
  Plus,
  Send,
  Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";

// ─── Types ──────────────────────────────────────────────────────────────

type ExpenseClaim = {
  id: string;
  claimNumber: string;
  totalAmount: string;
  status: string;
  category: string;
  description?: string;
  createdAt: string;
};

// ─── Status Badge ──────────────────────────────────────────────────────

function ClaimStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; color: string; bg: string }> = {
    draft: {
      label: "Draft",
      color: "text-slate-600",
      bg: "bg-slate-100",
    },
    submitted: {
      label: "In Review",
      color: "text-blue-600",
      bg: "bg-blue-100",
    },
    flagged: {
      label: "Needs Info",
      color: "text-amber-600",
      bg: "bg-amber-100",
    },
    approved: {
      label: "Approved",
      color: "text-emerald-600",
      bg: "bg-emerald-100",
    },
    rejected: {
      label: "Rejected",
      color: "text-red-600",
      bg: "bg-red-100",
    },
    reimbursed: {
      label: "Paid",
      color: "text-emerald-600",
      bg: "bg-emerald-100",
    },
  };

  const c = config[status] ?? {
    label: status,
    color: "text-slate-600",
    bg: "bg-slate-100",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        c.color,
        c.bg,
      )}
    >
      {c.label}
    </span>
  );
}

// ─── Submit Claim Card ──────────────────────────────────────────────

function SubmitClaimCard() {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState("travel");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");

  const submitMutation = trpc.expense.runPipeline.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description) return;

    try {
      await submitMutation.mutateAsync({
        claimNumber: `EXP-${Date.now()}`,
        claimantId: "self",
        claimantName: "Me",
        category,
        description,
        totalAmount: parseFloat(amount),
        source: "web",
        lineItems: [
          {
            category,
            description,
            amount: parseFloat(amount),
          },
        ],
      });
      setShowForm(false);
      setCategory("travel");
      setDescription("");
      setAmount("");
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <Card className="bg-gradient-to-br from-blue-500/5 via-blue-500/[0.02] to-background border-blue-500/10">
      <CardContent className="p-5">
        {!showForm ? (
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-500/10">
              <Receipt className="h-6 w-6 text-blue-500" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold">Submit an Expense Claim</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Snap a photo of your receipt or enter the details manually.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setShowForm(true)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  New Claim
                </Button>
                <Link href="/dashboard/expense/pipeline">
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Camera className="h-3.5 w-3.5" />
                    Scan Receipt
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">New Expense Claim</h3>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="travel">Travel</option>
                <option value="meals">Meals & Entertainment</option>
                <option value="office">Office Supplies</option>
                <option value="transport">Transport</option>
                <option value="utilities">Utilities</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Description
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What was this for?"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Amount (GHS)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full gap-1.5"
              disabled={submitMutation.isPending || !amount || !description}
            >
              {submitMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {submitMutation.isPending ? "Submitting..." : "Submit Claim"}
            </Button>

            {submitMutation.isError && (
              <p className="text-xs text-red-500">
                {submitMutation.error?.message ?? "Failed to submit claim"}
              </p>
            )}
          </form>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Claim Status List ──────────────────────────────────────────────

function ClaimStatusList({
  claims,
  isLoading,
}: {
  claims: ExpenseClaim[];
  isLoading: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            My Claims
          </CardTitle>
          {claims.length > 0 && (
            <Badge variant="secondary" className="text-[10px]">
              {claims.length} total
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 rounded-lg" />
            <Skeleton className="h-16 rounded-lg" />
          </div>
        ) : claims.length > 0 ? (
          <div className="space-y-2">
            {claims.slice(0, 5).map((claim) => (
              <Link
                key={claim.id}
                href={`/dashboard/expense/${claim.id}`}
                className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-accent/50"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">
                      {claim.description ?? claim.category}
                    </span>
                    <ClaimStatusBadge status={claim.status} />
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {new Date(claim.createdAt).toLocaleDateString()} ·{" "}
                    {claim.category}
                  </p>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className="text-sm font-semibold tabular-nums">
                    {formatCurrency(parseFloat(claim.totalAmount))}
                  </p>
                  <ChevronRight className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Receipt className="h-8 w-8" />}
            title="No claims yet"
            description="Submit your first expense claim above."
            className="py-4"
          />
        )}
      </CardContent>
    </Card>
  );
}

// ─── Quick Links ──────────────────────────────────────────────────────

function EmployeeQuickLinks() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Quick Links
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {[
            {
              label: "View All Claims",
              href: "/dashboard/expense",
              icon: FileText,
            },
            {
              label: "Scan Receipt",
              href: "/dashboard/expense/pipeline",
              icon: Camera,
            },
            { label: "My Profile", href: "/dashboard/settings", icon: Clock },
          ].map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.label}
                href={link.href}
                className="flex items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-accent/50"
              >
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span>{link.label}</span>
                <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Dashboard Component ──────────────────────────────────────────

export function EmployeeDashboard() {
  const { entityId } = useEntity();

  const { data: myClaims, isLoading } = trpc.expense.listClaims.useQuery(
    undefined,
    { enabled: !!entityId },
  );

  const claims = (myClaims ?? []) as ExpenseClaim[];
  const pendingCount = claims.filter(
    (c) => c.status === "submitted" || c.status === "flagged",
  ).length;
  const approvedCount = claims.filter(
    (c) => c.status === "approved" || c.status === "reimbursed",
  ).length;
  const totalReimbursed = claims
    .filter((c) => c.status === "reimbursed")
    .reduce((s, c) => s + parseFloat(c.totalAmount), 0);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Expenses</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Submit claims and track their status. All in one place.
        </p>
      </div>

      {/* Mini Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border bg-card p-3 text-center">
          <p className="text-2xl font-bold">{pendingCount}</p>
          <p className="text-xs text-muted-foreground">In Review</p>
        </div>
        <div className="rounded-lg border bg-card p-3 text-center">
          <p className="text-2xl font-bold">{approvedCount}</p>
          <p className="text-xs text-muted-foreground">Approved</p>
        </div>
        <div className="rounded-lg border bg-card p-3 text-center">
          <p className="text-2xl font-bold">
            {formatCurrency(totalReimbursed)}
          </p>
          <p className="text-xs text-muted-foreground">Reimbursed</p>
        </div>
      </div>

      {/* Submit Claim */}
      <SubmitClaimCard />

      {/* Claim Status List */}
      <ClaimStatusList claims={claims} isLoading={isLoading} />

      {/* Quick Links — single row on mobile */}
      <EmployeeQuickLinks />
    </div>
  );
}
