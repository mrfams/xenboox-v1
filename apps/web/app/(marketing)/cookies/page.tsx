import type { Metadata } from "next";
import { LegalHero, LegalContent } from "@/components/marketing/legal-hero";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description:
    "How Xenboox uses cookies and similar tracking technologies. We use cookies only for essential platform operations.",
};

const tableOfContents = [
  { id: "what-are", label: "What Are Cookies" },
  { id: "how-we-use", label: "How We Use Cookies" },
  { id: "essential", label: "Essential Cookies" },
  { id: "analytics", label: "Analytics Cookies" },
  { id: "third-party", label: "Third-Party Cookies" },
  { id: "managing", label: "Managing Cookies" },
  { id: "changes", label: "Changes to This Policy" },
  { id: "contact", label: "Contact Us" },
];

export default function CookiesPage() {
  return (
    <>
      <LegalHero
        title="Cookie Policy"
        description="How Xenboox uses cookies and similar tracking technologies. We use cookies only for essential platform operations."
        lastUpdated="July 1, 2026"
        effectiveDate="July 1, 2026"
        version="2.0"
      />

      <LegalContent tableOfContents={tableOfContents}>
        {/* What Are Cookies */}
        <section id="what-are" className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            1. What Are Cookies
          </h2>
          <p className="text-slate-600 leading-relaxed mb-4">
            Cookies are small text files stored on your device by your web
            browser. They help websites function properly, remember preferences,
            and understand how users interact with the platform.
          </p>
          <p className="text-slate-600 leading-relaxed">
            We also use similar technologies like local storage and session
            storage to maintain your authentication state and user preferences.
          </p>
        </section>

        {/* How We Use */}
        <section id="how-we-use" className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            2. How We Use Cookies
          </h2>
          <p className="text-slate-600 leading-relaxed mb-4">
            Xenboox uses cookies strictly for essential platform operations. We
            do not use cookies for advertising or cross-site tracking.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              {
                title: "Authentication",
                desc: "Keep you logged in and verify your identity",
                color: "blue",
              },
              {
                title: "Security",
                desc: "Protect against CSRF and other attacks",
                color: "green",
              },
              {
                title: "Preferences",
                desc: "Remember your settings and preferences",
                color: "purple",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-slate-200 p-4"
              >
                <div
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-lg bg-${item.color}-100 text-${item.color}-600 mb-2`}
                >
                  {item.title.charAt(0)}
                </div>
                <h4 className="font-medium text-slate-900">{item.title}</h4>
                <p className="text-sm text-slate-600 mt-1">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Essential Cookies */}
        <section id="essential" className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            3. Essential Cookies
          </h2>
          <p className="text-slate-600 leading-relaxed mb-4">
            These cookies are necessary for the platform to function. They
            cannot be disabled.
          </p>
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-medium text-slate-900">
                    Cookie
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-slate-900">
                    Purpose
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-slate-900">
                    Duration
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">
                    next-auth.session-token
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    Authentication session management
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    Session / 30 days
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">
                    __Secure-next-auth.callback-url
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    OAuth callback routing
                  </td>
                  <td className="px-4 py-3 text-slate-600">Session</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">
                    csrf-token
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    Cross-site request forgery protection
                  </td>
                  <td className="px-4 py-3 text-slate-600">Session</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">
                    next-auth.csrf-token
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    CSRF token for form submissions
                  </td>
                  <td className="px-4 py-3 text-slate-600">Session</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">
                    theme-preference
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    Remember dark/light mode preference
                  </td>
                  <td className="px-4 py-3 text-slate-600">1 year</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Analytics Cookies */}
        <section id="analytics" className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            4. Analytics Cookies
          </h2>
          <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 mb-4">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> We currently do not use analytics cookies.
              If we add analytics in the future, we will update this policy and
              request your consent before enabling them.
            </p>
          </div>
          <p className="text-slate-600 leading-relaxed">
            Analytics cookies help us understand how users interact with the
            platform, which features are most used, and where we can improve.
            These cookies are optional and only set with your explicit consent.
          </p>
        </section>

        {/* Third-Party */}
        <section id="third-party" className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            5. Third-Party Cookies
          </h2>
          <p className="text-slate-600 leading-relaxed mb-4">
            We do not use third-party advertising or tracking cookies. Our
            infrastructure providers may set essential cookies for
            functionality:
          </p>
          <div className="rounded-xl border border-slate-200 divide-y divide-slate-100">
            <div className="p-4">
              <h4 className="font-medium text-slate-900">Vercel</h4>
              <p className="text-sm text-slate-600">
                CDN and hosting — sets cookies for load balancing and edge
                caching
              </p>
            </div>
            <div className="p-4">
              <h4 className="font-medium text-slate-900">Stripe</h4>
              <p className="text-sm text-slate-600">
                Payment processing — sets cookies during checkout for fraud
                prevention
              </p>
            </div>
          </div>
        </section>

        {/* Managing */}
        <section id="managing" className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            6. Managing Cookies
          </h2>
          <p className="text-slate-600 leading-relaxed mb-4">
            Most browsers allow you to control cookies through settings. You
            can:
          </p>
          <div className="space-y-2 text-slate-600">
            <div className="flex items-start gap-2">
              <span className="text-slate-400 mt-1">•</span>
              View what cookies are set
            </div>
            <div className="flex items-start gap-2">
              <span className="text-slate-400 mt-1">•</span>
              Block cookies from specific sites
            </div>
            <div className="flex items-start gap-2">
              <span className="text-slate-400 mt-1">•</span>
              Delete cookies individually or in bulk
            </div>
            <div className="flex items-start gap-2">
              <span className="text-slate-400 mt-1">•</span>
              Set your browser to block all cookies
            </div>
          </div>
          <div className="rounded-xl bg-amber-50 border border-amber-100 p-4 mt-4">
            <p className="text-sm text-amber-800">
              <strong>Warning:</strong> Disabling essential cookies will prevent
              Xenboox from functioning properly — authentication, session
              management, and security features all require cookies.
            </p>
          </div>
        </section>

        {/* Changes */}
        <section id="changes" className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            7. Changes to This Policy
          </h2>
          <p className="text-slate-600 leading-relaxed">
            We may update this policy as our platform evolves. Material changes
            will be communicated via email or platform notification. We will
            request your consent before enabling any new non-essential cookies.
          </p>
        </section>

        {/* Contact */}
        <section id="contact" className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            8. Contact Us
          </h2>
          <p className="text-slate-600 leading-relaxed">
            For questions about our cookie usage, please contact{" "}
            <a
              href="mailto:privacy@xenboox.com"
              className="text-blue-600 hover:underline"
            >
              privacy@xenboox.com
            </a>
            .
          </p>
        </section>
      </LegalContent>
    </>
  );
}
