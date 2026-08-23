import Link from "next/link";
import {
  HelpCircle,
  Clock,
  Activity,
  LifeBuoy,
  ArrowRight,
  FileText,
  BookOpen,
} from "lucide-react";

import { DocsPageHeader } from "../components/docs-page-header";

import { Card, CardContent } from "@/components/ui";

const resources = [
  {
    title: "FAQ",
    description:
      "Answers to common questions about billing, features, security, and support.",
    href: "/docs/faq",
    icon: HelpCircle,
  },
  {
    title: "Changelog",
    description:
      "What's new in Xenboox — features, fixes, and platform improvements.",
    href: "/docs/changelog",
    icon: Clock,
  },
  {
    title: "System Status",
    description: "Real-time status of the platform, API, and infrastructure.",
    href: "https://status.xenboox.com",
    icon: Activity,
  },
  {
    title: "Contact Support",
    description: "Reach the support team with questions or issues.",
    href: "/contact",
    icon: LifeBuoy,
  },
  {
    title: "Concepts",
    description:
      "Core accounting concepts — double-entry, entities, periods, and more.",
    href: "/docs/concepts",
    icon: BookOpen,
  },
  {
    title: "Agent Docs",
    description: "All 21 AI agents and how they work together in three tiers.",
    href: "/docs/agents",
    icon: FileText,
  },
];

export default function ResourcesPage() {
  return (
    <>
      <DocsPageHeader
        title="Resources"
        description="Help, changelogs, status, and reference material — everything beyond the guides. Every page is versioned, entity-scoped, and audit-trailed."
        breadcrumbs={[{ label: "Resources", href: "/docs/resources" }]}
        icon={LifeBuoy}
      />

      {/* Enterprise stats bar */}
      <div className="mb-6 grid grid-cols-3 gap-3 rounded-xl border border-border bg-card/50 p-3 sm:p-4">
        <div className="text-center">
          <p className="text-lg font-semibold tabular-nums tracking-tight">6</p>
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Resources
          </p>
        </div>
        <div className="border-x border-border text-center">
          <p className="text-lg font-semibold tabular-nums tracking-tight">
            421 ms
          </p>
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Avg docs latency
          </p>
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold tabular-nums tracking-tight">
            99.9%
          </p>
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Docs uptime
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {resources.map((resource) => (
          <Link
            key={resource.title}
            href={resource.href}
            target={resource.href.startsWith("http") ? "_blank" : undefined}
            className="group"
          >
            <Card className="flex h-full flex-col overflow-hidden border-border bg-card transition-all duration-300 hover:-translate-y-0.5 hover:border-border/80 hover:shadow-[0_12px_32px_-16px_rgba(20,33,61,0.12)]">
              <CardContent className="flex flex-1 flex-col p-6">
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                    <resource.icon className="h-5 w-5" />
                  </span>
                  <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-medium tracking-wide text-muted-foreground">
                    {resource.href.startsWith("http") ? "External" : "In-app"}
                  </span>
                </div>
                <h3 className="mt-4 text-[15px] font-semibold tracking-tight text-foreground">
                  {resource.title}
                </h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground text-pretty">
                  {resource.description}
                </p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                  Open
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-6 rounded-xl border border-dashed border-border/60 bg-muted/20 p-4 text-xs leading-relaxed text-muted-foreground">
        <span className="font-semibold text-foreground">Tip:</span> All docs are
        search-indexed and entity-scoped — press{" "}
        <kbd className="rounded border bg-card px-1.5 py-0.5 font-mono text-[10px]">
          /
        </kbd>{" "}
        to search. Need an answer faster? Ask the CFO Agent in{" "}
        <Link
          href="/dashboard"
          className="font-medium text-primary hover:underline"
        >
          Command Center
        </Link>
        .
      </div>
    </>
  );
}
