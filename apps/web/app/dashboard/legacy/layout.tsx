"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MessageSquare,
  Inbox,
  Activity,
  BookOpen,
  ArrowLeftRight,
  ArrowLeft,
  History,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/logo";
import { EntityProvider } from "@/lib/entity-context";

// ─── Legacy Sidebar ───────────────────────────────────────────────────────
// Links to the old pages under /legacy/*.
// Only visible to demo users via the main sidebar's "Legacy" section.

const legacyNavItems = [
  {
    label: "Dashboard (old)",
    href: "/dashboard/legacy/dashboard",
    icon: MessageSquare,
  },
  {
    label: "Activity Hub (old)",
    href: "/dashboard/legacy/activity-hub",
    icon: Inbox,
  },
  {
    label: "Financial Pulse (old)",
    href: "/dashboard/legacy/financial-pulse",
    icon: Activity,
  },
  {
    label: "Ledger (old)",
    href: "/dashboard/legacy/ledger",
    icon: BookOpen,
  },
  {
    label: "Operations (old)",
    href: "/dashboard/legacy/operations",
    icon: ArrowLeftRight,
  },
];

export default function LegacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "/";

  function isActive(href: string) {
    return pathname.startsWith(href);
  }

  return (
    <EntityProvider>
      <div className="flex h-screen overflow-hidden">
        {/* Legacy Sidebar */}
        <aside className="hidden md:flex w-64 flex-col border-r border-white/[0.06] bg-[hsl(var(--sidebar-bg))]">
          {/* Logo */}
          <div className="flex flex-col gap-3 border-b border-white/[0.06] p-4">
            <Link href="/dashboard" className="flex items-center gap-2.5">
              <Logo size={32} className="shadow-lg shadow-primary/20" />
              <span className="text-lg font-bold tracking-tight text-[hsl(var(--sidebar-text))]">
                Xenboox
              </span>
            </Link>
          </div>

          {/* Back to app */}
          <div className="px-3 pt-3">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to app</span>
            </Link>
          </div>

          {/* Legacy section label */}
          <div className="px-5 pt-4 pb-1">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">
              <History className="h-3 w-3" />
              Legacy
            </div>
          </div>

          {/* Legacy Nav */}
          <nav className="flex-1 overflow-y-auto py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="space-y-0.5 px-2">
              {legacyNavItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
                      active
                        ? "bg-primary/15 text-primary"
                        : "text-[hsl(var(--sidebar-text-dim))] hover:bg-white/[0.06] hover:text-[hsl(var(--sidebar-text))]",
                    )}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Footer note */}
          <div className="border-t border-white/[0.06] p-3">
            <p className="text-center text-[10px] text-muted-foreground/40">
              Legacy views — old UI preserved for reference
            </p>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </EntityProvider>
  );
}
