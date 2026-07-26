import { MarketingHero } from "@/components/marketing/hero";

export default function RefundPage() {
  return (
    <>
      <MarketingHero
        title="Refund Policy"
        subtitle="Legal"
        description="Last updated: July 1, 2026 · Our policy on refunds, cancellations, and billing disputes."
        compact
      />

      <section className="py-16">
        <div className="mx-auto max-w-3xl px-4">
          <div className="prose prose-slate max-w-none">
            <h2>1. Subscription Billing</h2>
            <p>
              Xenboox operates on a subscription billing model as described on
              our <a href="/pricing">Pricing page</a>. All fees are billed in
              advance on a monthly or annual basis depending on your chosen
              plan.
            </p>

            <h2>2. Refund Eligibility</h2>
            <h3>2.1 Monthly Plans</h3>
            <p>
              Monthly subscriptions may be cancelled at any time. Upon
              cancellation, you will retain access to the Platform until the end
              of your current billing period. No partial refunds are provided
              for unused days within a billing period.
            </p>

            <h3>2.2 Annual Plans</h3>
            <p>
              Annual subscriptions may be cancelled within the first 14 days of
              the initial subscription for a full refund. After 14 days, annual
              subscriptions are non-refundable, but you will retain access for
              the remainder of the paid term.
            </p>

            <h3>2.3 Enterprise & Firm Plans</h3>
            <p>
              Custom enterprise agreements are governed by the terms specified
              in your signed contract. Please refer to your agreement for
              cancellation and refund terms.
            </p>

            <h2>3. Service Credits</h2>
            <p>
              In the event of prolonged service unavailability exceeding our{" "}
              <a href="/sla">Service Level Agreement</a>, you may be eligible
              for service credits rather than monetary refunds, calculated at 5%
              of monthly fees per full hour of downtime exceeding the SLA
              threshold.
            </p>

            <h2>4. Billing Disputes</h2>
            <p>
              If you believe you have been billed incorrectly, contact us at{" "}
              <a href="mailto:billing@xenboox.com">billing@xenboox.com</a>{" "}
              within 30 days of the billing date. We will investigate and
              resolve the dispute promptly.
            </p>

            <h2>5. Cancellation Process</h2>
            <ol>
              <li>
                Log in to your Xenboox account and navigate to Settings →
                Billing
              </li>
              <li>Select "Cancel Subscription" and follow the prompts</li>
              <li>
                Confirm your cancellation via the email we send to your
                registered address
              </li>
              <li>
                Your data will remain accessible for 90 days after cancellation
                (export period)
              </li>
            </ol>

            <h2>6. Non-Refundable Items</h2>
            <p>The following are non-refundable:</p>
            <ul>
              <li>Setup fees (if applicable)</li>
              <li>Usage overage charges</li>
              <li>Third-party integration fees</li>
              <li>Custom development work</li>
            </ul>

            <h2>7. Contact</h2>
            <p>
              For billing-related inquiries, contact{" "}
              <a href="mailto:billing@xenboox.com">billing@xenboox.com</a>.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
