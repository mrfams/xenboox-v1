import {
  CalendarCheck,
  ListChecks,
  RefreshCcw,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
} from "lucide-react";

import { DocsPageHeader } from "../components/docs-page-header";
import { InfoCallout } from "../components/info-callout";
import { FeatureGrid } from "../components/feature-grid";
import { RelatedLinks } from "../components/related-links";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";

const closeStages = [
  {
    title: "Pre-Close Checks",
    description:
      "Unposted journals, unreconciled bank items, and open approvals are surfaced before the close begins.",
    icon: ListChecks,
  },
  {
    title: "Reconciliation",
    description:
      "All bank, cash, and mobile money accounts reconciled. Outstanding items must be resolved or explicitly accepted.",
    icon: RefreshCcw,
  },
  {
    title: "Accruals & Adjustments",
    description:
      "Recurring entries, accruals, and reclassifications are drafted by the Controller Agent and posted after approval.",
    icon: FileCheck,
  },
  {
    title: "Review & Approval",
    description:
      "The trial balance is reviewed, variances explained, and the close package approved by the finance director.",
    icon: CheckCircle2,
  },
  {
    title: "Period Lock",
    description:
      "The period is locked — no further postings without explicit unlock, and every unlock is audit-logged.",
    icon: CalendarCheck,
  },
];

const checklist = [
  "All bank accounts reconciled",
  "All approved AP invoices scheduled for payment",
  "Payroll run completed and posted",
  "Depreciation posted for the period",
  "Accruals and prepayments adjusted",
  "Trial balance variance reviewed",
  "Management sign-off recorded",
];

export default function MonthEndClosePage() {
  return (
    <>
      <DocsPageHeader
        title="Month-End Close"
        description="A guided, auditable path from open month to locked period — with the Controller Agent coordinating every step."
        breadcrumbs={[
          { label: "Guides", href: "/docs/getting-started" },
          { label: "Month-End Close", href: "/docs/month-end-close" },
        ]}
        icon={CalendarCheck}
      />

      <div className="space-y-10">
        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">Overview</h2>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Month-end close in Xenboox is a structured workflow, not a
                scramble. The Controller Agent tracks a checklist across
                reconciliation, payroll, depreciation, and adjustments; worker
                agents complete each task; and nothing closes until the trial
                balance is reviewed and approved. Once locked, the period
                becomes immutable — postings require an explicit, logged unlock.
              </p>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">
            Close Stages
          </h2>
          <FeatureGrid features={closeStages} />
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">
            Close Checklist
          </h2>
          <Card>
            <CardContent className="pt-6">
              <ul className="space-y-3">
                {checklist.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-balanced-green" />
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>

        <InfoCallout type="warning" title="Period locks are serious">
          Locked periods prevent accidental restatements. If a correction is
          genuinely required after lock, use the explicit unlock flow — the
          unlock, the reason, and the correcting entries are all preserved in
          the audit trail.
        </InfoCallout>

        <InfoCallout type="tip" title="Automate the routine">
          Recurring transactions and scheduled reminders mean the routine work —
          accruals, standing entries, report exports — is drafted before you
          even start. The close becomes a review exercise, not a data-entry
          marathon.
        </InfoCallout>

        <RelatedLinks
          links={[
            {
              title: "Controller Agent",
              href: "/docs/agents/controller",
              description: "Close orchestration",
            },
            {
              title: "Ledger Agent",
              href: "/docs/agents/ledger",
              description: "Posting & adjustments",
            },
            {
              title: "Reports",
              href: "/docs/reports",
              description: "Trial balance & statements",
            },
            {
              title: "Getting Started",
              href: "/docs/getting-started",
              description: "Workspace setup",
            },
          ]}
        />
      </div>
    </>
  );
}
