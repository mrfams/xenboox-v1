import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import {
  Shield,
  Server,
  BookOpen,
  FileText,
  Bot,
  HelpCircle,
  Sparkles,
  ArrowRight,
  BookMarked,
} from "lucide-react";
import Link from "next/link";
import {
  MarketingShell,
  PageHero,
  Reveal,
  GlassCard,
} from "../components/marketing-primitives";

const docCategories = [
  {
    title: "Getting Started",
    description:
      "Set up your account, create entities, record your first journal entry.",
    href: "/docs/getting-started",
    icon: BookOpen,
    accent: "from-blue-500 to-indigo-500",
  },
  {
    title: "Modules",
    description:
      "Explore the full range of accounting modules — AP, AR, Payroll, Treasury, Cash, and more.",
    href: "/docs/modules",
    icon: FileText,
    accent: "from-emerald-500 to-teal-500",
  },
  {
    title: "AI Agents",
    description:
      "Learn how the intelligent agent workforce assists with your day-to-day accounting.",
    href: "/docs/agents",
    icon: Bot,
    accent: "from-purple-500 to-fuchsia-500",
  },
  {
    title: "Security",
    description: "Authentication, encryption, rate limiting, and compliance.",
    href: "/docs/security",
    icon: Shield,
    accent: "from-red-500 to-rose-500",
  },
  {
    title: "DevOps & Infrastructure",
    description:
      "CI/CD pipeline, deployment, monitoring, backup, incident response.",
    href: "/docs/devsecops",
    icon: Server,
    accent: "from-amber-500 to-orange-500",
  },
  {
    title: "FAQ",
    description:
      "Common questions about billing, security, AI agents, and platform usage.",
    href: "/docs/faq",
    icon: HelpCircle,
    accent: "from-cyan-500 to-blue-500",
  },
];

const quickLinks = [
  {
    title: "Journal Entries",
    href: "/docs/modules/journal",
    description: "Double-entry accounting",
  },
  {
    title: "Chart of Accounts",
    href: "/docs/modules/coa",
    description: "Account structure",
  },
  {
    title: "Bank Reconciliation",
    href: "/docs/modules/treasury",
    description: "Match transactions",
  },
  {
    title: "Payroll Processing",
    href: "/docs/modules/payroll",
    description: "Run payroll",
  },
  {
    title: "Mobile Money",
    href: "/docs/modules/mobile-money",
    description: "M-Pesa, Airtel",
  },
  {
    title: "Reports",
    href: "/docs/modules/reports",
    description: "Financial statements",
  },
];

export default function DocsLandingPage() {
  return (
    <MarketingShell>
      <PageHero
        eyebrow="Documentation"
        title="Everything you need to"
        highlight="get started"
        subtitle="A complete guide to AI-native accounting — explore the modules, the agent workforce, and enterprise-grade security features."
      >
        <div className="flex flex-wrap gap-3">
          <Link
            href="/docs/getting-started"
            className="group inline-flex h-11 items-center rounded-xl bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-6 text-sm font-medium text-white shadow-lg shadow-indigo-600/30 transition-all duration-300 hover:scale-[1.03]"
          >
            Get Started
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Link>
          <Link
            href="/register"
            className="inline-flex h-11 items-center rounded-xl border border-white/15 bg-white/5 px-6 text-sm font-medium text-white/80 backdrop-blur-sm transition-colors hover:border-white/30 hover:bg-white/10"
          >
            Create Free Account
          </Link>
        </div>
      </PageHero>

      <section className="py-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal className="mb-10">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-white/50">
              <BookMarked className="h-4 w-4" />
              Quick Links
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {quickLinks.map((link) => (
                <Link key={link.href} href={link.href}>
                  <GlassCard className="h-full p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-white">
                          {link.title}
                        </p>
                        <p className="mt-0.5 text-xs text-white/50">
                          {link.description}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-white/40" />
                    </div>
                  </GlassCard>
                </Link>
              ))}
            </div>
          </Reveal>

          <Reveal>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-white/50">
              <BookOpen className="h-4 w-4" />
              Documentation Sections
            </h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {docCategories.map((category) => (
                <Link key={category.title} href={category.href}>
                  <GlassCard glow className="h-full p-6">
                    <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg">
                      <category.icon className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="text-base font-semibold text-white">
                      {category.title}
                    </h3>
                    <p className="mt-2 text-sm text-white/55">
                      {category.description}
                    </p>
                  </GlassCard>
                </Link>
              ))}
            </div>
          </Reveal>

          <Reveal className="mt-12">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/50">
              Legal & Policies
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                {
                  label: "Privacy Policy",
                  href: "/privacy",
                  desc: "Data protection and user privacy",
                },
                {
                  label: "Terms of Service",
                  href: "/terms",
                  desc: "Terms governing platform use",
                },
                {
                  label: "Cookie Policy",
                  href: "/cookies",
                  desc: "Cookie and tracking details",
                },
                {
                  label: "Service Level Agreement",
                  href: "/sla",
                  desc: "Uptime guarantees and support",
                },
              ].map((item) => (
                <Link key={item.href} href={item.href}>
                  <GlassCard className="h-full p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-white">
                          {item.label}
                        </p>
                        <p className="mt-0.5 text-xs text-white/50">
                          {item.desc}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-white/40" />
                    </div>
                  </GlassCard>
                </Link>
              ))}
            </div>
          </Reveal>
        </div>
      </section>
    </MarketingShell>
  );
}
