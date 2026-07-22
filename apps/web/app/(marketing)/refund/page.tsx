import { RefreshCw, ChevronRight } from "lucide-react";
import Link from "next/link";

const sections = [
  { id: "overview", title: "Overview" },
  { id: "free-tier", title: "Free Tier" },
  { id: "paid-subscriptions", title: "Paid Subscriptions" },
  { id: "how-to-request", title: "How to Request" },
  { id: "exceptions", title: "Exceptions" },
  { id: "cancellation", title: "Cancellation" },
  { id: "service-credits", title: "Service Credits" },
  { id: "data-after", title: "Data After Cancellation" },
  { id: "disputes", title: "Disputes" },
  { id: "changes", title: "Changes" },
  { id: "contact", title: "Contact" },
];

export default function RefundPolicyPage() {
  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950">
        <div className="absolute inset-0 bg-grid-dark opacity-30" />
        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-14 md:py-20">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm px-4 py-1.5 text-xs font-medium text-white/60">
              <RefreshCw className="h-3 w-3 text-blue-400" />
              Policy
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white">
              Refund Policy
            </h1>
            <p className="mt-3 text-white/50 max-w-xl">
              Last updated: July 2026
            </p>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </section>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10 md:py-12">
        <div className="flex gap-8 lg:gap-10">
          <nav className="hidden lg:block w-48 shrink-0">
            <div className="sticky top-24 space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                On this page
              </p>
              {sections.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors py-1.5"
                >
                  <ChevronRight className="h-3 w-3 shrink-0" />
                  {s.title}
                </a>
              ))}
            </div>
          </nav>

          <div className="flex-1 min-w-0 prose-policy text-sm leading-relaxed text-muted-foreground max-w-3xl">
            <div className="rounded-2xl border bg-gradient-to-br from-blue-50 to-white p-6 mb-6">
              <p>
                <strong className="text-foreground">
                  We want you to be satisfied with Xenboox.
                </strong>{" "}
                This policy outlines the terms for refunds on paid
                subscriptions.
              </p>
            </div>

            <section id="overview">
              <h2>1. Overview</h2>
              <p>
                This Refund Policy (&quot;Policy&quot;) governs all purchases of
                paid subscriptions and services from Xenboox. By purchasing a
                paid plan, you agree to the terms of this Policy. For
                information about our subscription plans and pricing, see our{" "}
                <Link
                  href="/pricing"
                  className="text-foreground underline underline-offset-2"
                >
                  Pricing page
                </Link>
                .
              </p>
            </section>

            <section id="free-tier">
              <h2>2. Free Tier</h2>
              <p>
                Xenboox offers a free tier with no credit card required. Refunds
                are not applicable to free tier accounts. You may downgrade or
                delete your account at any time from the settings page.
              </p>
            </section>

            <section id="paid-subscriptions">
              <h2>3. Paid Subscriptions — Refund Windows</h2>
              <div className="grid gap-4 sm:grid-cols-2 mb-4">
                <div className="rounded-xl border bg-gradient-to-br from-white to-slate-50 p-5">
                  <h3 className="font-semibold text-foreground">
                    Monthly Plans
                  </h3>
                  <p className="mt-1">
                    Full refund within{" "}
                    <strong className="text-foreground">7 days</strong> of
                    initial subscription or renewal.
                  </p>
                </div>
                <div className="rounded-xl border bg-gradient-to-br from-white to-slate-50 p-5">
                  <h3 className="font-semibold text-foreground">
                    Annual Plans
                  </h3>
                  <p className="mt-1">
                    Full refund within{" "}
                    <strong className="text-foreground">30 days</strong> of
                    initial subscription date.
                  </p>
                </div>
              </div>
            </section>

            <section id="how-to-request">
              <h2>4. How to Request a Refund</h2>
              <ol>
                <li>
                  Email{" "}
                  <span className="text-foreground font-medium">
                    billing@xenboox.com
                  </span>{" "}
                  from your registered email address.
                </li>
                <li>
                  Include your account email, organization name, and reason for
                  the request.
                </li>
                <li>
                  Our billing team will respond within{" "}
                  <strong className="text-foreground">3 business days</strong>.
                </li>
                <li>
                  Approved refunds are processed within{" "}
                  <strong className="text-foreground">
                    5-10 business days
                  </strong>
                  .
                </li>
              </ol>
            </section>

            <section id="exceptions">
              <h2>5. Exceptions and Denials</h2>
              <p>
                Refund requests may be denied in cases of: requests outside the
                refund window, Terms of Service violations, fraudulent activity,
                chargeback abuse, or suspended/terminated accounts.
              </p>
            </section>

            <section id="cancellation">
              <h2>6. Subscription Cancellation</h2>
              <p>
                Cancel anytime from the billing section of your account
                settings. Your access to paid features continues until the end
                of the current billing period. Cancellation does not
                automatically trigger a refund.
              </p>
            </section>

            <section id="service-credits">
              <h2>7. Service Credits vs. Refunds</h2>
              <p>
                In some cases, you may be eligible for service credits under our{" "}
                <Link
                  href="/sla"
                  className="text-foreground underline underline-offset-2"
                >
                  Service Level Agreement (SLA)
                </Link>{" "}
                rather than a monetary refund.
              </p>
            </section>

            <section id="data-after">
              <h2>8. Data After Cancellation or Refund</h2>
              <p>
                Your data is retained for{" "}
                <strong className="text-foreground">30 days</strong> from the
                date of cancellation to allow export. After 30 days, all account
                data is permanently deleted.
              </p>
            </section>

            <section id="disputes">
              <h2>9. Payment Disputes and Chargebacks</h2>
              <p>
                If you believe a charge was made in error, please contact us at{" "}
                <span className="text-foreground font-medium">
                  billing@xenboox.com
                </span>{" "}
                before initiating a chargeback. Chargebacks without prior
                contact may result in account suspension.
              </p>
            </section>

            <section id="changes">
              <h2>10. Changes to This Policy</h2>
              <p>
                We reserve the right to modify this Refund Policy. Changes will
                apply to new subscriptions and renewals after the effective
                date.
              </p>
            </section>

            <section id="contact">
              <h2>11. Contact</h2>
              <ul>
                <li>
                  Billing:{" "}
                  <span className="text-foreground font-medium">
                    billing@xenboox.com
                  </span>
                </li>
                <li>
                  Legal:{" "}
                  <span className="text-foreground font-medium">
                    legal@xenboox.com
                  </span>
                </li>
              </ul>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
