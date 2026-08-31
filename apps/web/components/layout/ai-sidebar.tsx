"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Sparkles,
  Inbox,
  Activity,
  BookOpen,
  ArrowLeftRight,
  Settings,
  HelpCircle,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/logo";
import { useWhiteLabel } from "@/components/layout/white-label-provider";
import { useEntity } from "@/lib/entity-context";
import { getRoleConfig } from "@/lib/role-config";
import { trpc } from "@/lib/trpc/client";

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  countKey?: string;
  match?: string[];
};

// ─── AI-Native Navigation ────────────────────────────────────────────────
// 5 surfaces, not 22. The AI is the primary interface.
// Command Center: AI is your CFO. Chat-first. Proactive briefings.
// Activity Hub: Human-in-the-loop queue. AI-curated, prioritized.
// Financial Pulse: AI-narrated financial health. Visual, not tabular.
// Ledger: The accounting records. Deep-dive when needed.
// Operations: Money in, money out. AI handles, you approve.
const primaryNavItems: NavItem[] = [
  {
    label: "Command Center",
    href: "/dashboard",
    icon: Sparkles,
  },
  {
    label: "Activity Hub",
    href: "/dashboard/activity-hub",
    icon: Inbox,
    countKey: "total",
  },
  {
    label: "Financial Pulse",
    href: "/dashboard/financial-pulse",
    icon: Activity,
  },
  {
    label: "Ledger",
    href: "/dashboard/ledger",
    icon: BookOpen,
  },
  {
    label: "Operations",
    href: "/dashboard/operations",
    icon: ArrowLeftRight,
  },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

function WhiteLabelLogo({ expanded }: { expanded?: boolean }) {
  const { branding } = useWhiteLabel();

  if (branding?.isActive && branding.displayName) {
    return (
      <Link
        href="/dashboard"
        className={cn(
          "flex items-center gap-2",
          expanded ? "md:justify-start" : "md:justify-center",
          "lg:justify-center",
        )}
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
          className={cn(
            "text-lg font-bold tracking-tight",
            expanded ? "md:inline" : "md:hidden",
            "lg:hidden",
          )}
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
      className={cn(
        "flex items-center gap-2.5",
        expanded ? "md:justify-start" : "md:justify-center",
        "lg:justify-center",
      )}
    >
      <Logo size={32} className="shadow-lg shadow-primary/20" />
      <span
        className={cn(
          "text-lg font-bold tracking-tight text-[hsl(var(--sidebar-text))]",
          expanded ? "md:inline" : "md:hidden",
          "lg:hidden",
        )}
      >
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
      refetchOnWindowFocus: true,
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

function AgentStatusBar({ expanded }: { expanded: boolean }) {
  const { pendingReview, processing, agentCount } = useApprovalCounts();
  const totalPending = pendingReview + agentCount;

  // The whole section (border included) disappears when there is nothing
  // processing or pending — no more empty strip above the avatar.
  if (processing <= 0 && totalPending <= 0) return null;

  const statusText = [
    processing > 0 ? `${processing} processing` : null,
    totalPending > 0 ? `${totalPending} pending` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="border-t border-white/[0.06] p-3">
      <div
        className="flex items-center justify-center gap-2 rounded-lg bg-primary/5 px-2 py-1.5"
        title={statusText}
      >
        <div className="flex gap-0.5">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500 [animation-delay:150ms]" />
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500 [animation-delay:300ms]" />
        </div>
        <span
          className={cn(
            "text-[10px] text-muted-foreground",
            expanded ? "md:block" : "md:hidden",
            "lg:hidden",
          )}
        >
          {statusText}
        </span>
      </div>
    </div>
  );
}

export function AISidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname() ?? "/";

  const [isHovered, setIsHovered] = useState(false);

  // Collapse overlay on route change
  useEffect(() => {
    setIsHovered(false);
  }, [pathname]);

  const { entityRole } = useEntity();
  const roleConfig = getRoleConfig(entityRole);

  const { stats, pendingReview, agentCount } = useApprovalCounts();
  const approvalCounts = {
    ingestion: pendingReview,
    agent: agentCount,
    critical: stats?.failed ?? 0,
    total: pendingReview + agentCount,
  };

  // Filter nav items by role visibility
  const visibleNavItems = primaryNavItems.filter((item) => {
    // Map nav href to surface key
    const surfaceMap: Record<string, string> = {
      "/dashboard": "command-center",
      "/dashboard/activity-hub": "activity-hub",
      "/dashboard/financial-pulse": "financial-pulse",
      "/dashboard/ledger": "ledger",
      "/dashboard/operations": "operations",
    };
    const surface = surfaceMap[item.href];
    if (!surface) return true;
    return roleConfig.surfaces[surface as keyof typeof roleConfig.surfaces] !== "hidden";
  });

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
        onClick={() => {
          onClose();
          setIsHovered(false);
        }}
        title={item.label}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
          "md:flex-col md:gap-1 md:px-1 md:py-2 md:text-[10px] md:leading-tight",
          isActive(item)
            ? "bg-primary/15 text-primary"
            : "text-[hsl(var(--sidebar-text-dim))] hover:bg-white/[0.06] hover:text-[hsl(var(--sidebar-text))]",
        )}
      >
        <span className="relative shrink-0">
          <item.icon className="h-5 w-5" />
          {count !== undefined && count > 0 && (
            <span className="absolute -right-2 -top-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground ring-2 ring-[hsl(var(--sidebar-bg))]">
              {count > 99 ? "99+" : count}
            </span>
          )}
        </span>
        <span
          className={cn(
            "flex-1 truncate",
            isHovered
              ? "md:block md:flex-none md:w-full md:text-center"
              : "md:hidden",
            "lg:block lg:flex-none lg:w-full lg:text-center",
          )}
        >
          {item.label}
        </span>
      </Link>
    );
  }

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Tablet: hover-expand overlay backdrop */}
      {isHovered && (
        <div
          className="fixed inset-0 z-[54] bg-black/50 hidden md:block lg:hidden"
          onClick={() => setIsHovered(false)}
        />
      )}

      <aside
        data-tour="sidebar"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          "group fixed inset-y-0 left-0 z-[49] flex w-64 flex-col border-r border-white/[0.06] transition-all duration-200 ease-in-out",
          "bg-[hsl(var(--sidebar-bg))]",
          isOpen ? "translate-x-0" : "-translate-x-full",
          // Tablet: always-visible icon rail
          "md:translate-x-0 md:w-16",
          // Tablet hover: overlay expand
          isHovered && "md:w-64 md:z-[55]",
          // Desktop: permanent rail with labels
          "lg:w-[var(--sidebar-width)]",
        )}
      >
        {/* Logo */}
        <div className="flex flex-col gap-3 border-b border-white/[0.06] p-4">
          <WhiteLabelLogo expanded={isHovered} />
        </div>

        {/* Primary Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="space-y-1 px-2">
            {visibleNavItems.map((item) => renderNavItem(item))}
          </div>
        </nav>

        {/* Agent status — renders only when something is processing/pending */}
        <AgentStatusBar expanded={isHovered} />

        {/* Settings + Help */}
        <div className="border-t border-white/[0.06] p-3 space-y-1">
          {roleConfig.canAccessSettings && (
            <Link
              href="/dashboard/settings"
              title="Settings"
              onClick={() => setIsHovered(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                "md:flex-col md:gap-1 md:px-1 md:py-2 md:text-[10px] md:leading-tight",
                pathname === "/dashboard/settings"
                  ? "bg-primary/15 text-primary"
                  : "text-[hsl(var(--sidebar-text-dim))] hover:bg-white/[0.06] hover:text-[hsl(var(--sidebar-text))]",
              )}
            >
              <Settings className="h-5 w-5" />
              <span
                className={cn(
                  "flex-1 truncate",
                  isHovered
                    ? "md:block md:flex-none md:w-full md:text-center"
                    : "md:hidden",
                  "lg:block lg:flex-none lg:w-full lg:text-center",
                )}
              >
                Settings
              </span>
            </Link>
          )}
          <Link
            href="/dashboard/help"
            title="Help & Support"
            onClick={() => setIsHovered(false)}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[hsl(var(--sidebar-text-dim))] hover:bg-white/[0.06] hover:text-[hsl(var(--sidebar-text))] transition-all duration-150",
              "md:flex-col md:gap-1 md:px-1 md:py-2 md:text-[10px] md:leading-tight",
            )}
          >
            <HelpCircle className="h-5 w-5" />
            <span
              className={cn(
                "flex-1 truncate",
                isHovered
                  ? "md:block md:flex-none md:w-full md:text-center"
                  : "md:hidden",
                "lg:block lg:flex-none lg:w-full lg:text-center",
              )}
            >
              Help
            </span>
          </Link>
        </div>
      </aside>
    </>
  );
}
