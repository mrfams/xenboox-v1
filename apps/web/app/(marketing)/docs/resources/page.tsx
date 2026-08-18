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
    description: "All 20 AI agents and how they work together in three tiers.",
    href: "/docs/agents",
    icon: FileText,
  },
];

export default function ResourcesPage() {
  return (
    <>
      <DocsPageHeader
        title="Resources"
        description="Help, changelogs, status, and reference material — everything beyond the guides."
        breadcrumbs={[{ label: "Resources", href: "/docs/resources" }]}
        icon={LifeBuoy}
      />

      <div className="grid gap-4 md:grid-cols-2">
        {resources.map((resource) => (
          <Link
            key={resource.title}
            href={resource.href}
            target={resource.href.startsWith("http") ? "_blank" : undefined}
          >
            <Card className="h-full transition-colors hover:bg-muted/50">
              <CardContent className="p-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <resource.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-semibold">{resource.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  {resource.description}
                </p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
                  Open <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
