"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Compass,
  MessageSquare,
  Wallet,
  Receipt,
  CreditCard,
  Users,
  BarChart3,
  BookOpen,
  Activity,
  Settings,
  HelpCircle,
  RefreshCw,
  FileText,
  Landmark,
  ScrollText,
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

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  // Which attention bucket lights this item up (approvals → Inbox, report
  // ready → Reports, …). The two-tone system lives in use-attention-signals.
  attentionKey?: NavKey;
  attrs?: Record<string, string>;
  match?: string[];
};

const primaryNavItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    attentionKey: "dashboard",
  },
  {
    label: "Explore",
    href: "/dashboard/explore",
    icon: Compass,
    match: ["/dashboard/explore"],
  },
  {
    label: "AI Command Center",
    href: "/dashboard/chat",
    icon: MessageSquare,
    attrs: { "data-tour": "cfo-agent" },
  },
  {
    label: "Inbox",
    href: "/dashboard/inbox",
    icon: Receipt,
    attentionKey: "inbox",
    match: [
      "/dashboard/inbox",
      "/dashboard/review-queue",
      "/dashboard/notifications",
    ],
  },
  {
    label: "Transactions",
    href: "/dashboard/transactions",
    icon: BookOpen,
  },
  {
    label: "Banking",
    href: "/dashboard/banking",
    icon: Wallet,
    match: ["/dashboard/banking", "/dashboard/cash", "/dashboard/fixed-assets"],
  },
  {
    label: "General Ledger",
    href: "/dashboard/journal",
    icon: BookOpen,
    match: [
      "/dashboard/journal",
      "/dashboard/chart-of-accounts",
      "/dashboard/trial-balance",
    ],
  },
  {
    label: "Customers",
    href: "/dashboard/customers",
    icon: Users,
  },
  {
    label: "Vendors",
    href: "/dashboard/vendors",
    icon: Users,
  },
  {
    label: "Invoicing",
    href: "/dashboard/invoicing",
    icon: Receipt,
    attentionKey: "invoicing",
  },
  {
    label: "Estimates & Quotes",
    href: "/dashboard/estimates",
    icon: FileText,
  },
  {
    label: "Bills",
    href: "/dashboard/bills",
    icon: CreditCard,
  },
  {
    label: "Expenses",
    href: "/dashboard/expenses",
    icon: Receipt,
  },
  {
    label: "Payroll",
    href: "/dashboard/payroll",
    icon: Users,
    attentionKey: "payroll",
  },
  {
    label: "Tax & Compliance",
    href: "/dashboard/tax-compliance",
    icon: Landmark,
  },
  {
    label: "Reports",
    href: "/dashboard/reports",
    icon: BarChart3,
    attentionKey: "reports",
    match: [
      "/dashboard/reports",
      "/dashboard/trial-balance",
      "/dashboard/consolidation",
      "/dashboard/documents",
    ],
  },
  {
    label: "Close Center",
    href: "/dashboard/close",
    icon: RefreshCw,
    badge: "New",
    attentionKey: "close",
  },
  {
    label: "Reconciliation",
    href: "/dashboard/reconciliation/center",
    icon: RefreshCw,
    attentionKey: "reconciliation",
  },
  { label: "Agent Monitor", href: "/dashboard/agent-monitor", icon: Activity },
  {
    label: "Activity Log",
    href: "/dashboard/activity",
    icon: ScrollText,
  },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

const bottomNavItems: NavItem[] = [
  { label: "Help & Support", href: "/dashboard/help", icon: HelpCircle },
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
// Bottom-of-sidebar summary that answers "is anything waiting on me, and
// where?" at a glance:
//   - pulsing red "N need your attention" → Inbox (the review queue — where
//     approvals and escalations are resolved)
//   - indigo "N new updates" → the notifications page
//   - green processing pulse → agents still working (nothing needed from you)
// Renders nothing when there is nothing to say — a quiet rail is the
// success state, not a permanent red dot.

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
        href="/dashboard/inbox"
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
        href="/dashboard/notifications"
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

// The Explore hub (dashboard/explore) is currently in a soft-launch — only
// demo@xenboox.com sees it in the sidebar. Remove this gate (and the filter
// below) when it ships to everyone.
const EXPLORE_ALLOWED_EMAIL = "demo@xenboox.com";

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname() ?? "/";
  const [isHovered, setIsHovered] = useState(false);
  const { data: session } = useSession();
  const isExploreAllowed =
    session?.user?.email?.toLowerCase() === EXPLORE_ALLOWED_EMAIL;

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
        onClick={onClose}
        aria-label={
          hasAttention
            ? `${item.label} — ${count} ${tone === "action" ? "need your attention" : "new updates"}`
            : undefined
        }
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
          "lg:justify-center lg:group-hover:justify-start",
          isActive(item)
            ? "bg-primary/15 text-primary"
            : "text-[hsl(var(--sidebar-text-dim))] hover:bg-white/[0.06] hover:text-[hsl(var(--sidebar-text))]",
        )}
        aria-current={isActive(item) ? "page" : undefined}
        {...(item.attrs ?? {})}
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
        {hasAttention && (
          <CountPill
            count={count}
            tone={tone}
            className="lg:hidden lg:group-hover:inline-flex"
          />
        )}
        {item.badge && (
          <Badge
            variant="secondary"
            className="text-[10px] px-1.5 py-0 lg:hidden lg:group-hover:inline-flex"
          >
            {item.badge}
          </Badge>
        )}
      </Link>
    );
  }

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
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
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Logo */}
        <div className="flex flex-col gap-3 border-b border-white/[0.06] p-4">
          <WhiteLabelLogo />
        </div>

        {/* Primary Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="space-y-0.5 px-2">
            {primaryNavItems
              .filter(
                (item) =>
                  item.href !== "/dashboard/explore" || isExploreAllowed,
              )
              .map((item) => renderNavItem(item))}
          </div>
        </nav>

        {/* Bottom Nav + User Profile */}
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
