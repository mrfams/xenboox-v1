import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { DocsPageHeader } from "../../components/docs-page-header";
import { FeatureGrid } from "../../components/feature-grid";
import { InfoCallout } from "../../components/info-callout";
import { RelatedLinks } from "../../components/related-links";
import {
  FileText,
  CheckCircle,
  BookOpen,
  RefreshCw,
  Search,
  Shield,
} from "lucide-react";

const capabilities = [
  {
    title: "Double-Entry Posting",
    description:
      "Validates and posts all journal entries ensuring debits equal credits. Supports complex multi-line entries with automatic validation.",
    icon: BookOpen,
  },
  {
    title: "Journal Creation",
    description:
      "Automatically creates journal entries from various sources including AP invoices, AR payments, payroll runs, and depreciation schedules.",
    icon: FileText,
  },
  {
    title: "Account Reconciliation",
    description:
      "Validates account balances and flags discrepancies. Ensures all sub-ledgers reconcile with the general ledger.",
    icon: CheckCircle,
  },
  {
    title: "Audit Trail",
    description:
      "Maintains a complete audit trail for every entry including who created it, when, and what changes were made. Immutable record-keeping.",
    icon: Shield,
  },
];

export default function LedgerAgentDocPage() {
  return (
    <>
      <DocsPageHeader
        title="Ledger Agent"
        description="The Ledger Agent is the single point of entry for all journal postings. It validates double-entry integrity and maintains the complete audit trail."
        breadcrumbs={[
          { label: "Agents", href: "/docs/agents" },
          { label: "Ledger", href: "/docs/agents/ledger" },
        ]}
        icon={FileText}
      />

      <div className="space-y-10">
        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">Overview</h2>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground leading-relaxed">
                The Ledger Agent is the most critical worker agent in Xenboox —
                it is the single point of entry for all journal postings to the
                general ledger. It validates every entry for double-entry
                integrity, ensures debits equal credits, and maintains a
                complete, immutable audit trail. The Ledger Agent receives
                posting requests from all other agents and ensures that every
                financial transaction is properly recorded. No other agent or
                user can post directly to the general ledger.
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
            Posting Rules
          </h2>
          <Card>
            <CardContent className="pt-6">
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                  <span>
                    <strong>Debits = Credits</strong> — Every journal entry must
                    have equal debits and credits. The Ledger Agent validates
                    this before posting.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                  <span>
                    <strong>Entity Scoping</strong> — All entries are scoped to
                    an entity. Cross-entity postings require special
                    authorization.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                  <span>
                    <strong>Period Validation</strong> — Entries can only be
                    posted to open fiscal periods. Closed periods are locked.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                  <span>
                    <strong>Account Validation</strong> — All account references
                    must exist and be active in the Chart of Accounts.
                  </span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </section>

        <InfoCallout type="tip" title="Example Prompts">
          "Post this journal entry" • "Show me unposted entries" • "Reverse
          entry #1234" • "What was posted today?" • "Validate this journal entry
          before posting"
        </InfoCallout>

        <RelatedLinks
          links={[
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
              title: "Chart of Accounts",
              href: "/docs/modules/coa",
              description: "Account structure",
            },
            {
              title: "Fiscal Periods Module",
              href: "/docs/modules/fiscal",
              description: "Period management",
            },
          ]}
        />
      </div>
    </>
  );
}
