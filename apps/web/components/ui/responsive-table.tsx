"use client";

import { cn } from "@/lib/utils";

type Column = { key: string; header: string; className?: string };
type Row = Record<string, React.ReactNode>;

export function ResponsiveTable({
  columns,
  rows,
  caption,
}: {
  columns: Column[];
  rows: Row[];
  caption?: string;
}) {
  if (rows.length === 0) return null;
  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block overflow-hidden rounded-xl border border-border/50">
        <table className="w-full text-xs" aria-label={caption}>
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead>
            <tr className="border-b bg-muted/50">
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className={cn(
                    "px-3 py-2 text-left font-medium text-muted-foreground",
                    c.className,
                  )}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b last:border-0 hover:bg-muted/20">
                {columns.map((c) => (
                  <td key={c.key} className={cn("px-3 py-2", c.className)}>
                    {r[c.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Mobile cards */}
      <div className="md:hidden space-y-2" role="list" aria-label={caption}>
        {rows.map((r, i) => (
          <div
            key={i}
            role="listitem"
            className="rounded-xl border border-border/50 bg-card p-4 space-y-2"
          >
            {columns.map((c) => (
              <div key={c.key} className="flex justify-between gap-4">
                <dt className="text-xs text-muted-foreground">{c.header}</dt>
                <dd className="text-xs text-foreground text-right">
                  {r[c.key]}
                </dd>
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
