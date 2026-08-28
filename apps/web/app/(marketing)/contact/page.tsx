import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Building2,
  Clock,
  HelpCircle,
  Laptop,
  Mail,
  MessageSquare,
  Newspaper,
  Phone,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";

import { Section } from "@/components/marketing/section";
import { FadeInUp } from "@/components/marketing/reveal";
import { ContactForm } from "@/components/marketing/contact-form";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with Xenboox. Our team is here to help with questions, demos, and support.",
};

/* ── Intent Router Cards ──────────────────────────────────── */

const intents = [
  {
    icon: Sparkles,
    title: "New to Xenboox",
    description:
      "Ready to see AI-native accounting in action? Book a personalized demo or start your free trial.",
    cta: "Book a Demo",
    href: "#form",
    responseTime: "Response within 4 hours",
    color: "primary",
  },
  {
    icon: Laptop,
    title: "Need Support",
    description:
      "Already using Xenboox? Search our docs, check system status, or contact our support team.",
    cta: "Visit Help Center",
    href: "/docs",
    responseTime: "Live chat during business hours",
    color: "balanced-green",
  },
  {
    icon: Users,
    title: "Partnership",
    description:
      "Interested in integrating with Xenboox, becoming a partner, or exploring reseller opportunities?",
    cta: "Get in Touch",
    href: "#form",
    responseTime: "Response within 24 hours",
    color: "amber-500",
  },
  {
    icon: Newspaper,
    title: "Media & Press",
    description:
      "Journalists, analysts, and media inquiries. Access our press kit or reach our communications team.",
    cta: "Press Kit",
    href: "/about",
    responseTime: "Response within 48 hours",
    color: "purple-500",
  },
];

/* ── Self-Service Resources ───────────────────────────────── */

const resources = [
  {
    icon: BookOpen,
    title: "Documentation",
    description: "Guides, API references, and tutorials",
    href: "/docs",
  },
  {
    icon: Zap,
    title: "System Status",
    description: "Real-time platform health and uptime",
    href: "#",
  },
  {
    icon: MessageSquare,
    title: "Community",
    description: "Ask questions and share knowledge",
    href: "#",
  },
];

/* ── Response Time SLAs ───────────────────────────────────── */

const channels = [
  {
    icon: Mail,
    label: "Email",
    detail: "hello@xenboox.com",
    sla: "< 4 hours",
    note: "During business hours (Mon-Fri, 9am-6pm WAT)",
    href: "mailto:hello@xenboox.com",
  },
  {
    icon: MessageSquare,
    label: "Live Chat",
    detail: "Start a conversation",
    sla: "Instant",
    note: "Available Mon-Fri, 9am-6pm WAT",
    href: "#",
  },
  {
    icon: Phone,
    label: "Phone",
    detail: "Enterprise inquiries",
    sla: "Scheduled call",
    note: "Available for enterprise and priority support",
    href: "mailto:enterprise@xenboox.com",
  },
];

/* ── FAQ ──────────────────────────────────────────────────── */

const faqs = [
  {
    q: "How much does Xenboox cost?",
    a: "Xenboox offers a free tier for small businesses, with paid plans starting at $29/month for teams. Enterprise pricing is custom. View our full pricing page for details.",
  },
  {
    q: "Can I try Xenboox before committing?",
    a: "Yes. Start a free trial with full access to all features for 14 days. No credit card required.",
  },
  {
    q: "How does migration from other accounting software work?",
    a: "We support import from QuickBooks, Xero, Wave, and CSV files. Our onboarding team will help you migrate your chart of accounts, historical data, and settings. Most migrations complete within 48 hours.",
  },
  {
    q: "Is my financial data secure?",
    a: "Absolutely. All data is encrypted at rest (AES-256) and in transit (TLS 1.3). We enforce entity-level isolation at the database layer with row-level security. SOC 2 compliance is in progress.",
  },
  {
    q: "Do you support Gambian tax compliance?",
    a: "Yes. Xenboox has built-in support for GRA VAT, PAYE, and SSNIT computations. Our compliance agent automatically files returns and tracks deadlines.",
  },
];

/* ── Page ─────────────────────────────────────────────────── */

