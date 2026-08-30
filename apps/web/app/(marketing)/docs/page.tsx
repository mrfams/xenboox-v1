import type { Metadata } from "next";
import Link from "next/link";
import {
  BookOpen,
  Rocket,
  Layers,
  Key,
  Webhook,
  FileCode,
  Shield,
  HelpCircle,
  ArrowRight,
  Search,
  Zap,
  Clock,
} from "lucide-react";

import { FadeInUp } from "@/components/marketing/reveal";

export const metadata: Metadata = {
  title: "Documentation — Guides, API Reference | Xenboox",
  description:
    "Everything you need to build with Xenboox — from quickstart guides to API references, SDKs, and integration tutorials.",
  openGraph: {
    title: "Documentation — Guides, API Reference | Xenboox",
    description:
      "Everything you need to build with Xenboox — quickstart guides, API references, SDKs.",
    url: "https://xenboox.com/docs",
    siteName: "Xenboox",
    type: "website",
  },
};

const categories = [
  {
    icon: Rocket,
    title: "Quickstart",
    description:
      "Get up and running in under 5 minutes. Create your first organization and record your first transaction.",
    href: "/docs/quickstart",
    color: "from-primary/50 to-indigo-500",
  },
  {
    icon: BookOpen,
    title: "Guides",
    description:
      "Step-by-step tutorials for common workflows — from setting up your chart of accounts to running month-end close.",
    href: "/docs/getting-started",
    color: "from-emerald-500 to-teal-500",
  },
  {
    icon: Layers,
    title: "Modules",
    description:
      "Deep dives into each accounting module — AP, AR, Payroll, Treasury, Reports, and more.",
    href: "/docs/modules",
    color: "from-violet-500 to-signal-indigo",
  },
  {
    icon: FileCode,
    title: "API Reference",
    description:
      "Complete API documentation with examples, SDKs, and integration guides.",
    href: "/docs/api",
    color: "from-attention-amber/50 to-orange-500",
  },
  {
    icon: Shield,
    title: "Security",
    description:
      "Learn about our security practices, encryption, compliance, and data protection.",
    href: "/docs/security",
    color: "from-red-500 to-rose-500",
  },
  {
    icon: HelpCircle,
    title: "FAQ",
    description:
      "Answers to commonly asked questions about billing, features, and support.",
    href: "/docs/faq",
    color: "from-cyan-500 to-primary/50",
  },
];

const quickLinks = [
  {
    icon: Zap,
    title: "Quickstart Guide",
    description: "Get started in 5 minutes",
    href: "/docs/quickstart",
  },
  {
    icon: Key,
    title: "Authentication",
    description: "API keys and OAuth setup",
    href: "/docs/api/auth",
  },
  {
    icon: Webhook,
    title: "Webhooks",
    description: "Real-time event notifications",
    href: "/docs/webhooks",
  },
  {
    icon: FileCode,
    title: "API Reference",
    description: "Explore all endpoints",
    href: "/docs/api",
  },
];

const popularGuides = [
  {
    title: "Setting Up Your Chart of Accounts",
    category: "Getting Started",
    href: "/docs/chart-of-accounts",
    readTime: "8 min read",
  },
  {
    title: "Inviting Team Members",
    category: "Users & Roles",
    href: "/docs/users-roles",
    readTime: "5 min read",
  },
  {
    title: "Connecting Bank Feeds",
    category: "Integrations",
    href: "/docs/integrations",
    readTime: "10 min read",
  },
  {
    title: "Running Month-End Close",
    category: "Guides",
    href: "/docs/month-end-close",
    readTime: "12 min read",
  },
];

const codeExample = `// Create an invoice with the Xenboox API
import { Xenboox } from '@xenboox/sdk';

const xenboox = new Xenboox({ apiKey: 'xk_live_...' });

const invoice = await xenboox.invoices.create({
  customer: 'cus_seagull_logistics',
  currency: 'GMD',
  line_items: [
    {
      description: 'Freight services — Banjul to Dubai',
      amount: 486000,
      quantity: 1,
    },
  ],
  due_date: '2026-09-15',
});

console.log(invoice.id); // "inv_1042"
console.log(invoice.status); // "draft"`;

