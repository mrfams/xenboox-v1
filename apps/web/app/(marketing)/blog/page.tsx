import type { Metadata } from "next";

import { NewsletterForm } from "@/components/marketing/newsletter-form";
import { BreadcrumbJsonLd } from "@/components/marketing/json-ld";
import { FadeInUp } from "@/components/marketing/reveal";
import { getAllPublishedPosts } from "@/lib/content-server";
import { BlogGrid } from "@/components/marketing/blog-grid";

export const metadata: Metadata = {
  title: "Blog — AI Accounting Insights & Updates | Xenboox",
  description:
    "Product updates, engineering deep-dives, and insights from the team building the future of AI-native accounting for businesses worldwide.",
  openGraph: {
    title: "Blog — AI Accounting Insights & Updates | Xenboox",
    description:
      "Product updates, engineering deep-dives, and insights from the team building the future of AI-native accounting.",
    url: "https://xenboox.com/blog",
    siteName: "Xenboox",
    type: "website",
  },
};

export default async function BlogPage() {
  const posts = await getAllPublishedPosts();

  return (
    <>
      <BreadcrumbJsonLd
        items={[{ name: "Home", url: "/" }, { name: "Blog" }]}
      />

      {/* Header */}
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
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:py-24 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground">
            Blog
          </h1>
          <p className="mt-4 text-xl text-muted-foreground max-w-2xl mx-auto">
            Product updates, engineering deep-dives, and insights from the team
            building the future of AI-native accounting.
          </p>
        </div>
      </section>

      {/* Posts Grid with Filtering */}
      <section className="py-16 bg-paper-2/60">
        <div className="mx-auto max-w-6xl px-4">
          <BlogGrid posts={posts} />
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="py-16 bg-card border-t border-border">
        <div className="mx-auto max-w-2xl px-4 text-center">
          <FadeInUp>
            <h2 className="text-2xl font-bold text-foreground">
              Stay in the loop
            </h2>
            <p className="mt-2 text-muted-foreground">
              Subscribe to our newsletter for the latest insights and updates.
            </p>
            <NewsletterForm />
          </FadeInUp>
        </div>
      </section>
    </>
  );
}
