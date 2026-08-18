import Link from "next/link";
import {
  FileCode,
  KeyRound,
  ListTree,
  Webhook,
  Gauge,
  Boxes,
  ArrowRight,
} from "lucide-react";

import { DocsPageHeader } from "../components/docs-page-header";
import { InfoCallout } from "../components/info-callout";
import { RelatedLinks } from "../components/related-links";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";

const sections = [
  {
    title: "Authentication",
    description:
      "Authenticate with Auth.js sessions or API keys. Learn how tokens are issued, scoped, and revoked.",
    href: "/docs/api/auth",
    icon: KeyRound,
  },
  {
    title: "Endpoints",
    description:
      "Explore the tRPC procedure catalog — accounting, AP/AR, payroll, treasury, and platform APIs.",
    href: "/docs/api/endpoints",
    icon: ListTree,
  },
  {
    title: "Rate Limits",
    description:
      "Per-plan rate limits, concurrency caps, and the standard X-RateLimit response headers.",
    href: "/docs/api/rate-limits",
    icon: Gauge,
  },
  {
    title: "Webhooks",
    description:
      "Real-time event delivery with signed payloads, retries, and delivery guarantees.",
    href: "/docs/webhooks",
    icon: Webhook,
  },
  {
    title: "SDKs",
    description:
      "TypeScript-first clients generated from the same schema powering the platform.",
    href: "/docs/sdks",
    icon: Boxes,
  },
];

export default function ApiPage() {
  return (
    <>
      <DocsPageHeader
        title="API Reference"
        description="Build on Xenboox programmatically — type-safe procedures, entity-scoped by default, with full audit and rate-limit controls."
        breadcrumbs={[{ label: "API", href: "/docs/api" }]}
        icon={FileCode}
      />

      <div className="space-y-10">
        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">
            Platform Overview
          </h2>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground leading-relaxed">
                The Xenboox API is built on tRPC — a TypeScript-first RPC layer
                where every procedure has a typed input, a typed output, and
                runtime validation with Zod. All business procedures are
                authenticated and entity-scoped: the entity is resolved from the
                request context, and every query is filtered by it at both the
                application and database layers. Mutations write to the audit
                trail automatically, so every API call is attributable and
                traceable.
              </p>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">
            Reference Sections
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {sections.map((section) => (
              <Link key={section.href} href={section.href}>
                <Card className="h-full transition-colors hover:bg-muted/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <section.icon className="h-5 w-5 text-muted-foreground" />
                      {section.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {section.description}
                    </p>
                    <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
                      View reference <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        <InfoCallout type="info" title="Entity scoping is non-negotiable">
          Every business query is scoped to the entity from the request context.
          There is no endpoint that returns "all entities" — if you need
          multi-entity reporting, it is an explicit, permission-gated operation.
        </InfoCallout>

        <RelatedLinks
          links={[
            {
              title: "Authentication",
              href: "/docs/api/auth",
              description: "Sessions and API keys",
            },
            {
              title: "Webhooks",
              href: "/docs/webhooks",
              description: "Event delivery",
            },
            {
              title: "Security",
              href: "/docs/security",
              description: "Encryption and compliance",
            },
          ]}
        />
      </div>
    </>
  );
}
