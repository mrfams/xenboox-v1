export default function CookiePolicyPage() {
  return (
    <>
      <section className="border-b py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-bold tracking-tight">Cookie Policy</h1>
            <p className="mt-4 text-muted-foreground">
              Last updated: July 2026
            </p>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 text-sm leading-relaxed text-muted-foreground space-y-8">
          <div>
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              1. Introduction
            </h2>
            <p>
              Xenboox (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) uses
              cookies and similar tracking technologies on our website, web
              application, mobile application, and desktop application
              (collectively, the &quot;Service&quot;). This Cookie Policy
              explains what cookies are, how we use them, and your choices
              regarding their use.
            </p>
            <p className="mt-2">
              By continuing to use the Service, you consent to our use of
              cookies in accordance with this policy. For more information about
              how we handle your personal data, please see our{" "}
              <a
                href="/privacy"
                className="text-foreground underline underline-offset-2 hover:no-underline"
              >
                Privacy Policy
              </a>
              .
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              2. What Are Cookies
            </h2>
            <p>
              Cookies are small text files placed on your device (computer,
              tablet, or mobile) when you visit a website. They are widely used
              to make websites work efficiently, enhance user experience, and
              provide information to site owners. Cookies may be session-based
              (deleted when you close your browser) or persistent (remain on
              your device for a set period or until manually deleted).
            </p>
            <p className="mt-2">
              We also use similar technologies such as local storage, session
              storage, and service workers to provide offline functionality and
              improve application performance.
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              3. How We Use Cookies
            </h2>
            <p>
              We categorise cookies based on their function. Below is a
              description of each category and how we use them:
            </p>

            <div className="mt-3 space-y-4">
              <div>
                <h3 className="font-semibold text-foreground">
                  Strictly Necessary Cookies
                </h3>
                <p className="mt-1">
                  These cookies are essential for the Service to function
                  properly. They enable core functionality such as
                  authentication, session management, and security. The Service
                  cannot function without these cookies, and they cannot be
                  disabled in our system. They are typically set in response to
                  actions you take, such as logging in or filling in forms.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-foreground">
                  Functional Cookies
                </h3>
                <p className="mt-1">
                  These cookies enable the Service to remember your preferences,
                  such as language, timezone, theme, and display settings. They
                  provide a personalised experience tailored to your choices.
                  While not strictly necessary, disabling them may degrade your
                  experience.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-foreground">
                  Analytics Cookies
                </h3>
                <p className="mt-1">
                  These cookies help us understand how users interact with the
                  Service — which pages are visited most, which features are
                  used, and where users encounter errors. All analytics data is
                  aggregated and anonymised. We use this information to improve
                  the Service and prioritise development work.
                </p>
              </div>
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              4. Specific Cookies We Use
            </h2>
            <p>
              The following table lists the specific cookies and similar storage
              mechanisms used by the Service:
            </p>
            <div className="overflow-x-auto mt-3">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 pr-4 font-semibold text-foreground">
                      Cookie / Storage Key
                    </th>
                    <th className="pb-2 pr-4 font-semibold text-foreground">
                      Category
                    </th>
                    <th className="pb-2 pr-4 font-semibold text-foreground">
                      Purpose
                    </th>
                    <th className="pb-2 font-semibold text-foreground">
                      Duration
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2 pr-4 font-mono text-xs">
                      next-auth.session-token
                    </td>
                    <td className="py-2 pr-4">Strictly Necessary</td>
                    <td className="py-2 pr-4">
                      Authentication session token. Required to keep you logged
                      in across page loads.
                    </td>
                    <td className="py-2">30 days</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4 font-mono text-xs">
                      next-auth.csrf-token
                    </td>
                    <td className="py-2 pr-4">Strictly Necessary</td>
                    <td className="py-2 pr-4">
                      Cross-Site Request Forgery (CSRF) protection token.
                      Prevents unauthorised actions on your behalf.
                    </td>
                    <td className="py-2">Session</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4 font-mono text-xs">
                      next-auth.callback-url
                    </td>
                    <td className="py-2 pr-4">Strictly Necessary</td>
                    <td className="py-2 pr-4">
                      Redirect management during authentication flow. Ensures
                      you return to the correct page after login.
                    </td>
                    <td className="py-2">Session</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4 font-mono text-xs">theme</td>
                    <td className="py-2 pr-4">Functional</td>
                    <td className="py-2 pr-4">
                      Stores your UI theme preference (light, dark, or system).
                    </td>
                    <td className="py-2">1 year</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4 font-mono text-xs">locale</td>
                    <td className="py-2 pr-4">Functional</td>
                    <td className="py-2 pr-4">
                      Stores your language and regional formatting preferences.
                    </td>
                    <td className="py-2">1 year</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4 font-mono text-xs">
                      sidebar-state
                    </td>
                    <td className="py-2 pr-4">Functional</td>
                    <td className="py-2 pr-4">
                      Remembers whether the dashboard sidebar is collapsed or
                      expanded.
                    </td>
                    <td className="py-2">Session</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-mono text-xs">
                      _ga, _ga_&lt;id&gt;
                    </td>
                    <td className="py-2 pr-4">Analytics</td>
                    <td className="py-2 pr-4">
                      Google Analytics identifiers used to distinguish users and
                      track aggregated usage patterns. Set only when you consent
                      via our cookie banner.
                    </td>
                    <td className="py-2">2 years / 1 minute</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-3">
              This list may be updated as we add or remove features. We
              encourage you to review this policy periodically.
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              5. Third-Party Cookies
            </h2>
            <p>
              We use a limited number of trusted third-party services that may
              set their own cookies or similar technologies. These third parties
              have their own privacy and cookie policies governing the use of
              your data:
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>
                <strong className="text-foreground">Vercel Analytics:</strong>{" "}
                Privacy-first, privacy-preserving analytics platform. Collects
                only page-level metrics and performance data. Does not track
                individual users across sessions. See{" "}
                <a
                  href="https://vercel.com/legal/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground underline underline-offset-2 hover:no-underline"
                >
                  Vercel&apos;s Privacy Policy
                </a>
                .
              </li>
              <li>
                <strong className="text-foreground">
                  Google OAuth / Sign In with Google:
                </strong>{" "}
                If you choose to authenticate using Google, Google may set
                cookies during the authentication flow. See{" "}
                <a
                  href="https://policies.google.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground underline underline-offset-2 hover:no-underline"
                >
                  Google&apos;s Privacy Policy
                </a>
                .
              </li>
            </ul>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              6. Cookie Consent and Your Choices
            </h2>
            <p>
              When you first visit the Service, we display a cookie consent
              banner that allows you to accept or decline non-essential cookies.
              Strictly necessary cookies are always set, as they are required
              for the Service to function.
            </p>
            <p className="mt-2">
              You may withdraw or change your consent at any time by clearing
              your cookies and reloading the page. Beyond our consent banner,
              you have the following options:
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>
                <strong className="text-foreground">Browser settings:</strong>{" "}
                Most browsers allow you to view, block, or delete cookies.
                Please refer to your browser&apos;s help documentation for
                specific instructions:
                <ul className="list-circle pl-5 space-y-1 mt-1">
                  <li>
                    <a
                      href="https://support.google.com/chrome/answer/95647"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-foreground underline underline-offset-2 hover:no-underline"
                    >
                      Google Chrome
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://support.mozilla.org/en-US/kb/enable-and-disable-cookies-website-preferences"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-foreground underline underline-offset-2 hover:no-underline"
                    >
                      Mozilla Firefox
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://support.apple.com/guide/safari/manage-cookies-and-website-data-sfri11471/mac"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-foreground underline underline-offset-2 hover:no-underline"
                    >
                      Safari
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-foreground underline underline-offset-2 hover:no-underline"
                    >
                      Microsoft Edge
                    </a>
                  </li>
                </ul>
              </li>
              <li>
                <strong className="text-foreground">
                  Opt-out of analytics:
                </strong>{" "}
                You may opt out of Google Analytics by installing the{" "}
                <a
                  href="https://tools.google.com/dlpage/gaoptout"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground underline underline-offset-2 hover:no-underline"
                >
                  Google Analytics Opt-Out Browser Add-on
                </a>
                .
              </li>
              <li>
                <strong className="text-foreground">Do Not Track (DNT):</strong>{" "}
                The Service honours your browser&apos;s Do Not Track setting.
                When DNT is enabled, we will not set analytics or tracking
                cookies.
              </li>
            </ul>
            <p className="mt-2">
              Please note that blocking all cookies, especially strictly
              necessary ones, may prevent you from logging in or using core
              features of the Service.
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              7. Legal Basis (GDPR / CCPA)
            </h2>
            <p>
              If you are accessing the Service from the European Economic Area
              (EEA), the United Kingdom, or California, we process cookie data
              in accordance with applicable data protection laws:
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>
                <strong className="text-foreground">EEA / UK (GDPR):</strong>{" "}
                Strictly necessary cookies are set based on our legitimate
                interest in providing the Service. All other cookies are set
                only with your prior consent, which you may withdraw at any
                time.
              </li>
              <li>
                <strong className="text-foreground">California (CCPA):</strong>{" "}
                We do not sell your personal information. If you opt out of
                analytics cookies, we will not collect analytics data from your
                browser.
              </li>
            </ul>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              8. Changes to This Policy
            </h2>
            <p>
              We may update this Cookie Policy from time to time to reflect
              changes in technology, regulation, or our business practices. When
              we make material changes, we will notify you via email (if you
              have an account) or through an in-app notice. The revised policy
              will include an updated &quot;Last updated&quot; date. Continued
              use of the Service after changes take effect constitutes
              acceptance of the updated policy.
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              9. Contact Us
            </h2>
            <p>
              If you have any questions, concerns, or requests regarding this
              Cookie Policy or our use of cookies, please contact us:
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>
                Email:{" "}
                <span className="text-foreground">privacy@xenboox.com</span>
              </li>
              <li>
                Data Protection:{" "}
                <span className="text-foreground">dpo@xenboox.com</span>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
