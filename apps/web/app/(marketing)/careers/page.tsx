import Link from "next/link";
import { MarketingHero } from "@/components/marketing/hero";
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

const positions = [
  {
    title: "Senior Frontend Engineer",
    department: "Engineering",
    location: "Accra, Ghana / Remote",
    type: "Full-time",
  },
  {
    title: "AI/ML Engineer (Agent Systems)",
    department: "Engineering",
    location: "Lagos, Nigeria / Remote",
    type: "Full-time",
  },
  {
    title: "Product Designer",
    department: "Product",
    location: "Remote (Africa-based)",
    type: "Full-time",
  },
  {
    title: "Customer Success Manager",
    department: "Operations",
    location: "Nairobi, Kenya",
    type: "Full-time",
  },
  {
    title: "Accountant / Implementation Specialist",
    department: "Operations",
    location: "Accra, Ghana",
    type: "Full-time",
  },
  {
    title: "Growth Marketing Lead",
    department: "Marketing",
    location: "Remote (Africa-based)",
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
      "African SMEs and accountants aren't a market segment — they're the people we're building for. We talk to them every week.",
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
    title: "Pan-African by Design",
    description:
      "We build for multi-jurisdiction, multi-currency, multi-language from day one. Our team reflects the continent we serve.",
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
      <MarketingHero
        title="Join the Team"
        description="We're building the AI-native accounting backbone for Africa. If you want to work on hard, meaningful problems at the intersection of fintech and AI, we'd love to hear from you."
        cta={{ label: "View Open Positions", href: "#openings" }}
        secondaryCta={{ label: "About Our Culture", href: "#culture" }}
      />

      {/* Stats */}
      <section className="border-b bg-white py-10">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid grid-cols-2 gap-6 text-center md:grid-cols-4">
            {[
              { label: "Team Members", value: "25+" },
              { label: "Nationalities", value: "8" },
              { label: "Countries Served", value: "12" },
              { label: "Open Roles", value: "6" },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-2xl font-bold text-slate-900">
                  {stat.value}
                </p>
                <p className="mt-1 text-sm text-slate-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Culture */}
      <section id="culture" className="py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-bold text-slate-900">Our Culture</h2>
            <p className="mt-2 text-sm text-slate-500">
              How we work, what we value, and what you can expect.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {values.map((value) => {
              const Icon = value.icon;
              return (
                <div
                  key={value.title}
                  className="rounded-xl border bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-3 font-semibold text-slate-900">
                    {value.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
                    {value.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Open Positions */}
      <section id="openings" className="border-t bg-slate-50 py-16">
        <div className="mx-auto max-w-4xl px-4">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-slate-900">
              Open Positions
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              We don't have quotas or application deadlines — if you see a role
              that fits, apply.
            </p>
          </div>
          <div className="space-y-3">
            {positions.map((position) => (
              <Link
                key={position.title}
                href="#"
                className="group flex flex-col gap-3 rounded-xl border bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <h3 className="font-semibold text-slate-900 transition-colors group-hover:text-blue-600">
                    {position.title}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {position.department}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" /> {position.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> {position.type}
                    </span>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 opacity-0 transition-all group-hover:opacity-100">
                  Apply now <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="mx-auto max-w-xl px-4 text-center">
          <h2 className="text-2xl font-bold text-slate-900">
            Don't see a role that fits?
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            We're always looking for great people. Send us your CV and tell us
            what you'd build.
          </p>
          <Link
            href="mailto:careers@xenboox.com"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition-all duration-200 hover:bg-blue-500 active:scale-[0.98]"
          >
            careers@xenboox.com <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </>
  );
}
