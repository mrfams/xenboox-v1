import {
  Shield,
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";

const sections = [
  { id: "uptime", title: "Uptime Commitment" },
  { id: "maintenance", title: "Scheduled Maintenance" },
  { id: "incident-response", title: "Incident Response" },
  { id: "exclusions", title: "Exclusions" },
  { id: "service-credits", title: "Service Credits" },
  { id: "support", title: "Support Channels" },
  { id: "contact", title: "Contact" },
];

export default function SLAPage() {
  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950">
        <div className="absolute inset-0 bg-grid-dark opacity-30" />
        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-14 md:py-20">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm px-4 py-1.5 text-xs font-medium text-white/60">
              <Shield className="h-3 w-3 text-blue-400" />
              Legal
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white">
              Service Level Agreement
            </h1>
            <p className="mt-3 text-white/50 max-w-xl">
              Last updated: January 2026
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
            <div className="rounded-2xl border bg-gradient-to-br from-emerald-50 to-white p-6 mb-6">
              <div className="flex items-start gap-4">
                <CheckCircle2 className="h-6 w-6 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm">
                    <strong className="text-foreground">
                      Our commitment to you.
                    </strong>{" "}
                    Xenboox guarantees 99.9% monthly uptime for the core
                    platform. If we fall short, you receive service credits.
                  </p>
                </div>
              </div>
            </div>

            <section id="uptime">
              <h2>1. Uptime Commitment</h2>
              <p>
                Xenboox commits to a monthly uptime of{" "}
                <strong className="text-foreground">99.9%</strong> for the core
                platform (web, API, and database). Uptime is measured as the
                percentage of minutes the service is available during a calendar
                month, excluding scheduled maintenance.
              </p>
              <div className="overflow-x-auto mt-4 rounded-xl border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-foreground">
                        Monthly Uptime
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-foreground">
                        Service Credit
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">99.0% – 99.9%</td>
                      <td className="px-4 py-3">10% of monthly fee</td>
                    </tr>
                    <tr className="border-t hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">95.0% – 99.0%</td>
                      <td className="px-4 py-3">25% of monthly fee</td>
                    </tr>
                    <tr className="border-t hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">Below 95.0%</td>
                      <td className="px-4 py-3">50% of monthly fee</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section id="maintenance">
              <h2>2. Scheduled Maintenance</h2>
              <p>
                Scheduled maintenance windows are communicated at least{" "}
                <strong className="text-foreground">48 hours</strong> in advance
                via email and in-app notification. Maintenance is scheduled
                during off-peak hours (2:00 AM – 5:00 AM UTC). Maintenance
                windows do not count toward uptime calculations.
              </p>
            </section>

            <section id="incident-response">
              <h2>3. Incident Response</h2>
              <div className="overflow-x-auto mt-4 rounded-xl border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-foreground">
                        Severity
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-foreground">
                        Response Time
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-foreground">
                        Resolution Target
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">
                        Critical
                      </td>
                      <td className="px-4 py-3">1 hour</td>
                      <td className="px-4 py-3">4 hours</td>
                    </tr>
                    <tr className="border-t hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">
                        High
                      </td>
                      <td className="px-4 py-3">4 hours</td>
                      <td className="px-4 py-3">24 hours</td>
                    </tr>
                    <tr className="border-t hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">
                        Medium
                      </td>
                      <td className="px-4 py-3">8 hours</td>
                      <td className="px-4 py-3">72 hours</td>
                    </tr>
                    <tr className="border-t hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">
                        Low
                      </td>
                      <td className="px-4 py-3">24 hours</td>
                      <td className="px-4 py-3">Next release</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section id="exclusions">
              <h2>4. Exclusions</h2>
              <p>Uptime commitments do not apply to:</p>
              <ul>
                <li>
                  Issues caused by the user&apos;s network, device, or browser
                </li>
                <li>
                  Third-party service outages (payment processors, email
                  providers, LLM APIs)
                </li>
                <li>Force majeure events</li>
                <li>Beta or preview features</li>
                <li>User-initiated data modifications or deletions</li>
              </ul>
            </section>

            <section id="service-credits">
              <h2>5. Service Credits</h2>
              <p>
                To claim a service credit, contact{" "}
                <span className="text-foreground font-medium">
                  support@xenboox.com
                </span>{" "}
                within 30 days of the incident. Credits are applied to your next
                billing cycle and do not exceed 50% of the monthly fee.
              </p>
            </section>

            <section id="support">
              <h2>6. Support Channels</h2>
              <div className="grid gap-4 sm:grid-cols-3 mt-4">
                <div className="rounded-xl border bg-gradient-to-br from-white to-slate-50 p-4 text-center">
                  <div className="text-lg font-semibold text-foreground">
                    Email
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    support@xenboox.com
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    All plans
                  </p>
                </div>
                <div className="rounded-xl border bg-gradient-to-br from-white to-slate-50 p-4 text-center">
                  <div className="text-lg font-semibold text-foreground">
                    In-App Chat
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Paid plans
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Business hours
                  </p>
                </div>
                <div className="rounded-xl border bg-gradient-to-br from-white to-slate-50 p-4 text-center">
                  <div className="text-lg font-semibold text-foreground">
                    Status Page
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    status.xenboox.com
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Real-time updates
                  </p>
                </div>
              </div>
            </section>

            <section id="contact">
              <h2>7. Contact</h2>
              <p>
                Questions about this SLA? Contact us at{" "}
                <span className="text-foreground font-medium">
                  support@xenboox.com
                </span>
                .
              </p>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
