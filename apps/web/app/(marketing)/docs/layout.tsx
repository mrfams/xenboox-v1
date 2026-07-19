"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import {
  BookOpen,
  Shield,
  Server,
  FileText,
  Bot,
  Sun,
  Moon,
  ChevronDown,
  ExternalLink,
  Search,
} from "lucide-react"
import { SearchDialog } from "./components/search-dialog"
import { MobileNav } from "./components/mobile-nav"

interface NavGroup {
  group: string
  href: string
  icon: React.ReactNode
  items: { label: string; href: string }[]
}

const navGroups: NavGroup[] = [
  {
    group: "Documentation",
    href: "/docs",
    icon: <BookOpen className="h-4 w-4" />,
    items: [
      { label: "Getting Started", href: "/docs/getting-started" },
      { label: "FAQ", href: "/docs/faq" },
    ],
  },
  {
    group: "Modules",
    href: "/docs/modules",
    icon: <FileText className="h-4 w-4" />,
    items: [
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
    group: "AI Agents",
    href: "/docs/agents",
    icon: <Bot className="h-4 w-4" />,
    items: [
      { label: "CFO", href: "/docs/agents/cfo" },
      { label: "Controller", href: "/docs/agents/controller" },
      { label: "Payroll", href: "/docs/agents/payroll" },
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
    group: "Infrastructure",
    href: "#",
    icon: <Shield className="h-4 w-4" />,
    items: [
      { label: "Security", href: "/docs/security" },
      { label: "DevOps", href: "/docs/devsecops" },
    ],
  },
]

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(["Documentation"]))

  useEffect(() => setMounted(true), [])

  // Auto-expand matching group on mount
  useEffect(() => {
    const currentGroup = navGroups.find((g) =>
      g.items.some((item) => pathname.startsWith(item.href)) ||
      pathname === g.href
    )
    if (currentGroup) {
      setExpandedGroups((prev) => new Set([...prev, currentGroup.group]))
    }
  }, [pathname])

  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(group)) next.delete(group)
      else next.add(group)
      return next
    })
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-screen-2xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <div className="md:hidden">
              <MobileNav />
            </div>
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-xs">
                X
              </div>
              <span className="text-base font-bold tracking-tight hidden sm:inline">Xenboox</span>
            </Link>
            <div className="hidden sm:flex items-center gap-1 ml-2">
              <span className="text-sm text-muted-foreground">/</span>
              <Link href="/docs" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Docs
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Search - visible on all screen sizes */}
            <div className="w-32 sm:w-48 lg:w-64">
              <SearchDialog />
            </div>

            {/* Dark mode toggle */}
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

            <Link
              href="/register"
              className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <div className="flex-1">
        <div className="mx-auto max-w-screen-2xl">
          <div className="flex">
            {/* Left Sidebar */}
            <aside className="hidden md:flex w-56 lg:w-64 shrink-0 border-r">
              <div className="sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto w-full p-3 scrollbar-thin">
                {/* Search inside sidebar - only on md screens where sidebar is visible */}
                <div className="mb-3">
                  <SearchDialog />
                </div>
                <nav className="space-y-1">
                  {navGroups.map((group, idx) => {
                    const isActive = group.items.some((item) => pathname === item.href) ||
                      pathname === group.href
                    const isExpanded = expandedGroups.has(group.group)

                    return (
                      <div key={group.group + '-' + idx}>
                        <button
                          onClick={() => toggleGroup(group.group)}
                          className={cn(
                            "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                            isActive
                              ? "text-primary"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <div className="flex items-center gap-1.5">
                            {group.icon}
                            {group.group}
                          </div>
                          <ChevronDown
                            className={cn(
                              "h-3 w-3 transition-transform",
                              isExpanded && "rotate-180"
                            )}
                          />
                        </button>
                        {isExpanded && (
                          <div className="ml-3 mt-0.5 flex flex-col gap-0.5 border-l pl-2">
                            {group.items.map((item) => {
                              const isItemActive = pathname === item.href
                              return (
                                <Link
                                  key={item.href}
                                  href={item.href}
                                  className={cn(
                                    "rounded-md px-2 py-1 text-xs transition-colors",
                                    isItemActive
                                      ? "bg-primary/10 text-primary font-medium"
                                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                  )}
                                >
                                  {item.label}
                                </Link>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
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
                    <ExternalLink className="h-3 w-3" />
                    Support
                  </Link>
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
      </div>

      {/* Footer */}
      <footer className="border-t bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-xs">
                  X
                </div>
                <span className="font-bold text-sm">Xenboox</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                AI-native accounting platform built for African businesses.
              </p>
            </div>
            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Product</h3>
              <ul className="space-y-1.5 text-sm">
                <li><Link href="/features" className="text-muted-foreground hover:text-foreground transition-colors">Features</Link></li>
                <li><Link href="/pricing" className="text-muted-foreground hover:text-foreground transition-colors">Pricing</Link></li>
                <li><Link href="/download" className="text-muted-foreground hover:text-foreground transition-colors">Download</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Documentation</h3>
              <ul className="space-y-1.5 text-sm">
                <li><Link href="/docs/getting-started" className="text-muted-foreground hover:text-foreground transition-colors">Getting Started</Link></li>
                <li><Link href="/docs/modules" className="text-muted-foreground hover:text-foreground transition-colors">All Modules</Link></li>
                <li><Link href="/docs/agents" className="text-muted-foreground hover:text-foreground transition-colors">All Agents</Link></li>
                <li><Link href="/docs/faq" className="text-muted-foreground hover:text-foreground transition-colors">FAQ</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Company</h3>
              <ul className="space-y-1.5 text-sm">
                <li><Link href="/about" className="text-muted-foreground hover:text-foreground transition-colors">About</Link></li>
                <li><Link href="/contact" className="text-muted-foreground hover:text-foreground transition-colors">Contact</Link></li>
                <li><Link href="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">Privacy</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 border-t pt-6 text-center text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Xenboox. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
