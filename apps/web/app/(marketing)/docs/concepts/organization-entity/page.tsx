import { Building2, Layers, Users, ShieldCheck } from "lucide-react";

import { DocsPageHeader } from "../../components/docs-page-header";
import { FeatureGrid } from "../../components/feature-grid";
import { InfoCallout } from "../../components/info-callout";
import { RelatedLinks } from "../../components/related-links";

import { Card, CardContent } from "@/components/ui";

const levels = [
  {
    title: "Organization",
    description:
      "The top-level container for your business. An organization owns entities, billing, and platform-level settings. Most customers operate a single organization.",
    icon: Building2,
  },
  {
    title: "Entity",
    description:
      "A distinct accounting unit — a company, branch, or department. Entities hold their own chart of accounts, transactions, and reports. Financial data is always scoped to an entity.",
    icon: Layers,
  },
  {
    title: "User & Role",
    description:
      "A user is granted access to specific entities with a specific role. Roles determine what a user can see and do within each entity they can access.",
    icon: Users,
  },
];

export default function OrganizationEntityConceptPage() {
  return (
    <>
      <DocsPageHeader
        title="Organization & Entity"
        description="The two-level structure that keeps your financial data organized — and isolated."
        breadcrumbs={[
          { label: "Concepts", href: "/docs/concepts" },
          {
            label: "Organization & Entity",
            href: "/docs/concepts/organization-entity",
          },
        ]}
        icon={Building2}
      />

      <div className="space-y-10">
        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">Overview</h2>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Xenboox organizes financial data in a two-level hierarchy:
                organizations contain entities, and entities contain the actual
                books. Every journal entry, invoice, bank transaction, and
                report belongs to exactly one entity. This structure lets a
                holding company keep each subsidiary's books separate while
                managing them from a single sign-in.
              </p>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">
            The Hierarchy
          </h2>
          <FeatureGrid features={levels} />
        </section>

        <InfoCallout type="info" title="Entity scoping is enforced everywhere">
          Every database query is scoped to an entity — this is a hard
          architectural rule, not a convention. Even if application code made a
          mistake, row-level security at the database layer prevents one entity
          from reading another's records.
        </InfoCallout>

        <RelatedLinks
          links={[
            {
              title: "Organizations Module",
              href: "/docs/modules/organizations",
              description: "Managing orgs, entities, and access",
            },
            {
              title: "Users & Roles",
              href: "/docs/users-roles",
              description: "Permissions and access control",
            },
            {
              title: "Core Concepts",
              href: "/docs/concepts",
              description: "Back to the concepts index",
            },
          ]}
        />
      </div>
    </>
  );
}
