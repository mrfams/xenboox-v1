import Link from "next/link";
import { DocsPageHeader } from "../components/docs-page-header";
import { RelatedLinks } from "../components/related-links";
import { Rocket, CheckCircle2, ArrowRight, Clock } from "lucide-react";

const steps = [
  {
    number: 1,
    title: "Create Your Account",
    description:
      "Sign up with your email address or Google account. No credit card required for the free tier.",
    details: [
      "Visit xenboox.com and click 'Start Free'",
      "Enter your email and create a password",
      "Verify your email address",
      "Complete your profile",
    ],
    time: "2 minutes",
  },
  {
    number: 2,
    title: "Set Up Your Organization",
    description:
      "Create your organization and configure basic settings like currency and fiscal year.",
    details: [
      "Enter your organization name",
      "Select your country and default currency",
      "Choose your fiscal year start date",
      "Select an account template or create custom",
    ],
    time: "3 minutes",
  },
  {
    number: 3,
    title: "Invite Your Team",
    description:
      "Add team members and assign appropriate roles for access control.",
    details: [
      "Navigate to Settings → Team",
      "Enter email addresses of team members",
      "Assign roles (Admin, Editor, Viewer)",
      "Send invitations",
    ],
    time: "2 minutes",
  },
  {
    number: 4,
    title: "Record Your First Transaction",
    description:
      "Create your first journal entry to get familiar with the system.",
    details: [
      "Go to Journal Entries",
      "Click 'New Entry'",
      "Add description and date",
      "Enter debit and credit lines",
      "Submit for posting",
    ],
    time: "3 minutes",
  },
];

export default function QuickstartPage() {
  return (
    <>
      <DocsPageHeader
        title="Quickstart Guide"
        description="Get up and running with Xenboox in under 5 minutes. This guide walks you through the essential setup steps."
        breadcrumbs={[{ label: "Quickstart", href: "/docs/quickstart" }]}
        icon={Rocket}
      />

      <div className="space-y-8">
        {/* Overview */}
        <section>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>
                <strong className="text-foreground">Total time:</strong> ~5
                minutes
              </span>
            </div>
          </div>
        </section>

        {/* Steps */}
        <section className="space-y-6">
          {steps.map((step) => (
            <div
              key={step.number}
              className="relative rounded-xl border border-border bg-card p-6"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  {step.number}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground">
                    {step.title}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {step.description}
                  </p>
                  <ul className="mt-4 space-y-2">
                    {step.details.map((detail) => (
                      <li
                        key={detail}
                        className="flex items-start gap-2 text-sm text-muted-foreground"
                      >
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                        {detail}
                      </li>
                    ))}
                  </ul>
                  <span className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {step.time}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </section>

        {/* What's Next */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-lg font-semibold text-foreground">
            What&apos;s Next?
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Now that you&apos;re set up, explore these resources to make the
            most of Xenboox:
          </p>
          <div className="mt-4 space-y-3">
            <Link
              href="/docs/chart-of-accounts"
              className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-accent/50"
            >
              <div>
                <p className="text-sm font-medium text-foreground">
                  Set Up Your Chart of Accounts
                </p>
                <p className="text-xs text-muted-foreground">
                  Configure your account structure
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
            <Link
              href="/docs/integrations"
              className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-accent/50"
            >
              <div>
                <p className="text-sm font-medium text-foreground">
                  Connect Bank Feeds
                </p>
                <p className="text-xs text-muted-foreground">
                  Automate transaction importing
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
            <Link
              href="/docs/api"
              className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-accent/50"
            >
              <div>
                <p className="text-sm font-medium text-foreground">
                  Explore the API
                </p>
                <p className="text-xs text-muted-foreground">
                  Build custom integrations
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </div>
        </section>

        <RelatedLinks
          links={[
            {
              title: "Core Concepts",
              href: "/docs/concepts",
              description: "Understand key accounting concepts",
            },
            {
              title: "Authentication",
              href: "/docs/api/auth",
              description: "Set up API authentication",
            },
            {
              title: "FAQ",
              href: "/docs/faq",
              description: "Common questions answered",
            },
          ]}
        />
      </div>
    </>
  );
}
