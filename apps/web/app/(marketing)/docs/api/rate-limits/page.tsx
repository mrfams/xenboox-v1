import { Gauge, Clock, ShieldAlert, Info } from "lucide-react";

import { DocsPageHeader } from "../../components/docs-page-header";
import { InfoCallout } from "../../components/info-callout";
import { RelatedLinks } from "../../components/related-links";

import { Card, CardContent } from "@/components/ui";

const planLimits = [
  { plan: "Free", api: 200, agent: 5, chat: 10, webhook: 20 },
  { plan: "Starter", api: 500, agent: 10, chat: 20, webhook: 50 },
  { plan: "Growth", api: 1000, agent: 20, chat: 30, webhook: 100 },
  { plan: "Pro", api: 5000, agent: 50, chat: 60, webhook: 200 },
  { plan: "Firm", api: 10000, agent: 100, chat: 120, webhook: 500 },
];

export default function ApiRateLimitsPage() {
  return (
    <>
      <DocsPageHeader
        title="Rate Limits"
        description="Per-plan quotas for API calls, agent runs, chat messages, and webhook deliveries — with standard response headers so clients can back off."
        breadcrumbs={[
          { label: "API", href: "/docs/api" },
          { label: "Rate Limits", href: "/docs/api/rate-limits" },
        ]}
        icon={Gauge}
      />

      <div className="space-y-10">
        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">
            Limits by Plan
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Limits are per user, per minute, and scale with the organization's
            billing plan.
          </p>
          <Card>
            <CardContent className="pt-6">
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left font-medium">Plan</th>
                      <th className="px-4 py-3 text-right font-medium">
                        API / min
                      </th>
                      <th className="px-4 py-3 text-right font-medium">
                        Agent / min
                      </th>
                      <th className="px-4 py-3 text-right font-medium">
                        Chat / min
                      </th>
                      <th className="px-4 py-3 text-right font-medium">
                        Webhook / min
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {planLimits.map((p) => (
                      <tr key={p.plan} className="border-b last:border-0">
                        <td className="px-4 py-3 font-medium">{p.plan}</td>
                        <td className="px-4 py-3 text-right">{p.api}</td>
                        <td className="px-4 py-3 text-right">{p.agent}</td>
                        <td className="px-4 py-3 text-right">{p.chat}</td>
                        <td className="px-4 py-3 text-right">{p.webhook}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">
            Response Headers
          </h2>
          <Card>
            <CardContent className="pt-6">
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left font-medium">
                        Header
                      </th>
                      <th className="px-4 py-3 text-left font-medium">
                        Meaning
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      [
                        "X-RateLimit-Limit",
                        "Maximum requests allowed in the window",
                      ],
                      [
                        "X-RateLimit-Remaining",
                        "Requests left in the current window",
                      ],
                      [
                        "X-RateLimit-Reset",
                        "Unix timestamp when the window resets",
                      ],
                    ].map(([h, d]) => (
                      <tr key={h} className="border-b last:border-0">
                        <td className="px-4 py-3 font-mono text-xs">{h}</td>
                        <td className="px-4 py-3 text-muted-foreground">{d}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>

        <InfoCallout type="warning" title="Handle 429 responses">
          When you exceed a limit you receive{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">429</code> with
          a message telling you when to retry. Back off using the
          X-RateLimit-Reset header — retrying immediately only deepens the
          penalty.
        </InfoCallout>

        <InfoCallout type="info" title="Heavy operations">
          Report generation, bulk exports, and document pipelines also carry a
          per-tenant concurrency cap so one workspace cannot starve the shared
          pool. These return 429 with a "too many heavy operations" message.
        </InfoCallout>

        <RelatedLinks
          links={[
            {
              title: "API Overview",
              href: "/docs/api",
              description: "Platform reference",
            },
            {
              title: "Authentication",
              href: "/docs/api/auth",
              description: "Sessions and API keys",
            },
            {
              title: "Webhooks",
              href: "/docs/webhooks",
              description: "Delivery guarantees",
            },
          ]}
        />
      </div>
    </>
  );
}
