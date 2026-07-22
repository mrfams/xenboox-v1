import { FileText, ChevronRight } from "lucide-react";
import Link from "next/link";

const sections = [
  { id: "acceptance", title: "Acceptance of Terms" },
  { id: "description", title: "Description of Service" },
  { id: "account-registration", title: "Account Registration" },
  { id: "acceptable-use", title: "Acceptable Use" },
  { id: "financial-data", title: "Financial Data Responsibility" },
  { id: "ai-disclaimers", title: "AI Agent Disclaimers" },
  { id: "pricing", title: "Pricing and Payment" },
  { id: "intellectual-property", title: "Intellectual Property" },
  { id: "liability", title: "Limitation of Liability" },
  { id: "termination", title: "Termination" },
  { id: "changes", title: "Changes to Terms" },
  { id: "governing-law", title: "Governing Law" },
  { id: "contact", title: "Contact" },
];

export default function TermsPage() {
  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950">
        <div className="absolute inset-0 bg-grid-dark opacity-30" />
        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-14 md:py-20">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm px-4 py-1.5 text-xs font-medium text-white/60">
              <FileText className="h-3 w-3 text-blue-400" />
              Legal
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white">
              Terms of Service
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
            <div className="rounded-2xl border bg-gradient-to-br from-blue-50 to-white p-6 mb-6">
              <p className="text-sm">
                <strong className="text-foreground">
                  Please read these terms carefully.
                </strong>{" "}
                By using Xenboox, you agree to be bound by these Terms of
                Service. If you are using the Service on behalf of an
                organization, you represent that you have the authority to bind
                that organization.
              </p>
            </div>

            <section id="acceptance">
              <h2>1. Acceptance of Terms</h2>
              <p>
                By accessing or using Xenboox (the &quot;Service&quot;), you
                agree to be bound by these Terms of Service (&quot;Terms&quot;).
                If you do not agree to these Terms, do not use the Service.
                These Terms apply to all users, including free and paid
                accounts.
              </p>
            </section>

            <section id="description">
              <h2>2. Description of Service</h2>
              <p>
                Xenboox is an AI-native accounting platform that provides
                double-entry bookkeeping, accounts payable and receivable,
                payroll processing, treasury management, financial reporting,
                and AI-powered accounting assistance. The Service is available
                via web, mobile, and desktop applications.
              </p>
            </section>

            <section id="account-registration">
              <h2>3. Account Registration</h2>
              <p>
                You must provide accurate, complete information when creating an
                account. You are responsible for:
              </p>
              <ul>
                <li>Maintaining the confidentiality of your credentials</li>
                <li>All activities that occur under your account</li>
                <li>Notifying us immediately of any unauthorized access</li>
                <li>
                  Ensuring your account information is current and accurate
                </li>
              </ul>
            </section>

            <section id="acceptable-use">
              <h2>4. Acceptable Use</h2>
              <p>You agree not to:</p>
              <ul>
                <li>Use the Service for any unlawful purpose</li>
                <li>
                  Attempt to gain unauthorized access to any part of the Service
                </li>
                <li>Interfere with or disrupt the Service or servers</li>
                <li>Use the Service to transmit malware or malicious code</li>
                <li>
                  Reverse engineer, decompile, or disassemble any part of the
                  Service
                </li>
                <li>Use AI agents to generate fraudulent financial records</li>
              </ul>
            </section>

            <section id="financial-data">
              <h2>5. Financial Data Responsibility</h2>
              <p>
                You are solely responsible for the accuracy of financial data
                you enter into Xenboox. While our AI agents assist with data
                entry and validation, they do not replace professional
                accounting judgment. Xenboox is not a substitute for
                professional financial advice. You should consult with qualified
                accountants for financial decisions.
              </p>
            </section>

            <section id="ai-disclaimers">
              <h2>6. AI Agent Disclaimers</h2>
              <p>
                Our AI agents provide automated assistance but are not
                infallible. All AI-generated suggestions are flagged with
                confidence scores. Low-confidence suggestions require human
                review. You are responsible for reviewing and approving AI agent
                actions before they affect your financial records. Xenboox is
                not liable for errors in AI-generated content that you fail to
                review.
              </p>
            </section>

            <section id="pricing">
              <h2>7. Pricing and Payment</h2>
              <p>
                Free tier accounts are subject to usage limitations as described
                on our pricing page. Paid plans are billed in advance on a
                monthly or annual basis. All fees are non-refundable except as
                required by law. We reserve the right to change pricing with 30
                days&apos; notice.
              </p>
            </section>

            <section id="intellectual-property">
              <h2>8. Intellectual Property</h2>
              <p>
                The Service, including all software, AI models, prompts, and
                documentation, is owned by Xenboox and protected by intellectual
                property laws. You retain ownership of all data you enter into
                the Service. You grant us a limited license to process your data
                solely for the purpose of providing the Service.
              </p>
            </section>

            <section id="liability">
              <h2>9. Limitation of Liability</h2>
              <p>
                To the maximum extent permitted by law, Xenboox shall not be
                liable for any indirect, incidental, special, consequential, or
                punitive damages, including loss of profits, data, or business
                opportunities. Our total liability shall not exceed the amount
                paid by you in the 12 months preceding the claim.
              </p>
            </section>

            <section id="termination">
              <h2>10. Termination</h2>
              <p>
                You may terminate your account at any time through the settings
                page. We may suspend or terminate your access for violation of
                these Terms, with or without notice. Upon termination, your
                right to use the Service ceases immediately. Data export is
                available for 30 days after termination.
              </p>
            </section>

            <section id="changes">
              <h2>11. Changes to Terms</h2>
              <p>
                We reserve the right to modify these Terms at any time. Material
                changes will be communicated via email or in-app notification at
                least 30 days before taking effect. Continued use of the Service
                after changes take effect constitutes acceptance of the updated
                Terms.
              </p>
            </section>

            <section id="governing-law">
              <h2>12. Governing Law</h2>
              <p>
                These Terms are governed by the laws of The Gambia. Any disputes
                shall be resolved in the courts of Banjul, The Gambia.
              </p>
            </section>

            <section id="contact">
              <h2>13. Contact</h2>
              <p>
                Questions about these Terms? Contact us at{" "}
                <span className="text-foreground font-medium">
                  legal@xenboox.com
                </span>
                .
              </p>
            </section>

            <div className="mt-12 pt-8 border-t">
              <Link
                href="/privacy"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Read our Privacy Policy →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
