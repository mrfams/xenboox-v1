"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Calendar, Search, Tag, Sparkles } from "lucide-react";

import { Section } from "@/components/marketing/section";
import { FadeInUp } from "@/components/marketing/reveal";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";

const categories = [
  "All",
  "Product",
  "Accounting",
  "Engineering",
  "Company",
  "Tutorials",
];

function BlogNewsletterForm() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        toast.success(
          "You're subscribed! Check your inbox for a welcome email.",
        );
        setEmail("");
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    } catch {
      toast.error("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row"
    >
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@company.com"
        required
        aria-label="Email address"
        className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-paper placeholder-paper/40 outline-none backdrop-blur-sm transition-colors focus:border-primary/50"
      />
      <button
        type="submit"
        disabled={submitting}
        className="shrink-0 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg transition-all duration-300 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? "Subscribing..." : "Subscribe"}
      </button>
    </form>
  );
}

export default function BlogPage() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading } = trpc.content.listPosts.useQuery({
    category: selectedCategory === "All" ? undefined : selectedCategory,
    query: searchQuery || undefined,
    limit: 50,
  });

  const blogPosts = data?.posts ?? [];
  const featuredPosts = blogPosts.filter((post) => post.featured);

  const filteredPosts = blogPosts.filter((post) => {
    const matchesCategory =
      selectedCategory === "All" || post.category === selectedCategory;
    const matchesSearch =
      searchQuery === "" ||
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <>
      {/* Hero Section */}
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
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[480px]"
          aria-hidden="true"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 70% 100% at 50% -10%, rgba(59, 79, 224, 0.12), transparent 70%)",
          }}
        />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-5 py-12 sm:py-16 text-center">
            <FadeInUp>
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                Xenboox Blog
              </span>
            </FadeInUp>
            <FadeInUp delay={0.05}>
              <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Insights & <span className="text-primary">Updates</span>
              </h1>
            </FadeInUp>
            <FadeInUp delay={0.1}>
              <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
                Product updates, engineering deep-dives, and insights from the
                team building the future of accounting.
              </p>
            </FadeInUp>
          </div>
        </div>
      </section>

      {/* Search & Filter */}
      <section className="sticky top-14 z-30 border-y border-border bg-paper/95 backdrop-blur supports-[backdrop-filter]:bg-paper/80">
        <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
                    selectedCategory === cat
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-foreground/20 hover:text-foreground"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search posts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-border bg-card py-2 pl-10 pr-4 text-sm outline-none transition-colors focus:border-primary sm:w-64"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Featured Posts */}
      {selectedCategory === "All" && searchQuery === "" && (
        <Section className="bg-paper">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <FadeInUp>
              <h2 className="mb-8 text-2xl font-bold text-foreground">
                Featured
              </h2>
            </FadeInUp>
            <div className="grid gap-8 md:grid-cols-2">
              {featuredPosts.map((post, index) => (
                <FadeInUp key={post.slug} delay={index * 0.1}>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="group relative block h-full overflow-hidden rounded-2xl border border-border/60 bg-card p-8 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1 hover:border-border/40 hover:shadow-[0_20px_50px_-20px_rgba(20,33,61,0.15)]"
                  >
                    <div className="absolute right-0 top-0 h-40 w-40 translate-x-10 -translate-y-10 rounded-full bg-gradient-to-br from-primary/10 to-balanced-green/10 blur-3xl" />
                    <div className="relative">
                      <div className="mb-4 flex items-center gap-3">
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                          <Tag className="h-3 w-3" />
                          {post.category}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {post.readTime}
                        </span>
                      </div>
                      <h3 className="text-2xl font-bold text-foreground transition-colors group-hover:text-primary">
                        {post.title}
                      </h3>
                      <p className="mt-3 leading-relaxed text-muted-foreground">
                        {post.excerpt}
                      </p>
                      <div className="mt-6 flex items-center justify-between">
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {post.date}
                          </span>
                          <span>By {post.author.name}</span>
                        </div>
                        <span className="inline-flex items-center gap-1 text-sm font-medium text-primary opacity-0 transition-all group-hover:opacity-100">
                          Read more <ArrowRight className="h-4 w-4" />
                        </span>
                      </div>
                    </div>
                  </Link>
                </FadeInUp>
              ))}
            </div>
          </div>
        </Section>
      )}

      {/* All Posts */}
      <Section className="bg-paper-2/60">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <FadeInUp>
            <h2 className="mb-8 text-2xl font-bold text-foreground">
              {selectedCategory === "All" ? "All Posts" : selectedCategory}
            </h2>
          </FadeInUp>

          {isLoading ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">Loading posts...</p>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">
                No posts found matching your criteria.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredPosts.map((post, index) => (
                <FadeInUp key={post.slug} delay={index * 0.05}>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="group flex h-full flex-col rounded-2xl border border-border/60 bg-card p-6 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1 hover:border-border/40 hover:shadow-[0_20px_50px_-20px_rgba(20,33,61,0.15)]"
                  >
                    <div className="mb-4 flex items-center gap-3">
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                        {post.category}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {post.readTime}
                      </span>
                    </div>
                    <h3 className="line-clamp-2 text-lg font-semibold text-foreground transition-colors group-hover:text-primary">
                      {post.title}
                    </h3>
                    <p className="mt-2 line-clamp-3 flex-1 text-sm text-muted-foreground">
                      {post.excerpt}
                    </p>
                    <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {post.date}
                        </span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-all group-hover:opacity-100 group-hover:text-primary" />
                    </div>
                  </Link>
                </FadeInUp>
              ))}
            </div>
          )}
        </div>
      </Section>

      {/* Newsletter CTA */}
      <Section className="bg-paper">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <FadeInUp>
            <div className="relative overflow-hidden rounded-3xl bg-ledger-ink px-8 py-16 text-center sm:px-16">
              <div
                className="pointer-events-none absolute inset-0"
                aria-hidden="true"
                style={{
                  backgroundImage:
                    "radial-gradient(ellipse 60% 90% at 80% 0%, rgba(59, 79, 224, 0.35), transparent 60%), radial-gradient(ellipse 50% 80% at 10% 100%, rgba(15, 113, 89, 0.25), transparent 60%)",
                }}
              />
              <div className="relative mx-auto max-w-xl">
                <h2 className="text-3xl font-semibold tracking-tight text-paper">
                  Stay in the loop
                </h2>
                <p className="mx-auto mt-3 text-paper/70">
                  Get product updates, engineering deep-dives, and insights
                  delivered to your inbox.
                </p>
                <BlogNewsletterForm />
                <p className="mt-4 text-xs text-paper/40">
                  No spam. Unsubscribe anytime.
                </p>
              </div>
            </div>
          </FadeInUp>
        </div>
      </Section>
    </>
  );
}
