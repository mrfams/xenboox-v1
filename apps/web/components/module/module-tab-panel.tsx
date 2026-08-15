import type { ReactNode } from "react";
import { RefreshCw } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Standard content wrapper for a module tab panel. Gives every tab a
 * consistent compact header (icon optional) above its content, matching
 * the ModulePageShell chrome (13px titles, slate palette, hairline borders).
 */
export function ModulePanel({
  title,
  description,
  action,
  children,
  className,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("bg-white", className)}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-4 py-2.5">
          <div className="min-w-0">
            {title && (
              <h3 className="truncate text-[13px] font-semibold text-slate-900">
                {title}
              </h3>
            )}
            {description && (
              <p className="truncate text-[11px] text-slate-500">
                {description}
              </p>
            )}
          </div>
          {action && (
            <div className="flex shrink-0 items-center gap-2">{action}</div>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

/**
 * Honest empty state for a tab whose feature has no backend data yet.
 * Uses the module's own icon + a single relevant CTA when one exists —
 * never fabricated numbers.
 */
export function ModulePanelEmpty({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-6 py-16 text-center",
        className,
      )}
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
        <Icon className="h-7 w-7 text-slate-400" />
      </div>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <p className="mt-1.5 max-w-md text-[13px] leading-5 text-slate-500">
        {description}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/** Loading skeleton used while a tab panel's query is in flight. */
export function ModulePanelLoading({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <RefreshCw className="h-7 w-7 animate-spin text-slate-300" />
      <div className="mt-6 w-full max-w-3xl space-y-2 px-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="h-9 animate-pulse rounded-lg bg-slate-100"
            style={{ opacity: 1 - i * 0.12 }}
          />
        ))}
      </div>
    </div>
  );
}
