import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { DocsPageHeader } from "../../components/docs-page-header";
import { CodeBlock } from "../../components/code-block";
import { RelatedLinks } from "../../components/related-links";

export default function AuditTrailPage() {
  return (
    <>
      <DocsPageHeader
        title="Audit Trail"
        description="Every action in Xenboox is logged with who did it, when, what changed, and why. This provides a complete, tamper-evident history for compliance and dispute resolution."
        breadcrumbs={[
          { label: "Core Concepts", href: "/docs/concepts" },
          { label: "Audit Trail", href: "/docs/concepts/audit-trail" },
        ]}
      />

      <div className="space-y-8">
        {/* Overview */}
        <section className="prose prose-neutral dark:prose-invert max-w-none">
          <h2>Why Audit Trail Matters</h2>
          <p>
            In financial accounting, every transaction must be traceable.
            Auditors need to verify that entries were made by authorized users
            at authorized times for valid business reasons. Regulators require
            tamper-evident logs. Dispute resolution depends on having a complete
            history of who did what and when.
          </p>
          <p>
            Xenboox implements a comprehensive audit trail that captures every
            mutation across the entire platform — not just financial
            transactions, but also configuration changes, user management, and
            AI agent actions.
          </p>
        </section>

        {/* What's Logged */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-lg font-semibold text-foreground">
            What Gets Logged
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Every auditable event captures the following fields:
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-2 text-left font-medium text-muted-foreground">
                    Field
                  </th>
                  <th className="pb-2 text-left font-medium text-muted-foreground">
                    Description
                  </th>
                  <th className="pb-2 text-left font-medium text-muted-foreground">
                    Example
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[
                  [
                    "actor",
                    "Who performed the action",
                    "user@example.com, AI Agent:payroll",
                  ],
                  ["action", "What was done", "CREATE, UPDATE, DELETE"],
                  ["resource", "What was affected", "journal_entry, invoice"],
                  [
                    "resourceId",
                    "Specific record identifier",
                    "je_abc123, inv_xyz789",
                  ],
                  ["timestamp", "When it happened", "2026-08-18T14:32:00Z"],
                  [
                    "changes",
                    "What changed (before/after)",
                    "{ status: draft → posted }",
                  ],
                  [
                    "reason",
                    "Why (for AI actions and approvals)",
                    "Monthly payroll processing",
                  ],
                  [
                    "ipAddress",
                    "Source IP for security auditing",
                    "192.168.1.100",
                  ],
                  ["userAgent", "Client identification", "Mozilla/5.0 ..."],
                  [
                    "requestId",
                    "Correlation ID for distributed tracing",
                    "req_abc123def456",
                  ],
                ].map(([field, desc, example]) => (
                  <tr key={field}>
                    <td className="py-2">
                      <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">
                        {field}
                      </code>
                    </td>
                    <td className="py-2 text-muted-foreground">{desc}</td>
                    <td className="py-2 text-muted-foreground font-mono text-xs">
                      {example}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* What's Auditable */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-lg font-semibold text-foreground">
            Auditable Events
          </h3>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {[
              {
                category: "Financial Transactions",
                events: [
                  "Journal entry creation, approval, posting, reversal",
                  "Invoice creation, sending, payment, void",
                  "Bill creation, approval, payment",
                  "Bank reconciliation actions",
                  "Payroll processing and approval",
                ],
              },
              {
                category: "Configuration Changes",
                events: [
                  "Chart of accounts modifications",
                  "Fiscal period open/close/lock",
                  "Exchange rate updates",
                  "Tax rule changes",
                  "System settings modifications",
                ],
              },
              {
                category: "User Management",
                events: [
                  "User invitation and removal",
                  "Role assignment changes",
                  "Password resets and MFA changes",
                  "Session creation and revocation",
                  "SSO configuration changes",
                ],
              },
              {
                category: "AI Agent Actions",
                events: [
                  "Agent task execution (input, output, confidence)",
                  "Agent-generated journal entries",
                  "Agent escalations and recommendations",
                  "Approval/rejection of AI proposals",
                  "Agent configuration changes",
                ],
              },
            ].map((cat) => (
              <div
                key={cat.category}
                className="rounded-lg border border-border p-4"
              >
                <h4 className="text-sm font-medium text-foreground">
                  {cat.category}
                </h4>
                <ul className="mt-2 space-y-1">
                  {cat.events.map((event) => (
                    <li
                      key={event}
                      className="text-xs text-muted-foreground flex items-start gap-2"
                    >
                      <span className="text-primary mt-0.5">•</span>
                      {event}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Implementation */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-lg font-semibold text-foreground">
            How It Works
          </h3>
          <div className="mt-4 space-y-4">
            <div className="rounded-lg bg-muted/50 p-4">
              <h4 className="text-sm font-medium text-foreground">
                Middleware Capture
              </h4>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                Every tRPC mutation passes through audit middleware that
                automatically captures the actor, action, resource, and changes
                without requiring manual logging in each procedure.
              </p>
            </div>
            <CodeBlock
              language="typescript"
              code={`// The audit middleware automatically logs:
// - Who: ctx.user.id + ctx.user.email
// - What: router name + procedure name
// - When: timestamp (ISO 8601)
// - Where: entityId (entity scoping)
// - Changes: input diff (before/after for updates)
// - Request: requestId, ipAddress, userAgent

const auditLog = await db.insert(auditLogs).values({
  actorId: ctx.user.id,
  actorEmail: ctx.user.email,
  action: "CREATE",
  resource: "journal_entry",
  resourceId: newEntry.id,
  entityId: ctx.entityId,
  changes: { status: "draft", debitTotal: 5000, creditTotal: 5000 },
  reason: input.reason,
  ipAddress: ctx.ipAddress,
  userAgent: ctx.userAgent,
  requestId: ctx.requestId,
});`}
            />
            <div className="rounded-lg bg-muted/50 p-4">
              <h4 className="text-sm font-medium text-foreground">
                Immutable Storage
              </h4>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                Audit logs are append-only. Records cannot be updated or
                deleted, even by admins. The <code>audit_logs</code> table has
                no UPDATE or DELETE triggers. This ensures tamper-evident
                compliance.
              </p>
            </div>
          </div>
        </section>

        {/* Viewing Audit Logs */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-lg font-semibold text-foreground">
            Viewing Audit Logs
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Audit logs are accessible from multiple surfaces:
          </p>
          <div className="mt-4 space-y-3">
            {[
              {
                surface: "Dashboard Activity Feed",
                description:
                  "Real-time activity stream showing recent actions across the entity. Filterable by user, action type, and date range.",
              },
              {
                surface: "Admin Audit Log",
                description:
                  "Comprehensive log viewer in the admin console with advanced filtering, search, and export capabilities.",
              },
              {
                surface: "Record-Level History",
                description:
                  "Every record (invoice, journal entry, etc.) has a history tab showing all changes made to that specific record.",
              },
              {
                surface: "API Access",
                description:
                  "Audit logs are available via the tRPC API for programmatic access and integration with external compliance tools.",
              },
            ].map((item) => (
              <div key={item.surface} className="flex gap-3 items-start">
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <span className="text-xs text-primary">→</span>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-foreground">
                    {item.surface}
                  </h4>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Compliance */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-lg font-semibold text-foreground">
            Compliance Standards
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Xenboox&apos;s audit trail meets the requirements of major
            accounting and data protection standards:
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              {
                standard: "SOC 2 Type II",
                requirement:
                  "Complete audit logging of all system access and data modifications",
              },
              {
                standard: "GDPR",
                requirement:
                  "Data access logging, right to audit, consent tracking",
              },
              {
                standard: "ISO 27001",
                requirement:
                  "Information security event logging and monitoring",
              },
              {
                standard: "IFRS / GAAP",
                requirement:
                  "Complete journal entry audit trail with user attribution",
              },
              {
                standard: "PCI DSS",
                requirement:
                  "Access logging for systems storing payment card data",
              },
              {
                standard: "African Data Protection",
                requirement:
                  "Nigeria NDPA, Ghana Data Protection Act, Kenya DPA compliance",
              },
            ].map((item) => (
              <div
                key={item.standard}
                className="rounded-lg border border-border p-3"
              >
                <h4 className="text-sm font-medium text-foreground">
                  {item.standard}
                </h4>
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.requirement}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Retention */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-lg font-semibold text-foreground">
            Log Retention
          </h3>
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-600 dark:text-green-400">
                Free
              </span>
              <p className="text-sm text-muted-foreground">
                90 days of audit log retention
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-600 dark:text-blue-400">
                Pro
              </span>
              <p className="text-sm text-muted-foreground">
                1 year of audit log retention with export
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center rounded-full bg-purple-500/10 px-2.5 py-0.5 text-xs font-medium text-purple-600 dark:text-purple-400">
                Enterprise
              </span>
              <p className="text-sm text-muted-foreground">
                Unlimited retention with cold storage archival and compliance
                export
              </p>
            </div>
          </div>
        </section>

        {/* Related Links */}
        <RelatedLinks
          links={[
            {
              title: "Security Overview",
              href: "/docs/security",
              description: "Complete security architecture",
            },
            {
              title: "Compliance",
              href: "/docs/security/compliance",
              description: "SOC 2, GDPR, and regional compliance",
            },
            {
              title: "Agent Monitoring",
              href: "/docs/agents",
              description: "AI agent audit trail and observability",
            },
          ]}
        />

        {/* Navigation */}
        <div className="flex items-center justify-between border-t border-border pt-6">
          <Link
            href="/docs/concepts/ai-automation"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            AI Automation
          </Link>
          <Link
            href="/docs/concepts"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            All Concepts
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </>
  );
}
