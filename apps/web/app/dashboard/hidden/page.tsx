"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Eye,
  ExternalLink,
  Shield,
  Inbox,
  Network,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type HiddenRoute = {
  href: string;
  title: string;
  purpose: string;
  icon: typeof Shield;
};

const ROUTES: HiddenRoute[] = [
  {
    href: "/dashboard/audit-trail",
    title: "Audit Trail",
    purpose: "Full audit log — every action, who/when/why, confidence",
    icon: Shield,
  },
  {
    href: "/dashboard/ingestion",
    title: "Documents",
    purpose: "Document inbox — upload → review queue",
    icon: Inbox,
  },
  {
    href: "/dashboard/knowledge-graph",
    title: "Knowledge Graph (debug)",
    purpose: "Ops/debug only — entities, accounts, links. Unlinked from nav.",
    icon: Network,
  },
];

export default function HiddenInspectorPage() {
  if (process.env.NODE_ENV === "production") {
    return (
      <div className="flex h-[60vh] items-center justify-center p-8 text-center">
        <div>
          <p className="text-sm font-medium text-foreground">
            Not available in production
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            This inspector is dev-only. Run pnpm dev locally at
            /dashboard/hidden.
          </p>
          <Link
            href="/dashboard"
            className="mt-4 inline-flex text-xs text-primary hover:underline"
          >
            Back to dashboard →
          </Link>
        </div>
      </div>
    );
  }

  const [activeHref, setActiveHref] = useState<string>(ROUTES[0]!.href);
  const active = ROUTES.find((r) => r.href === activeHref) ?? ROUTES[0]!;

  return (
    <div className="flex h-[calc(100dvh-56px)] flex-col">
      {/* Header */}
      <div className="shrink-0 border-b border-border/40 bg-card px-4 py-3 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-sm font-semibold tracking-tight text-foreground">
              Hidden surfaces — inspector
            </h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Click any on the left — it loads on the right. No back button
              needed. Open in new tab with ↗
            </p>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" /> Close
          </Link>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Left nav — stays, you switch without going back */}
        <aside className="w-[260px] shrink-0 border-r border-border/40 bg-muted/20 overflow-y-auto">
          <nav className="p-2 space-y-0.5" aria-label="Hidden routes">
            {ROUTES.map((r) => {
              const Icon = r.icon;
              const isActive = r.href === activeHref;
              return (
                <button
                  key={r.href}
                  type="button"
                  onClick={() => setActiveHref(r.href)}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex w-full items-start gap-2.5 rounded-lg px-3 py-2.5 text-left transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-accent/50 text-foreground",
                  )}
                >
                  <Icon
                    className={cn(
                      "mt-0.5 h-4 w-4 shrink-0",
                      isActive ? "text-primary" : "text-muted-foreground",
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-medium leading-tight">
                      {r.title}
                    </span>
                    <span className="mt-0.5 block line-clamp-2 text-[11px] leading-snug text-muted-foreground">
                      {r.purpose}
                    </span>
                    <span className="mt-1 block font-mono text-[10px] text-muted-foreground/60">
                      {r.href}
                    </span>
                  </span>
                  {isActive && (
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  )}
                </button>
              );
            })}
          </nav>
          <div className="p-3 text-[10px] text-muted-foreground/60">
            Tip: <span className="font-medium">j/k</span> or click to switch —
            preview stays on the right.
          </div>
        </aside>

        {/* Right — live preview, no back needed */}
        <section className="flex min-h-0 flex-1 flex-col bg-background">
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/30 bg-card px-3 py-2">
            <div className="min-w-0 flex items-center gap-2">
              <active.icon className="h-4 w-4 text-primary" />
              <span className="truncate text-xs font-semibold text-foreground">
                {active.title}
              </span>
              <span className="hidden font-mono text-[10px] text-muted-foreground/60 sm:inline">
                {active.href}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <a
                href={active.href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-lg border border-border/50 bg-background px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-accent"
              >
                Open in new tab <ExternalLink className="h-3 w-3" />
              </a>
              <Link
                href={active.href}
                className="inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground hover:bg-primary/90"
              >
                Go full page <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          <div className="flex-1 overflow-hidden bg-muted/10">
            <iframe
              key={active.href}
              src={active.href}
              title={active.title}
              className="h-full w-full border-0 bg-background"
              loading="lazy"
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
            />
          </div>

          <div className="shrink-0 border-t border-border/30 bg-card px-3 py-1.5 text-[10px] text-muted-foreground/60">
            Preview is live — entity-scoped. Switch entities in the top bar and
            the preview updates. <Eye className="inline h-3 w-3" /> If a page
            needs a role, you’ll see its empty/error state here too.
          </div>
        </section>
      </div>
    </div>
  );
}
