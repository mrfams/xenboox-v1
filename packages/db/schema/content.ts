// ─── Content Schema (Blog + Careers) ─────────────────────────────────────
//
// Platform-level marketing content — powers the public /blog and /careers
// pages and their admin editors. NOT entity-scoped: these are company-wide
// pages owned by the admin, mirroring the ops_* tables.

import {
  pgTable,
  text,
  varchar,
  boolean,
  timestamp,
  integer,
  jsonb,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";
import { uuidId, timestamps } from "./helpers";

// ─── Enums ────────────────────────────────────────────────────────────────

export const blogPostStatusEnum = pgEnum("blog_post_status", [
  "draft",
  "published",
  "archived",
]);

export const jobStatusEnum = pgEnum("job_status", ["open", "closed", "draft"]);

export const jobTypeEnum = pgEnum("job_type", [
  "Full-time",
  "Part-time",
  "Contract",
  "Internship",
]);

// ─── Blog Posts ───────────────────────────────────────────────────────────

export const blogPosts = pgTable(
  "blog_posts",
  {
    id: uuidId(),
    ...timestamps,

    slug: varchar("slug", { length: 255 }).notNull().unique(),
    title: varchar("title", { length: 255 }).notNull(),
    excerpt: text("excerpt").notNull(),
    content: text("content").notNull(),
    category: varchar("category", { length: 100 }).notNull().default("Product"),

    status: blogPostStatusEnum("status").notNull().default("draft"),
    featured: boolean("featured").notNull().default(false),

    publishedAt: timestamp("published_at"),
    readTimeMinutes: integer("read_time_minutes").notNull().default(5),

    // Author
    authorName: varchar("author_name", { length: 255 })
      .notNull()
      .default("Xenboox Team"),
    authorRole: varchar("author_role", { length: 255 })
      .notNull()
      .default("Product"),

    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    image: varchar("image", { length: 500 }),

    // Engagement stats (computed/updated by the platform)
    views: integer("views").notNull().default(0),
    comments: integer("comments").notNull().default(0),
  },
  (t) => [
    index("blog_posts_status").on(t.status),
    index("blog_posts_category").on(t.category),
    index("blog_posts_published_at").on(t.publishedAt),
    index("blog_posts_featured").on(t.featured),
  ],
);

// ─── Job Postings ─────────────────────────────────────────────────────────

export const jobPostings = pgTable(
  "job_postings",
  {
    id: uuidId(),
    ...timestamps,

    slug: varchar("slug", { length: 255 }).notNull().unique(),
    title: varchar("title", { length: 255 }).notNull(),
    department: varchar("department", { length: 100 }).notNull(),
    location: varchar("location", { length: 255 }).notNull(),
    type: jobTypeEnum("type").notNull().default("Full-time"),
    salary: varchar("salary", { length: 100 }),

    description: text("description").notNull(),
    responsibilities: jsonb("responsibilities")
      .$type<string[]>()
      .notNull()
      .default([]),
    requirements: jsonb("requirements").$type<string[]>().notNull().default([]),
    niceToHave: jsonb("nice_to_have").$type<string[]>().notNull().default([]),
    benefits: jsonb("benefits").$type<string[]>().notNull().default([]),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),

    status: jobStatusEnum("status").notNull().default("open"),
    isActive: boolean("is_active").notNull().default(true),

    postedDate: varchar("posted_date", { length: 50 }).notNull(),
    closingDate: varchar("closing_date", { length: 50 }),

    teamSize: varchar("team_size", { length: 100 }),
    reportsTo: varchar("reports_to", { length: 255 }),

    applications: integer("applications").notNull().default(0),
  },
  (t) => [
    index("job_postings_status").on(t.status),
    index("job_postings_department").on(t.department),
    index("job_postings_location").on(t.location),
    index("job_postings_active").on(t.isActive),
  ],
);
