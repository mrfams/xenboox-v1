/**
 * Seed blog posts + job postings (marketing content).
 *
 * Idempotent: only writes when `blog_posts` is empty. Reuses the shared
 * demo data that also powers the content router's seedDemoContent mutation.
 *
 * Usage:
 *   cd packages/db && pnpm tsx seed/seed-content.ts
 */
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import { count } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { blogPosts, jobPostings } from "../schema/content";
import { demoPosts, demoJobs } from "./content-demo";

// Load DATABASE_URL from repo .env.local (quoted values supported).
const envContent = readFileSync(
  new URL("../../../.env.local", import.meta.url),
  "utf8",
);
const urlMatch = envContent.match(/^DATABASE_URL="?(.+?)"?\s*$/m);
const url = urlMatch?.[1] ?? process.env.DATABASE_URL;
if (!url) {
  console.error(
    "DATABASE_URL not found. Set it in .env.local or the environment.",
  );
  process.exit(1);
}

const sql = neon(url);
const db = drizzle(sql);

export async function seedContent() {
  const existing = await db.select({ c: count() }).from(blogPosts);
  if ((existing[0]?.c ?? 0) > 0) {
    console.log("content seed: skipped (data exists)");
    return;
  }

  await db.insert(blogPosts).values(demoPosts);
  await db.insert(jobPostings).values(demoJobs);

  console.log(
    `content seed: done (${demoPosts.length} posts, ${demoJobs.length} jobs)`,
  );
}

// Direct-run entry (pnpm tsx seed/seed-content.ts)
// Basename comparison is Windows-safe (new URL() mangles drive-letter paths).
const isDirectRun =
  (import.meta.url.split(/[\\/]/).pop() ?? "") ===
  (process.argv[1]?.split(/[\\/]/).pop() ?? "");
if (isDirectRun) {
  seedContent().catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  });
}
