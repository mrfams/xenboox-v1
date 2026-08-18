import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { DocsPageHeader } from "../../components/docs-page-header";
import { CodeBlock } from "../../components/code-block";
import { RelatedLinks } from "../../components/related-links";

const roles = [
  {
    name: "Owner",
    description:
      "Full access to all entities and settings. Can manage users, billing, and integrations. The only role that can delete an organization.",
    permissions: [
      "All admin permissions",
      "Manage organization settings",
      "Manage billing and subscriptions",
      "Delete organization",
      "Manage API keys",
    ],
  },
  {
    name: "Admin",
    description:
      "Full operational access within assigned entities. Can manage users, configure modules, and access all financial data.",
    permissions: [
      "All editor permissions",
      "Manage users and roles",
      "Configure system settings",
      "Access audit logs",
      "Manage integrations",
      "Close fiscal periods",
    ],
  },
  {
    name: "Accountant",
    description:
      "Full access to financial operations. Can create, approve, and post transactions across all accounting modules.",
    permissions: [
      "Create and approve journal entries",
      "Manage invoices and bills",
      "Run bank reconciliation",
      "Generate financial reports",
      "Manage chart of accounts",
      "Process payroll",
    ],
  },
  {
    name: "Analyst",
    description:
      "Read access to financial data with limited write permissions. Can generate reports and analyze trends.",
    permissions: [
      "View all financial reports",
      "View journal entries (read-only)",
      "View banking data (read-only)",
      "Export data",
      "Access analytics dashboard",
    ],
  },
  {
    name: "Viewer",
    description:
      "Read-only access to assigned entities. Suitable for board members, auditors, or stakeholders who need visibility without operational access.",
    permissions: [
      "View dashboards",
      "View reports",
      "View journal entries (read-only)",
      "No create/edit/delete permissions",
    ],
  },
];

