import Link from "next/link";
import { ArrowLeft, ArrowRight, ExternalLink } from "lucide-react";

import { DocsPageHeader } from "../../components/docs-page-header";
import { CodeBlock } from "../../components/code-block";
import { InfoCallout } from "../../components/info-callout";
import { RelatedLinks } from "../../components/related-links";

export default function RestApiPage() {
  return (
    <>
      <DocsPageHeader
        title="REST API v1"
        description="HTTP/JSON API for external integrations. API-key authenticated, entity-scoped, with full OpenAPI documentation."
        breadcrumbs={[
          { label: "API", href: "/docs/api" },
          { label: "REST API v1", href: "/docs/api/rest-api" },
        ]}
      />

      <div className="space-y-8">
        {/* Overview */}
        <section className="prose prose-neutral dark:prose-invert max-w-none">
          <h2>Overview</h2>
          <p>
            The Xenboox REST API v1 provides HTTP/JSON access to your financial
            data. It&apos;s designed for third-party integrations, custom
            reporting, and programmatic workflows. Every endpoint follows the
            same RBAC and entity-scoping model as the web dashboard — API access
            is never a shortcut around security.
          </p>
        </section>

        {/* Quick Start */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-lg font-semibold text-foreground">Quick Start</h3>
          <div className="mt-4 space-y-4">
            <div className="rounded-lg bg-muted/50 p-4">
              <h4 className="text-sm font-medium text-foreground">
                1. Generate an API Key
              </h4>
              <p className="mt-1 text-sm text-muted-foreground">
                Go to <strong>Settings → API Keys</strong> in the dashboard.
                Click <strong>Generate Key</strong> and select the entities and
                permissions this key should access.
              </p>
            </div>
            <div className="rounded-lg bg-muted/50 p-4">
              <h4 className="text-sm font-medium text-foreground">
                2. Make Your First Request
              </h4>
              <CodeBlock
                language="bash"
                code={`# List journal entries
curl -H "x-api-key: xb_your_key_here" \\
  https://xenboox.vercel.app/api/v1/transactions

# List customers
curl -H "x-api-key: xb_your_key_here" \\
  https://xenboox.vercel.app/api/v1/customers

# Get trial balance
curl -H "x-api-key: xb_your_key_here" \\
  https://xenboox.vercel.app/api/v1/reports/trial-balance`}
              />
            </div>
            <div className="rounded-lg bg-muted/50 p-4">
              <h4 className="text-sm font-medium text-foreground">
                3. Check Response Headers
              </h4>
              <p className="mt-1 text-sm text-muted-foreground">
                Every response includes rate-limit headers:
              </p>
              <CodeBlock
                language="text"
                code={`X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 997
X-RateLimit-Reset: 1724006400`}
              />
            </div>
          </div>
        </section>

        {/* Authentication */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-lg font-semibold text-foreground">
            Authentication
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            All requests require an API key passed via the{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              x-api-key
            </code>{" "}
            header. Keys follow the format{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              xb_xxx...xxx
            </code>{" "}
            and are scoped to specific entities and roles.
          </p>
          <CodeBlock
            language="bash"
            code={`# Include the key in every request
curl -H "x-api-key: xb_a1b2c3d4e5f6..." \\
  https://xenboox.vercel.app/api/v1/transactions

# Python
import requests
headers = {"x-api-key": "xb_a1b2c3d4e5f6..."}
response = requests.get("https://xenboox.vercel.app/api/v1/transactions", headers=headers)

# JavaScript
const response = await fetch("https://xenboox.vercel.app/api/v1/transactions", {
  headers: { "x-api-key": "xb_a1b2c3d4e5f6..." }
});`}
          />
        </section>

        {/* Endpoints */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-lg font-semibold text-foreground">
            Available Endpoints
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            The REST API v1 supports the following resources:
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-2 text-left font-medium text-muted-foreground">
                    Method
                  </th>
                  <th className="pb-2 text-left font-medium text-muted-foreground">
                    Endpoint
                  </th>
                  <th className="pb-2 text-left font-medium text-muted-foreground">
                    Description
                  </th>
                  <th className="pb-2 text-left font-medium text-muted-foreground">
                    Permission
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[
                  [
                    "GET",
                    "/api/v1/transactions",
                    "List journal entries with lines",
                    "read",
                  ],
                  [
                    "POST",
                    "/api/v1/transactions",
                    "Create journal entry (agent-reviewed)",
                    "write",
                  ],
                  ["GET", "/api/v1/accounts", "List chart of accounts", "read"],
                  [
                    "GET",
                    "/api/v1/accounts/balances",
                    "List accounts with balances",
                    "read",
                  ],
                  ["GET", "/api/v1/invoices", "List sales invoices", "read"],
                  [
                    "POST",
                    "/api/v1/invoices",
                    "Create sales invoice (agent-reviewed)",
                    "write",
                  ],
                  ["GET", "/api/v1/bills", "List bills (AP invoices)", "read"],
                  ["GET", "/api/v1/customers", "List customers", "read"],
                  ["GET", "/api/v1/suppliers", "List suppliers", "read"],
                  ["GET", "/api/v1/bank", "List bank accounts", "read"],
                  [
                    "GET",
                    "/api/v1/bank-transactions",
                    "List bank transactions",
                    "read",
                  ],
                  [
                    "GET",
                    "/api/v1/reports/trial-balance",
                    "Get trial balance",
                    "read",
                  ],
                ].map(([method, endpoint, desc, perm]) => (
                  <tr key={endpoint + method}>
                    <td className="py-2">
                      <span
                        className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-bold ${
                          method === "GET"
                            ? "bg-balanced-green/10 text-balanced-green dark:text-balanced-green"
                            : "bg-primary/50/10 text-primary "
                        }`}
                      >
                        {method}
                      </span>
                    </td>
                    <td className="py-2 font-mono text-xs">{endpoint}</td>
                    <td className="py-2 text-muted-foreground">{desc}</td>
                    <td className="py-2">
                      <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        {perm}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* OpenAPI Spec */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-lg font-semibold text-foreground">
            OpenAPI Specification
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            The full OpenAPI 3.1 specification is available at:
          </p>
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm text-primary">
                GET /api/v1/openapi
              </span>
              <span className="text-xs text-muted-foreground">
                — Returns the spec as JSON
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              You can use this spec with:
            </p>
            <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
              <li>
                <strong>Swagger UI</strong> — interactive API explorer
              </li>
              <li>
                <strong>Redoc</strong> — beautiful documentation rendering
              </li>
              <li>
                <strong>Postman</strong> — import the spec for testing
              </li>
              <li>
                <strong>OpenAPI Generator</strong> — generate clients in any
                language
              </li>
            </ul>
          </div>
          <CodeBlock
            language="bash"
            code={`# Fetch the OpenAPI spec
curl https://xenboox.vercel.app/api/v1/openapi

# Generate a TypeScript client
npx @openapitools/openapi-generator-cli generate \\
  -i https://xenboox.vercel.app/api/v1/openapi \\
  -g typescript-fetch \\
  -o ./generated/xenboox-client`}
          />
        </section>

        {/* Rate Limits */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-lg font-semibold text-foreground">Rate Limits</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            API rate limits are enforced per API key and vary by plan tier:
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-2 text-left font-medium text-muted-foreground">
                    Plan
                  </th>
                  <th className="pb-2 text-left font-medium text-muted-foreground">
                    Requests/Minute
                  </th>
                  <th className="pb-2 text-left font-medium text-muted-foreground">
                    Burst
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[
                  ["Free", "100", "10"],
                  ["Pro", "1,000", "100"],
                  ["Firm", "5,000", "500"],
                  ["Enterprise", "10,000", "1,000"],
                ].map(([plan, rpm, burst]) => (
                  <tr key={plan}>
                    <td className="py-2 font-medium text-foreground">{plan}</td>
                    <td className="py-2 text-muted-foreground">{rpm}</td>
                    <td className="py-2 text-muted-foreground">{burst}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Error Handling */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-lg font-semibold text-foreground">
            Error Handling
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            All errors return structured JSON with a consistent shape:
          </p>
          <CodeBlock
            language="json"
            code={`{
  "error": true,
  "message": "Forbidden: API key does not have read access to this resource",
  "documentation": "https://docs.xenboox.com/api/v1"
}`}
          />
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-2 text-left font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="pb-2 text-left font-medium text-muted-foreground">
                    Meaning
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[
                  ["200", "Success"],
                  ["202", "Accepted — queued for agent review"],
                  ["400", "Bad request — invalid parameters"],
                  ["401", "Unauthorized — missing or invalid API key"],
                  ["403", "Forbidden — key lacks required permission"],
                  ["404", "Not found — unknown resource"],
                  ["429", "Rate limited — check X-RateLimit-Reset header"],
                  ["500", "Internal error — retry with exponential backoff"],
                ].map(([status, meaning]) => (
                  <tr key={status}>
                    <td className="py-2">
                      <code className="rounded bg-muted px-1 py-0.5 text-xs">
                        {status}
                      </code>
                    </td>
                    <td className="py-2 text-muted-foreground">{meaning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Webhooks */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-lg font-semibold text-foreground">
            Webhook Integration
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            In addition to polling, you can subscribe to real-time events via
            webhooks. When events occur (e.g., invoice paid, reconciliation
            flagged), Xenboox delivers a signed HTTP POST to your endpoint.
          </p>
          <div className="mt-4 space-y-2">
            <p className="text-sm text-muted-foreground">
              <strong>Supported events:</strong>
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                "invoice.paid",
                "invoice.overdue",
                "reconciliation.flagged",
                "budget.threshold_exceeded",
                "transaction.created",
                "expense.approved",
                "payroll.completed",
                "document.processed",
                "close.completed",
              ].map((event) => (
                <span
                  key={event}
                  className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-mono text-muted-foreground"
                >
                  {event}
                </span>
              ))}
            </div>
          </div>
          <div className="mt-4">
            <Link
              href="/docs/webhooks"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              View webhook documentation <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </section>

        {/* Related Links */}
        <RelatedLinks
          links={[
            {
              title: "Authentication",
              href: "/docs/api/auth",
              description: "API key management and scopes",
            },
            {
              title: "Rate Limits",
              href: "/docs/api/rate-limits",
              description: "Detailed rate limit documentation",
            },
            {
              title: "Webhooks",
              href: "/docs/webhooks",
              description: "Event-driven integration",
            },
          ]}
        />

        {/* Navigation */}
        <div className="flex items-center justify-between border-t border-border pt-6">
          <Link
            href="/docs/api"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            API Overview
          </Link>
          <Link
            href="/docs/api/auth"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Authentication
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </>
  );
}
