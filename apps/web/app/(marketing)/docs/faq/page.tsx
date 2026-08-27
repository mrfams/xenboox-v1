import {
  HelpCircle,
  CreditCard,
  Shield,
  Bot,
  FileText,
  Users,
  Settings,
} from "lucide-react";

import { DocsPageHeader } from "../components/docs-page-header";
import { RelatedLinks } from "../components/related-links";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";

const faqCategories = [
  {
    title: "Account & Billing",
    icon: CreditCard,
    questions: [
      {
        q: "How do I create an account?",
        a: "Visit the Xenboox sign-up page and register with your email address or Google account. You'll receive a verification email. No credit card is required for the free tier.",
      },
      {
        q: "Is there a free plan?",
        a: "Yes, Xenboox offers a free tier that includes basic accounting features and limited automation. Upgrade to a paid plan for full access to all modules and advanced AI features.",
      },
      {
        q: "What payment methods do you accept?",
        a: "We accept major credit cards (Visa, Mastercard, American Express), mobile money payments (M-Pesa, Airtel Money, MTN Mobile Money), and bank transfers for annual plans.",
      },
      {
        q: "Can I cancel my subscription at any time?",
        a: "Yes, you can cancel your subscription at any time. Your data remains accessible in read-only mode until the end of your billing period. You can export all your data before cancellation.",
      },
      {
        q: "What happens to my data if I downgrade?",
        a: "Your data is preserved. You'll lose access to premium features and AI agents, but your historical financial data remains intact. You can upgrade again at any time to regain full access.",
      },
    ],
  },
  {
    title: "Security & Compliance",
    icon: Shield,
    questions: [
      {
        q: "How is my financial data protected?",
        a: "All data is encrypted at rest using AES-256 encryption and in transit using TLS 1.3. We implement Row-Level Security (RLS) in PostgreSQL to ensure entity isolation. Every action is logged in the audit trail with user ID, timestamp, and IP address.",
      },
      {
        q: "Is Xenboox GDPR compliant?",
        a: "Yes, Xenboox is GDPR compliant. You can export all your data at any time, request data deletion, and we retain financial data for 7 years as per accounting regulations. PII can be anonymized while preserving financial records.",
      },
      {
        q: "Where is my data stored?",
        a: "Your data is stored on Neon PostgreSQL servers, which run on AWS infrastructure. Primary region is US East (N. Virginia) with automated backups and point-in-time recovery. Documents are stored on Cloudflare R2 with global edge caching.",
      },
      {
        q: "How do you handle data backups?",
        a: "Neon automated daily backups are retained for 7 days. Point-in-time recovery allows restoration to any second within the retention window. We also support manual data export from the admin dashboard.",
      },
      {
        q: "What compliance certifications do you have?",
        a: "Xenboox is SOC 2 compliant and follows GDPR guidelines. We undergo quarterly penetration testing and vulnerability assessments. Our infrastructure providers (Vercel, Neon, Cloudflare) maintain their own compliance certifications.",
      },
    ],
  },
  {
    title: "AI & Automation",
    icon: Bot,
    questions: [
      {
        q: "How does AI automation work in Xenboox?",
        a: "Xenboox uses AI to automate routine accounting tasks like transaction categorization, invoice processing, and bank reconciliation. The system learns from your business patterns and gets smarter over time, while always keeping you in control of important decisions.",
      },
      {
        q: "Can I override AI decisions?",
        a: "Absolutely. You have full control at all times. Every AI action requires your approval before it affects your books. You can review, approve, or reject any suggestion, and the system learns from your feedback.",
      },
      {
        q: "What happens if the AI makes a mistake?",
        a: "All AI actions are logged and reversible. If you spot an error, you can undo it and provide feedback to improve future accuracy. The system maintains a complete audit trail of all actions for your records.",
      },
      {
        q: "Is my data used to train AI models?",
        a: "No. Your financial data is never used to train AI models. We use industry-standard AI services that process your data only to provide the service, and all data is encrypted and isolated between customers.",
      },
      {
        q: "Can I customize how the AI works for my business?",
        a: "Yes. You can configure automation rules, set approval thresholds, and teach the AI your specific categorization preferences. Enterprise customers can also customize workflows to match their unique processes.",
      },
    ],
  },
  {
    title: "Features & Modules",
    icon: FileText,
    questions: [
      {
        q: "What accounting modules are available?",
        a: "Xenboox includes all core accounting modules: Accounts Payable, Accounts Receivable, Payroll, Treasury, Cash Management, Inventory, Fixed Assets, Chart of Accounts, Journal Entries, Financial Reports, and more. All modules work together.",
      },
      {
        q: "Does Xenboox support multi-currency?",
        a: "Yes, Xenboox has full multi-currency support with real-time exchange rates, automatic currency conversion, and multi-currency financial reporting. You can configure different currencies for each entity.",
      },
      {
        q: "Can I import data from other accounting software?",
        a: "Yes, Xenboox supports data import from CSV, Excel, and JSON formats. We also offer direct migration paths from QuickBooks, Xero, and Sage. Contact our support team for assistance with large-scale migrations.",
      },
      {
        q: "What reporting capabilities does Xenboox offer?",
        a: "Xenboox provides real-time financial reports including Profit & Loss, Balance Sheet, Trial Balance, Cash Flow, and Aging Reports. Reports can be exported as PDF, CSV, or Excel. The Reporting Agent can generate custom reports on demand.",
      },
      {
        q: "Does Xenboox support mobile money?",
        a: "Yes, Xenboox has dedicated Mobile Money modules for both web and mobile platforms. It supports M-Pesa, Airtel Money, MTN Mobile Money, and other popular mobile money services. Transactions can be automatically reconciled with bank statements.",
      },
    ],
  },
  {
    title: "Platform & Access",
    icon: Users,
    questions: [
      {
        q: "What platforms does Xenboox support?",
        a: "Xenboox is available on three platforms: Web (Next.js 15 with real-time dashboards), Mobile (React Native with Expo for iOS and Android), and Desktop (Tauri with Rust for Windows, macOS, and Linux).",
      },
      {
        q: "Can I use Xenboox offline?",
        a: "The desktop app supports offline mode with local SQLite caching and synchronization when connectivity is restored. The web and mobile apps require an internet connection for full functionality.",
      },
      {
        q: "How many users can I add?",
        a: "The number of users depends on your plan. Free tier supports up to 3 users. Pro supports up to 20 users. Enterprise plans have unlimited users with advanced role-based access control.",
      },
      {
        q: "Is there a mobile app?",
        a: "Yes, Xenboox has a mobile app built with React Native and Expo, available on both iOS and Android. The mobile app supports invoices, journal entries, approvals, and access to all core modules.",
      },
    ],
  },
  {
    title: "Support & Resources",
    icon: Settings,
    questions: [
      {
        q: "How do I get help?",
        a: "You can access help through multiple channels: the built-in Chat AI assistant, our documentation portal, email support for paid plans, and dedicated account managers for enterprise customers.",
      },
      {
        q: "Do you offer onboarding assistance?",
        a: "Yes, all paid plans include onboarding assistance. Enterprise plans include dedicated onboarding specialists, data migration support, and customized training sessions for your team.",
      },
      {
        q: "How do I export my data?",
        a: "You can export your data from the admin dashboard. Options include full database export (JSON), financial reports (PDF, CSV, Excel), and document downloads. Data exports are processed and delivered via email.",
      },
      {
        q: "Is there an API available?",
        a: "Yes, Xenboox provides a tRPC API for programmatic access to all modules and agents. API keys can be generated from the Settings page. Full API documentation is available for enterprise customers.",
      },
      {
        q: "How do I report a bug or suggest a feature?",
        a: "Report bugs through the in-app feedback system, email support, or the contact form on our website. Feature suggestions can be submitted via the same channels. Enterprise customers have access to a dedicated product manager.",
      },
    ],
  },
];

