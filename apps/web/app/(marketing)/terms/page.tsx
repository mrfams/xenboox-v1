import { LegalShell } from "../components/marketing-primitives";

export default function TermsPage() {
  return (
    <LegalShell title="Terms of Service" updated="January 2026">
      <div>
        <h2>1. Acceptance of Terms</h2>
        <p>
          By accessing or using Xenboox (the &quot;Service&quot;), you agree to
          be bound by these Terms of Service (&quot;Terms&quot;). If you do not
          agree to these Terms, do not use the Service. These Terms apply to all
          users, including free and paid accounts.
        </p>
      </div>

      <div>
        <h2>2. Description of Service</h2>
        <p>
          Xenboox is an AI-native accounting platform that provides double-entry
          bookkeeping, accounts payable and receivable, payroll processing,
          treasury management, financial reporting, and AI-powered accounting
          assistance. The Service is available via web, mobile, and desktop
          applications.
        </p>
      </div>

      <div>
        <h2>3. Account Registration</h2>
        <p>
          You must provide accurate, complete information when creating an
          account. You are responsible for:
        </p>
        <ul className="mt-2">
          <li>Maintaining the confidentiality of your credentials</li>
          <li>All activities that occur under your account</li>
          <li>Notifying us immediately of any unauthorized access</li>
          <li>Ensuring your account information is current and accurate</li>
        </ul>
      </div>

      <div>
        <h2>4. Acceptable Use</h2>
        <p>You agree not to:</p>
        <ul className="mt-2">
          <li>Use the Service for any unlawful purpose</li>
          <li>
            Attempt to gain unauthorized access to any part of the Service
          </li>
          <li>Interfere with or disrupt the Service or servers</li>
          <li>Use the Service to transmit malware or malicious code</li>
          <li>
            Reverse engineer, decompile, or disassemble any part of the Service
          </li>
          <li>Use AI agents to generate fraudulent financial records</li>
        </ul>
      </div>

      <div>
        <h2>5. Financial Data Responsibility</h2>
        <p>
          You are solely responsible for the accuracy of financial data you
          enter into Xenboox. While our AI agents assist with data entry and
          validation, they do not replace professional accounting judgment.
          Xenboox is not a substitute for professional financial advice. You
          should consult with qualified accountants for financial decisions.
        </p>
      </div>

      <div>
        <h2>6. AI Agent Disclaimers</h2>
        <p>
          Our AI agents provide automated assistance but are not infallible. All
          AI-generated suggestions are flagged with confidence scores.
          Low-confidence suggestions require human review. You are responsible
          for reviewing and approving AI agent actions before they affect your
          financial records. Xenboox is not liable for errors in AI-generated
          content that you fail to review.
        </p>
      </div>

      <div>
        <h2>7. Pricing and Payment</h2>
        <p>
          Free tier accounts are subject to usage limitations as described on
          our pricing page. Paid plans are billed in advance on a monthly or
          annual basis. All fees are non-refundable except as required by law.
          We reserve the right to change pricing with 30 days&apos; notice.
        </p>
      </div>

      <div>
        <h2>8. Intellectual Property</h2>
        <p>
          The Service, including all software, AI models, prompts, and
          documentation, is owned by Xenboox and protected by intellectual
          property laws. You retain ownership of all data you enter into the
          Service. You grant us a limited license to process your data solely
          for the purpose of providing the Service.
        </p>
      </div>

      <div>
        <h2>9. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by law, Xenboox shall not be liable
          for any indirect, incidental, special, consequential, or punitive
          damages, including loss of profits, data, or business opportunities.
          Our total liability shall not exceed the amount paid by you in the 12
          months preceding the claim.
        </p>
      </div>

      <div>
        <h2>10. Termination</h2>
        <p>
          You may terminate your account at any time through the settings page.
          We may suspend or terminate your access for violation of these Terms,
          with or without notice. Upon termination, your right to use the
          Service ceases immediately. Data export is available for 30 days after
          termination.
        </p>
      </div>

      <div>
        <h2>11. Changes to Terms</h2>
        <p>
          We reserve the right to modify these Terms at any time. Material
          changes will be communicated via email or in-app notification at least
          30 days before taking effect. Continued use of the Service after
          changes take effect constitutes acceptance of the updated Terms.
        </p>
      </div>

      <div>
        <h2>12. Governing Law</h2>
        <p>
          These Terms are governed by the laws of The Gambia. Any disputes shall
          be resolved in the courts of Banjul, The Gambia.
        </p>
      </div>

      <div>
        <h2>13. Contact</h2>
        <p>
          Questions about these Terms? Contact us at{" "}
          <span className="text-white">legal@xenboox.com</span>.
        </p>
      </div>
    </LegalShell>
  );
}
