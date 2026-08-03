import Link from "next/link";
import { DocsPageHeader } from "../components/docs-page-header";
import { RelatedLinks } from "../components/related-links";
import { Webhook, ArrowRight, ExternalLink } from "lucide-react";

const events = [
  {
    event: "journal_entry.created",
    description: "A new journal entry was created",
  },
  {
    event: "journal_entry.posted",
    description: "A journal entry was posted to the ledger",
  },
  {
    event: "invoice.created",
    description: "A new invoice was created",
  },
  {
    event: "invoice.paid",
    description: "An invoice was marked as paid",
  },
  {
    event: "payment.received",
    description: "A payment was received",
  },
  {
    event: "payment.sent",
    description: "A payment was sent",
  },
  {
    event: "bank_transaction.imported",
    description: "New bank transactions were imported",
  },
  {
    event: "reconciliation.completed",
    description: "A bank reconciliation was completed",
  },
  {
    event: "period.closed",
    description: "A fiscal period was closed",
  },
  {
    event: "report.generated",
    description: "A financial report was generated",
  },
];

const examplePayload = `{
  "id": "evt_1234567890",
  "type": "journal_entry.posted",
  "created_at": "2025-01-15T10:30:00Z",
  "data": {
    "id": "je_abc123",
    "description": "Office supplies purchase",
    "status": "posted",
    "total_debit": "500.00",
    "total_credit": "500.00"
  }
}`;

export default function WebhooksPage() {
  return (
    <>
      <DocsPageHeader
        title="Webhooks"
        description="Receive real-time notifications when events happen in your Xenboox account. Webhooks allow you to build integrations and automate workflows."
        breadcrumbs={[{ label: "Webhooks", href: "/docs/webhooks" }]}
        icon={Webhook}
      />

      <div className="space-y-8">
        {/* Overview */}
        <section>
          <p className="text-muted-foreground leading-relaxed">
            Webhooks send HTTP POST requests to your specified URL when events
            occur in Xenboox. This enables you to build custom integrations,
            trigger external workflows, and keep your systems in sync.
          </p>
        </section>

        {/* How it works */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">
            How Webhooks Work
          </h2>
          <div className="mt-4 space-y-4">
            {[
              {
                step: "1",
                title: "Register a webhook URL",
                description:
                  "Add your endpoint URL in Settings → Webhooks. Choose which events to subscribe to.",
              },
              {
                step: "2",
                title: "Receive events",
                description:
                  "When an event occurs, Xenboox sends a POST request to your URL with the event data as JSON.",
              },
              {
                step: "3",
                title: "Verify and process",
                description:
                  "Verify the webhook signature to ensure authenticity, then process the event data.",
              },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  {item.step}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {item.title}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Events */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Available Events
          </h2>
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-foreground">
                    Event
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-foreground">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {events.map((event) => (
                  <tr key={event.event} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-xs text-primary">
                      {event.event}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {event.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Example Payload */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Example Payload
          </h2>
          <div className="rounded-xl border border-border bg-muted/30 p-4 overflow-x-auto">
            <pre className="text-sm font-mono text-foreground">
              {examplePayload}
            </pre>
          </div>
        </section>

        {/* Verifying Webhooks */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">
            Verifying Webhook Signatures
          </h2>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            Every webhook request includes a <code>X-Xenboox-Signature</code>{" "}
            header containing an HMAC-SHA256 signature of the request body. Use
            your webhook secret to verify the signature and ensure the request
            is authentic.
          </p>
          <div className="mt-4 rounded-lg border border-border bg-muted/30 p-4 overflow-x-auto">
            <pre className="text-sm font-mono text-foreground">
              {`const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return signature === expected;
}`}
            </pre>
          </div>
        </section>

        <RelatedLinks
          links={[
            {
              title: "API Authentication",
              href: "/docs/api/auth",
              description: "Set up API keys and OAuth",
            },
            {
              title: "Rate Limits",
              href: "/docs/api/rate-limits",
              description: "Understand API rate limits",
            },
            {
              title: "API Reference",
              href: "/docs/api",
              description: "Explore all API endpoints",
            },
          ]}
        />
      </div>
    </>
  );
}
