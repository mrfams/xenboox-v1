import Link from "next/link"
import {
  Globe,
  Smartphone,
  Monitor,
  ArrowRight,
  CheckCircle2,
  Apple,
  Play,
} from "lucide-react"

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
    badge: "Available Now",
    badgeColor: "text-green-600 bg-green-50",
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
    ],
    stores: [
      { name: "App Store", icon: Apple, href: "#", label: "Download on the App Store" },
      { name: "Google Play", icon: Play, href: "#", label: "Get it on Google Play" },
    ],
    badge: "Coming Soon",
    badgeColor: "text-amber-600 bg-amber-50",
  },
  {
    name: "Desktop App",
    icon: Monitor,
    description: "Offline-first desktop application built with Tauri and Rust.",
    features: [
      "Works offline with local SQLite",
      "Automatic sync when reconnected",
      "Native performance",
      "Windows & macOS",
    ],
    stores: [
      { name: "Windows", icon: Monitor, href: "#", label: "Download for Windows (.msi)" },
      { name: "macOS", icon: Apple, href: "#", label: "Download for macOS (.dmg)" },
    ],
    badge: "Coming Soon",
    badgeColor: "text-amber-600 bg-amber-50",
  },
]

export default function DownloadPage() {
  return (
    <>
      <section className="border-b py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-bold tracking-tight">
              Download Xenboox
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Available on web, mobile, and desktop. Choose the platform that works best for you.
            </p>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-8 lg:grid-cols-3">
            {platforms.map((platform) => (
              <div
                key={platform.name}
                className="flex flex-col rounded-lg border p-8"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <platform.icon className="h-6 w-6" />
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${platform.badgeColor}`}
                  >
                    {platform.badge}
                  </span>
                </div>
                <h2 className="text-xl font-bold">{platform.name}</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {platform.description}
                </p>
                <ul className="mt-6 flex-1 space-y-2.5">
                  {platform.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2 text-sm"
                    >
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <div className="mt-8">
                  {platform.cta ? (
                    <Link
                      href={platform.ctaHref}
                      className="inline-flex h-11 w-full items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
                    >
                      {platform.cta}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  ) : platform.stores ? (
                    <div className="space-y-2">
                      {platform.stores.map((store) => (
                        <a
                          key={store.name}
                          href={store.href}
                          className="inline-flex h-11 w-full items-center justify-center rounded-md border px-6 text-sm font-medium transition-colors hover:bg-muted"
                        >
                          <store.icon className="mr-2 h-4 w-4" />
                          {store.label}
                        </a>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t bg-muted/30 py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="mb-8 text-center text-2xl font-bold">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            <FaqItem
              question="Is the web app free to use?"
              answer="Yes. The Free tier gives you 1 entity, 1 AI agent, up to 50 journal entries/month, and web access. Paid plans unlock more entities, all AI agents, and all platforms."
            />
            <FaqItem
              question="When will the mobile app be available?"
              answer="We're actively developing the iOS and Android apps. Sign up for our newsletter to be notified when they launch."
            />
            <FaqItem
              question="When will the desktop app be available?"
              answer="The Tauri desktop app is in development. It will support Windows and macOS with offline-first functionality. Stay tuned for release announcements."
            />
            <FaqItem
              question="Does the desktop app work offline?"
              answer="Yes. The desktop app uses local SQLite caching so you can continue working without an internet connection. Data syncs automatically when you reconnect."
            />
            <FaqItem
              question="Can I switch between platforms?"
              answer="Absolutely. Your data syncs seamlessly across all platforms. Start an entry on mobile, finish it on desktop — it's all the same data."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-bold tracking-tight">
            Ready to get started?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Create your free account and start using the web app today.
          </p>
          <div className="mt-8">
            <Link
              href="/register"
              className="inline-flex h-12 items-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
            >
              Create Free Account
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}

function FaqItem({
  question,
  answer,
}: {
  question: string
  answer: string
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="font-medium">{question}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{answer}</p>
    </div>
  )
}