export default function RolesPermissionsPage() {
  return (
    <>
      <DocsPageHeader
        title="User Roles & Permissions"
        description="Control access with role-based permissions. Assign users to specific entities and roles to manage what they can see and do across the platform."
        breadcrumbs={[
          { label: "Core Concepts", href: "/docs/concepts" },
          { label: "Roles & Permissions" },
        ]}
      />

      <div className="space-y-8">
        {/* Overview */}
        <section className="prose prose-neutral dark:prose-invert max-w-none">
          <h2>How Access Control Works</h2>
          <p>
            Xenboox uses a role-based access control (RBAC) system with entity
            scoping. Every user is assigned a role within each entity they have
            access to. Permissions are enforced at both the application layer
            (middleware) and the database layer (row-level security).
          </p>
        </section>

        {/* RBAC Model */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-lg font-semibold text-foreground">RBAC Model</h3>
          <div className="mt-4 space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-border p-4">
                <h4 className="text-sm font-medium text-foreground">
                  Organization
                </h4>
                <p className="mt-1 text-xs text-muted-foreground">
                  Top-level container. Users are invited to organizations.
                </p>
              </div>
              <div className="rounded-lg border border-border p-4">
                <h4 className="text-sm font-medium text-foreground">Entity</h4>
                <p className="mt-1 text-xs text-muted-foreground">
                  A company, branch, or department. Each entity has its own
                  books.
                </p>
              </div>
              <div className="rounded-lg border border-border p-4">
                <h4 className="text-sm font-medium text-foreground">Role</h4>
                <p className="mt-1 text-xs text-muted-foreground">
                  Permission set assigned per user per entity. Determines access
                  level.
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              A user can have different roles in different entities. For
              example, Alice might be an <strong>Admin</strong> in the Ghana
              entity but only a <strong>Viewer</strong> in the Nigeria entity.
            </p>
          </div>
        </section>

        {/* Roles Table */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-lg font-semibold text-foreground">
            Built-in Roles
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Xenboox ships with five predefined roles. Custom roles are coming
            soon.
          </p>
          <div className="mt-6 space-y-4">
            {roles.map((role) => (
              <div
                key={role.name}
                className="rounded-lg border border-border p-4"
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                    {role.name}
                  </span>
                  <p className="text-sm text-muted-foreground">
                    {role.description}
                  </p>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {role.permissions.map((perm) => (
                    <span
                      key={perm}
                      className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                    >
                      {perm}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Permission Matrix */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-lg font-semibold text-foreground">
            Permission Matrix
          </h3>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-2 text-left font-medium text-muted-foreground">
                    Action
                  </th>
                  <th className="pb-2 text-center font-medium text-muted-foreground">
                    Owner
                  </th>
                  <th className="pb-2 text-center font-medium text-muted-foreground">
                    Admin
                  </th>
                  <th className="pb-2 text-center font-medium text-muted-foreground">
                    Accountant
                  </th>
                  <th className="pb-2 text-center font-medium text-muted-foreground">
                    Analyst
                  </th>
                  <th className="pb-2 text-center font-medium text-muted-foreground">
                    Viewer
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[
                  ["View dashboard", true, true, true, true, true],
                  ["Create journal entries", false, true, true, false, false],
                  ["Approve journal entries", false, true, true, false, false],
                  ["Manage invoices", false, true, true, false, false],
                  ["Run payroll", false, true, true, false, false],
                  ["Generate reports", false, true, true, true, false],
                  ["Manage users", false, true, false, false, false],
                  ["System settings", false, true, false, false, false],
                  ["Close periods", false, true, true, false, false],
                  ["View audit logs", false, true, false, false, false],
                  ["Manage integrations", true, true, false, false, false],
                  ["Delete organization", true, false, false, false, false],
                ].map(([action, ...perms]) => (
                  <tr key={action as string}>
                    <td className="py-2 text-foreground">{action as string}</td>
                    {perms.map((has, i) => (
                      <td key={i} className="py-2 text-center">
                        {has ? (
                          <span className="text-green-600 dark:text-green-400">
                            ✓
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Enforcement */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-lg font-semibold text-foreground">
            How Enforcement Works
          </h3>
          <div className="mt-4 space-y-4">
            <div className="rounded-lg bg-muted/50 p-4">
              <h4 className="text-sm font-medium text-foreground">
                Application Layer
              </h4>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                Every tRPC procedure checks the user&apos;s role against the
                required permission before executing. The{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">
                  protectedProcedure
                </code>{" "}
                middleware validates authentication, entity scope, and role
                permissions in a single pass.
              </p>
            </div>
            <CodeBlock
              language="typescript"
              code={`// Example: only Admins and Accountants can create journal entries
const createJournalEntry = protectedProcedure
  .use(requireRole(["admin", "accountant"]))
  .input(z.object({ ... }))
  .mutation(async ({ ctx, input }) => {
    // ctx.entityId is guaranteed to be set
    // ctx.user.role is guaranteed to be "admin" or "accountant"
    // The mutation executes within the entity scope
  });`}
            />
            <div className="rounded-lg bg-muted/50 p-4">
              <h4 className="text-sm font-medium text-foreground">
                Database Layer
              </h4>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                Row-Level Security (RLS) policies on every table ensure that
                even if the application layer is bypassed, database queries
                cannot access data from other entities. Each database connection
                sets the entity context via session variables.
              </p>
            </div>
          </div>
        </section>

        {/* Entity Scoping */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-lg font-semibold text-foreground">
            Entity Scoping
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Entity scoping is the most critical security concept in Xenboox.
            Every database query must be scoped to an entity. No exceptions.
          </p>
          <CodeBlock
            language="typescript"
            code={`// CORRECT — entity-scoped query
const invoices = await db.query.invoices.findMany({
  where: eq(invoices.entityId, ctx.entityId),
});

// WRONG — never do this
const invoices = await db.query.invoices.findMany();
// ↑ This would return data from ALL entities`}
          />
          <div className="mt-4 rounded-lg bg-destructive/10 p-4">
            <p className="text-sm font-medium text-destructive">
              ⚠️ Never bypass entity scoping
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Cross-entity data leakage is the #1 security risk in multi-tenant
              applications. Xenboox enforces entity scoping at three layers:
              tRPC middleware, application logic, and database RLS.
            </p>
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
              title: "Organization & Entity",
              href: "/docs/concepts/organization-entity",
              description: "How organizations and entities work",
            },
            {
              title: "API Authentication",
              href: "/docs/api/auth",
              description: "How API access is authenticated and scoped",
            },
          ]}
        />

        {/* Navigation */}
        <div className="flex items-center justify-between border-t border-border pt-6">
          <Link
            href="/docs/concepts/multi-currency"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Multi-Currency
          </Link>
          <Link
            href="/docs/concepts/ai-automation"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            AI Automation
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </>
  );
}
