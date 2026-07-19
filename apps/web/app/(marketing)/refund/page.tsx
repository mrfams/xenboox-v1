export default function RefundPolicyPage() {
  return (
    <>
      <section className="border-b py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-bold tracking-tight">Refund Policy</h1>
            <p className="mt-4 text-muted-foreground">
              Last updated: July 2026
            </p>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 text-sm leading-relaxed text-muted-foreground space-y-8">
          <div>
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              1. Overview
            </h2>
            <p>
              This Refund Policy (&quot;Policy&quot;) governs all purchases of
              paid subscriptions and services from Xenboox (&quot;we,&quot;
              &quot;our,&quot; or &quot;us&quot;). By purchasing a paid plan,
              you agree to the terms of this Policy. This Policy applies to all
              users of the Xenboox platform, including web, mobile, and desktop
              applications.
            </p>
            <p className="mt-2">
              For information about our subscription plans and pricing, please
              see our{" "}
              <a
                href="/pricing"
                className="text-foreground underline underline-offset-2 hover:no-underline"
              >
                Pricing page
              </a>
              .
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              2. Free Tier
            </h2>
            <p>
              Xenboox offers a free tier with no credit card required. Because
              no payment is made, refunds are not applicable to free tier
              accounts. You may downgrade to the free tier or delete your
              account at any time from the settings page. All data associated
              with a deleted account will be handled in accordance with our data
              retention policy (see Section 8).
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              3. Paid Subscriptions — Refund Windows
            </h2>
            <p>
              We are confident in the value of Xenboox and want you to be
              satisfied with your purchase. The following refund windows apply
              to paid subscriptions:
            </p>
            <div className="mt-3 space-y-4">
              <div>
                <h3 className="font-semibold text-foreground">Monthly Plans</h3>
                <p className="mt-1">
                  You may request a full refund within{" "}
                  <strong className="text-foreground">7 days</strong> of the
                  initial subscription date or any subsequent renewal date.
                  After this 7-day window, no refund will be issued for the
                  current billing period, and your subscription will continue
                  until the end of the paid period.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Annual Plans</h3>
                <p className="mt-1">
                  You may request a full refund within{" "}
                  <strong className="text-foreground">30 days</strong> of the
                  initial subscription date. After 30 days, no refund will be
                  issued for the remaining balance of the annual term. Annual
                  plan pricing assumes a commitment for the full term; early
                  cancellation does not entitle you to a pro-rated refund of
                  remaining months unless otherwise required by applicable law.
                </p>
              </div>
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              4. How to Request a Refund
            </h2>
            <p>To initiate a refund request, follow these steps:</p>
            <ol className="list-decimal pl-5 space-y-1 mt-2">
              <li>
                Email us at{" "}
                <span className="text-foreground">billing@xenboox.com</span>{" "}
                from the email address associated with your Xenboox account.
              </li>
              <li>
                Include your account email, organisation name (if applicable),
                and a brief reason for the refund request.
              </li>
              <li>
                Our billing team will review your request and respond within{" "}
                <strong className="text-foreground">3 business days</strong>.
              </li>
              <li>
                If approved, refunds are processed within{" "}
                <strong className="text-foreground">5-10 business days</strong>{" "}
                and issued to the original payment method.
              </li>
            </ol>
            <p className="mt-2">
              We may request additional information to verify your identity or
              account ownership before processing a refund.
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              5. Exceptions and Denials
            </h2>
            <p>Refund requests may be denied in the following circumstances:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>
                Requests submitted outside the applicable refund window
                described in Section 3.
              </li>
              <li>
                Violation of our{" "}
                <a
                  href="/terms"
                  className="text-foreground underline underline-offset-2 hover:no-underline"
                >
                  Terms of Service
                </a>
                , including any abuse, fraud, or prohibited use of the Service.
              </li>
              <li>
                Fraudulent or abusive account activity, including chargeback
                abuse or repeated refund requests.
              </li>
              <li>
                Chargebacks initiated with your payment provider without first
                contacting us to resolve the issue.
              </li>
              <li>
                Accounts that have been suspended or terminated for cause.
              </li>
              <li>
                Usage that exceeds the fair use limits of the free tier prior to
                upgrading to a paid plan.
              </li>
            </ul>
            <p className="mt-2">
              We reserve the right to evaluate refund requests on a case-by-case
              basis and to deny requests that fall outside this Policy.
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              6. Subscription Cancellation
            </h2>
            <p>
              Cancelling your subscription stops all future billing. You may
              cancel at any time from the billing section of your account
              settings. Upon cancellation:
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>
                Your access to paid features continues until the end of the
                current billing period (no immediate loss of access).
              </li>
              <li>
                Cancellation does not automatically trigger a refund. If you
                believe you are eligible for a refund, you must submit a
                separate request under Section 4.
              </li>
              <li>
                After the current billing period ends, your account will revert
                to the free tier with any associated limitations.
              </li>
            </ul>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              7. Service Credits vs. Refunds
            </h2>
            <p>
              In some cases, you may be eligible for service credits under our{" "}
              <a
                href="/sla"
                className="text-foreground underline underline-offset-2 hover:no-underline"
              >
                Service Level Agreement (SLA)
              </a>{" "}
              rather than a monetary refund. Service credits are applied to
              future billing and are separate from refunds under this Policy.
              You may not receive both a refund and a service credit for the
              same incident.
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              8. Data After Cancellation or Refund
            </h2>
            <p>
              Following cancellation or a refund that results in account
              closure:
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>
                Your data is retained for{" "}
                <strong className="text-foreground">30 days</strong> from the
                date of cancellation to allow you to export your financial
                records and reports.
              </li>
              <li>
                After 30 days, all account data is permanently deleted from our
                systems and backups in accordance with our data retention and
                deletion schedules.
              </li>
              <li>
                You may request immediate deletion of your data at any time by
                contacting us at{" "}
                <span className="text-foreground">privacy@xenboox.com</span>.
              </li>
              <li>
                We are not responsible for data loss resulting from your failure
                to export your data within the retention period.
              </li>
            </ul>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              9. Payment Disputes and Chargebacks
            </h2>
            <p>
              If you believe a charge was made in error, please contact us at{" "}
              <span className="text-foreground">billing@xenboox.com</span>{" "}
              before initiating a chargeback with your bank or payment provider.
              We are committed to resolving billing disputes promptly and
              fairly.
            </p>
            <p className="mt-2">
              If a chargeback is initiated without first contacting us, your
              account may be immediately suspended, and you may be responsible
              for any fees incurred by us as a result of the chargeback process.
              We may also terminate your account and deny future service in
              cases of chargeback abuse.
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              10. Currency, Taxes, and Third-Party Fees
            </h2>
            <p>
              All refunds are issued in the original currency of payment. We are
              not responsible for any currency conversion fees, exchange rate
              fluctuations, or bank charges that may result in the refunded
              amount differing from the original charge. Any applicable taxes
              (e.g., VAT, GST) will be refunded in accordance with local tax
              regulations.
            </p>
            <p className="mt-2">
              If your purchase was processed through a third-party marketplace
              (e.g., Apple App Store, Google Play Store), refunds must be
              requested through that marketplace&apos;s own refund process and
              are subject to their refund policies.
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              11. Force Majeure
            </h2>
            <p>
              To the extent permitted by law, no refunds will be issued for
              service interruptions caused by events outside our reasonable
              control, including but not limited to acts of God, war, civil
              unrest, terrorism, pandemic, government action, telecommunications
              outages, or third-party service provider failures.
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              12. Dispute Resolution
            </h2>
            <p>
              If you are dissatisfied with the outcome of a refund request, you
              may escalate the matter by emailing{" "}
              <span className="text-foreground">legal@xenboox.com</span>.
              Disputes that cannot be resolved through negotiation shall be
              governed by the dispute resolution provisions set forth in our
              Terms of Service.
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              13. Changes to This Policy
            </h2>
            <p>
              We reserve the right to modify this Refund Policy at any time.
              Changes will apply to new subscriptions and renewals that occur
              after the effective date of the updated policy. Existing
              subscriptions will remain governed by the policy in effect at the
              time of purchase. We will notify users of material changes via
              email or in-app notification.
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              14. Contact
            </h2>
            <p>
              For questions, refund requests, or billing inquiries, please
              contact us:
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>
                Billing:{" "}
                <span className="text-foreground">billing@xenboox.com</span>
              </li>
              <li>
                Legal:{" "}
                <span className="text-foreground">legal@xenboox.com</span>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
