import { Shield, ChevronRight } from "lucide-react";
import Link from "next/link";

const sections = [
  { id: "introduction", title: "Introduction" },
  { id: "information-we-collect", title: "Information We Collect" },
  { id: "how-we-use", title: "How We Use Your Information" },
  { id: "ai-processing", title: "AI Agent Processing" },
  { id: "data-security", title: "Data Security" },
  { id: "data-sharing", title: "Data Sharing" },
  { id: "data-retention", title: "Data Retention" },
  { id: "your-rights", title: "Your Rights" },
  { id: "international-transfers", title: "International Transfers" },
  { id: "changes", title: "Changes to This Policy" },
  { id: "contact", title: "Contact Us" },
];

export default function PrivacyPage() {
  return (
    <>
      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950">
        <div className="absolute inset-0 bg-grid-dark opacity-30" />
        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-14 md:py-20">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm px-4 py-1.5 text-xs font-medium text-white/60">
              <Shield className="h-3 w-3 text-blue-400" />
              Legal
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white">
              Privacy Policy
            </h1>
            <p className="mt-3 text-white/50 max-w-xl">
              Last updated: July 2026
            </p>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </section>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10 md:py-12">
        <div className="flex gap-8 lg:gap-10">
          {/* ── Sidebar Navigation ── */}
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

          {/* ── Content ── */}
          <div className="flex-1 min-w-0 prose-policy text-sm leading-relaxed text-muted-foreground max-w-3xl">
            <div className="rounded-2xl border bg-gradient-to-br from-blue-50 to-white p-6 mb-6">
              <p className="text-sm">
                <strong className="text-foreground">
                  Your privacy matters to us.
                </strong>{" "}
                This policy explains how Xenboox collects, uses, and safeguards
                your information when you use our platform.
              </p>
            </div>

            <section id="introduction">
              <h2>1. Introduction</h2>
              <p>
                Xenboox (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is
                committed to protecting your privacy. This Privacy Policy
                explains how we collect, use, disclose, and safeguard your
                information when you use our accounting platform, including our
                web application, mobile application, desktop application, and
                related services (collectively, the &quot;Service&quot;).
              </p>
            </section>

            <section id="information-we-collect">
              <h2>2. Information We Collect</h2>
              <div className="space-y-4">
                <div>
                  <strong className="text-foreground">
                    Account Information.
                  </strong>
                  <p>
                    When you register, we collect your name, email address, and
                    organization details. This information is necessary to
                    create and maintain your account.
                  </p>
                </div>
                <div>
                  <strong className="text-foreground">Financial Data.</strong>
                  <p>
                    We store accounting data you enter or generate through the
                    Service, including journal entries, invoices, transactions,
                    and reports. This data is isolated per entity, encrypted at
                    rest, and never used to train third-party AI models.
                  </p>
                </div>
                <div>
                  <strong className="text-foreground">Usage Data.</strong>
                  <p>
                    We collect information about how you interact with the
                    Service, including pages visited, features used, and AI
                    agent interactions. This helps us improve the platform and
                    prioritize development.
                  </p>
                </div>
                <div>
                  <strong className="text-foreground">
                    Device Information.
                  </strong>
                  <p>
                    We may collect device type, operating system, and browser
                    information for security and optimization purposes.
                  </p>
                </div>
              </div>
            </section>

            <section id="how-we-use">
              <h2>3. How We Use Your Information</h2>
              <ul>
                <li>To provide, maintain, and improve the Service</li>
                <li>To process transactions and generate financial reports</li>
                <li>
                  To power AI agent features that assist with your accounting
                </li>
                <li>
                  To send service-related communications (e.g., security alerts,
                  support)
                </li>
                <li>
                  To detect and prevent fraud, abuse, and security incidents
                </li>
                <li>To comply with legal obligations</li>
              </ul>
            </section>

            <section id="ai-processing">
              <h2>4. AI Agent Processing</h2>
              <p>
                Our AI agents process your financial data to provide automated
                accounting assistance. This processing occurs within our secure
                infrastructure. We do not use your data to train third-party AI
                models. AI agent decisions are logged with confidence scores and
                are subject to human review when confidence falls below
                established thresholds.
              </p>
              <p>
                You can review all AI agent actions in the audit trail. Any
                action below a 0.9 confidence threshold is flagged for human
                review before affecting your financial records.
              </p>
            </section>

            <section id="data-security">
              <h2>5. Data Security</h2>
              <p>
                We implement industry-standard security measures to protect your
                data:
              </p>
              <ul>
                <li>
                  <strong className="text-foreground">
                    PostgreSQL Row-Level Security
                  </strong>{" "}
                  ensures complete data isolation between entities
                </li>
                <li>
                  <strong className="text-foreground">
                    AES-256 encryption
                  </strong>{" "}
                  for sensitive fields at rest with key rotation
                </li>
                <li>
                  <strong className="text-foreground">
                    TLS 1.3 encryption
                  </strong>{" "}
                  for all data in transit
                </li>
                <li>
                  <strong className="text-foreground">Rate limiting</strong> and
                  DDoS protection
                </li>
                <li>
                  <strong className="text-foreground">
                    Comprehensive audit logging
                  </strong>{" "}
                  for all actions with actor, timestamp, and context
                </li>
              </ul>
            </section>

            <section id="data-sharing">
              <h2>6. Data Sharing</h2>
              <p>
                We do not sell your personal or financial information to third
                parties. We may share data with trusted service providers who
                assist in operating the Service (e.g., hosting, payment
                processing), subject to contractual obligations to protect your
                information. We may disclose information if required by law or
                to protect our rights.
              </p>
              <p>
                Our sub-processors include: Vercel (cloud hosting), Neon
                (database), Cloudflare (object storage), Upstash (caching),
                Resend (email), Anthropic (AI models). Each is contractually
                bound to appropriate data protection obligations.
              </p>
            </section>

            <section id="data-retention">
              <h2>7. Data Retention</h2>
              <p>
                We retain your data for as long as your account is active or as
                needed to provide the Service. Upon account cancellation, we
                retain your data for 30 days to allow for export, then
                permanently delete it. You may request immediate deletion by
                contacting us.
              </p>
              <p>
                Backup data is retained for a maximum of 90 days and is
                encrypted. After this period, backup copies are securely purged.
              </p>
            </section>

            <section id="your-rights">
              <h2>8. Your Rights</h2>
              <p>
                Under applicable data protection laws, you have the right to:
              </p>
              <ul>
                <li>
                  <strong className="text-foreground">Access</strong> your
                  personal data
                </li>
                <li>
                  <strong className="text-foreground">Correct</strong>{" "}
                  inaccurate data
                </li>
                <li>
                  <strong className="text-foreground">Request deletion</strong>{" "}
                  of your data
                </li>
                <li>
                  <strong className="text-foreground">Export</strong> your data
                  in standard formats (CSV, JSON, PDF)
                </li>
                <li>
                  <strong className="text-foreground">Object</strong> to
                  processing of your data
                </li>
                <li>
                  <strong className="text-foreground">Withdraw consent</strong>{" "}
                  where applicable
                </li>
                <li>
                  <strong className="text-foreground">Lodge a complaint</strong>{" "}
                  with your local data protection authority
                </li>
              </ul>
            </section>

            <section id="international-transfers">
              <h2>9. International Transfers</h2>
              <p>
                Your data may be processed in countries outside your country of
                residence. We ensure appropriate safeguards are in place for
                international transfers, including standard contractual clauses
                where required. Our primary infrastructure is located in the
                United States (US East), with additional regions planned.
              </p>
            </section>

            <section id="changes">
              <h2>10. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time to reflect
                changes in our practices, technology, or legal obligations. We
                will notify you of material changes by posting the updated
                policy on our website and, where appropriate, by email. The
                &quot;Last updated&quot; date at the top indicates when the
                policy was last revised.
              </p>
            </section>

            <section id="contact">
              <h2>11. Contact Us</h2>
              <p>
                If you have questions about this Privacy Policy or wish to
                exercise your data protection rights, please contact us:
              </p>
              <ul>
                <li>
                  Email:{" "}
                  <span className="text-foreground font-medium">
                    privacy@xenboox.com
                  </span>
                </li>
                <li>
                  Data Protection Officer:{" "}
                  <span className="text-foreground font-medium">
                    dpo@xenboox.com
                  </span>
                </li>
              </ul>
              <p className="mt-4">
                We aim to respond to all privacy-related inquiries within 30
                days.
              </p>
            </section>

            <div className="mt-12 pt-8 border-t">
              <Link
                href="/terms"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Read our Terms of Service →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
