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
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge, Button } from "@/components/ui";
import { EntitySwitcher } from "@/components/layout/entity-switcher";

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
};

const primaryNav: NavItem[] = [
  { label: "Home", href: "/dashboard", icon: LayoutDashboard },
  {
    label: "Approvals",
    href: "/dashboard/review-queue",
    icon: AlertCircle,
    badge: "!",
  },
  { label: "Money In/Out", href: "/dashboard/ar/invoices", icon: Receipt },
  { label: "Cash", href: "/dashboard/treasury", icon: Wallet },
  { label: "Reports", href: "/dashboard/reports", icon: BarChart3 },
  { label: "Books", href: "/dashboard/coa", icon: BookOpen },
];

const moreModules: NavItem[] = [
  {
    label: "AI Assistant",
    href: "/dashboard/chat",
    icon: MessageSquare,
    badge: "AI",
  },
  {
    label: "Expenses",
    href: "/dashboard/expense/pipeline",
    icon: Receipt,
    badge: "AI",
  },
  {
    label: "Payroll",
    href: "/dashboard/payroll/pipeline",
    icon: Users,
    badge: "AI",
  },
  {
    label: "Tax & Compliance",
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
    label: "Analytics",
    href: "/dashboard/analytics/pipeline",
    icon: BarChart3,
    badge: "AI",
  },
  {
    label: "Fixed Assets",
    href: "/dashboard/fixed-assets/pipeline",
    icon: Landmark,
    badge: "AI",
  },
  {
    label: "Budget",
    href: "/dashboard/budget/pipeline",
    icon: PiggyBank,
    badge: "AI",
  },
  {
    label: "Inventory",
    href: "/dashboard/inventory/pipeline",
    icon: Boxes,
    badge: "AI",
  },
  { label: "Ingestion", href: "/dashboard/ingestion", icon: Zap, badge: "AI" },
  { label: "Documents", href: "/dashboard/documents", icon: FolderOpen },
  { label: "Integrations", href: "/dashboard/settings", icon: Plug },
  { label: "Admin", href: "/admin", icon: Shield },
  {
    label: "Consolidation",
    href: "/dashboard/consolidation/pipeline",
    icon: GitBranch,
    badge: "AI",
  },
  {
    label: "Audit",
    href: "/dashboard/audit/pipeline",
    icon: Search,
    badge: "AI",
  },
  { label: "Firm Dashboard", href: "/dashboard/firm", icon: Building2 },
  { label: "Audit Log", href: "/dashboard/audit-log", icon: ScrollText },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
  { label: "Employees", href: "/dashboard/payroll", icon: Users },
  { label: "Payroll Runs", href: "/dashboard/payroll/runs", icon: Receipt },
  { label: "Help", href: "/dashboard/help", icon: HelpCircle },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [showMore, setShowMore] = useState(false);

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === href;
    return pathname.startsWith(href);
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
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
              X
            </div>
            <span className="text-lg font-bold tracking-tight">Xenboox</span>
          </Link>
          <EntitySwitcher />
        </div>

        {/* Primary Nav */}
        <nav className="flex-1 overflow-y-auto py-4 scrollbar-thin">
          <div className="space-y-0.5 px-3">
            {primaryNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive(item.href)
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
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

          {/* More toggle */}
          <div className="mt-2 px-3">
            <button
              onClick={() => setShowMore(!showMore)}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <MoreHorizontal className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-left">More</span>
              {showMore ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>

            {showMore && (
              <div className="ml-2 mt-1 space-y-0.5 border-l pl-2">
                {moreModules.map((item) => (
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
                    <span className="flex-1">{item.label}</span>
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
      </aside>
    </>
  );
}
