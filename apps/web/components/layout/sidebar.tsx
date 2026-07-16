"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
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
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Separator, Badge } from "@/components/ui"

type NavItem = {
  label: string
  href: string
  icon: LucideIcon
  badge?: string
}

type NavGroup = {
  label: string
  items: NavItem[]
}

const navigation: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "AI Assistant", href: "/dashboard/chat", icon: MessageSquare, badge: "AI" },
    ],
  },
  {
    label: "Accounting",
    items: [
      { label: "Chart of Accounts", href: "/dashboard/coa", icon: BookOpen },
      { label: "Journal Entries", href: "/dashboard/journal", icon: FileText },
      { label: "Fiscal Periods", href: "/dashboard/fiscal", icon: Landmark },
    ],
  },
  {
    label: "Payables & Receivables",
    items: [
      { label: "Purchase Orders", href: "/dashboard/ap/pos", icon: FileText, badge: "PO" },
      { label: "Bills", href: "/dashboard/ap/invoices", icon: CreditCard },
      { label: "Customers", href: "/dashboard/ar/customers", icon: Users },
      { label: "Invoices", href: "/dashboard/ar/invoices", icon: FileText, badge: "AR" },
    ],
  },
  {
    label: "Treasury",
    items: [
      { label: "Bank Accounts", href: "/dashboard/treasury", icon: Landmark },
      { label: "Cash & Imprest", href: "/dashboard/cash", icon: Wallet },
      { label: "Mobile Money", href: "/dashboard/mobile-money", icon: Smartphone },
    ],
  },
  {
    label: "Payroll",
    items: [
      { label: "Employees", href: "/dashboard/payroll", icon: Users },
      { label: "Payroll Runs", href: "/dashboard/payroll/runs", icon: FileText },
    ],
  },
  {
    label: "Assets & Inventory",
    items: [
      { label: "Fixed Assets", href: "/dashboard/fixed-assets", icon: HardHat },
      { label: "Inventory", href: "/dashboard/inventory", icon: Boxes },
      { label: "Warehouses", href: "/dashboard/inventory/warehouses", icon: Landmark },
    ],
  },
  {
    label: "Reports",
    items: [
      { label: "Financial Reports", href: "/dashboard/reports", icon: BarChart3 },
    ],
  },
  {
    label: "Documents",
    items: [
      { label: "All Documents", href: "/dashboard/documents", icon: FolderOpen },
    ],
  },
]

const bottomNavigation: NavItem[] = [
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
  { label: "Help", href: "/dashboard/help", icon: HelpCircle },
]

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-card transition-transform duration-200 ease-in-out",
          "lg:static lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-2 border-b px-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
            X
          </div>
          <span className="text-lg font-bold tracking-tight">Xenboox</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 scrollbar-thin">
          <div className="space-y-6">
            {navigation.map((group) => (
              <div key={group.label}>
                <p className="mb-2 px-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {group.label}
                </p>
                <ul className="space-y-0.5">
                  {group.items.map((item) => {
                    const isActive =
                      pathname === item.href ||
                      (item.href !== "/dashboard" && pathname.startsWith(item.href))
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={onClose}
                          className={cn(
                            "flex items-center gap-3 rounded-md px-6 py-2 text-sm font-medium transition-colors",
                            isActive
                              ? "bg-accent text-accent-foreground"
                              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                          )}
                        >
                          <item.icon className="h-4 w-4 shrink-0" />
                          <span className="flex-1">{item.label}</span>
                          {item.badge && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              {item.badge}
                            </Badge>
                          )}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
        </nav>

        {/* Bottom navigation */}
        <div className="border-t py-4">
          <ul className="space-y-0.5">
            {bottomNavigation.map((item) => {
              const isActive = pathname.startsWith(item.href)
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-6 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      </aside>
    </>
  )
}
