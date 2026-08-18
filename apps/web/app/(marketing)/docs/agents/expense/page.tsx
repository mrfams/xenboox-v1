import {
  Receipt,
  Wallet,
  AlertTriangle,
  CheckCircle,
  FileText,
  CreditCard,
} from "lucide-react";

import { DocsPageHeader } from "../../components/docs-page-header";
import { FeatureGrid } from "../../components/feature-grid";
import { InfoCallout } from "../../components/info-callout";
import { RelatedLinks } from "../../components/related-links";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";

const capabilities = [
  {
    title: "Expense Submission",
    description:
      "Employees submit expenses with receipts, categories, and project tags. The agent validates completeness and policy fit before anything moves forward.",
    icon: Receipt,
  },
  {
    title: "Policy Screening",
    description:
      "Every claim is checked against spend policy — per-diem limits, approved categories, and documentation rules. Out-of-policy lines are flagged with a reason.",
    icon: AlertTriangle,
  },
  {
    title: "Approval Workflow",
    description:
      "Clean claims route to the manager for one-click approval. Flagged claims carry the policy signal forward so approvers see exactly why attention is needed.",
    icon: CheckCircle,
  },
  {
    title: "Reimbursement",
    description:
      "Approved claims move to reimbursement — bank transfer, mobile money, cash, or cheque — with payment references recorded against each claim.",
    icon: Wallet,
  },
];

export default function ExpenseAgentDocPage() {
  return (
    <>
      <DocsPageHeader
        title="Expense Agent"
        description="The Expense Agent runs the employee reimbursement workflow — submission, policy screening, approval, and payment — so spend stays controlled and documented."
        breadcrumbs={[
          { label: "Agents", href: "/docs/agents" },
          { label: "Expense", href: "/docs/agents/expense" },
        ]}
        icon={CreditCard}
      />

      <div className="space-y-10">
        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">Overview</h2>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground leading-relaxed">
                The Expense Agent digitizes the entire employee spend cycle.
                Receipts come in from email, mobile, or document upload; the
                agent extracts line items, screens them against company policy,
                and routes clean claims straight to approval. Policy exceptions
                are surfaced with the specific rule that was triggered rather
                than buried in a generic review queue. Once approved, the claim
                is reimbursed through the configured payment method and every
                step — submission, decision, payment — is written to the audit
                trail.
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
            Claim Lifecycle
          </h2>
          <Card>
            <CardContent className="pt-6">
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left font-medium">Stage</th>
                      <th className="px-4 py-3 text-left font-medium">
                        What Happens
                      </th>
                      <th className="px-4 py-3 text-left font-medium">
                        Control
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="px-4 py-3">Submitted</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        Claim enters the queue with line items, receipts, and
                        policy signals.
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-green-600">Auto-validated</span>
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="px-4 py-3">Flagged</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        Out-of-policy lines carry the specific rule that was
                        triggered.
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-amber-600">Policy check</span>
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="px-4 py-3">Approved / Rejected</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        Manager decision recorded with approver identity and
                        timestamp.
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-blue-600">Human decision</span>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3">Reimbursed</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        Payment executed and reference recorded against the
                        claim.
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-green-600">Audit-logged</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>

        <InfoCallout type="tip" title="Example Prompts">
          "Submit my taxi receipt for last week" • "What's pending in the
          approvals queue?" • "Why was this claim flagged?" • "Reimburse claim
          EXP-2026-0142 by bank transfer"
        </InfoCallout>

        <RelatedLinks
          links={[
            {
              title: "Treasury Agent",
              href: "/docs/agents/treasury",
              description: "Cash & liquidity oversight",
            },
            {
              title: "Cash Agent",
              href: "/docs/agents/cash",
              description: "Imprest & petty cash",
            },
            {
              title: "Audit Agent",
              href: "/docs/agents/audit",
              description: "Expense policy compliance",
            },
            {
              title: "Document Agent",
              href: "/docs/agents/document",
              description: "Receipt OCR & extraction",
            },
          ]}
        />
      </div>
    </>
  );
}
