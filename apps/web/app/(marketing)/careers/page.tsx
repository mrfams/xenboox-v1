"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  MapPin,
  Briefcase,
  Clock,
  Search,
  ArrowRight,
  Users,
  Globe,
  Building2,
  Heart,
  Rocket,
  Shield,
  TrendingUp,
  Filter,
  ChevronDown,
  Check,
} from "lucide-react";

import { FadeInUp } from "@/components/marketing/reveal";
import { trpc } from "@/lib/trpc/client";

const departments = [
  "All",
  "Engineering",
  "Product",
  "Design",
  "Marketing",
  "Operations",
  "Customer Success",
  "Finance",
  "Legal",
  "People",
];

const locations = [
  "All",
  "Remote",
  "San Francisco, CA",
  "Dublin, Ireland",
  "Banjul, Gambia",
];

const jobTypes = ["All", "Full-time", "Part-time", "Contract", "Internship"];

const valueProps = [
  {
    icon: Rocket,
    title: "Ship Fast, Ship Safely",
    description:
      "We move quickly but never at the expense of correctness. Every feature ships with audit trails and confidence scoring.",
  },
  {
    icon: Users,
    title: "User Obsession",
    description:
      "Our users aren't a market segment — they're the people we're building for. We talk to them every week.",
  },
  {
    icon: Heart,
    title: "Sustainable Pace",
    description:
      "We're building a decade-long company, not a sprint. We protect deep work, respect boundaries, and invest in growth.",
  },
  {
    icon: Globe,
    title: "Global by Design",
    description:
      "We build for multi-jurisdiction, multi-currency, multi-language from day one. Our team reflects the markets we serve.",
  },
  {
    icon: Shield,
    title: "Radical Transparency",
    description:
      "No black boxes. Our AI explains its reasoning, our code is open to inspection, and our roadmap is public by default.",
  },
  {
    icon: TrendingUp,
    title: "Ownership Mindset",
    description:
      "Every team member runs their domain like a CEO. We hire for judgment, not just execution.",
  },
];

const benefits = [
  "Competitive salary & equity",
  "Flexible remote work",
  "Health & dental insurance",
  "Learning & development budget",
  "Annual team retreats",
  "Home office stipend",
  "Generous PTO",
  "Parental leave",
];

