"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { SubPageTabs } from "@/components/shared/sub-page-tabs";
import { MODULE_TABS } from "@/components/shared/module-tabs";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/loading";
import {
  Badge,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import { CreateAccountDialog } from "./create-dialog";
import {
  BookOpen,
  Plus,
  ChevronRight,
  ChevronDown,
  BarChart3,
  TrendingUp,
  DollarSign,
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

const typeOptions = [
  { value: "asset", label: "Asset" },
  { value: "liability", label: "Liability" },
  { value: "equity", label: "Equity" },
  { value: "revenue", label: "Revenue" },
  { value: "expense", label: "Expense" },
];

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
        className="border-b hover:bg-muted/50 cursor-pointer"
        onClick={onClick}
      >
        <td className="py-2 px-4">
          <div
            className="flex items-center gap-1"
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
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </button>
            ) : (
              <span className="w-5" />
            )}
            <span className="font-mono text-sm">{account.code}</span>
          </div>
        </td>
        <td className="py-2 px-4">
          <span className={cn(depth > 0 && "text-muted-foreground")}>
            {account.name}
          </span>
        </td>
        <td className="py-2 px-4">
          <Badge variant="secondary" className={typeColors[account.type]}>
            {account.type}
          </Badge>
        </td>
        <td className="py-2 px-4 text-sm text-muted-foreground">
          {account.subtype.replace(/_/g, " ")}
        </td>
        <td className="py-2 px-4 text-right">
          <Badge variant={account.isActive ? "success" : "secondary"}>
            {account.isActive ? "Active" : "Inactive"}
          </Badge>
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
  const importTemplate = trpc.coa.importTemplate.useMutation({
    onSuccess: () => {
      toast.success("Template imported");
      utils.coa.listHierarchy.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const utils = trpc.useUtils();
  const [createOpen, setCreateOpen] = useState(false);
  const [activeType, setActiveType] = useState("");

  function filterByType(accounts: Account[], type: string): Account[] {
    if (!type) return accounts;
    return accounts
      .filter((a) => a.type === type)
      .map((a) => ({
        ...a,
        children: a.children ? filterByType(a.children, type) : [],
      }));
  }

  const filtered = filterByType((accounts ?? []) as Account[], activeType);

  const kpis = useMemo(() => {
    if (!accounts) return null;
    const allAccounts = (accounts ?? []) as Account[];
    const totalAccounts = allAccounts.length;
    const assetAccounts = allAccounts.filter((a) => a.type === "asset").length;
    const expenseAccounts = allAccounts.filter(
      (a) => a.type === "expense",
    ).length;
    return { totalAccounts, assetAccounts, expenseAccounts };
  }, [accounts]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Chart of Accounts"
        description="Manage your account hierarchy"
        action={{
          label: "New Account",
          onClick: () => setCreateOpen(true),
          icon: <Plus className="mr-2 h-4 w-4" />,
        }}
      />

      <SubPageTabs tabs={MODULE_TABS.accounting} />

      {/* KPI Summary Cards — mockup pattern */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Total Accounts",
            value: kpis?.totalAccounts ?? 0,
            icon: BookOpen,
            color: "bg-gradient-to-br from-[#6366F1] to-blue-500",
          },
          {
            label: "Asset Accounts",
            value: kpis?.assetAccounts ?? 0,
            icon: DollarSign,
            color: "bg-gradient-to-br from-emerald-500 to-teal-500",
          },
          {
            label: "Expense Accounts",
            value: kpis?.expenseAccounts ?? 0,
            icon: TrendingUp,
            color: "bg-gradient-to-br from-amber-500 to-orange-500",
          },
          {
            label: "Account Types",
            value: "5",
            icon: BarChart3,
            color: "bg-gradient-to-br from-sky-500 to-cyan-500",
          },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className="rounded-xl border border-border/50 bg-card p-4 transition-all duration-200 hover:shadow-md"
            >
              <div className="flex items-start justify-between mb-3">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl text-white",
                    kpi.color,
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <p className="text-xs font-medium text-muted-foreground mb-0.5">
                {kpi.label}
              </p>
              <p className="text-2xl font-bold tracking-tight tabular-nums">
                {kpi.value}
              </p>
            </div>
          );
        })}
      </div>

      <FilterBar
        onFilterChange={(filters) => setActiveType(filters.status)}
        statusOptions={typeOptions}
      />

      {isLoading ? (
        <TableSkeleton rows={8} columns={5} />
      ) : !accounts || accounts.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="h-12 w-12" />}
          title="No accounts yet"
          description="Create your chart of accounts to start recording transactions."
          action={
            <div className="flex flex-col gap-2">
              <Select
                value={selectedTemplate}
                onValueChange={setSelectedTemplate}
              >
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Choose a template..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trading">Trading Business</SelectItem>
                  <SelectItem value="services">Services Business</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    if (!selectedTemplate) {
                      toast.error("Select a template first");
                      return;
                    }
                    importTemplate.mutate({ templateId: selectedTemplate });
                  }}
                  disabled={!selectedTemplate || importTemplate.isPending}
                >
                  <BookOpen className="mr-2 h-4 w-4" /> Import Template
                </Button>
                <Button variant="outline" onClick={() => setCreateOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" /> Create Manually
                </Button>
              </div>
            </div>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                  Code
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                  Name
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                  Type
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                  Subtype
                </th>
                <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((account) => (
                <AccountRow
                  key={account.id}
                  account={account}
                  onClick={() => router.push(`/dashboard/coa/${account.id}`)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CreateAccountDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
