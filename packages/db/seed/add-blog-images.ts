/**
 * Add placeholder images to existing seed blog posts.
 *
 * Run: pnpm tsx packages/db/seed/add-blog-images.ts
 *
 * Uses themed SVG placeholders stored in public/blog/.
 */

import { db } from "../index";
import { blogPosts } from "../schema/content";
import { eq } from "drizzle-orm";

const imageMap: Record<string, string> = {
  "introducing-ai-accounting": "/blog/ai-accounting.svg",
  "why-traditional-accounting-fails": "/blog/traditional-fails.svg",
  "building-ai-agents": "/blog/ai-agents.svg",
  "multi-currency-support": "/blog/multi-currency.svg",
  "security-best-practices": "/blog/security.svg",
  "getting-started-guide": "/blog/getting-started.svg",
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
