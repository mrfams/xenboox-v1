"use client";

import { PiggyBank, Plus, Bot } from "lucide-react";
import { useEntity } from "@/lib/entity-context";
import { trpc } from "@/lib/trpc/client";
import { DataTable, type Column } from "@/components/shared/data-table";
import { useModuleAi } from "@/components/module/module-ai-context";
import { useFormatCurrency } from "@/lib/hooks/use-currency";

type BudgetRow = {
  id: string;
  name: string;
  fiscalYear: number;
  status: string;
  currency: string;
};

export function BudgetView() {
  const { format } = useFormatCurrency();
  const { entityId } = useEntity();
  const { openWithFocus } = useModuleAi();

  const { data, isLoading } = trpc.budget.listBudgets.useQuery(undefined, { enabled: !!entityId }) as any;

  const budgets = (data ?? []) as BudgetRow[];
  const list = Array.isArray(budgets) ? budgets : [];

  const columns: Column<BudgetRow>[] = [
    { key: "name", label: "Budget", render: (r) => <span className="text-sm font-medium">{r.name}</span> },
    { key: "fiscalYear", label: "Year", render: (r) => <span className="text-xs">{r.fiscalYear}</span> },
    { key: "status", label: "Status", render: (r) => <span className="text-xs capitalize">{r.status}</span> },
    { key: "currency", label: "Currency", render: (r) => <span className="text-xs font-mono">{r.currency}</span> },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-muted-foreground">{isLoading ? "Loading..." : `${list.length} budgets`}</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => openWithFocus({ kind: "Budget", name: "Budget" }, "Show me budget vs actual")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10"
          >
            <Bot className="h-3.5 w-3.5" /> Ask AI
          </button>
          <button
            type="button"
            onClick={() => openWithFocus({ kind: "Budget", name: "New Budget" }, "Help me create a budget")}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-3.5 w-3.5" /> Add Budget
          </button>
        </div>
      </div>
      <DataTable<BudgetRow>
        columns={columns}
        data={list}
        isLoading={isLoading}
        searchPlaceholder="Search budgets..."
        emptyIcon={PiggyBank}
        emptyTitle="No budgets yet"
        emptyDescription="Create a budget. AI will track vs actuals."
        onRowClick={(row) => openWithFocus({ kind: "Budget", name: row.name, id: row.id }, `Show me ${row.name}`)}
        showSearch
        showPagination
        pageSize={20}
      />
    </div>
  );
}
