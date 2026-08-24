import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Calendar, Clock, Tag } from "lucide-react";

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
function renderMarkdown(content: string): string {
  return content
    .split("\n")
    .map((line) => {
      // Headers
      if (line.startsWith("## "))
        return `<h2 class="text-2xl font-bold text-slate-900 mt-8 mb-4">${line.slice(3)}</h2>`;
      if (line.startsWith("### "))
        return `<h3 class="text-xl font-semibold text-slate-900 mt-6 mb-3">${line.slice(4)}</h3>`;
      if (line.startsWith("#### "))
        return `<h4 class="text-lg font-semibold text-slate-900 mt-4 mb-2">${line.slice(5)}</h4>`;

      // Lists
      if (line.match(/^\d+\.\s/)) {
        const text = line
          .replace(/^\d+\.\s/, "")
          .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
          .replace(
            /\[(.*?)\]\((.*?)\)/g,
            '<a href="$2" class="text-blue-600 hover:underline">$1</a>',
          );
        return `<li class="ml-6 mb-2 list-decimal text-slate-700">${text}</li>`;
      }
      if (line.startsWith("- ")) {
        const text = line
          .slice(2)
          .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
          .replace(
            /\[(.*?)\]\((.*?)\)/g,
            '<a href="$2" class="text-blue-600 hover:underline">$1</a>',
          );
        return `<li class="ml-6 mb-2 list-disc text-slate-700">${text}</li>`;
      }

      // Code blocks
      if (line.startsWith("```")) return "";
      if (line.startsWith("`") && line.endsWith("`")) {
        return `<code class="bg-slate-100 px-1.5 py-0.5 rounded text-sm font-mono text-slate-800">${line.slice(1, -1)}</code>`;
      }

      // Blockquotes
      if (line.startsWith("> ")) {
        return `<blockquote class="border-l-4 border-blue-500 pl-4 py-2 my-4 text-slate-600 italic">${line.slice(2)}</blockquote>`;
      }

      // Horizontal rule
      if (line === "---") return `<hr class="my-8 border-slate-200" />`;

      // Empty lines
      if (line.trim() === "") return "";

      // Regular paragraphs with inline formatting
      const formatted = line
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.*?)\*/g, "<em>$1</em>")
        .replace(
          /\[(.*?)\]\((.*?)\)/g,
          '<a href="$2" class="text-blue-600 hover:underline">$1</a>',
        );

      return `<p class="mb-4 text-slate-700 leading-relaxed">${formatted}</p>`;
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
      <div className="bg-white border-b border-slate-200">
        <div className="mx-auto max-w-4xl px-4 py-4">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Blog
          </Link>
        </div>
      </div>

      {/* Article Header */}
      <article className="bg-white">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
          <FadeInUp>
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                <Tag className="h-3 w-3" />
                {post.category}
              </span>
              <span className="text-sm text-slate-500 flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {post.readTime} read
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-900 leading-[1.1]">
              {post.title}
            </h1>

            <p className="mt-4 text-xl text-slate-600 leading-relaxed">
              {post.excerpt}
            </p>

            <div className="mt-8 flex items-center justify-between border-b border-slate-200 pb-8">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-semibold">
                  {post.author.name.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-slate-900">
                    {post.author.name}
                  </p>
                  <p className="text-sm text-slate-500">{post.author.role}</p>
                  <p className="text-sm text-slate-500 flex items-center gap-1">
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
            <div className="mt-12 pt-8 border-t border-slate-200">
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600"
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
        <section className="py-16 bg-slate-50 border-t border-slate-200">
          <div className="mx-auto max-w-6xl px-4">
            <FadeInUp>
              <h2 className="text-2xl font-bold text-slate-900 mb-8">
                Continue Reading
              </h2>
            </FadeInUp>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {relatedPosts.map((relatedPost, index) => (
                <FadeInUp key={relatedPost.slug} delay={index * 0.1}>
                  <Link
                    href={`/blog/${relatedPost.slug}`}
                    className="group flex flex-col h-full rounded-2xl border border-slate-200 bg-white p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                        {relatedPost.category}
                      </span>
                      <span className="text-xs text-slate-400">
                        {relatedPost.readTime}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 transition-colors group-hover:text-blue-600 line-clamp-2">
                      {relatedPost.title}
                    </h3>
                    <p className="mt-2 text-sm text-slate-600 line-clamp-3 flex-1">
                      {relatedPost.excerpt}
                    </p>
                    <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-sm text-slate-500">
                        {relatedPost.date}
                      </span>
                      <ArrowRight className="h-4 w-4 text-slate-400 opacity-0 transition-all group-hover:opacity-100 group-hover:text-blue-600" />
                    </div>
                  </Link>
                </FadeInUp>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Newsletter CTA */}
      <section className="py-16 bg-white border-t border-slate-200">
        <div className="mx-auto max-w-2xl px-4 text-center">
          <FadeInUp>
            <h2 className="text-2xl font-bold text-slate-900">
              Enjoyed this article?
            </h2>
            <p className="mt-2 text-slate-600">
              Subscribe to our newsletter for more insights and updates.
            </p>
            <NewsletterForm />
          </FadeInUp>
        </div>
      </section>
    </>
  );
}
