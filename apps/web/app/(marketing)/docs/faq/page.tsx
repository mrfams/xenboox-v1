import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui"
import { DocsPageHeader } from "../components/docs-page-header"
import { RelatedLinks } from "../components/related-links"
import { HelpCircle, CreditCard, Shield, Bot, FileText, Users, Settings } from "lucide-react"
import Link from "next/link"

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
        a: "Yes, Xenboox offers a free tier that includes basic accounting features, access to the Journal and Cash modules, and limited AI agent interactions. Upgrade to a paid plan for full access to all 20 modules and 19 AI agents.",
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
    title: "AI Agents",
    icon: Bot,
    questions: [
      {
        q: "How do AI agents work in Xenboox?",
        a: "Xenboox has 19 specialized AI agents in a three-tier hierarchy. The CFO Agent handles strategic decisions, department heads (Controller, Treasury, Payroll Manager, Compliance) manage specific domains, and worker agents execute tasks. Each agent operates with a confidence score, and low-confidence decisions are escalated to human supervisors.",
      },
      {
        q: "Can I override AI agent decisions?",
        a: "Absolutely. AI agents operate with human oversight at all times. Every action includes a confidence score. Below 0.7 confidence, actions are escalated to a supervisor agent. Below 0.4, they're escalated to a human. You can review, approve, or reject any agent action.",
      },
      {
        q: "What happens if an AI agent makes a mistake?",
        a: "All agent actions are logged with full context, including reasoning and confidence scores. If an error is detected, you can reverse the action and provide corrective feedback. The agent learns from corrections through the feedback loop. Additionally, the Ledger Agent validates all postings for double-entry integrity.",
      },
      {
        q: "Which AI models power the agents?",
        a: "Xenboox uses a multi-LLM architecture. Strategic agents (CFO, Controller) use Claude Sonnet for deep reasoning. Worker agents use Haiku for fast, efficient task execution. All agent activity is traced to LangFuse for observability.",
      },
      {
        q: "Can I use my own API keys for AI?",
        a: "Enterprise customers can configure custom LLM providers and API keys. This allows you to use your own accounts with Anthropic, OpenAI, or other providers for enhanced control and privacy.",
      },
    ],
  },
  {
    title: "Features & Modules",
    icon: FileText,
    questions: [
      {
        q: "What accounting modules are available?",
        a: "Xenboox offers 20 modules: Accounts Payable, Accounts Receivable, Payroll, Treasury, Cash, Mobile Money, Inventory, Fixed Assets, Chart of Accounts, Journal, Fiscal Periods, Reports, Documents, Chat, Multi-Currency, Organizations, Settings, Analytics, Budgeting, and AI Agent Management.",
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
]

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
              <h2 className="text-2xl font-bold tracking-tight">{category.title}</h2>
            </div>
            <div className="space-y-3">
              {category.questions.map((item) => (
                <Card key={item.q} className="transition-colors hover:bg-muted/30">
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
            { title: "Getting Started", href: "/docs/getting-started", description: "Complete setup guide" },
            { title: "Security Overview", href: "/docs/security", description: "Security and compliance details" },
            { title: "Contact Support", href: "/contact", description: "Reach out to our team" },
          ]}
        />
      </div>
    </>
  )
}
