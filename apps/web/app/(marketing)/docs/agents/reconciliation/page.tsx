import {
  Repeat,
  Landmark,
  CheckCircle,
  AlertTriangle,
  Search,
  FileText,
} from "lucide-react";

import { DocsPageHeader } from "../../components/docs-page-header";
import { FeatureGrid } from "../../components/feature-grid";
import { InfoCallout } from "../../components/info-callout";
import { RelatedLinks } from "../../components/related-links";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";

const capabilities = [
  {
    title: "Bank Reconciliation",
    description:
      "Matches bank transactions against ledger entries, identifies outstanding items, and builds reconciliation statements automatically.",
    icon: Landmark,
  },
  {
    title: "Auto-Matching",
    description:
      "Matches transactions by amount, reference, and date with configurable tolerance. Confident matches are proposed; ambiguous ones are flagged for review.",
    icon: Search,
  },
  {
    title: "Discrepancy Detection",
    description:
      "Flags unreconciled items, timing differences, and unexplained variances. Every discrepancy is attributed and logged for audit.",
    icon: AlertTriangle,
  },
  {
    title: "Reconciliation Reports",
    description:
      "Generates bank reconciliation statements, outstanding item reports, and cleared-item schedules ready for review and sign-off.",
    icon: FileText,
  },
];

export default function ReconciliationAgentDocPage() {
  return (
    <>
      <DocsPageHeader
        title="Reconciliation Agent"
        description="The Reconciliation Agent keeps bank, cash, and mobile-money balances in sync with the ledger. It matches transactions automatically and surfaces exceptions for review."
        breadcrumbs={[
          { label: "Agents", href: "/docs/agents" },
          { label: "Reconciliation", href: "/docs/agents/reconciliation" },
        ]}
        icon={Repeat}
      />

      <div className="space-y-10">
        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">Overview</h2>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground leading-relaxed">
                The Reconciliation Agent is the Treasury department's
                verification engine. It continuously matches transactions from
                bank feeds, cash counts, and mobile-money statements against the
                general ledger, so the books always reflect reality. When it
                finds a confident match it proposes it for approval; when items
                don't line up it escalates with full context instead of
                guessing. Every match and every exception is written to the
                audit trail, making the reconciliation process fully traceable
                and audit-ready.
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
            How Matching Works
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-balanced-green" />
                  Confident Match
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Amount, reference, and date align within tolerance. The match
                  is proposed to the controller for one-click approval — no
                  manual searching required.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Search className="h-4 w-4 text-primary" />
                  Suggested Match
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Amount matches but reference or timing differs. The agent
                  surfaces the candidate pair with the evidence so a human can
                  decide quickly.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-attention-amber" />
                  Unmatched
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  No plausible counterpart exists. The item is flagged with a
                  reason, surfaced on the treasury dashboard, and never silently
                  absorbed into the books.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">
            Reconciliation Workflow
          </h2>
          <Card>
            <CardContent className="pt-6">
              <ol className="space-y-4">
                {[
                  [
                    "Ingest",
                    "Bank, cash, and mobile-money statements are pulled from connected feeds or uploaded documents.",
                  ],
                  [
                    "Match",
                    "The agent proposes matches against ledger entries using amount, reference, and date heuristics.",
                  ],
                  [
                    "Review",
                    "The Controller Agent or a finance user approves confident matches and resolves flagged exceptions.",
                  ],
                  [
                    "Close",
                    "The reconciliation is finalized, the balance confirmed, and the statement archived to the audit trail.",
                  ],
                ].map(([step, desc], i) => (
                  <li key={step} className="flex gap-4">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{step}</p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </section>

        <InfoCallout type="tip" title="Example Prompts">
          "Reconcile the GTBank statement for June" • "Match outstanding items
          against the ledger" • "Show me unreconciled transactions" • "Why
          didn't payment TXN-8821 match?"
        </InfoCallout>

        <RelatedLinks
          links={[
            {
              title: "Treasury Agent",
              href: "/docs/agents/treasury",
              description: "Cash position & liquidity",
            },
            {
              title: "Cash Agent",
              href: "/docs/agents/cash",
              description: "Petty cash & imprest",
            },
            {
              title: "Ledger Agent",
              href: "/docs/agents/ledger",
              description: "Posting & journal entries",
            },
            {
              title: "Mobile Money Agent",
              href: "/docs/agents/mobile-money",
              description: "Mobile money reconciliation",
            },
          ]}
        />
      </div>
    </>
  );
}
