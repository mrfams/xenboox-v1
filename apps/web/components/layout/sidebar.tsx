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
  Plug,
  PiggyBank,
  ScrollText,
  AlertCircle,
  Search,
  Receipt,
  Zap,
  GitBranch,
  Building2,
  Globe,
  KeyRound,
  Palette,
  ChevronDown,
  ChevronUp,
  DollarSign,
  ShoppingCart,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge, Button } from "@/components/ui";
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
  }>;
};

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
};

type ApprovalCounts = {
  ingestion: number;
  agent: number;
  critical: number;
  total: number;
};

// ─── Navigation Groups (per Architecture Doc §2.2) ───────────────────────

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
      },
      {
        label: "Approvals",
        href: "/dashboard/review-queue",
        icon: AlertCircle,
        countKey: "total",
      },
    ],
  },
  {
    label: "Money",
    items: [
      { label: "Bank & Recon", href: "/dashboard/treasury", icon: Landmark },
      { label: "Cash & Imprest", href: "/dashboard/cash", icon: Wallet },
      {
        label: "Mobile Money",
        href: "/dashboard/mobile-money",
        icon: Smartphone,
        badge: "Wave",
      },
    ],
  },
  {
    label: "Sales",
    items: [
      { label: "Invoices (AR)", href: "/dashboard/ar/invoices", icon: Receipt },
      { label: "Customers", href: "/dashboard/ar/customers", icon: Users },
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
        href: "/dashboard/consolidation/pipeline",
        icon: GitBranch,
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
        label: "Jurisdictions",
        href: "/dashboard/jurisdiction",
        icon: Globe,
        badge: "AI",
      },
      {
        label: "Audit Preparation",
        href: "/dashboard/audit/pipeline",
        icon: Search,
        badge: "AI",
      },
      { label: "Audit Log", href: "/dashboard/audit-log", icon: ScrollText },
    ],
  },
];

const bottomNavItems: NavItem[] = [
  { label: "Documents", href: "/dashboard/documents", icon: FolderOpen },
  { label: "Integrations", href: "/dashboard/settings", icon: Plug },
  { label: "Firm Dashboard", href: "/dashboard/firm", icon: Building2 },
  {
    label: "White Label",
    href: "/dashboard/branding",
    icon: Palette,
    badge: "Firm",
  },
  { label: "Ingestion", href: "/dashboard/ingestion", icon: Zap, badge: "AI" },
  {
    label: "API Keys",
    href: "/dashboard/api-keys",
    icon: KeyRound,
    badge: "Dev",
  },
  {
    label: "Benchmarking",
    href: "/dashboard/benchmarking",
    icon: BarChart3,
    badge: "Beta",
  },
  { label: "Admin", href: "/admin", icon: Shield },
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
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
        X
      </div>
      <span className="text-lg font-bold tracking-tight">Xenboox</span>
    </Link>
  );
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    new Set(),
  );
  const [showSettings, setShowSettings] = useState(false);

  // Global approval counts (architecture doc §2.4)
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
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-card transition-transform duration-200 ease-in-out",
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

          {/* Settings & Bottom Nav */}
          <div className="mt-4 px-3">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <Settings className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-left">Settings &amp; Tools</span>
              {showSettings ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>

            {showSettings && (
              <div className="ml-2 mt-1 space-y-0.5 border-l pl-2">
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
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1 truncate">{item.label}</span>
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
            )}
          </div>
        </nav>

        {/* Help Footer */}
        <div className="border-t p-3">
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
