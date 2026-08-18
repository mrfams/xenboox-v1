import {
  FileText,
  Send,
  Eye,
  CheckCircle2,
  ArrowRight,
  Clock,
  FileCheck2,
  Users,
} from "lucide-react";

import { DocsPageHeader } from "../../components/docs-page-header";
import { FeatureGrid } from "../../components/feature-grid";
import { InfoCallout } from "../../components/info-callout";
import { RelatedLinks } from "../../components/related-links";

import { Card, CardContent } from "@/components/ui";

const features = [
  {
    title: "Estimate Creation",
    description:
      "Build professional, line-item estimates with quantities, unit prices, taxes, and discounts. Support for multi-currency quoting and reusable templates.",
    icon: FileText,
  },
  {
    title: "Customer Delivery",
    description:
      "Send estimates to customers by email or shareable link. Track delivery status with a complete send history and per-customer communication trail.",
    icon: Send,
  },
  {
    title: "Status Tracking",
    description:
      "Follow every estimate through draft, sent, viewed, accepted, declined, and converted states. Real-time visibility into which quotes are open and ageing.",
    icon: Eye,
  },
  {
    title: "Acceptance & Conversion",
    description:
      "One-click conversion of accepted estimates into sales invoices — line items, taxes, and customer details carry over, eliminating re-keying and transcription errors.",
    icon: FileCheck2,
  },
  {
    title: "Expiry & Follow-up",
    description:
      "Set expiry dates and receive automated reminders for expiring quotes. Days-left indicators surface at-risk opportunities before they lapse.",
    icon: Clock,
  },
  {
    title: "Win/Loss Insight",
    description:
      "Review accepted versus declined estimates to understand pricing pressure and refine future quotes. Data flows into AR analytics for pipeline visibility.",
    icon: CheckCircle2,
  },
];

const workflowSteps = [
  {
    step: "1",
    title: "Draft the Estimate",
    description:
      "Add line items, quantities, prices, taxes, and a validity period. Choose the customer and currency, then save as a draft.",
  },
  {
    step: "2",
    title: "Send to Customer",
    description:
      "Deliver by email or shareable link. The customer sees a polished, branded quote they can review on any device.",
  },
  {
    step: "3",
    title: "Track Engagement",
    description:
      "Watch status move from sent to viewed, and get notified the moment the customer opens your quote.",
  },
  {
    step: "4",
    title: "Accept or Decline",
    description:
      "The customer accepts or declines. Declined estimates are archived with the reason captured for win/loss analysis.",
  },
  {
    step: "5",
    title: "Convert to Invoice",
    description:
      "Convert an accepted estimate into a sales invoice in one click. The AR module picks up from there — matching payments and managing collections.",
  },
];

export default function EstimatesDocPage() {
  return (
    <>
      <DocsPageHeader
        title="Estimates"
        description="Create, send, and convert professional customer quotes. The Estimates module turns the proposal-to-cash pipeline into a tracked, auditable workflow — from first draft to converted invoice."
        breadcrumbs={[
          { label: "Modules", href: "/docs/modules" },
          { label: "Estimates", href: "/docs/modules/estimates" },
        ]}
        icon={FileText}
      />

      <div className="space-y-10">
        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">Overview</h2>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground leading-relaxed">
                The Estimates module manages the entire quoting lifecycle —
                drafting proposals, sending them to customers, tracking whether
                they have been seen, and converting accepted quotes into sales
                invoices without re-keying a single line. Because every estimate
                is linked to a customer and carries full line-item detail, the
                data flows directly into accounts receivable and reporting, so
                management always knows how much pipeline is open and which
                quotes are at risk of expiring.
              </p>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">
            Key Features
          </h2>
          <FeatureGrid features={features} columns={3} />
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">
            Quote-to-Cash Workflow
          </h2>
          <div className="space-y-3">
            {workflowSteps.map((item) => (
              <Card key={item.step}>
                <CardContent className="p-4 flex items-start gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
                    {item.step}
                  </div>
                  <div>
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {item.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <InfoCallout type="tip" title="AI assistance">
          Xenboox's agents work alongside the Estimates module: the AR Agent can
          draft an estimate from a customer conversation, surface quotes that
          are about to expire, and follow up on stale proposals. Try asking
          "Which estimates are expiring this week?" in the chat panel.
        </InfoCallout>

        <RelatedLinks
          links={[
            {
              title: "AR Module",
              href: "/docs/modules/ar",
              description: "Accounts receivable and collections",
            },
            {
              title: "Customers",
              href: "/docs/modules/organizations",
              description: "Customer records and access control",
            },
            {
              title: "AR Agent",
              href: "/docs/agents/ar",
              description: "AI agent for invoicing and collections",
            },
            {
              title: "Reports Module",
              href: "/docs/modules/reports",
              description: "Financial reporting and analysis",
            },
          ]}
        />
      </div>
    </>
  );
}
