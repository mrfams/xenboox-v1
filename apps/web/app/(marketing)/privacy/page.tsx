import { FadeInUp } from "@/components/marketing/reveal";

export default function PrivacyPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-paper">
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden="true"
          style={{
            backgroundImage:
              "radial-gradient(rgba(20, 33, 61, 0.06) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
            maskImage:
              "radial-gradient(ellipse at center, black 30%, transparent 75%)",
            WebkitMaskImage:
              "radial-gradient(ellipse at center, black 30%, transparent 75%)",
          }}
        />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24">
          <FadeInUp>
            <div className="mx-auto max-w-3xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                Legal
              </span>
              <h1 className="mt-6 text-4xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-5xl">
                Privacy Policy
              </h1>
              <p className="mt-4 text-muted-foreground">
                Last updated: July 1, 2026 · How Xenboox collects, uses, and
                protects your personal data.
              </p>
            </div>
          </FadeInUp>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <FadeInUp delay={0.1}>
            <div className="prose prose-slate max-w-none">
              <h2>1. Introduction</h2>
              <p>
                Xenboox Limited (&quot;Xenboox,&quot; &quot;we,&quot;
                &quot;us,&quot; &quot;our&quot;) is committed to protecting your
                privacy. This Privacy Policy explains how we collect, use,
                disclose, and safeguard your information when you use our
                platform.
              </p>

              <h2>2. Information We Collect</h2>
              <h3>2.1 Information You Provide</h3>
              <ul>
                <li>
                  <strong>Account Information:</strong> Name, email address,
                  phone number, company details, and billing information when
                  you create an account.
                </li>
                <li>
                  <strong>Financial Data:</strong> Transaction records, bank
                  statements, invoices, receipts, and other financial documents
                  you upload or connect.
                </li>
                <li>
                  <strong>Profile Information:</strong> Job title, role, entity
                  associations, and preferences.
                </li>
              </ul>

              <h3>2.2 Information Collected Automatically</h3>
              <ul>
                <li>
                  <strong>Usage Data:</strong> Pages visited, features used,
                  session duration, and navigation patterns.
                </li>
                <li>
                  <strong>Device Data:</strong> IP address, browser type,
                  operating system, and device identifiers.
                </li>
                <li>
                  <strong>Cookies:</strong> We use essential cookies for
                  authentication and session management. See our{" "}
                  <a href="/cookies">Cookie Policy</a>.
                </li>
              </ul>

              <h2>3. How We Use Your Information</h2>
              <ul>
                <li>To provide, maintain, and improve the Xenboox platform</li>
                <li>To process financial transactions and generate reports</li>
                <li>
                  To train and improve our AI agents (anonymized data only)
                </li>
                <li>
                  To communicate account updates, security alerts, and support
                </li>
                <li>To comply with legal and regulatory obligations</li>
              </ul>

              <h2>4. Data Sharing &amp; Disclosure</h2>
              <p>
                We never sell your personal or financial data. We may share data
                with:
              </p>
              <ul>
                <li>
                  <strong>Service Providers:</strong> Cloud infrastructure
                  (AWS), email delivery (Resend), and monitoring (LangFuse) —
                  all bound by data processing agreements.
                </li>
                <li>
                  <strong>Regulatory Authorities:</strong> When required by
                  applicable law or valid legal process.
                </li>
                <li>
                  <strong>With Your Consent:</strong> When you explicitly
                  authorize sharing (e.g., connecting a bank feed).
                </li>
              </ul>

              <h2>5. Data Security</h2>
              <p>
                We implement industry-standard security measures including
                encryption at rest (AES-256), encryption in transit (TLS 1.3),
                role-based access control, and full audit trails. Our
                infrastructure is SOC 2 compliant.
              </p>

              <h2>6. Data Retention</h2>
              <p>
                We retain your data for as long as your account is active or as
                needed to provide services. Upon account termination, we delete
                or anonymize your data within 90 days, except where legal
                retention requirements apply.
              </p>

              <h2>7. Your Rights</h2>
              <p>Depending on your jurisdiction, you may have the right to:</p>
              <ul>
                <li>Access the personal data we hold about you</li>
                <li>Correct inaccurate or incomplete data</li>
                <li>Delete your data (subject to legal obligations)</li>
                <li>Restrict or object to processing</li>
                <li>Data portability</li>
                <li>Withdraw consent at any time</li>
              </ul>

              <h2>8. International Transfers</h2>
              <p>
                Your data may be processed in countries where our infrastructure
                providers operate. We ensure appropriate safeguards are in place
                through standard contractual clauses and data processing
                agreements.
              </p>

              <h2>9. Changes to This Policy</h2>
              <p>
                We may update this policy from time to time. Material changes
                will be notified via email or platform notice. Continued use
                after changes constitutes acceptance.
              </p>

              <h2>10. Contact</h2>
              <p>
                For privacy-related inquiries, contact our Data Protection
                Officer at{" "}
                <a href="mailto:privacy@xenboox.com">privacy@xenboox.com</a> or
                write to:
              </p>
              <p className="text-sm text-muted-foreground">
                Xenboox Limited
                <br />
                Data Protection Officer
                <br />
                Banjul, The Gambia
              </p>
            </div>
          </FadeInUp>
        </div>
      </section>
    </>
  );
}
