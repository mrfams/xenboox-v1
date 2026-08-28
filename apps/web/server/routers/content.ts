import { z } from "zod";
import { eq, and, desc, count, sql } from "drizzle-orm";
import { blogPosts, jobPostings } from "@xenboox/db/schema";
import { db } from "@xenboox/db";

import { demoPosts, demoJobs } from "@xenboox/db/seed/content-demo";

import {
  router,
  publicProcedure,
  adminProtectedProcedure,
} from "@/lib/trpc/server";

// ─── Shared input schemas ─────────────────────────────────────────────────

const postInput = z.object({
  slug: z.string().min(1).max(255),
  title: z.string().min(1).max(255),
  excerpt: z.string().min(1),
  content: z.string().min(1),
  category: z.string().max(100).default("Product"),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  featured: z.boolean().default(false),
  publishedAt: z.date().nullable().optional(),
  readTimeMinutes: z.number().int().min(1).default(5),
  authorName: z.string().max(255).default("Xenboox Team"),
  authorRole: z.string().max(255).default("Product"),
  tags: z.array(z.string()).default([]),
  image: z.string().max(500).nullable().optional(),
});

const jobInput = z.object({
  slug: z.string().min(1).max(255),
  title: z.string().min(1).max(255),
  department: z.string().min(1).max(100),
  location: z.string().min(1).max(255),
  type: z.enum(["Full-time", "Part-time", "Contract", "Internship"]),
  salary: z.string().max(100).nullable().optional(),
  description: z.string().min(1),
  responsibilities: z.array(z.string()).default([]),
  requirements: z.array(z.string()).default([]),
  niceToHave: z.array(z.string()).default([]),
  benefits: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  status: z.enum(["open", "closed", "draft"]).default("open"),
  isActive: z.boolean().default(true),
  postedDate: z.string().max(50),
  closingDate: z.string().max(50).nullable().optional(),
  teamSize: z.string().max(100).nullable().optional(),
  reportsTo: z.string().max(255).nullable().optional(),
});

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// ─── Router ───────────────────────────────────────────────────────────────

