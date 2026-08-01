"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { AICopilotSidebar } from "@/components/dashboard/ai-copilot-sidebar";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/loading";
import {
  Badge,
  Button,
  Input,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui";
import {
  RefreshCw,
  Plus,
  MoreHorizontal,
  Search,
  Filter,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Eye,
  FileText,
  Settings,
  Upload,
  Target,
  BookOpen,
  Zap,
} from "lucide-react";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

type BankAccount = {
  id: string;
  name: string;
  bankName: string;
  accountNumber: string;
  currentBalance: string;
  isActive: boolean;
  type: string;
};

type Reconciliation = {
  id: string;
  bankAccountId: string;
  entityId: string;
  statementDate: string;
  statementBalance: string;
  bookBalance: string;
  difference: string;
  status: string;
  notes?: string | null;
  closedAt?: Date | null;
  closedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export default function ReconciliationCenterPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [copilotOpen, setCopilotOpen] = useState(true);
  const [selectedBankAccount, setSelectedBankAccount] = useState<
    string | undefined
  >(undefined);

  // Fetch real bank accounts from the database with entity scoping
  const { data: bankAccounts, isLoading: loadingAccounts } =
    trpc.treasury.listBankAccounts.useQuery();

  // Fetch real reconciliations from the database with entity scoping
  const { data: reconciliations, isLoading: loadingReconciliations } =
    trpc.treasury.listReconciliations.useQuery(
      selectedBankAccount ? { bankAccountId: selectedBankAccount } : undefined,
    );

  // Fetch bank transactions for the selected account
  const { data: bankTransactions, isLoading: loadingTransactions } =
    trpc.treasury.listBankTransactions.useQuery(
      selectedBankAccount ? { bankAccountId: selectedBankAccount } : undefined,
    );

  // Compute KPI metrics from real data
  const kpis = useMemo(() => {
    if (!reconciliations) return null;
    const totalReconciliations = reconciliations.length;
    const openReconciliations = reconciliations.filter(
      (r) => r.status === "unmatched",
    ).length;
    const closedReconciliations = reconciliations.filter(
      (r) => r.status === "closed",
    ).length;
    const totalStatementBalance = reconciliations.reduce(
      (sum, r) => sum + parseFloat(r.statementBalance),
      0,
    );
    const totalBookBalance = reconciliations.reduce(
      (sum, r) => sum + parseFloat(r.bookBalance),
      0,
    );
    const totalDifference = totalStatementBalance - totalBookBalance;
    return {
      totalReconciliations,
      openReconciliations,
      closedReconciliations,
      totalStatementBalance,
      totalBookBalance,
      totalDifference,
    };
  }, [reconciliations]);

  // Compute transaction metrics
  const txMetrics = useMemo(() => {
    if (!bankTransactions) return null;
    const totalTransactions = bankTransactions.length;
    const reconciledTransactions = bankTransactions.filter(
      (tx) => tx.isReconciled,
    ).length;
    const unreconciledTransactions = totalTransactions - reconciledTransactions;
    const matchRate =
      totalTransactions > 0
        ? Math.round((reconciledTransactions / totalTransactions) * 100)
        : 0;
    return {
      totalTransactions,
      reconciledTransactions,
      unreconciledTransactions,
      matchRate,
    };
  }, [bankTransactions]);

  // AI Copilot insights based on real data
  const insights = useMemo(() => {
    if (!kpis) return [];
    return [
      {
        id: "1",
        type:
          kpis.totalDifference !== 0
            ? ("warning" as const)
            : ("success" as const),
        title:
          kpis.totalDifference !== 0
            ? `Difference of ${formatCurrency(Math.abs(kpis.totalDifference))} detected`
            : "All reconciliations are balanced",
        description:
          kpis.totalDifference !== 0
            ? "Review unmatched transactions to resolve the difference"
            : "Your books match your bank statements",
        action: { label: "View details", onClick: () => {} },
      },
      {
        id: "2",
        type: "info" as const,
        title: `${kpis.openReconciliations} reconciliations in progress`,
        description: `${kpis.closedReconciliations} reconciliations completed this month`,
        action: { label: "View all", onClick: () => {} },
      },
    ];
  }, [kpis]);

  const tabs = [
    {
      id: "all",
      label: "All Reconciliations",
      count: kpis?.totalReconciliations ?? 0,
    },
    { id: "open", label: "In Progress", count: kpis?.openReconciliations ?? 0 },
    {
      id: "closed",
      label: "Completed",
      count: kpis?.closedReconciliations ?? 0,
    },
  ];

  // Filter reconciliations by search and tab
  const filteredReconciliations = useMemo(() => {
    if (!reconciliations) return [];
    let result = [...reconciliations];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.statementDate.toLowerCase().includes(q) ||
          r.notes?.toLowerCase().includes(q),
      );
    }
    if (activeTab === "open") {
      result = result.filter((r) => r.status === "unmatched");
    } else if (activeTab === "closed") {
      result = result.filter((r) => r.status === "closed");
    }
    return result;
  }, [reconciliations, search, activeTab]);

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-6 p-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <RefreshCw className="h-6 w-6 text-primary" />
                Reconciliation Center
              </h1>
              <p className="text-sm text-muted-foreground">
                Automatically reconcile your bank transactions with your books.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Upload className="mr-2 h-4 w-4" />
                Import Statement
              </Button>
              <Button variant="outline" size="sm">
                <Settings className="mr-2 h-4 w-4" />
                Rules
              </Button>
              <Button size="sm">
                <Zap className="mr-2 h-4 w-4" />
                Auto-Reconcile
              </Button>
            </div>
          </div>

          {/* Bank Account Selector */}
          <div className="flex items-center gap-4">
            <Select
              value={selectedBankAccount}
              onValueChange={setSelectedBankAccount}
            >
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="Select a bank account" />
              </SelectTrigger>
              <SelectContent>
                {loadingAccounts ? (
                  <SelectItem value="loading" disabled>
                    Loading accounts...
                  </SelectItem>
                ) : bankAccounts && bankAccounts.length > 0 ? (
                  (bankAccounts as BankAccount[]).map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.bankName} –{" "}
                      {account.accountNumber
                        .slice(-4)
                        .padStart(account.accountNumber.length, "•")}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="none" disabled>
                    No bank accounts found
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            {!selectedBankAccount && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/dashboard/treasury")}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Bank Account
              </Button>
            )}
          </div>

          {/* KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              {
                label: "Statement Balance",
                value: formatCurrency(kpis?.totalStatementBalance ?? 0),
                icon: DollarSign,
                color: "text-primary",
                bgColor: "bg-primary/10",
              },
              {
                label: "Book Balance",
                value: formatCurrency(kpis?.totalBookBalance ?? 0),
                icon: BookOpen,
                color: "text-blue-600",
                bgColor: "bg-blue-50",
              },
              {
                label: "Difference",
                value:
                  (kpis?.totalDifference ?? 0) >= 0
                    ? formatCurrency(kpis?.totalDifference ?? 0)
                    : "-" +
                      formatCurrency(Math.abs(kpis?.totalDifference ?? 0)),
                icon: AlertTriangle,
                color:
                  (kpis?.totalDifference ?? 0) !== 0
                    ? "text-red-600"
                    : "text-emerald-600",
                bgColor:
                  (kpis?.totalDifference ?? 0) !== 0
                    ? "bg-red-50"
                    : "bg-emerald-50",
              },
              {
                label: "Matched",
                value: (txMetrics?.reconciledTransactions ?? 0).toString(),
                subtext: txMetrics
                  ? `${txMetrics.matchRate}% match rate`
                  : undefined,
                icon: CheckCircle,
                color: "text-emerald-600",
                bgColor: "bg-emerald-50",
              },
              {
                label: "Unmatched",
                value: (txMetrics?.unreconciledTransactions ?? 0).toString(),
                icon: AlertTriangle,
                color: "text-amber-600",
                bgColor: "bg-amber-50",
              },
            ].map((kpi) => {
              const Icon = kpi.icon;
              return (
                <div
                  key={kpi.label}
                  className="rounded-xl border bg-card p-4 transition-all duration-200 hover:shadow-md"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      {kpi.label}
                    </p>
                    <div
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-lg",
                        kpi.bgColor,
                      )}
                    >
                      <Icon className={cn("h-4 w-4", kpi.color)} />
                    </div>
                  </div>
                  <p className="text-xl font-bold tracking-tight tabular-nums">
                    {kpi.value}
                  </p>
                  {kpi.subtext && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {kpi.subtext}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 border-b overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap",
                  activeTab === tab.id
                    ? "border-b-2 border-primary text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}{" "}
                <span className="ml-1.5 text-xs">({tab.count})</span>
              </button>
            ))}
            <div className="flex-1" />
            <div className="flex items-center gap-2 pb-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search reconciliations..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 w-[200px]"
                />
              </div>
              <Button variant="outline" size="sm">
                <Filter className="mr-2 h-4 w-4" />
                Filters
              </Button>
            </div>
          </div>

          {/* Reconciliations Table */}
          {loadingReconciliations ? (
            <TableSkeleton rows={6} columns={7} />
          ) : !reconciliations || reconciliations.length === 0 ? (
            <EmptyState
              icon={<RefreshCw className="h-12 w-12" />}
              title="No reconciliations"
              description="Start a new reconciliation to match your bank transactions with your books."
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border bg-card">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                      Statement Date
                    </th>
                    <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground">
                      Statement Balance
                    </th>
                    <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground">
                      Book Balance
                    </th>
                    <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground">
                      Difference
                    </th>
                    <th className="py-3 px-4 text-center text-xs font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="py-3 px-4 text-center text-xs font-medium text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReconciliations.map((recon) => (
                    <tr
                      key={recon.id}
                      className="border-b hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() =>
                        router.push(
                          `/dashboard/treasury/${recon.bankAccountId}/reconciliation/${recon.id}`,
                        )
                      }
                    >
                      <td className="py-3 px-4 text-sm">
                        {recon.statementDate}
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-mono font-medium">
                        {formatCurrency(parseFloat(recon.statementBalance))}
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-mono">
                        {formatCurrency(parseFloat(recon.bookBalance))}
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-mono">
                        <span
                          className={cn(
                            parseFloat(recon.difference) !== 0
                              ? "text-red-600"
                              : "text-emerald-600",
                          )}
                        >
                          {parseFloat(recon.difference) >= 0
                            ? formatCurrency(parseFloat(recon.difference))
                            : "-" +
                              formatCurrency(
                                Math.abs(parseFloat(recon.difference)),
                              )}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-[10px]",
                            recon.status === "closed"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-700",
                          )}
                        >
                          {recon.status === "closed"
                            ? "● Completed"
                            : "● In Progress"}
                        </Badge>
                      </td>
                      <td
                        className="py-3 px-4 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex items-center justify-between border-t px-4 py-3">
                <p className="text-sm text-muted-foreground">
                  Showing {reconciliations.length} reconciliations
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled>
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-primary text-primary-foreground"
                  >
                    1
                  </Button>
                  <Button variant="outline" size="sm" disabled>
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            <Button variant="outline">Finish Later</Button>
            <Button>
              <CheckCircle className="mr-2 h-4 w-4" />
              New Reconciliation
            </Button>
          </div>
        </div>
      </div>

      {/* AI Copilot Sidebar */}
      {copilotOpen && (
        <div className="w-80 border-l bg-card hidden lg:block">
          <AICopilotSidebar
            title="Xenboox AI Copilot"
            subtitle="I found potential matches and issues that need your attention."
            insights={insights}
            suggestedActions={[
              {
                id: "1",
                icon: <RefreshCw className="h-4 w-4" />,
                label: "Auto-reconcile transactions",
                description: "Match bank feed",
              },
              {
                id: "2",
                icon: <Target className="h-4 w-4" />,
                label: "Find unmatched transactions",
                description: "AI suggestions",
              },
              {
                id: "3",
                icon: <DollarSign className="h-4 w-4" />,
                label: "Review bank charges",
                description: "View charges",
              },
              {
                id: "4",
                icon: <FileText className="h-4 w-4" />,
                label: "Export reconciliation report",
                description: "Get summary",
              },
            ]}
            onClose={() => setCopilotOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
