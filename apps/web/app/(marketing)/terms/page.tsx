import { LegalHero, LegalContent } from "@/components/marketing/legal-hero";

export default function TermsPage() {
  return (
    <>
      <LegalHero
        title="Terms of Service"
        description="Last updated: July 1, 2026 · The terms governing your use of the Xenboox platform."
      />

      <LegalContent>
        <h2>1. Acceptance of Terms</h2>
        <p>
          By accessing or using Xenboox (&quot;the Platform&quot;), you agree to
          be bound by these Terms of Service. If you do not agree, do not use
          the Platform.
        </p>

        <h2>2. Description of Service</h2>
        <p>
          Xenboox provides an AI-native accounting platform including automated
          bookkeeping, financial reporting, payroll, tax compliance, and related
          services. The Platform uses artificial intelligence agents to assist
          with accounting tasks, but all final financial decisions remain the
          responsibility of the user and their qualified accountant.
        </p>

        <h2>3. User Accounts</h2>
        <h3>3.1 Account Registration</h3>
        <p>
          You must provide accurate, current, and complete information during
          registration. You are responsible for maintaining the confidentiality
          of your login credentials.
        </p>
        <h3>3.2 Account Responsibilities</h3>
        <ul>
          <li>You are responsible for all activities under your account</li>
          <li>You must notify us immediately of unauthorized access</li>
          <li>
            You must ensure your entity has the legal capacity to enter into
            these terms
          </li>
        </ul>

        <h2>4. AI Agent Limitations</h2>
        <ul>
          <li>
            AI agents provide recommendations and automate routine tasks — they
            do not replace professional accounting judgment
          </li>
          <li>
            Confidence scores indicate agent certainty but do not guarantee
            accuracy
          </li>
          <li>
            Transactions above configured thresholds always require human
            approval
          </li>
          <li>
            You retain full responsibility for the accuracy and completeness of
            your financial records
          </li>
        </ul>

        <h2>5. Fees &amp; Billing</h2>
        <p>
          Fees are as described on our <a href="/pricing">Pricing page</a>. All
          fees are billed in advance and are non-refundable except as specified
          in our <a href="/refund">Refund Policy</a>. We may change fees with 30
          days&apos; notice.
        </p>

        <h2>6. Data Ownership</h2>
        <p>
          You retain full ownership of all financial data, documents, and
          information you upload to the Platform. We use your data only to
          provide the Service and may use anonymized, aggregated data for
          platform improvement.
        </p>

        <h2>7. Acceptable Use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Use the Platform for any unlawful purpose</li>
          <li>
            Attempt to bypass entity isolation or access another entity&apos;s
            data
          </li>
          <li>
            Upload malicious code or attempt to compromise platform security
          </li>
          <li>
            Use automated tools to scrape or extract data beyond API rate limits
          </li>
          <li>Misrepresent AI agent outputs as human professional advice</li>
        </ul>

        <h2>8. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by law, Xenboox shall not be liable
          for indirect, incidental, special, or consequential damages arising
          from your use of the Platform. Our total liability is limited to the
          fees you paid in the 12 months preceding the claim.
        </p>

        <h2>9. Termination</h2>
        <p>
          Either party may terminate this agreement at any time. Upon
          termination, you may export your data within 90 days. After 90 days,
          your data will be permanently deleted.
        </p>

        <h2>10. Governing Law</h2>
        <p>
          These terms are governed by the laws of The Gambia. Any disputes shall
          be resolved through binding arbitration in Banjul, The Gambia.
        </p>

        <h2>11. Contact</h2>
        <p>
          For questions about these terms, contact{" "}
          <a href="mailto:legal@xenboox.com">legal@xenboox.com</a>.
        </p>
      </LegalContent>
    </>
  );
}
