"use client";

import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import {
  Globe,
  Smartphone,
  Monitor,
  ArrowRight,
  Check,
  Apple,
  Play,
  Sparkles,
} from "lucide-react";
import {
  MarketingShell,
  PageHero,
  Reveal,
  GlassCard,
  CtaBand,
} from "../components/marketing-primitives";

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
      {
        name: "App Store",
        icon: Apple,
        href: "https://apps.apple.com/app/xenboox/id1234567890",
        label: "Download on the App Store",
      },
      {
        name: "Google Play",
        icon: Play,
        href: "https://play.google.com/store/apps/details?id=com.xenboox.app",
        label: "Get it on Google Play",
      },
    ],
  },
  {
    name: "Desktop App",
    icon: Monitor,
    description:
      "Offline-first desktop application built with a lightweight native runtime.",
    features: [
      "Works offline with local cache",
      "Automatic sync when reconnected",
      "Native performance",
      "Windows 10+ & macOS 12+",
      "Auto-updates",
    ],
    downloads: [
      {
        name: "Windows",
        icon: Monitor,
        href: "https://downloads.xenboox.com/desktop/xenboox-windows-x64.msi",
        label: "Download for Windows (.msi)",
      },
      {
        name: "macOS",
        icon: Apple,
        href: "https://downloads.xenboox.com/desktop/xenboox-macos-x64.dmg",
        label: "Download for macOS (.dmg)",
      },
    ],
  },
];

const faqs = [
  {
    question: "Is the web app free to use?",
    answer:
      "Yes. The Free tier gives you 1 entity, a core AI assistant, up to 50 journal entries/month, and web access. Paid plans unlock more entities, the full agent suite, and all platforms.",
  },
  {
    question: "When will the mobile app be available?",
    answer:
      "The Xenboox mobile app is available for download on the App Store and Google Play. Get real-time notifications, work offline, and manage your business from anywhere.",
  },
  {
    question: "When will the desktop app be available?",
    answer:
      "The Xenboox desktop app is available for Windows and macOS. Download the signed installer and enjoy offline-first accounting with automatic sync.",
  },
  {
    question: "Does the desktop app work offline?",
    answer:
      "Yes. The desktop app uses local caching so you can keep working without an internet connection. Data syncs automatically when you reconnect.",
  },
  {
    question: "Can I switch between platforms?",
    answer:
      "Absolutely. Your data syncs seamlessly across all platforms. Start an entry on mobile, finish it on desktop — it's all the same data.",
  },
];

function PlatformCard({
  platform,
  index,
}: {
  platform: (typeof platforms)[number];
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
        delay: index * 0.08,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
    >
      <GlassCard className="flex h-full flex-col p-7">
        <div className="mb-4 flex items-center justify-between">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 shadow-lg">
            <platform.icon className="h-6 w-6 text-white" />
          </div>
          {platform.badge && (
            <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
              {platform.badge}
            </span>
          )}
        </div>
        <h2 className="text-xl font-bold text-white">{platform.name}</h2>
        <p className="mt-2 text-sm text-white/55">{platform.description}</p>
        <ul className="mt-6 flex-1 space-y-2.5">
          {platform.features.map((feature) => (
            <li
              key={feature}
              className="flex items-start gap-2.5 text-sm text-white/70"
            >
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
              {feature}
            </li>
          ))}
        </ul>
        <div className="mt-8 space-y-2">
          {platform.cta ? (
            <Link
              href={platform.ctaHref}
              className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-sm font-medium text-white shadow-lg shadow-indigo-600/30 transition-all duration-300 hover:scale-[1.03]"
            >
              {platform.cta}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          ) : platform.downloads ? (
            platform.downloads.map((download) => (
              <a
                key={download.name}
                href={download.href}
                className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-white/15 bg-white/5 text-sm font-medium text-white/85 transition-colors hover:bg-white/10"
              >
                <download.icon className="mr-2 h-4 w-4" />
                {download.label}
              </a>
            ))
          ) : platform.stores ? (
            platform.stores.map((store) => (
              <a
                key={store.name}
                href={store.href}
                className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-white/15 bg-white/5 text-sm font-medium text-white/85 transition-colors hover:bg-white/10"
              >
                <store.icon className="mr-2 h-4 w-4" />
                {store.label}
              </a>
            ))
          ) : null}
        </div>
      </GlassCard>
    </motion.div>
  );
}

export default function DownloadPage() {
  return (
    <MarketingShell>
      <PageHero
        eyebrow="Download"
        title="Xenboox, everywhere"
        highlight="you work"
        subtitle="Available on web, mobile, and desktop. Choose the platform that works best for you."
      />

      <section className="py-12">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 sm:px-6 lg:grid-cols-3">
          {platforms.map((platform, i) => (
            <PlatformCard key={platform.name} platform={platform} index={i} />
          ))}
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <Reveal className="mb-10 text-center">
            <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-white/60">
              <Sparkles className="h-3 w-3 text-indigo-400" />
              FAQ
            </span>
            <h2 className="text-3xl font-bold tracking-tight text-white">
              Frequently asked questions
            </h2>
          </Reveal>
          <div className="grid gap-4 sm:grid-cols-2">
            {faqs.map((f, i) => (
              <Reveal key={f.question} delay={i * 0.05}>
                <GlassCard className="h-full p-6">
                  <h3 className="font-semibold text-white">{f.question}</h3>
                  <p className="mt-2 text-sm text-white/55">{f.answer}</p>
                </GlassCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <CtaBand
        title="Ready to get started?"
        subtitle="Create your free account and start using the web app today."
        primaryHref="/register"
        primaryLabel="Create Free Account"
      />
    </MarketingShell>
  );
}
