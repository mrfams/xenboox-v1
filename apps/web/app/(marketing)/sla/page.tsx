import { MarketingHero } from "@/components/marketing/hero";

export default function SLAPage() {
  return (
    <>
      <MarketingHero
        title="Service Level Agreement"
        description="Last updated: July 1, 2026 · Our commitment to platform availability and performance."
      />

      <section className="py-16">
        <div className="mx-auto max-w-3xl px-4">
          <div className="prose prose-slate max-w-none">
            <h2>1. Service Commitment</h2>
            <p>
              Xenboox commits to a platform uptime of <strong>99.9%</strong>{" "}
              measured monthly, excluding scheduled maintenance and force
              majeure events.
            </p>

            <h2>2. Definitions</h2>
            <ul>
              <li>
                <strong>Uptime:</strong> The percentage of time during a
                calendar month that the Xenboox platform is accessible via the
                web application and API.
              </li>
              <li>
                <strong>Downtime:</strong> Periods during which the platform is
                unavailable for authorized users, excluding planned maintenance.
              </li>
              <li>
                <strong>Scheduled Maintenance:</strong> Pre-announced
                maintenance windows, typically outside business hours (UTC±0
                22:00–06:00) with at least 48 hours notice.
              </li>
            </ul>

            <h2>3. Uptime Calculation</h2>
            <p>
              Uptime is calculated as: <br />
              <code className="text-sm">
                (Total minutes in month − Downtime minutes) ÷ Total minutes in
                month × 100
              </code>
            </p>

            <h2>4. Service Credits</h2>
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2 pr-4 font-medium">Monthly Uptime</th>
                  <th className="py-2 font-medium">Service Credit</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-2 pr-4">99.0% – 99.9%</td>
                  <td className="py-2">5% of monthly fee</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 pr-4">95.0% – 98.9%</td>
                  <td className="py-2">10% of monthly fee</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 pr-4">Below 95.0%</td>
                  <td className="py-2">25% of monthly fee</td>
                </tr>
              </tbody>
            </table>

            <h2>5. Exclusions</h2>
            <p>The SLA does not apply to:</p>
            <ul>
              <li>
                Downtime caused by user-side network or infrastructure issues
              </li>
              <li>
                Third-party service provider outages (bank feeds, mobile money
                APIs, cloud providers)
              </li>
              <li>
                Beta features or features explicitly labeled as "preview" or
                "experimental"
              </li>
              <li>
                Actions taken in response to security incidents or legal
                requirements
              </li>
              <li>
                Force majeure events including natural disasters, civil unrest,
                or widespread internet disruption
              </li>
            </ul>

            <h2>6. Requesting Credits</h2>
            <p>
              To request service credits, contact{" "}
              <a href="mailto:support@xenboox.com">support@xenboox.com</a>{" "}
              within 30 days of the incident with:
            </p>
            <ul>
              <li>Date and time range of the downtime</li>
              <li>Description of the impact</li>
              <li>Any supporting evidence (error logs, screenshots)</li>
            </ul>
            <p>
              We will acknowledge receipt within 2 business days and resolve the
              claim within 10 business days.
            </p>

            <h2>7. Support Response Times</h2>
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2 pr-4 font-medium">Severity</th>
                  <th className="py-2 pr-4 font-medium">Definition</th>
                  <th className="py-2 font-medium">Response Time</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-2 pr-4 font-semibold">Critical</td>
                  <td className="py-2 pr-4">
                    Platform unavailable or data loss
                  </td>
                  <td className="py-2">1 hour</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 pr-4 font-semibold">High</td>
                  <td className="py-2 pr-4">Major feature unavailable</td>
                  <td className="py-2">4 hours</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 pr-4 font-semibold">Normal</td>
                  <td className="py-2 pr-4">Minor feature issue, non-urgent</td>
                  <td className="py-2">1 business day</td>
                </tr>
              </tbody>
            </table>

            <h2>8. Monitoring & Reporting</h2>
            <p>
              Platform uptime is monitored continuously. Monthly uptime reports
              are published on our{" "}
              <a href="https://status.xenboox.com">status page</a>.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
