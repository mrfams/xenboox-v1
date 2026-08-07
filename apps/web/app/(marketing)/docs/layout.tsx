"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import {
  BookOpen,
  Rocket,
  Layers,
  FileCode,
  Shield,
  HelpCircle,
  Sun,
  Moon,
  ChevronDown,
  ExternalLink,
  Bell,
  MessageSquare,
} from "lucide-react";

import { SearchDialog } from "./components/search-dialog";
import { MobileNav } from "./components/mobile-nav";

import { cn } from "@/lib/utils";

interface NavGroup {
  group: string;
  href: string;
  icon: React.ReactNode;
  items: { label: string; href: string }[];
}

const navGroups: NavGroup[] = [
  {
    group: "Introduction",
    href: "/docs",
    icon: <BookOpen className="h-4 w-4" />,
    items: [
      { label: "Overview", href: "/docs" },
      { label: "Quickstart", href: "/docs/quickstart" },
      { label: "Core Concepts", href: "/docs/concepts" },
    ],
  },
  {
    group: "Guides",
    href: "/docs/guides",
    icon: <Rocket className="h-4 w-4" />,
    items: [
      { label: "Getting Started", href: "/docs/getting-started" },
      { label: "Chart of Accounts", href: "/docs/chart-of-accounts" },
      { label: "Users & Roles", href: "/docs/users-roles" },
      { label: "Integrations", href: "/docs/integrations" },
      { label: "Reports & Exports", href: "/docs/reports" },
      { label: "Month-End Close", href: "/docs/month-end-close" },
    ],
  },
  {
    group: "Modules",
    href: "/docs/modules",
    icon: <Layers className="h-4 w-4" />,
    items: [
      { label: "Overview", href: "/docs/modules" },
      { label: "Accounts Payable", href: "/docs/modules/ap" },
      { label: "Accounts Receivable", href: "/docs/modules/ar" },
      { label: "Payroll", href: "/docs/modules/payroll" },
      { label: "Treasury", href: "/docs/modules/treasury" },
      { label: "Reports", href: "/docs/modules/reports" },
    ],
  },
  {
    group: "API",
    href: "/docs/api",
    icon: <FileCode className="h-4 w-4" />,
    items: [
      { label: "Overview", href: "/docs/api" },
      { label: "Authentication", href: "/docs/api/auth" },
      { label: "Endpoints", href: "/docs/api/endpoints" },
      { label: "Webhooks", href: "/docs/webhooks" },
      { label: "Rate Limits", href: "/docs/api/rate-limits" },
      { label: "SDKs", href: "/docs/sdks" },
    ],
  },
  {
    group: "Security",
    href: "/docs/security",
    icon: <Shield className="h-4 w-4" />,
    items: [
      { label: "Overview", href: "/docs/security" },
      { label: "Authentication", href: "/docs/security/auth" },
      { label: "Encryption", href: "/docs/security/encryption" },
      { label: "Compliance", href: "/docs/security/compliance" },
    ],
  },
  {
    group: "Resources",
    href: "/docs/resources",
    icon: <HelpCircle className="h-4 w-4" />,
    items: [
      { label: "FAQ", href: "/docs/faq" },
      { label: "Changelog", href: "/docs/changelog" },
      { label: "Status", href: "https://status.xenboox.com" },
      { label: "Support", href: "/contact" },
    ],
  },
];

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "/";
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(["Introduction"]),
  );

  useEffect(() => setMounted(true), []);

  // Auto-expand matching group on mount
  useEffect(() => {
    const currentGroup = navGroups.find(
      (g) =>
        g.items.some((item) => pathname.startsWith(item.href)) ||
        pathname === g.href,
    );
    if (currentGroup) {
      setExpandedGroups((prev) => new Set([...prev, currentGroup.group]));
    }
  }, [pathname]);

  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  };

  return (
    <>
      {/* Mobile bar */}
      <div className="md:hidden sticky top-14 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-12 items-center justify-between px-4">
          <MobileNav />
          <div className="flex items-center gap-2">
            <div className="w-32 sm:w-48">
              <SearchDialog />
            </div>
            {mounted && (
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                aria-label="Toggle dark mode"
              >
                {theme === "dark" ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-screen-2xl">
        <div className="flex">
          {/* Left Sidebar */}
          <aside className="hidden md:flex w-56 lg:w-64 shrink-0 border-r">
            <div className="sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto w-full p-3 scrollbar-thin">
              {/* Search */}
              <div className="mb-4">
                <SearchDialog />
              </div>

              {/* Navigation */}
              <nav className="space-y-1">
                {navGroups.map((group, idx) => {
                  const isActive =
                    group.items.some((item) => pathname === item.href) ||
                    pathname === group.href;
                  const isExpanded = expandedGroups.has(group.group);

                  return (
                    <div key={group.group + "-" + idx}>
                      <button
                        onClick={() => toggleGroup(group.group)}
                        className={cn(
                          "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                          isActive
                            ? "text-primary"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        <div className="flex items-center gap-1.5">
                          {group.icon}
                          {group.group}
                        </div>
                        <ChevronDown
                          className={cn(
                            "h-3 w-3 transition-transform",
                            isExpanded && "rotate-180",
                          )}
                        />
                      </button>
                      {isExpanded && (
                        <div className="ml-3 mt-0.5 flex flex-col gap-0.5 border-l pl-2">
                          {group.items.map((item) => {
                            const isItemActive = pathname === item.href;
                            return (
                              <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                  "rounded-md px-2 py-1 text-xs transition-colors",
                                  isItemActive
                                    ? "bg-primary/10 text-primary font-medium"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                                )}
                              >
                                {item.label}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </nav>

              {/* Bottom sidebar links */}
              <div className="mt-6 border-t pt-4 space-y-2">
                <Link
                  href="/"
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                  Home
                </Link>
                <Link
                  href="/contact"
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <MessageSquare className="h-3 w-3" />
                  Support
                </Link>
                <a
                  href="https://status.xenboox.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Bell className="h-3 w-3" />
                  Status
                </a>
                <div className="border-t pt-2 mt-2">
                  <button
                    onClick={() =>
                      setTheme(theme === "dark" ? "light" : "dark")
                    }
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Toggle dark mode"
                  >
                    {mounted &&
                      (theme === "dark" ? (
                        <Sun className="h-3 w-3" />
                      ) : (
                        <Moon className="h-3 w-3" />
                      ))}
                    {mounted
                      ? theme === "dark"
                        ? "Light mode"
                        : "Dark mode"
                      : ""}
                  </button>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
