"use client";

import { useState } from "react";
import {
  Plus,
  Search,
  Bot,
  ChevronRight,
  MoreHorizontal,
  FileText,
  Users,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

import { useEntity } from "@/lib/entity-context";
import { trpc } from "@/lib/trpc/client";
import { cn, formatCurrency } from "@/lib/utils";
import { DataTable, type Column } from "@/components/shared/data-table";
import { ModulePageShell } from "@/components/module/module-page-shell";
import { useModuleAi } from "@/components/module/module-ai-context";

// ─── Types ─────────────────────────────────────────────────────────────────

export type DataListPageProps<T extends Record<string, unknown>> = {
  title: string;
  description: string;
  icon: LucideIcon;
  /** tRPC query to fetch data */
  useDataQuery: (params: {
    entityId: string;
    search: string;
    filter: string;
    limit: number;
    offset: number;
  }) => { data: unknown; isLoading: boolean };
  /** Columns for the data table */
  columns: Column<T>[];
  /** Map row to link href */
  getRowHref?: (row: T) => string;
  /** Map row to AI context */
  getRowAiContext?: (row: T) => {
    kind: string;
    name: string;
    fields: { label: string; value: string }[];
    prompt: string;
  };
  /** Filter options */
  filters?: { label: string; value: string; count?: number }[];
  /** Search placeholder */
  searchPlaceholder?: string;
  /** Empty state */
  emptyIcon?: LucideIcon;
  emptyTitle?: string;
  emptyDescription?: string;
  /** Create button */
  createLabel?: string;
  createHref?: string;
  onCreateClick?: () => void;
  /** AI suggestions */
  aiSuggestions?: { label: string; prompt: string }[];
  /** Extract total count from data */
  getTotalCount?: (data: unknown) => number;
  /** Extract items from data */
  getItems?: (data: unknown) => T[];
};

// ─── Data List Page ────────────────────────────────────────────────────────

export function DataListPage<T extends Record<string, unknown>>({
  title,
  description,
  icon,
  useDataQuery,
  columns,
  getRowHref,
  getRowAiContext,
  filters,
  searchPlaceholder = "Search...",
  emptyIcon,
  emptyTitle = "No items yet",
  emptyDescription,
  createLabel,
  createHref,
  onCreateClick,
  aiSuggestions,
  getTotalCount,
  getItems,
}: DataListPageProps<T>) {
  const { entityId } = useEntity();
  const { openWithFocus } = useModuleAi();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const { data, isLoading } = useDataQuery({
    entityId,
    search,
    filter,
    limit: 50,
    offset: 0,
  });

  const items = getItems?.(data) ?? [];
  const totalCount = getTotalCount?.(data) ?? items.length;

  // Wrap columns to add AI context on click
  const enhancedColumns = columns.map((col) => ({
    ...col,
    render: (row: T, value: unknown) => {
      if (col.render) return col.render(row, value);
      return String(value ?? "—");
    },
  }));

  const handleRowClick = (row: T) => {
    if (getRowHref) {
      // Navigation handled by DataTable's onRowClick via Link
      return;
    }
    if (getRowAiContext) {
      const ctx = getRowAiContext(row);
      openWithFocus(
        { kind: ctx.kind, name: ctx.name, fields: ctx.fields },
        ctx.prompt,
      );
    }
  };

  return (
    <ModulePageShell
      title={title}
      description={description}
      icon={icon}
      aiSuggestions={aiSuggestions}
    >
      <div className="p-3 pb-20 sm:p-6 md:pb-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-muted-foreground">
              {isLoading ? "Loading..." : `${totalCount} total`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {aiSuggestions && aiSuggestions.length > 0 && (
              <button
                type="button"
                onClick={() =>
                  openWithFocus(
                    { kind: title, name: title },
                    aiSuggestions[0].prompt,
                  )
                }
                className="inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
              >
                <Bot className="h-3.5 w-3.5" />
                Ask AI
              </button>
            )}
            {(createLabel || createHref || onCreateClick) && (
              <div>
                {createHref ? (
                  <Link
                    href={createHref}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {createLabel ?? "Create"}
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={onCreateClick}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {createLabel ?? "Create"}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Data Table */}
        <DataTable<T>
          columns={enhancedColumns}
          data={items}
          isLoading={isLoading}
          searchPlaceholder={searchPlaceholder}
          emptyIcon={emptyIcon}
          emptyTitle={emptyTitle}
          emptyDescription={emptyDescription}
          onRowClick={handleRowClick}
          filters={filters}
          activeFilter={filter}
          onFilterChange={setFilter}
          showSearch={true}
          showPagination={true}
          pageSize={20}
        />
      </div>
    </ModulePageShell>
  );
}
