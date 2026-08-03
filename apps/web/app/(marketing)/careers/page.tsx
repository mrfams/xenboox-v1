import Link from "next/link";
import {
  MapPin,
  Briefcase,
  Clock,
  Users,
  Rocket,
  Heart,
  Coffee,
  Globe,
  ArrowRight,
} from "lucide-react";
import { Section } from "@/components/marketing/section";
import { FadeInUp } from "@/components/marketing/reveal";

const positions = [
  {
    title: "Senior Frontend Engineer",
    department: "Engineering",
    location: "Remote",
    type: "Full-time",
  },
  {
    title: "AI/ML Engineer (Agent Systems)",
    department: "Engineering",
    location: "Remote",
    type: "Full-time",
  },
  {
    title: "Product Designer",
    department: "Product",
    location: "Remote",
    type: "Full-time",
  },
  {
    title: "Customer Success Manager",
    department: "Operations",
    location: "Remote",
    type: "Full-time",
  },
  {
    title: "Accountant / Implementation Specialist",
    department: "Operations",
    location: "Remote",
    type: "Full-time",
  },
  {
    title: "Growth Marketing Lead",
    department: "Marketing",
    location: "Remote",
    type: "Full-time",
  },
];

const values = [
  {
    icon: Rocket,
    title: "Ship Fast, Ship Safely",
    description:
      "We move quickly but never at the expense of financial correctness. Every feature ships with audit trails and confidence scoring.",
  },
  {
    icon: Users,
    title: "User Obsession",
    description:
      "SMEs and accountants aren't a market segment — they're the people we're building for. We talk to them every week.",
  },
  {
    icon: Heart,
    title: "Radical Transparency",
    description:
      "No black boxes. Our AI explains its reasoning, our code is open to inspection, and our roadmap is public by default.",
  },
  {
    icon: Coffee,
    title: "Sustainable Pace",
    description:
      "We're building a decade-long company, not a sprint. We protect deep work, respect boundaries, and invest in our team's growth.",
  },
  {
    icon: Globe,
    title: "Global by Design",
    description:
      "We build for multi-jurisdiction, multi-currency, multi-language from day one. Our team reflects the markets we serve.",
  },
  {
    icon: Briefcase,
    title: "Ownership Mindset",
    description:
      "Every team member runs their domain like a CEO. We hire for judgment, not just execution.",
  },
];

export default function CareersPage() {
  return (
    <>
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
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24">
          <FadeInUp>
            <div className="mx-auto max-w-3xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                Join our team
              </span>
              <h1 className="mt-6 text-4xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Build the future of{" "}
                <span className="text-primary">accounting</span>
              </h1>
              <p className="mt-6 max-w-2xl mx-auto text-lg leading-relaxed text-muted-foreground">
                We&apos;re building the AI-native accounting backbone for SMEs.
                If you want to work on hard, meaningful problems at the
                intersection of fintech and AI, we&apos;d love to hear from you.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-4">
                <a
                  href="#openings"
                  className="inline-flex h-12 items-center rounded-xl bg-primary px-8 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/25 transition-all duration-300 hover:shadow-primary/40 hover:scale-105"
                >
                  View Open Positions
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
                <a
                  href="#culture"
                  className="inline-flex h-12 items-center rounded-xl border border-border bg-card px-8 text-sm font-medium text-foreground transition-all duration-300 hover:bg-accent/50"
                >
                  About Our Culture
                </a>
              </div>
            </div>
          </FadeInUp>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-border bg-paper-2/60">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <div className="grid grid-cols-2 gap-6 text-center md:grid-cols-4">
            {[
              { label: "Team Members", value: "25+" },
              { label: "Nationalities", value: "8" },
              { label: "Countries Served", value: "12" },
              { label: "Open Roles", value: "6" },
            ].map((stat, index) => (
              <FadeInUp key={stat.label} delay={index * 0.1}>
                <div>
                  <p className="text-3xl font-bold text-foreground">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {stat.label}
                  </p>
                </div>
              </FadeInUp>
            ))}
          </div>
        </div>
      </section>

      {/* Culture */}
      <Section id="culture">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <FadeInUp>
            <div className="text-center mb-10">
              <h2 className="text-3xl font-semibold tracking-tight text-foreground">
                Our Culture
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                How we work, what we value, and what you can expect.
              </p>
            </div>
          </FadeInUp>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {values.map((value, index) => (
              <FadeInUp key={value.title} delay={(index % 3) * 0.1}>
                <div className="group rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:shadow-elevated hover:-translate-y-1">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                    <value.icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 font-semibold text-foreground">
                    {value.title}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    {value.description}
                  </p>
                </div>
              </FadeInUp>
            ))}
          </div>
        </div>
      </Section>

      {/* Open Positions */}
      <section
        id="openings"
        className="border-t border-border bg-paper-2/60 py-16 sm:py-20"
      >
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <FadeInUp>
            <div className="text-center mb-10">
              <h2 className="text-3xl font-semibold tracking-tight text-foreground">
                Open Positions
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                We don&apos;t have quotas or application deadlines — if you see
                a role that fits, apply.
              </p>
            </div>
          </FadeInUp>
          <div className="space-y-3">
            {positions.map((position, index) => (
              <FadeInUp key={position.title} delay={index * 0.05}>
                <Link
                  href="#"
                  className="group flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 transition-all duration-300 hover:shadow-elevated hover:-translate-y-0.5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <h3 className="font-semibold text-foreground transition-colors group-hover:text-primary">
                      {position.title}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {position.department}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" /> {position.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" /> {position.type}
                      </span>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-primary opacity-0 transition-all group-hover:opacity-100">
                    Apply now <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </Link>
              </FadeInUp>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-xl px-4 text-center sm:px-6">
          <FadeInUp>
            <h2 className="text-3xl font-semibold tracking-tight text-foreground">
              Don&apos;t see a role that fits?
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              We&apos;re always looking for great people. Send us your CV and
              tell us what you&apos;d build.
            </p>
            <Link
              href="mailto:careers@xenboox.com"
              className="mt-8 inline-flex h-12 items-center rounded-xl bg-primary px-8 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/25 transition-all duration-300 hover:shadow-primary/40 hover:scale-105"
            >
              careers@xenboox.com
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </FadeInUp>
        </div>
      </section>
    </>
  );
}
