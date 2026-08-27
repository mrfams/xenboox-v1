"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import {
  Search,
  BookOpen,
  CircleHelp,
  Layers,
  Rocket,
  Shield,
  Webhook,
  Wallet,
  Receipt,
  Users,
  RefreshCw,
  Inbox,
  Settings,
  Sparkles,
  Mail,
  ArrowRight,
  ExternalLink,
  LifeBuoy,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { AiSimulationTrigger } from "@/components/ai-ux/simulation-trigger";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import dynamic from "next/dynamic";

const HelpAssistant = dynamic(
  () =>
    import("@/components/dashboard/help-assistant").then(
      (m) => m.HelpAssistant,
    ),
  {
    ssr: false,
    loading: () => <div className="h-96 rounded-xl bg-muted animate-pulse" />,
  },
);

// ─── Data ──────────────────────────────────────────────────────────────────

type HelpTopic = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  group: "Documentation" | "In-app guides";
  keywords: string[];
  external?: boolean;
};

const TOPICS: HelpTopic[] = [
  // ── Documentation (public docs site) ───────────────────────────────────
  {
    title: "Quickstart",
    description: "Set up Xenboox and post your first transaction in minutes.",
    href: "/docs/quickstart",
    icon: Rocket,
    group: "Documentation",
    keywords: ["setup", "install", "first", "begin", "start", "onboard"],
    external: true,
  },
  {
    title: "Getting Started",
    description:
      "Create your organization, chart of accounts, and opening balances.",
    href: "/docs/getting-started",
    icon: BookOpen,
    group: "Documentation",
    keywords: ["organization", "entity", "setup", "coa", "accounts"],
    external: true,
  },
  {
    title: "Module Guides",
    description:
      "Deep dives into AP, AR, Payroll, Treasury, Reports, and more.",
    href: "/docs/modules",
    icon: Layers,
    group: "Documentation",
    keywords: ["module", "bills", "invoices", "payroll", "treasury", "reports"],
    external: true,
  },
  {
    title: "FAQ",
    description: "Answers to the most common questions about Xenboox.",
    href: "/docs/faq",
    icon: CircleHelp,
    group: "Documentation",
    keywords: ["faq", "question", "answers", "common"],
    external: true,
  },
  {
    title: "Security & Compliance",
    description:
      "Encryption, audit trails, tamper-evident logs, and data protection.",
    href: "/docs/security",
    icon: Shield,
    group: "Documentation",
    keywords: ["security", "encryption", "audit", "compliance", "privacy"],
    external: true,
  },
  {
    title: "Webhooks & Integrations",
    description: "Connect Xenboox to your existing systems in real time.",
    href: "/docs/webhooks",
    icon: Webhook,
    group: "Documentation",
    keywords: ["webhook", "integration", "api", "sync", "connect"],
    external: true,
  },

  // ── In-app guides (dashboard modules) ──────────────────────────────────
  {
    title: "Connect a bank account",
    description:
      "Link your bank, import statements, and let AI categorize transactions.",
    href: "/dashboard/operations",
    icon: Wallet,
    group: "In-app guides",
    keywords: ["bank", "account", "import", "statement", "transaction"],
  },
  {
    title: "Create an invoice",
    description:
      "Bill customers, track payments, and convert quotes to invoices.",
    href: "/dashboard/operations/invoices",
    icon: Receipt,
    group: "In-app guides",
    keywords: ["invoice", "bill customer", "sales", "receivables", "quote"],
  },
  {
    title: "Run payroll",
    description:
      "Process a pay run with gross pay, statutory deductions, and net pay.",
    href: "/dashboard",
    icon: Users,
    group: "In-app guides",
    keywords: ["payroll", "salary", "wages", "pay run", "employees"],
  },
  {
    title: "Reconcile accounts",
    description: "Match bank lines to your books and keep balances in check.",
    href: "/dashboard/operations",
    icon: RefreshCw,
    group: "In-app guides",
    keywords: ["reconcile", "match", "bank", "balance"],
  },
  {
    title: "Review agent work",
    description: "Approve or reject what the Xenboox agent workforce produces.",
    href: "/dashboard/activity-hub",
    icon: Inbox,
    group: "In-app guides",
    keywords: ["approve", "review", "inbox", "pending", "queue", "agent"],
  },
  {
    title: "Manage users & roles",
    description:
      "Invite teammates, set roles, and control access to your books.",
    href: "/dashboard/settings",
    icon: Settings,
    group: "In-app guides",
    keywords: ["users", "team", "roles", "permissions", "invite", "settings"],
  },
];

