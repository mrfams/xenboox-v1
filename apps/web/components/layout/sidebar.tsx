"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import {
  MessageSquare,
  Inbox,
  Activity,
  BookOpen,
  ArrowLeftRight,
  Settings,
  HelpCircle,
  History,
  Database,
  Network,
  Upload,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/logo";
import { useWhiteLabel } from "@/components/layout/white-label-provider";
import { Badge } from "@/components/ui";
import {
  AttentionDot,
  CountPill,
} from "@/components/layout/notification-badge";
import {
  useAttentionSignals,
  type AttentionTotals,
  type NavKey,
} from "@/lib/hooks/use-attention-signals";

// ─── AI-Native Sidebar ─────────────────────────────────────────────────────
//
// 5 surfaces, not 21. The human's mental model, not the accountant's:
//   1. Command Center  — AI is your CFO. Talk, it acts.
//   2. Activity Hub    — What needs YOUR attention right now.
//   3. Financial Pulse — AI-narrated financial health.
//   4. Ledger          — The accounting records (when you need to look).
//   5. Operations      — Money in, money out (AI handles, you approve).

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  attentionKey?: NavKey;
  match?: string[];
  shortcut?: string;
};

const primaryNavItems: NavItem[] = [
  {
    label: "Command Center",
    href: "/dashboard",
    icon: MessageSquare,
    attentionKey: "command-center",
    shortcut: "1",
  },
  {
    label: "Activity Hub",
    href: "/dashboard/activity-hub",
    icon: Inbox,
    attentionKey: "activity-hub",
    match: ["/dashboard/activity-hub"],
    shortcut: "2",
  },
  {
    label: "Financial Pulse",
    href: "/dashboard/financial-pulse",
    icon: Activity,
    attentionKey: "financial-pulse",
    match: ["/dashboard/financial-pulse"],
    shortcut: "3",
  },
  {
    label: "Ledger",
    href: "/dashboard/ledger",
    icon: BookOpen,
    attentionKey: "ledger",
    match: ["/dashboard/ledger"],
    shortcut: "4",
  },
  {
    label: "Operations",
    href: "/dashboard/operations",
    icon: ArrowLeftRight,
    attentionKey: "operations",
    match: ["/dashboard/operations"],
    shortcut: "5",
  },
];

