import { Calendar, Lock, ClipboardCheck, History } from "lucide-react";

import { DocsPageHeader } from "../../components/docs-page-header";
import { FeatureGrid } from "../../components/feature-grid";
import { InfoCallout } from "../../components/info-callout";
import { RelatedLinks } from "../../components/related-links";

import { Card, CardContent } from "@/components/ui";

const features = [
  {
    title: "Period Structure",
    description:
      "Fiscal periods define the reporting calendar — typically monthly, but configurable to your fiscal year. Each period is a distinct, addressable unit of time.",
    icon: Calendar,
  },
  {
    title: "Open / Closed / Locked",
    description:
      "Open periods accept transactions. Closed periods are finalized after review. Locked periods reject all changes — the books for that period are frozen.",
    icon: Lock,
  },
  {
    title: "Close Workflow",
    description:
      "Closing a period runs a guided checklist: validation, department readiness, adjustments, trial balance, and post-close verification — coordinated by the Controller Agent.",
    icon: ClipboardCheck,
  },
  {
    title: "Auditable History",
    description:
      "Every close action is recorded. Reopening a period requires a documented reason and leaves an audit trail, so the close history is always explainable.",
    icon: History,
  },
];

export default function FiscalPeriodsConceptPage() {
  return (
    <>
      <DocsPageHeader
        title="Fiscal Periods"
        description="The calendar that keeps your books organized, closed on time, and permanently auditable."
        breadcrumbs={[
          { label: "Concepts", href: "/docs/concepts" },
          { label: "Fiscal Periods", href: "/docs/concepts/fiscal-periods" },
        ]}
        icon={Calendar}
      />

      <div className="space-y-10">
        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">Overview</h2>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Fiscal periods divide the continuous flow of transactions into
                reporting units. Each period can be open, closed, or locked,
                which gives your team precise control over when transactions can
                be posted. Closing a period runs a structured workflow that
                verifies the books before they are finalized — and once a period
                is locked, its records are permanent.
              </p>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">
            Key Concepts
          </h2>
          <FeatureGrid features={features} />
        </section>

        <InfoCallout type="tip" title="Close on schedule, every month">
          The month-end close flow turns a scramble into a checklist: the
          Controller Agent tracks what's done, what's pending, and what's
          blocking — and nothing closes until the trial balance checks out.
        </InfoCallout>

        <RelatedLinks
          links={[
            {
              title: "Fiscal Module",
              href: "/docs/modules/fiscal",
              description: "Managing periods in the app",
            },
            {
              title: "Month-End Close",
              href: "/docs/month-end-close",
              description: "The guided close workflow",
            },
            {
              title: "Core Concepts",
              href: "/docs/concepts",
              description: "Back to the concepts index",
            },
          ]}
        />
      </div>
    </>
  );
}
