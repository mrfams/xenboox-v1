import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  MapPin,
  Briefcase,
  Clock,
  DollarSign,
  Users,
  Building2,
  CheckCircle2,
  Sparkles,
  Send,
} from "lucide-react";
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
      <div className="bg-white border-b border-slate-200">
        <div className="mx-auto max-w-4xl px-4 py-4">
          <Link
            href="/careers"
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Careers
          </Link>
        </div>
      </div>

      {/* Job Header */}
      <article className="bg-white">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
          <FadeInUp>
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                <Briefcase className="h-3 w-3" />
                {job.department}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                <Clock className="h-3 w-3" />
                {job.type}
              </span>
              {job.type === "Internship" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                  Internship
                </span>
              )}
            </div>

            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-900 leading-[1.1]">
              {job.title}
            </h1>

            <div className="mt-6 flex flex-wrap items-center gap-6 text-sm text-slate-600">
              <span className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-slate-400" />
                {job.location}
              </span>
              {job.salary && (
                <span className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-slate-400" />
                  {job.salary}
                </span>
              )}
              {job.teamSize && (
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-slate-400" />
                  {job.teamSize}
                </span>
              )}
              {job.reportsTo && (
                <span className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-slate-400" />
                  Reports to {job.reportsTo}
                </span>
              )}
            </div>

            <div className="mt-8 flex flex-wrap gap-4">
              <a
                href="#apply"
                className="inline-flex h-12 items-center rounded-xl bg-blue-600 px-8 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition-all duration-200 hover:bg-blue-500 hover:shadow-blue-600/30"
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
      <section className="bg-slate-50 border-t border-slate-200">
        <div className="mx-auto max-w-4xl px-4 py-12">
          <div className="grid gap-12 lg:grid-cols-3">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-10">
              {/* Description */}
              <FadeInUp>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-4">
                    About the Role
                  </h2>
                  <p className="text-slate-700 leading-relaxed">
                    {job.description}
                  </p>
                </div>
              </FadeInUp>

              {/* Responsibilities */}
              <FadeInUp delay={0.1}>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-4">
                    What You&apos;ll Do
                  </h2>
                  <ul className="space-y-3">
                    {job.responsibilities.map((item, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
                        <span className="text-slate-700">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </FadeInUp>

              {/* Requirements */}
              <FadeInUp delay={0.2}>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-4">
                    What We&apos;re Looking For
                  </h2>
                  <ul className="space-y-3">
                    {job.requirements.map((item, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <span className="h-5 w-5 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 mt-0.5 shrink-0">
                          {index + 1}
                        </span>
                        <span className="text-slate-700">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </FadeInUp>

              {/* Nice to Have */}
              {job.niceToHave && job.niceToHave.length > 0 && (
                <FadeInUp delay={0.3}>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-4">
                      Nice to Have
                    </h2>
                    <ul className="space-y-3">
                      {job.niceToHave.map((item, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <Sparkles className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                          <span className="text-slate-700">{item}</span>
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
                  <div className="rounded-2xl border border-slate-200 bg-white p-6">
                    <h3 className="font-semibold text-slate-900 mb-4">
                      Benefits & Perks
                    </h3>
                    <ul className="space-y-3">
                      {job.benefits.map((benefit, index) => (
                        <li
                          key={index}
                          className="flex items-center gap-3 text-sm text-slate-600"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Tags Card */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-6">
                    <h3 className="font-semibold text-slate-900 mb-4">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {job.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Application CTA */}
                  <div
                    id="apply"
                    className="rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 p-6 text-white"
                  >
                    <h3 className="font-semibold mb-2">Ready to apply?</h3>
                    <p className="text-sm text-blue-100 mb-4">
                      Send your resume and a brief note about why you&apos;re
                      interested.
                    </p>
                    <a
                      href={`mailto:careers@xenboox.com?subject=Application: ${job.title}&body=Hi team,%0A%0AI'm interested in the ${job.title} role.%0A%0ABest regards`}
                      className="inline-flex w-full items-center justify-center rounded-xl bg-white px-6 py-3 text-sm font-semibold text-blue-600 transition-all hover:bg-blue-50"
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
        <section className="py-16 bg-white border-t border-slate-200">
          <div className="mx-auto max-w-4xl px-4">
            <FadeInUp>
              <h2 className="text-2xl font-bold text-slate-900 mb-8">
                Other Open Positions
              </h2>
            </FadeInUp>
            <div className="space-y-4">
              {relatedJobs.map((relatedJob, index) => (
                <FadeInUp key={relatedJob.id} delay={index * 0.1}>
                  <Link
                    href={`/careers/${relatedJob.slug}`}
                    className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-6 transition-all duration-300 hover:shadow-lg hover:bg-white hover:-translate-y-0.5"
                  >
                    <div>
                      <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {relatedJob.title}
                      </h3>
                      <div className="mt-2 flex items-center gap-4 text-sm text-slate-500">
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
                    <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-blue-600 transition-colors" />
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
