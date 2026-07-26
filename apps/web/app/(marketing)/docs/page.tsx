import Link from "next/link";
import { MarketingHero } from "@/components/marketing/hero";
import {
  BookOpen,
  Terminal,
  Settings,
  Users,
  Shield,
  CreditCard,
  FileText,
  MessageSquare,
  Database,
  ArrowRight,
  Search,
} from "lucide-react";

const categories = [
  {
    icon: BookOpen,
    title: "Getting Started",
    description:
      "Set up your organization, connect your data, and run your first month-end close.",
    href: "/docs/getting-started",
    articles: "8 articles",
  },
  {
    icon: Database,
    title: "Chart of Accounts",
    description:
      "Structure your accounts, import templates, and manage your COA hierarchy.",
    href: "/docs/chart-of-accounts",
    articles: "5 articles",
  },
  {
    icon: Users,
    title: "Users & Roles",
    description:
      "Invite team members, assign roles, and manage entity-level access.",
    href: "/docs/users-roles",
    articles: "6 articles",
  },
  {
    icon: Settings,
    title: "Integrations",
    description:
      "Connect bank feeds, mobile money, import from QuickBooks or Xero.",
    href: "/docs/integrations",
    articles: "7 articles",
  },
  {
    icon: Shield,
    title: "Security & Compliance",
    description:
      "Encryption, audit trails, entity isolation, and data retention policies.",
    href: "/docs/security",
    articles: "4 articles",
  },
  {
    icon: MessageSquare,
    title: "AI Agent Guide",
    description:
      "How to work with the CFO Agent, understand confidence scores, and review AI actions.",
    href: "/docs/ai-agent-guide",
    articles: "6 articles",
  },
  {
    icon: FileText,
    title: "Reports & Exports",
    description:
      "Generate financial statements, custom reports, and filing exports.",
    href: "/docs/reports",
    articles: "5 articles",
  },
  {
    icon: Terminal,
    title: "API Reference",
    description:
      "Build integrations with our REST API — webhooks, endpoints, rate limits.",
    href: "/docs/api",
    articles: "12 articles",
  },
  {
    icon: CreditCard,
    title: "Billing & Plans",
    description: "Compare plans, manage your subscription, and view invoices.",
    href: "/docs/billing",
    articles: "3 articles",
  },
];

export default function DocsPage() {
  return (
    <>
      <MarketingHero
        title="Documentation"
        subtitle="Docs"
        description="Everything you need to get started with Xenboox — from setting up your organization to building on our API."
        cta={{ label: "Get Started Guide", href: "/docs/getting-started" }}
        secondaryCta={{ label: "API Reference", href: "/docs/api" }}
      />

      {/* Search */}
      <section className="border-b bg-white py-8">
        <div className="mx-auto max-w-2xl px-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search documentation..."
              className="w-full rounded-xl border bg-slate-50 py-3.5 pl-12 pr-4 text-sm outline-none transition-all focus:border-blue-400 focus:bg-white focus:shadow-sm"
            />
          </div>
        </div>
      </section>

      {/* Categories Grid */}
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((cat) => {
              const Icon = cat.icon;
              return (
                <Link
                  key={cat.title}
                  href={cat.href}
                  className="group rounded-xl border bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-3 font-semibold text-slate-900 transition-colors group-hover:text-blue-600">
                    {cat.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
                    {cat.description}
                  </p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-slate-400">
                      {cat.articles}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-blue-600 opacity-0 transition-all group-hover:opacity-100" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Quick Links */}
      <section className="border-t bg-slate-50 py-14">
        <div className="mx-auto max-w-4xl px-4">
          <div className="mb-8 text-center">
            <h2 className="text-xl font-bold text-slate-900">Quick Links</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                title: "Getting Started Guide",
                href: "/docs/getting-started",
                desc: "15-minute setup",
              },
              {
                title: "API Quickstart",
                href: "/docs/api/quickstart",
                desc: "First API call in 5 minutes",
              },
              {
                title: "FAQ",
                href: "/docs/faq",
                desc: "Common questions answered",
              },
            ].map((link) => (
              <Link
                key={link.title}
                href={link.href}
                className="group rounded-xl border bg-white p-4 text-center shadow-sm transition-all duration-200 hover:shadow-md"
              >
                <p className="font-semibold text-slate-900 transition-colors group-hover:text-blue-600">
                  {link.title}
                </p>
                <p className="mt-1 text-xs text-slate-400">{link.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