const QUICK_CHIPS = ["Getting started", "Invoices", "Payroll", "Security"];

// ─── Components ───────────────────────────────────────────────────────────

function TopicCard({ topic }: { topic: HelpTopic }) {
  const Icon = topic.icon;
  return (
    <Link
      href={topic.href}
      className="group flex flex-col rounded-xl border border-border bg-card p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-500/5 dark:border-border/60 dark:hover:border-indigo-800"
    >
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white dark:bg-primary/10 dark:text-primary dark:group-hover:bg-primary dark:group-hover:text-white">
          <Icon className="h-5 w-5" />
        </div>
        {topic.external ? (
          <ExternalLink className="h-4 w-4 text-muted-foreground/50 transition-colors group-hover:text-primary dark:text-muted-foreground/40" />
        ) : (
          <ArrowRight className="h-4 w-4 text-muted-foreground/50 transition-all group-hover:translate-x-0.5 group-hover:text-primary dark:text-muted-foreground/40" />
        )}
      </div>
      <h3 className="mt-4 text-sm font-semibold text-foreground">
        {topic.title}
      </h3>
      <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
        {topic.description}
      </p>
    </Link>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────

export default function HelpPage() {
  const [query, setQuery] = useState("");
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/health/ready")
      .then((res) => setIsHealthy(res.ok))
      .catch(() => setIsHealthy(false));
  }, []);

  const filteredTopics = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return TOPICS;
    return TOPICS.filter((t) => {
      const haystack =
        `${t.title} ${t.description} ${t.keywords.join(" ")}`.toLowerCase();
      return q.split(/\s+/).every((token) => haystack.includes(token));
    });
  }, [query]);

  const docTopics = filteredTopics.filter((t) => t.group === "Documentation");
  const guideTopics = filteredTopics.filter((t) => t.group === "In-app guides");
  const hasResults = filteredTopics.length > 0;

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card px-6 py-4 dark:border-border/60">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Help Center</h1>
            <p className="text-sm text-muted-foreground">
              Guides, documentation, and support for every part of Xenboox
            </p>
          </div>
          <span
            className={cn(
              "hidden items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium sm:inline-flex",
              isHealthy === false
                ? "border border-attention-amber/30 bg-attention-amber/10 text-attention-amber dark:border-amber-500/30 dark:bg-attention-amber/10 dark:text-amber-400"
                : "border border-balanced-green/30 bg-balanced-green/10 text-balanced-green dark:border-emerald-500/30 dark:bg-balanced-green/10 dark:text-emerald-400",
            )}
          >
            <span className="relative flex h-2 w-2">
              {isHealthy === false ? (
                <span className="relative inline-flex h-2 w-2 rounded-full bg-attention-amber" />
              ) : (
                <>
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-balanced-green/60 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-balanced-green" />
                </>
              )}
            </span>
            {isHealthy === false
              ? "Connection issue detected"
              : "API connected"}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl px-6 py-8">
          {/* Two-column layout: topics left, Help Assistant sticky right */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
            <div className="min-w-0">
              {/* Hero / Search */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-500 to-purple-600 p-8 shadow-xl shadow-indigo-600/20">
                <div
                  className="pointer-events-none absolute inset-0"
                  aria-hidden="true"
                  style={{
                    backgroundImage:
                      "radial-gradient(rgba(255,255,255,0.15) 1px, transparent 1px)",
                    backgroundSize: "22px 22px",
                    maskImage:
                      "radial-gradient(ellipse at center, black 30%, transparent 75%)",
                    WebkitMaskImage:
                      "radial-gradient(ellipse at center, black 30%, transparent 75%)",
                  }}
                />
                <div className="relative">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
                      <LifeBuoy className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">
                        How can we help?
                      </h2>
                      <p className="text-sm text-indigo-100">
                        Search topics, browse guides, or ask the AI anything.
                      </p>
                    </div>
                  </div>

                  <div className="relative mt-5 max-w-xl">
                    <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground/50" />
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      aria-label="Search help topics"
                      placeholder="Search help topics… e.g. invoice, reconcile, security"
                      className="w-full rounded-xl border-0 bg-white py-3 pl-12 pr-4 text-sm text-foreground shadow-lg placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-white/60"
                    />
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-indigo-200">
                      Popular:
                    </span>
                    {QUICK_CHIPS.map((chip) => (
                      <button
                        key={chip}
                        onClick={() => setQuery(chip)}
                        className={cn(
                          "rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white backdrop-blur transition-colors hover:bg-white/20",
                          query.toLowerCase() === chip.toLowerCase() &&
                            "bg-white text-indigo-600 hover:bg-white",
                        )}
                      >
                        {chip}
                      </button>
                    ))}
                    {query && (
                      <button
                        onClick={() => setQuery("")}
                        className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white backdrop-blur transition-colors hover:bg-white/20"
                      >
                        Clear search
                      </button>
                    )}
                  </div>

                  <div className="mt-5">
                    <AiSimulationTrigger
                      traceId="ai-workforce-demo"
                      label="See the AI workforce in action"
                      variant="inverse"
                    />
                  </div>
                </div>
              </div>

              {/* Results */}
              {hasResults ? (
                <div className="mt-8 space-y-8">
                  {docTopics.length > 0 && (
                    <section>
                      <div className="mb-4 flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-primary" />
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                          Documentation
                        </h3>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                          {docTopics.length}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {docTopics.map((topic) => (
                          <TopicCard key={topic.href} topic={topic} />
                        ))}
                      </div>
                    </section>
                  )}

                  {guideTopics.length > 0 && (
                    <section>
                      <div className="mb-4 flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                          In-app guides
                        </h3>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                          {guideTopics.length}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {guideTopics.map((topic) => (
                          <TopicCard key={topic.href} topic={topic} />
                        ))}
                      </div>
                    </section>
                  )}
                </div>
              ) : (
                <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
                  <Search className="h-8 w-8 text-muted-foreground/40" />
                  <p className="mt-3 text-sm font-medium text-foreground/80">
                    No topics match “{query}”
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Try a different keyword, or ask the AI assistant directly.
                  </p>
                  <Link
                    href={`/dashboard?prompt=${encodeURIComponent(
                      `I need help with: ${query}`,
                    )}`}
                    className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
                  >
                    <Sparkles className="h-4 w-4" />
                    Ask Xenboox AI
                  </Link>
                </div>
              )}

              {/* Still stuck */}
              <section className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
                <Link
                  href="/dashboard"
                  className="group flex flex-col rounded-xl border border-border bg-card p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-500/5 dark:border-border/60 dark:hover:border-indigo-800"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-signal-indigo text-white">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-sm font-semibold text-foreground">
                    Ask Xenboox AI
                  </h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                    Chat with the CFO agent — it knows your books and can walk
                    you through anything.
                  </p>
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary">
                    Open AI Command Center
                    <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>

                <Link
                  href="/docs"
                  className="group flex flex-col rounded-xl border border-border bg-card p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-500/5 dark:border-border/60 dark:hover:border-indigo-800"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-sm font-semibold text-foreground">
                    Full Documentation
                  </h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                    The complete Xenboox documentation — concepts, modules,
                    agents, and API references.
                  </p>
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary">
                    Browse the docs
                    <ExternalLink className="h-3 w-3" />
                  </span>
                </Link>

                <a
                  href="mailto:support@xenboox.com?subject=Xenboox%20Support%20Request"
                  className="group flex flex-col rounded-xl border border-border bg-card p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-500/5 dark:border-border/60 dark:hover:border-indigo-800"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-balanced-green/10 dark:text-emerald-400">
                    <Mail className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-sm font-semibold text-foreground">
                    Contact Support
                  </h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                    Email our team for help with anything the docs can&apos;t
                    solve.
                  </p>
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary">
                    support@xenboox.com
                    <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </a>
              </section>

              <p className="mt-8 text-center text-xs text-muted-foreground/60">
                Xenboox Help Center — your AI-native accounting platform
              </p>
            </div>

            {/* Help Assistant — sticky right rail */}
            <div className="h-[560px] rounded-2xl border border-border bg-card shadow-sm lg:sticky lg:top-6 dark:border-border/60">
              <ErrorBoundary surface="help-assistant">
                <HelpAssistant />
              </ErrorBoundary>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
