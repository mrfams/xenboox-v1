"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  MessageSquare,
  BookOpen,
  FileText,
  CreditCard,
  Users,
  Landmark,
  Wallet,
  Smartphone,
  FolderOpen,
  Settings,
  HelpCircle,
  BarChart3,
  HardHat,
  Boxes,
  Shield,
  PiggyBank,
  Search,
  Receipt,
  Building2,
  ChevronDown,
  DollarSign,
  ShoppingCart,
  TrendingUp,
  CalendarDays,
  Activity,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui";
import { EntitySwitcher } from "@/components/layout/entity-switcher";
import { useWhiteLabel } from "@/components/layout/white-label-provider";
import { trpc } from "@/lib/trpc/client";

type NavGroup = {
  label: string;
  items: Array<{
    label: string;
    href: string;
    icon: LucideIcon;
    badge?: string;
    countKey?: string;
    attrs?: Record<string, string>;
  }>;
};

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  attrs?: Record<string, string>;
};

type ApprovalCounts = {
  ingestion: number;
  agent: number;
  critical: number;
  total: number;
};

const navGroups: NavGroup[] = [
  {
    label: "Main",
    items: [
      { label: "Home", href: "/dashboard", icon: LayoutDashboard },
      {
        label: "Ask CFO Agent",
        href: "/dashboard/chat",
        icon: MessageSquare,
        badge: "AI",
        attrs: { "data-tour": "cfo-agent" },
      },
    ],
  },
  {
    label: "Money",
    items: [
      {
        label: "Cash Overview",
        href: "/dashboard/cash/overview",
        icon: Wallet,
      },
      { label: "Bank & Recon", href: "/dashboard/treasury", icon: Landmark },
      {
        label: "Mobile Money",
        href: "/dashboard/mobile-money",
        icon: Smartphone,
      },
      { label: "Cash & Imprest", href: "/dashboard/cash", icon: Wallet },
    ],
  },
  {
    label: "Sales",
    items: [
      { label: "Invoices (AR)", href: "/dashboard/ar/invoices", icon: Receipt },
      { label: "Customers", href: "/dashboard/ar/customers", icon: Users },
      { label: "AR Aging", href: "/dashboard/ar/aging", icon: TrendingUp },
    ],
  },
  {
    label: "Purchases",
    items: [
      { label: "Bills (AP)", href: "/dashboard/ap/invoices", icon: CreditCard },
      { label: "Suppliers", href: "/dashboard/ap/suppliers", icon: Building2 },
      {
        label: "Purchase Orders",
        href: "/dashboard/ap/pos",
        icon: ShoppingCart,
      },
      {
        label: "Payment Schedule",
        href: "/dashboard/ap/payment-schedule",
        icon: CalendarDays,
      },
    ],
  },
  {
    label: "Payroll & People",
    items: [
      {
        label: "Payroll",
        href: "/dashboard/payroll/pipeline",
        icon: Users,
        badge: "AI",
      },
      {
        label: "Expenses",
        href: "/dashboard/expense/pipeline",
        icon: DollarSign,
        badge: "AI",
      },
    ],
  },
  {
    label: "Assets & Inventory",
    items: [
      {
        label: "Fixed Assets",
        href: "/dashboard/fixed-assets/pipeline",
        icon: HardHat,
        badge: "AI",
      },
      {
        label: "Inventory",
        href: "/dashboard/inventory/pipeline",
        icon: Boxes,
        badge: "AI",
      },
    ],
  },
  {
    label: "Accounting",
    items: [
      { label: "Chart of Accounts", href: "/dashboard/coa", icon: BookOpen },
      { label: "Journal Entries", href: "/dashboard/journal", icon: FileText },
      {
        label: "Trial Balance",
        href: "/dashboard/trial-balance",
        icon: TrendingUp,
      },
      { label: "Month-End Close", href: "/dashboard/close", icon: Shield },
      {
        label: "Consolidation",
        href: "/dashboard/consolidation",
        icon: BarChart3,
        badge: "AI",
      },
    ],
  },
  {
    label: "Reports",
    items: [
      {
        label: "Financial Statements",
        href: "/dashboard/reports",
        icon: BarChart3,
      },
      {
        label: "Budget vs Actual",
        href: "/dashboard/budget/pipeline",
        icon: PiggyBank,
        badge: "AI",
      },
      {
        label: "Analytics",
        href: "/dashboard/analytics/pipeline",
        icon: Search,
        badge: "AI",
      },
      {
        label: "Benchmarking",
        href: "/dashboard/benchmarking",
        icon: TrendingUp,
        badge: "Beta",
      },
    ],
  },
  {
    label: "Compliance",
    items: [
      {
        label: "Tax & Filings",
        href: "/dashboard/tax-compliance/pipeline",
        icon: Shield,
        badge: "AI",
      },
      {
        label: "Audit Preparation",
        href: "/dashboard/audit/pipeline",
        icon: Search,
        badge: "AI",
      },
      { label: "Audit Log", href: "/dashboard/audit-log", icon: FileText },
    ],
  },
];

