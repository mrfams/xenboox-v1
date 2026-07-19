import { LegalShell } from "../components/marketing-primitives";

export default function SLAPage() {
  return (
    <LegalShell title="Service Level Agreement" updated="January 2026">
      <div>
        <h2>1. Uptime Commitment</h2>
        <p>
          Xenboox commits to a monthly uptime of <strong>99.9%</strong> for the
          core platform (web, API, and database). Uptime is measured as the
          percentage of minutes the service is available during a calendar
          month, excluding scheduled maintenance.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th>Monthly Uptime</th>
                <th>Service Credit</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>99.0% – 99.9%</td>
                <td>10% of monthly fee</td>
              </tr>
              <tr>
                <td>95.0% – 99.0%</td>
                <td>25% of monthly fee</td>
              </tr>
              <tr>
                <td>Below 95.0%</td>
                <td>50% of monthly fee</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2>2. Scheduled Maintenance</h2>
        <p>
          Scheduled maintenance windows are communicated at least 48 hours in
          advance via email and in-app notification. Maintenance windows do not
          count toward uptime calculations. We aim to schedule maintenance
          during off-peak hours (2:00 AM – 5:00 AM UTC).
        </p>
      </div>

      <div>
        <h2>3. Incident Response</h2>
        <div className="overflow-x-auto mt-2">
          <table className="w-full">
            <thead>
              <tr>
                <th>Severity</th>
                <th>Response Time</th>
                <th>Resolution Target</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Critical (service down)</td>
                <td>1 hour</td>
                <td>4 hours</td>
              </tr>
              <tr>
                <td>High (major feature broken)</td>
                <td>4 hours</td>
                <td>24 hours</td>
              </tr>
              <tr>
                <td>Medium (minor feature issue)</td>
                <td>8 hours</td>
                <td>72 hours</td>
              </tr>
              <tr>
                <td>Low (cosmetic/minor)</td>
                <td>24 hours</td>
                <td>Next release</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2>4. Exclusions</h2>
        <p>Uptime commitments do not apply to:</p>
        <ul className="mt-2">
          <li>Issues caused by the user&apos;s network, device, or browser</li>
          <li>
            Third-party service outages (payment processors, email providers)
          </li>
          <li>Force majeure events</li>
          <li>Beta or preview features</li>
          <li>User-initiated data modifications or deletions</li>
        </ul>
      </div>

      <div>
        <h2>5. Service Credits</h2>
        <p>
          To claim a service credit, contact{" "}
          <span className="text-white">support@xenboox.com</span> within 30 days
          of the incident. Credits are applied to your next billing cycle and do
          not exceed 50% of the monthly fee. Credits are non-transferable and
          have no cash value.
        </p>
      </div>

      <div>
        <h2>6. Support Channels</h2>
        <ul className="mt-2">
          <li>
            <strong>Email:</strong> support@xenboox.com (all plans)
          </li>
          <li>
            <strong>In-app chat:</strong> Available on paid plans during
            business hours
          </li>
          <li>
            <strong>Status page:</strong> status.xenboox.com (public uptime
            dashboard)
          </li>
        </ul>
      </div>

      <div>
        <h2>7. Contact</h2>
        <p>
          Questions about this SLA? Contact us at{" "}
          <span className="text-white">support@xenboox.com</span>.
        </p>
      </div>
    </LegalShell>
  );
}
