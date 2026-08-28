/**
 * Add placeholder images to existing seed blog posts.
 *
 * Run: pnpm tsx packages/db/seed/add-blog-images.ts
 *
 * Uses picsum.photos with seed-based URLs for deterministic images.
 */

import { db } from "../drizzle";
import { blogPosts } from "../schema/content";
import { eq } from "drizzle-orm";

const imageMap: Record<string, string> = {
  "introducing-ai-accounting":
    "https://picsum.photos/seed/xenboox-ai-accounting/1200/630",
  "why-traditional-accounting-fails":
    "https://picsum.photos/seed/xenboox-traditional-fails/1200/630",
  "building-ai-agents":
    "https://picsum.photos/seed/xenboox-ai-agents/1200/630",
  "multi-currency-support":
    "https://picsum.photos/seed/xenboox-multi-currency/1200/630",
  "security-best-practices":
    "https://picsum.photos/seed/xenboox-security/1200/630",
  "getting-started-guide":
    "https://picsum.photos/seed/xenboox-getting-started/1200/630",
};

async function main() {
  console.log("Adding placeholder images to blog posts...\n");

  for (const [slug, image] of Object.entries(imageMap)) {
    const result = await db
      .update(blogPosts)
      .set({ image })
      .where(eq(blogPosts.slug, slug))
      .returning({ id: blogPosts.id, title: blogPosts.title });

    if (result.length > 0) {
      console.log(`  ✓ ${result[0].title}`);
      console.log(`    → ${image}`);
    } else {
      console.log(`  ✗ No post found with slug "${slug}"`);
    }
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