const bottomNavItems: NavItem[] = [
  { label: "Documents", href: "/dashboard/documents", icon: FolderOpen },
  {
    label: "Approvals",
    href: "/dashboard/review-queue",
    icon: Activity,
    attrs: { "data-tour": "approvals" },
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
      <Link href="/dashboard" className="flex items-center gap-2 group">
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
          className="text-lg font-bold tracking-tight"
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
    <Link href="/dashboard" className="flex items-center gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-primary-foreground font-bold text-sm">
        X
      </div>
      <span className="text-lg font-bold tracking-tight">Xenboox</span>
    </Link>
  );
}

// ─── Agent Status Bar ───────────────────────────────────────────────────

function AgentStatusBar() {
  const { data: stats } = trpc.ingestion.getStats.useQuery(undefined, {
    refetchInterval: 60000,
  });
  const { data: agentApprovals } = trpc.ingestion.listAgentApprovals.useQuery(
    { limit: 50 },
    { refetchInterval: 60000 },
  );

  const pendingReview = stats?.pendingReview ?? 0;
  const processing = stats?.processing ?? 0;
  const agentCount = agentApprovals?.items?.length ?? 0;
  const totalPending = pendingReview + agentCount;

  return (
    <div className="space-y-1.5">
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

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname() ?? "/";
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    new Set(["Compliance"]),
  );

  const { data: stats } = trpc.ingestion.getStats.useQuery(undefined, {
    refetchInterval: 60000,
  });
  const { data: agentApprovals } = trpc.ingestion.listAgentApprovals.useQuery(
    { limit: 50 },
    { refetchInterval: 60000 },
  );

  const pendingReview = stats?.pendingReview ?? 0;
  const agentCount = agentApprovals?.items?.length ?? 0;
  const approvalCounts: ApprovalCounts = {
    ingestion: pendingReview,
    agent: agentCount,
    critical: stats?.failed ?? 0,
    total: pendingReview + agentCount,
  };

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === href;
    return pathname.startsWith(href);
  }

  function toggleGroup(label: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  function getCount(countKey?: string): number | undefined {
    if (!countKey) return undefined;
    return approvalCounts[countKey as keyof ApprovalCounts];
  }

  function renderNavItem(item: {
    label: string;
    href: string;
    icon: LucideIcon;
    badge?: string;
    countKey?: string;
    attrs?: Record<string, string>;
  }) {
    const count = getCount(item.countKey);
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onClose}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          isActive(item.href)
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        )}
        {...(item.attrs ?? {})}
      >
        <item.icon className="h-4 w-4 shrink-0" />
        <span className="flex-1 truncate">{item.label}</span>
        {count !== undefined && count > 0 && (
          <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
            {count > 99 ? "99+" : count}
          </span>
        )}
        {item.badge && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
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
        className={cn(
          "fixed inset-y-0 left-0 z-[49] flex w-64 flex-col border-r bg-card transition-transform duration-200 ease-in-out",
          "lg:static lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Logo + Entity Switcher */}
        <div className="flex flex-col gap-3 border-b p-4">
          <WhiteLabelLogo />
          <EntitySwitcher />
        </div>

        {/* Grouped Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 scrollbar-thin">
          <div className="space-y-3 px-3">
            {navGroups.map((group) => {
              const isCollapsed = collapsedGroups.has(group.label);
              return (
                <div key={group.label}>
                  <button
                    onClick={() => toggleGroup(group.label)}
                    className="flex w-full items-center gap-1.5 px-1 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                  >
                    <ChevronDown
                      className={cn(
                        "h-3 w-3 transition-transform",
                        isCollapsed && "-rotate-90",
                      )}
                    />
                    {group.label}
                  </button>
                  {!isCollapsed && (
                    <div className="space-y-0.5 mt-0.5">
                      {group.items.map((item) => renderNavItem(item))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </nav>

        {/* Agent Status + Bottom Nav */}
        <div className="border-t p-3 space-y-2">
          <AgentStatusBar />
          <div className="space-y-0.5">
            {bottomNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive(item.href)
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
                {...(item.attrs ?? {})}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {item.label === "Approvals" && approvalCounts.total > 0 && (
                  <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
                    {approvalCounts.total > 99 ? "99+" : approvalCounts.total}
                  </span>
                )}
                {item.badge && (
                  <Badge
                    variant="secondary"
                    className="text-[10px] px-1.5 py-0"
                  >
                    {item.badge}
                  </Badge>
                )}
              </Link>
            ))}
          </div>
          <Link
            href="/dashboard/help"
            onClick={onClose}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive("/dashboard/help")
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            <HelpCircle className="h-4 w-4 shrink-0" />
            <span className="flex-1">Help &amp; Support</span>
          </Link>
        </div>
      </aside>
    </>
  );
}
