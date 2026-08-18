import {
  Users,
  ShieldCheck,
  UserPlus,
  KeyRound,
  Eye,
  Lock,
} from "lucide-react";

import { DocsPageHeader } from "../components/docs-page-header";
import { InfoCallout } from "../components/info-callout";
import { FeatureGrid } from "../components/feature-grid";
import { RelatedLinks } from "../components/related-links";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";

const capabilities = [
  {
    title: "Role-Based Access Control",
    description:
      "Granular roles — owner, admin, accountant, finance director, viewer — each with a defined permission matrix across every module.",
    icon: ShieldCheck,
  },
  {
    title: "Invitation Workflow",
    description:
      "Invite team members by email with a chosen role. Invitations expire and are recorded for audit.",
    icon: UserPlus,
  },
  {
    title: "Entity Scoping",
    description:
      "Assign users to specific entities. A user can see only the entities they've been granted — enforced at both the API and database layer.",
    icon: Eye,
  },
  {
    title: "Two-Factor Authentication",
    description:
      "Optional TOTP two-factor authentication for every account, recommended for all finance users.",
    icon: KeyRound,
  },
  {
    title: "Session Control",
    description:
      "View active sessions, revoke access remotely, and enforce session expiry policies.",
    icon: Lock,
  },
];

const roles = [
  {
    role: "Owner",
    scope: "Full access to the organization, billing, and all entities",
    color: "text-primary",
  },
  {
    role: "Admin",
    scope: "Full access to all modules and user management",
    color: "text-emerald-600",
  },
  {
    role: "Finance Director",
    scope: "All modules, approval authority, no billing",
    color: "text-blue-600",
  },
  {
    role: "Accountant",
    scope: "Daily operations — journals, AP/AR, reconciliation",
    color: "text-violet-600",
  },
  {
    role: "Viewer",
    scope: "Read-only access to assigned modules and reports",
    color: "text-slate-600",
  },
];

export default function UsersRolesPage() {
  return (
    <>
      <DocsPageHeader
        title="Users & Roles"
        description="Invite your team, assign the right level of access, and keep every action attributable to a named user."
        breadcrumbs={[
          { label: "Guides", href: "/docs/getting-started" },
          { label: "Users & Roles", href: "/docs/users-roles" },
        ]}
        icon={Users}
      />

      <div className="space-y-10">
        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">Overview</h2>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Xenboox separates <strong>organizations</strong> (the business)
                from <strong>entities</strong> (companies, branches, or
                departments within it). Users are invited at the organization
                level and granted access to specific entities with a role. This
                keeps permissions explicit — nobody sees data they haven't been
                granted, and every mutation carries the acting user's identity
                into the audit trail.
              </p>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">
            Role Reference
          </h2>
          <Card>
            <CardContent className="pt-6">
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left font-medium">Role</th>
                      <th className="px-4 py-3 text-left font-medium">
                        Access Scope
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {roles.map((r) => (
                      <tr key={r.role} className="border-b last:border-0">
                        <td className={`px-4 py-3 font-medium ${r.color}`}>
                          {r.role}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {r.scope}
                        </td>
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
            Security Features
          </h2>
          <FeatureGrid features={capabilities} />
        </section>

        <InfoCallout type="warning" title="Principle of least privilege">
          Grant the minimum role that lets someone do their job. A viewer who
          needs read access to reports should never hold an accountant role.
          Roles can be changed at any time from Settings → Users.
        </InfoCallout>

        <RelatedLinks
          links={[
            {
              title: "Security Overview",
              href: "/docs/security",
              description: "Encryption, RLS, and audit",
            },
            {
              title: "Getting Started",
              href: "/docs/getting-started",
              description: "Create your organization",
            },
            {
              title: "Organizations Module",
              href: "/docs/modules/organizations",
              description: "Entity and org management",
            },
            {
              title: "FAQ",
              href: "/docs/faq",
              description: "Common questions",
            },
          ]}
        />
      </div>
    </>
  );
}
