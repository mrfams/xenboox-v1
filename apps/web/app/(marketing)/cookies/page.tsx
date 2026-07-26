import { MarketingHero } from "@/components/marketing/hero";

export default function CookiesPage() {
  return (
    <>
      <MarketingHero
        title="Cookie Policy"
        subtitle="Legal"
        description="Last updated: July 1, 2026 · How Xenboox uses cookies and similar tracking technologies."
        compact
      />

      <section className="py-16">
        <div className="mx-auto max-w-3xl px-4">
          <div className="prose prose-slate max-w-none">
            <h2>1. What Are Cookies</h2>
            <p>
              Cookies are small text files stored on your device by your web
              browser. They help websites function properly, remember
              preferences, and understand how users interact with the platform.
            </p>

            <h2>2. How We Use Cookies</h2>
            <p>
              Xenboox uses cookies strictly for essential platform operations:
            </p>

            <h3>2.1 Essential Cookies</h3>
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2 pr-4 font-medium">Cookie</th>
                  <th className="py-2 pr-4 font-medium">Purpose</th>
                  <th className="py-2 font-medium">Duration</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-2 pr-4 font-mono">
                    next-auth.session-token
                  </td>
                  <td className="py-2 pr-4">Authentication session</td>
                  <td className="py-2">Session / persistent</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 pr-4 font-mono">
                    __Secure-next-auth.callback-url
                  </td>
                  <td className="py-2 pr-4">OAuth callback routing</td>
                  <td className="py-2">Session</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 pr-4 font-mono">csrf-token</td>
                  <td className="py-2 pr-4">
                    Cross-site request forgery protection
                  </td>
                  <td className="py-2">Session</td>
                </tr>
              </tbody>
            </table>

            <h3>2.2 Analytics & Preferences</h3>
            <p>
              With your consent, we may use analytics cookies to understand
              platform usage patterns. You can manage your preferences at any
              time through your account settings.
            </p>

            <h2>3. Third-Party Cookies</h2>
            <p>
              We do not use third-party advertising or tracking cookies. Our
              infrastructure providers (Vercel, Neon, AWS) may set essential
              cookies for load balancing and CDN functionality.
            </p>

            <h2>4. Managing Cookies</h2>
            <p>
              Most browsers allow you to control cookies through settings.
              However, disabling essential cookies will prevent Xenboox from
              functioning properly — authentication, session management, and
              security features all require cookies.
            </p>

            <h2>5. Changes to This Policy</h2>
            <p>
              We may update this policy as our platform evolves. Material
              changes will be communicated via email or platform notification.
            </p>

            <h2>6. Contact</h2>
            <p>
              For questions about our cookie usage, please contact{" "}
              <a href="mailto:privacy@xenboox.com">privacy@xenboox.com</a>.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
