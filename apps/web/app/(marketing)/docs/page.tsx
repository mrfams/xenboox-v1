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
  Users,
} from "lucide-react";
import Link from "next/link";

const docCategories = [
  {
    title: "Getting Started",
    description:
      "Set up your account, create entities, record your first journal entry.",
    href: "/docs/getting-started",
    icon: BookOpen,
    gradient: "from-blue-500/10 via-blue-500/5 to-transparent",
  },
  {
    title: "Modules",
    description:
      "Explore all 19 accounting modules — AP, AR, Payroll, Treasury, Cash, and more.",
    href: "/docs/modules",
    icon: FileText,
    gradient: "from-emerald-500/10 via-emerald-500/5 to-transparent",
  },
  {
    title: "AI Agents",
    description:
      "Learn about all 19 AI-powered assistants — from CFO to Audit Agent.",
    href: "/docs/agents",
    icon: Bot,
    gradient: "from-purple-500/10 via-purple-500/5 to-transparent",
  },
  {
    title: "Security",
    description:
      "CSP, authentication, encryption, rate limiting, and compliance.",
    href: "/docs/security",
    icon: Shield,
    gradient: "from-red-500/10 via-red-500/5 to-transparent",
  },
  {
    title: "DevOps & Infrastructure",
    description:
      "CI/CD pipeline, deployment, monitoring, backup, incident response.",
    href: "/docs/devsecops",
    icon: Server,
    gradient: "from-amber-500/10 via-amber-500/5 to-transparent",
  },
  {
    title: "FAQ",
    description:
      "Common questions about billing, security, AI agents, and platform usage.",
    href: "/docs/faq",
    icon: HelpCircle,
    gradient: "from-cyan-500/10 via-cyan-500/5 to-transparent",
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
    <>
      {/* Hero Section */}
      <div className="relative mb-6 overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/5 via-background to-background">
        <div className="relative px-6 py-10 sm:px-10 sm:py-14">
          <div className="flex items-center gap-2 mb-4">
            <div className="inline-flex items-center gap-1.5 rounded-full border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3 w-3 text-primary" />
              Documentation
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Welcome to the
            <br />
            <span className="text-primary">Xenboox Docs</span>
          </h1>
          <p className="mt-3 max-w-xl text-sm sm:text-base text-muted-foreground leading-relaxed">
            Everything you need to get started with AI-native accounting.
            Explore 19 modules, 19 AI agents, and enterprise-grade security
            features.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/docs/getting-started"
              className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
            >
              Get Started
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
            <Link
              href="/register"
              className="inline-flex h-9 items-center rounded-md border px-4 text-sm font-medium transition-colors hover:bg-muted"
            >
              Create Free Account
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="mb-10">
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
          <BookMarked className="h-4 w-4" />
          QUICK LINKS
        </h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {quickLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              <div className="group flex items-center justify-between rounded-lg border px-4 py-3 transition-all hover:bg-muted/50 hover:border-primary/30">
                <div>
                  <p className="text-sm font-medium group-hover:text-primary transition-colors">
                    {link.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {link.description}
                  </p>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0 ml-2" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Doc Categories */}
      <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
        <BookOpen className="h-4 w-4" />
        DOCUMENTATION SECTIONS
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {docCategories.map((category) => (
          <Link key={category.title} href={category.href}>
            <Card className="group relative overflow-hidden transition-all hover:shadow-md hover:-translate-y-0.5">
              <div
                className={`absolute inset-0 bg-gradient-to-br ${category.gradient} opacity-0 group-hover:opacity-100 transition-opacity`}
              />
              <CardHeader className="relative">
                <CardTitle className="flex items-center gap-2 text-base">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                    <category.icon className="h-4 w-4" />
                  </div>
                  {category.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="relative">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {category.description}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Legal */}
      <div className="mt-12 border-t pt-8">
        <h2 className="text-sm font-semibold text-muted-foreground mb-3">
          LEGAL & POLICIES
        </h2>
        <div className="grid gap-2 sm:grid-cols-2">
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
              <div className="group flex items-center justify-between rounded-lg border px-4 py-3 transition-all hover:bg-muted/50">
                <div>
                  <p className="text-sm font-medium group-hover:text-primary transition-colors">
                    {item.label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {item.desc}
                  </p>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
