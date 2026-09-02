"use client";

import { useMemo, useState, useCallback } from "react";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui";
import { useFormatCurrency } from "@/lib/hooks/use-currency";

// ─── Types ─────────────────────────────────────────────────────────────────

export type TableCell = string | number | boolean | null;

export type DataTableColumn = {
  key: string;
  label: string;
  sortable?: boolean;
  align?: "left" | "center" | "right";
  format?: "currency" | "number" | "percent" | "date" | "text";
  currency?: string;
  width?: number;
  className?: string;
};

export type DataTableRow = {
  id: string;
  cells: Record<string, TableCell>;
  /** Optional detail data shown when row is clicked */
  detail?: Record<string, TableCell>;
  /** Whether this row is expandable */
  expandable?: boolean;
};

export type DataTableSummary = {
  label: string;
  cells: Record<string, TableCell>;
};

export type DataTableAction = {
  label: string;
  icon?: React.ReactNode;
  onClick: (selectedRows: string[]) => void;
  variant?: "default" | "primary" | "destructive";
  requiresSelection?: boolean;
};

export type DataTableProps = {
  title?: string;
  columns: DataTableColumn[];
  rows: DataTableRow[];
  summary?: DataTableSummary;
  actions?: DataTableAction[];
  /** Enable row selection */
  selectable?: boolean;
  /** Enable row click to expand */
  expandable?: boolean;
  /** Enable export to Excel */
  exportable?: boolean;
  /** Enable search/filter */
  filterable?: boolean;
  /** Enable pagination */
  paginated?: boolean;
  /** Default page size */
  pageSize?: number;
  /** Currency for formatting */
  currency?: string;
  /** Compact mode (fewer paddings) */
  compact?: boolean;
  /** Callback when a row is clicked */
  onRowClick?: (row: DataTableRow) => void;
  /** Optional className */
  className?: string;
};

// ─── Formatters ────────────────────────────────────────────────────────────

