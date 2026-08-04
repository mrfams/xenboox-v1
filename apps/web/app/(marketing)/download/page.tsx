import type { Metadata } from "next";
import Link from "next/link";
import {
  Monitor,
  Smartphone,
  Laptop,
  Download,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { Section } from "@/components/marketing/section";
import { FadeInUp } from "@/components/marketing/reveal";

export const metadata: Metadata = {
  title: "Download",
  description:
    "Access Xenboox from anywhere - web, desktop, or mobile. Download the app or launch in your browser.",
};

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
      label: "Coming soon",
      href: "#",
      disabled: true,
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
      label: "Coming soon",
      href: "#",
      disabled: true,
    },
    popular: false,
  },
];

const systemRequirements = [
  {
    icon: Monitor,
    title: "Web",
    requirements: [
      "Chrome 100+ / Firefox 110+ / Safari 16+",
      "Any OS with a modern browser",
      "Stable internet connection",
    ],
  },
  {
    icon: Laptop,
    title: "Desktop",
    requirements: [
      "Windows 10+ (x64)",
      "4GB RAM / 500MB disk",
      "Internet for sync",
    ],
  },
  {
    icon: Smartphone,
    title: "Mobile",
    requirements: [
      "iOS 16+ or Android 12+",
      "2GB RAM",
      "Camera for expense capture",
    ],
  },
];

export default function DownloadPage() {
  return (
    <>
      {/* Hero */}
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
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24">
          <FadeInUp>
            <div className="mx-auto max-w-3xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                Available everywhere
              </span>
              <h1 className="mt-6 text-4xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Access your accounting{" "}
                <span className="text-primary">from anywhere</span>
              </h1>
              <p className="mt-6 max-w-2xl mx-auto text-lg leading-relaxed text-muted-foreground">
                Access your AI accounting team from anywhere — web, desktop, or
                mobile. All surfaces share the same secure, real-time data.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-4">
                <Link
                  href="/login"
                  className="inline-flex h-12 items-center rounded-xl bg-primary px-8 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/25 transition-all duration-300 hover:shadow-primary/40 hover:scale-105"
                >
                  Launch Web App
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
                <a
                  href="#desktop"
                  className="inline-flex h-12 items-center rounded-xl border border-border bg-card px-8 text-sm font-medium text-foreground transition-all duration-300 hover:bg-accent/50"
                >
                  Download Desktop
                </a>
              </div>
            </div>
          </FadeInUp>
        </div>
      </section>

      {/* Platform Cards */}
      <Section className="!pt-0">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-3">
            {platforms.map((platform, index) => (
              <FadeInUp key={platform.title} delay={index * 0.1}>
                <div
                  className={`relative flex flex-col rounded-2xl border border-border bg-card p-6 md:p-8 transition-all duration-300 ${
                    platform.popular
                      ? "border-primary shadow-xl shadow-primary/10 lg:scale-105"
                      : "hover:shadow-lg hover:-translate-y-1"
                  }`}
                >
                  {platform.popular && (
                    <div className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-0.5 text-xs font-medium text-primary-foreground shadow-sm">
                      Recommended
                    </div>
                  )}
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <platform.icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 text-lg font-semibold text-foreground">
                    {platform.title}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    {platform.description}
                  </p>
                  <ul className="mt-5 flex-1 space-y-2">
                    {platform.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-2 text-sm"
                      >
                        <CheckCircle2
                          className={`mt-0.5 h-4 w-4 shrink-0 ${
                            platform.popular
                              ? "text-primary"
                              : "text-emerald-500"
                          }`}
                        />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  {platform.action.disabled ? (
                    <span className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-accent/50 text-sm font-medium text-muted-foreground cursor-not-allowed">
                      <Download className="h-4 w-4" />
                      {platform.action.label}
                    </span>
                  ) : (
                    <Link
                      href={platform.action.href}
                      className={`mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                        platform.popular
                          ? "bg-primary text-primary-foreground shadow-md hover:shadow-lg hover:scale-[1.02]"
                          : "border border-border bg-card text-foreground hover:bg-accent/50"
                      }`}
                    >
                      <Download className="h-4 w-4" />
                      {platform.action.label}
                    </Link>
                  )}
                </div>
              </FadeInUp>
            ))}
          </div>
        </div>
      </Section>

      {/* System Requirements */}
      <section className="border-t border-border bg-paper-2/60 py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <FadeInUp>
            <div className="text-center mb-10">
              <h2 className="text-3xl font-semibold tracking-tight text-foreground">
                System Requirements
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Everything you need to run Xenboox on your platform.
              </p>
            </div>
          </FadeInUp>
          <div className="grid gap-5 sm:grid-cols-3">
            {systemRequirements.map((req, index) => (
              <FadeInUp key={req.title} delay={index * 0.1}>
                <div className="rounded-2xl border border-border bg-card p-6">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <req.icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-3 font-semibold text-foreground">
                    {req.title}
                  </h3>
                  <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                    {req.requirements.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </FadeInUp>
            ))}
          </div>
        </div>
      </section>

      {/* Security Note */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-xl px-4 text-center sm:px-6">
          <FadeInUp>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              Enterprise-Grade Security
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              All surfaces use end-to-end encryption, role-based access control,
              and full audit trails. Your financial data is safe regardless of
              which platform you use.
            </p>
            <Link
              href="/docs"
              className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Read our security docs <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </FadeInUp>
        </div>
      </section>
    </>
  );
}
