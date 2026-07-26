import Link from "next/link";
import { MarketingHero } from "@/components/marketing/hero";
import { ArrowRight, Calendar, Clock, Search } from "lucide-react";

const categories = [
  "All",
  "Product",
  "Accounting",
  "Engineering",
  "Company",
  "Tutorials",
];

const posts = [
  {
    title: "Introducing Autonomous Month-End Close for African Businesses",
    excerpt:
      "How Xenboox's AI agents automate the full month-end close process, from reconciliation to journal posting to report delivery.",
    category: "Product",
    date: "Jul 22, 2026",
    readTime: "5 min",
    href: "/blog/autonomous-month-end-close",
    featured: true,
  },
  {
    title: "Why Traditional Accounting Software Fails in Africa",
    excerpt:
      "The structural reasons QuickBooks and Sage don't work for African SMEs — and what we built instead.",
    category: "Accounting",
    date: "Jul 18, 2026",
    readTime: "7 min",
    href: "/blog/why-traditional-accounting-fails-africa",
    featured: true,
  },
  {
    title: "Building Agentic Workflows with LangGraph",
    excerpt:
      "A deep dive into our multi-agent architecture: how 19 AI agents coordinate through typed state graphs to run an entire accounting department.",
    category: "Engineering",
    date: "Jul 14, 2026",
    readTime: "10 min",
    href: "/blog/building-agentic-workflows-langgraph",
    featured: false,
  },
  {
    title: "Wave to Xenboox: Import Your Mobile Money History",
    excerpt:
      "We've built the first automated Wave statement import for accounting — connect, match, reconcile in minutes.",
    category: "Product",
    date: "Jul 10, 2026",
    readTime: "3 min",
    href: "/blog/wave-to-xenboox",
    featured: false,
  },
  {
    title: "The Accountant's Guide to AI-Powered Reconciliation",
    excerpt:
      "How AI changes bank rec from a manual drag to an exception-review workflow — and what that means for your firm.",
    category: "Tutorials",
    date: "Jul 5, 2026",
    readTime: "6 min",
    href: "/blog/ai-powered-reconciliation-guide",
    featured: false,
  },
  {
    title: "We Raised Our Seed Round — Here's What We're Building",
    excerpt:
      "Why we're building an AI-native accounting platform for Africa, and what the next 12 months look like.",
    category: "Company",
    date: "Jun 28, 2026",
    readTime: "4 min",
    href: "/blog/seed-round-announcement",
    featured: false,
  },
];

export default function BlogPage() {
  return (
    <>
      <MarketingHero
        title="Blog"
        subtitle="Insights"
        description="Product updates, engineering deep-dives, and accounting insights from the team building AI-native finance for Africa."
        cta={{ label: "Subscribe to Newsletter", href: "#subscribe" }}
      />

      {/* Search & Filter Bar */}
      <section className="border-b bg-white">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className="rounded-full border px-4 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:border-blue-300 hover:text-blue-600 aria-selected:border-blue-600 aria-selected:bg-blue-50 aria-selected:text-blue-700"
                  aria-selected={cat === "All"}
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
                className="w-full rounded-lg border bg-slate-50 py-2 pl-10 pr-4 text-sm outline-none transition-colors focus:border-blue-400 focus:bg-white sm:w-64"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Featured Posts */}
      <section className="py-12">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-8 grid gap-6 md:grid-cols-2">
            {posts
              .filter((p) => p.featured)
              .map((post) => (
                <Link
                  key={post.title}
                  href={post.href}
                  className="group relative overflow-hidden rounded-2xl border bg-gradient-to-br from-slate-50 to-white p-6 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 sm:p-8"
                >
                  <div className="absolute right-0 top-0 h-32 w-32 translate-x-8 -translate-y-8 rounded-full bg-gradient-to-br from-blue-500/5 to-indigo-500/5 blur-2xl" />
                  <div className="relative">
                    <span className="inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                      {post.category}
                    </span>
                    <h2 className="mt-3 text-xl font-bold text-slate-900 transition-colors group-hover:text-blue-600 sm:text-2xl">
                      {post.title}
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">
                      {post.excerpt}
                    </p>
                    <div className="mt-4 flex items-center gap-4 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" /> {post.date}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" /> {post.readTime}
                      </span>
                    </div>
                    <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-blue-600 opacity-0 transition-all group-hover:opacity-100">
                      Read more <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </Link>
              ))}
          </div>

          {/* All Posts */}
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {posts
              .filter((p) => !p.featured)
              .map((post) => (
                <Link
                  key={post.title}
                  href={post.href}
                  className="group rounded-xl border bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
                >
                  <span className="inline-block rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-600">
                    {post.category}
                  </span>
                  <h3 className="mt-2 font-semibold text-slate-900 transition-colors group-hover:text-blue-600">
                    {post.title}
                  </h3>
                  <p className="mt-1.5 text-sm text-slate-500 line-clamp-2">
                    {post.excerpt}
                  </p>
                  <div className="mt-4 flex items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" /> {post.date}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> {post.readTime}
                    </span>
                  </div>
                </Link>
              ))}
          </div>
        </div>
      </section>

      {/* Newsletter CTA */}
      <section
        id="subscribe"
        className="border-t bg-gradient-to-br from-slate-900 to-indigo-950 py-16"
      >
        <div className="mx-auto max-w-2xl px-4 text-center">
          <h2 className="text-2xl font-bold text-white">Stay in the loop</h2>
          <p className="mt-2 text-sm text-slate-400">
            Get product updates, engineering deep-dives, and accounting insights
            delivered to your inbox.
          </p>
          <form
            onSubmit={(e) => e.preventDefault()}
            className="mx-auto mt-6 flex max-w-md gap-3"
          >
            <input
              type="email"
              placeholder="you@company.com"
              required
              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none backdrop-blur-sm transition-colors focus:border-blue-500/50"
            />
            <button
              type="submit"
              className="shrink-0 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition-all duration-200 hover:bg-blue-500 active:scale-[0.98]"
            >
              Subscribe
            </button>
          </form>
        </div>
      </section>
    </>
  );
}
