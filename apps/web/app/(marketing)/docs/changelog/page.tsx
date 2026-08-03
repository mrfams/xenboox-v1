import Link from "next/link";
import { DocsPageHeader } from "../components/docs-page-header";
import { Bell, Tag, ArrowRight } from "lucide-react";

const releases = [
  {
    version: "1.2.0",
    date: "January 15, 2025",
    tag: "Latest",
    changes: [
      {
        type: "feature",
        title: "Multi-Currency Support",
        description:
          "Handle transactions in multiple currencies with automatic exchange rate synchronization.",
      },
      {
        type: "feature",
        title: "Bank Reconciliation Automation",
        description:
          "Automatically match bank transactions with journal entries using AI.",
      },
      {
        type: "improvement",
        title: "Improved Report Performance",
        description:
          "Financial reports now generate 3x faster with optimized queries.",
      },
      {
        type: "fix",
        title: "Fixed Currency Conversion Rounding",
        description:
          "Resolved an issue with decimal rounding in multi-currency calculations.",
      },
    ],
  },
  {
    version: "1.1.0",
    date: "December 20, 2024",
    tag: null,
    changes: [
      {
        type: "feature",
        title: "Webhook Notifications",
        description:
          "Receive real-time notifications when events occur in your account.",
      },
      {
        type: "feature",
        title: "Custom Dashboard Widgets",
        description:
          "Customize your dashboard with configurable widgets and metrics.",
      },
      {
        type: "improvement",
        title: "Enhanced Search",
        description:
          "Search across all modules with improved relevance and filtering.",
      },
    ],
  },
  {
    version: "1.0.0",
    date: "November 1, 2024",
    tag: "Initial Release",
    changes: [
      {
        type: "feature",
        title: "Complete Accounting Platform",
        description:
          "Full double-entry accounting with 20+ modules including AP, AR, Payroll, and Treasury.",
      },
      {
        type: "feature",
        title: "AI-Powered Automation",
        description:
          "Automated transaction categorization, invoice processing, and reconciliation.",
      },
      {
        type: "feature",
        title: "Multi-Platform Support",
        description:
          "Access your data from web, mobile, and desktop applications.",
      },
      {
        type: "feature",
        title: "Enterprise Security",
        description:
          "Row-level security, encryption, and comprehensive audit logging.",
      },
    ],
  },
];

const changeTypeColors: Record<string, string> = {
  feature: "bg-emerald-100 text-emerald-700",
  improvement: "bg-blue-100 text-blue-700",
  fix: "bg-amber-100 text-amber-700",
};

export default function ChangelogPage() {
  return (
    <>
      <DocsPageHeader
        title="Changelog"
        description="Track all updates, improvements, and fixes to Xenboox. Stay informed about the latest features and changes."
        breadcrumbs={[{ label: "Changelog", href: "/docs/changelog" }]}
        icon={Bell}
      />

      <div className="space-y-8">
        {/* Subscribe */}
        <section className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  Subscribe to updates
                </p>
                <p className="text-xs text-muted-foreground">
                  Get notified when we release new features
                </p>
              </div>
            </div>
            <Link
              href="/register"
              className="inline-flex h-8 items-center rounded-lg bg-primary px-4 text-xs font-medium text-primary-foreground transition-all hover:shadow-md"
            >
              Subscribe
            </Link>
          </div>
        </section>

        {/* Releases */}
        <div className="space-y-8">
          {releases.map((release) => (
            <section
              key={release.version}
              className="relative border-l-2 border-border pl-6"
            >
              {/* Dot */}
              <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full border-2 border-primary bg-card" />

              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-xl font-bold text-foreground">
                  v{release.version}
                </h2>
                {release.tag && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    <Tag className="h-3 w-3" />
                    {release.tag}
                  </span>
                )}
                <span className="text-sm text-muted-foreground">
                  {release.date}
                </span>
              </div>

              {/* Changes */}
              <div className="space-y-3">
                {release.changes.map((change) => (
                  <div
                    key={change.title}
                    className="rounded-xl border border-border bg-card p-4"
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${changeTypeColors[change.type]}`}
                      >
                        {change.type}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {change.title}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {change.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Load More */}
        <section className="text-center">
          <button className="inline-flex h-10 items-center rounded-xl border border-border px-6 text-sm font-medium text-foreground transition-all hover:bg-accent/50">
            Load older releases
          </button>
        </section>
      </div>
    </>
  );
}
