import Link from "next/link";
import {
  Globe,
  Smartphone,
  Monitor,
  ArrowRight,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

const platforms = [
  {
    name: "Web App",
    icon: Globe,
    description: "Access Xenboox from any browser. No installation required.",
    features: [
      "Full accounting suite",
      "AI chat assistant",
      "Real-time dashboards",
      "Works on any device",
    ],
    cta: "Launch Web App",
    ctaHref: "/login",
    gradient: "from-blue-500 to-indigo-500",
    glow: "shadow-blue-500/20",
  },
  {
    name: "Mobile App",
    icon: Smartphone,
    description: "Native iOS and Android apps for accounting on the go.",
    features: [
      "Create invoices & journal entries",
      "Approve transactions",
      "View reports",
      "Offline support",
      "Push notifications",
    ],
    stores: [
      { name: "App Store", label: "Download on the App Store" },
      { name: "Google Play", label: "Get it on Google Play" },
    ],
    gradient: "from-emerald-500 to-teal-500",
    glow: "shadow-emerald-500/20",
  },
  {
    name: "Desktop App",
    icon: Monitor,
    description: "Offline-first desktop application built with Tauri and Rust.",
    features: [
      "Works offline with local SQLite",
      "Automatic sync when reconnected",
      "Native performance",
      "Windows 10+ & macOS 12+",
      "Auto-updates",
    ],
    downloads: [
      {
        name: "Windows",
        label: "Download for Windows (.msi)",
        version: "1.0.0",
      },
      { name: "macOS", label: "Download for macOS (.dmg)", version: "1.0.0" },
    ],
    gradient: "from-violet-500 to-purple-500",
    glow: "shadow-violet-500/20",
  },
];

export default function DownloadPage() {
  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950">
        <div className="absolute inset-0 bg-grid-dark opacity-30" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm px-4 py-1.5 text-xs font-medium text-white/60">
              <Sparkles className="h-3 w-3 text-blue-400" />
              Download
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-[1.1]">
              <span className="text-white">Available on every</span>
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">
                platform you use
              </span>
            </h1>
            <p className="mt-4 text-lg text-white/50 leading-relaxed max-w-xl">
              Choose the platform that works best for you. Your data syncs
              seamlessly across all devices.
            </p>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </section>

      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-3">
            {platforms.map((platform) => (
              <div
                key={platform.name}
                className="group relative flex flex-col rounded-2xl border bg-white p-6 md:p-8 transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
              >
                <div className="flex items-start justify-between mb-6">
                  <div
                    className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${platform.gradient} shadow-sm ${platform.glow} group-hover:shadow-lg transition-shadow duration-300`}
                  >
                    <platform.icon className="h-7 w-7 text-white" />
                  </div>
                  <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 border border-emerald-200">
                    Available
                  </span>
                </div>
                <h2 className="text-xl font-bold">{platform.name}</h2>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  {platform.description}
                </p>
                <ul className="mt-6 flex-1 space-y-2.5">
                  {platform.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2 text-sm"
                    >
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-8">
                  {platform.cta ? (
                    <Link
                      href={platform.ctaHref}
                      className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 text-sm font-medium text-white shadow-md transition-all duration-200 hover:shadow-lg hover:scale-[1.02]"
                    >
                      {platform.cta}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  ) : platform.downloads ? (
                    <div className="space-y-2">
                      {platform.downloads.map((download) => (
                        <a
                          key={download.name}
                          href="#"
                          className="inline-flex h-11 w-full items-center justify-center rounded-xl border px-6 text-sm font-medium transition-all duration-200 hover:bg-muted hover:border-foreground/20"
                        >
                          {download.label}
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {platform.stores?.map((store) => (
                        <a
                          key={store.name}
                          href="#"
                          className="inline-flex h-11 w-full items-center justify-center rounded-xl border px-6 text-sm font-medium transition-all duration-200 hover:bg-muted hover:border-foreground/20"
                        >
                          {store.label}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="border-t bg-gradient-to-b from-slate-50 to-white py-16 md:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="mb-10 text-center text-3xl font-bold tracking-tight">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {[
              {
                q: "Is the web app free to use?",
                a: "Yes. The Free tier gives you 1 entity, 1 AI agent, up to 50 journal entries/month, and web access. Paid plans unlock more.",
              },
              {
                q: "When will the mobile app be available?",
                a: "The Xenboox mobile app is available now for download on the App Store and Google Play.",
              },
              {
                q: "When will the desktop app be available?",
                a: "The desktop app is available now for Windows and macOS with offline-first capabilities.",
              },
              {
                q: "Does the desktop app work offline?",
                a: "Yes. The desktop app uses local SQLite caching to work without internet. Data syncs automatically when reconnected.",
              },
              {
                q: "Can I switch between platforms?",
                a: "Absolutely. Your data syncs seamlessly across all platforms. Start an entry on mobile, finish it on desktop.",
              },
            ].map((faq) => (
              <details
                key={faq.q}
                className="group rounded-xl border bg-white transition-all duration-200 hover:shadow-sm open:shadow-sm"
              >
                <summary className="flex cursor-pointer items-center justify-between px-6 py-4 text-sm font-medium text-foreground list-none">
                  {faq.q}
                  <svg
                    className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </summary>
                <div className="px-6 pb-4">
                  <p className="text-sm text-muted-foreground">{faq.a}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            Ready to get started?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Create your free account and start using the web app today.
          </p>
          <div className="mt-8">
            <Link
              href="/register"
              className="group relative inline-flex h-12 items-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-8 text-sm font-medium text-white shadow-lg shadow-blue-600/25 transition-all duration-300 hover:shadow-blue-600/40 hover:scale-105"
            >
              <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-400 to-indigo-400 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-40" />
              <span className="relative flex items-center gap-2">
                Create Free Account
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </span>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
