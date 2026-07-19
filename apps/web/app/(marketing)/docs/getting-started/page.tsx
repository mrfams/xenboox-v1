import {
  MarketingShell,
  PageHero,
  Reveal,
  GlassCard,
} from "../../components/marketing-primitives";
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
      "Access all accounting modules from the sidebar",
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
      "Submit for posting — the agent handles the rest",
    ],
  },
  {
    title: "Explore AI Agents",
    description:
      "Xenboox comes with a suite of specialized AI agents that automate accounting tasks. Start using them to streamline your workflow.",
    icon: Bot,
    details: [
      "Chat with the assistant for strategic financial insights",
      "Use automated agents for journal posting",
      "Let the AP agent process invoices automatically",
      "Schedule the payroll agent for payroll runs",
    ],
  },
];

const features = [
  {
    title: "Multi-Platform",
    description:
      "Access your accounting data from web, mobile, and desktop apps. Your data syncs seamlessly across all platforms.",
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
      "AES-256 encryption, RBAC, audit logging, and SOC 2 aligned infrastructure protect your financial data.",
    icon: Shield,
  },
];

function StepCard({
  step,
  index,
}: {
  step: (typeof steps)[number];
  index: number;
}) {
  return (
    <Reveal>
      <GlassCard className="p-7">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-sm font-bold text-white">
            {index + 1}
          </div>
          <step.icon className="h-5 w-5 text-indigo-300" />
          <h3 className="text-lg font-semibold text-white">{step.title}</h3>
        </div>
        <p className="mt-4 text-sm text-white/60">{step.description}</p>
        <ul className="mt-3 space-y-1.5">
          {step.details.map((detail) => (
            <li
              key={detail}
              className="flex items-start gap-2 text-sm text-white/55"
            >
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400/70" />
              <span>{detail}</span>
            </li>
          ))}
        </ul>
      </GlassCard>
    </Reveal>
  );
}

export default function GettingStartedPage() {
  return (
    <MarketingShell>
      <PageHero
        eyebrow="Documentation"
        title="Getting Started"
        highlight="with Xenboox"
        subtitle="Follow this guide to set up your account, configure your organization, and start using Xenboox's AI-powered accounting platform. Complete setup takes less than 15 minutes."
      />

      <section className="py-12">
        <div className="mx-auto max-w-4xl space-y-10 px-4 sm:px-6">
          <Reveal>
            <p className="text-white/60">
              Xenboox is an AI-native, full-stack accounting platform designed
              for businesses of all sizes. With intelligent agents, a complete
              set of accounting modules, and support for web, mobile, and
              desktop platforms, it provides everything you need to manage your
              financial operations efficiently.
            </p>
          </Reveal>

          <section>
            <h2 className="mb-6 text-2xl font-bold tracking-tight text-white">
              Prerequisites
            </h2>
            <GlassCard className="p-6">
              <ul className="space-y-2 text-sm text-white/60">
                <li className="flex items-start gap-2">
                  <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-indigo-400" />
                  <span>A valid email address for account registration</span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-indigo-400" />
                  <span>
                    Internet connection for cloud access (offline desktop mode
                    requires the native app)
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-indigo-400" />
                  <span>
                    Recommended: Modern web browser (Chrome, Firefox, Safari, or
                    Edge)
                  </span>
                </li>
              </ul>
            </GlassCard>
          </section>

          <section>
            <h2 className="mb-6 text-2xl font-bold tracking-tight text-white">
              Step-by-Step Setup Guide
            </h2>
            <div className="space-y-5">
              {steps.map((step, index) => (
                <StepCard key={step.title} step={step} index={index} />
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-6 text-2xl font-bold tracking-tight text-white">
              Platform Highlights
            </h2>
            <div className="grid gap-5 sm:grid-cols-3">
              {features.map((feature) => (
                <Reveal key={feature.title}>
                  <GlassCard className="h-full p-6">
                    <feature.icon className="mb-3 h-6 w-6 text-indigo-300" />
                    <h3 className="text-base font-semibold text-white">
                      {feature.title}
                    </h3>
                    <p className="mt-2 text-sm text-white/55">
                      {feature.description}
                    </p>
                  </GlassCard>
                </Reveal>
              ))}
            </div>
          </section>

          <Reveal>
            <GlassCard className="p-6">
              <h3 className="font-semibold text-white">Pro Tip</h3>
              <p className="mt-2 text-sm text-white/60">
                Start with the Journal module and the chat assistant to get
                familiar with the platform. The AI agents can handle most
                routine accounting tasks, letting you focus on strategic
                decisions.
              </p>
            </GlassCard>
          </Reveal>

          <section>
            <h2 className="mb-6 text-2xl font-bold tracking-tight text-white">
              Next Steps
            </h2>
            <GlassCard className="p-6">
              <p className="mb-4 text-sm text-white/60">
                Once you have your account set up, explore these resources:
              </p>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    href="/docs/modules/journal"
                    className="text-indigo-300 hover:underline"
                  >
                    Learn how to create journal entries →
                  </Link>
                </li>
                <li>
                  <Link
                    href="/docs/agents/cfo"
                    className="text-indigo-300 hover:underline"
                  >
                    Chat with the assistant for financial insights →
                  </Link>
                </li>
                <li>
                  <Link
                    href="/docs/security"
                    className="text-indigo-300 hover:underline"
                  >
                    Review security best practices →
                  </Link>
                </li>
                <li>
                  <Link
                    href="/docs/faq"
                    className="text-indigo-300 hover:underline"
                  >
                    Browse the FAQ →
                  </Link>
                </li>
              </ul>
            </GlassCard>
          </section>
        </div>
      </section>
    </MarketingShell>
  );
}