export default function DocsPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-paper -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden="true"
          style={{
            backgroundImage:
              "radial-gradient(rgba(20, 33, 61, 0.06) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
            maskImage:
              "radial-gradient(ellipse at center, black 30%, transparent 75%)",
            WebkitMaskImage:
              "radial-gradient(ellipse at center, black 30%, transparent 75%)",
          }}
        />
        <FadeInUp>
          <div className="relative">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              Documentation
            </h1>
            <p className="mt-3 text-lg text-muted-foreground max-w-2xl">
              Everything you need to build with Xenboox — from quickstart guides
              to API references.
            </p>

            {/* Search */}
            <div className="mt-6 relative max-w-xl">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search documentation..."
                className="w-full rounded-xl border border-border bg-card py-3.5 pl-12 pr-4 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <kbd className="absolute right-4 top-1/2 -translate-y-1/2 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                ⌘K
              </kbd>
            </div>
          </div>
        </FadeInUp>
      </section>

      {/* Categories Grid */}
      <section className="py-10">
        <FadeInUp delay={0.1}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((cat) => (
              <Link
                key={cat.title}
                href={cat.href}
                className="group rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:shadow-elevated hover:-translate-y-1"
              >
                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${cat.color} text-white shadow-sm`}
                >
                  <cat.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-semibold text-foreground transition-colors group-hover:text-primary">
                  {cat.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  {cat.description}
                </p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary opacity-0 transition-all group-hover:opacity-100">
                  Learn more <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </Link>
            ))}
          </div>
        </FadeInUp>
      </section>

      {/* Quick Links */}
      <section className="py-10 border-t border-border">
        <FadeInUp>
          <h2 className="text-xl font-semibold text-foreground mb-6">
            Quick Links
          </h2>
        </FadeInUp>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {quickLinks.map((link, index) => (
            <FadeInUp key={link.title} delay={index * 0.05}>
              <Link
                href={link.href}
                className="group flex items-start gap-3 rounded-xl border border-border bg-card p-4 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                  <link.icon className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {link.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {link.description}
                  </p>
                </div>
              </Link>
            </FadeInUp>
          ))}
        </div>
      </section>

      {/* Popular Guides */}
      <section className="py-10 border-t border-border">
        <FadeInUp>
          <h2 className="text-xl font-semibold text-foreground mb-6">
            Popular Guides
          </h2>
        </FadeInUp>
        <div className="space-y-3">
          {popularGuides.map((guide, index) => (
            <FadeInUp key={guide.title} delay={index * 0.05}>
              <Link
                href={guide.href}
                className="group flex items-center justify-between rounded-xl border border-border bg-card p-4 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5"
              >
                <div>
                  <span className="text-xs font-medium text-primary">
                    {guide.category}
                  </span>
                  <p className="text-sm font-medium text-foreground mt-1">
                    {guide.title}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {guide.readTime}
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-all group-hover:opacity-100 group-hover:text-primary" />
                </div>
              </Link>
            </FadeInUp>
          ))}
        </div>
      </section>

      {/* Code Example */}
      <section className="py-10 border-t border-border">
        <FadeInUp>
          <div className="grid gap-8 lg:grid-cols-2 items-start">
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-3">
                Ship in minutes, not days
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                Our SDK makes it easy to integrate Xenboox into your existing
                workflows. Create invoices, reconcile accounts, and generate
                reports with a few lines of code.
              </p>
              <div className="flex flex-wrap gap-2">
                {["TypeScript", "Python", "Go", "Ruby"].map((lang) => (
                  <span
                    key={lang}
                    className="inline-flex items-center rounded-full bg-muted/50 px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
                  >
                    {lang}
                  </span>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-ledger-ink overflow-hidden">
              <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-error-clay/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-attention-amber/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-balanced-green/70" />
                <span className="ml-3 text-[11px] font-medium text-paper/50">
                  example.ts
                </span>
              </div>
              <pre className="p-4 overflow-x-auto text-[13px] leading-relaxed text-paper/90 font-mono">
                <code>{codeExample}</code>
              </pre>
            </div>
          </div>
        </FadeInUp>
      </section>

      {/* Feedback */}
      <section className="py-8 border-t border-border">
        <FadeInUp>
          <div className="flex items-center justify-center gap-4 text-sm">
            <span className="text-muted-foreground">Was this helpful?</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-xs font-medium text-muted-foreground transition-all hover:bg-accent/50 hover:text-foreground"
              >
                👍 Yes
              </button>
              <button
                type="button"
                className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-xs font-medium text-muted-foreground transition-all hover:bg-accent/50 hover:text-foreground"
              >
                👎 No
              </button>
            </div>
          </div>
        </FadeInUp>
      </section>

      {/* Need Help */}
      <section className="py-10 border-t border-border">
        <FadeInUp>
          <div className="rounded-2xl border border-border bg-card p-6 text-center">
            <h3 className="text-lg font-semibold text-foreground">
              Need help?
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Our support team is available to help you with any questions.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              <Link
                href="/contact"
                className="inline-flex h-10 items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-all hover:shadow-md"
              >
                Contact Support
              </Link>
              <Link
                href="/docs/faq"
                className="inline-flex h-10 items-center rounded-xl border border-border px-5 text-sm font-medium text-foreground transition-all hover:bg-accent/50"
              >
                View FAQ
              </Link>
            </div>
          </div>
        </FadeInUp>
      </section>
    </>
  );
}
