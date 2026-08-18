import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { DocsPageHeader } from "../../components/docs-page-header";
import { CodeBlock } from "../../components/code-block";
import { RelatedLinks } from "../../components/related-links";

export default function MultiCurrencyPage() {
  return (
    <>
      <DocsPageHeader
        title="Multi-Currency"
        description="Handle transactions in multiple currencies with automatic exchange rate synchronization, unrealized gain/loss tracking, and real-time conversion across all modules."
        breadcrumbs={[
          { label: "Core Concepts", href: "/docs/concepts" },
          { label: "Multi-Currency" },
        ]}
      />

      <div className="space-y-8">
        {/* Overview */}
        <section className="prose prose-neutral dark:prose-invert max-w-none">
          <h2>How Multi-Currency Works</h2>
          <p>
            Xenboox supports multi-currency accounting out of the box. Every
            monetary value in the system is stored with an associated currency
            code (ISO 4217). The platform maintains exchange rates, converts
            between currencies at transaction time, and tracks unrealized
            gains/losses from rate fluctuations.
          </p>
        </section>

        {/* Architecture */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-lg font-semibold text-foreground">
            Currency Architecture
          </h3>
          <div className="mt-4 grid gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-foreground">
                Base Currency
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Each entity has a single base (functional) currency. All
                financial reports are denominated in this currency. The base
                currency is set at entity creation and cannot be changed after
                transactions are posted.
              </p>
            </div>
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-foreground">
                Foreign Currencies
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Transactions can be recorded in any supported currency. When a
                foreign currency transaction is created, the system captures the
                exchange rate at that moment and stores both the foreign amount
                and the base-currency equivalent.
              </p>
            </div>
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-foreground">
                Exchange Rate Sources
              </h4>
              <ul className="text-sm text-muted-foreground leading-relaxed list-disc pl-5 space-y-1">
                <li>Manual entry by authorized users</li>
                <li>Automated daily sync from external rate providers</li>
                <li>Historical rates preserved per transaction date</li>
                <li>Custom rates for intercompany transfers</li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-foreground">
                Gain/Loss Tracking
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                When exchange rates change between transaction date and payment
                date, Xenboox automatically calculates and posts realized
                exchange gains/losses. Unrealized gains/losses on open
                receivables and payables are reported separately.
              </p>
            </div>
          </div>
        </section>

        {/* Exchange Rate Flow */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-lg font-semibold text-foreground">
            Exchange Rate Lifecycle
          </h3>
          <div className="mt-4 space-y-4">
            {[
              {
                step: "1",
                title: "Rate Configuration",
                description:
                  "Admins configure exchange rate sources and sync schedules. Rates are stored per currency pair with effective dates.",
              },
              {
                step: "2",
                title: "Transaction Recording",
                description:
                  "When a transaction is created in a foreign currency, the system locks the rate at the transaction date and computes the base-currency equivalent.",
              },
              {
                step: "3",
                title: "Period-End Revaluation",
                description:
                  "At period close, open foreign-currency balances are revalued at the current rate. The difference is posted as an unrealized exchange gain or loss.",
              },
              {
                step: "4",
                title: "Settlement",
                description:
                  "When a foreign-currency invoice is paid, the system compares the rate at payment time to the rate at invoice time and posts the realized gain/loss.",
              },
              {
                step: "5",
                title: "Reporting",
                description:
                  "Financial reports show both the foreign-currency amounts and their base-currency equivalents. Exchange gain/loss appears as a separate line item.",
              },
            ].map((item) => (
              <div key={item.step} className="flex gap-4 items-start">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {item.step}
                </div>
                <div>
                  <h4 className="text-sm font-medium text-foreground">
                    {item.title}
                  </h4>
                  <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Code Example */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-lg font-semibold text-foreground">
            Recording a Multi-Currency Transaction
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            When creating a journal entry in a foreign currency, the system
            automatically resolves the exchange rate and stores both amounts:
          </p>
          <CodeBlock
            language="typescript"
            code={`// Creating a USD invoice for a GHS-denominated entity
const invoice = await trpc.invoicing.createInvoice.mutate({
  customerId: "cust_abc",
  currency: "USD",
  items: [
    { description: "Consulting services", amount: 5000, quantity: 1 },
  ],
  // Exchange rate is auto-resolved from the configured source
  // Base currency amount: 5000 × 15.2 (USD/GHS) = 76,000 GHS
});

// The system stores:
// - foreignAmount: 5000 USD
// - exchangeRate: 15.2
// - baseAmount: 76000 GHS
// - exchangeRateDate: "2026-08-18"`}
          />
        </section>

        {/* Supported Currencies */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-lg font-semibold text-foreground">
            Supported Currencies
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Xenboox supports all ISO 4217 currencies. The most commonly used in
            our African-first market include:
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { code: "GHS", name: "Ghanaian Cedi", symbol: "₵" },
              { code: "NGN", name: "Nigerian Naira", symbol: "₦" },
              { code: "KES", name: "Kenyan Shilling", symbol: "KSh" },
              { code: "ZAR", name: "South African Rand", symbol: "R" },
              { code: "UGX", name: "Ugandan Shilling", symbol: "USh" },
              { code: "TZS", name: "Tanzanian Shilling", symbol: "TSh" },
              { code: "USD", name: "US Dollar", symbol: "$" },
              { code: "EUR", name: "Euro", symbol: "€" },
              { code: "GBP", name: "British Pound", symbol: "£" },
            ].map((c) => (
              <div
                key={c.code}
                className="flex items-center gap-3 rounded-lg border border-border p-3"
              >
                <span className="text-lg font-bold text-primary">
                  {c.symbol}
                </span>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {c.code}
                  </p>
                  <p className="text-xs text-muted-foreground">{c.name}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Accounting Treatment */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-lg font-semibold text-foreground">
            Accounting Treatment
          </h3>
          <div className="mt-4 space-y-4">
            <div className="rounded-lg bg-muted/50 p-4">
              <h4 className="text-sm font-medium text-foreground">
                Realized Exchange Gain
              </h4>
              <CodeBlock
                language="text"
                code={`When: USD/GHS rate increases between invoice date and payment date
Effect: You receive more GHS than originally recorded
Journal:  Dr Bank (GHS)        78,000
           Cr Accounts Receivable (GHS)  76,000
           Cr Exchange Gain (P&L)        2,000`}
              />
            </div>
            <div className="rounded-lg bg-muted/50 p-4">
              <h4 className="text-sm font-medium text-foreground">
                Unrealized Exchange Loss
              </h4>
              <CodeBlock
                language="text"
                code={`When: USD/GHS rate decreases at period-end for open invoices
Effect: Your receivables are worth less in base currency
Journal:  Dr Unrealized FX Loss (P&L)  1,500
           Cr Accounts Receivable (GHS)  1,500`}
              />
            </div>
          </div>
        </section>

        {/* Related Links */}
        <RelatedLinks
          links={[
            {
              title: "Currency Module",
              href: "/docs/modules/currency",
              description: "Configure currencies and exchange rates",
            },
            {
              title: "Reports",
              href: "/docs/modules/reports",
              description: "Financial reports with multi-currency support",
            },
            {
              title: "Journal Entries",
              href: "/docs/concepts/journal-entries",
              description: "How multi-currency transactions are recorded",
            },
          ]}
        />

        {/* Navigation */}
        <div className="flex items-center justify-between border-t border-border pt-6">
          <Link
            href="/docs/concepts/fiscal-periods"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Fiscal Periods
          </Link>
          <Link
            href="/docs/concepts/roles-permissions"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Roles & Permissions
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </>
  );
}
