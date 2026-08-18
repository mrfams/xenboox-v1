import { Boxes, FileCode, ShieldCheck, ArrowRight } from "lucide-react";
import Link from "next/link";

import { DocsPageHeader } from "../components/docs-page-header";
import { InfoCallout } from "../components/info-callout";
import { RelatedLinks } from "../components/related-links";

import { Card, CardContent } from "@/components/ui";

const sdkFeatures = [
  {
    title: "TypeScript / tRPC Client",
    description:
      "The primary SDK is the tRPC client — fully typed, generated from the same procedure definitions that power the platform. Autocomplete for every input and output, with Zod validation on the wire.",
    href: "/docs/api",
  },
  {
    title: "Webhooks SDK",
    description:
      "A lightweight webhook receiver helper that verifies HMAC signatures and parses event payloads into typed objects.",
    href: "/docs/webhooks",
  },
  {
    title: "Mobile & Desktop",
    description:
      "The mobile app (React Native) and desktop shell (Tauri) consume the same API surface, so integrations behave identically across platforms.",
    href: "/docs/api",
  },
];

export default function SdksPage() {
  return (
    <>
      <DocsPageHeader
        title="SDKs"
        description="Type-safe client libraries generated from the same schema that powers the Xenboox platform."
        breadcrumbs={[
          { label: "API", href: "/docs/api" },
          { label: "SDKs", href: "/docs/sdks" },
        ]}
        icon={Boxes}
      />

      <div className="space-y-10">
        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">
            Available SDKs
          </h2>
          <div className="space-y-4">
            {sdkFeatures.map((sdk) => (
              <Link key={sdk.title} href={sdk.href}>
                <Card className="transition-colors hover:bg-muted/50">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold flex items-center gap-2">
                          {sdk.title === "TypeScript / tRPC Client" ? (
                            <FileCode className="h-4 w-4 text-muted-foreground" />
                          ) : sdk.title === "Webhooks SDK" ? (
                            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Boxes className="h-4 w-4 text-muted-foreground" />
                          )}
                          {sdk.title}
                        </h3>
                        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                          {sdk.description}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        <InfoCallout type="tip" title="Type safety is the default">
          Because the SDK shares types with the server, a rename or breaking
          change surfaces at compile time in your integration — not at runtime
          in production.
        </InfoCallout>

        <RelatedLinks
          links={[
            {
              title: "API Reference",
              href: "/docs/api",
              description: "Procedures and auth",
            },
            {
              title: "Webhooks",
              href: "/docs/webhooks",
              description: "Event delivery",
            },
            {
              title: "Integrations",
              href: "/docs/integrations",
              description: "Connect your systems",
            },
          ]}
        />
      </div>
    </>
  );
}
