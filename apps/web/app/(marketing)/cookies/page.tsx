export default function CookiePolicyPage() {
  return (
    <>
      <section className="border-b py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-bold tracking-tight">
              Cookie Policy
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
            <h2 className="mb-3 text-lg font-semibold text-foreground">1. What Are Cookies</h2>
            <p>
              Cookies are small text files stored on your device when you visit a website. They help us provide a better experience by remembering your preferences and understanding how you use our platform.
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold text-foreground">2. How We Use Cookies</h2>
            <p>Xenboox uses cookies for the following purposes:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong className="text-foreground">Essential cookies:</strong> Required for the platform to function. These handle authentication, security, and session management. They cannot be disabled.</li>
              <li><strong className="text-foreground">Functional cookies:</strong> Remember your preferences such as language, timezone, and display settings to provide a personalized experience.</li>
              <li><strong className="text-foreground">Analytics cookies:</strong> Help us understand how users interact with the platform, which features are most used, and where we can improve. All analytics data is aggregated and anonymized.</li>
            </ul>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold text-foreground">3. Specific Cookies We Use</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm mt-2">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-semibold text-foreground">Cookie</th>
                    <th className="pb-2 font-semibold text-foreground">Purpose</th>
                    <th className="pb-2 font-semibold text-foreground">Duration</th>
                  </tr>
                </thead>
                <tbody className="space-y-2">
                  <tr className="border-b">
                    <td className="py-2">next-auth.session-token</td>
                    <td className="py-2">Authentication session</td>
                    <td className="py-2">30 days</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2">next-auth.csrf-token</td>
                    <td className="py-2">CSRF protection</td>
                    <td className="py-2">Session</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2">theme</td>
                    <td className="py-2">UI theme preference</td>
                    <td className="py-2">1 year</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2">locale</td>
                    <td className="py-2">Language preference</td>
                    <td className="py-2">1 year</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold text-foreground">4. Third-Party Cookies</h2>
            <p>
              We use a limited number of third-party services that may set cookies:
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong className="text-foreground">Vercel Analytics:</strong> Privacy-first analytics to understand page views and performance. Does not track individual users.</li>
              <li><strong className="text-foreground">Google OAuth:</strong> If you sign in with Google, Google may set cookies during the authentication flow.</li>
            </ul>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold text-foreground">5. Managing Cookies</h2>
            <p>
              You can control cookies through your browser settings. Most browsers allow you to:
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>View and delete cookies</li>
              <li>Block third-party cookies</li>
              <li>Block all cookies (note: this may break platform functionality)</li>
              <li>Set preferences per website</li>
            </ul>
            <p className="mt-2">
              Disabling essential cookies will prevent you from logging in and using the platform.
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold text-foreground">6. Changes to This Policy</h2>
            <p>
              We may update this Cookie Policy from time to time. Changes will be posted on this page with an updated revision date.
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold text-foreground">7. Contact Us</h2>
            <p>
              Questions about our use of cookies? Contact us at{" "}
              <span className="text-foreground">privacy@xenboox.com</span>.
            </p>
          </div>
        </div>
      </section>
    </>
  )
}
