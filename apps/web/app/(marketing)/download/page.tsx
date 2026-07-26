import Link from "next/link";
import { MarketingHero } from "@/components/marketing/hero";
import {
  Monitor,
  Smartphone,
  Laptop,
  Download,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

const platforms = [
  {
    icon: Monitor,
    title: "Web App",
    description:
      "Full-featured dashboard accessible from any modern browser. No installation required.",
    features: [
      "All 20+ accounting modules",
      "Real-time agent activity feed",
      "Role-based dashboards",
      "Multi-entity & consolidation",
      "Custom report builder",
    ],
    action: {
      label: "Launch Web App",
      href: "/login",
    },
    popular: true,
  },
  {
    icon: Laptop,
    title: "Desktop (Windows)",
    description:
      "Native desktop app with document inbox and local file-watcher for drag-and-drop receipt capture.",
    features: [
      "Document inbox with local file watching",
      "Offline-capable",
      "Native performance",
      "Drag-and-drop receipt capture",
      "Auto-sync on reconnect",
    ],
    action: {
      label: "Download for Windows",
      href: "#",
    },
    popular: false,
  },
  {
    icon: Smartphone,
    title: "Mobile",
    description:
      "Task-focused mobile app for cash position, approvals, and expense capture on the go.",
    features: [
      "Real-time cash position",
      "Swipe-to-approve/reject",
      "Camera-first expense capture",
      "Push notifications",
      "Deep-link to web for full views",
    ],
    action: {
      label: "Get on iOS",
      href: "#",
    },
    popular: false,
  },
];

export default function DownloadPage() {
  return (
    <>
      <MarketingHero
        title="Download Xenboox"
        subtitle="Platforms"
        description="Access your AI accounting team from anywhere — web, desktop, or mobile. All surfaces share the same secure, real-time data."
        cta={{ label: "Launch Web App", href: "/login" }}
        secondaryCta={{ label: "Download Desktop", href: "#desktop" }}
      />

      {/* Platform Cards */}
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid gap-6 lg:grid-cols-3">
            {platforms.map((platform) => {
              const Icon = platform.icon;
              return (
                <div
                  key={platform.title}
                  className={`relative rounded-2xl border bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md ${
                    platform.popular
                      ? "ring-2 ring-blue-500/20 shadow-blue-500/5"
                      : ""
                  }`}
                >
                  {platform.popular && (
                    <span className="absolute -top-3 left-6 rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white shadow-sm">
                      Recommended
                    </span>
                  )}
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-slate-900">
                    {platform.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">
                    {platform.description}
                  </p>
                  <ul className="mt-4 space-y-2">
                    {platform.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-2 text-sm text-slate-600"
                      >
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={platform.action.href}
                    className={`mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold shadow-sm transition-all duration-200 active:scale-[0.98] ${
                      platform.popular
                        ? "bg-blue-600 text-white shadow-blue-600/20 hover:bg-blue-500"
                        : "border bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <Download className="h-4 w-4" />
                    {platform.action.label}
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* System Requirements */}
      <section className="border-t bg-slate-50 py-14">
        <div className="mx-auto max-w-4xl px-4">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-slate-900">
              System Requirements
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Everything you need to run Xenboox on your platform.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-blue-600">
                <Monitor className="h-5 w-5" />
                <h3 className="font-semibold text-slate-900">Web</h3>
              </div>
              <ul className="mt-3 space-y-1.5 text-sm text-slate-500">
                <li>Chrome 100+ / Firefox 110+ / Safari 16+</li>
                <li>Any OS with a modern browser</li>
                <li>Stable internet connection</li>
              </ul>
            </div>
            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-blue-600">
                <Laptop className="h-5 w-5" />
                <h3 className="font-semibold text-slate-900">Desktop</h3>
              </div>
              <ul className="mt-3 space-y-1.5 text-sm text-slate-500">
                <li>Windows 10+ (x64)</li>
                <li>4GB RAM / 500MB disk</li>
                <li>Internet for sync</li>
              </ul>
            </div>
            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-blue-600">
                <Smartphone className="h-5 w-5" />
                <h3 className="font-semibold text-slate-900">Mobile</h3>
              </div>
              <ul className="mt-3 space-y-1.5 text-sm text-slate-500">
                <li>iOS 16+ or Android 12+</li>
                <li>2GB RAM</li>
                <li>Camera for expense capture</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Security Note */}
      <section className="py-14">
        <div className="mx-auto max-w-xl px-4 text-center">
          <h2 className="text-xl font-bold text-slate-900">
            Enterprise-Grade Security
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            All surfaces use end-to-end encryption, role-based access control,
            and full audit trails. Your financial data is safe regardless of
            which platform you use.
          </p>
          <Link
            href="/docs"
            className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-500"
          >
            Read our security docs <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>
    </>
  );
}
