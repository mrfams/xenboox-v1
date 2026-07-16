import Link from "next/link"
import { ArrowRight, MapPin, Clock, Code, Palette, BarChart3 } from "lucide-react"

const openings = [
  {
    title: "Senior Full-Stack Engineer",
    team: "Engineering",
    location: "Remote",
    type: "Full-time",
    description:
      "Build the core platform — Next.js 15, tRPC, Drizzle ORM, PostgreSQL. You'll work on the web app, API layer, and database schema.",
    icon: Code,
  },
  {
    title: "Mobile Engineer",
    team: "Engineering",
    location: "Remote",
    type: "Full-time",
    description:
      "Own the React Native (Expo) mobile app. Build native features, optimize performance, and ensure offline-first reliability.",
    icon: Code,
  },
  {
    title: "AI/ML Engineer",
    team: "AI",
    location: "Remote",
    type: "Full-time",
    description:
      "Design and improve our LangGraph agent workflows. Fine-tune prompts, build evaluation suites, and optimize LLM costs.",
    icon: BarChart3,
  },
  {
    title: "Product Designer",
    team: "Design",
    location: "Remote",
    type: "Full-time",
    description:
      "Design intuitive interfaces for complex accounting workflows. Balance power with simplicity across web, mobile, and desktop.",
    icon: Palette,
  },
]

const benefits = [
  "Remote-first — work from anywhere",
  "Competitive salary + equity",
  "Health insurance",
  "Unlimited PTO",
  "Learning & development budget",
  "Annual team retreats",
]

export default function CareersPage() {
  return (
    <>
      <section className="border-b py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-bold tracking-tight">Careers</h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Help us build the accounting platform that African businesses deserve. We&apos;re looking for people who care about craft, impact, and doing things right.
            </p>
          </div>
        </div>
      </section>

      {/* Why Xenboox */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-12 md:grid-cols-2">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">
                Why Xenboox?
              </h2>
              <p className="mt-4 text-muted-foreground">
                We&apos;re a small, focused team tackling a massive problem. Accounting software in Africa is stuck in the past — we&apos;re building what comes next.
              </p>
              <p className="mt-4 text-muted-foreground">
                You&apos;ll work on hard problems: AI agent orchestration, multi-currency accounting, offline-first sync, and enterprise security. And you&apos;ll see your work used by real businesses.
              </p>
            </div>
            <div>
              <h3 className="mb-4 text-lg font-semibold">What We Offer</h3>
              <ul className="space-y-3">
                {benefits.map((benefit) => (
                  <li key={benefit} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Open Positions */}
      <section className="border-y bg-muted/30 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="mb-10 text-center text-3xl font-bold tracking-tight">
            Open Positions
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {openings.map((opening) => (
              <div
                key={opening.title}
                className="group flex flex-col rounded-lg border bg-card p-6 transition-colors hover:bg-muted/50"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <opening.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold">{opening.title}</h3>
                <p className="mt-2 flex-1 text-sm text-muted-foreground">
                  {opening.description}
                </p>
                <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <BarChart3 className="h-3 w-3" />
                    {opening.team}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {opening.location}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {opening.type}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-bold tracking-tight">
            Don&apos;t see your role?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            We&apos;re always interested in meeting talented people. Send us your resume.
          </p>
          <div className="mt-8">
            <Link
              href="mailto:careers@xenboox.com"
              className="inline-flex h-12 items-center rounded-md border px-8 text-sm font-medium transition-colors hover:bg-muted"
            >
              Get in Touch
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
