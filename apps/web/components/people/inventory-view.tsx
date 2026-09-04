"use client";

import { Boxes, Plus, Bot } from "lucide-react";
import { useEntity } from "@/lib/entity-context";
import { trpc } from "@/lib/trpc/client";
import { DataTable, type Column } from "@/components/shared/data-table";
import { useModuleAi } from "@/components/module/module-ai-context";
import { useFormatCurrency } from "@/lib/hooks/use-currency";

type InventoryRow = {
  id: string;
  name: string;
  sku: string;
  quantityOnHand: number;
  reorderLevel: number;
  standardCost: string;
};

export function InventoryView() {
  const { format } = useFormatCurrency();
  const { entityId, entityCurrency } = useEntity();
  const { openWithFocus } = useModuleAi();

  const { data, isLoading } = trpc.inventory.listItems.useQuery(undefined, { enabled: !!entityId });

  const items = ((data as any)?.items ?? (data as any) ?? []) as InventoryRow[];
  const list = Array.isArray(items) ? items : [];

  const columns: Column<InventoryRow>[] = [
    { key: "name", label: "Item", render: (r) => <span className="text-sm font-medium">{r.name}</span> },
    { key: "sku", label: "SKU", render: (r) => <span className="text-xs font-mono text-muted-foreground">{r.sku}</span> },
    { key: "quantityOnHand", label: "On Hand", align: "right", render: (r) => <span className="text-sm tabular-nums">{r.quantityOnHand}</span> },
    { key: "standardCost", label: "Cost", align: "right", render: (r) => <span className="text-sm tabular-nums">{format(parseFloat(r.standardCost ?? "0"), entityCurrency ?? "USD")}</span> },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-muted-foreground">{isLoading ? "Loading..." : `${list.length} items`}</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => openWithFocus({ kind: "Inventory", name: "Inventory" }, "What's low on stock and what should I reorder?")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10"
          >
            <Bot className="h-3.5 w-3.5" /> Ask AI
          </button>
          <button
            type="button"
            onClick={() => openWithFocus({ kind: "Inventory", name: "New Item" }, "Help me create an inventory item")}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-3.5 w-3.5" /> Add Item
          </button>
        </div>
      </div>
      <DataTable<InventoryRow>
        columns={columns}
        data={list}
        isLoading={isLoading}
        searchPlaceholder="Search inventory..."
        emptyIcon={Boxes}
        emptyTitle="No inventory yet"
        emptyDescription="Add stock items. AI will track levels and flag low stock."
        onRowClick={(row) => openWithFocus({ kind: "Inventory", name: row.name, id: row.id }, `Show me ${row.name}`)}
        showSearch
        showPagination
        pageSize={20}
      />
    </div>
  );
}
