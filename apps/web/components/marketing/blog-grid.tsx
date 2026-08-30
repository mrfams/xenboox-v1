"use client";

import { useState } from "react";
import Link from "next/link";
import { Clock, ArrowRight, User } from "lucide-react";

import { FadeInUp } from "@/components/marketing/reveal";
import { cn } from "@/lib/utils";

type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  date: string;
  readTime: string;
  author: { name: string; role: string };
  image: string | null;
};

function AuthorAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
      {initials}
    </div>
  );
}

export function BlogGrid({ posts }: { posts: BlogPost[] }) {
  const [activeCategory, setActiveCategory] = useState("All");

  const categories = [
    "All",
    ...Array.from(new Set(posts.map((p) => p.category))),
  ];

  const filteredPosts =
    activeCategory === "All"
      ? posts
      : posts.filter((p) => p.category === activeCategory);

  const [featured, ...rest] = filteredPosts;

  return (
    <>
      {/* Category Filter Tabs */}
      <div className="mb-10 flex flex-wrap items-center justify-center gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(cat)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200",
              activeCategory === cat
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {filteredPosts.length === 0 ? (
        <FadeInUp>
          <div className="text-center py-20">
            <p className="text-lg text-muted-foreground">
              No posts in this category yet. Check back soon!
            </p>
          </div>
        </FadeInUp>
      ) : (
        <>
          {/* Featured Post Hero */}
          {featured && (
            <FadeInUp>
              <Link
                href={`/blog/${featured.slug}`}
                className="group mb-12 block overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
              >
                <div className="grid gap-0 md:grid-cols-2">
                  {featured.image && (
                    <div className="relative h-64 overflow-hidden md:h-auto">
                      <img
                        src={featured.image}
                        alt={featured.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                    </div>
                  )}
                  <div className="flex flex-col justify-center p-8 sm:p-10">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                        {featured.category}
                      </span>
                      <span className="text-xs text-muted-foreground/60 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {featured.readTime}
                      </span>
                    </div>
                    <h2 className="text-2xl font-bold text-foreground transition-colors group-hover:text-primary sm:text-3xl">
                      {featured.title}
                    </h2>
                    <p className="mt-3 text-muted-foreground leading-relaxed line-clamp-3">
                      {featured.excerpt}
                    </p>
                    <div className="mt-6 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <AuthorAvatar name={featured.author.name} />
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {featured.author.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {featured.author.role}
                          </p>
                        </div>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {featured.date}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            </FadeInUp>
          )}

          {/* Post Grid */}
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((post, index) => (
              <FadeInUp key={post.slug} delay={index * 0.05}>
                <Link
                  href={`/blog/${post.slug}`}
                  className="group flex flex-col h-full rounded-2xl border border-border bg-card overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
                >
                  {post.image && (
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={post.image}
                        alt={post.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                  )}
                  <div className="flex flex-col flex-1 p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                        {post.category}
                      </span>
                      <span className="text-xs text-muted-foreground/60 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {post.readTime}
                      </span>
                    </div>
                    <h2 className="text-lg font-semibold text-foreground transition-colors group-hover:text-primary line-clamp-2">
                      {post.title}
                    </h2>
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-3 flex-1">
                      {post.excerpt}
                    </p>
                    <div className="mt-4 pt-4 border-t border-border">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <AuthorAvatar name={post.author.name} />
                          <div>
                            <p className="text-xs font-medium text-foreground">
                              {post.author.name}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {post.date}
                            </p>
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground/60 opacity-0 transition-all group-hover:opacity-100 group-hover:text-primary" />
                      </div>
                    </div>
                  </div>
                </Link>
              </FadeInUp>
            ))}
          </div>
        </>
      )}
    </>
  );
}
