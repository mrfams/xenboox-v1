"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { SubPageTabs } from "@/components/shared/sub-page-tabs";
import { MODULE_TABS } from "@/components/shared/module-tabs";
import { ExpenseLiveness } from "@/components/agents/expense-liveness";
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
  Input,
  Select,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from "@/components/ui";
import {
  Receipt,
  Clock,
  PlusCircle,
  Users,
  DollarSign,
  TrendingUp,
  Activity,
  Shield,
  Search,
  Filter,
  CreditCard,
  Wallet,
} from "lucide-react";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { SubmitClaimDialog } from "./submit-claim-dialog";
import { PolicyRulesEditor } from "./policy-rules-editor";

// ─── Status helpers ─────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  submitted: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  flagged:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  approved:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  reimbursed:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  voided: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  flagged: "Flagged",
  approved: "Approved",
  rejected: "Rejected",
  reimbursed: "Reimbursed",
  voided: "Voided",
};

// ─── ExpenseDashboardPage ───────────────────────────────────────────────────

export default function ExpenseDashboardPage() {
  const router = useRouter();
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("claims");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Data fetching
  const { data: status, isLoading: statusLoading } =
    trpc.expense.getStatus.useQuery();
  const { data: claims, isLoading: claimsLoading } =
    trpc.expense.listClaims.useQuery({
      status: statusFilter !== "all" ? (statusFilter as any) : undefined,
      limit: 50,
    });
  const { data: reimbursements } = trpc.expense.listReimbursements.useQuery({
    limit: 20,
  });
  const { data: policyRules, refetch: refetchPolicyRules } =
    trpc.expense.listPolicyRules.useQuery();

  // ── Derived state ────────────────────────────────────────────────────

  const currentPeriod = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  const totalPendingApproval = status?.totalPendingApproval ?? 0;
  const totalPendingReimbursement = status?.totalPendingReimbursement ?? 0;
  const activeClaimsCount = claims?.length ?? 0;

  const thisMonthAmount = useMemo(() => {
    return (claims ?? [])
      .filter((c) => {
        const d = c.submittedAt ? new Date(c.submittedAt) : null;
        if (!d) return false;
        const now = new Date();
        return (
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear()
        );
      })
      .reduce((s, c) => s + Number(c.totalAmount), 0);
  }, [claims]);

  const filteredClaims = useMemo(() => {
    if (!claims) return [];
    if (!searchQuery) return claims;
    const q = searchQuery.toLowerCase();
    return claims.filter(
      (c) =>
        c.claimNumber.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q),
    );
  }, [claims, searchQuery]);

  const handleSubmitComplete = useCallback(() => {
    setSubmitDialogOpen(false);
    router.refresh();
  }, [router]);

  // ── Loading state ────────────────────────────────────────────────────

  if (statusLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Expense Center"
          description="Employee expense claims — mobile-first"
        />
        <SubPageTabs tabs={MODULE_TABS.payroll} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card
              key={i}
              className="bg-gradient-to-br from-primary/5 to-background"
            >
              <CardContent className="p-5">
                <div className="h-5 w-24 animate-pulse rounded bg-muted mb-2" />
                <div className="h-8 w-20 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
        <TableSkeleton rows={5} columns={6} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expense Center"
        description={`${activeClaimsCount} claims · ${totalPendingApproval} pending approval · ${totalPendingReimbursement} pending reimbursement`}
        action={{
          label: "Submit Claim",
          icon: <PlusCircle className="mr-2 h-4 w-4" />,
          onClick: () => setSubmitDialogOpen(true),
        }}
      />

      <SubPageTabs tabs={MODULE_TABS.payroll} />

      <ExpenseLiveness />

      {/* ── Summary Stat Cards ────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Active Claims */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Active Claims
                </p>
                <p className="text-2xl font-bold">{activeClaimsCount}</p>
              </div>
              <div className="rounded-lg bg-blue-100 p-2.5 dark:bg-blue-900/30">
                <Receipt className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <Activity className="h-3 w-3" />
              <span>{status?.claims?.length ?? 0} total tracked</span>
            </div>
          </CardContent>
        </Card>

        {/* Pending Approval */}
        <Card className="bg-gradient-to-br from-amber-50 to-background dark:from-amber-950/20">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Pending Approval
                </p>
                <p
                  className={cn(
                    "text-2xl font-bold",
                    totalPendingApproval > 0
                      ? "text-amber-600"
                      : "text-emerald-600",
                  )}
                >
                  {totalPendingApproval}
                </p>
              </div>
              <div className="rounded-lg bg-amber-100 p-2.5 dark:bg-amber-900/30">
                <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3 w-3" />
              <span>
                {totalPendingApproval > 0
                  ? "Awaiting manager decision"
                  : "All up to date"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Pending Reimbursement */}
        <Card className="bg-gradient-to-br from-purple-50 to-background dark:from-purple-950/20">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Pending Reimbursement
                </p>
                <p className="text-2xl font-bold text-purple-600">
                  {totalPendingReimbursement}
                </p>
              </div>
              <div className="rounded-lg bg-purple-100 p-2.5 dark:bg-purple-900/30">
                <Wallet className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <DollarSign className="h-3 w-3" />
              <span>Scheduled for next payment batch</span>
            </div>
          </CardContent>
        </Card>

        {/* This Month */}
        <Card className="bg-gradient-to-br from-emerald-50 to-background dark:from-emerald-950/20">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  This Month
                </p>
                <p className="text-2xl font-bold text-emerald-600">
                  {formatCurrency(thisMonthAmount)}
                </p>
              </div>
              <div className="rounded-lg bg-emerald-100 p-2.5 dark:bg-emerald-900/30">
                <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <Receipt className="h-3 w-3" />
              <span>{currentPeriod} total claimed</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Main Content Tabs ─────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start border-b rounded-none h-auto pb-0 bg-transparent gap-0">
          <TabsTrigger
            value="claims"
            className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 pb-3"
          >
            <Receipt className="h-4 w-4" />
            Claims
          </TabsTrigger>
          <TabsTrigger
            value="policy"
            className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 pb-3"
          >
            <Shield className="h-4 w-4" />
            Policy Rules
          </TabsTrigger>
          <TabsTrigger
            value="reimbursements"
            className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 pb-3"
          >
            <CreditCard className="h-4 w-4" />
            Reimbursements
          </TabsTrigger>
        </TabsList>

        {/* ── Tab: Claims ──────────────────────────────────────────── */}
        <TabsContent value="claims" className="space-y-4 pt-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search claims..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9 text-sm"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] h-9 text-sm">
                <Filter className="h-3.5 w-3.5 mr-1" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="flagged">Flagged</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="reimbursed">Reimbursed</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setActiveTab("policy")}
              className="gap-1.5"
            >
              <Shield className="h-3.5 w-3.5" />
              Manage Policies
            </Button>
          </div>

          {/* Claims Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                Expense Claims
              </CardTitle>
              <CardDescription className="text-xs">
                {filteredClaims.length} claim(s) — click to view details
              </CardDescription>
            </CardHeader>
            <CardContent>
              {claimsLoading ? (
                <TableSkeleton rows={5} columns={6} />
              ) : filteredClaims.length === 0 ? (
                <EmptyState
                  icon={<Receipt className="h-12 w-12" />}
                  title="No claims yet"
                  description="Submit your first expense claim to get started."
                  action={
                    <Button
                      size="sm"
                      onClick={() => setSubmitDialogOpen(true)}
                      className="gap-2"
                    >
                      <PlusCircle className="h-4 w-4" />
                      Submit Claim
                    </Button>
                  }
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                          Claim #
                        </th>
                        <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                          Category
                        </th>
                        <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground">
                          Amount
                        </th>
                        <th className="py-3 px-4 text-center text-xs font-medium text-muted-foreground">
                          Status
                        </th>
                        <th className="py-3 px-4 text-center text-xs font-medium text-muted-foreground">
                          Source
                        </th>
                        <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground">
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredClaims.map((claim) => (
                        <tr
                          key={claim.id}
                          className="border-b hover:bg-muted/50 transition-colors cursor-pointer"
                        >
                          <td className="py-3 px-4">
                            <span className="text-sm font-mono font-medium">
                              {claim.claimNumber}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <Badge
                              variant="secondary"
                              className="text-[10px] font-medium"
                            >
                              {claim.category}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right text-sm font-mono font-semibold">
                            {formatCurrency(Number(claim.totalAmount))}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Badge
                              className={cn(
                                "text-[10px] font-medium border-0",
                                STATUS_STYLES[claim.status] ??
                                  STATUS_STYLES.draft,
                              )}
                            >
                              {STATUS_LABELS[claim.status] ?? claim.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-center text-xs text-muted-foreground capitalize">
                            {claim.claimantId === "system-auto"
                              ? "Auto"
                              : claim.claimantId.slice(0, 8)}
                          </td>
                          <td className="py-3 px-4 text-right text-xs text-muted-foreground">
                            {claim.submittedAt
                              ? formatDate(claim.submittedAt)
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick submit CTA */}
          {filteredClaims.length > 0 && (
            <div className="flex justify-center pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSubmitDialogOpen(true)}
                className="gap-2"
              >
                <PlusCircle className="h-4 w-4" />
                Submit Another Claim
              </Button>
            </div>
          )}
        </TabsContent>

        {/* ── Tab: Policy Rules ──────────────────────────────────────── */}
        <TabsContent value="policy" className="space-y-4 pt-4">
          <PolicyRulesEditor
            rules={policyRules ?? []}
            onRulesChanged={refetchPolicyRules}
          />
        </TabsContent>

        {/* ── Tab: Reimbursements ───────────────────────────────────── */}
        <TabsContent value="reimbursements" className="space-y-4 pt-4">
          {/* Summary */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground mb-1">Scheduled</p>
              <p className="text-xl font-bold">
                {
                  (reimbursements ?? []).filter((r) => r.status === "scheduled")
                    .length
                }
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Awaiting payment batch
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground mb-1">Processing</p>
              <p className="text-xl font-bold">
                {
                  (reimbursements ?? []).filter(
                    (r) => r.status === "processing",
                  ).length
                }
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                In payment queue
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground mb-1">Total Paid</p>
              <p className="text-xl font-bold text-emerald-600">
                {
                  (reimbursements ?? []).filter((r) => r.status === "paid")
                    .length
                }
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Completed reimbursements
              </p>
            </div>
          </div>

          {/* Reimbursements Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                Reimbursement Records
              </CardTitle>
              <CardDescription className="text-xs">
                Track payment status for approved claims
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!reimbursements || reimbursements.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-6 text-center">
                  <CreditCard className="h-8 w-8 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">
                    No reimbursement records yet
                  </p>
                  <p className="text-xs text-muted-foreground/70">
                    Approved claims will appear here once reimbursement is
                    scheduled
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                          Amount
                        </th>
                        <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                          Method
                        </th>
                        <th className="py-3 px-4 text-center text-xs font-medium text-muted-foreground">
                          Status
                        </th>
                        <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground">
                          Scheduled
                        </th>
                        <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground">
                          Paid
                        </th>
                        <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                          Ref
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {reimbursements.map((r) => (
                        <tr
                          key={r.id}
                          className="border-b hover:bg-muted/50 transition-colors"
                        >
                          <td className="py-3 px-4 text-sm font-mono font-semibold">
                            {formatCurrency(Number(r.amount))}
                          </td>
                          <td className="py-3 px-4 text-xs text-muted-foreground">
                            <Badge variant="secondary" className="text-[9px]">
                              {r.paymentMethod?.replace("_", " ")}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Badge
                              className={cn(
                                "text-[10px] font-medium border-0",
                                r.status === "paid" &&
                                  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
                                r.status === "scheduled" &&
                                  "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
                                r.status === "processing" &&
                                  "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
                                r.status === "failed" &&
                                  "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
                                r.status === "cancelled" &&
                                  "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
                              )}
                            >
                              {r.status.charAt(0).toUpperCase() +
                                r.status.slice(1)}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right text-xs text-muted-foreground">
                            {r.scheduledDate
                              ? formatDate(
                                  new Date(r.scheduledDate).toISOString(),
                                )
                              : "—"}
                          </td>
                          <td className="py-3 px-4 text-right text-xs text-muted-foreground">
                            {r.paidDate
                              ? formatDate(new Date(r.paidDate).toISOString())
                              : "—"}
                          </td>
                          <td className="py-3 px-4 text-xs font-mono text-muted-foreground">
                            {r.paymentRef
                              ? r.paymentRef.slice(0, 10) + "..."
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Dialogs ──────────────────────────────────────────────────── */}
      <SubmitClaimDialog
        open={submitDialogOpen}
        onOpenChange={setSubmitDialogOpen}
        onComplete={handleSubmitComplete}
      />
    </div>
  );
}
