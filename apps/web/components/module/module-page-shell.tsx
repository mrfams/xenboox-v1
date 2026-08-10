"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

import { ModulePageCopilot } from "./module-page-copilot";
import type { ModulePageShellProps } from "./module-page-shell.types";

import type { PageContextPayload } from "@/lib/chat/page-context";
import { cn } from "@/lib/utils";

/**
 * Persistent collapse state (localStorage) so the user's preference
 * carries across module pages. SSR-safe — falls back to the default.
 */
function useCollapsed(key: string, initial: boolean) {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return initial;
    try {
      const stored = window.localStorage.getItem(`xb:shell:${key}`);
      return stored === null ? initial : stored === "1";
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(`xb:shell:${key}`, collapsed ? "1" : "0");
    } catch {
      /* storage unavailable — non-critical */
    }
  }, [collapsed, key]);

  return [collapsed, setCollapsed] as const;
}

function SectionToggle({
  collapsed,
  onToggle,
  label,
  className,
}: {
  collapsed: boolean;
  onToggle: () => void;
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600",
        className,
      )}
      title={collapsed ? `Show ${label}` : `Hide ${label}`}
      aria-expanded={!collapsed}
      aria-label={`${collapsed ? "Show" : "Hide"} ${label}`}
    >
      {collapsed ? (
        <ChevronDown className="h-3.5 w-3.5" />
      ) : (
        <ChevronUp className="h-3.5 w-3.5" />
      )}
    </button>
  );
}

/**
 * ModulePageShell — the single standard scaffold for every module page.
 *
 * Design principles (applied app-wide):
 *  - Natural document flow: NO fixed viewport height. The page grows with
 *    its content and the dashboard <main> scrolls it as one unit. The
 *    header + tabs stay pinned via `sticky` so context is never lost.
 *  - Compact chrome: every band is sized to its content — slim header,
 *    tight underline tabs, a hairline-divided KPI metric strip instead of
 *    a chunky card grid, and a slim filter bar. The content, not the
 *    chrome, owns the vertical space.
 *  - Every chrome band (tabs / summary / filters) is collapsible and the
 *    preference persists in localStorage.
 */
