import "server-only";
import { eq, and, desc, sql } from "drizzle-orm";
import { blogPosts, jobPostings } from "@xenboox/db/schema";
import { db } from "@xenboox/db";

/** Format a Date as "Jan 15, 2025". */
function fmtDate(d: Date | null): string {
  if (!d) return "";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export interface PublicPost {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  date: string;
  readTime: string;
  author: { name: string; role: string };
  tags: string[];
}

export async function getAllPublishedPostSlugs(): Promise<string[]> {
  const rows = await db
    .select({ slug: blogPosts.slug })
    .from(blogPosts)
    .where(eq(blogPosts.status, "published"));
  return rows.map((r) => r.slug);
}

export async function getPostBySlug(slug: string): Promise<PublicPost | null> {
  const [post] = await db
    .select()
    .from(blogPosts)
    .where(and(eq(blogPosts.slug, slug), eq(blogPosts.status, "published")))
    .limit(1);

  if (!post) return null;

  return {
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    content: post.content,
    category: post.category,
    date: fmtDate(post.publishedAt),
    readTime: `${post.readTimeMinutes} min`,
    author: { name: post.authorName, role: post.authorRole },
    tags: post.tags,
  };
}

export async function getRelatedPosts(
  slug: string,
  limit = 3,
): Promise<PublicPost[]> {
  const [current] = await db
    .select({ category: blogPosts.category })
    .from(blogPosts)
    .where(eq(blogPosts.slug, slug))
    .limit(1);

  const rows = current
    ? await db
        .select()
        .from(blogPosts)
        .where(
          and(
            eq(blogPosts.status, "published"),
            sql`${blogPosts.slug} <> ${slug}`,
          ),
        )
        .orderBy(
          sql`CASE WHEN ${blogPosts.category} = ${current.category} THEN 0 ELSE 1 END`,
          desc(blogPosts.publishedAt),
        )
        .limit(limit)
    : await db
        .select()
        .from(blogPosts)
        .where(eq(blogPosts.status, "published"))
        .orderBy(desc(blogPosts.publishedAt))
        .limit(limit);

  return rows.map((p) => ({
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt,
    content: p.content,
    category: p.category,
    date: fmtDate(p.publishedAt),
    readTime: `${p.readTimeMinutes} min`,
    author: { name: p.authorName, role: p.authorRole },
    tags: p.tags,
  }));
}

export interface PublicJob {
  id: string;
  slug: string;
  title: string;
  department: string;
  location: string;
  type: "Full-time" | "Part-time" | "Contract" | "Internship";
  salary?: string | null;
  description: string;
  responsibilities: string[];
  requirements: string[];
  niceToHave?: string[];
  benefits: string[];
  postedDate: string;
  closingDate?: string | null;
  isActive: boolean;
  teamSize?: string | null;
  reportsTo?: string | null;
  tags: string[];
}

export async function getAllActiveJobSlugs(): Promise<string[]> {
  const rows = await db
    .select({ slug: jobPostings.slug })
    .from(jobPostings)
    .where(eq(jobPostings.isActive, true));
  return rows.map((r) => r.slug);
}

export async function getJobBySlug(slug: string): Promise<PublicJob | null> {
  const [job] = await db
    .select()
    .from(jobPostings)
    .where(and(eq(jobPostings.slug, slug), eq(jobPostings.isActive, true)))
    .limit(1);

  if (!job) return null;

  return {
    id: job.id,
    slug: job.slug,
    title: job.title,
    department: job.department,
    location: job.location,
    type: job.type,
    salary: job.salary,
    description: job.description,
    responsibilities: job.responsibilities,
    requirements: job.requirements,
    niceToHave: job.niceToHave,
    benefits: job.benefits,
    postedDate: job.postedDate,
    closingDate: job.closingDate,
    isActive: job.isActive,
    teamSize: job.teamSize,
    reportsTo: job.reportsTo,
    tags: job.tags,
  };
}
export async function getRelatedJobs(
  slug: string,
  limit = 3,
): Promise<
  Array<{
    id: string;
    slug: string;
    title: string;
    department: string;
    location: string;
  }>
> {
  const [current] = await db
    .select({ department: jobPostings.department })
    .from(jobPostings)
    .where(eq(jobPostings.slug, slug))
    .limit(1);

  const rows = current
    ? await db
        .select()
        .from(jobPostings)
        .where(
          and(
            eq(jobPostings.isActive, true),
            sql`${jobPostings.slug} <> ${slug}`,
          ),
        )
        .orderBy(
          sql`CASE WHEN ${jobPostings.department} = ${current.department} THEN 0 ELSE 1 END`,
          desc(jobPostings.createdAt),
        )
        .limit(limit)
    : await db
        .select()
        .from(jobPostings)
        .where(eq(jobPostings.isActive, true))
        .orderBy(desc(jobPostings.createdAt))
        .limit(limit);

  return rows.map((j) => ({
    id: j.id,
    slug: j.slug,
    title: j.title,
    department: j.department,
    location: j.location,
  }));
}
