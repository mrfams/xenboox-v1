import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { DocsPageHeader } from "../../components/docs-page-header";
import { FeatureGrid } from "../../components/feature-grid";
import { InfoCallout } from "../../components/info-callout";
import { RelatedLinks } from "../../components/related-links";
import { MarketingShell } from "../../../components/marketing-primitives";
import {
  Globe,
  ArrowRightLeft,
  RefreshCw,
  DollarSign,
  BarChart3,
  Settings,
} from "lucide-react";

const features = [
  {
    title: "Multi-Currency Support",
    description:
      "Handle transactions in any currency with automatic conversion to your base reporting currency. Support for 150+ world currencies.",
    icon: Globe,
  },
  {
    title: "Real-Time Exchange Rates",
    description:
      "Automatic exchange rate updates from multiple providers. Configurable rate sources and update frequency.",
    icon: RefreshCw,
  },
  {
    title: "Automatic Conversion",
    description:
      "Transactions in foreign currencies are automatically converted using the applicable exchange rate. Realized and unrealized gain/loss tracking.",
    icon: ArrowRightLeft,
  },
  {
    title: "Multi-Currency Reporting",
    description:
      "Financial reports available in any currency. Side-by-side comparison in multiple currencies.",
    icon: BarChart3,
  },
];

export default function CurrencyDocPage() {
  return (
    <MarketingShell>
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <DocsPageHeader
          title="Multi-Currency"
          description="Handle transactions in any currency with real-time exchange rates, automatic conversion, and multi-currency reporting."
          breadcrumbs={[
            { label: "Modules", href: "/docs/modules" },
            { label: "Multi-Currency", href: "/docs/modules/currency" },
          ]}
          icon={Globe}
        />

        <div className="space-y-10">
          <section>
            <h2 className="text-2xl font-bold tracking-tight mb-4 text-white">
              Overview
            </h2>
            <Card className="border-white/10 bg-white/5">
              <CardContent className="pt-6">
                <p className="text-sm text-white/55 leading-relaxed">
                  The Multi-Currency module enables businesses to handle
                  transactions in any currency while maintaining accurate books
                  in their base reporting currency. Real-time exchange rates
                  from multiple providers ensure accurate conversions, and
                  automatic gain/loss calculations help maintain accurate
                  financial positions. The module supports 150+ currencies and
                  integrates with all other accounting modules for seamless
                  multi-currency operations.
                </p>
              </CardContent>
            </Card>
          </section>

          <section>
            <h2 className="text-2xl font-bold tracking-tight mb-4 text-white">
              Key Features
            </h2>
            <FeatureGrid features={features} />
          </section>

          <section>
            <h2 className="text-2xl font-bold tracking-tight mb-4 text-white">
              How It Works
            </h2>
            <Card className="border-white/10 bg-white/5">
              <CardContent className="pt-6">
                <div className="space-y-4 text-sm text-white/55">
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
                      1
                    </div>
                    <div>
                      <strong className="text-foreground">
                        Set Base Currency
                      </strong>
                      <br />
                      Each entity has a base reporting currency. All financial
                      reports are denominated in this currency.
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
                      2
                    </div>
                    <div>
                      <strong className="text-foreground">
                        Configure Exchange Rates
                      </strong>
                      <br />
                      Set up automatic rate updates from your preferred
                      provider. Manual rate overrides available for historical
                      entries.
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
                      3
                    </div>
                    <div>
                      <strong className="text-foreground">
                        Record Transactions
                      </strong>
                      <br />
                      Transactions can be entered in any currency. System
                      automatically converts to base currency using applicable
                      rates.
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
                      4
                    </div>
                    <div>
                      <strong className="text-foreground">
                        Track Gains/Losses
                      </strong>
                      <br />
                      Realized and unrealized foreign exchange gains/losses are
                      automatically calculated and posted to appropriate
                      accounts.
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <InfoCallout type="info" title="Exchange Rate Providers">
            Supported exchange rate providers include Open Exchange Rates,
            exchangerate-api.com, and central bank feeds. Configure your
            preferred provider in entity settings.
          </InfoCallout>

          <RelatedLinks
            links={[
              {
                title: "Treasury Module",
                href: "/docs/modules/treasury",
                description: "Multi-currency bank accounts",
              },
              {
                title: "Reports Module",
                href: "/docs/modules/reports",
                description: "Multi-currency reporting",
              },
              {
                title: "Organizations Module",
                href: "/docs/modules/organizations",
                description: "Entity currency configuration",
              },
            ]}
          />
        </div>
      </div>
    </MarketingShell>
  );
}
