import { FileText, ArrowRightLeft, Scale, History } from "lucide-react";

import { DocsPageHeader } from "../../components/docs-page-header";
import { FeatureGrid } from "../../components/feature-grid";
import { InfoCallout } from "../../components/info-callout";
import { RelatedLinks } from "../../components/related-links";

import { Card, CardContent } from "@/components/ui";

const features = [
  {
    title: "Double-Entry Foundation",
    description:
      "Every journal entry has equal debits and credits. The Ledger Agent enforces balance on every posting — an unbalanced entry is rejected before it reaches the books.",
    icon: Scale,
  },
  {
    title: "Line Items",
    description:
      "Each entry is made of lines, one per account. Lines carry the account, amount, and direction (debit or credit), plus optional dimensions for reporting.",
    icon: FileText,
  },
  {
    title: "Posting & Reversal",
    description:
      "Entries move through a status workflow — draft, posted, reversed. Reversals create a compensating entry so history is never erased, only corrected.",
    icon: ArrowRightLeft,
  },
  {
    title: "Full Attribution",
    description:
      "Every entry records who or what created it — a user, an agent, or an automated pipeline — plus a confidence score for agent-created entries. Nothing posts anonymously.",
    icon: History,
  },
];

export default function JournalEntriesConceptPage() {
  return (
    <>
      <DocsPageHeader
        title="Journal Entries"
        description="The foundation of double-entry accounting — every transaction, recorded in balance."
        breadcrumbs={[
          { label: "Concepts", href: "/docs/concepts" },
          { label: "Journal Entries", href: "/docs/concepts/journal-entries" },
        ]}
        icon={FileText}
      />

      <div className="space-y-10">
        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">Overview</h2>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Journal entries are the atomic unit of your ledger. Every
                financial event — an invoice paid, a payroll run, a bank
                transfer — is ultimately represented as a journal entry with
                equal debits and credits. Because the Ledger Agent is the single
                point of entry for posting, all entries pass through the same
                validation, attribution, and audit path regardless of which
                module or agent originated them.
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

        <InfoCallout type="info" title="One ledger, one point of entry">
          Workers never post directly. Agents draft entries and hand them to the
          Ledger Agent, which validates, attributes, and posts. This single
          point of entry is what keeps the ledger clean and auditable at scale.
        </InfoCallout>

        <RelatedLinks
          links={[
            {
              title: "Journal Module",
              href: "/docs/modules/journal",
              description: "Working with entries in the app",
            },
            {
              title: "Ledger Agent",
              href: "/docs/agents/ledger",
              description: "The single point of posting",
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
