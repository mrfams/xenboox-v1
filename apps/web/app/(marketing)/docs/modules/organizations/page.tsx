import { Building2, Users, Shield, GitBranch } from "lucide-react";

import { DocsPageHeader } from "../../components/docs-page-header";
import { FeatureGrid } from "../../components/feature-grid";
import { InfoCallout } from "../../components/info-callout";
import { RelatedLinks } from "../../components/related-links";

import { Card, CardContent } from "@/components/ui";

const features = [
  {
    title: "Organization Structure",
    description:
      "Define your organizational hierarchy with multiple entities, departments, and cost centers. Each entity maintains independent books.",
    icon: GitBranch,
  },
  {
    title: "Role-Based Access",
    description:
      "Granular role-based access control with predefined roles. Assign users to entities with specific permissions.",
    icon: Shield,
  },
  {
    title: "User Management",
    description:
      "Invite, manage, and deactivate users. Configure user roles, entity access, and notification preferences.",
    icon: Users,
  },
  {
    title: "Entity Scoping",
    description:
      "All data is automatically scoped to entities. Users only see data for entities they have access to. Row-level security enforced at database level.",
    icon: Building2,
  },
];

export default function OrganizationsDocPage() {
  return (
    <>
      <DocsPageHeader
        title="Organizations"
        description="Configure your organizational structure, manage users and roles, and enforce entity-level data isolation with role-based access control."
        breadcrumbs={[
          { label: "Modules", href: "/docs/modules" },
          { label: "Organizations", href: "/docs/modules/organizations" },
        ]}
        icon={Building2}
      />

      <div className="space-y-10">
        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">Overview</h2>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground leading-relaxed">
                The Organizations module manages your company's organizational
                structure in Xenboox. It provides entity management, user
                administration, and role-based access control that ensures data
                isolation across all accounting modules. Every database query is
                automatically scoped to the user's entity, and Row-Level
                Security (RLS) is enforced at the database layer for
                defense-in-depth.
              </p>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">
            Key Features
          </h2>
          <FeatureGrid features={features} />
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">
            Available Roles
          </h2>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Role</th>
                  <th className="px-4 py-3 text-left font-medium">Level</th>
                  <th className="px-4 py-3 text-left font-medium">
                    Permissions
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="px-4 py-3 font-medium">Owner</td>
                  <td className="px-4 py-3">Organization</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    Full access to all entities and settings
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="px-4 py-3 font-medium">Admin</td>
                  <td className="px-4 py-3">Organization</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    Manage users, entities, and settings
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="px-4 py-3 font-medium">Finance Director</td>
                  <td className="px-4 py-3">Entity</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    Full financial access to assigned entities
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="px-4 py-3 font-medium">Accountant</td>
                  <td className="px-4 py-3">Entity</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    Journal entries, reports, and reconciliations
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="px-4 py-3 font-medium">Payroll Officer</td>
                  <td className="px-4 py-3">Entity</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    Payroll processing only
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="px-4 py-3 font-medium">Cashier</td>
                  <td className="px-4 py-3">Entity</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    Cash and mobile money operations
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="px-4 py-3 font-medium">Employee</td>
                  <td className="px-4 py-3">Entity</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    View own payslips and leave records
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium">External Auditor</td>
                  <td className="px-4 py-3">Entity</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    Read-only access to financial data
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <InfoCallout type="info" title="Entity Scoping">
          Entity scoping is Xenboox's most important architectural rule. Every
          database query is automatically filtered by entity ID. This ensures
          that users from different entities never see each other's data, even
          if they share the same database. This is enforced at both the
          application layer (tRPC middleware) and the database layer (PostgreSQL
          Row-Level Security).
        </InfoCallout>

        <RelatedLinks
          links={[
            {
              title: "Settings Module",
              href: "/docs/modules/settings",
              description: "User profile and preferences",
            },
            {
              title: "Security Overview",
              href: "/docs/security",
              description: "RBAC and security details",
            },
            {
              title: "Getting Started",
              href: "/docs/getting-started",
              description: "Entity setup guide",
            },
          ]}
        />
      </div>
    </>
  );
}
