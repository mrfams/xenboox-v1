"use client";

import { Building2, Plus, Bot } from "lucide-react";
import { useEntity } from "@/lib/entity-context";
import { trpc } from "@/lib/trpc/client";
import { DataTable, type Column } from "@/components/shared/data-table";
import { useModuleAi } from "@/components/module/module-ai-context";
import { useFormatCurrency } from "@/lib/hooks/use-currency";

type AssetRow = {
  id: string;
  name: string;
  assetClass: string;
  status: string;
  cost: string;
  netBookValue: string;
};

export function AssetsView() {
  const { format } = useFormatCurrency();
  const { entityId, entityCurrency } = useEntity();
  const { openWithFocus } = useModuleAi();

  const { data, isLoading } = trpc.fixedAssets.listAssets.useQuery(undefined, { enabled: !!entityId });

  const assets = ((data as any)?.assets ?? (data as any) ?? []) as AssetRow[];
  const list = Array.isArray(assets) ? assets : [];

  const columns: Column<AssetRow>[] = [
    { key: "name", label: "Asset", render: (r) => <span className="text-sm font-medium">{r.name}</span> },
    { key: "assetClass", label: "Class", render: (r) => <span className="text-xs text-muted-foreground capitalize">{r.assetClass}</span> },
    { key: "status", label: "Status", render: (r) => <span className="text-xs capitalize">{r.status}</span> },
    { key: "cost", label: "Cost", align: "right", render: (r) => <span className="text-sm tabular-nums">{format(parseFloat(r.cost ?? "0"), entityCurrency ?? "USD")}</span> },
    { key: "netBookValue", label: "Book Value", align: "right", render: (r) => <span className="text-sm tabular-nums">{format(parseFloat(r.netBookValue ?? "0"), entityCurrency ?? "USD")}</span> },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-muted-foreground">{isLoading ? "Loading..." : `${list.length} assets`}</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => openWithFocus({ kind: "Fixed Assets", name: "Fixed Assets" }, "Show me my fixed assets and depreciation")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10"
          >
            <Bot className="h-3.5 w-3.5" /> Ask AI
          </button>
          <button
            type="button"
            onClick={() => openWithFocus({ kind: "Fixed Assets", name: "New Asset" }, "Help me create a fixed asset")}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-3.5 w-3.5" /> Add Asset
          </button>
        </div>
      </div>
      <DataTable<AssetRow>
        columns={columns}
        data={list}
        isLoading={isLoading}
        searchPlaceholder="Search assets..."
        emptyIcon={Building2}
        emptyTitle="No assets yet"
        emptyDescription="Add fixed assets. AI will calculate depreciation."
        onRowClick={(row) => openWithFocus({ kind: "Asset", name: row.name, id: row.id }, `Show me ${row.name}`)}
        showSearch
        showPagination
        pageSize={20}
      />
    </div>
  );
}