export const contentRouter = router({
  // ── Public: Blog ────────────────────────────────────────────────────────

  listPosts: publicProcedure
    .input(
      z
        .object({
          category: z.string().optional(),
          query: z.string().optional(),
          limit: z.number().int().min(1).max(100).default(50),
        })
        .default({}),
    )
    .query(async ({ input }) => {
      const { category, query, limit } = input;

      const conditions = [eq(blogPosts.status, "published")];
      if (category && category !== "All") {
        conditions.push(eq(blogPosts.category, category));
      }
      if (query) {
        conditions.push(
          sql`(${blogPosts.title} ILIKE ${`%${query}%`} OR ${blogPosts.excerpt} ILIKE ${`%${query}%`})`,
        );
      }

      const rows = await db
        .select()
        .from(blogPosts)
        .where(and(...conditions))
        .orderBy(desc(blogPosts.publishedAt), desc(blogPosts.createdAt))
        .limit(limit);

      const [featuredResult] = await db
        .select({ count: count() })
        .from(blogPosts)
        .where(
          and(eq(blogPosts.status, "published"), eq(blogPosts.featured, true)),
        );

      return {
        posts: rows.map((p) => ({
          id: p.id,
          slug: p.slug,
          title: p.title,
          excerpt: p.excerpt,
          content: p.content,
          category: p.category,
          status: p.status,
          featured: p.featured,
          publishedAt: p.publishedAt,
          readTime: `${p.readTimeMinutes} min`,
          author: { name: p.authorName, role: p.authorRole },
          tags: p.tags,
          image: p.image,
          date: p.publishedAt
            ? new Date(p.publishedAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            : "",
        })),
        featuredCount: featuredResult?.count ?? 0,
      };
    }),

  getPostBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const [post] = await db
        .select()
        .from(blogPosts)
        .where(
          and(
            eq(blogPosts.slug, input.slug),
            eq(blogPosts.status, "published"),
          ),
        )
        .limit(1);

      if (!post) return null;

      return {
        id: post.id,
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        content: post.content,
        category: post.category,
        status: post.status,
        featured: post.featured,
        publishedAt: post.publishedAt,
        readTime: `${post.readTimeMinutes} min`,
        author: { name: post.authorName, role: post.authorRole },
        tags: post.tags,
        date: post.publishedAt
          ? new Date(post.publishedAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          : "",
      };
    }),

  getRelatedPosts: publicProcedure
    .input(z.object({ slug: z.string(), limit: z.number().int().default(3) }))
    .query(async ({ input }) => {
      const [current] = await db
        .select({ category: blogPosts.category })
        .from(blogPosts)
        .where(eq(blogPosts.slug, input.slug))
        .limit(1);

      const rows = current
        ? await db
            .select()
            .from(blogPosts)
            .where(
              and(
                eq(blogPosts.status, "published"),
                sql`${blogPosts.slug} <> ${input.slug}`,
              ),
            )
            .orderBy(
              sql`CASE WHEN ${blogPosts.category} = ${current.category} THEN 0 ELSE 1 END`,
              desc(blogPosts.publishedAt),
            )
            .limit(input.limit)
        : await db
            .select()
            .from(blogPosts)
            .where(eq(blogPosts.status, "published"))
            .orderBy(desc(blogPosts.publishedAt))
            .limit(input.limit);

      return rows.map((p) => ({
        id: p.id,
        slug: p.slug,
        title: p.title,
        excerpt: p.excerpt,
        category: p.category,
        readTime: `${p.readTimeMinutes} min`,
        date: p.publishedAt
          ? new Date(p.publishedAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          : "",
      }));
    }),

  // ── Public: Careers ─────────────────────────────────────────────────────

  listJobs: publicProcedure
    .input(
      z
        .object({
          department: z.string().optional(),
          location: z.string().optional(),
          type: z.string().optional(),
          query: z.string().optional(),
        })
        .default({}),
    )
    .query(async ({ input }) => {
      const { department, location, type, query } = input;

      const conditions = [eq(jobPostings.isActive, true)];
      if (department && department !== "All") {
        conditions.push(eq(jobPostings.department, department));
      }
      if (location && location !== "All") {
        conditions.push(eq(jobPostings.location, location));
      }
      if (type && type !== "All") {
        conditions.push(eq(jobPostings.type, type as JobPostingType));
      }
      if (query) {
        conditions.push(
          sql`(${jobPostings.title} ILIKE ${`%${query}%`} OR ${jobPostings.department} ILIKE ${`%${query}%`} OR ${jobPostings.location} ILIKE ${`%${query}%`})`,
        );
      }

      const rows = await db
        .select()
        .from(jobPostings)
        .where(and(...conditions))
        .orderBy(desc(jobPostings.createdAt));

      return rows.map((j) => ({
        id: j.id,
        slug: j.slug,
        title: j.title,
        department: j.department,
        location: j.location,
        type: j.type,
        salary: j.salary,
        description: j.description,
        responsibilities: j.responsibilities,
        requirements: j.requirements,
        niceToHave: j.niceToHave,
        benefits: j.benefits,
        tags: j.tags,
        postedDate: j.postedDate,
        closingDate: j.closingDate,
        isActive: j.isActive,
        teamSize: j.teamSize,
        reportsTo: j.reportsTo,
      }));
    }),

  getJobBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const [job] = await db
        .select()
        .from(jobPostings)
        .where(
          and(eq(jobPostings.slug, input.slug), eq(jobPostings.isActive, true)),
        )
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
        tags: job.tags,
        postedDate: job.postedDate,
        closingDate: job.closingDate,
        isActive: job.isActive,
        teamSize: job.teamSize,
        reportsTo: job.reportsTo,
      };
    }),

  getRelatedJobs: publicProcedure
    .input(z.object({ slug: z.string(), limit: z.number().int().default(3) }))
    .query(async ({ input }) => {
      const [current] = await db
        .select({ department: jobPostings.department })
        .from(jobPostings)
        .where(eq(jobPostings.slug, input.slug))
        .limit(1);

      const rows = current
        ? await db
            .select()
            .from(jobPostings)
            .where(
              and(
                eq(jobPostings.isActive, true),
                sql`${jobPostings.slug} <> ${input.slug}`,
              ),
            )
            .orderBy(
              sql`CASE WHEN ${jobPostings.department} = ${current.department} THEN 0 ELSE 1 END`,
              desc(jobPostings.createdAt),
            )
            .limit(input.limit)
        : await db
            .select()
            .from(jobPostings)
            .where(eq(jobPostings.isActive, true))
            .orderBy(desc(jobPostings.createdAt))
            .limit(input.limit);

      return rows.map((j) => ({
        id: j.id,
        slug: j.slug,
        title: j.title,
        department: j.department,
        location: j.location,
      }));
    }),

  // ── Admin: Blog CRUD ────────────────────────────────────────────────────

  adminListPosts: adminProtectedProcedure
    .input(
      z
        .object({
          status: z.string().optional(),
          query: z.string().optional(),
        })
        .default({}),
    )
    .query(async ({ input }) => {
      const conditions = [];
      if (input.status && input.status !== "All") {
        conditions.push(
          eq(
            blogPosts.status,
            input.status as (typeof blogPosts.$inferSelect)["status"],
          ),
        );
      }
      if (input.query) {
        conditions.push(
          sql`(${blogPosts.title} ILIKE ${`%${input.query}%`} OR ${blogPosts.excerpt} ILIKE ${`%${input.query}%`})`,
        );
      }

      const rows = await db
        .select()
        .from(blogPosts)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(blogPosts.updatedAt));

      const [totalResult] = await db.select({ count: count() }).from(blogPosts);
      const [publishedResult] = await db
        .select({ count: count() })
        .from(blogPosts)
        .where(eq(blogPosts.status, "published"));

      return {
        posts: rows,
        stats: {
          total: totalResult?.count ?? 0,
          published: publishedResult?.count ?? 0,
          drafts: rows.filter((p) => p.status === "draft").length,
          views: rows.reduce((sum, p) => sum + p.views, 0),
          comments: rows.reduce((sum, p) => sum + p.comments, 0),
        },
      };
    }),

  adminCreatePost: adminProtectedProcedure
    .input(postInput)
    .mutation(async ({ input }) => {
      const slug = input.slug || slugify(input.title);
      const publishedAt =
        input.status === "published" ? (input.publishedAt ?? new Date()) : null;

      const [post] = await db
        .insert(blogPosts)
        .values({
          slug,
          title: input.title,
          excerpt: input.excerpt,
          content: input.content,
          category: input.category,
          status: input.status,
          featured: input.featured,
          publishedAt,
          readTimeMinutes: input.readTimeMinutes,
          authorName: input.authorName,
          authorRole: input.authorRole,
          tags: input.tags,
          image: input.image ?? null,
        })
        .returning();

      return post;
    }),

  adminUpdatePost: adminProtectedProcedure
    .input(z.object({ id: z.string().uuid(), data: postInput.partial() }))
    .mutation(async ({ input }) => {
      const patch: Record<string, unknown> = { ...input.data };

      if (input.data.slug !== undefined && input.data.slug === "") {
        patch.slug = slugify(input.data.title ?? "");
      }
      if (input.data.status !== undefined) {
        patch.publishedAt =
          input.data.status === "published"
            ? (input.data.publishedAt ?? new Date())
            : null;
      }
      patch.updatedAt = new Date();

      const [post] = await db
        .update(blogPosts)
        .set(patch)
        .where(eq(blogPosts.id, input.id))
        .returning();

      return post;
    }),

  adminDeletePost: adminProtectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      await db.delete(blogPosts).where(eq(blogPosts.id, input.id));
      return { ok: true };
    }),

  // ── Admin: Careers CRUD ─────────────────────────────────────────────────

  adminListJobs: adminProtectedProcedure
    .input(
      z
        .object({
          department: z.string().optional(),
          status: z.string().optional(),
          query: z.string().optional(),
        })
        .default({}),
    )
    .query(async ({ input }) => {
      const conditions = [];
      if (input.department && input.department !== "All") {
        conditions.push(eq(jobPostings.department, input.department));
      }
      if (input.status && input.status !== "All") {
        if (input.status === "Active")
          conditions.push(eq(jobPostings.isActive, true));
        if (input.status === "Inactive")
          conditions.push(eq(jobPostings.isActive, false));
      }
      if (input.query) {
        conditions.push(
          sql`(${jobPostings.title} ILIKE ${`%${input.query}%`} OR ${jobPostings.department} ILIKE ${`%${input.query}%`})`,
        );
      }

      const rows = await db
        .select()
        .from(jobPostings)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(jobPostings.updatedAt));

      const departments = await db
        .selectDistinct({ department: jobPostings.department })
        .from(jobPostings);

      return {
        jobs: rows,
        departments: departments.map((d) => d.department).sort(),
        stats: {
          total: rows.length,
          active: rows.filter((j) => j.isActive).length,
          applications: rows.reduce((sum, j) => sum + j.applications, 0),
          departmentCount: departments.length,
        },
      };
    }),

  adminCreateJob: adminProtectedProcedure
    .input(jobInput)
    .mutation(async ({ input }) => {
      const slug = input.slug || slugify(input.title);

      const [job] = await db
        .insert(jobPostings)
        .values({
          slug,
          title: input.title,
          department: input.department,
          location: input.location,
          type: input.type,
          salary: input.salary ?? null,
          description: input.description,
          responsibilities: input.responsibilities,
          requirements: input.requirements,
          niceToHave: input.niceToHave,
          benefits: input.benefits,
          tags: input.tags,
          status: input.status,
          isActive: input.isActive,
          postedDate: input.postedDate,
          closingDate: input.closingDate ?? null,
          teamSize: input.teamSize ?? null,
          reportsTo: input.reportsTo ?? null,
        })
        .returning();

      return job;
    }),

  adminUpdateJob: adminProtectedProcedure
    .input(z.object({ id: z.string().uuid(), data: jobInput.partial() }))
    .mutation(async ({ input }) => {
      const patch: Record<string, unknown> = { ...input.data };
      if (input.data.slug !== undefined && input.data.slug === "") {
        patch.slug = slugify(input.data.title ?? "");
      }
      patch.updatedAt = new Date();

      const [job] = await db
        .update(jobPostings)
        .set(patch)
        .where(eq(jobPostings.id, input.id))
        .returning();

      return job;
    }),

  adminDeleteJob: adminProtectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      await db.delete(jobPostings).where(eq(jobPostings.id, input.id));
      return { ok: true };
    }),

  // ── Admin: Seed demo content ────────────────────────────────────────────

  seedDemoContent: adminProtectedProcedure.mutation(async () => {
    const [existing] = await db.select({ count: count() }).from(blogPosts);
    if ((existing?.count ?? 0) > 0) {
      return { seeded: false, reason: "Content already exists" };
    }

    await db.insert(blogPosts).values(demoPosts);
    await db.insert(jobPostings).values(demoJobs);

    return { seeded: true, posts: demoPosts.length, jobs: demoJobs.length };
  }),
});

// Local type alias (avoids importing the schema enum type)
type JobPostingType = "Full-time" | "Part-time" | "Contract" | "Internship";