export default function FAQPage() {
  return (
    <>
      <DocsPageHeader
        title="Frequently Asked Questions"
        description="Find answers to common questions about Xenboox platform, billing, security, AI agents, and more. Can't find what you're looking for? Reach out to our support team."
        breadcrumbs={[{ label: "FAQ", href: "/docs/faq" }]}
        icon={HelpCircle}
      />

      <div className="space-y-10">
        {faqCategories.map((category) => (
          <section key={category.title}>
            <div className="flex items-center gap-2 mb-4">
              <category.icon className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-bold tracking-tight">
                {category.title}
              </h2>
            </div>
            <div className="space-y-3">
              {category.questions.map((item) => (
                <Card
                  key={item.q}
                  className="transition-colors hover:bg-muted/30"
                >
                  <CardHeader>
                    <CardTitle className="text-base font-semibold">
                      {item.q}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {item.a}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        ))}

        <RelatedLinks
          title="Still Have Questions?"
          links={[
            {
              title: "Getting Started",
              href: "/docs/getting-started",
              description: "Complete setup guide",
            },
            {
              title: "Security Overview",
              href: "/docs/security",
              description: "Security and compliance details",
            },
            {
              title: "Contact Support",
              href: "/contact",
              description: "Reach out to our team",
            },
          ]}
        />
      </div>
    </>
  );
}
