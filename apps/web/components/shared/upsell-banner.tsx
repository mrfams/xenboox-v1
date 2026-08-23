"use client";

import Link from "next/link";
import { ArrowRight, Lock, Zap } from "lucide-react";

type UpsellBannerProps = {
  /** The feature the user is trying to access */
  feature: string;
  /** What the upgrade unlocks */
  description?: string;
  /** Which plan to recommend */
  plan?: "starter" | "growth" | "pro";
  /** Where this banner appears (for tracking) */
  source?: string;
  /** Inline (card style) or floating (fixed bottom) */
  variant?: "card" | "inline";
};

const planDetails = {
  starter: {
    name: "Starter",
    price: "$29/mo",
    unlocks: "All 19 AI agents, unlimited journal entries, AP/AR, payroll",
  },
  growth: {
    name: "Growth",
    price: "$79/mo",
    unlocks: "Multi-currency, 10 entities, fixed assets, inventory",
  },
  pro: {
    name: "Pro",
    price: "$199/mo",
    unlocks: "Unlimited entities, custom integrations, priority support",
  },
};

export function UpsellBanner({
  feature,
  description,
  plan = "starter",
  source,
  variant = "card",
}: UpsellBannerProps) {
  const details = planDetails[plan];

  if (variant === "floating") {
    return (
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 max-w-md w-[calc(100%-2rem)]">
        <div className="rounded-2xl border border-blue-200 dark:border-blue-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg shadow-xl p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/40 shrink-0">
              <Lock className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">
                {feature} requires {details.name}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {description || details.unlocks}
              </p>
            </div>
            <Link
              href="/pricing"
              className="shrink-0 inline-flex h-8 items-center gap-1 rounded-lg bg-blue-600 px-3 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
              data-upsell-source={source}
            >
              Upgrade
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/40 shrink-0">
          <Zap className="h-4 w-4 text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">{feature}</p>
          <p className="text-xs text-muted-foreground">
            {description ||
              `Upgrade to ${details.name} to unlock ${feature.toLowerCase()}`}
          </p>
        </div>
        <Link
          href="/pricing"
          className="shrink-0 inline-flex h-8 items-center gap-1 rounded-lg bg-blue-600 px-3 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
          data-upsell-source={source}
        >
          Upgrade
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

// ─── Sidebar upgrade prompt for free users ───────────────────────────────────

export function SidebarUpgradePrompt() {
  return (
    <div className="mx-3 mb-3 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200/50 dark:border-blue-800/50 p-3.5">
      <div className="flex items-center gap-2 mb-2">
        <Zap className="h-4 w-4 text-blue-600" />
        <p className="text-xs font-semibold text-blue-900 dark:text-blue-200">
          Free Plan
        </p>
      </div>
      <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed mb-3">
        You&apos;re using 1 of 1 agents. Upgrade to unlock all 19 AI agents.
      </p>
      <Link
        href="/pricing"
        className="flex items-center justify-center gap-1.5 h-8 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors"
      >
        Upgrade to Starter — $29/mo
        <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}
