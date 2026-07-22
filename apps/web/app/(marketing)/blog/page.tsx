import Link from "next/link";
import { ArrowRight, Calendar, Sparkles, Bookmark } from "lucide-react";

const posts = [
  {
    slug: "why-ai-native-accounting",
    title: "Why AI-Native Accounting Matters for African Businesses",
    excerpt:
      "Traditional accounting software wasn't designed for multi-currency, mobile money, and varying tax regimes. Here's why AI-native is the answer.",
    date: "2026-01-15",
    category: "Product",
    readTime: "5 min read",
    gradient: "from-blue-500 to-indigo-500",
  },
  {
    slug: "19-agents-explained",
    title: "19 Agents, Explained: How Xenboox's AI Workforce Operates",
    excerpt:
      "A deep dive into the three-tier agent hierarchy — from the CFO Agent down to individual worker agents.",
    date: "2026-01-08",
    category: "Engineering",
    readTime: "8 min read",
    gradient: "from-emerald-500 to-teal-500",
  },
  {
    slug: "multi-currency-accounting",
    title: "Multi-Currency Accounting: The Hidden Complexity",
    excerpt:
      "Handling GMD, USD, EUR, and GBP in a single ledger isn't just about exchange rates. It's about reporting, compliance, and reconciliation.",
    date: "2025-12-20",
    category: "Accounting",
    readTime: "6 min read",
    gradient: "from-violet-500 to-purple-500",
  },
  {
    slug: "offline-first-desktop",
    title: "Building an Offline-First Desktop App with Tauri and Rust",
    excerpt:
      "Why we chose Tauri over Electron, how we handle local SQLite caching, and our sync strategy for unreliable connectivity.",
    date: "2025-12-10",
    category: "Engineering",
    readTime: "10 min read",
    gradient: "from-amber-500 to-orange-500",
  },
  {
    slug: "payroll-gambia",
    title: "Payroll in The Gambia: PAYE, SSNIT, and What You Need to Know",
    excerpt:
      "A practical guide to Gambian payroll — tax bands, social security contributions, and how Xenboox automates it all.",
    date: "2025-11-28",
    category: "Accounting",
    readTime: "7 min read",
    gradient: "from-pink-500 to-rose-500",
  },
  {
    slug: "security-architecture",
    title: "Enterprise-Grade Security from Day One",
    excerpt:
      "Row-level security, AES-256 encryption, rate limiting, and audit logging — how we built security into Xenboox's foundation.",
    date: "2025-11-15",
    category: "Security",
    readTime: "6 min read",
    gradient: "from-cyan-500 to-blue-500",
  },
];

const categories = ["All", "Product", "Engineering", "Accounting", "Security"];

export default function BlogPage() {
  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950">
        <div className="absolute inset-0 bg-grid-dark opacity-30" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 md:py-20">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm px-4 py-1.5 text-xs font-medium text-white/60">
              <Bookmark className="h-3 w-3 text-blue-400" />
              Blog
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-[1.1]">
              <span className="text-white">Insights on</span>
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">
                AI-native accounting
              </span>
            </h1>
            <p className="mt-4 text-lg text-white/50 leading-relaxed max-w-2xl">
              Engineering, and building for Africa.
            </p>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </section>

      <section className="py-10 md:py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 flex flex-wrap gap-2">
            {categories.map((cat) => (
              <span
                key={cat}
                className="inline-flex h-8 items-center rounded-full border px-4 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground cursor-pointer"
              >
                {cat}
              </span>
            ))}
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <article
                key={post.slug}
                className="group relative rounded-2xl border bg-white p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
              >
                <div
                  className={`h-1.5 rounded-t-2xl bg-gradient-to-r ${post.gradient} -mx-6 -mt-6 mb-5`}
                />
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                  <span className="inline-flex h-5 items-center rounded-full bg-blue-50 px-2 font-medium text-blue-700 border border-blue-200">
                    {post.category}
                  </span>
                  <span>·</span>
                  <span>{post.readTime}</span>
                </div>
                <h2 className="text-base font-semibold leading-snug group-hover:text-blue-600 transition-colors">
                  {post.title}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {post.excerpt}
                </p>
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {new Date(post.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    Read more
                    <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-12 text-center text-sm text-muted-foreground">
            More articles coming soon.{" "}
            <Link
              href="/register"
              className="text-blue-600 hover:underline font-medium"
            >
              Sign up
            </Link>{" "}
            to get notified.
          </div>
        </div>
      </section>
    </>
  );
}
