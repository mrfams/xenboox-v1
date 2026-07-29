"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  ChevronUp,
  ChevronDown,
  Search,
  CheckSquare,
  Square,
  ArrowUpDown,
} from "lucide-react";

export interface ColumnDef<T> {
  key: string;
  header: string;
  cell: (item: T) => React.ReactNode;
  sortable?: boolean;
  align?: "left" | "right" | "center";
  width?: string;
}

interface DataViewTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  onSelectionChange?: (selectedIds: string[]) => void;
  rowActions?: (item: T) => React.ReactNode;
  className?: string;
  emptyMessage?: string;
}

export function DataViewTable<T>({
  columns,
  data,
  keyExtractor,
  onSelectionChange,
  rowActions,
  className,
  emptyMessage = "No records found.",
}: DataViewTableProps<T>) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const allSelected = data.length > 0 && selectedIds.size === data.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < data.length;

  const toggleAll = () => {
    const next = allSelected
      ? new Set<string>()
      : new Set(data.map(keyExtractor));
    setSelectedIds(next);
    onSelectionChange?.(Array.from(next));
  };

  const toggleOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
    onSelectionChange?.(Array.from(next));
  };

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Search className="h-8 w-8 text-muted-foreground/30 mb-2" />
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={cn("overflow-hidden rounded-lg border", className)}>
      {/* Bulk actions bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 border-b bg-accent/50 px-3 py-2">
          <span className="text-xs font-medium text-muted-foreground">
            {selectedIds.size} selected
          </span>
          <div className="ml-auto flex items-center gap-1">
            <button className="rounded-md px-2 py-1 text-[10px] font-medium text-signal-indigo hover:bg-signal-indigo/10 transition-colors">
              Explain
            </button>
            <button className="rounded-md px-2 py-1 text-[10px] font-medium text-signal-indigo hover:bg-signal-indigo/10 transition-colors">
              Export
            </button>
            <button className="rounded-md px-2 py-1 text-[10px] font-medium text-destructive hover:bg-destructive/10 transition-colors">
              Clear
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/30">
              {onSelectionChange && (
                <th className="w-8 px-2 py-2.5">
                  <button
                    onClick={toggleAll}
                    className="flex items-center justify-center"
                  >
                    {allSelected ? (
                      <CheckSquare className="h-3.5 w-3.5 text-primary" />
                    ) : (
                      <Square
                        className={cn(
                          "h-3.5 w-3.5",
                          someSelected
                            ? "text-primary"
                            : "text-muted-foreground",
                        )}
                      />
                    )}
                  </button>
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground",
                    col.align === "right" && "text-right",
                    col.align === "center" && "text-center",
                  )}
                  style={col.width ? { width: col.width } : undefined}
                >
                  {col.sortable ? (
                    <button
                      onClick={() => handleSort(col.key)}
                      className="flex items-center gap-1 hover:text-foreground transition-colors"
                    >
                      {col.header}
                      {sortKey === col.key ? (
                        sortDir === "asc" ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )
                      ) : (
                        <ArrowUpDown className="h-2.5 w-2.5 opacity-30" />
                      )}
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              ))}
              {rowActions && (
                <th className="w-16 px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.map((item) => {
              const id = keyExtractor(item);
              const isSelected = selectedIds.has(id);
              return (
                <tr
                  key={id}
                  className={cn(
                    "transition-colors hover:bg-accent/30",
                    isSelected && "bg-primary/5",
                  )}
                >
                  {onSelectionChange && (
                    <td className="w-8 px-2 py-2.5">
                      <button
                        onClick={() => toggleOne(id)}
                        className="flex items-center justify-center"
                      >
                        {isSelected ? (
                          <CheckSquare className="h-3.5 w-3.5 text-primary" />
                        ) : (
                          <Square className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </button>
                    </td>
                  )}
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        "px-3 py-2.5 text-xs",
                        col.align === "right" && "text-right tabular-nums",
                        col.align === "center" && "text-center",
                      )}
                    >
                      {col.cell(item)}
                    </td>
                  ))}
                  {rowActions && (
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1">
                        {rowActions(item)}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