function format(value: number, currency = "USD", locale = "en-US"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatPercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function formatDate(value: string | number): string {
  const date = new Date(value);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatCell(
  value: TableCell,
  column: DataTableColumn,
  currency?: string,
): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";

  switch (column.format) {
    case "currency":
      return format(Number(value), column.currency ?? currency ?? "USD");
    case "number":
      return formatNumber(Number(value));
    case "percent":
      return formatPercent(Number(value));
    case "date":
      return formatDate(value as string);
    default:
      return String(value);
  }
}

// ─── Export to Excel (CSV) ─────────────────────────────────────────────────

function exportToCSV(
  columns: DataTableColumn[],
  rows: DataTableRow[],
  title: string,
) {
  const headers = columns.map((c) => c.label).join(",");
  const data = rows.map((row) =>
    columns
      .map((col) => {
        const val = row.cells[col.key];
        if (val === null || val === undefined) return "";
        const str = String(val);
        // Escape CSV special characters
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      })
      .join(","),
  );

  const csv = [headers, ...data].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

// ─── Component ─────────────────────────────────────────────────────────────

export function DataTableInline({
  title,
  columns,
  rows,
  summary,
  actions,
  selectable = false,
  expandable = false,
  exportable = true,
  filterable = true,
  paginated = true,
  pageSize: defaultPageSize = 10,
  currency,
  compact = false,
  onRowClick,
  className,
}: DataTableProps) {
  const { format } = useFormatCurrency();
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // ── Sort ──────────────────────────────────────────────────────────────
  const handleSort = useCallback(
    (key: string) => {
      if (sortKey === key) {
        setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        setSortKey(key);
        setSortDir("asc");
      }
    },
    [sortKey],
  );

  // ── Filter ────────────────────────────────────────────────────────────
  const filteredRows = useMemo(() => {
    if (!filter.trim()) return rows;
    const lower = filter.toLowerCase();
    return rows.filter((row) =>
      columns.some((col) => {
        const val = row.cells[col.key];
        if (val === null || val === undefined) return false;
        return String(val).toLowerCase().includes(lower);
      }),
    );
  }, [rows, filter, columns]);

  // ── Sort rows ─────────────────────────────────────────────────────────
  const sortedRows = useMemo(() => {
    if (!sortKey) return filteredRows;
    return [...filteredRows].sort((a, b) => {
      const aVal = a.cells[sortKey];
      const bVal = b.cells[sortKey];
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }
      const cmp = String(aVal).localeCompare(String(bVal));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filteredRows, sortKey, sortDir]);

  // ── Paginate ──────────────────────────────────────────────────────────
  const totalPages = Math.ceil(sortedRows.length / pageSize);
  const paginatedRows = paginated
    ? sortedRows.slice(page * pageSize, (page + 1) * pageSize)
    : sortedRows;

  // ── Selection ─────────────────────────────────────────────────────────
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === paginatedRows.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedRows.map((r) => r.id)));
    }
  }, [selectedIds.size, paginatedRows]);

  // ── Expand ────────────────────────────────────────────────────────────
  const toggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  // ── Keyboard nav ──────────────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, rowId: string) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onRowClick?.(rows.find((r) => r.id === rowId)!);
      }
    },
    [onRowClick, rows],
  );

  const currentCurrency =
    columns.find((c) => c.format === "currency")?.currency ?? currency;

  return (
    <div
      className={cn(
        "rounded-xl border border-border/50 bg-card/80 overflow-hidden",
        isFullscreen && "fixed inset-4 z-50 flex flex-col",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-border/30 px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          {title && (
            <h3 className="text-sm font-semibold text-foreground truncate">
              {title}
            </h3>
          )}
          <span className="shrink-0 rounded-full bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            {rows.length} row{rows.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {exportable && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => exportToCSV(columns, rows, title ?? "data")}
              aria-label="Export to CSV"
            >
              <Download className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setIsFullscreen((prev) => !prev)}
            aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>

      {/* Search */}
      {filterable && (
        <div className="border-b border-border/20 px-4 py-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50" />
            <input
              type="text"
              placeholder="Filter rows..."
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
                setPage(0);
              }}
              className="w-full rounded-lg border border-border/30 bg-background/50 py-1.5 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/30 focus:ring-1 focus:ring-primary/10"
              aria-label="Filter table rows"
            />
          </div>
        </div>
      )}

      {/* Batch actions bar */}
      {selectable && selectedIds.size > 0 && (
        <div className="flex items-center gap-3 border-b border-primary/20 bg-primary/5 px-4 py-2">
          <span className="text-xs font-medium text-primary">
            {selectedIds.size} selected
          </span>
          {actions?.map((action) => (
            <Button
              key={action.label}
              variant={
                action.variant === "destructive" ? "destructive" : "default"
              }
              size="sm"
              className="h-6 text-[10px]"
              onClick={() => action.onClick(Array.from(selectedIds))}
            >
              {action.label}
            </Button>
          ))}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-[10px]"
            onClick={() => setSelectedIds(new Set())}
          >
            Clear
          </Button>
        </div>
      )}

      {/* Table */}
      <div
        className={cn(
          "overflow-auto",
          isFullscreen ? "flex-1" : "max-h-[400px]",
        )}
      >
        <table className="w-full text-xs" role="grid">
          <thead className="sticky top-0 z-10 bg-muted/30">
            <tr>
              {selectable && (
                <th className="w-8 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={
                      paginatedRows.length > 0 &&
                      selectedIds.size === paginatedRows.length
                    }
                    onChange={toggleSelectAll}
                    className="h-3.5 w-3.5 rounded border-border"
                    aria-label="Select all rows"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-3 py-2 text-left font-medium text-muted-foreground",
                    col.sortable !== false &&
                      "cursor-pointer select-none hover:text-foreground",
                    col.align === "right" && "text-right",
                    col.align === "center" && "text-center",
                    col.className,
                  )}
                  style={col.width ? { width: col.width } : undefined}
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                  aria-sort={
                    sortKey === col.key
                      ? sortDir === "asc"
                        ? "ascending"
                        : "descending"
                      : undefined
                  }
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {col.sortable !== false && (
                      <span className="text-muted-foreground/40">
                        {sortKey === col.key ? (
                          sortDir === "asc" ? (
                            <ArrowUp className="h-3 w-3" />
                          ) : (
                            <ArrowDown className="h-3 w-3" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3 w-3" />
                        )}
                      </span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedRows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="px-4 py-8 text-center text-muted-foreground/60"
                >
                  {filter ? "No rows match your filter" : "No data available"}
                </td>
              </tr>
            ) : (
              paginatedRows.map((row) => (
                <>
                  <tr
                    key={row.id}
                    className={cn(
                      "border-t border-border/20 transition-colors",
                      onRowClick && "cursor-pointer hover:bg-muted/20",
                      selectedIds.has(row.id) && "bg-primary/5",
                    )}
                    onClick={() => {
                      if (expandable) toggleExpand(row.id);
                      onRowClick?.(row);
                    }}
                    onKeyDown={(e) => handleKeyDown(e, row.id)}
                    tabIndex={onRowClick ? 0 : undefined}
                    role={onRowClick ? "button" : undefined}
                  >
                    {selectable && (
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(row.id)}
                          onChange={(e) => {
                            e.stopPropagation();
                            toggleSelect(row.id);
                          }}
                          className="h-3.5 w-3.5 rounded border-border"
                          aria-label={`Select row ${row.id}`}
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={cn(
                          compact ? "px-2 py-1" : "px-3 py-2",
                          "text-foreground",
                          col.align === "right" && "text-right tabular-nums",
                          col.align === "center" && "text-center",
                          col.className,
                        )}
                      >
                        {formatCell(row.cells[col.key], col, currentCurrency)}
                      </td>
                    ))}
                  </tr>
                  {/* Expanded detail row */}
                  {expandable && expandedId === row.id && row.detail && (
                    <tr key={`${row.id}-detail`} className="bg-muted/10">
                      <td
                        colSpan={columns.length + (selectable ? 1 : 0)}
                        className="px-4 py-3"
                      >
                        <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3 md:grid-cols-4">
                          {Object.entries(row.detail).map(([key, val]) => (
                            <div key={key}>
                              <span className="text-muted-foreground/60">
                                {key}:
                              </span>{" "}
                              <span className="font-medium text-foreground">
                                {val === null || val === undefined
                                  ? "—"
                                  : String(val)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))
            )}

            {/* Summary row */}
            {summary && paginatedRows.length > 0 && (
              <tr className="border-t-2 border-border/40 bg-muted/20 font-semibold">
                {selectable && <td className="px-3 py-2" />}
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      compact ? "px-2 py-1" : "px-3 py-2",
                      "text-foreground",
                      col.align === "right" && "text-right tabular-nums",
                      col.align === "center" && "text-center",
                    )}
                  >
                    {summary.cells[col.key] !== undefined
                      ? formatCell(summary.cells[col.key], col, currentCurrency)
                      : ""}
                  </td>
                ))}
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {paginated && totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border/30 px-4 py-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground/60">
              Page {page + 1} of {totalPages}
            </span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(0);
              }}
              className="rounded border border-border/30 bg-background px-1.5 py-0.5 text-[10px] text-foreground outline-none"
              aria-label="Rows per page"
            >
              {[10, 25, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size} / page
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              disabled={page === 0}
              onClick={() => setPage(0)}
              aria-label="First page"
            >
              <ChevronsLeft className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              aria-label="Next page"
            >
              <ChevronRight className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(totalPages - 1)}
              aria-label="Last page"
            >
              <ChevronsRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      {/* Keyboard hint */}
      {onRowClick && (
        <div className="border-t border-border/20 px-4 py-1.5">
          <p className="text-[9px] text-muted-foreground/40">
            Click a row for details
            {expandable && " • Click again to expand"}
          </p>
        </div>
      )}
    </div>
  );
}