const bottomNavItems: NavItem[] = [
  { label: "Audit Trail", href: "/dashboard/audit-trail", icon: History },
  { label: "Knowledge Base", href: "/dashboard/knowledge", icon: Database },
  {
    label: "Knowledge Graph",
    href: "/dashboard/knowledge-graph",
    icon: Network,
  },
  { label: "Batch Ingestion", href: "/dashboard/ingestion", icon: Upload },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

function WhiteLabelLogo() {
  const { branding } = useWhiteLabel();

  if (branding?.isActive && branding.displayName) {
    return (
      <Link
        href="/dashboard"
        className="flex items-center gap-2 lg:justify-center lg:group-hover:justify-start"
      >
        {branding.logoUrl ? (
          <img
            src={branding.logoUrl}
            alt={branding.displayName}
            className="h-8 w-8 rounded-lg object-contain"
          />
        ) : (
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg font-bold text-sm"
            style={{
              backgroundColor:
                branding.colorScheme?.primary || "hsl(var(--primary))",
              color:
                branding.colorScheme?.primaryForeground ||
                "hsl(var(--primary-foreground))",
            }}
          >
            {branding.displayName.charAt(0)}
          </div>
        )}
        <span
          className="text-lg font-bold tracking-tight lg:hidden lg:group-hover:inline"
          style={
            branding.colorScheme?.primary
              ? { color: branding.colorScheme.primary }
              : undefined
          }
        >
          {branding.displayName}
        </span>
      </Link>
    );
  }

  return (
    <Link
      href="/dashboard"
      className="flex items-center gap-2.5 lg:justify-center lg:group-hover:justify-start"
    >
      <Logo size={32} className="shadow-lg shadow-primary/20" />
      <span className="text-lg font-bold tracking-tight text-[hsl(var(--sidebar-text))] lg:hidden lg:group-hover:inline">
        Xenboox
      </span>
    </Link>
  );
}

// ─── Attention Strip ──────────────────────────────────────────────────────
//
// Bottom-of-sidebar summary: "N need your attention" → Activity Hub.
// A quiet rail is the success state.

function AttentionStrip({
  totals,
  processing,
  onClose,
}: {
  totals: AttentionTotals;
  processing: number;
  onClose: () => void;
}) {
  if (totals.action > 0) {
    return (
      <Link
        href="/dashboard/activity-hub"
        onClick={onClose}
        className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 transition-colors hover:bg-destructive/15"
      >
        <AttentionDot tone="action" />
        <span className="truncate text-[11px] font-semibold text-destructive">
          {totals.action} need your attention
        </span>
      </Link>
    );
  }

  if (totals.new > 0) {
    return (
      <Link
        href="/dashboard/activity-hub"
        onClick={onClose}
        className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 transition-colors hover:bg-primary/15"
      >
        <AttentionDot tone="new" />
        <span className="truncate text-[11px] font-semibold text-primary">
          {totals.new} new update{totals.new === 1 ? "" : "s"}
        </span>
      </Link>
    );
  }

  if (processing > 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-primary/5 px-3 py-2">
        <div className="flex gap-0.5">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500 [animation-delay:150ms]" />
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500 [animation-delay:300ms]" />
        </div>
        <span className="truncate text-[11px] text-muted-foreground">
          {processing} processing
        </span>
      </div>
    );
  }

  return null;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname() ?? "/";
  const [isHovered, setIsHovered] = useState(false);
  const { data: session } = useSession();

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--sidebar-width",
      isHovered ? "16rem" : "4.25rem",
    );
  }, [isHovered]);

  const attention = useAttentionSignals();

  function isActive(item: NavItem) {
    if (item.match) return item.match.some((m) => pathname.startsWith(m));
    if (item.href === "/dashboard") return pathname === item.href;
    return pathname.startsWith(item.href);
  }

  const router = useRouter();

  const prefetchRoute = useCallback(
    (href: string) => {
      router.prefetch(href);
    },
    [router],
  );

  function renderNavItem(item: NavItem) {
    const signal = item.attentionKey
      ? attention.byKey[item.attentionKey]
      : undefined;
    const hasAttention = !!signal && signal.count > 0;
    const count = signal?.count ?? 0;
    const tone = signal?.tone ?? "action";

    return (
      <Link
        key={item.href}
        href={item.href}
        prefetch={true}
        onMouseEnter={() => prefetchRoute(item.href)}
        onClick={onClose}
        aria-label={
          hasAttention
            ? `${item.label} — ${count} ${tone === "action" ? "need your attention" : "new updates"}`
            : item.shortcut
              ? `${item.label}, keyboard shortcut ${item.shortcut}`
              : undefined
        }
        title={
          item.shortcut ? `${item.label} (Press ${item.shortcut})` : item.label
        }
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
          "lg:justify-center lg:group-hover:justify-start",
          isActive(item)
            ? "bg-primary/15 text-primary"
            : "text-[hsl(var(--sidebar-text-dim))] hover:bg-white/[0.06] hover:text-[hsl(var(--sidebar-text))]",
        )}
        aria-current={isActive(item) ? "page" : undefined}
      >
        <span className="relative">
          <item.icon className="h-4 w-4 shrink-0" />
          {hasAttention && (
            <AttentionDot
              key={count}
              tone={tone}
              className="absolute -right-1 -top-0.5 lg:group-hover:hidden"
            />
          )}
        </span>
        <span className="flex-1 truncate lg:hidden lg:group-hover:inline">
          {item.label}
        </span>
        {/* Keyboard shortcut badge — visible when sidebar is expanded */}
        {item.shortcut && (
          <span className="hidden lg:inline-flex items-center justify-center h-5 min-w-[20px] rounded bg-white/[0.08] px-1 text-[10px] font-mono font-bold text-[hsl(var(--sidebar-text-dim))] group-hover:bg-white/[0.12]">
            {item.shortcut}
          </span>
        )}
        {hasAttention && (
          <CountPill
            count={count}
            tone={tone}
            className="lg:hidden lg:group-hover:inline-flex"
          />
        )}
      </Link>
    );
  }

  return (
    <>
      {/* Mobile overlay — only on md+ where sidebar is used (mobile uses bottom nav) */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        data-tour="sidebar"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          "group fixed inset-y-0 left-0 z-[49] flex w-64 flex-col border-r border-white/[0.06] transition-all duration-200 ease-in-out",
          "bg-[hsl(var(--sidebar-bg))]",
          "lg:translate-x-0 lg:w-[var(--sidebar-width)]",
          "hidden md:flex",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Logo */}
        <div className="flex flex-col gap-3 border-b border-white/[0.06] p-4">
          <WhiteLabelLogo />
        </div>

        {/* Primary Navigation — 5 AI-native surfaces */}
        <nav className="flex-1 overflow-y-auto py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="space-y-0.5 px-2">
            {primaryNavItems.map((item) => renderNavItem(item))}
          </div>
        </nav>

        {/* Bottom Nav + Attention Strip */}
        <div className="border-t border-white/[0.06] p-3 space-y-2">
          <div className="lg:hidden lg:group-hover:block">
            <AttentionStrip
              totals={attention.totals}
              processing={attention.processing}
              onClose={onClose}
            />
          </div>
          <div className="space-y-0.5">
            {bottomNavItems.map((item) => renderNavItem(item))}
          </div>
        </div>

        {/* Help & Support */}
        <div className="border-t border-white/[0.06] p-3">
          <Link
            href="/dashboard/help"
            prefetch={true}
            onMouseEnter={() => prefetchRoute("/dashboard/help")}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-[hsl(var(--sidebar-text-dim))] hover:bg-white/[0.06] hover:text-[hsl(var(--sidebar-text))] transition-colors lg:justify-center lg:group-hover:justify-start"
          >
            <HelpCircle className="h-4 w-4 shrink-0" />
            <span className="flex-1 truncate lg:hidden lg:group-hover:inline">
              Help & Support
            </span>
          </Link>
        </div>
      </aside>
    </>
  );
}
