"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  ChevronRight,
  Compass,
  Sparkles,
  CheckCircle2,
  Clock,
  Circle,
  ArrowRight,
  Bot,
  MousePointerClick,
  Workflow,
  ShieldCheck,
} from "lucide-react";

import { ModulePageShell } from "@/components/module/module-page-shell";
import { cn } from "@/lib/utils";
import { PAGES, PAGE_GROUPS } from "@/lib/explore/pages-directory";
import {
  FEATURES,
  FEATURE_CATEGORIES,
  ASK_XENBOOX_EXPLAINER,
  type FeatureStatus,
} from "@/lib/explore/features-catalog";

// ─── Status meta ────────────────────────────────────────────────────────────

const STATUS_META: Record<
  FeatureStatus,
  { label: string; badge: string; dot: string; description: string }
> = {
  shipped: {
    label: "Shipped",
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    dot: "bg-emerald-500",
    description: "Fully implemented and working",
  },
  partial: {
    label: "In progress",
    badge: "bg-amber-50 text-amber-700 ring-amber-200",
    dot: "bg-amber-500",
    description: "Partially built — some flows wired, not all",
  },
  planned: {
    label: "Planned",
    badge: "bg-slate-100 text-slate-400 ring-slate-200",
    dot: "bg-slate-300",
    description: "On the roadmap — not built yet",
  },
};

const STATUS_ICON: Record<FeatureStatus, typeof Circle> = {
  shipped: CheckCircle2,
  partial: Clock,
  planned: Circle,
};

// ─── Features tab ──────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: FeatureStatus }) {
  const meta = STATUS_META[status];
  const Icon = STATUS_ICON[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset",
        meta.badge,
      )}
    >
      <Icon className="h-3 w-3" />
      {meta.label}
    </span>
  );
}

