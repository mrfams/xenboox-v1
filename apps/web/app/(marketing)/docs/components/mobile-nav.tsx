"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@xenboox/ui";
import {
  Menu,
  X,
  ChevronDown,
  FileText,
  Bot,
  BookOpen,
  Shield,
  Server,
  HelpCircle,
} from "lucide-react";

import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
  children?: { label: string; href: string }[];
}

const navItems: NavItem[] = [
  {
    label: "Getting Started",
    href: "/docs/getting-started",
    icon: <BookOpen className="h-4 w-4" />,
  },
  { label: "FAQ", href: "/docs/faq", icon: <HelpCircle className="h-4 w-4" /> },
  {
    label: "Modules",
    href: "/docs/modules",
    icon: <FileText className="h-4 w-4" />,
    children: [
      { label: "AP", href: "/docs/modules/ap" },
      { label: "AR", href: "/docs/modules/ar" },
      { label: "Payroll", href: "/docs/modules/payroll" },
      { label: "Treasury", href: "/docs/modules/treasury" },
      { label: "Cash", href: "/docs/modules/cash" },
      { label: "Mobile Money", href: "/docs/modules/mobile-money" },
      { label: "Inventory", href: "/docs/modules/inventory" },
      { label: "Fixed Assets", href: "/docs/modules/fixed-assets" },
      { label: "COA", href: "/docs/modules/coa" },
      { label: "Journal", href: "/docs/modules/journal" },
      { label: "Fiscal", href: "/docs/modules/fiscal" },
      { label: "Reports", href: "/docs/modules/reports" },
      { label: "Documents", href: "/docs/modules/documents" },
      { label: "Chat", href: "/docs/modules/chat" },
      { label: "Currency", href: "/docs/modules/currency" },
      { label: "Organizations", href: "/docs/modules/organizations" },
      { label: "Settings", href: "/docs/modules/settings" },
      { label: "Analytics", href: "/docs/modules/analytics" },
    ],
  },
  {
    label: "AI Agents",
    href: "/docs/agents",
    icon: <Bot className="h-4 w-4" />,
    children: [
      { label: "CFO", href: "/docs/agents/cfo" },
      { label: "Controller", href: "/docs/agents/controller" },
      { label: "Payroll Manager", href: "/docs/agents/payroll" },
      { label: "Treasury", href: "/docs/agents/treasury" },
      { label: "Compliance", href: "/docs/agents/compliance" },
      { label: "Ledger", href: "/docs/agents/ledger" },
      { label: "AP", href: "/docs/agents/ap" },
      { label: "AR", href: "/docs/agents/ar" },
      { label: "Cash", href: "/docs/agents/cash" },
      { label: "Mobile Money", href: "/docs/agents/mobile-money" },
      { label: "Inventory", href: "/docs/agents/inventory" },
      { label: "Fixed Assets", href: "/docs/agents/fixed-assets" },
      { label: "Reporting", href: "/docs/agents/reporting" },
      { label: "Fiscal", href: "/docs/agents/fiscal" },
      { label: "Document", href: "/docs/agents/document" },
      { label: "Chat", href: "/docs/agents/chat" },
      { label: "Analytics", href: "/docs/agents/analytics" },
      { label: "Budget", href: "/docs/agents/budget" },
      { label: "Audit", href: "/docs/agents/audit" },
    ],
  },
  {
    label: "Security",
    href: "/docs/security",
    icon: <Shield className="h-4 w-4" />,
  },
  {
    label: "DevOps",
    href: "/docs/devsecops",
    icon: <Server className="h-4 w-4" />,
  },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const pathname = usePathname() ?? "/";

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  return (
    <div className="md:hidden">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(!open)}
        aria-label={open ? "Close menu" : "Open menu"}
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {open && (
        <div className="fixed inset-0 top-16 z-50 bg-background">
          <div className="overflow-y-auto h-full pb-8">
            <div className="flex flex-col gap-1 p-4">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                const hasChildren = item.children && item.children.length > 0;
                const isExpanded = expandedGroups.has(item.label);

                return (
                  <div key={item.label}>
                    <button
                      onClick={() => {
                        if (hasChildren) {
                          toggleGroup(item.label);
                        } else {
                          window.location.href = item.href;
                        }
                      }}
                      className={cn(
                        "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {item.icon}
                        {item.label}
                      </div>
                      {hasChildren && (
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 transition-transform",
                            isExpanded && "rotate-180",
                          )}
                        />
                      )}
                    </button>
                    {hasChildren && isExpanded && (
                      <div className="ml-4 mt-1 flex flex-col gap-0.5 border-l pl-3">
                        {item.children!.map((child) => {
                          const isChildActive = pathname === child.href;
                          return (
                            <Link
                              key={child.href}
                              href={child.href}
                              className={cn(
                                "rounded-md px-3 py-1.5 text-sm transition-colors",
                                isChildActive
                                  ? "bg-primary/5 text-primary font-medium"
                                  : "text-muted-foreground hover:text-foreground",
                              )}
                            >
                              {child.label}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
