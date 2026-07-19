export default function SLAPage() {
  return (
    <>
      <section className="border-b py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-bold tracking-tight">
              Service Level Agreement
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
            <h2 className="mb-3 text-lg font-semibold text-foreground">1. Uptime Commitment</h2>
            <p>
              Xenboox commits to a monthly uptime of <strong className="text-foreground">99.9%</strong> for the core platform (web, API, and database). Uptime is measured as the percentage of minutes the service is available during a calendar month, excluding scheduled maintenance.
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-semibold text-foreground">Monthly Uptime</th>
                    <th className="pb-2 font-semibold text-foreground">Service Credit</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2">99.0% – 99.9%</td>
                    <td className="py-2">10% of monthly fee</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2">95.0% – 99.0%</td>
                    <td className="py-2">25% of monthly fee</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2">Below 95.0%</td>
                    <td className="py-2">50% of monthly fee</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold text-foreground">2. Scheduled Maintenance</h2>
            <p>
              Scheduled maintenance windows are communicated at least 48 hours in advance via email and in-app notification. Maintenance windows do not count toward uptime calculations. We aim to schedule maintenance during off-peak hours (2:00 AM – 5:00 AM UTC).
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold text-foreground">3. Incident Response</h2>
            <div className="overflow-x-auto mt-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-semibold text-foreground">Severity</th>
                    <th className="pb-2 font-semibold text-foreground">Response Time</th>
                    <th className="pb-2 font-semibold text-foreground">Resolution Target</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2">Critical (service down)</td>
                    <td className="py-2">1 hour</td>
                    <td className="py-2">4 hours</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2">High (major feature broken)</td>
                    <td className="py-2">4 hours</td>
                    <td className="py-2">24 hours</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2">Medium (minor feature issue)</td>
                    <td className="py-2">8 hours</td>
                    <td className="py-2">72 hours</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2">Low (cosmetic/minor)</td>
                    <td className="py-2">24 hours</td>
                    <td className="py-2">Next release</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold text-foreground">4. Exclusions</h2>
            <p>Uptime commitments do not apply to:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Issues caused by the user&apos;s network, device, or browser</li>
              <li>Third-party service outages (payment processors, email providers)</li>
              <li>Force majeure events</li>
              <li>Beta or preview features</li>
              <li>User-initiated data modifications or deletions</li>
            </ul>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold text-foreground">5. Service Credits</h2>
            <p>
              To claim a service credit, contact{" "}
              <span className="text-foreground">support@xenboox.com</span>{" "}
              within 30 days of the incident. Credits are applied to your next billing cycle and do not exceed 50% of the monthly fee. Credits are non-transferable and have no cash value.
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold text-foreground">6. Support Channels</h2>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong className="text-foreground">Email:</strong> support@xenboox.com (all plans)</li>
              <li><strong className="text-foreground">In-app chat:</strong> Available on paid plans during business hours</li>
              <li><strong className="text-foreground">Status page:</strong> status.xenboox.com (public uptime dashboard)</li>
            </ul>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold text-foreground">7. Contact</h2>
            <p>
              Questions about this SLA? Contact us at{" "}
              <span className="text-foreground">support@xenboox.com</span>.
            </p>
          </div>
        </div>
      </section>
    </>
  )
}
