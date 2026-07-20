import { Cookie, ChevronRight } from "lucide-react";
import Link from "next/link";

const sections = [
  { id: "introduction", title: "Introduction" },
  { id: "what-are-cookies", title: "What Are Cookies" },
  { id: "how-we-use", title: "How We Use Cookies" },
  { id: "specific-cookies", title: "Specific Cookies" },
  { id: "third-party", title: "Third-Party Cookies" },
  { id: "your-choices", title: "Your Choices" },
  { id: "legal-basis", title: "Legal Basis" },
  { id: "changes", title: "Changes" },
  { id: "contact", title: "Contact" },
];

const cookieTable = [
  {
    key: "next-auth.session-token",
    category: "Strictly Necessary",
    purpose:
      "Authentication session token. Required to keep you logged in across page loads.",
    duration: "30 days",
  },
  {
    key: "next-auth.csrf-token",
    category: "Strictly Necessary",
    purpose:
      "CSRF protection token. Prevents unauthorized actions on your behalf.",
    duration: "Session",
  },
  {
    key: "next-auth.callback-url",
    category: "Strictly Necessary",
    purpose: "Redirect management during authentication flow.",
    duration: "Session",
  },
  {
    key: "theme",
    category: "Functional",
    purpose: "Stores your UI theme preference (light, dark, or system).",
    duration: "1 year",
  },
  {
    key: "locale",
    category: "Functional",
    purpose: "Stores your language and regional formatting preferences.",
    duration: "1 year",
  },
  {
    key: "sidebar-state",
    category: "Functional",
    purpose: "Remembers dashboard sidebar state (collapsed or expanded).",
    duration: "Session",
  },
  {
    key: "_ga, _ga_<id>",
    category: "Analytics",
    purpose:
      "Google Analytics identifiers for aggregated usage patterns. Set only with consent.",
    duration: "2 years / 1 min",
  },
];

