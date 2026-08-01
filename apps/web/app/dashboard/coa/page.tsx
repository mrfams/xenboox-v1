"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { SubPageTabs } from "@/components/shared/sub-page-tabs";
import { MODULE_TABS } from "@/components/shared/module-tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/loading";
import { CreateAccountDialog } from "./create-dialog";
import { AICopilotSidebar } from "@/components/dashboard/ai-copilot-sidebar";
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
  BookOpen,
  Plus,
  ChevronRight,
  ChevronDown,
  BarChart3,
  TrendingUp,
  DollarSign,
  Search,
  Filter,
  Download,
  MoreHorizontal,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  Lightbulb,
  FileText,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Account = {
  id: string;
  code: string;
  name: string;
  type: string;
  subtype: string;
  description: string | null;
  parentId: string | null;
  isActive: boolean;
  children?: Account[];
};

const typeColors: Record<string, string> = {
  asset: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  liability: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  equity:
    "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  revenue:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  expense:
    "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
};

const typeBadgeColors: Record<string, string> = {
  asset: "bg-blue-500",
  liability: "bg-red-500",
  equity: "bg-purple-500",
  revenue: "bg-emerald-500",
  expense: "bg-orange-500",
};

function AccountRow({
  account,
  depth = 0,
  onClick,
}: {
  account: Account;
  depth?: number;
  onClick: () => void;
}) {
  const [expanded, setExpanded] = useState(depth < 1);
  const hasChildren = account.children && account.children.length > 0;

  return (
    <>
      <tr
        className="border-b hover:bg-muted/30 cursor-pointer transition-colors"
        onClick={onClick}
      >
        <td className="py-3 px-4">
          <div
            className="flex items-center gap-2"
            style={{ paddingLeft: `${depth * 24}px` }}
            onClick={(e) => {
              if (hasChildren) {
                e.stopPropagation();
                setExpanded(!expanded);
              }
            }}
          >
            {hasChildren ? (
              <button className="p-0.5 hover:bg-muted rounded">
                {expanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            ) : (
              <div className="w-5 h-5 flex items-center justify-center">
                <div
                  className={cn(
                    "h-2 w-2 rounded-full",
                    typeBadgeColors[account.type] || "bg-gray-400",
                  )}
                />
              </div>
            )}
            <span className="font-mono text-sm font-medium">
              {account.code}
            </span>
          </div>
        </td>
        <td className="py-3 px-4">
          <span
            className={cn(
              "text-sm font-medium",
              depth > 0 && "text-muted-foreground",
              depth === 0 && "font-bold uppercase",
            )}
          >
            {account.name}
          </span>
        </td>
        <td className="py-3 px-4">
          <Badge
            variant="secondary"
            className={cn(typeColors[account.type], "capitalize")}
          >
            {depth === 0 ? "Header" : "Detail"}
          </Badge>
        </td>
        <td className="py-3 px-4 text-sm text-muted-foreground">
          {depth === 0 ? "—" : account.parentId ? `1.${depth}` : "—"}
        </td>
        <td className="py-3 px-4 text-sm">GMD</td>
        <td className="py-3 px-4">
          <Badge variant={account.isActive ? "success" : "secondary"}>
            {account.isActive ? "Active" : "Inactive"}
          </Badge>
        </td>
        <td className="py-3 px-4 text-sm text-muted-foreground">
          May 19, 2025
        </td>
        <td
          className="py-3 px-4 text-center"
          onClick={(e) => e.stopPropagation()}
        >
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </td>
      </tr>
      {expanded &&
        account.children?.map((child) => (
          <AccountRow
            key={child.id}
            account={child}
            depth={depth + 1}
            onClick={() => {}}
          />
        ))}
    </>
  );
}

export default function COAPage() {
  const router = useRouter();
  const { data: accounts, isLoading } = trpc.coa.listHierarchy.useQuery();
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [copilotOpen, setCopilotOpen] = useState(true);

  const filtered = useMemo(() => {
    if (!accounts) return [];
    let result = (accounts ?? []) as Account[];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(q) || a.code.toLowerCase().includes(q),
      );
    }
    return result;
  }, [accounts, search]);

  // Compute KPI metrics
  const kpis = useMemo(() => {
    if (!accounts) return null;
    const allAccounts = (accounts ?? []) as Account[];
    const totalAccounts = allAccounts.length;
    const detailAccounts = allAccounts.filter(
      (a) => !a.children || a.children.length === 0,
    ).length;
    const headerAccounts = totalAccounts - detailAccounts;
    return { totalAccounts, detailAccounts, headerAccounts };
  }, [accounts]);

  // AI Copilot insights
  const insights = useMemo(() => {
    return [
      {
        id: "1",
        type: "warning" as const,
        title: "Unused Accounts",
        description: "12 accounts haven't been used in the last 12 months.",
        action: { label: "View unused accounts", onClick: () => {} },
      },
      {
        id: "2",
        type: "info" as const,
        title: "Duplicate Candidates",
        description: "4 sets of similar accounts found that could be merged.",
        action: { label: "Review duplicates", onClick: () => {} },
      },
    ];
  }, []);

  const tabs = [
    { id: "all", label: "All Accounts", count: kpis?.totalAccounts ?? 0 },
    { id: "groups", label: "Account Groups", count: 5 },
    { id: "types", label: "Account Types", count: 5 },
    { id: "tags", label: "Account Tags", count: 8 },
    { id: "rules", label: "Account Rules", count: 12 },
    { id: "map", label: "Account Map", count: 0 },
  ];

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-6 p-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <BookOpen className="h-6 w-6 text-primary" />
                Chart of Accounts
              </h1>
              <p className="text-sm text-muted-foreground">
                Manage your accounts structure and classifications.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Import
              </Button>
              <Button variant="outline" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                New Account
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 border-b">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-4 py-2 text-sm font-medium transition-colors",
                  activeTab === tab.id
                    ? "border-b-2 border-primary text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              {
                label: "Total Accounts",
                value: kpis?.totalAccounts?.toString() ?? "162",
                subtext: "Active accounts",
                icon: BookOpen,
                color: "text-primary",
                bgColor: "bg-primary/10",
              },
              {
                label: "Detail Accounts",
                value: kpis?.detailAccounts?.toString() ?? "128",
                subtext: "Posting accounts",
                icon: Layers,
                color: "text-emerald-600",
                bgColor: "bg-emerald-50",
              },
              {
                label: "Header Accounts",
                value: kpis?.headerAccounts?.toString() ?? "34",
                subtext: "Non-posting accounts",
                icon: BarChart3,
                color: "text-amber-600",
                bgColor: "bg-amber-50",
              },
              {
                label: "Recently Added",
                value: "5",
                subtext: "This month",
                icon: TrendingUp,
                color: "text-blue-600",
                bgColor: "bg-blue-50",
              },
              {
                label: "Unused Accounts",
                value: "12",
                subtext: "No transactions",
                icon: AlertTriangle,
                color: "text-orange-600",
                bgColor: "bg-orange-50",
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
                  <p className="text-xs text-muted-foreground mt-1">
                    {kpi.subtext}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search accounts..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select defaultValue="all">
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Account Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Account Types</SelectItem>
                <SelectItem value="asset">Asset</SelectItem>
                <SelectItem value="liability">Liability</SelectItem>
                <SelectItem value="equity">Equity</SelectItem>
                <SelectItem value="revenue">Revenue</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="all">
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm">
              <Filter className="mr-2 h-4 w-4" />
              Filters
            </Button>
          </div>

          {/* Data Table */}
          {isLoading ? (
            <TableSkeleton rows={8} columns={7} />
          ) : !accounts || accounts.length === 0 ? (
            <EmptyState
              icon={<BookOpen className="h-12 w-12" />}
              title="No accounts yet"
              description="Create your chart of accounts to start recording transactions."
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border bg-card">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                      Account Code
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                      Account Name
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                      Type
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                      Parent Account
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                      Currency
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                      Last Activity
                    </th>
                    <th className="py-3 px-4 text-center text-xs font-medium text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((account) => (
                    <AccountRow
                      key={account.id}
                      account={account}
                      onClick={() =>
                        router.push(`/dashboard/coa/${account.id}`)
                      }
                    />
                  ))}
                </tbody>
              </table>
              <div className="flex items-center justify-between border-t px-4 py-3">
                <p className="text-sm text-muted-foreground">
                  Showing 1 to {Math.min(filtered.length, 10)} of{" "}
                  {filtered.length} accounts
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
                  <Button variant="outline" size="sm">
                    2
                  </Button>
                  <Button variant="outline" size="sm">
                    3
                  </Button>
                  <Button variant="outline" size="sm">
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Section */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Account Composition */}
            <div className="rounded-lg border bg-card p-4">
              <h3 className="text-sm font-semibold mb-4">
                Account Composition
              </h3>
              <div className="space-y-3">
                {[
                  {
                    label: "Assets",
                    count: 62,
                    pct: 38.3,
                    color: "bg-blue-500",
                  },
                  {
                    label: "Liabilities",
                    count: 28,
                    pct: 17.3,
                    color: "bg-red-500",
                  },
                  {
                    label: "Equity",
                    count: 18,
                    pct: 11.1,
                    color: "bg-purple-500",
                  },
                  {
                    label: "Income",
                    count: 24,
                    pct: 14.8,
                    color: "bg-emerald-500",
                  },
                  {
                    label: "Expenses",
                    count: 30,
                    pct: 18.5,
                    color: "bg-orange-500",
                  },
                ].map((item, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm">{item.label}</span>
                      <span className="text-sm text-muted-foreground">
                        {item.count} accounts ({item.pct}%)
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full", item.color)}
                        style={{ width: `${item.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">Recent Activity</h3>
                <button className="text-xs text-primary hover:underline flex items-center gap-1">
                  View all <ArrowRight className="h-3 w-3" />
                </button>
              </div>
              <div className="space-y-3">
                {[
                  {
                    action: "New account added",
                    detail: "Advertising Expense (5.4.12)",
                    date: "May 19, 2025",
                    by: "AI Agent",
                  },
                  {
                    action: "Account updated",
                    detail: "Bank – Access Bank (1.1.03)",
                    date: "May 17, 2025",
                    by: "Admin",
                  },
                  {
                    action: "Account merged",
                    detail: "Old Cash Account → Cash in Hand (1.1.01)",
                    date: "May 16, 2025",
                    by: "AI Agent",
                  },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <TrendingUp className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{item.action}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.detail}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.date} • by {item.by}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Copilot Sidebar */}
      {copilotOpen && (
        <div className="w-80 border-l bg-card hidden lg:block">
          <AICopilotSidebar
            title="Xenboox AI Copilot"
            subtitle="How can I help you with your chart of accounts?"
            insights={insights}
            suggestedActions={[
              {
                id: "1",
                icon: <Layers className="h-4 w-4" />,
                label: "Add Account Group",
                description: "Create a new account group",
              },
              {
                id: "2",
                icon: <Download className="h-4 w-4" />,
                label: "Import Chart of Accounts",
                description: "Import from file or other system",
              },
              {
                id: "3",
                icon: <FileText className="h-4 w-4" />,
                label: "Export Chart of Accounts",
                description: "Export to Excel / PDF",
              },
            ]}
            onClose={() => setCopilotOpen(false)}
          />
        </div>
      )}

      <CreateAccountDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
