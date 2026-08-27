import type { Metadata } from "next";

import { LegalHero, LegalContent } from "@/components/marketing/legal-hero";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Xenboox collects, uses, and protects your personal data. We believe in transparency and giving you control over your information.",
};

const tableOfContents = [
  { id: "introduction", label: "Introduction" },
  { id: "information-we-collect", label: "Information We Collect" },
  { id: "how-we-use", label: "How We Use Your Information" },
  { id: "data-sharing", label: "Data Sharing & Disclosure" },
  { id: "data-security", label: "Data Security" },
  { id: "data-retention", label: "Data Retention" },
  { id: "your-rights", label: "Your Rights" },
  { id: "international-transfers", label: "International Transfers" },
  { id: "childrens-privacy", label: "Children's Privacy" },
  { id: "changes", label: "Changes to This Policy" },
  { id: "contact", label: "Contact Us" },
];

export default function PrivacyPage() {
  return (
    <>
      <LegalHero
        title="Privacy Policy"
        description="How Xenboox collects, uses, and protects your personal data. We believe in transparency and giving you control over your information."
        lastUpdated="July 1, 2026"
        effectiveDate="July 1, 2026"
        version="2.0"
      />

      <LegalContent tableOfContents={tableOfContents}>
        {/* Introduction */}
        <section id="introduction" className="mb-12">
          <h2 className="text-2xl font-bold text-foreground mb-4">
            1. Introduction
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Xenboox Limited (&quot;Xenboox,&quot; &quot;we,&quot;
            &quot;us,&quot; &quot;our&quot;) is committed to protecting your
            privacy. This Privacy Policy explains how we collect, use, disclose,
            and safeguard your information when you use our AI-native accounting
            platform.
          </p>
          <p className="text-muted-foreground leading-relaxed mb-4">
            We believe in radical transparency. This policy is written in plain
            language so you can understand exactly what we do with your data. If
            you have questions, our legal team is always available to help.
          </p>
          <div className="rounded-xl bg-primary/5 border border-primary/10 p-4">
            <p className="text-sm text-blue-800">
              <strong>Key Principle:</strong> We never sell your personal or
              financial data. Your data is used solely to provide and improve
              the services you&apos;ve signed up for.
            </p>
          </div>
        </section>

        {/* Information We Collect */}
        <section id="information-we-collect" className="mb-12">
          <h2 className="text-2xl font-bold text-foreground mb-4">
            2. Information We Collect
          </h2>

          <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">
            2.1 Information You Provide
          </h3>
          <div className="rounded-xl border border-border divide-y divide-slate-100">
            <div className="p-4">
              <h4 className="font-medium text-foreground mb-1">
                Account Information
              </h4>
              <p className="text-sm text-muted-foreground">
                Name, email address, phone number, company details, and billing
                information when you create an account.
              </p>
            </div>
            <div className="p-4">
              <h4 className="font-medium text-foreground mb-1">
                Financial Data
              </h4>
              <p className="text-sm text-muted-foreground">
                Transaction records, bank statements, invoices, receipts, and
                other financial documents you upload or connect via bank feeds.
              </p>
            </div>
            <div className="p-4">
              <h4 className="font-medium text-foreground mb-1">
                Profile Information
              </h4>
              <p className="text-sm text-muted-foreground">
                Job title, role, entity associations, and preferences you set in
                your account.
              </p>
            </div>
            <div className="p-4">
              <h4 className="font-medium text-foreground mb-1">
                Communications
              </h4>
              <p className="text-sm text-muted-foreground">
                Messages you send to our support team, feedback you provide, or
                communications through the platform.
              </p>
            </div>
          </div>

          <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">
            2.2 Information Collected Automatically
          </h3>
          <div className="rounded-xl border border-border divide-y divide-slate-100">
            <div className="p-4">
              <h4 className="font-medium text-foreground mb-1">Usage Data</h4>
              <p className="text-sm text-muted-foreground">
                Pages visited, features used, session duration, and navigation
                patterns to help us improve the platform.
              </p>
            </div>
            <div className="p-4">
              <h4 className="font-medium text-foreground mb-1">Device Data</h4>
              <p className="text-sm text-muted-foreground">
                IP address, browser type, operating system, and device
                identifiers for security and performance monitoring.
              </p>
            </div>
            <div className="p-4">
              <h4 className="font-medium text-foreground mb-1">Cookies</h4>
              <p className="text-sm text-muted-foreground">
                We use essential cookies for authentication and session
                management. See our{" "}
                <a href="/cookies" className="text-primary hover:underline">
                  Cookie Policy
                </a>{" "}
                for details.
              </p>
            </div>
          </div>
        </section>

        {/* How We Use */}
        <section id="how-we-use" className="mb-12">
          <h2 className="text-2xl font-bold text-foreground mb-4">
            3. How We Use Your Information
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            We use the information we collect for the following purposes:
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              {
                title: "Provide Services",
                desc: "Process transactions, generate reports, and deliver the features you use.",
              },
              {
                title: "Improve Platform",
                desc: "Analyze usage patterns to enhance features and user experience.",
              },
              {
                title: "AI Training",
                desc: "Improve our AI models using anonymized, aggregated data only.",
              },
              {
                title: "Communications",
                desc: "Send account updates, security alerts, and support responses.",
              },
              {
                title: "Security",
                desc: "Detect fraud, prevent abuse, and protect your account.",
              },
              {
                title: "Legal Compliance",
                desc: "Meet regulatory obligations and respond to legal requests.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-border p-4"
              >
                <h4 className="font-medium text-foreground mb-1">
                  {item.title}
                </h4>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Data Sharing */}
        <section id="data-sharing" className="mb-12">
          <h2 className="text-2xl font-bold text-foreground mb-4">
            4. Data Sharing &amp; Disclosure
          </h2>
          <div className="rounded-xl bg-amber-50 border border-amber-100 p-4 mb-6">
            <p className="text-sm text-amber-800">
              <strong>Important:</strong> We never sell your personal or
              financial data to third parties.
            </p>
          </div>
          <p className="text-muted-foreground leading-relaxed mb-4">
            We may share your data only in the following limited circumstances:
          </p>
          <div className="space-y-4">
            <div className="rounded-xl border border-border p-4">
              <h4 className="font-medium text-foreground mb-2">
                Service Providers
              </h4>
              <p className="text-sm text-muted-foreground">
                Cloud infrastructure (Vercel, Neon), email delivery (Resend),
                and monitoring (LangFuse) — all bound by strict data processing
                agreements.
              </p>
            </div>
            <div className="rounded-xl border border-border p-4">
              <h4 className="font-medium text-foreground mb-2">
                Regulatory Authorities
              </h4>
              <p className="text-sm text-muted-foreground">
                When required by applicable law, valid legal process, or to
                protect the rights and safety of Xenboox and our users.
              </p>
            </div>
            <div className="rounded-xl border border-border p-4">
              <h4 className="font-medium text-foreground mb-2">
                With Your Consent
              </h4>
              <p className="text-sm text-muted-foreground">
                When you explicitly authorize sharing, such as connecting a bank
                feed or integrating with a third-party service.
              </p>
            </div>
            <div className="rounded-xl border border-border p-4">
              <h4 className="font-medium text-foreground mb-2">
                Business Transfers
              </h4>
              <p className="text-sm text-muted-foreground">
                In connection with a merger, acquisition, or sale of assets
                (you&apos;ll be notified before your data becomes subject to a
                different privacy policy).
              </p>
            </div>
          </div>
        </section>

        {/* Data Security */}
        <section id="data-security" className="mb-12">
          <h2 className="text-2xl font-bold text-foreground mb-4">
            5. Data Security
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            We implement industry-standard security measures to protect your
            data:
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                title: "Encryption at Rest",
                desc: "AES-256 encryption for all stored data",
              },
              {
                title: "Encryption in Transit",
                desc: "TLS 1.3 for all communications",
              },
              {
                title: "Access Control",
                desc: "Role-based access with entity isolation",
              },
              {
                title: "Audit Trails",
                desc: "Complete logging of all data access",
              },
              {
                title: "Infrastructure",
                desc: "SOC 2 compliant hosting",
              },
              {
                title: "Monitoring",
                desc: "24/7 security monitoring and alerting",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="flex items-start gap-3 rounded-xl border border-border p-4"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-green-600 text-xs shrink-0 mt-0.5">
                  ✓
                </span>
                <div>
                  <h4 className="font-medium text-foreground">{item.title}</h4>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Data Retention */}
        <section id="data-retention" className="mb-12">
          <h2 className="text-2xl font-bold text-foreground mb-4">
            6. Data Retention
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            We retain your data for as long as your account is active or as
            needed to provide services. Specific retention periods:
          </p>
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted border-b border-border">
                  <th className="text-left px-4 py-3 font-medium text-foreground">
                    Data Type
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-foreground">
                    Retention Period
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="px-4 py-3 text-muted-foreground">
                    Active account data
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    Duration of account + 90 days
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-muted-foreground">
                    Financial records
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    7 years (regulatory requirement)
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-muted-foreground">
                    Usage analytics
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    24 months (anonymized after 12 months)
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-muted-foreground">
                    Support communications
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">3 years</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Your Rights */}
        <section id="your-rights" className="mb-12">
          <h2 className="text-2xl font-bold text-foreground mb-4">
            7. Your Rights
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Depending on your jurisdiction, you have the following rights
            regarding your personal data:
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              {
                right: "Access",
                desc: "Request a copy of the personal data we hold about you",
              },
              {
                right: "Correction",
                desc: "Request correction of inaccurate or incomplete data",
              },
              {
                right: "Deletion",
                desc: "Request deletion of your data (subject to legal obligations)",
              },
              {
                right: "Restriction",
                desc: "Request restriction of processing in certain circumstances",
              },
              {
                right: "Portability",
                desc: "Receive your data in a structured, machine-readable format",
              },
              {
                right: "Objection",
                desc: "Object to processing based on legitimate interests",
              },
            ].map((item) => (
              <div
                key={item.right}
                className="flex items-start gap-3 rounded-xl border border-border p-4"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0 mt-0.5">
                  {item.right.charAt(0)}
                </span>
                <div>
                  <h4 className="font-medium text-foreground">{item.right}</h4>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-muted-foreground leading-relaxed mt-4">
            To exercise any of these rights, contact our Data Protection Officer
            at{" "}
            <a
              href="mailto:privacy@xenboox.com"
              className="text-primary hover:underline"
            >
              privacy@xenboox.com
            </a>
            . We will respond to your request within 30 days.
          </p>
        </section>

        {/* International Transfers */}
        <section id="international-transfers" className="mb-12">
          <h2 className="text-2xl font-bold text-foreground mb-4">
            8. International Transfers
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Your data may be processed in countries where our infrastructure
            providers operate (primarily the United States and European Union).
            We ensure appropriate safeguards are in place through standard
            contractual clauses and data processing agreements with all service
            providers.
          </p>
        </section>

        {/* Children's Privacy */}
        <section id="childrens-privacy" className="mb-12">
          <h2 className="text-2xl font-bold text-foreground mb-4">
            9. Children&apos;s Privacy
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Xenboox is not intended for use by individuals under the age of 18.
            We do not knowingly collect personal data from children. If we
            become aware that we have collected data from a child, we will
            delete it promptly.
          </p>
        </section>

        {/* Changes */}
        <section id="changes" className="mb-12">
          <h2 className="text-2xl font-bold text-foreground mb-4">
            10. Changes to This Policy
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            We may update this policy from time to time. Material changes will
            be notified via email or platform notice at least 30 days before
            they take effect. Continued use of the platform after changes
            constitutes acceptance of the updated policy.
          </p>
        </section>

        {/* Contact */}
        <section id="contact" className="mb-12">
          <h2 className="text-2xl font-bold text-foreground mb-4">
            11. Contact Us
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            For privacy-related inquiries, contact our Data Protection Officer:
          </p>
          <div className="rounded-xl bg-muted border border-border p-6">
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                <strong className="text-foreground">Email:</strong>{" "}
                <a
                  href="mailto:privacy@xenboox.com"
                  className="text-primary hover:underline"
                >
                  privacy@xenboox.com
                </a>
              </p>
              <p>
                <strong className="text-foreground">Mail:</strong>
              </p>
              <p className="pl-4">
                Xenboox Limited
                <br />
                Data Protection Officer
                <br />
                Banjul, The Gambia
              </p>
            </div>
          </div>
        </section>
      </LegalContent>
    </>
  );
}
