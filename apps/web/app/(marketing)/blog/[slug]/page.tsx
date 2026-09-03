import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Calendar, Clock } from "lucide-react";

import { BlogShareBar } from "@/components/marketing/blog-share-bar";

import { FadeInUp } from "@/components/marketing/reveal";
import { NewsletterForm } from "@/components/marketing/newsletter-form";
import {
  ArticleJsonLd,
  BreadcrumbJsonLd,
} from "@/components/marketing/json-ld";
import {
  getAllPublishedPostSlugs,
  getPostBySlug,
  getRelatedPosts,
} from "@/lib/content-server";

// Generate static paths for all blog posts
export async function generateStaticParams() {
  const slugs = await getAllPublishedPostSlugs();
  return slugs.map((slug) => ({ slug }));
}

// Generate metadata for SEO
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return { title: "Post Not Found" };

  return {
    title: `${post.title} | Xenboox Blog`,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      publishedTime: post.date,
      authors: [post.author.name],
      tags: post.tags,
    },
  };
}

// Simple markdown-to-HTML converter
/**
 * HTML-escape to prevent stored XSS (OWASP A03).
 * All dynamic content must pass through this before injection into HTML.
 */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderMarkdown(content: string): string {
  return content
    .split("\n")
    .map((line) => {
      // Headers
      if (line.startsWith("## "))
        return `<h2 class="text-2xl font-bold text-foreground mt-8 mb-4">${escapeHtml(line.slice(3))}</h2>`;
      if (line.startsWith("### "))
        return `<h3 class="text-xl font-semibold text-foreground mt-6 mb-3">${escapeHtml(line.slice(4))}</h3>`;
      if (line.startsWith("#### "))
        return `<h4 class="text-lg font-semibold text-foreground mt-4 mb-2">${escapeHtml(line.slice(5))}</h4>`;

      // Lists
      if (line.match(/^\d+\.\s/)) {
        const raw = line.replace(/^\d+\.\s/, "");
        const text = escapeHtml(raw)
          .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
          .replace(
            /\[(.*?)\]\((.*?)\)/g,
            '<a href="$2" class="text-primary hover:underline">$1</a>',
          );
        return `<li class="ml-6 mb-2 list-decimal text-foreground">${text}</li>`;
      }
      if (line.startsWith("- ")) {
        const raw = line.slice(2);
        const text = escapeHtml(raw)
          .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
          .replace(
            /\[(.*?)\]\((.*?)\)/g,
            '<a href="$2" class="text-primary hover:underline">$1</a>',
          );
        return `<li class="ml-6 mb-2 list-disc text-foreground">${text}</li>`;
      }

      // Code blocks
      if (line.startsWith("```")) return "";
      if (line.startsWith("`") && line.endsWith("`")) {
        return `<code class="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-foreground">${escapeHtml(line.slice(1, -1))}</code>`;
      }

      // Blockquotes
      if (line.startsWith("> ")) {
        return `<blockquote class="border-l-4 border-primary pl-4 py-2 my-4 text-muted-foreground italic">${escapeHtml(line.slice(2))}</blockquote>`;
      }

      // Horizontal rule
      if (line === "---") return `<hr class="my-8 border-border" />`;

      // Empty lines
      if (line.trim() === "") return "";

      // Regular paragraphs with inline formatting
      const formatted = escapeHtml(line)
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.*?)\*/g, "<em>$1</em>")
        .replace(
          /\[(.*?)\]\((.*?)\)/g,
          '<a href="$2" class="text-primary hover:underline">$1</a>',
        );

      return `<p class="mb-4 text-foreground leading-relaxed">${formatted}</p>`;
    })
    .join("\n");
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const relatedPosts = await getRelatedPosts(post.slug, 3);
  const contentHtml = renderMarkdown(post.content);

  return (
    <>
      <ArticleJsonLd
        title={post.title}
        description={post.excerpt}
        url={`https://xenboox.com/blog/${post.slug}`}
        datePublished={post.date}
        authorName={post.author.name}
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Blog", url: "/blog" },
          { name: post.title },
        ]}
      />
      {/* Back Link */}
      <div className="bg-card border-b border-border">
        <div className="mx-auto max-w-4xl px-4 py-4">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Blog
          </Link>
        </div>
      </div>

      {/* Article Header */}
      <article className="bg-card">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
          <FadeInUp>
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {post.readTime} read
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground leading-[1.1]">
              {post.title}
            </h1>

            <p className="mt-4 text-xl text-muted-foreground leading-relaxed">
              {post.excerpt}
            </p>

            <div className="mt-8 flex items-center justify-between border-b border-border pb-8">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-indigo-500 flex items-center justify-center text-white font-semibold">
                  {post.author.name.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-foreground">
                    {post.author.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {post.author.role}
                  </p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {post.date}
                  </p>
                </div>
              </div>

              <BlogShareBar
                title={post.title}
                url={`https://xenboox.com/blog/${post.slug}`}
              />
            </div>
          </FadeInUp>

          {/* Article Content */}
          <FadeInUp delay={0.1}>
            <div
              className="prose prose-slate max-w-none mt-8"
              dangerouslySetInnerHTML={{ __html: contentHtml }}
            />
          </FadeInUp>

          {/* Tags */}
          <FadeInUp delay={0.2}>
            <div className="mt-12 pt-8 border-t border-border">
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-sm text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </FadeInUp>
        </div>
      </article>

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <section className="py-16 bg-paper-2/60 border-t border-border">
          <div className="mx-auto max-w-6xl px-4">
            <FadeInUp>
              <h2 className="text-2xl font-bold text-foreground mb-8">
                Continue Reading
              </h2>
            </FadeInUp>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {relatedPosts.map((relatedPost, index) => (
                <FadeInUp key={relatedPost.slug} delay={index * 0.1}>
                  <Link
                    href={`/blog/${relatedPost.slug}`}
                    className="group flex flex-col h-full rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                        {relatedPost.category}
                      </span>
                      <span className="text-xs text-muted-foreground/60">
                        {relatedPost.readTime}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-foreground transition-colors group-hover:text-primary line-clamp-2">
                      {relatedPost.title}
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-3 flex-1">
                      {relatedPost.excerpt}
                    </p>
                    <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {relatedPost.date}
                      </span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground/60 opacity-0 transition-all group-hover:opacity-100 group-hover:text-primary" />
                    </div>
                  </Link>
                </FadeInUp>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Newsletter CTA */}
      <section className="py-16 bg-card border-t border-border">
        <div className="mx-auto max-w-2xl px-4 text-center">
          <FadeInUp>
            <h2 className="text-2xl font-bold text-foreground">
              Enjoyed this article?
            </h2>
            <p className="mt-2 text-muted-foreground">
              Subscribe to our newsletter for more insights and updates.
            </p>
            <NewsletterForm />
          </FadeInUp>
        </div>
      </section>
    </>
  );
}
