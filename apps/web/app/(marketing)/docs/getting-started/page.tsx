import {
  BookOpen,
  UserPlus,
  Building2,
  ArrowRight,
  FileText,
  Bot,
  Shield,
  Zap,
  Globe,
} from "lucide-react";
import Link from "next/link";

import { DocsPageHeader } from "../components/docs-page-header";
import { InfoCallout } from "../components/info-callout";
import { FeatureGrid } from "../components/feature-grid";
import { RelatedLinks } from "../components/related-links";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";

const steps = [
  {
    title: "Create Your Account",
    description:
      "Sign up with your email address or Google account. No credit card required. You'll receive a verification email to confirm your account.",
    icon: UserPlus,
    details: [
      "Navigate to the Xenboox sign-up page",
      "Enter your email and create a secure password",
      "Verify your email address via the confirmation link",
      "Set up two-factor authentication for enhanced security (recommended)",
    ],
  },
  {
    title: "Create Your Organization",
    description:
      "Set up your organization profile. This is the top-level entity that contains all your accounting data, users, and settings.",
    icon: Building2,
    details: [
      "Enter your organization name and business type",
      "Select your country and default currency",
      "Choose your fiscal year start date",
      "Configure your chart of accounts template",
    ],
  },
  {
    title: "Configure Your Entity",
    description:
      "Within your organization, create one or more entities (companies, branches, or departments). Each entity has its own independent set of books.",
    icon: Globe,
    details: [
      "Create entities for each legal entity or branch",
      "Assign users to entities with appropriate roles",
      "Configure entity-specific settings like currency and tax rates",
      "Set up default accounts for each entity",
    ],
  },
  {
    title: "Explore the Dashboard",
    description:
      "Get familiar with the main dashboard. This is your command center for all accounting operations.",
    icon: Zap,
    details: [
      "View key financial metrics and KPIs at a glance",
      "Access all 20 accounting modules from the sidebar",
      "Interact with the AI chat assistant for natural language commands",
      "Customize your dashboard layout and widgets",
    ],
  },
  {
    title: "Record Your First Journal Entry",
    description:
      "The foundation of all accounting in Xenboox is the double-entry journal entry. Record your first transaction.",
    icon: FileText,
    details: [
      "Navigate to the Journal module",
      "Select the appropriate fiscal period",
      "Enter a description for your transaction",
      "Add debit and credit lines with proper account codes",
      "Submit for posting — the Ledger Agent handles the rest",
    ],
  },
  {
    title: "Explore AI Features",
    description:
      "Xenboox includes AI-powered automation for accounting tasks. Start using these features to simplify your workflow.",
    icon: Bot,
    details: [
      "Use the AI chat assistant for financial insights",
      "Enable automated transaction categorization",
      "Set up automatic invoice processing",
      "Configure approval workflows for your team",
    ],
  },
];

const features = [
  {
    title: "Multi-Platform",
    description:
      "Access your accounting data from web, mobile, and desktop apps. Your data syncs work together across all platforms.",
    icon: Globe,
  },
  {
    title: "Multi-Currency",
    description:
      "Handle transactions in multiple currencies with real-time exchange rates and automatic conversions.",
    icon: BookOpen,
  },
  {
    title: "Enterprise Security",
    description:
      "AES-256 encryption, RBAC, audit logging, and SOC 2 compliant infrastructure protect your financial data.",
    icon: Shield,
  },
];

export default function GettingStartedPage() {
  return (
    <>
      <DocsPageHeader
        title="Getting Started with Xenboox"
        description="Follow this guide to set up your account, configure your organization, and start using Xenboox's AI-powered accounting platform. Complete setup takes less than 15 minutes."
        breadcrumbs={[
          { label: "Getting Started", href: "/docs/getting-started" },
        ]}
        icon={BookOpen}
      />

      <div className="space-y-10">
        {/* Overview */}
        <section>
          <p className="text-muted-foreground leading-relaxed">
            Xenboox is an AI-native, full-stack accounting platform designed for
            businesses of all sizes. With comprehensive accounting modules and
            support for web, mobile, and desktop platforms, it provides
            everything you need to manage your financial operations efficiently.
          </p>
        </section>

        {/* Prerequisites */}
        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">
            Prerequisites
          </h2>
          <Card>
            <CardContent className="pt-6">
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>A valid email address for account registration</span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>
                    Internet connection for cloud access (offline desktop mode
                    requires Tauri app)
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>
                    Recommended: Modern web browser (Chrome, Firefox, Safari, or
                    Edge)
                  </span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </section>

        {/* Step-by-Step Guide */}
        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-6">
            Step-by-Step Setup Guide
          </h2>
          <div className="space-y-6">
            {steps.map((step, index) => (
              <Card key={step.title} className="relative">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
                      {index + 1}
                    </div>
                    <step.icon className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">{step.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    {step.description}
                  </p>
                  <ul className="space-y-1.5">
                    {step.details.map((detail) => (
                      <li
                        key={detail}
                        className="flex items-start gap-2 text-sm text-muted-foreground"
                      >
                        <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Key Features */}
        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">
            Platform Highlights
          </h2>
          <FeatureGrid features={features} columns={3} />
        </section>

        {/* Tips */}
        <InfoCallout type="tip" title="Pro Tip">
          Start with the Journal module and the Chat AI assistant to get
          familiar with the platform. The AI agents can handle most routine
          accounting tasks, letting you focus on strategic decisions.
        </InfoCallout>

        {/* Next Steps */}
        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">Next Steps</h2>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-4">
                Once you have your account set up, explore these resources:
              </p>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    href="/docs/modules/journal"
                    className="text-primary hover:underline"
                  >
                    Learn how to create journal entries →
                  </Link>
                </li>
                <li>
                  <Link
                    href="/docs/getting-started"
                    className="text-primary hover:underline"
                  >
                    Learn about AI features →
                  </Link>
                </li>
                <li>
                  <Link
                    href="/docs/security"
                    className="text-primary hover:underline"
                  >
                    Review security best practices →
                  </Link>
                </li>
                <li>
                  <Link
                    href="/docs/faq"
                    className="text-primary hover:underline"
                  >
                    Browse the FAQ →
                  </Link>
                </li>
              </ul>
            </CardContent>
          </Card>
        </section>

        {/* Related Documentation */}
        <RelatedLinks
          links={[
            {
              title: "FAQ",
              href: "/docs/faq",
              description: "Common questions and answers",
            },
            {
              title: "Security",
              href: "/docs/security",
              description: "Security overview and best practices",
            },
            {
              title: "Modules Overview",
              href: "/docs/modules",
              description: "Browse all accounting modules",
            },
            {
              title: "AI Features",
              href: "/docs/agents",
              description: "Learn about AI automation features",
            },
          ]}
        />
      </div>
    </>
  );
}
