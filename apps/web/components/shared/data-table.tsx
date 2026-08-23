"use client";

import { useState, useMemo } from "react";
import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  Filter,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── CSV Export Helper ─────────────────────────────────────────────────────

function flattenValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    if (value instanceof Date) return value.toLocaleDateString();
    return JSON.stringify(value);
  }
  return String(value);
}

function convertToCSV<T>(data: T[], columns: Column<T>[]): string {
  const headers = columns.filter((c) => c.label).map((c) => c.label);
  const rows = data.map((row) =>
    columns
      .filter((c) => c.label)
      .map((col) => {
        const value = row[col.key];
        return flattenValue(value).replace(/"/g, '""');
      }),
  );

  const csvContent = [
    headers.map((h) => `"${h}"`).join(","),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
  ].join("\n");

  return csvContent;
}

function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

// ─── Types ─────────────────────────────────────────────────────────────────

export type SortDirection = "asc" | "desc" | null;

export type Column<T> = {
  key: string;
  label: string;
  sortable?: boolean;
  className?: string;
  render?: (row: T, value: unknown) => React.ReactNode;
  align?: "left" | "center" | "right";
  width?: string;
};

export type DataTableProps<T> = {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  searchPlaceholder?: string;
  searchKey?: string;
  emptyIcon?: LucideIcon;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  onRowClick?: (row: T) => void;
  pageSize?: number;
  showPagination?: boolean;
  showSearch?: boolean;
  showExport?: boolean;
  onExport?: () => void;
  filters?: {
    label: string;
    value: string;
    count?: number;
  }[];
  activeFilter?: string;
  onFilterChange?: (value: string) => void;
  className?: string;
  rowClassName?: (row: T) => string;
  getRowId?: (row: T) => string;
  selectedRows?: string[];
  onSelectionChange?: (ids: string[]) => void;
  bulkActions?: React.ReactNode;
};

// ─── Sort Icon ─────────────────────────────────────────────────────────────

function SortIcon({ direction }: { direction: SortDirection }) {
  if (direction === "asc") return <ChevronUp className="h-3 w-3" />;
  if (direction === "desc") return <ChevronDown className="h-3 w-3" />;
  return <ChevronsUpDown className="h-3 w-3 opacity-40" />;
}

// ─── Loading Skeleton ──────────────────────────────────────────────────────

function TableSkeleton({
  rows = 5,
  cols = 4,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          {Array.from({ length: cols }).map((_, j) => (
            <div
              key={j}
              className="h-4 animate-pulse rounded bg-muted/30"
              style={{ width: `${60 + Math.random() * 40}%`, flex: 1 }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Empty State ───────────────────────────────────────────────────────────

function EmptyState({
  Icon,
  title,
  description,
  action,
}: {
  Icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {Icon && <Icon className="h-12 w-12 text-muted-foreground/30 mb-3" />}
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && (
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ─── Data Table ────────────────────────────────────────────────────────────

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  isLoading = false,
  searchPlaceholder = "Search...",
  searchKey,
  emptyIcon,
  emptyTitle = "No data",
  emptyDescription,
  emptyAction,
  onRowClick,
  pageSize = 20,
  showPagination = true,
  showSearch = true,
  showExport = false,
  onExport,
  filters,
  activeFilter,
  onFilterChange,
  className,
  rowClassName,
  getRowId,
  selectedRows = [],
  onSelectionChange,
  bulkActions,
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>(null);
  const [page, setPage] = useState(0);

  // Filter data
  const filteredData = useMemo(() => {
    let result = data;

    // Search filter
    if (search && searchKey) {
      const lowerSearch = search.toLowerCase();
      result = result.filter((row) => {
        const value = row[searchKey];
        return String(value ?? "")
          .toLowerCase()
          .includes(lowerSearch);
      });
    }

    // Sort
    if (sortKey && sortDir) {
      result = [...result].sort((a, b) => {
        const aVal = a[sortKey];
        const bVal = b[sortKey];
        const comparison = String(aVal ?? "").localeCompare(String(bVal ?? ""));
        return sortDir === "asc" ? comparison : -comparison;
      });
    }

    return result;
  }, [data, search, searchKey, sortKey, sortDir]);

  // Paginate
  const totalPages = Math.ceil(filteredData.length / pageSize);
  const paginatedData = filteredData.slice(
    page * pageSize,
    (page + 1) * pageSize,
  );

  // Handle sort
  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDir === "asc") setSortDir("desc");
      else if (sortDir === "desc") {
        setSortKey(null);
        setSortDir(null);
      }
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  // Handle selection
  const isSelected = (id: string) => selectedRows.includes(id);
  const toggleRow = (id: string) => {
    if (!onSelectionChange) return;
    if (isSelected(id)) {
      onSelectionChange(selectedRows.filter((r) => r !== id));
    } else {
      onSelectionChange([...selectedRows, id]);
    }
  };
  const toggleAll = () => {
    if (!onSelectionChange) return;
    const allIds = paginatedData.map((row) =>
      getRowId ? getRowId(row) : String(row.id),
    );
    if (selectedRows.length === allIds.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(allIds);
    }
  };

  // Show loading state inside the table structure
  if (isLoading && data.length === 0) {
    return (
      <div className={cn("space-y-3", className)}>
        {/* Search skeleton */}
        {showSearch && (
          <div className="h-10 animate-pulse rounded-lg bg-muted/30" />
        )}
        {/* Table skeleton */}
        <div className="rounded-xl border border-border/50 overflow-hidden">
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                {columns.map((col, j) => (
                  <div
                    key={j}
                    className="h-4 animate-pulse rounded bg-muted/30"
                    style={{ flex: 1, maxWidth: col.width }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-muted-foreground text-center">
          Loading {searchPlaceholder?.toLowerCase().replace("search ", "")}...
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Search + Filters + Export */}
      {(showSearch || filters || showExport) && (
        <div className="flex items-center gap-2 flex-wrap">
          {showSearch && (
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                placeholder={searchPlaceholder}
                className="w-full rounded-lg border border-border/50 bg-background py-2 pl-9 pr-8 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/10"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-accent"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}

          {filters && (
            <div className="flex items-center gap-1 overflow-x-auto">
              {filters.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => onFilterChange?.(filter.value)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors whitespace-nowrap",
                    activeFilter === filter.value
                      ? "border-primary/25 bg-primary/10 text-primary"
                      : "border-border/40 bg-background/50 text-muted-foreground/70 hover:border-primary/25 hover:text-primary/80",
                  )}
                >
                  {filter.label}
                  {filter.count !== undefined && filter.count > 0 && (
                    <span className="rounded-full bg-muted/60 px-1.5 py-0.5 text-[9px] font-bold">
                      {filter.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {showExport && (
            <button
              type="button"
              onClick={() => {
                if (onExport) {
                  onExport();
                } else {
                  const csv = convertToCSV(filteredData, columns);
                  const timestamp = new Date().toISOString().split("T")[0];
                  downloadCSV(csv, `export-${timestamp}.csv`);
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:bg-accent"
            >
              <FileSpreadsheet className="h-3 w-3" />
              Export CSV
            </button>
          )}
        </div>
      )}

      {/* Bulk actions */}
      {selectedRows.length > 0 && bulkActions && (
        <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
          <span className="text-xs font-medium text-primary">
            {selectedRows.length} selected
          </span>
          {bulkActions}
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/50">
                {onSelectionChange && (
                  <th className="w-8 px-3 py-2">
                    <input
                      type="checkbox"
                      checked={
                        paginatedData.length > 0 &&
                        selectedRows.length === paginatedData.length
                      }
                      onChange={toggleAll}
                      className="rounded border-border"
                    />
                  </th>
                )}
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={cn(
                      "px-3 py-2 text-left font-medium text-muted-foreground",
                      col.align === "right" && "text-right",
                      col.align === "center" && "text-center",
                      col.sortable &&
                        "cursor-pointer select-none hover:text-foreground",
                    )}
                    style={col.width ? { width: col.width } : undefined}
                    onClick={() => col.sortable && handleSort(col.key)}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      {col.sortable && (
                        <SortIcon
                          direction={sortKey === col.key ? sortDir : null}
                        />
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedData.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + (onSelectionChange ? 1 : 0)}
                    className="px-3 py-12"
                  >
                    <EmptyState
                      Icon={emptyIcon}
                      title={search ? "No results found" : emptyTitle}
                      description={
                        search
                          ? "Try a different search term"
                          : emptyDescription
                      }
                      action={emptyAction}
                    />
                  </td>
                </tr>
              ) : (
                paginatedData.map((row, i) => {
                  const rowId = getRowId ? getRowId(row) : String(row.id ?? i);
                  return (
                    <tr
                      key={rowId}
                      className={cn(
                        "border-b last:border-0 transition-colors",
                        onRowClick && "cursor-pointer hover:bg-muted/30",
                        isSelected(rowId) && "bg-primary/5",
                        rowClassName?.(row),
                      )}
                      onClick={() => onRowClick?.(row)}
                    >
                      {onSelectionChange && (
                        <td
                          className="w-8 px-3 py-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected(rowId)}
                            onChange={() => toggleRow(rowId)}
                            className="rounded border-border"
                          />
                        </td>
                      )}
                      {columns.map((col) => {
                        const value = row[col.key];
                        return (
                          <td
                            key={col.key}
                            className={cn(
                              "px-3 py-2",
                              col.align === "right" && "text-right",
                              col.align === "center" && "text-center",
                              col.className,
                            )}
                          >
                            {col.render
                              ? col.render(row, value)
                              : String(value ?? "—")}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {showPagination && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {filteredData.length} total
            {selectedRows.length > 0 && (
              <span className="ml-1 text-primary">
                · {selectedRows.length} selected
              </span>
            )}
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="rounded-lg border border-border/50 bg-background px-2 py-1 text-xs hover:bg-accent disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="text-xs text-muted-foreground px-2">
              {page + 1} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="rounded-lg border border-border/50 bg-background px-2 py-1 text-xs hover:bg-accent disabled:opacity-40"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
