import Link from "next/link"
import {
  Bot,
  Globe,
  Shield,
  Users,
  ArrowRight,
} from "lucide-react"

const values = [
  {
    icon: Bot,
    title: "AI-First, Not AI-Added",
    description:
      "We didn't bolt AI onto legacy accounting software. Xenboox was built from the ground up with 19 specialized AI agents at its core.",
  },
  {
    icon: Globe,
    title: "Built for Africa",
    description:
      "African businesses face unique challenges — multi-currency, mobile money, varying tax regimes. We solve for these from day one.",
  },
  {
    icon: Shield,
    title: "Security Without Compromise",
    description:
      "Row-level security, encryption at rest, full audit trails. Enterprise-grade security available to every business, not just the big ones.",
  },
  {
    icon: Users,
    title: "Transparency",
    description:
      "Every AI decision is logged with confidence scores. If an agent isn't sure, it asks — not guesses. You always know what happened and why.",
  },
]

const milestones = [
  {
    year: "2025",
    event: "Founded",
    detail: "Started with a vision to modernize accounting for African businesses.",
  },
  {
    year: "2025",
    event: "Alpha Launch",
    detail: "First 19 AI agents operational. Double-entry ledger, AP/AR, payroll.",
  },
  {
    year: "2026",
    event: "Public Beta",
    detail: "Web, mobile, and desktop apps available. 60+ database tables, 20 modules.",
  },
  {
    year: "2026",
    event: "Production",
    detail: "Full launch with enterprise features, multi-entity support, and SLA guarantees.",
  },
]

export default function AboutPage() {
  return (
    <>
      <section className="border-b py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-bold tracking-tight">
              About Xenboox
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              We&apos;re building the accounting platform that African businesses deserve — AI-native, multi-currency, multi-platform, and accessible to everyone.
            </p>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-12 md:grid-cols-2">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">
                Our Mission
              </h2>
              <p className="mt-4 text-muted-foreground">
                Accounting software hasn&apos;t kept pace with the way businesses actually work in Africa. Multi-currency transactions, mobile money, varying tax regimes, and unreliable connectivity are the norm — not the exception.
              </p>
              <p className="mt-4 text-muted-foreground">
                Xenboox changes that. We&apos;ve built an AI-native platform where 19 specialized agents handle the heavy lifting — from journal entries to payroll to financial reports. Your books stay accurate, compliant, and up-to-date without the manual grind.
              </p>
              <p className="mt-4 text-muted-foreground">
                Available on web, mobile, and desktop. Works online and offline. Priced so that small businesses can access the same tools as enterprises.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border bg-muted/30 p-6">
                <div className="text-3xl font-bold">19</div>
                <div className="mt-1 text-sm text-muted-foreground">AI Agents</div>
              </div>
              <div className="rounded-lg border bg-muted/30 p-6">
                <div className="text-3xl font-bold">20</div>
                <div className="mt-1 text-sm text-muted-foreground">Modules</div>
              </div>
              <div className="rounded-lg border bg-muted/30 p-6">
                <div className="text-3xl font-bold">3</div>
                <div className="mt-1 text-sm text-muted-foreground">Platforms</div>
              </div>
              <div className="rounded-lg border bg-muted/30 p-6">
                <div className="text-3xl font-bold">60+</div>
                <div className="mt-1 text-sm text-muted-foreground">Database Tables</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="border-y bg-muted/30 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="mb-12 text-center text-3xl font-bold tracking-tight">
            What We Believe
          </h2>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((value) => (
              <div key={value.title} className="rounded-lg border bg-card p-6">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <value.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold">{value.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="mb-12 text-center text-3xl font-bold tracking-tight">
            Our Journey
          </h2>
          <div className="space-y-8">
            {milestones.map((milestone, i) => (
              <div key={i} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
                    {milestone.year}
                  </div>
                  {i < milestones.length - 1 && (
                    <div className="mt-2 h-full w-px bg-border" />
                  )}
                </div>
                <div className="pb-8">
                  <h3 className="font-semibold">{milestone.event}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {milestone.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t bg-muted/30 py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-bold tracking-tight">
            Join us on the journey
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            We&apos;re building the future of accounting for Africa. Come along.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link
              href="/register"
              className="inline-flex h-12 items-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
            >
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
