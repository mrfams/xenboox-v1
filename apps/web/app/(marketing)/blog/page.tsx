"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  Clock,
  Search,
  Tag,
  Sparkles,
} from "lucide-react";
import { FadeInUp } from "@/components/marketing/reveal";
import { blogPosts, getFeaturedPosts } from "@/lib/blog-data";

const categories = [
  "All",
  "Product",
  "Accounting",
  "Engineering",
  "Company",
  "Tutorials",
];

export default function BlogPage() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const featuredPosts = getFeaturedPosts();

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
      <section className="relative min-h-[50vh] flex items-center justify-center overflow-hidden bg-slate-950">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
          <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-blue-500/15 rounded-full blur-[128px]" />
          <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-violet-500/15 rounded-full blur-[128px]" />
        </div>

        <div className="relative z-10 mx-auto max-w-5xl px-4 text-center">
          <FadeInUp>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 mb-8">
              <Sparkles className="h-4 w-4 text-blue-400" />
              <span className="text-sm text-white/80">Xenboox Blog</span>
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[1.1]">
              Insights &{" "}
              <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">
                Updates
              </span>
            </h1>

            <p className="mt-6 text-xl text-white/60 max-w-2xl mx-auto leading-relaxed">
              Product updates, engineering deep-dives, and insights from the
              team building the future of accounting.
            </p>
          </FadeInUp>
        </div>
      </section>

      {/* Search & Filter */}
      <section className="sticky top-14 z-30 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
                    selectedCategory === cat
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search posts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-sm outline-none transition-colors focus:border-blue-400 focus:bg-white sm:w-64"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Featured Posts */}
      {selectedCategory === "All" && searchQuery === "" && (
        <section className="py-12 bg-white">
          <div className="mx-auto max-w-6xl px-4">
            <FadeInUp>
              <h2 className="text-2xl font-bold text-slate-900 mb-8">
                Featured
              </h2>
            </FadeInUp>
            <div className="grid gap-8 md:grid-cols-2">
              {featuredPosts.map((post, index) => (
                <FadeInUp key={post.slug} delay={index * 0.1}>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-8 transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
                  >
                    <div className="absolute right-0 top-0 h-40 w-40 translate-x-10 -translate-y-10 rounded-full bg-gradient-to-br from-blue-500/10 to-violet-500/10 blur-3xl" />
                    <div className="relative">
                      <div className="flex items-center gap-3 mb-4">
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                          <Tag className="h-3 w-3" />
                          {post.category}
                        </span>
                        <span className="text-xs text-slate-400">
                          {post.readTime}
                        </span>
                      </div>
                      <h3 className="text-2xl font-bold text-slate-900 transition-colors group-hover:text-blue-600">
                        {post.title}
                      </h3>
                      <p className="mt-3 text-slate-600 leading-relaxed">
                        {post.excerpt}
                      </p>
                      <div className="mt-6 flex items-center justify-between">
                        <div className="flex items-center gap-4 text-sm text-slate-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {post.date}
                          </span>
                          <span>By {post.author.name}</span>
                        </div>
                        <span className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 opacity-0 transition-all group-hover:opacity-100">
                          Read more <ArrowRight className="h-4 w-4" />
                        </span>
                      </div>
                    </div>
                  </Link>
                </FadeInUp>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* All Posts */}
      <section className="py-12 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4">
          <FadeInUp>
            <h2 className="text-2xl font-bold text-slate-900 mb-8">
              {selectedCategory === "All" ? "All Posts" : selectedCategory}
            </h2>
          </FadeInUp>

          {filteredPosts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-500">
                No posts found matching your criteria.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredPosts.map((post, index) => (
                <FadeInUp key={post.slug} delay={index * 0.05}>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="group flex flex-col h-full rounded-2xl border border-slate-200 bg-white p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                        {post.category}
                      </span>
                      <span className="text-xs text-slate-400">
                        {post.readTime}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 transition-colors group-hover:text-blue-600 line-clamp-2">
                      {post.title}
                    </h3>
                    <p className="mt-2 text-sm text-slate-600 line-clamp-3 flex-1">
                      {post.excerpt}
                    </p>
                    <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-3 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {post.date}
                        </span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-400 opacity-0 transition-all group-hover:opacity-100 group-hover:text-blue-600" />
                    </div>
                  </Link>
                </FadeInUp>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="py-20 bg-slate-950 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[128px]" />
        </div>
        <div className="relative z-10 mx-auto max-w-2xl px-4 text-center">
          <FadeInUp>
            <h2 className="text-3xl font-bold text-white">Stay in the loop</h2>
            <p className="mt-3 text-white/60">
              Get product updates, engineering deep-dives, and insights
              delivered to your inbox.
            </p>
            <form
              onSubmit={(e) => e.preventDefault()}
              className="mx-auto mt-8 flex max-w-md gap-3"
            >
              <input
                type="email"
                placeholder="you@company.com"
                required
                className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/40 outline-none backdrop-blur-sm transition-colors focus:border-blue-500/50"
              />
              <button
                type="submit"
                className="shrink-0 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition-all duration-200 hover:bg-blue-500"
              >
                Subscribe
              </button>
            </form>
            <p className="mt-4 text-xs text-white/40">
              No spam. Unsubscribe anytime.
            </p>
          </FadeInUp>
        </div>
      </section>
    </>
  );
}
