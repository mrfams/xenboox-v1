import Link from "next/link"
import { ArrowRight, Calendar } from "lucide-react"

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
    slug: "19-agents-explained",
    title: "19 Agents, Explained: How Xenboox's AI Workforce Operates",
    excerpt:
      "A deep dive into the three-tier agent hierarchy — from the CFO Agent down to individual worker agents — and how they collaborate on your books.",
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
    title: "Building an Offline-First Desktop App with Tauri and Rust",
    excerpt:
      "Why we chose Tauri over Electron, how we handle local SQLite caching, and our sync strategy for unreliable connectivity.",
    date: "2025-12-10",
    category: "Engineering",
    readTime: "10 min read",
  },
  {
    slug: "payroll-gambia",
    title: "Payroll in The Gambia: PAYE, SSNIT, and What You Need to Know",
    excerpt:
      "A practical guide to Gambian payroll — tax bands, social security contributions, and how Xenboox automates it all.",
    date: "2025-11-28",
    category: "Accounting",
    readTime: "7 min read",
  },
  {
    slug: "security-architecture",
    title: "Enterprise-Grade Security from Day One",
    excerpt:
      "Row-level security, AES-256 encryption, rate limiting, and audit logging — how we built security into Xenboox's foundation.",
    date: "2025-11-15",
    category: "Security",
    readTime: "6 min read",
  },
]

const categories = ["All", "Product", "Engineering", "Accounting", "Security"]

export default function BlogPage() {
  return (
    <>
      <section className="border-b py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-bold tracking-tight">Blog</h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Insights on AI-native accounting, engineering, and building for Africa.
            </p>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          {/* Categories */}
          <div className="mb-10 flex flex-wrap gap-2">
            {categories.map((cat) => (
              <span
                key={cat}
                className="inline-flex h-8 items-center rounded-full border px-3 text-xs font-medium text-muted-foreground"
              >
                {cat}
              </span>
            ))}
          </div>

          {/* Posts Grid */}
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <article
                key={post.slug}
                className="group flex flex-col rounded-lg border p-6 transition-colors hover:bg-muted/50"
              >
                <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex h-5 items-center rounded-full bg-primary/10 px-2 font-medium text-primary">
                    {post.category}
                  </span>
                  <span>·</span>
                  <span>{post.readTime}</span>
                </div>
                <h2 className="text-lg font-semibold leading-snug">
                  {post.title}
                </h2>
                <p className="mt-2 flex-1 text-sm text-muted-foreground">
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
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-primary group-hover:underline">
                    Read more
                    <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </article>
            ))}
          </div>

          {/* Empty state hint */}
          <div className="mt-12 text-center text-sm text-muted-foreground">
            More articles coming soon.{" "}
            <Link href="/register" className="text-primary hover:underline">
              Sign up
            </Link>{" "}
            to get notified.
          </div>
        </div>
      </section>
    </>
  )
}
