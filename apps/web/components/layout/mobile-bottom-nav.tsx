"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback } from "react";
import {
  MessageSquare,
  Inbox,
  Activity,
  BookOpen,
  ArrowLeftRight,
  Users,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  useAttentionSignals,
  type NavKey,
} from "@/lib/hooks/use-attention-signals";

// ─── Mobile Bottom Navigation ─────────────────────────────────────────────
//
// 5-surface bottom nav for mobile (< 768px). Hidden on desktop where the
// sidebar handles navigation. Each item has a 44x44px touch target minimum.

type BottomNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  attentionKey?: NavKey;
};

const navItems: BottomNavItem[] = [
  {
    label: "Command",
    href: "/dashboard",
    icon: MessageSquare,
    attentionKey: "command-center",
  },
  {
    label: "Activity",
    href: "/dashboard/tasks",
    icon: Inbox,
    attentionKey: "activity-hub",
  },
  {
    label: "Pulse",
    href: "/dashboard/financial-pulse",
    icon: Activity,
    attentionKey: "financial-pulse",
  },
  {
    label: "Ledger",
    href: "/dashboard/ledger",
    icon: BookOpen,
    attentionKey: "ledger",
  },
  {
    label: "Ops",
    href: "/dashboard/operations",
    icon: ArrowLeftRight,
    attentionKey: "operations",
  },
  {
    label: "People",
    href: "/dashboard/people",
    icon: Users,
    attentionKey: "people",
  },
];

export function MobileBottomNav() {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const attention = useAttentionSignals();

  const prefetchRoute = useCallback(
    (href: string) => {
      router.prefetch(href);
    },
    [router],
  );

  function isActive(item: BottomNavItem) {
    if (item.href === "/dashboard") return pathname === item.href;
    return pathname.startsWith(item.href);
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-background/95 backdrop-blur-sm md:hidden"
      aria-label="Main navigation"
    >
      <div className="flex items-center justify-around px-1 py-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);
          const signal = item.attentionKey
            ? attention.byKey[item.attentionKey]
            : undefined;
          const hasAttention = !!signal && signal.count > 0;

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              onMouseEnter={() => prefetchRoute(item.href)}
              onTouchStart={() => prefetchRoute(item.href)}
              aria-label={
                hasAttention
                  ? `${item.label} — ${signal.count} items need attention`
                  : item.label
              }
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex flex-col items-center gap-0.5 rounded-lg px-3 py-2 min-w-[48px] min-h-[48px] justify-center transition-colors",
                active
                  ? "text-primary"
                  : "text-muted-foreground active:text-foreground",
              )}
            >
              <span className="relative">
                <Icon className="h-5 w-5" />
                {hasAttention && (
                  <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-destructive animate-pulse" />
                )}
              </span>
              <span className="text-[10px] font-medium leading-tight">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
