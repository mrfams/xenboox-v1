import {
  Calendar,
  Lock,
  Unlock,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";

import { DocsPageHeader } from "../../components/docs-page-header";
import { FeatureGrid } from "../../components/feature-grid";
import { InfoCallout } from "../../components/info-callout";
import { RelatedLinks } from "../../components/related-links";

import { Card, CardContent } from "@/components/ui";

const capabilities = [
  {
    title: "Period Management",
    description:
      "Creates and manages fiscal periods. Supports custom fiscal year configurations and multiple period types (monthly, quarterly, annual).",
    icon: Calendar,
  },
  {
    title: "Period Closing",
    description:
      "Executes the period closing workflow. Validates all entries are posted, locks periods, and prevents post-closing modifications.",
    icon: Lock,
  },
  {
    title: "Opening Balances",
    description:
      "Calculates and posts opening balances for new periods. Carries forward retained earnings and adjusts for prior period corrections.",
    icon: Unlock,
  },
  {
    title: "Period Status Tracking",
    description:
      "Tracks the status of each fiscal period (Open, Closing, Closed, Locked). Provides visibility into closing progress.",
    icon: CheckCircle,
  },
  {
    title: "Cross-Period Validation",
    description:
      "Validates transactions across periods for consistency. Flags transactions that may need retrospective adjustment.",
    icon: AlertTriangle,
  },
];

export default function FiscalAgentDocPage() {
  return (
    <>
      <DocsPageHeader
        title="Fiscal Agent"
        description="The Fiscal Agent manages fiscal period lifecycles including opening, closing, and locking. It ensures periods are closed in sequence with proper validation."
        breadcrumbs={[
          { label: "Agents", href: "/docs/agents" },
          { label: "Fiscal", href: "/docs/agents/fiscal" },
        ]}
        icon={Calendar}
      />

      <div className="space-y-10">
        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">Overview</h2>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground leading-relaxed">
                The Fiscal Agent manages the lifecycle of fiscal periods. It
                creates new periods, manages the closing process, and ensures
                periods are closed in proper sequence. The agent validates that
                all journal entries are posted before allowing a period to close
                and prevents modifications to locked periods. It works closely
                with the Controller Agent during the month-end close process and
                ensures that every period transition is properly documented and
                auditable.
              </p>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">
            Capabilities
          </h2>
          <FeatureGrid features={capabilities} />
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">
            Period Status Lifecycle
          </h2>
          <div className="space-y-3">
            <Card>
              <CardContent className="p-4 flex items-start gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700 text-sm font-bold">
                  O
                </div>
                <div>
                  <h3 className="font-semibold">
                    Open — Current Operating Period
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    New journal entries can be posted. All modules are active.
                    Period accepting transactions normally.
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-start gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 text-sm font-bold">
                  C
                </div>
                <div>
                  <h3 className="font-semibold">
                    Closing — Month-End in Progress
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Close checklist active. Adjusting entries being posted.
                    Reconciliations in progress. Limited new entries allowed.
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-start gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-sm font-bold">
                  L
                </div>
                <div>
                  <h3 className="font-semibold">Locked — Closed for Edits</h3>
                  <p className="text-sm text-muted-foreground">
                    Period is closed. No new entries can be posted. Reports are
                    final. Historical reference only.
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-start gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-700 text-sm font-bold">
                  X
                </div>
                <div>
                  <h3 className="font-semibold">Permanently Closed</h3>
                  <p className="text-sm text-muted-foreground">
                    Period cannot be reopened under any circumstances. Requires
                    administrator intervention if adjustments are truly needed.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">
            Close Validation Checklist
          </h2>
          <Card>
            <CardContent className="pt-6">
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-4 w-4 text-green-600 shrink-0" />
                  <span>All journal entries posted and approved</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-4 w-4 text-green-600 shrink-0" />
                  <span>All bank accounts reconciled</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-4 w-4 text-green-600 shrink-0" />
                  <span>All sub-ledgers balanced with GL</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-4 w-4 text-green-600 shrink-0" />
                  <span>Depreciation posted for the period</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-4 w-4 text-green-600 shrink-0" />
                  <span>Payroll posted for the period</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-4 w-4 text-green-600 shrink-0" />
                  <span>Accruals and prepayments recorded</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-4 w-4 text-green-600 shrink-0" />
                  <span>Trial balance reviewed and approved</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </section>

        <InfoCallout type="tip" title="Example Prompts">
          "Open new fiscal period for March 2026" • "Close current period" •
          "Lock period 2026-01" • "Show me period status" • "Reopen period for
          correction"
        </InfoCallout>

        <RelatedLinks
          links={[
            {
              title: "Fiscal Periods Module",
              href: "/docs/modules/fiscal",
              description: "Period management",
            },
            {
              title: "Controller Agent",
              href: "/docs/agents/controller",
              description: "Close oversight",
            },
            {
              title: "Journal Module",
              href: "/docs/modules/journal",
              description: "Journal entry management",
            },
            {
              title: "Ledger Agent",
              href: "/docs/agents/ledger",
              description: "Journal posting",
            },
          ]}
        />
      </div>
    </>
  );
}
