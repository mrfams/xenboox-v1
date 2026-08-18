"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  CheckCircle2,
  Clock,
  Circle,
  ChevronRight,
  ArrowRight,
  Play,
  Bot,
  Workflow,
  Brain,
  ShieldCheck,
  MessageSquare,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  AI_UX_CATEGORIES,
  AI_UX_ENTRIES,
  AI_UX_EXPLAINER,
  type AiUxEntry,
  type AiUxStatus,
} from "@/lib/explore/ai-ux-catalog";
import { AiSimulationTrigger } from "@/components/ai-ux/simulation-trigger";

// ─── Status meta (mirrors the Features tab treatment) ─────────────────────

const STATUS_META: Record<
  AiUxStatus,
  { label: string; badge: string; dot: string; description: string }
> = {
  shipped: {
    label: "Shipped",
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    dot: "bg-emerald-500",
    description: "Live today",
  },
  partial: {
    label: "In progress",
    badge: "bg-amber-50 text-amber-700 ring-amber-200",
    dot: "bg-amber-500",
    description: "Partially wired — simulation shows the target",
  },
  planned: {
    label: "Planned",
    badge: "bg-slate-100 text-slate-400 ring-slate-200",
    dot: "bg-slate-300",
    description: "On the roadmap — simulation previews it",
  },
};

const STATUS_ICON: Record<AiUxStatus, typeof Circle> = {
  shipped: CheckCircle2,
  partial: Clock,
  planned: Circle,
};

const CATEGORY_ICON: Record<string, typeof Bot> = {
  "Agent Workflows": Workflow,
  "Progress & Thinking": Brain,
  "Conversation & Creation": MessageSquare,
  "Trust & Approval": ShieldCheck,
};

function StatusBadge({ status }: { status: AiUxStatus }) {
  const meta = STATUS_META[status];
  const Icon = STATUS_ICON[status];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset",
        meta.badge,
      )}
    >
      <Icon className="h-3 w-3" />
      {meta.label}
    </span>
  );
}

// ─── Hero banner ───────────────────────────────────────────────────────────

