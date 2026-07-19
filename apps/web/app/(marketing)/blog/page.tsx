"use client";

import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { ArrowRight, Calendar, Sparkles } from "lucide-react";
import {
  MarketingShell,
  PageHero,
  Reveal,
  GlassCard,
} from "../components/marketing-primitives";

const posts = [
  {
    slug: "why-ai-native-accounting",
    title: "Why AI-Native Accounting Matters for African Businesses",
    excerpt:
      "Traditional accounting software wasn't designed for multi-currency, mobile money, and varying tax regimes. Here's why AI-native is the answer.",
    date: "2026-01-15",
    category: "Product",
    readTime: "5 min read",
  },
  {
    slug: "agent-workforce-explained",
    title: "Meet the Agent Workforce: How Xenboox Automates the Books",
    excerpt:
      "A look at how our intelligent agents collaborate — from strategic oversight down to individual tasks — to keep your books clean.",
    date: "2026-01-08",
    category: "Engineering",
    readTime: "8 min read",
  },
  {
    slug: "multi-currency-accounting",
    title: "Multi-Currency Accounting: The Hidden Complexity",
    excerpt:
      "Handling GMD, USD, EUR, and GBP in a single ledger isn't just about exchange rates. It's about reporting, compliance, and reconciliation.",
    date: "2025-12-20",
    category: "Accounting",
    readTime: "6 min read",
  },
  {
    slug: "offline-first-desktop",
    title: "Building an Offline-First Desktop App with a Native Backend",
    excerpt:
      "Why we chose a lightweight native runtime, how we handle local caching, and our sync strategy for unreliable connectivity.",
    date: "2025-12-10",
    category: "Engineering",
    readTime: "10 min read",
  },
  {
    slug: "payroll-africa",
    title: "Payroll in Africa: Tax, Social Security, and What You Need to Know",
    excerpt:
      "A practical guide to regional payroll — tax bands, social-security contributions, and how Xenboox automates it all.",
    date: "2025-11-28",
    category: "Accounting",
    readTime: "7 min read",
  },
  {
    slug: "security-architecture",
    title: "Enterprise-Grade Security from Day One",
    excerpt:
      "Row-level security, encryption at rest, rate limiting, and audit logging — how we built security into the foundation.",
    date: "2025-11-15",
    category: "Security",
    readTime: "6 min read",
  },
];

const categories = ["All", "Product", "Engineering", "Accounting", "Security"];

function PostCard({
  post,
  index,
}: {
  post: (typeof posts)[number];
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      transition={{
        duration: 0.55,
        delay: index * 0.06,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
    >
      <Link href="#" className="block h-full">
        <GlassCard className="flex h-full flex-col p-6">
          <div className="mb-3 flex items-center gap-2 text-xs text-white/50">
            <span className="inline-flex h-5 items-center rounded-full bg-indigo-500/15 px-2 font-medium text-indigo-300">
              {post.category}
            </span>
            <span>·</span>
            <span>{post.readTime}</span>
          </div>
          <h2 className="text-lg font-semibold leading-snug text-white">
            {post.title}
          </h2>
          <p className="mt-2 flex-1 text-sm text-white/55">{post.excerpt}</p>
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-white/40">
              <Calendar className="h-3 w-3" />
              {new Date(post.date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-indigo-300">
              Read more
              <ArrowRight className="h-3 w-3" />
            </span>
          </div>
        </GlassCard>
      </Link>
    </motion.div>
  );
}

export default function BlogPage() {
  return (
    <MarketingShell>
      <PageHero
        eyebrow="Blog"
        title="Insights on modern"
        highlight="finance & AI"
        subtitle="Ideas on AI-native accounting, engineering, and building for African businesses."
      />

      <section className="py-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal className="mb-10 flex flex-wrap gap-2">
            {categories.map((cat) => (
              <span
                key={cat}
                className="inline-flex h-8 cursor-default items-center rounded-full border border-white/10 bg-white/5 px-3 text-xs font-medium text-white/60"
              >
                {cat}
              </span>
            ))}
          </Reveal>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post, i) => (
              <PostCard key={post.slug} post={post} index={i} />
            ))}
          </div>

          <Reveal className="mt-12 text-center text-sm text-white/40">
            More articles coming soon.{" "}
            <Link href="/register" className="text-indigo-300 hover:underline">
              Sign up
            </Link>{" "}
            to get notified.
          </Reveal>
        </div>
      </section>
    </MarketingShell>
  );
}
