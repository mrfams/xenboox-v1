import {
  Plug,
  Landmark,
  Webhook,
  FileText,
  Database,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

import { DocsPageHeader } from "../components/docs-page-header";
import { InfoCallout } from "../components/info-callout";
import { FeatureGrid } from "../components/feature-grid";
import { RelatedLinks } from "../components/related-links";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";

const integrations = [
  {
    title: "Bank Feeds",
    description:
      "Connect bank accounts to pull statements automatically. Transactions arrive in the reconciliation queue for the Reconciliation Agent to match.",
    icon: Landmark,
  },
  {
    title: "Mobile Money",
    description:
      "Import mobile money statements (MTN MoMo, Airtel Money, etc.) for automatic reconciliation against the ledger.",
    icon: Plug,
  },
  {
    title: "Webhooks",
    description:
      "Receive real-time events — invoice created, payment received, journal posted — in your own systems via signed webhook payloads.",
    icon: Webhook,
  },
  {
    title: "Email Ingestion",
    description:
      "Forward supplier invoices and receipts to a dedicated inbox; the Document Agent extracts and files them automatically.",
    icon: FileText,
  },
  {
    title: "Document Upload",
    description:
      "Upload statements, receipts, and contracts in bulk. OCR extraction classifies and books them with confidence scores.",
    icon: Database,
  },
];

const steps = [
  {
    title: "Choose your integration",
    description:
      "From Settings → Integrations, select the connector you need — bank, mobile money, webhook, or email.",
  },
  {
    title: "Authenticate securely",
    description:
      "Credentials are encrypted at rest and never logged. Bank feeds use token-based auth scoped to the connected institution.",
  },
  {
    title: "Test the connection",
    description:
      "Xenboox performs a live connectivity check and imports a small sample so you can confirm the data shape.",
  },
  {
    title: "Map to accounts",
    description:
      "Assign default ledger accounts for incoming transactions so automation posts to the right place.",
  },
  {
    title: "Go live",
    description:
      "Enable the integration. Data flows continuously, and every item is traceable back to its source feed.",
  },
];

export default function IntegrationsPage() {
  return (
    <>
      <DocsPageHeader
        title="Integrations"
        description="Connect Xenboox to your bank, mobile money provider, and existing systems so data flows in automatically — no manual re-keying."
        breadcrumbs={[
          { label: "Guides", href: "/docs/getting-started" },
          { label: "Integrations", href: "/docs/integrations" },
        ]}
        icon={Plug}
      />

      <div className="space-y-10">
        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">
            Available Integrations
          </h2>
          <FeatureGrid features={integrations} />
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">
            Connecting an Integration
          </h2>
          <Card>
            <CardContent className="pt-6">
              <ol className="space-y-4">
                {steps.map((step, i) => (
                  <li key={step.title} className="flex gap-4">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{step.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {step.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">Webhooks</h2>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Webhooks let your own systems react to Xenboox events in real
                time. Every payload is signed with an HMAC secret so you can
                verify its authenticity. See the{" "}
                <Link
                  href="/docs/webhooks"
                  className="text-primary hover:underline"
                >
                  Webhooks reference
                </Link>{" "}
                for the full event catalog, payload schemas, and delivery
                guarantees.
              </p>
            </CardContent>
          </Card>
        </section>

        <InfoCallout type="tip" title="Start with bank feeds">
          Bank feeds deliver the fastest time-to-value: statements arrive
          automatically, the Reconciliation Agent matches them against the
          ledger, and your cash position stays current without manual entry.
        </InfoCallout>

        <RelatedLinks
          links={[
            {
              title: "Webhooks",
              href: "/docs/webhooks",
              description: "Event reference & delivery",
            },
            {
              title: "API Reference",
              href: "/docs/api",
              description: "Build custom integrations",
            },
            {
              title: "Document Agent",
              href: "/docs/agents/document",
              description: "OCR & data extraction",
            },
            {
              title: "Reconciliation Agent",
              href: "/docs/agents/reconciliation",
              description: "Automatic transaction matching",
            },
          ]}
        />
      </div>
    </>
  );
}
