import {
  FileText,
  ArrowRightLeft,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Calendar,
} from "lucide-react";

import { DocsPageHeader } from "../../components/docs-page-header";
import { FeatureGrid } from "../../components/feature-grid";
import { InfoCallout } from "../../components/info-callout";
import { RelatedLinks } from "../../components/related-links";

import { Card, CardContent } from "@/components/ui";

const features = [
  {
    title: "Journal Entries",
    description:
      "Create and manage double-entry journal entries with automatic debit/credit validation. Support for multi-currency entries and complex allocations.",
    icon: FileText,
  },
  {
    title: "Entry Lines",
    description:
      "Add multiple lines per entry with account selection, amounts, and optional dimensions. Real-time balance validation on each line.",
    icon: ArrowRightLeft,
  },
  {
    title: "Status Workflow",
    description:
      "Entries flow through draft, submitted, approved, posted, and reversed statuses. Configurable approval thresholds for amounts.",
    icon: CheckCircle,
  },
  {
    title: "Reversals",
    description:
      "Create reversing entries to correct errors or reverse accruals. System maintains audit trail linking original and reversal entries.",
    icon: RefreshCw,
  },
  {
    title: "Period Management",
    description:
      "Entries are assigned to fiscal periods. Locked periods prevent new postings. Year-end close processes.",
    icon: Calendar,
  },
];

const entryStatuses = [
  {
    status: "Draft",
    icon: FileText,
    description: "Entry is being created. Can be modified and deleted.",
  },
  {
    status: "Submitted",
    icon: AlertCircle,
    description:
      "Submitted for approval. Pending review by authorized approver.",
  },
  {
    status: "Approved",
    icon: CheckCircle,
    description: "Approved and ready for posting to the general ledger.",
  },
  {
    status: "Posted",
    icon: CheckCircle,
    description: "Posted to the ledger. Transactions affect account balances.",
  },
  {
    status: "Reversed",
    icon: RefreshCw,
    description:
      "Original entry reversed. Reversal entry created with audit trail.",
  },
];

export default function JournalDocPage() {
  return (
    <>
      <DocsPageHeader
        title="Journal"
        description="Create and manage double-entry journal entries with automated validation, approval workflows, and full audit trails."
        breadcrumbs={[
          { label: "Modules", href: "/docs/modules" },
          { label: "Journal", href: "/docs/modules/journal" },
        ]}
        icon={FileText}
      />

      <div className="space-y-10">
        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">Overview</h2>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground leading-relaxed">
                The Journal module is the core transaction processing engine of
                Xenboox. It handles all double-entry journal entries with
                automatic debit/credit validation, approval workflows, and
                seamless posting to the general ledger. The Ledger Agent
                automates entry creation from various sources (AP, AR, Payroll,
                Treasury) and validates every entry for accounting integrity.
                All entries maintain a complete audit trail from creation
                through posting and reversal.
              </p>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">
            Key Features
          </h2>
          <FeatureGrid features={features} />
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">
            Entry Status Workflow
          </h2>
          <div className="space-y-3">
            {entryStatuses.map((item) => (
              <Card key={item.status}>
                <CardContent className="p-4 flex items-start gap-3">
                  <item.icon className="mt-0.5 h-5 w-5 text-primary shrink-0" />
                  <div>
                    <h3 className="font-semibold">{item.status}</h3>
                    <p className="text-sm text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <InfoCallout type="tip" title="Ledger Agent">
          The Ledger Agent is the single point of entry for all journal
          postings. It validates double-entry integrity, ensures debits equal
          credits, and maintains the audit trail. Ask "Post this journal entry"
          or "Show me unposted entries."
        </InfoCallout>

        <RelatedLinks
          links={[
            {
              title: "Fiscal Periods Module",
              href: "/docs/modules/fiscal",
              description: "Period management and closing",
            },
            {
              title: "Chart of Accounts",
              href: "/docs/modules/coa",
              description: "Account structure",
            },
            {
              title: "Ledger Agent",
              href: "/docs/agents/ledger",
              description: "AI agent for journal posting",
            },
            {
              title: "Reports Module",
              href: "/docs/modules/reports",
              description: "General ledger reports",
            },
          ]}
        />
      </div>
    </>
  );
}
