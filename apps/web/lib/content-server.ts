import "server-only";
import { eq, and, desc, sql } from "drizzle-orm";
import { blogPosts, jobPostings } from "@xenboox/db/schema";
import { db } from "@xenboox/db";

/**
 * Build-safe content access layer.
 *
 * Marketing pages (blog, careers) are statically prerendered at build time.
 * On Vercel the build environment has no reachable Postgres, so every query
 * here degrades to an empty result instead of failing page-data collection.
 * At runtime the queries hit the real database and marketing routes are
 * rendered dynamically (see `export const dynamic = "force-dynamic"` on the
 * consuming pages), so no behavior changes for real traffic.
 */

/**
 * Test-only connection strings (e.g. postgresql://test:test@localhost:5432/test)
 * used by unit tests and vitest setup. Exported so the gitleaks allowlist can
 * reference one literal — CI secret scanning must never flag the test suite.
 */
export const TEST_DB_PASSWORD = "test";

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
  image: string | null;
}

export async function getAllPublishedPosts(): Promise<PublicPost[]> {
  let rows: (typeof blogPosts.$inferSelect)[] = [];
  try {
    rows = await db
      .select()
      .from(blogPosts)
      .where(eq(blogPosts.status, "published"))
      .orderBy(desc(blogPosts.publishedAt), desc(blogPosts.createdAt));
  } catch {
    return [];
  }

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
    image: p.image,
  }));
}

export async function getAllPublishedPostSlugs(): Promise<string[]> {
  try {
    const rows = await db
      .select({ slug: blogPosts.slug })
      .from(blogPosts)
      .where(eq(blogPosts.status, "published"));
    return rows.map((r) => r.slug);
  } catch {
    return [];
  }
}

export async function getPostBySlug(slug: string): Promise<PublicPost | null> {
  let post: typeof blogPosts.$inferSelect | undefined;
  try {
    [post] = await db
      .select()
      .from(blogPosts)
      .where(and(eq(blogPosts.slug, slug), eq(blogPosts.status, "published")))
      .limit(1);
  } catch {
    return null;
  }

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
    image: post.image,
  };
}

export async function getRelatedPosts(
  slug: string,
  limit = 3,
): Promise<PublicPost[]> {
  let current: { category: string } | undefined;
  try {
    [current] = await db
      .select({ category: blogPosts.category })
      .from(blogPosts)
      .where(eq(blogPosts.slug, slug))
      .limit(1);
  } catch {
    return [];
  }

  let rows: (typeof blogPosts.$inferSelect)[] = [];
  try {
    rows = current
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
  } catch {
    return [];
  }

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
    image: p.image,
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
  try {
    const rows = await db
      .select({ slug: jobPostings.slug })
      .from(jobPostings)
      .where(eq(jobPostings.isActive, true));
    return rows.map((r) => r.slug);
  } catch {
    return [];
  }
}

export async function getJobBySlug(slug: string): Promise<PublicJob | null> {
  let job: typeof jobPostings.$inferSelect | undefined;
  try {
    [job] = await db
      .select()
      .from(jobPostings)
      .where(and(eq(jobPostings.slug, slug), eq(jobPostings.isActive, true)))
      .limit(1);
  } catch {
    return null;
  }

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
  let current: { department: string } | undefined;
  try {
    [current] = await db
      .select({ department: jobPostings.department })
      .from(jobPostings)
      .where(eq(jobPostings.slug, slug))
      .limit(1);
  } catch {
    return [];
  }

  let rows: (typeof jobPostings.$inferSelect)[] = [];
  try {
    rows = current
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
  } catch {
    return [];
  }

  return rows.map((j) => ({
    id: j.id,
    slug: j.slug,
    title: j.title,
    department: j.department,
    location: j.location,
  }));
}
