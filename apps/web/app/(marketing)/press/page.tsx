import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Newspaper,
  Download,
  Mail,
  ExternalLink,
  Globe,
  Shield,
  Zap,
  Users,
  Building2,
  TrendingUp,
  BarChart3,
  Copy,
} from "lucide-react";

import { Section, SectionHeading } from "@/components/marketing/section";
import { BreadcrumbJsonLd } from "@/components/marketing/json-ld";
import { FadeInUp } from "@/components/marketing/reveal";

export const metadata: Metadata = {
  title: "Press & Media | Xenboox",
  description:
    "Press resources, company facts, and media contacts for Xenboox — the AI-native accounting platform.",
  openGraph: {
    title: "Press & Media — Xenboox",
    description:
      "Press resources, company facts, and media contacts for Xenboox.",
    type: "website",
  },
};

const companyFacts = [
  { label: "Founded", value: "2024" },
  { label: "Headquarters", value: "Global (Remote-first)" },
  { label: "AI Agents", value: "19 specialized agents" },
  { label: "Currencies Supported", value: "50+" },
  { label: "Accounting Modules", value: "20+" },
  { label: "Uptime SLA", value: "99.9%" },
  { label: "Security", value: "SOC 2, AES-256, RLS" },
  { label: "Pricing", value: "Free tier + paid plans from $29/mo" },
];

const keyTopics = [
  {
    icon: Zap,
    title: "AI-Native Accounting",
    description:
      "How three-tier AI agent hierarchies are replacing traditional accounting software — and what it means for finance teams worldwide.",
  },
  {
    icon: Globe,
    title: "Emerging Markets Focus",
    description:
      "Why multi-currency, mobile money, and multi-jurisdiction support are critical for the next billion businesses.",
  },
  {
    icon: Shield,
    title: "Financial Data Security",
    description:
      "PostgreSQL row-level security, AES-256 encryption, and complete audit trails — how we protect financial data.",
  },
  {
    icon: Users,
    title: "Future of Finance Teams",
    description:
      "How AI agents are augmenting (not replacing) finance professionals — and what skills matter most.",
  },
];

const pressKit = [
  {
    name: "Xenboox Logo (Dark)",
    description: "Primary logo for dark backgrounds",
    format: "SVG",
  },
  {
    name: "Xenboox Logo (Light)",
    description: "Primary logo for light backgrounds",
    format: "SVG",
  },
  {
    name: "Xenboox Wordmark",
    description: "Text-only wordmark logo",
    format: "SVG",
  },
  {
    name: "Brand Colors",
    description: "Official color palette and usage guidelines",
    format: "PDF",
  },
  {
    name: "Product Screenshots",
    description: "High-resolution product screenshots",
    format: "ZIP",
  },
];

export default function PressPage() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Press", url: "/press" },
        ]}
      />

      {/* Hero */}
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
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-5 py-12 sm:py-16 lg:py-24 text-center">
            <FadeInUp delay={0.05}>
              <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Xenboox in the <span className="text-primary">news</span>
              </h1>
            </FadeInUp>
            <FadeInUp delay={0.1}>
              <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
                Press resources, company facts, and media contacts for
                journalists, analysts, and media professionals covering
                AI-native accounting and fintech.
              </p>
            </FadeInUp>
            <FadeInUp delay={0.15}>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="mailto:press@xenboox.com"
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:shadow-primary/40 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Mail className="h-4 w-4" />
                  Contact Press Team
                </Link>
                <Link
                  href="#press-kit"
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-6 py-3 text-sm font-medium text-foreground transition-all hover:bg-accent/50"
                >
                  <Download className="h-4 w-4" />
                  Download Press Kit
                </Link>
              </div>
            </FadeInUp>
          </div>
        </div>
      </section>

      {/* Company Facts */}
      <Section className="bg-paper-2/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Company Facts"
            title="Xenboox at a glance"
            lead="Key facts and figures for media coverage."
          />

          <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {companyFacts.map((fact, index) => (
              <FadeInUp key={fact.label} delay={index * 0.05}>
                <div className="rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-foreground/5">
                  <p className="text-sm font-medium text-muted-foreground">
                    {fact.label}
                  </p>
                  <p className="mt-1 text-lg font-bold text-foreground">
                    {fact.value}
                  </p>
                </div>
              </FadeInUp>
            ))}
          </div>
        </div>
      </Section>

      {/* Key Topics */}
      <Section className="bg-paper">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Story Angles"
            title="Topics we can speak to"
            lead="Our team is available for commentary on these topics."
          />

          <div className="mt-16 grid gap-6 sm:grid-cols-2">
            {keyTopics.map((topic, index) => (
              <FadeInUp key={topic.title} delay={index * 0.1}>
                <div className="group h-full rounded-2xl border border-border bg-card p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-foreground/5">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <topic.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">
                    {topic.title}
                  </h3>
                  <p className="mt-3 leading-relaxed text-muted-foreground">
                    {topic.description}
                  </p>
                </div>
              </FadeInUp>
            ))}
          </div>
        </div>
      </Section>

      {/* Press Kit */}
      <Section className="bg-paper-2/60" id="press-kit">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Press Kit"
            title="Brand assets"
            lead="Download official logos, colors, and product screenshots."
          />

          <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pressKit.map((asset, index) => (
              <FadeInUp key={asset.name} delay={index * 0.05}>
                <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:shadow-lg hover:shadow-foreground/5">
                  <div>
                    <p className="font-semibold text-foreground">
                      {asset.name}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {asset.description}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="ml-4 shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                    {asset.format}
                  </button>
                </div>
              </FadeInUp>
            ))}
          </div>
        </div>
      </Section>

      {/* Press Contact */}
      <Section className="bg-paper">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <FadeInUp>
              <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                Get in touch
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                For press inquiries, interview requests, or media appearances,
                contact our press team.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <a
                  href="mailto:press@xenboox.com"
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:shadow-primary/40 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Mail className="h-4 w-4" />
                  press@xenboox.com
                </a>
                <a
                  href="https://twitter.com/xenboox"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-6 py-3 text-sm font-medium text-foreground transition-all hover:bg-accent/50"
                >
                  @xenboox
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
              <p className="mt-6 text-sm text-muted-foreground">
                Response time: Within 24 hours for media inquiries
              </p>
            </FadeInUp>
          </div>
        </div>
      </Section>
    </>
  );
}
