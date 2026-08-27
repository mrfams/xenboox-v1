import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  MapPin,
  Briefcase,
  DollarSign,
  Users,
  Building2,
  CheckCircle2,
  Sparkles,
  Send,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";

import { FadeInUp } from "@/components/marketing/reveal";
import { ShareButton } from "@/components/marketing/share-button";
import {
  getAllActiveJobSlugs,
  getJobBySlug,
  getRelatedJobs,
} from "@/lib/content-server";

// Generate static paths for all job listings
export async function generateStaticParams() {
  const slugs = await getAllActiveJobSlugs();
  return slugs.map((slug) => ({ slug }));
}

// Generate metadata for SEO
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const job = await getJobBySlug(slug);
  if (!job) return { title: "Job Not Found" };

  return {
    title: `${job.title} | Xenboox Careers`,
    description: job.description,
    openGraph: {
      title: job.title,
      description: job.description,
      type: "website",
    },
  };
}

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const job = await getJobBySlug(slug);

  if (!job) {
    notFound();
  }

  const relatedJobs = await getRelatedJobs(job.slug, 3);

  return (
    <>
      {/* Back Link */}
      <div className="bg-card border-b border-border">
        <div className="mx-auto max-w-4xl px-4 py-4">
          <Link
            href="/careers"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Careers
          </Link>
        </div>
      </div>

      {/* Job Header */}
      <article className="bg-card">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
          <FadeInUp>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground leading-[1.1]">
              {job.title}
            </h1>

            <div className="mt-6 flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground/60" />
                {job.location}
              </span>
              {job.salary && (
                <span className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground/60" />
                  {job.salary}
                </span>
              )}
              {job.teamSize && (
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground/60" />
                  {job.teamSize}
                </span>
              )}
              {job.reportsTo && (
                <span className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground/60" />
                  Reports to {job.reportsTo}
                </span>
              )}
            </div>

            <div className="mt-8 flex flex-wrap gap-4">
              <a
                href="#apply"
                className="inline-flex h-12 items-center rounded-full bg-primary px-8 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all duration-300 hover:shadow-primary/40 hover:scale-[1.02] active:scale-[0.98]"
              >
                <Send className="mr-2 h-4 w-4" />
                Apply Now
              </a>
              <ShareButton title={job.title} label="Share Job" />
            </div>
          </FadeInUp>
        </div>
      </article>

      {/* Job Content */}
      <section className="bg-paper-2/60 border-t border-border">
        <div className="mx-auto max-w-4xl px-4 py-12">
          <div className="grid gap-12 lg:grid-cols-3">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-10">
              {/* Description */}
              <FadeInUp>
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-4">
                    About the Role
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">
                    {job.description}
                  </p>
                </div>
              </FadeInUp>

              {/* Responsibilities */}
              <FadeInUp delay={0.1}>
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-4">
                    What You&apos;ll Do
                  </h2>
                  <ul className="space-y-3">
                    {job.responsibilities.map((item, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                        <span className="text-muted-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </FadeInUp>

              {/* Requirements */}
              <FadeInUp delay={0.2}>
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-4">
                    What We&apos;re Looking For
                  </h2>
                  <ul className="space-y-3">
                    {job.requirements.map((item, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <span className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground mt-0.5 shrink-0">
                          {index + 1}
                        </span>
                        <span className="text-muted-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </FadeInUp>

              {/* Nice to Have */}
              {job.niceToHave && job.niceToHave.length > 0 && (
                <FadeInUp delay={0.3}>
                  <div>
                    <h2 className="text-2xl font-bold text-foreground mb-4">
                      Nice to Have
                    </h2>
                    <ul className="space-y-3">
                      {job.niceToHave.map((item, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <Sparkles className="h-5 w-5 text-attention-amber mt-0.5 shrink-0" />
                          <span className="text-muted-foreground">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </FadeInUp>
              )}
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <FadeInUp delay={0.1}>
                <div className="sticky top-24 space-y-6">
                  {/* Benefits Card */}
                  <div className="rounded-2xl border border-border bg-card p-6">
                    <h3 className="font-semibold text-foreground mb-4">
                      Benefits & Perks
                    </h3>
                    <ul className="space-y-3">
                      {job.benefits.map((benefit, index) => (
                        <li
                          key={index}
                          className="flex items-center gap-3 text-sm text-muted-foreground"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Tags Card */}
                  <div className="rounded-2xl border border-border bg-card p-6">
                    <h3 className="font-semibold text-foreground mb-4">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {job.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Application CTA */}
                  <div
                    id="apply"
                    className="rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-6 text-primary-foreground"
                  >
                    <h3 className="font-semibold mb-2">Ready to apply?</h3>
                    <p className="text-sm opacity-90 mb-4">
                      Send your resume and a brief note about why you&apos;re
                      interested.
                    </p>
                    <a
                      href={`mailto:careers@xenboox.com?subject=Application: ${job.title}&body=Hi team,%0A%0AI'm interested in the ${job.title} role.%0A%0ABest regards`}
                      className="inline-flex w-full items-center justify-center rounded-xl bg-card px-6 py-3 text-sm font-semibold text-primary transition-all hover:bg-card/90"
                    >
                      <Send className="mr-2 h-4 w-4" />
                      Apply via Email
                    </a>
                  </div>
                </div>
              </FadeInUp>
            </div>
          </div>
        </div>
      </section>

      {/* Related Jobs */}
      {relatedJobs.length > 0 && (
        <section className="py-16 bg-card border-t border-border">
          <div className="mx-auto max-w-4xl px-4">
            <FadeInUp>
              <h2 className="text-2xl font-bold text-foreground mb-8">
                Other Open Positions
              </h2>
            </FadeInUp>
            <div className="space-y-4">
              {relatedJobs.map((relatedJob, index) => (
                <FadeInUp key={relatedJob.id} delay={index * 0.1}>
                  <Link
                    href={`/careers/${relatedJob.slug}`}
                    className="group flex items-center justify-between rounded-2xl border border-border bg-paper-2/60 p-6 transition-all duration-300 hover:shadow-elevated hover:bg-card hover:-translate-y-0.5"
                  >
                    <div>
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {relatedJob.title}
                      </h3>
                      <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Briefcase className="h-3.5 w-3.5" />
                          {relatedJob.department}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {relatedJob.location}
                        </span>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </Link>
                </FadeInUp>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