function AskXenbooxBanner() {
  const steps = [
    {
      icon: MousePointerClick,
      title: "Open it anywhere",
      body: "Click Ask Xenboox on any data page, or open the AI Command Center.",
    },
    {
      icon: Bot,
      title: "Ask, explain, task, or change",
      body: "\u201CSummarize this\u201D, \u201Cexplain this variance\u201D, \u201Crecode these as rent\u201D, \u201Ccreate an invoice for Acme\u201D.",
    },
    {
      icon: Workflow,
      title: "The CFO agent routes it",
      body: "Intent is classified, the right specialist agent runs it, and high-value or low-confidence actions pause for your approval.",
    },
    {
      icon: ShieldCheck,
      title: "Nothing posts without you",
      body: "Every action is confidence-scored, entity-scoped, and recorded in the tamper-evident audit trail.",
    },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-indigo-200/60 bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-600 text-white shadow-sm">
      <div className="flex flex-col gap-6 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold leading-6 tracking-tight">
                {ASK_XENBOOX_EXPLAINER.name} — {ASK_XENBOOX_EXPLAINER.tagline}
              </h2>
              <p className="mt-0.5 text-xs text-indigo-100/90">
                This capability is live today — across the Command Center and
                module pages.
              </p>
            </div>
          </div>
          <StatusBadge status="shipped" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <div
              key={s.title}
              className="rounded-xl bg-white/10 p-3 ring-1 ring-white/15 backdrop-blur-sm"
            >
              <s.icon className="h-4 w-4 text-indigo-100" />
              <p className="mt-2 text-[13px] font-semibold leading-4">
                {s.title}
              </p>
              <p className="mt-1 text-[11px] leading-4 text-indigo-100/85">
                {s.body}
              </p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {ASK_XENBOOX_EXPLAINER.surfaces.map((surface) => (
            <Link
              key={surface.href}
              href={surface.href}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 shadow-sm transition-colors hover:bg-indigo-50"
            >
              {surface.label}
              <ArrowRight className="h-3 w-3" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function FeaturesTab() {
  const [activeCategory, setActiveCategory] = useState<
    "all" | (typeof FEATURE_CATEGORIES)[number]
  >("all");

  const grouped = useMemo(() => {
    const byCategory = new Map<string, typeof FEATURES>();
    for (const f of FEATURES) {
      const list = byCategory.get(f.category) ?? [];
      list.push(f);
      byCategory.set(f.category, list);
    }
    return byCategory;
  }, []);

  const categories = useMemo(() => {
    if (activeCategory === "all") return FEATURE_CATEGORIES;
    return [activeCategory];
  }, [activeCategory]);

  const counts = useMemo(() => {
    const c: Record<string, Record<FeatureStatus, number>> = {};
    for (const cat of FEATURE_CATEGORIES) {
      c[cat] = { shipped: 0, partial: 0, planned: 0 };
      for (const f of grouped.get(cat) ?? []) c[cat][f.status] += 1;
    }
    return c;
  }, [grouped]);

  const totalShipped = FEATURES.filter((f) => f.status === "shipped").length;
  const totalPartial = FEATURES.filter((f) => f.status === "partial").length;
  const totalPlanned = FEATURES.filter((f) => f.status === "planned").length;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <AskXenbooxBanner />

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Status legend
        </span>
        {(Object.keys(STATUS_META) as FeatureStatus[]).map((status) => {
          const meta = STATUS_META[status];
          return (
            <span
              key={status}
              className="inline-flex items-center gap-1.5 text-[11px] text-slate-600"
            >
              <span className={cn("h-2 w-2 rounded-full", meta.dot)} />
              <span className="font-medium">{meta.label}</span>
              <span className="text-slate-400">— {meta.description}</span>
            </span>
          );
        })}
      </div>

      {/* Roll-up */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          {
            label: "Shipped",
            value: totalShipped,
            status: "shipped" as FeatureStatus,
          },
          {
            label: "In progress",
            value: totalPartial,
            status: "partial" as FeatureStatus,
          },
          {
            label: "Planned",
            value: totalPlanned,
            status: "planned" as FeatureStatus,
          },
        ].map((item) => {
          const meta = STATUS_META[item.status];
          return (
            <div
              key={item.status}
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3"
            >
              <span className={cn("h-2.5 w-2.5 rounded-full", meta.dot)} />
              <div className="flex-1">
                <p className="text-[11px] font-medium text-slate-500">
                  {meta.label}
                </p>
                <p className="text-xl font-bold tabular-nums text-slate-900">
                  {item.value}
                </p>
              </div>
              <p className="max-w-[45%] text-right text-[10px] leading-3 text-slate-400">
                {meta.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Category filter chips */}
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setActiveCategory("all")}
          className={cn(
            "rounded-full border px-3 py-1 text-[11px] font-medium transition-colors",
            activeCategory === "all"
              ? "border-indigo-600 bg-indigo-600 text-white"
              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
          )}
        >
          All categories
        </button>
        {FEATURE_CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(cat)}
            className={cn(
              "rounded-full border px-3 py-1 text-[11px] font-medium transition-colors",
              activeCategory === cat
                ? "border-indigo-600 bg-indigo-600 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grouped features */}
      {categories.map((category) => {
        const features = grouped.get(category) ?? [];
        const c = counts[category];
        return (
          <section key={category}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[13px] font-semibold text-slate-900">
                {category}
              </h3>
              <div className="flex items-center gap-2 text-[10px] text-slate-400">
                {c.shipped > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    {c.shipped} shipped
                  </span>
                )}
                {c.partial > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    {c.partial} in progress
                  </span>
                )}
                {c.planned > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                    {c.planned} planned
                  </span>
                )}
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {features.map((feature) => {
                const isPlanned = feature.status === "planned";
                return (
                  <div
                    key={feature.id}
                    className={cn(
                      "flex flex-col rounded-xl border border-slate-200 bg-white p-4 transition-colors",
                      isPlanned && "border-dashed bg-slate-50/50 opacity-70",
                      !isPlanned && "hover:border-slate-300",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p
                        className={cn(
                          "text-[13px] font-semibold leading-5 text-slate-900",
                          isPlanned && "text-slate-400",
                        )}
                      >
                        {feature.name}
                      </p>
                      <StatusBadge status={feature.status} />
                    </div>
                    <p
                      className={cn(
                        "mt-1.5 flex-1 text-[11px] leading-4 text-slate-500",
                        isPlanned && "text-slate-400/80",
                      )}
                    >
                      {feature.description}
                    </p>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      {feature.source ? (
                        <span className="truncate text-[10px] text-slate-400">
                          Benchmark: {feature.source}
                        </span>
                      ) : (
                        <span />
                      )}
                      {feature.href && (
                        <Link
                          href={feature.href}
                          className="inline-flex shrink-0 items-center gap-0.5 text-[11px] font-medium text-indigo-600 hover:text-indigo-700"
                        >
                          Open
                          <ChevronRight className="h-3 w-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

// ─── Pages tab ─────────────────────────────────────────────────────────────

function PagesTab() {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return PAGES;
    return PAGES.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.group.toLowerCase().includes(q),
    );
  }, [query]);

  const grouped = useMemo(() => {
    return PAGE_GROUPS.map((group) => ({
      group,
      pages: filtered.filter((p) => p.group === group),
    })).filter((g) => g.pages.length > 0);
  }, [filtered]);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search pages — try “payroll”, “invoices”, “AI”…"
          className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />
      </div>

      <p className="text-xs text-slate-500">
        {filtered.length} page{filtered.length === 1 ? "" : "s"} across{" "}
        {grouped.length} area{grouped.length === 1 ? "" : "s"}
        {query && " — filtered by your search"}
        <span className="mx-1.5 text-slate-300">·</span>
        <Sparkles className="mr-0.5 inline h-3 w-3 text-indigo-500" />
        pages marked with Ask Xenboox have the page-aware AI copilot.
      </p>

      {grouped.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-sm font-medium text-slate-600">
            No pages match “{query}”
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Try a different search term.
          </p>
        </div>
      )}

      {grouped.map(({ group, pages }) => (
        <section key={group}>
          <div className="mb-2.5 flex items-center gap-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              {group}
            </h3>
            <span className="text-[10px] text-slate-300">{pages.length}</span>
            <div className="h-px flex-1 bg-slate-100" />
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
            {pages.map((page) => (
              <Link
                key={page.href}
                href={page.href}
                className="group flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3.5 transition-all hover:border-indigo-300 hover:shadow-sm"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 transition-colors group-hover:bg-indigo-100">
                  <page.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-[13px] font-semibold text-slate-900">
                      {page.title}
                    </p>
                    {page.copilot && (
                      <span
                        title="Ask Xenboox copilot available"
                        className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600"
                      >
                        <Sparkles className="h-2.5 w-2.5" />
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-slate-500">
                    {page.description}
                  </p>
                  <p className="mt-1.5 inline-flex items-center gap-0.5 text-[10px] font-medium text-indigo-600 opacity-0 transition-opacity group-hover:opacity-100">
                    Open
                    <ChevronRight className="h-3 w-3" />
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function ExplorePage() {
  const [activeTab, setActiveTab] = useState<"pages" | "features">("pages");

  return (
    <ModulePageShell
      title="Explore"
      description="Every page in your workspace, and the AI-native features on the platform."
      icon={Compass}
      tabs={[
        { key: "pages", label: "Pages" },
        { key: "features", label: "Features" },
      ]}
      activeTab={activeTab}
      onTabChange={(key) => setActiveTab(key as "pages" | "features")}
    >
      {activeTab === "pages" ? <PagesTab /> : <FeaturesTab />}
    </ModulePageShell>
  );
}