export default function ContactPage() {
  return (
    <>
      {/* ── Hero ──────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-paper">
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden="true"
          style={{
            backgroundImage:
              "radial-gradient(rgba(20, 33, 61, 0.06) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
            maskImage:
              "radial-gradient(ellipse at center, black 30%, transparent 75%)",
            WebkitMaskImage:
              "radial-gradient(ellipse at center, black 30%, transparent 75%)",
          }}
        />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-28">
          <div className="mx-auto max-w-3xl">
            <FadeInUp>
              <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                We&apos;re here to{" "}
                <span className="text-primary">help</span>
              </h1>
            </FadeInUp>
            <FadeInUp delay={0.1}>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
                Questions about Xenboox? Want a demo? Need help with your
                account? Our team responds within one business day.
              </p>
            </FadeInUp>
            <FadeInUp delay={0.2}>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="#form"
                  className="inline-flex h-12 items-center rounded-full bg-primary px-8 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/25 transition-all duration-300 hover:shadow-primary/40 hover:scale-[1.02] active:scale-[0.98]"
                >
                  Send us a message
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
                <Link
                  href="/docs"
                  className="inline-flex h-12 items-center rounded-full border border-border bg-card px-8 text-sm font-medium text-foreground transition-all duration-300 hover:bg-accent/50 hover:border-foreground/20"
                >
                  <BookOpen className="mr-2 h-4 w-4" />
                  Browse Documentation
                </Link>
              </div>
            </FadeInUp>
          </div>
        </div>
      </section>

      {/* ── Intent Router ─────────────────────────────────── */}
      <Section className="!pt-0">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <FadeInUp>
            <div className="mb-10">
              <h2 className="text-2xl font-bold text-foreground">
                How can we help?
              </h2>
              <p className="mt-2 text-muted-foreground">
                Choose the path that matches your needs.
              </p>
            </div>
          </FadeInUp>

          <div className="grid gap-5 sm:grid-cols-2">
            {intents.map((intent, index) => (
              <FadeInUp key={intent.title} delay={index * 0.08}>
                <Link
                  href={intent.href}
                  className="group flex flex-col rounded-2xl border border-border/60 bg-card p-6 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:shadow-[0_20px_50px_-20px_rgba(20,33,61,0.15)] hover:-translate-y-1 hover:border-border/40"
                >
                  <div className="flex items-start justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                      <intent.icon className="h-5 w-5" />
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {intent.responseTime}
                    </span>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-foreground">
                    {intent.title}
                  </h3>
                  <p className="mt-2 flex-1 text-sm text-muted-foreground leading-relaxed">
                    {intent.description}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
                    {intent.cta}
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                  </span>
                </Link>
              </FadeInUp>
            ))}
          </div>
        </div>
      </Section>

      {/* ── Self-Service Resources ────────────────────────── */}
      <section className="border-t border-border bg-paper-2/60 py-12 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <FadeInUp>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-foreground">
                Self-service resources
              </h2>
              <p className="mt-2 text-muted-foreground">
                Find answers fast with our docs, status page, and community.
              </p>
            </div>
          </FadeInUp>

          <div className="grid gap-4 sm:grid-cols-3">
            {resources.map((resource, index) => (
              <FadeInUp key={resource.title} delay={index * 0.08}>
                <Link
                  href={resource.href}
                  className="group flex items-center gap-4 rounded-xl border border-border/60 bg-card p-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 hover:border-border/40"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                    <resource.icon className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {resource.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {resource.description}
                    </p>
                  </div>
                </Link>
              </FadeInUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── Contact Form ──────────────────────────────────── */}
      <section
        id="form"
        className="border-t border-border bg-paper py-12 sm:py-16"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-5">
            {/* Left: Form */}
            <div className="lg:col-span-3">
              <FadeInUp>
                <h2 className="text-3xl font-semibold tracking-tight text-foreground">
                  Send us a message
                </h2>
                <p className="mt-3 text-muted-foreground">
                  Fill out the form and we&apos;ll get back to you within one
                  business day.
                </p>
              </FadeInUp>

              <FadeInUp delay={0.1}>
                <div className="mt-8">
                  <ContactForm />
                </div>
              </FadeInUp>
            </div>

            {/* Right: Contact Channels */}
            <div className="lg:col-span-2">
              <FadeInUp delay={0.15}>
                <h3 className="text-lg font-semibold text-foreground mb-6">
                  Other ways to reach us
                </h3>
              </FadeInUp>

              <div className="space-y-4">
                {channels.map((channel, index) => (
                  <FadeInUp key={channel.label} delay={0.2 + index * 0.08}>
                    <Link
                      href={channel.href}
                      className="group flex items-start gap-4 rounded-xl border border-border/60 bg-card p-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 hover:border-border/40"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                        <channel.icon className="h-5 w-5" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-semibold text-foreground">
                            {channel.label}
                          </h4>
                          <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-balanced-green/10 px-2 py-0.5 text-[11px] font-medium text-balanced-green">
                            <span className="h-1.5 w-1.5 rounded-full bg-balanced-green" />
                            {channel.sla}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-primary mt-0.5">
                          {channel.detail}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {channel.note}
                        </p>
                      </div>
                    </Link>
                  </FadeInUp>
                ))}
              </div>

              {/* Office Location */}
              <FadeInUp delay={0.5}>
                <div className="mt-6 rounded-xl border border-border/60 bg-card p-5">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Building2 className="h-5 w-5" />
                    </span>
                    <div>
                      <h4 className="font-semibold text-foreground">
                        Our Office
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Banjul, The Gambia
                      </p>
                      <Link
                        href="https://maps.google.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                      >
                        View on map
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              </FadeInUp>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────── */}
      <section className="border-t border-border bg-paper-2/60 py-12 sm:py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <FadeInUp>
            <div className="mb-10 text-center">
              <h2 className="text-3xl font-semibold tracking-tight text-foreground">
                Frequently asked questions
              </h2>
              <p className="mt-3 text-muted-foreground">
                Can&apos;t find what you&apos;re looking for?{" "}
                <Link href="#form" className="text-primary font-medium hover:underline">
                  Send us a message
                </Link>
                .
              </p>
            </div>
          </FadeInUp>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <FadeInUp key={faq.q} delay={index * 0.06}>
                <details className="group rounded-xl border border-border/60 bg-card overflow-hidden">
                  <summary className="flex cursor-pointer items-center justify-between gap-4 p-5 text-sm font-semibold text-foreground transition-colors hover:bg-accent/30 list-none [&::-webkit-details-marker]:hidden">
                    <span className="flex items-center gap-3">
                      <HelpCircle className="h-4 w-4 shrink-0 text-primary" />
                      {faq.q}
                    </span>
                    <span className="shrink-0 rounded-full border border-border p-1 transition-transform group-open:rotate-180">
                      <svg
                        className="h-3 w-3 text-muted-foreground"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </span>
                  </summary>
                  <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed border-t border-border/40 pt-4">
                    {faq.a}
                  </div>
                </details>
              </FadeInUp>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
