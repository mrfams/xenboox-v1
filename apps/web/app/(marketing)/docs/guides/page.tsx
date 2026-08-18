import Link from "next/link";
import {
  Rocket,
  BookOpen,
  LayoutGrid,
  Users,
  Plug,
  BarChart3,
  CalendarCheck,
  ArrowRight,
} from "lucide-react";

import { DocsPageHeader } from "../components/docs-page-header";

import { Card, CardContent } from "@/components/ui";

const guides = [
  {
    title: "Quickstart",
    description:
      "Get up and running in under 5 minutes — account, organization, first transaction.",
    href: "/docs/quickstart",
    icon: Rocket,
    readTime: "5 min",
  },
  {
    title: "Getting Started",
    description:
      "The full onboarding walkthrough — organization, entities, users, and your first journal entry.",
    href: "/docs/getting-started",
    icon: BookOpen,
    readTime: "10 min",
  },
  {
    title: "Chart of Accounts",
    description:
      "Design the account structure that powers your ledger, reports, and automation.",
    href: "/docs/chart-of-accounts",
    icon: LayoutGrid,
    readTime: "8 min",
  },
  {
    title: "Users & Roles",
    description: "Invite your team with role-based access and entity scoping.",
    href: "/docs/users-roles",
    icon: Users,
    readTime: "5 min",
  },
  {
    title: "Integrations",
    description:
      "Connect bank feeds, mobile money, email ingestion, and webhooks.",
    href: "/docs/integrations",
    icon: Plug,
    readTime: "10 min",
  },
  {
    title: "Reports & Exports",
    description:
      "Build financial statements with AI narratives and export them anywhere.",
    href: "/docs/reports",
    icon: BarChart3,
    readTime: "7 min",
  },
  {
    title: "Month-End Close",
    description: "A guided, auditable path from open month to locked period.",
    href: "/docs/month-end-close",
    icon: CalendarCheck,
    readTime: "12 min",
  },
];

export default function GuidesPage() {
  return (
    <>
      <DocsPageHeader
        title="Guides"
        description="Step-by-step tutorials for the workflows every Xenboox team runs — from first login to month-end close."
        breadcrumbs={[{ label: "Guides", href: "/docs/guides" }]}
        icon={BookOpen}
      />

      <div className="grid gap-4 md:grid-cols-2">
        {guides.map((guide) => (
          <Link key={guide.href} href={guide.href}>
            <Card className="h-full transition-colors hover:bg-muted/50">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <guide.icon className="h-5 w-5" />
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {guide.readTime}
                  </span>
                </div>
                <h3 className="mt-4 font-semibold">{guide.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  {guide.description}
                </p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
                  Read guide <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
