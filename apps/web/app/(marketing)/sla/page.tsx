import type { Metadata } from "next";

import { LegalHero, LegalContent } from "@/components/marketing/legal-hero";

export const metadata: Metadata = {
  title: "Service Level Agreement",
  description:
    "Our commitment to platform availability, performance, and support response times.",
};

const tableOfContents = [
  { id: "commitment", label: "Service Commitment" },
  { id: "definitions", label: "Definitions" },
  { id: "uptime", label: "Uptime Calculation" },
  { id: "credits", label: "Service Credits" },
  { id: "exclusions", label: "Exclusions" },
  { id: "requesting", label: "Requesting Credits" },
  { id: "support", label: "Support Response Times" },
  { id: "monitoring", label: "Monitoring & Reporting" },
  { id: "changes", label: "Changes to This Agreement" },
  { id: "contact", label: "Contact Us" },
];

export default function SLAPage() {
  return (
    <>
      <LegalHero
        title="Service Level Agreement"
        description="Our commitment to platform availability, performance, and support response times."
        lastUpdated="July 1, 2026"
        effectiveDate="July 1, 2026"
        version="2.0"
      />

      <LegalContent tableOfContents={tableOfContents}>
        {/* Commitment */}
        <section id="commitment" className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            1. Service Commitment
          </h2>
          <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 p-8 text-white text-center mb-6">
            <p className="text-sm text-blue-100 mb-2">We commit to</p>
            <p className="text-5xl font-bold mb-2">99.9%</p>
            <p className="text-blue-100">platform uptime, measured monthly</p>
          </div>
          <p className="text-slate-600 leading-relaxed">
            Xenboox commits to a platform uptime of <strong>99.9%</strong>{" "}
            measured monthly, excluding scheduled maintenance and force majeure
            events. If we fall below this threshold, you are eligible for
            service credits.
          </p>
        </section>

        {/* Definitions */}
        <section id="definitions" className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            2. Definitions
          </h2>
          <div className="rounded-xl border border-slate-200 divide-y divide-slate-100">
            <div className="p-4">
              <h4 className="font-medium text-slate-900">Uptime</h4>
              <p className="text-sm text-slate-600">
                The percentage of time during a calendar month that the Xenboox
                platform is accessible via the web application and API.
              </p>
            </div>
            <div className="p-4">
              <h4 className="font-medium text-slate-900">Downtime</h4>
              <p className="text-sm text-slate-600">
                Periods during which the platform is unavailable for authorized
                users, excluding planned maintenance.
              </p>
            </div>
            <div className="p-4">
              <h4 className="font-medium text-slate-900">
                Scheduled Maintenance
              </h4>
              <p className="text-sm text-slate-600">
                Pre-announced maintenance windows, typically outside business
                hours (UTC 22:00–06:00) with at least 48 hours notice.
              </p>
            </div>
            <div className="p-4">
              <h4 className="font-medium text-slate-900">Force Majeure</h4>
              <p className="text-sm text-slate-600">
                Unforeseeable events beyond our control, including natural
                disasters, civil unrest, or widespread internet disruption.
              </p>
            </div>
          </div>
        </section>

        {/* Uptime Calculation */}
        <section id="uptime" className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            3. Uptime Calculation
          </h2>
          <p className="text-slate-600 leading-relaxed mb-4">
            Uptime is calculated using the following formula:
          </p>
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-6 text-center">
            <code className="text-sm text-slate-700 font-mono">
              Uptime = (Total minutes − Downtime minutes) ÷ Total minutes × 100
            </code>
          </div>
          <p className="text-slate-600 leading-relaxed mt-4">
            For example, in a 30-day month (43,200 minutes), if the platform is
            down for 43 minutes, uptime would be 99.9%.
          </p>
        </section>

        {/* Service Credits */}
        <section id="credits" className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            4. Service Credits
          </h2>
          <p className="text-slate-600 leading-relaxed mb-4">
            If we fail to meet our uptime commitment, you may be eligible for
            service credits:
          </p>
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-medium text-slate-900">
                    Monthly Uptime
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-slate-900">
                    Service Credit
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-slate-900">
                    Example
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="px-4 py-3 text-slate-600">99.0% – 99.9%</td>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    5% of monthly fee
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    $9.50 credit on $190/mo plan
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-slate-600">95.0% – 98.9%</td>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    10% of monthly fee
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    $19 credit on $190/mo plan
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-slate-600">Below 95.0%</td>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    25% of monthly fee
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    $47.50 credit on $190/mo plan
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-slate-600 text-sm mt-4">
            Service credits are applied to your next billing cycle and are not
            redeemable for cash.
          </p>
        </section>

        {/* Exclusions */}
        <section id="exclusions" className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            5. Exclusions
          </h2>
          <p className="text-slate-600 leading-relaxed mb-4">
            The SLA does not apply to:
          </p>
          <div className="rounded-xl border border-slate-200 divide-y divide-slate-100">
            {[
              "Downtime caused by user-side network or infrastructure issues",
              "Third-party service provider outages (bank feeds, mobile money APIs, cloud providers)",
              "Beta features or features explicitly labeled as 'preview' or 'experimental'",
              "Actions taken in response to security incidents or legal requirements",
              "Force majeure events including natural disasters, civil unrest, or widespread internet disruption",
              "Scheduled maintenance announced at least 48 hours in advance",
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-4">
                <span className="text-slate-400 mt-0.5">•</span>
                <p className="text-sm text-slate-600">{item}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Requesting Credits */}
        <section id="requesting" className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            6. Requesting Credits
          </h2>
          <p className="text-slate-600 leading-relaxed mb-4">
            To request service credits, contact{" "}
            <a
              href="mailto:support@xenboox.com"
              className="text-blue-600 hover:underline"
            >
              support@xenboox.com
            </a>{" "}
            within 30 days of the incident with:
          </p>
          <div className="rounded-xl border border-slate-200 p-4">
            <ul className="space-y-2 text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <span className="text-slate-400 mt-0.5">•</span>
                Date and time range of the downtime
              </li>
              <li className="flex items-start gap-2">
                <span className="text-slate-400 mt-0.5">•</span>
                Description of the impact
              </li>
              <li className="flex items-start gap-2">
                <span className="text-slate-400 mt-0.5">•</span>
                Any supporting evidence (error logs, screenshots)
              </li>
            </ul>
          </div>
          <p className="text-slate-600 text-sm mt-4">
            We will acknowledge receipt within 2 business days and resolve the
            claim within 10 business days.
          </p>
        </section>

        {/* Support Response */}
        <section id="support" className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            7. Support Response Times
          </h2>
          <p className="text-slate-600 leading-relaxed mb-4">
            Our support team is committed to the following response times:
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 p-6">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-600 mb-3">
                <span className="text-lg font-bold">P1</span>
              </div>
              <h4 className="font-semibold text-slate-900">Critical</h4>
              <p className="text-sm text-slate-600 mt-1 mb-3">
                Platform unavailable or data loss
              </p>
              <p className="text-2xl font-bold text-slate-900">1 hour</p>
              <p className="text-xs text-slate-500">response time</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-6">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600 mb-3">
                <span className="text-lg font-bold">P2</span>
              </div>
              <h4 className="font-semibold text-slate-900">High</h4>
              <p className="text-sm text-slate-600 mt-1 mb-3">
                Major feature unavailable
              </p>
              <p className="text-2xl font-bold text-slate-900">4 hours</p>
              <p className="text-xs text-slate-500">response time</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-6">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600 mb-3">
                <span className="text-lg font-bold">P3</span>
              </div>
              <h4 className="font-semibold text-slate-900">Normal</h4>
              <p className="text-sm text-slate-600 mt-1 mb-3">
                Minor feature issue, non-urgent
              </p>
              <p className="text-2xl font-bold text-slate-900">1 day</p>
              <p className="text-xs text-slate-500">response time</p>
            </div>
          </div>
        </section>

        {/* Monitoring */}
        <section id="monitoring" className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            8. Monitoring &amp; Reporting
          </h2>
          <p className="text-slate-600 leading-relaxed">
            Platform uptime is monitored continuously. Monthly uptime reports
            are published on our{" "}
            <a
              href="https://status.xenboox.com"
              className="text-blue-600 hover:underline"
            >
              status page
            </a>
            . You can subscribe to receive real-time updates about service
            incidents and maintenance windows.
          </p>
        </section>

        {/* Changes */}
        <section id="changes" className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            9. Changes to This Agreement
          </h2>
          <p className="text-slate-600 leading-relaxed">
            We may update this SLA from time to time. Material changes will be
            communicated via email at least 30 days before they take effect.
            Your continued use of the platform after changes constitutes
            acceptance.
          </p>
        </section>

        {/* Contact */}
        <section id="contact" className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            10. Contact Us
          </h2>
          <p className="text-slate-600 leading-relaxed mb-4">
            For questions about this SLA or to request service credits, contact{" "}
            <a
              href="mailto:support@xenboox.com"
              className="text-blue-600 hover:underline"
            >
              support@xenboox.com
            </a>
            .
          </p>
        </section>
      </LegalContent>
    </>
  );
}
