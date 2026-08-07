import type { Metadata } from "next";

import { LegalHero, LegalContent } from "@/components/marketing/legal-hero";

export const metadata: Metadata = {
  title: "Refund Policy",
  description:
    "Our policy on refunds, cancellations, and billing disputes. We aim to be fair and transparent.",
};

const tableOfContents = [
  { id: "overview", label: "Overview" },
  { id: "monthly", label: "Monthly Plans" },
  { id: "annual", label: "Annual Plans" },
  { id: "enterprise", label: "Enterprise Plans" },
  { id: "credits", label: "Service Credits" },
  { id: "disputes", label: "Billing Disputes" },
  { id: "cancellation", label: "Cancellation Process" },
  { id: "non-refundable", label: "Non-Refundable Items" },
  { id: "changes", label: "Changes to This Policy" },
  { id: "contact", label: "Contact Us" },
];

export default function RefundPage() {
  return (
    <>
      <LegalHero
        title="Refund Policy"
        description="Our policy on refunds, cancellations, and billing disputes. We aim to be fair and transparent."
        lastUpdated="July 1, 2026"
        effectiveDate="July 1, 2026"
        version="2.0"
      />

      <LegalContent tableOfContents={tableOfContents}>
        {/* Overview */}
        <section id="overview" className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            1. Overview
          </h2>
          <p className="text-slate-600 leading-relaxed mb-4">
            Xenboox operates on a subscription billing model as described on our{" "}
            <a href="/pricing" className="text-blue-600 hover:underline">
              Pricing page
            </a>
            . All fees are billed in advance on a monthly or annual basis
            depending on your chosen plan.
          </p>
          <div className="rounded-xl bg-green-50 border border-green-100 p-4">
            <p className="text-sm text-green-800">
              <strong>Our Promise:</strong> We want you to be satisfied with
              Xenboox. If you&apos;re not happy, contact us and we&apos;ll work
              to make it right.
            </p>
          </div>
        </section>

        {/* Monthly */}
        <section id="monthly" className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            2. Monthly Plans
          </h2>
          <div className="rounded-xl border border-slate-200 p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600 shrink-0">
                <span className="text-xl">📅</span>
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 mb-2">
                  Cancel Anytime
                </h4>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Monthly subscriptions may be cancelled at any time. Upon
                  cancellation, you will retain access to the Platform until the
                  end of your current billing period. No partial refunds are
                  provided for unused days within a billing period.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Annual */}
        <section id="annual" className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            3. Annual Plans
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-green-200 bg-green-50 p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 text-green-600 shrink-0">
                  <span className="text-xl">✓</span>
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900 mb-2">
                    Within 14 Days
                  </h4>
                  <p className="text-sm text-slate-600">
                    Full refund if cancelled within 14 days of initial
                    subscription.
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-600 shrink-0">
                  <span className="text-xl">⏰</span>
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900 mb-2">
                    After 14 Days
                  </h4>
                  <p className="text-sm text-slate-600">
                    Non-refundable, but you retain access for the remainder of
                    the paid term.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Enterprise */}
        <section id="enterprise" className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            4. Enterprise &amp; Firm Plans
          </h2>
          <p className="text-slate-600 leading-relaxed">
            Custom enterprise agreements are governed by the terms specified in
            your signed contract. Please refer to your agreement for
            cancellation and refund terms. Our team is always available to
            discuss any concerns.
          </p>
        </section>

        {/* Service Credits */}
        <section id="credits" className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            5. Service Credits
          </h2>
          <p className="text-slate-600 leading-relaxed mb-4">
            In the event of prolonged service unavailability exceeding our{" "}
            <a href="/sla" className="text-blue-600 hover:underline">
              Service Level Agreement
            </a>
            , you may be eligible for service credits rather than monetary
            refunds.
          </p>
          <div className="rounded-xl bg-blue-50 border border-blue-100 p-4">
            <p className="text-sm text-blue-800">
              Service credits are calculated at 5% of monthly fees per full hour
              of downtime exceeding the SLA threshold, up to 100% of your
              monthly fee.
            </p>
          </div>
        </section>

        {/* Disputes */}
        <section id="disputes" className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            6. Billing Disputes
          </h2>
          <p className="text-slate-600 leading-relaxed mb-4">
            If you believe you have been billed incorrectly, contact us at{" "}
            <a
              href="mailto:billing@xenboox.com"
              className="text-blue-600 hover:underline"
            >
              billing@xenboox.com
            </a>{" "}
            within 30 days of the billing date. We will investigate and resolve
            the dispute promptly.
          </p>
          <div className="rounded-xl border border-slate-200 p-4">
            <h4 className="font-medium text-slate-900 mb-2">What to Include</h4>
            <ul className="space-y-1 text-sm text-slate-600">
              <li>• Your account email</li>
              <li>• Invoice or receipt number</li>
              <li>• Description of the billing issue</li>
              <li>• Amount in dispute</li>
            </ul>
          </div>
        </section>

        {/* Cancellation */}
        <section id="cancellation" className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            7. Cancellation Process
          </h2>
          <p className="text-slate-600 leading-relaxed mb-4">
            To cancel your subscription:
          </p>
          <div className="space-y-4">
            {[
              {
                step: "1",
                title: "Navigate to Billing",
                desc: "Log in and go to Settings → Billing",
              },
              {
                step: "2",
                title: "Cancel Subscription",
                desc: 'Select "Cancel Subscription" and follow the prompts',
              },
              {
                step: "3",
                title: "Confirm via Email",
                desc: "Confirm your cancellation via the email we send",
              },
              {
                step: "4",
                title: "Export Your Data",
                desc: "Your data remains accessible for 90 days after cancellation",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="flex items-start gap-4 rounded-xl border border-slate-200 p-4"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600 font-bold text-sm shrink-0">
                  {item.step}
                </div>
                <div>
                  <h4 className="font-medium text-slate-900">{item.title}</h4>
                  <p className="text-sm text-slate-600">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Non-Refundable */}
        <section id="non-refundable" className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            8. Non-Refundable Items
          </h2>
          <p className="text-slate-600 leading-relaxed mb-4">
            The following are non-refundable:
          </p>
          <div className="rounded-xl border border-slate-200 divide-y divide-slate-100">
            {[
              "Setup fees (if applicable)",
              "Usage overage charges",
              "Third-party integration fees",
              "Custom development work",
              "Training or consulting services",
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-4">
                <span className="text-slate-400 mt-0.5">•</span>
                <p className="text-sm text-slate-600">{item}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Changes */}
        <section id="changes" className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            9. Changes to This Policy
          </h2>
          <p className="text-slate-600 leading-relaxed">
            We may update this policy from time to time. Material changes will
            be communicated via email at least 30 days before they take effect.
          </p>
        </section>

        {/* Contact */}
        <section id="contact" className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            10. Contact Us
          </h2>
          <p className="text-slate-600 leading-relaxed mb-4">
            For billing-related inquiries, contact{" "}
            <a
              href="mailto:billing@xenboox.com"
              className="text-blue-600 hover:underline"
            >
              billing@xenboox.com
            </a>
            .
          </p>
        </section>
      </LegalContent>
    </>
  );
}
