import { LegalHero, LegalContent } from "@/components/marketing/legal-hero";

const tableOfContents = [
  { id: "acceptance", label: "Acceptance of Terms" },
  { id: "description", label: "Description of Service" },
  { id: "accounts", label: "User Accounts" },
  { id: "ai-limitations", label: "AI Agent Limitations" },
  { id: "fees", label: "Fees & Billing" },
  { id: "data-ownership", label: "Data Ownership" },
  { id: "acceptable-use", label: "Acceptable Use" },
  { id: "ip", label: "Intellectual Property" },
  { id: "warranty", label: "Warranty Disclaimer" },
  { id: "liability", label: "Limitation of Liability" },
  { id: "indemnification", label: "Indemnification" },
  { id: "termination", label: "Termination" },
  { id: "disputes", label: "Dispute Resolution" },
  { id: "governing-law", label: "Governing Law" },
  { id: "general", label: "General Provisions" },
  { id: "contact", label: "Contact Us" },
];

export default function TermsPage() {
  return (
    <>
      <LegalHero
        title="Terms of Service"
        description="The terms governing your use of the Xenboox platform. Please read carefully — by using our services, you agree to these terms."
        lastUpdated="July 1, 2026"
        effectiveDate="July 1, 2026"
        version="2.0"
      />

      <LegalContent tableOfContents={tableOfContents}>
        {/* Acceptance */}
        <section id="acceptance" className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            1. Acceptance of Terms
          </h2>
          <p className="text-slate-600 leading-relaxed mb-4">
            By accessing or using Xenboox (&quot;the Platform&quot;), you agree
            to be bound by these Terms of Service. If you do not agree, do not
            use the Platform.
          </p>
          <div className="rounded-xl bg-blue-50 border border-blue-100 p-4">
            <p className="text-sm text-blue-800">
              <strong>For Organizations:</strong> If you are using the Platform
              on behalf of an organization, you represent that you have
              authority to bind that organization to these terms.
            </p>
          </div>
        </section>

        {/* Description */}
        <section id="description" className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            2. Description of Service
          </h2>
          <p className="text-slate-600 leading-relaxed mb-4">
            Xenboox provides an AI-native accounting platform including
            automated bookkeeping, financial reporting, payroll, tax compliance,
            and related services. The Platform uses artificial intelligence
            agents to assist with accounting tasks.
          </p>
          <p className="text-slate-600 leading-relaxed">
            <strong>Important:</strong> All final financial decisions remain the
            responsibility of the user and their qualified accountant. Our AI
            agents provide recommendations and automate routine tasks — they do
            not replace professional accounting judgment.
          </p>
        </section>

        {/* Accounts */}
        <section id="accounts" className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            3. User Accounts
          </h2>

          <h3 className="text-lg font-semibold text-slate-900 mt-6 mb-3">
            3.1 Account Registration
          </h3>
          <p className="text-slate-600 leading-relaxed mb-4">
            You must provide accurate, current, and complete information during
            registration. You are responsible for maintaining the
            confidentiality of your login credentials and for all activities
            under your account.
          </p>

          <h3 className="text-lg font-semibold text-slate-900 mt-6 mb-3">
            3.2 Account Security
          </h3>
          <ul className="space-y-2 text-slate-600">
            <li className="flex items-start gap-2">
              <span className="text-slate-400 mt-1">•</span>
              You must notify us immediately of any unauthorized access
            </li>
            <li className="flex items-start gap-2">
              <span className="text-slate-400 mt-1">•</span>
              You must not share your credentials with others
            </li>
            <li className="flex items-start gap-2">
              <span className="text-slate-400 mt-1">•</span>
              You are responsible for enabling multi-factor authentication
            </li>
          </ul>

          <h3 className="text-lg font-semibold text-slate-900 mt-6 mb-3">
            3.3 Account Termination
          </h3>
          <p className="text-slate-600 leading-relaxed">
            We may suspend or terminate your account if you violate these terms,
            engage in fraudulent activity, or fail to pay applicable fees. You
            may also terminate your account at any time through your account
            settings.
          </p>
        </section>

        {/* AI Limitations */}
        <section id="ai-limitations" className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            4. AI Agent Limitations
          </h2>
          <div className="rounded-xl bg-amber-50 border border-amber-100 p-4 mb-4">
            <p className="text-sm text-amber-800">
              <strong>Important Disclaimer:</strong> Our AI agents are tools to
              assist with accounting tasks. They are not a substitute for
              professional accounting advice, and their outputs should be
              reviewed by qualified professionals.
            </p>
          </div>
          <div className="space-y-3">
            {[
              "AI agents provide recommendations and automate routine tasks — they do not replace professional accounting judgment",
              "Confidence scores indicate agent certainty but do not guarantee accuracy",
              "Transactions above configured thresholds always require human approval",
              "You retain full responsibility for the accuracy and completeness of your financial records",
              "We do not guarantee that AI outputs will be error-free",
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-xl border border-slate-200 p-4"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-amber-700 text-xs font-bold shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <p className="text-sm text-slate-600">{item}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Fees */}
        <section id="fees" className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            5. Fees &amp; Billing
          </h2>
          <p className="text-slate-600 leading-relaxed mb-4">
            Fees are as described on our{" "}
            <a href="/pricing" className="text-blue-600 hover:underline">
              Pricing page
            </a>
            . All fees are billed in advance and are non-refundable except as
            specified in our{" "}
            <a href="/refund" className="text-blue-600 hover:underline">
              Refund Policy
            </a>
            .
          </p>
          <div className="rounded-xl border border-slate-200 p-4">
            <h4 className="font-medium text-slate-900 mb-2">Fee Changes</h4>
            <p className="text-sm text-slate-600">
              We may change fees with 30 days&apos; notice. If you do not agree
              to the new fees, you may cancel your subscription before they take
              effect.
            </p>
          </div>
        </section>

        {/* Data Ownership */}
        <section id="data-ownership" className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            6. Data Ownership
          </h2>
          <p className="text-slate-600 leading-relaxed mb-4">
            You retain full ownership of all financial data, documents, and
            information you upload to the Platform. We use your data only to
            provide the Service.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 p-4">
              <h4 className="font-medium text-slate-900 mb-1">Your Data</h4>
              <p className="text-sm text-slate-600">
                Financial records, documents, and uploaded content remain yours.
                We will never use your proprietary data for other purposes.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 p-4">
              <h4 className="font-medium text-slate-900 mb-1">
                Anonymized Data
              </h4>
              <p className="text-sm text-slate-600">
                We may use anonymized, aggregated data to improve our AI models
                and platform performance. This data cannot identify you.
              </p>
            </div>
          </div>
        </section>

        {/* Acceptable Use */}
        <section id="acceptable-use" className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            7. Acceptable Use
          </h2>
          <p className="text-slate-600 leading-relaxed mb-4">
            You agree not to:
          </p>
          <div className="rounded-xl border border-slate-200 divide-y divide-slate-100">
            {[
              "Use the Platform for any unlawful purpose",
              "Attempt to bypass entity isolation or access another entity's data",
              "Upload malicious code or attempt to compromise platform security",
              "Use automated tools to scrape or extract data beyond API rate limits",
              "Misrepresent AI agent outputs as human professional advice",
              "Resell or redistribute the Platform without authorization",
              "Interfere with or disrupt the Platform's infrastructure",
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-4">
                <span className="text-red-500 mt-0.5">✕</span>
                <p className="text-sm text-slate-600">{item}</p>
              </div>
            ))}
          </div>
        </section>

        {/* IP */}
        <section id="ip" className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            8. Intellectual Property
          </h2>
          <p className="text-slate-600 leading-relaxed">
            The Platform, including its software, design, branding, and
            documentation, is owned by Xenboox and protected by intellectual
            property laws. You are granted a limited, non-exclusive,
            non-transferable license to use the Platform in accordance with
            these terms.
          </p>
        </section>

        {/* Warranty */}
        <section id="warranty" className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            9. Warranty Disclaimer
          </h2>
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
            <p className="text-sm text-slate-600">
              THE PLATFORM IS PROVIDED &quot;AS IS&quot; AND &quot;AS
              AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS OR
              IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF
              MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND
              NON-INFRINGEMENT.
            </p>
          </div>
        </section>

        {/* Liability */}
        <section id="liability" className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            10. Limitation of Liability
          </h2>
          <p className="text-slate-600 leading-relaxed">
            To the maximum extent permitted by law, Xenboox shall not be liable
            for indirect, incidental, special, or consequential damages arising
            from your use of the Platform. Our total liability is limited to the
            fees you paid in the 12 months preceding the claim.
          </p>
        </section>

        {/* Indemnification */}
        <section id="indemnification" className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            11. Indemnification
          </h2>
          <p className="text-slate-600 leading-relaxed">
            You agree to indemnify and hold harmless Xenboox and its officers,
            directors, employees, and agents from any claims, losses, or damages
            arising from your use of the Platform or violation of these terms.
          </p>
        </section>

        {/* Termination */}
        <section id="termination" className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            12. Termination
          </h2>
          <p className="text-slate-600 leading-relaxed mb-4">
            Either party may terminate this agreement at any time. Upon
            termination:
          </p>
          <div className="space-y-2 text-slate-600">
            <div className="flex items-start gap-2">
              <span className="text-slate-400 mt-1">•</span>
              Your access to the Platform will cease
            </div>
            <div className="flex items-start gap-2">
              <span className="text-slate-400 mt-1">•</span>
              You may export your data within 90 days
            </div>
            <div className="flex items-start gap-2">
              <span className="text-slate-400 mt-1">•</span>
              After 90 days, your data will be permanently deleted
            </div>
            <div className="flex items-start gap-2">
              <span className="text-slate-400 mt-1">•</span>
              Sections that by their nature should survive termination will
              survive
            </div>
          </div>
        </section>

        {/* Disputes */}
        <section id="disputes" className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            13. Dispute Resolution
          </h2>
          <p className="text-slate-600 leading-relaxed">
            Any disputes arising from these terms shall first be addressed
            through good-faith negotiation. If unresolved within 30 days,
            disputes shall be resolved through binding arbitration in Banjul,
            The Gambia.
          </p>
        </section>

        {/* Governing Law */}
        <section id="governing-law" className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            14. Governing Law
          </h2>
          <p className="text-slate-600 leading-relaxed">
            These terms are governed by the laws of The Gambia, without regard
            to conflict of law principles.
          </p>
        </section>

        {/* General */}
        <section id="general" className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            15. General Provisions
          </h2>
          <div className="space-y-2 text-slate-600">
            <div className="flex items-start gap-2">
              <span className="text-slate-400 mt-1">•</span>
              <strong className="text-slate-900">Entire Agreement:</strong>{" "}
              These terms constitute the entire agreement between you and
              Xenboox.
            </div>
            <div className="flex items-start gap-2">
              <span className="text-slate-400 mt-1">•</span>
              <strong className="text-slate-900">Severability:</strong> If any
              provision is found unenforceable, the remaining provisions remain
              in effect.
            </div>
            <div className="flex items-start gap-2">
              <span className="text-slate-400 mt-1">•</span>
              <strong className="text-slate-900">Waiver:</strong> Failure to
              enforce any provision does not constitute a waiver of that
              provision.
            </div>
            <div className="flex items-start gap-2">
              <span className="text-slate-400 mt-1">•</span>
              <strong className="text-slate-900">Assignment:</strong> You may
              not assign these terms without our written consent.
            </div>
          </div>
        </section>

        {/* Contact */}
        <section id="contact" className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            16. Contact Us
          </h2>
          <p className="text-slate-600 leading-relaxed mb-4">
            For questions about these terms, contact{" "}
            <a
              href="mailto:legal@xenboox.com"
              className="text-blue-600 hover:underline"
            >
              legal@xenboox.com
            </a>
            .
          </p>
        </section>
      </LegalContent>
    </>
  );
}