export default function CareersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("All");
  const [selectedLocation, setSelectedLocation] = useState("All");
  const [selectedType, setSelectedType] = useState("All");
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading } = trpc.content.listJobs.useQuery({
    department: selectedDepartment === "All" ? undefined : selectedDepartment,
    location: selectedLocation === "All" ? undefined : selectedLocation,
    type: selectedType === "All" ? undefined : selectedType,
    query: searchQuery || undefined,
  });

  const jobListings = useMemo(() => data ?? [], [data]);

  const filteredJobs = useMemo(() => {
    return jobListings.filter((job) => {
      const matchesSearch =
        searchQuery === "" ||
        job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.tags.some((tag) =>
          tag.toLowerCase().includes(searchQuery.toLowerCase()),
        );

      const matchesDepartment =
        selectedDepartment === "All" || job.department === selectedDepartment;
      const matchesLocation =
        selectedLocation === "All" || job.location === selectedLocation;
      const matchesType = selectedType === "All" || job.type === selectedType;

      return (
        matchesSearch && matchesDepartment && matchesLocation && matchesType
      );
    });
  }, [
    jobListings,
    searchQuery,
    selectedDepartment,
    selectedLocation,
    selectedType,
  ]);

  const activeFiltersCount =
    (selectedDepartment !== "All" ? 1 : 0) +
    (selectedLocation !== "All" ? 1 : 0) +
    (selectedType !== "All" ? 1 : 0);

  const clearFilters = () => {
    setSelectedDepartment("All");
    setSelectedLocation("All");
    setSelectedType("All");
    setSearchQuery("");
  };

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
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
          <FadeInUp>
            <div className="mx-auto max-w-3xl text-center">
              <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Build the future of{" "}
                <span className="text-primary">intelligent accounting</span>
              </h1>
              <p className="mt-6 max-w-2xl mx-auto text-lg leading-relaxed text-muted-foreground">
                Join a team of builders, thinkers, and operators creating the
                AI-native accounting platform that businesses actually need.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-4">
                <a
                  href="#openings"
                  className="inline-flex h-12 items-center rounded-full bg-primary px-8 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/25 transition-all duration-300 hover:shadow-primary/40 hover:scale-[1.02] active:scale-[0.98]"
                >
                  View Open Positions
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
                <a
                  href="#culture"
                  className="inline-flex h-12 items-center rounded-full border border-border bg-card px-8 text-sm font-medium text-foreground transition-all duration-300 hover:bg-accent/50 hover:scale-[1.02] active:scale-[0.98]"
                >
                  Our Culture
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
              { label: "AI Agents", value: "19", icon: Users },
              { label: "Accounting Modules", value: "20", icon: Building2 },
              { label: "Currencies Supported", value: "50+", icon: Globe },
              {
                label: "Open Roles",
                value: `${jobListings.filter((j) => j.isActive).length}`,
                icon: Briefcase,
              },
            ].map((stat, index) => (
              <FadeInUp key={stat.label} delay={index * 0.1}>
                <div>
                  <stat.icon className="h-6 w-6 mx-auto text-primary mb-2" />
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

      {/* Culture / Values */}
      <section id="culture" className="py-12 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <FadeInUp>
            <div className="text-center mb-12">
              <h2 className="text-3xl font-semibold tracking-tight text-foreground">
                How We Work
              </h2>
              <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                Our values shape everything we do — from how we build products
                to how we support each other.
              </p>
            </div>
          </FadeInUp>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {valueProps.map((value, index) => (
              <FadeInUp key={value.title} delay={(index % 3) * 0.1}>
                <div className="group rounded-2xl border border-border/60 bg-card p-6 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:shadow-[0_20px_50px_-20px_rgba(20,33,61,0.15)] hover:-translate-y-1 hover:border-border/40">
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
      </section>

      {/* Benefits */}
      <section className="py-12 sm:py-16 bg-paper-2/60 border-y border-border">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <FadeInUp>
            <div className="text-center mb-12">
              <h2 className="text-3xl font-semibold tracking-tight text-foreground">
                Benefits & Perks
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                We take care of our team so they can do their best work.
              </p>
            </div>
          </FadeInUp>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {benefits.map((benefit, index) => (
              <FadeInUp key={benefit} delay={index * 0.05}>
                <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-4 transition-all duration-300 hover:shadow-md hover:border-border/40">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Check className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-medium text-foreground">
                    {benefit}
                  </span>
                </div>
              </FadeInUp>
            ))}
          </div>
        </div>
      </section>

      {/* Open Positions */}
      <section id="openings" className="py-12 sm:py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <FadeInUp>
            <div className="text-center mb-10">
              <h2 className="text-3xl font-semibold tracking-tight text-foreground">
                Open Positions
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Find a role that matches your skills and ambitions.
              </p>
            </div>
          </FadeInUp>

          {/* Search & Filters */}
          <FadeInUp delay={0.1}>
            <div className="mb-6 space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <label htmlFor="careers-search" className="sr-only">
                  Search careers
                </label>
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="careers-search"
                  type="text"
                  placeholder="Search roles by title, department, or skill..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-border bg-card pl-11 pr-4 py-3 text-sm text-foreground placeholder-muted-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* Filter Toggle */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  aria-expanded={showFilters}
                  aria-label={showFilters ? "Hide filters" : "Show filters"}
                >
                  <Filter className="h-4 w-4" />
                  Filters
                  {activeFiltersCount > 0 && (
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                      {activeFiltersCount}
                    </span>
                  )}
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${showFilters ? "rotate-180" : ""}`}
                  />
                </button>
                {activeFiltersCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-primary hover:underline"
                  >
                    Clear all filters
                  </button>
                )}
              </div>

              {/* Filter Dropdowns */}
              {showFilters && (
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-2">
                      Department
                    </label>
                    <select
                      value={selectedDepartment}
                      onChange={(e) => setSelectedDepartment(e.target.value)}
                      className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                    >
                      {departments.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-2">
                      Location
                    </label>
                    <select
                      value={selectedLocation}
                      onChange={(e) => setSelectedLocation(e.target.value)}
                      className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                    >
                      {locations.map((loc) => (
                        <option key={loc} value={loc}>
                          {loc}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-2">
                      Job Type
                    </label>
                    <select
                      value={selectedType}
                      onChange={(e) => setSelectedType(e.target.value)}
                      className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                    >
                      {jobTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </FadeInUp>

          {/* Results Count */}
          <FadeInUp delay={0.15}>
            <p className="mb-4 text-sm text-muted-foreground">
              {isLoading
                ? "Loading positions..."
                : `Showing ${filteredJobs.length} position${filteredJobs.length !== 1 ? "s" : ""}`}
            </p>
          </FadeInUp>

          {/* Job Listings */}
          <div className="space-y-3">
            {isLoading ? (
              <>
                {[1, 2, 3].map((n) => (
                  <FadeInUp key={n} delay={n * 0.05}>
                    <div className="rounded-2xl border border-border bg-card p-6">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex-1 space-y-3">
                          <div className="h-5 w-48 rounded bg-muted animate-pulse" />
                          <div className="h-4 w-72 rounded bg-muted animate-pulse opacity-60" />
                          <div className="flex gap-4">
                            <div className="h-3 w-20 rounded bg-muted animate-pulse opacity-40" />
                            <div className="h-3 w-24 rounded bg-muted animate-pulse opacity-40" />
                            <div className="h-3 w-16 rounded bg-muted animate-pulse opacity-40" />
                          </div>
                        </div>
                        <div className="h-4 w-20 rounded bg-muted animate-pulse opacity-40" />
                      </div>
                    </div>
                  </FadeInUp>
                ))}
              </>
            ) : filteredJobs.length === 0 ? (
              <FadeInUp>
                <div className="rounded-2xl border border-border bg-card p-12 text-center">
                  <Briefcase className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    No positions found
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Try adjusting your filters or search query.
                  </p>
                  <button
                    onClick={clearFilters}
                    className="text-sm text-primary hover:underline"
                  >
                    Clear all filters
                  </button>
                </div>
              </FadeInUp>
            ) : (
              filteredJobs.map((job, index) => (
                <FadeInUp key={job.id} delay={index * 0.05}>
                  <Link
                    href={`/careers/${job.slug}`}
                    className="group flex flex-col gap-4 rounded-2xl border border-border/60 bg-card p-6 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:shadow-[0_20px_50px_-20px_rgba(20,33,61,0.15)] hover:-translate-y-0.5 hover:border-border/40 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-lg font-semibold text-foreground transition-colors group-hover:text-primary">
                          {job.title}
                        </h3>
                        {job.type === "Internship" && (
                          <span className="inline-flex items-center rounded-full bg-attention-amber/10 px-2 py-0.5 text-[10px] font-bold text-attention-amber uppercase">
                            Intern
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {job.description}
                      </p>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Briefcase className="h-3.5 w-3.5" />
                          {job.department}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5" />
                          {job.location}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          {job.type}
                        </span>
                        {job.salary && (
                          <span className="flex items-center gap-1.5 font-medium text-foreground">
                            {job.salary}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary opacity-0 transition-all group-hover:opacity-100 shrink-0">
                      View role <ArrowRight className="h-4 w-4" />
                    </span>
                  </Link>
                </FadeInUp>
              ))
            )}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 sm:py-16 bg-paper-2/60 border-t border-border">
        <div className="mx-auto max-w-xl px-4 text-center sm:px-6">
          <FadeInUp>
            <h2 className="text-3xl font-semibold tracking-tight text-foreground">
              Don&apos;t see your role?
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              We&apos;re always looking for exceptional people. Send us your CV
              and tell us what you&apos;d build.
            </p>
            <Link
              href="mailto:careers@xenboox.com"
              className="mt-8 inline-flex h-12 items-center rounded-full bg-primary px-8 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/25 transition-all duration-300 hover:shadow-primary/40 hover:scale-[1.02] active:scale-[0.98]"
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