export default function CookiePolicyPage() {
  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950">
        <div className="absolute inset-0 bg-grid-dark opacity-30" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm px-4 py-1.5 text-xs font-medium text-white/60">
              <Cookie className="h-3 w-3 text-blue-400" />
              Legal
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white">
              Cookie Policy
            </h1>
            <p className="mt-4 text-white/50 max-w-xl">
              Last updated: July 2026
            </p>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </section>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="flex gap-12 lg:gap-16">
          <nav className="hidden lg:block w-56 shrink-0">
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
            <section id="introduction">
              <h2>1. Introduction</h2>
              <p>
                Xenboox (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;)
                uses cookies and similar tracking technologies on our website,
                web application, mobile application, and desktop application
                (collectively, the &quot;Service&quot;). This Cookie Policy
                explains what cookies are, how we use them, and your choices
                regarding their use.
              </p>
              <p>
                By continuing to use the Service, you consent to our use of
                cookies in accordance with this policy. For more information
                about how we handle your personal data, please see our{" "}
                <Link
                  href="/privacy"
                  className="text-foreground underline underline-offset-2 hover:no-underline"
                >
                  Privacy Policy
                </Link>
                .
              </p>
            </section>

            <section id="what-are-cookies">
              <h2>2. What Are Cookies</h2>
              <p>
                Cookies are small text files placed on your device (computer,
                tablet, or mobile) when you visit a website. They are widely
                used to make websites work efficiently, enhance user experience,
                and provide information to site owners.
              </p>
              <p>
                We also use similar technologies such as local storage, session
                storage, and service workers to provide offline functionality
                and improve application performance.
              </p>
            </section>

            <section id="how-we-use">
              <h2>3. How We Use Cookies</h2>
              <div className="space-y-6">
                <div className="rounded-xl border bg-gradient-to-br from-white to-slate-50 p-5">
                  <h3 className="font-semibold text-foreground mb-2">
                    Strictly Necessary Cookies
                  </h3>
                  <p>
                    Essential for the Service to function properly. They enable
                    core functionality such as authentication, session
                    management, and security. The Service cannot function
                    without these cookies.
                  </p>
                </div>
                <div className="rounded-xl border bg-gradient-to-br from-white to-slate-50 p-5">
                  <h3 className="font-semibold text-foreground mb-2">
                    Functional Cookies
                  </h3>
                  <p>
                    Enable the Service to remember your preferences, such as
                    language, timezone, theme, and display settings. They
                    provide a personalized experience tailored to your choices.
                  </p>
                </div>
                <div className="rounded-xl border bg-gradient-to-br from-white to-slate-50 p-5">
                  <h3 className="font-semibold text-foreground mb-2">
                    Analytics Cookies
                  </h3>
                  <p>
                    Help us understand how users interact with the Service —
                    which pages are visited most, which features are used, and
                    where users encounter errors. All analytics data is
                    aggregated and anonymized.
                  </p>
                </div>
              </div>
            </section>

            <section id="specific-cookies">
              <h2>4. Specific Cookies We Use</h2>
              <p>
                The following table lists the specific cookies and similar
                storage mechanisms used by the Service:
              </p>
              <div className="overflow-x-auto mt-4 rounded-xl border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-foreground">
                        Cookie / Storage Key
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-foreground">
                        Category
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-foreground hidden md:table-cell">
                        Purpose
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-foreground">
                        Duration
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {cookieTable.map((row) => (
                      <tr
                        key={row.key}
                        className="border-t hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-4 py-3 font-mono text-xs text-foreground">
                          {row.key}
                        </td>
                        <td className="px-4 py-3">{row.category}</td>
                        <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                          {row.purpose}
                        </td>
                        <td className="px-4 py-3">{row.duration}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section id="third-party">
              <h2>5. Third-Party Cookies</h2>
              <p>
                We use a limited number of trusted third-party services that may
                set their own cookies or similar technologies:
              </p>
              <ul>
                <li>
                  <strong className="text-foreground">Vercel Analytics:</strong>{" "}
                  Privacy-first, privacy-preserving analytics. Collects only
                  page-level metrics and performance data.
                </li>
                <li>
                  <strong className="text-foreground">Google OAuth:</strong> If
                  you choose to authenticate using Google, Google may set
                  cookies during the authentication flow.
                </li>
              </ul>
            </section>

            <section id="your-choices">
              <h2>6. Cookie Consent and Your Choices</h2>
              <p>
                When you first visit the Service, we display a cookie consent
                banner that allows you to accept or decline non-essential
                cookies. Strictly necessary cookies are always set, as they are
                required for the Service to function.
              </p>
              <p>You may also manage cookies through your browser settings:</p>
              <ul>
                <li>
                  <a
                    href="https://support.google.com/chrome/answer/95647"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-foreground underline underline-offset-2"
                  >
                    Google Chrome
                  </a>
                </li>
                <li>
                  <a
                    href="https://support.mozilla.org/en-US/kb/enable-and-disable-cookies-website-preferences"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-foreground underline underline-offset-2"
                  >
                    Mozilla Firefox
                  </a>
                </li>
                <li>
                  <a
                    href="https://support.apple.com/guide/safari/manage-cookies-and-website-data-sfri11471/mac"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-foreground underline underline-offset-2"
                  >
                    Safari
                  </a>
                </li>
                <li>
                  <a
                    href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-foreground underline underline-offset-2"
                  >
                    Microsoft Edge
                  </a>
                </li>
              </ul>
            </section>

            <section id="legal-basis">
              <h2>7. Legal Basis (GDPR / CCPA)</h2>
              <ul>
                <li>
                  <strong className="text-foreground">EEA / UK (GDPR):</strong>{" "}
                  Strictly necessary cookies are set based on our legitimate
                  interest. All other cookies require your prior consent.
                </li>
                <li>
                  <strong className="text-foreground">
                    California (CCPA):
                  </strong>{" "}
                  We do not sell your personal information.
                </li>
              </ul>
            </section>

            <section id="changes">
              <h2>8. Changes to This Policy</h2>
              <p>
                We may update this Cookie Policy from time to time. When we make
                material changes, we will notify you via email or through an
                in-app notice.
              </p>
            </section>

            <section id="contact">
              <h2>9. Contact Us</h2>
              <ul>
                <li>
                  Email:{" "}
                  <span className="text-foreground font-medium">
                    privacy@xenboox.com
                  </span>
                </li>
                <li>
                  Data Protection:{" "}
                  <span className="text-foreground font-medium">
                    dpo@xenboox.com
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
