"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Home,
  Sparkles,
  Inbox,
  DollarSign,
  BarChart3,
  Bot,
  Settings,
  ChevronsLeft,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/logo";
import { useWhiteLabel } from "@/components/layout/white-label-provider";
import { useEntity } from "@/lib/entity-context";
import { trpc } from "@/lib/trpc/client";

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  countKey?: string;
  match?: string[];
};

const primaryNavItems: NavItem[] = [
  { label: "Home", href: "/dashboard", icon: Home },
  {
    label: "Ask Xenboox",
    href: "/dashboard/chat",
    icon: Sparkles,
  },
  {
    label: "Work",
    href: "/dashboard/work",
    icon: Inbox,
    countKey: "total",
    match: [
      "/dashboard/work",
      "/dashboard/inbox",
      "/dashboard/review-queue",
      "/dashboard/notifications",
    ],
  },
  {
    label: "Money",
    href: "/dashboard/money",
    icon: DollarSign,
    match: [
      "/dashboard/money",
      "/dashboard/transactions",
      "/dashboard/banking",
      "/dashboard/cash",
      "/dashboard/invoicing",
      "/dashboard/bills",
      "/dashboard/expenses",
      "/dashboard/payroll",
      "/dashboard/reconciliation",
      "/dashboard/estimates",
      "/dashboard/tax-compliance",
    ],
  },
  {
    label: "Insights",
    href: "/dashboard/insights",
    icon: BarChart3,
    match: [
      "/dashboard/insights",
      "/dashboard/reports",
      "/dashboard/journal",
      "/dashboard/customers",
      "/dashboard/vendors",
      "/dashboard/close",
    ],
  },
  {
    label: "Agents",
    href: "/dashboard/agents",
    icon: Bot,
    match: ["/dashboard/agents", "/dashboard/agent-monitor"],
  },
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

function useApprovalCounts() {
  const { entityId, isLoaded } = useEntity();
  const enabled = isLoaded && !!entityId;
  const { data: stats } = trpc.ingestion.getStats.useQuery(undefined, {
    staleTime: 60 * 1000, // 1 minute
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    enabled,
  });
  const { data: agentApprovals } = trpc.ingestion.listAgentApprovals.useQuery(
    { limit: 50 },
    {
      staleTime: 60 * 1000, // 1 minute
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      enabled,
    },
  );
  return {
    stats,
    agentApprovals,
    pendingReview: stats?.pendingReview ?? 0,
    processing: stats?.processing ?? 0,
    agentCount: agentApprovals?.items?.length ?? 0,
  };
}

// ─── Agent Status Bar ───────────────────────────────────────────────────

function AgentStatusBar() {
  const { pendingReview, processing, agentCount } = useApprovalCounts();
  const totalPending = pendingReview + agentCount;

  return (
    <div className="space-y-1.5 lg:hidden lg:group-hover:block">
      {(processing > 0 || totalPending > 0) && (
        <div className="flex items-center gap-2 rounded-lg bg-primary/5 px-3 py-2">
          <div className="flex gap-0.5">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500 [animation-delay:150ms]" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500 [animation-delay:300ms]" />
          </div>
          <span className="text-[11px] text-muted-foreground">
            {processing > 0 && `${processing} processing`}
            {processing > 0 && totalPending > 0 && " · "}
            {totalPending > 0 && `${totalPending} pending`}
          </span>
        </div>
      )}
    </div>
  );
}

export function AISidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname() ?? "/";
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--sidebar-width",
      isHovered ? "16rem" : "4.25rem",
    );
  }, [isHovered]);

  const { stats, agentApprovals, pendingReview, agentCount } =
    useApprovalCounts();
  const approvalCounts = {
    ingestion: pendingReview,
    agent: agentCount,
    critical: stats?.failed ?? 0,
    total: pendingReview + agentCount,
  };

  function isActive(item: NavItem) {
    if (item.match) return item.match.some((m) => pathname.startsWith(m));
    if (item.href === "/dashboard") return pathname === item.href;
    return pathname.startsWith(item.href);
  }

  function getCount(countKey?: string): number | undefined {
    if (!countKey) return undefined;
    return approvalCounts[countKey as keyof typeof approvalCounts];
  }

  function renderNavItem(item: NavItem) {
    const count = getCount(item.countKey);
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onClose}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
          "lg:justify-center lg:group-hover:justify-start",
          isActive(item)
            ? "bg-primary/15 text-primary"
            : "text-[hsl(var(--sidebar-text-dim))] hover:bg-white/[0.06] hover:text-[hsl(var(--sidebar-text))]",
        )}
      >
        <item.icon className="h-5 w-5 shrink-0" />
        <span className="flex-1 truncate lg:hidden lg:group-hover:inline">
          {item.label}
        </span>
        {count !== undefined && count > 0 && (
          <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground lg:hidden lg:group-hover:inline-flex">
            {count > 99 ? "99+" : count}
          </span>
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
          <div className="space-y-1 px-2">
            {primaryNavItems.map((item) => renderNavItem(item))}
          </div>
        </nav>

        {/* Bottom Section */}
        <div className="border-t border-white/[0.06] p-3 space-y-2">
          <AgentStatusBar />
        </div>

        {/* User Profile */}
        <div className="border-t border-white/[0.06] p-3">
          <div className="lg:hidden lg:group-hover:flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white text-xs font-bold shrink-0">
              FT
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-[hsl(var(--sidebar-text))] truncate">
                Famara Touray
              </p>
              <p className="text-[10px] text-[hsl(var(--sidebar-text-dim))] truncate">
                Administrator
              </p>
            </div>
            <ChevronsLeft className="h-4 w-4 text-[hsl(var(--sidebar-text-dim))] shrink-0" />
          </div>
        </div>
      </aside>
    </>
  );
}
