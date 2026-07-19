import { LegalShell } from "../components/marketing-primitives";

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy" updated="January 2026">
      <div>
        <h2>1. Introduction</h2>
        <p>
          Xenboox (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is
          committed to protecting your privacy. This Privacy Policy explains how
          we collect, use, disclose, and safeguard your information when you use
          our accounting platform, including our web application, mobile
          application, desktop application, and related services (collectively,
          the &quot;Service&quot;).
        </p>
      </div>

      <div>
        <h2>2. Information We Collect</h2>
        <div className="space-y-2">
          <p>
            <strong>Account Information:</strong> When you register, we collect
            your name, email address, and organization details.
          </p>
          <p>
            <strong>Financial Data:</strong> We store accounting data you enter
            or generate through the Service, including journal entries,
            invoices, transactions, and reports. This data is isolated per
            entity and encrypted at rest.
          </p>
          <p>
            <strong>Usage Data:</strong> We collect information about how you
            interact with the Service, including pages visited, features used,
            and AI agent interactions.
          </p>
          <p>
            <strong>Device Information:</strong> We may collect device type,
            operating system, and browser information for security and
            optimization purposes.
          </p>
        </div>
      </div>

      <div>
        <h2>3. How We Use Your Information</h2>
        <ul>
          <li>To provide, maintain, and improve the Service</li>
          <li>To process transactions and generate financial reports</li>
          <li>To power AI agent features that assist with your accounting</li>
          <li>
            To send service-related communications (e.g., security alerts,
            support)
          </li>
          <li>To detect and prevent fraud, abuse, and security incidents</li>
          <li>To comply with legal obligations</li>
        </ul>
      </div>

      <div>
        <h2>4. AI Agent Processing</h2>
        <p>
          Our AI agents process your financial data to provide automated
          accounting assistance. This processing occurs within our secure
          infrastructure. We do not use your data to train third-party AI
          models. AI agent decisions are logged with confidence scores and are
          subject to human review when confidence falls below established
          thresholds.
        </p>
      </div>

      <div>
        <h2>5. Data Security</h2>
        <p>We implement industry-standard security measures:</p>
        <ul className="mt-2">
          <li>Database Row-Level Security for data isolation</li>
          <li>AES-256 encryption for sensitive fields at rest</li>
          <li>TLS 1.3 encryption for all data in transit</li>
          <li>Rate limiting and DDoS protection</li>
          <li>Comprehensive audit logging for all actions</li>
        </ul>
      </div>

      <div>
        <h2>6. Data Sharing</h2>
        <p>
          We do not sell your personal or financial information to third
          parties. We may share data with trusted service providers who assist
          in operating the Service (e.g., hosting, payment processing), subject
          to contractual obligations to protect your information. We may
          disclose information if required by law or to protect our rights.
        </p>
      </div>

      <div>
        <h2>7. Data Retention</h2>
        <p>
          We retain your data for as long as your account is active or as needed
          to provide the Service. Upon account cancellation, we retain your data
          for 30 days to allow for export, then permanently delete it. You may
          request immediate deletion by contacting us.
        </p>
      </div>

      <div>
        <h2>8. Your Rights</h2>
        <p>You have the right to:</p>
        <ul className="mt-2">
          <li>Access your personal data</li>
          <li>Correct inaccurate data</li>
          <li>Request deletion of your data</li>
          <li>Export your data in standard formats</li>
          <li>Object to processing of your data</li>
          <li>Withdraw consent where applicable</li>
        </ul>
      </div>

      <div>
        <h2>9. International Transfers</h2>
        <p>
          Your data may be processed in countries outside your country of
          residence. We ensure appropriate safeguards are in place for
          international transfers, including standard contractual clauses where
          required.
        </p>
      </div>

      <div>
        <h2>10. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. We will notify
          you of material changes by posting the updated policy on our website
          and, where appropriate, by email.
        </p>
      </div>

      <div>
        <h2>11. Contact Us</h2>
        <p>
          If you have questions about this Privacy Policy, please contact us at{" "}
          <span className="text-white">privacy@xenboox.com</span>.
        </p>
      </div>
    </LegalShell>
  );
}