export function ModulePageShell({
  title,
  description,
  icon: Icon,
  iconBgClassName,
  badge,
  actions,
  tabs,
  activeTab,
  onTabChange,
  summaryCards,
  filters,
  children,
  pagination,
  bottomCharts,
  defaultCollapsed,
  noOuterWrapper,
  aiContext,
  aiSuggestions,
  disableAiCopilot = false,
}: ModulePageShellProps) {
  const [tabsCollapsed, setTabsCollapsed] = useCollapsed(
    "tabs",
    defaultCollapsed?.tabs ?? false,
  );
  const [cardsCollapsed, setCardsCollapsed] = useCollapsed(
    "summaryCards",
    defaultCollapsed?.summaryCards ?? false,
  );
  const [filtersCollapsed, setFiltersCollapsed] = useCollapsed(
    "filters",
    defaultCollapsed?.filters ?? false,
  );

  const hasTabs = tabs && tabs.length > 0;
  const hasSummaryCards = summaryCards && summaryCards.length > 0;
  const hasFilters = !!filters;

  // Baseline page context derived from the shell itself, so every module page
  // gets a meaningful copilot even before a page passes explicit aiContext.
  const derivedAiContext: Partial<PageContextPayload> = useMemo(() => {
    const activeTabLabel =
      tabs?.find((t) => t.key === activeTab)?.label ?? activeTab;
    return {
      page: title,
      view: activeTabLabel,
      summary: (summaryCards ?? []).map((c) => ({
        label: c.label,
        value: c.value,
      })),
      ...aiContext,
    };
  }, [title, tabs, activeTab, summaryCards, aiContext]);

  const shell = (
    <>
      {/* ── Sticky chrome: header + tabs ─────────────────────────── */}
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-white">
        {/* Header row */}
        <div className="flex items-center justify-between gap-4 px-4 py-2">
          <div className="flex min-w-0 items-center gap-2.5">
            {Icon && (
              <div
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                  iconBgClassName ?? "bg-indigo-50",
                )}
              >
                <Icon
                  className={cn(
                    "h-3.5 w-3.5",
                    iconBgClassName ? "text-white" : "text-indigo-600",
                  )}
                />
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-[15px] font-semibold leading-5 tracking-tight text-slate-900">
                  {title}
                </h1>
                {badge}
              </div>
              {description && (
                <p className="truncate text-[11px] leading-4 text-slate-500">
                  {description}
                </p>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {actions}
            {!disableAiCopilot && (
              <ModulePageCopilot
                title={title}
                pageContext={derivedAiContext}
                suggestions={aiSuggestions}
              />
            )}
          </div>
        </div>

        {/* Underline tab bar */}
        {hasTabs && (
          <div className="flex items-center justify-between gap-4 px-4">
            {!tabsCollapsed ? (
              <div className="flex items-center gap-5 overflow-x-auto">
                {tabs!.map((tab) => {
                  const isActive = activeTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => {
                        tab.onClick?.();
                        onTabChange?.(tab.key);
                      }}
                      className={cn(
                        "relative flex items-center gap-1.5 whitespace-nowrap border-b-2 px-0.5 py-1.5 text-[13px] font-medium transition-colors",
                        isActive
                          ? "border-indigo-600 text-indigo-600"
                          : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800",
                      )}
                      id={`module-tab-${tab.key}`}
                      role="tab"
                      aria-selected={isActive}
                      aria-controls={`module-panel-${tab.key}`}
                    >
                      {tab.label}
                      {tab.count !== undefined && (
                        <span
                          className={cn(
                            "inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-semibold tabular-nums",
                            isActive
                              ? "bg-indigo-100 text-indigo-700"
                              : "bg-slate-100 text-slate-500",
                          )}
                        >
                          {tab.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Tabs collapsed
                </span>
              </div>
            )}
            <SectionToggle
              collapsed={tabsCollapsed}
              onToggle={() => setTabsCollapsed((v) => !v)}
              label="tabs"
            />
          </div>
        )}
      </div>

      {/* ── KPI metric strip (compact, hairline-divided) ─────────── */}
      {hasSummaryCards && (
        <div className="border-b border-slate-200 bg-slate-50/70">
          {!cardsCollapsed ? (
            <div className="group relative">
              {/* The floating collapse toggle sits at the strip's top-right
                  corner — pad whichever cell occupies that corner at each
                  breakpoint (2nd on mobile, 3rd on md, 5th on xl), so card
                  content never runs under it, even when cards wrap. */}
              <div className="grid grid-cols-2 gap-px bg-slate-200/70 md:grid-cols-3 xl:grid-cols-5 [&>*:last-child]:pr-8 [&>*:nth-child(2)]:pr-8 md:[&>*:nth-child(3)]:pr-8 xl:[&>*:nth-child(5)]:pr-8">
                {summaryCards!.map((card) => (
                  <div
                    key={card.label}
                    className="flex min-w-0 items-center gap-2.5 bg-white px-3 py-2"
                  >
                    <div
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                        card.bgColor,
                      )}
                    >
                      <card.icon className={cn("h-3.5 w-3.5", card.color)} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-[10px] font-medium text-slate-500">
                          {card.label}
                        </p>
                        {card.subtitle && (
                          <span className="shrink-0 truncate text-[9px] text-slate-400">
                            {card.subtitle}
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex items-baseline gap-1.5">
                        <span className="truncate text-[15px] font-semibold leading-5 tabular-nums text-slate-900">
                          {card.value}
                        </span>
                        {card.change !== undefined && (
                          <span
                            className={cn(
                              "shrink-0 text-[10px] font-semibold tabular-nums",
                              card.change >= 0
                                ? "text-emerald-600"
                                : "text-red-600",
                            )}
                          >
                            {card.change >= 0 ? "↑" : "↓"}{" "}
                            {Math.abs(card.change)}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <SectionToggle
                collapsed={cardsCollapsed}
                onToggle={() => setCardsCollapsed((v) => !v)}
                label="summary cards"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-white/90 shadow-sm ring-1 ring-slate-200"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2 px-4 py-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Overview
              </span>
              <SectionToggle
                collapsed={cardsCollapsed}
                onToggle={() => setCardsCollapsed((v) => !v)}
                label="summary cards"
              />
            </div>
          )}
        </div>
      )}

      {/* ── Filters (compact, collapsible) ───────────────────────── */}
      {hasFilters && (
        <div className="border-b border-slate-200 bg-white px-4 py-2">
          {!filtersCollapsed ? (
            <div className="flex items-center gap-3">
              <div className="flex flex-1 items-center gap-2 overflow-x-auto">
                {filters}
              </div>
              <SectionToggle
                collapsed={filtersCollapsed}
                onToggle={() => setFiltersCollapsed((v) => !v)}
                label="filters"
              />
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Filters hidden
              </span>
              <SectionToggle
                collapsed={filtersCollapsed}
                onToggle={() => setFiltersCollapsed((v) => !v)}
                label="filters"
              />
            </div>
          )}
        </div>
      )}

      {/* ── Content (natural height — the dashboard <main> scrolls) ── */}
      {hasTabs ? (
        <div
          role="tabpanel"
          id={`module-panel-${activeTab}`}
          aria-labelledby={`module-tab-${activeTab}`}
          className="flex-1 bg-white"
        >
          {children}
        </div>
      ) : (
        <div className="flex-1 bg-white">{children}</div>
      )}

      {pagination && (
        <div className="border-t border-slate-200 bg-white px-4 py-2.5">
          {pagination}
        </div>
      )}

      {bottomCharts && (
        <div className="border-t border-slate-200 bg-slate-50/70 px-4 py-3">
          {bottomCharts}
        </div>
      )}
    </>
  );

  if (noOuterWrapper) return shell;

  return <div className="flex min-h-full flex-col bg-white">{shell}</div>;
}
