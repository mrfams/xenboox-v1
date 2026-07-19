export default function RefundPolicyPage() {
  return (
    <>
      <section className="border-b py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-bold tracking-tight">
              Refund Policy
            </h1>
            <p className="mt-4 text-muted-foreground">
              Last updated: January 2026
            </p>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 text-sm leading-relaxed text-muted-foreground space-y-8">
          <div>
            <h2 className="mb-3 text-lg font-semibold text-foreground">1. Free Tier</h2>
            <p>
              Xenboox offers a free tier with no credit card required. No refund is applicable as no payment has been made. You may delete your account at any time from the settings page.
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold text-foreground">2. Paid Subscriptions</h2>
            <p>
              For paid plans (monthly and annual subscriptions):
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong className="text-foreground">Monthly plans:</strong> You may request a full refund within 7 days of your initial subscription or renewal. After 7 days, no refund will be issued for the current billing period.</li>
              <li><strong className="text-foreground">Annual plans:</strong> You may request a full refund within 30 days of your initial subscription. After 30 days, no refund will be issued for the remaining balance of the annual term.</li>
            </ul>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold text-foreground">3. How to Request a Refund</h2>
            <p>
              To request a refund, contact us at{" "}
              <span className="text-foreground">billing@xenboox.com</span>{" "}
              with your account email and reason for the refund request. We will process refund requests within 5-10 business days. Refunds are issued to the original payment method.
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold text-foreground">4. Exceptions</h2>
            <p>Refunds may be denied in the following cases:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Violation of our Terms of Service</li>
              <li>Fraudulent or abusive account behavior</li>
              <li>Requests made outside the refund window described above</li>
              <li>Chargebacks initiated without first contacting us</li>
            </ul>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold text-foreground">5. Subscription Cancellation</h2>
            <p>
              Cancelling your subscription stops future billing but does not automatically trigger a refund. Your access continues until the end of the current paid period. You may request a refund separately if eligible under this policy.
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold text-foreground">6. Data After Cancellation</h2>
            <p>
              After cancellation, your data is retained for 30 days to allow for export. After 30 days, all data is permanently deleted. You may request immediate deletion by contacting us.
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold text-foreground">7. Changes to This Policy</h2>
            <p>
              We reserve the right to update this Refund Policy. Changes apply to new subscriptions and renewals after the posted date.
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold text-foreground">8. Contact</h2>
            <p>
              Questions about refunds? Contact us at{" "}
              <span className="text-foreground">billing@xenboox.com</span>.
            </p>
          </div>
        </div>
      </section>
    </>
  )
}
