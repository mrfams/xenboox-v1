import Link from "next/link";
import {
  ArrowRight,
  MapPin,
  Clock,
  Code,
  Palette,
  BarChart3,
  Sparkles,
  Heart,
} from "lucide-react";

const openings = [
  {
    title: "Senior Full-Stack Engineer",
    team: "Engineering",
    location: "Remote",
    type: "Full-time",
    description:
      "Build the core platform — Next.js 15, tRPC, Drizzle ORM, PostgreSQL. You'll work on the web app, API layer, and database schema.",
    icon: Code,
    gradient: "from-blue-500 to-indigo-500",
  },
  {
    title: "Mobile Engineer",
    team: "Engineering",
    location: "Remote",
    type: "Full-time",
    description:
      "Own the React Native (Expo) mobile app. Build native features, optimize performance, and ensure offline-first reliability.",
    icon: Code,
    gradient: "from-emerald-500 to-teal-500",
  },
  {
    title: "AI/ML Engineer",
    team: "AI",
    location: "Remote",
    type: "Full-time",
    description:
      "Design and improve our LangGraph agent workflows. Fine-tune prompts, build evaluation suites, and optimize LLM costs.",
    icon: BarChart3,
    gradient: "from-violet-500 to-purple-500",
  },
  {
    title: "Product Designer",
    team: "Design",
    location: "Remote",
    type: "Full-time",
    description:
      "Design intuitive interfaces for complex accounting workflows. Balance power with simplicity across web, mobile, and desktop.",
    icon: Palette,
    gradient: "from-amber-500 to-orange-500",
  },
];

const benefits = [
  "Remote-first — work from anywhere",
  "Competitive salary + equity",
  "Health insurance",
  "Unlimited PTO",
  "Learning & development budget",
  "Annual team retreats",
];

export default function CareersPage() {
  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950">
        <div className="absolute inset-0 bg-grid-dark opacity-30" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm px-4 py-1.5 text-xs font-medium text-white/60">
              <Sparkles className="h-3 w-3 text-blue-400" />
              Careers
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-[1.1]">
              <span className="text-white">Help us build the</span>
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">
                future of accounting
              </span>
            </h1>
            <p className="mt-4 text-lg text-white/50 leading-relaxed max-w-2xl">
              Help us build the accounting platform that African businesses
              deserve. We're looking for people who care about craft, impact,
              and doing things right.
            </p>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </section>

      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">
                Why Xenboox?
              </h2>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                We're a small, focused team tackling a massive problem.
                Accounting software in Africa is stuck in the past — we're
                building what comes next.
              </p>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                You'll work on hard problems: AI agent orchestration,
                multi-currency accounting, offline-first sync, and enterprise
                security. And you'll see your work used by real businesses.
              </p>
            </div>
            <div className="rounded-2xl border bg-gradient-to-br from-slate-50 to-white p-8">
              <div className="flex items-center gap-2 mb-6">
                <Heart className="h-5 w-5 text-red-400" />
                <h3 className="text-lg font-semibold">What We Offer</h3>
              </div>
              <ul className="space-y-4">
                {benefits.map((benefit) => (
                  <li
                    key={benefit}
                    className="flex items-center gap-3 text-sm text-muted-foreground"
                  >
                    <span className="flex h-2 w-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500" />
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y bg-gradient-to-b from-slate-50 to-white py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight">
              Open Positions
            </h2>
            <p className="mt-3 text-muted-foreground">
              Join us in building the accounting platform Africa deserves.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {openings.map((opening) => (
              <div
                key={opening.title}
                className="group relative rounded-2xl border bg-white p-6 md:p-8 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
              >
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${opening.gradient} shadow-sm mb-4`}
                >
                  <opening.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold">{opening.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  {opening.description}
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full border bg-muted/30 px-3 py-1 text-xs font-medium text-muted-foreground">
                    <BarChart3 className="h-3 w-3" />
                    {opening.team}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border bg-muted/30 px-3 py-1 text-xs font-medium text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {opening.location}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border bg-muted/30 px-3 py-1 text-xs font-medium text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {opening.type}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-bold tracking-tight">
            Don't see your role?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            We're always interested in meeting talented people. Send us your
            resume.
          </p>
          <div className="mt-8">
            <Link
              href="mailto:careers@xenboox.com"
              className="group relative inline-flex h-12 items-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-8 text-sm font-medium text-white shadow-lg shadow-blue-600/25 transition-all duration-300 hover:shadow-blue-600/40 hover:scale-105"
            >
              <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-400 to-indigo-400 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-40" />
              <span className="relative flex items-center gap-2">
                Get in Touch
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </span>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