function AiUxHero() {
  const steps = [
    {
      icon: Workflow,
      title: "Plan & delegate",
      body: "The CFO agent reads your request, builds a plan, and hands work to the right specialist agents.",
    },
    {
      icon: Brain,
      title: "Think & work",
      body: "Every agent shows its thinking, narrates what it is doing, and traces the tools it calls — like ChatGPT, Cursor, and Devin.",
    },
    {
      icon: ShieldCheck,
      title: "Verify & post",
      body: "Output is confidence-scored, high-value actions pause for your approval, and only the Ledger Agent posts — audit-logged end to end.",
    },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-indigo-200/60 bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-600 text-white shadow-sm">
      <div className="flex flex-col gap-5 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold leading-6 tracking-tight">
                {AI_UX_EXPLAINER.name} — {AI_UX_EXPLAINER.tagline}
              </h2>
              <p className="mt-0.5 max-w-2xl text-xs leading-4 text-indigo-100/90">
                {AI_UX_EXPLAINER.body}
              </p>
            </div>
          </div>
          <AiSimulationTrigger
            traceId="month-end-close"
            label="Run a live demo"
            variant="inverse"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
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
          {AI_UX_EXPLAINER.surfaces.map((surface) => (
            <Link
              key={surface.href}
              href={surface.href}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 shadow-sm transition-colors hover:bg-indigo-50"
            >
              {surface.label}
              <ArrowRight className="h-3 w-3" />
            </Link>
          ))}
          <span className="ml-auto inline-flex items-center gap-1.5 text-[10px] text-indigo-100/80">
            <Bot className="h-3 w-3" />
            20 agents · 3 tiers · 1 ledger
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Entry card ────────────────────────────────────────────────────────────

function EntryCard({ entry }: { entry: AiUxEntry }) {
  const isPlanned = entry.status === "planned";

  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border border-slate-200 bg-white p-4 transition-all",
        isPlanned && "border-dashed bg-slate-50/50 opacity-70",
        !isPlanned && "hover:border-indigo-300 hover:shadow-sm",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p
          className={cn(
            "text-[13px] font-semibold leading-5 text-slate-900",
            isPlanned && "text-slate-400",
          )}
        >
          {entry.name}
        </p>
        <StatusBadge status={entry.status} />
      </div>

      <p
        className={cn(
          "mt-1.5 flex-1 text-[11px] leading-4 text-slate-500",
          isPlanned && "text-slate-400/80",
        )}
      >
        {entry.description}
      </p>

      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="truncate text-[10px] text-slate-400">
          {entry.source ?? "Xenboox design"}
        </span>
        <div className="flex shrink-0 items-center gap-2">
          {entry.href && (
            <Link
              href={entry.href}
              className="inline-flex items-center gap-0.5 text-[11px] font-medium text-indigo-600 hover:text-indigo-700"
            >
              Open
              <ChevronRight className="h-3 w-3" />
            </Link>
          )}
          {entry.traceId && (
            <AiSimulationTrigger
              traceId={entry.traceId}
              label="Run"
              variant="outline"
              className="!py-1 !px-2.5 !text-[11px]"
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Tab ───────────────────────────────────────────────────────────────────

export function AiUxTab() {
  const [activeCategory, setActiveCategory] = useState<
    "all" | (typeof AI_UX_CATEGORIES)[number]
  >("all");

  const grouped = useMemo(() => {
    const byCategory = new Map<string, AiUxEntry[]>();
    for (const entry of AI_UX_ENTRIES) {
      const list = byCategory.get(entry.category) ?? [];
      list.push(entry);
      byCategory.set(entry.category, list);
    }
    return byCategory;
  }, []);

  const categories =
    activeCategory === "all" ? AI_UX_CATEGORIES : [activeCategory];

  const counts = useMemo(() => {
    const c: Record<string, Record<AiUxStatus, number>> = {};
    for (const cat of AI_UX_CATEGORIES) {
      c[cat] = { shipped: 0, partial: 0, planned: 0 };
      for (const entry of grouped.get(cat) ?? []) c[cat][entry.status] += 1;
    }
    return c;
  }, [grouped]);

  const totalShipped = AI_UX_ENTRIES.filter(
    (e) => e.status === "shipped",
  ).length;
  const totalPartial = AI_UX_ENTRIES.filter(
    (e) => e.status === "partial",
  ).length;
  const totalPlanned = AI_UX_ENTRIES.filter(
    (e) => e.status === "planned",
  ).length;
  const totalSimulable = AI_UX_ENTRIES.filter((e) => e.traceId).length;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <AiUxHero />

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Status legend
        </span>
        {(Object.keys(STATUS_META) as AiUxStatus[]).map((status) => {
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
        <span className="inline-flex items-center gap-1.5 text-[11px] text-indigo-600">
          <Play className="h-3 w-3" />
          <span className="font-medium">
            {totalSimulable} playable simulations
          </span>
        </span>
      </div>

      {/* Roll-up */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          {
            label: "Shipped",
            value: totalShipped,
            status: "shipped" as AiUxStatus,
          },
          {
            label: "In progress",
            value: totalPartial,
            status: "partial" as AiUxStatus,
          },
          {
            label: "Planned",
            value: totalPlanned,
            status: "planned" as AiUxStatus,
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
        {AI_UX_CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(cat)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium transition-colors",
              activeCategory === cat
                ? "border-indigo-600 bg-indigo-600 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
            )}
          >
            {(() => {
              const Icon = CATEGORY_ICON[cat];
              return Icon ? <Icon className="h-3 w-3" /> : null;
            })()}
            {cat}
          </button>
        ))}
      </div>

      {/* Grouped entries */}
      {categories.map((category) => {
        const entries = grouped.get(category) ?? [];
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
              {entries.map((entry) => (
                <EntryCard key={entry.id} entry={entry} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
