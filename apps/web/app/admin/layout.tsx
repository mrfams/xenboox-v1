"use client";

export const dynamic = "force-dynamic";

import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Building,
  Bot,
  CreditCard,
  BarChart3,
  Settings,
  Shield,
  AlertCircle,
  Cpu,
  Menu,
  ChevronLeft,
  Heart,
  TrendingUp,
  UserCheck,
  UserX,
  Play,
  DollarSign,
  Key,
  Server,
  Wrench,
  GitBranch,
  Flag,
  FileText,
  Bell,
  Search,
  HelpCircle,
  Sun,
  ChevronDown,
  Clock,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@xenboox/ui";

import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";

async function _adminSignOut() {
  try {
    const csrfRes = await fetch("/api/admin-auth/csrf");
    const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };
    await fetch("/api/admin-auth/signout", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ csrfToken, callbackUrl: "/admin-login" }),
    });
  } finally {
    window.location.href = "/admin-login";
  }
}

type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
};

type NavSection = {
  label: string;
  items: NavItem[];
};

const navigationSections: NavSection[] = [
  {
    label: "EXECUTIVE",
    items: [
      { label: "Operations Dashboard", href: "/admin", icon: LayoutDashboard },
      { label: "Business Health", href: "/admin/financial", icon: Heart },
      { label: "Revenue & Growth", href: "/admin/analytics", icon: TrendingUp },
      { label: "Customer Success", href: "/admin/users", icon: UserCheck },
      { label: "Churn & Retention", href: "/admin/churn", icon: UserX },
    ],
  },
  {
    label: "CUSTOMERS",
    items: [
      { label: "Organizations", href: "/admin/organizations", icon: Building },
      { label: "Trials", href: "/admin/trials", icon: Clock },
      {
        label: "Subscriptions",
        href: "/admin/subscriptions",
        icon: CreditCard,
      },
      { label: "Billing", href: "/admin/billing", icon: DollarSign },
      { label: "Support Cases", href: "/admin/support", icon: AlertCircle },
    ],
  },
  {
    label: "AI OPERATIONS",
    items: [
      { label: "AI Agent Monitor", href: "/admin/ai-comparison", icon: Bot },
      { label: "Live Agent Runs", href: "/admin/live-runs", icon: Play },
      { label: "AI Cost Analytics", href: "/admin/spending", icon: BarChart3 },
      { label: "Token Usage", href: "/admin/token-usage", icon: Key },
    ],
  },
  {
    label: "INFRASTRUCTURE",
    items: [
      {
        label: "Infrastructure Health",
        href: "/admin/infrastructure",
        icon: Server,
      },
      { label: "Services", href: "/admin/services", icon: Wrench },
      { label: "Deployments", href: "/admin/deployments", icon: GitBranch },
      { label: "Feature Flags", href: "/admin/feature-flags", icon: Flag },
    ],
  },
  {
    label: "MONITORING",
    items: [
      { label: "Logs & Traces", href: "/admin/logs", icon: FileText },
      { label: "Alerts", href: "/admin/alerts", icon: Bell },
    ],
  },
  {
    label: "SECURITY",
    items: [
      { label: "SSO Configuration", href: "/admin/sso", icon: Shield },
      { label: "Model Ops", href: "/admin/model-ops", icon: Cpu },
      { label: "Settings", href: "/admin/settings", icon: Settings },
    ],
  },
];

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const { data: adminSession, isLoading: checkingAccess } =
    trpc.adminAccess.session.me.useQuery();

  useEffect(() => {
    if (checkingAccess) return;
    if (!adminSession) {
      router.replace("/admin-login");
    }
  }, [adminSession, checkingAccess, router]);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  if (checkingAccess || !adminSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const initials =
    adminSession.name
      ?.split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "AD";

  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border/50 bg-card transition-all duration-300 ease-in-out",
          "lg:static lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          sidebarCollapsed ? "w-16" : "w-64",
        )}
      >
        {/* Logo */}
        <div
          className={cn(
            "flex items-center border-b border-border/50 p-4",
            sidebarCollapsed ? "justify-center" : "gap-3",
          )}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-signal-indigo text-white font-bold text-sm shadow-lg shadow-primary/20">
            X
          </div>
          {!sidebarCollapsed && (
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight text-foreground">
                Xenboox
              </span>
              <span className="text-[10px] font-medium text-muted-foreground -mt-0.5">
                Ops Console
              </span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 scrollbar-thin">
          {navigationSections.map((section) => (
            <div key={section.label} className="mb-4">
              {!sidebarCollapsed && (
                <div className="px-3 mb-1.5 text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider">
                  {section.label}
                </div>
              )}
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/admin" && pathname.startsWith(item.href));
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2",
                          sidebarCollapsed && "justify-center px-2",
                          isActive
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                        )}
                        title={sidebarCollapsed ? item.label : undefined}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!sidebarCollapsed && (
                          <span className="flex-1 truncate">{item.label}</span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Collapse button + User */}
        <div className="border-t border-border/50 p-3">
          <button
            type="button"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={cn(
              "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2",
              sidebarCollapsed && "justify-center px-2",
            )}
          >
            <ChevronLeft
              className={cn(
                "h-4 w-4 shrink-0 transition-transform",
                sidebarCollapsed && "rotate-180",
              )}
            />
            {!sidebarCollapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/50 bg-card/80 backdrop-blur-sm px-4 lg:px-6">
          {/* Mobile menu button */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted lg:hidden transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2"
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Search bar */}
            <div className="hidden md:flex items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-3 py-2 w-80">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search anyone, anything..."
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
              />
              <kbd className="hidden lg:inline-flex items-center gap-0.5 rounded border border-border/50 bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                ⌘K
              </kbd>
            </div>
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2"
              title="Toggle theme"
            >
              <Sun className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2"
              title="Notifications"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary" />
            </button>
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2"
              title="Help"
            >
              <HelpCircle className="h-4 w-4" />
            </button>

            {/* User avatar */}
            <div className="flex items-center gap-2 ml-2 pl-2 border-l border-border/50">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-gradient-to-br from-primary to-signal-indigo text-white text-xs font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden lg:flex flex-col">
                <span className="text-sm font-medium text-foreground leading-tight">
                  {adminSession.name}
                </span>
                <span className="text-[10px] text-muted-foreground leading-tight capitalize">
                  {adminSession.role?.replace(/_/g, " ")}
                </span>
              </div>
              <ChevronDown className="h-3 w-3 text-muted-foreground hidden lg:block" />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
