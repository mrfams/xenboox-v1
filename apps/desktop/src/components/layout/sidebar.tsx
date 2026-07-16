import { NavLink } from "react-router-dom"
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
import { Badge } from "@xenboox/ui"

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
      { label: "Dashboard", href: "/", icon: LayoutDashboard },
      { label: "AI Assistant", href: "/chat", icon: MessageSquare, badge: "AI" },
    ],
  },
  {
    label: "Accounting",
    items: [
      { label: "Chart of Accounts", href: "/coa", icon: BookOpen },
      { label: "Journal Entries", href: "/journal", icon: FileText },
      { label: "Fiscal Periods", href: "/fiscal", icon: Landmark },
    ],
  },
  {
    label: "Payables & Receivables",
    items: [
      { label: "Suppliers", href: "/ap/suppliers", icon: Users },
      { label: "Purchase Orders", href: "/ap/pos", icon: FileText, badge: "PO" },
      { label: "Bills", href: "/ap/invoices", icon: CreditCard },
      { label: "Customers", href: "/ar/customers", icon: Users },
      { label: "Invoices", href: "/ar/invoices", icon: FileText, badge: "AR" },
    ],
  },
  {
    label: "Treasury",
    items: [
      { label: "Bank Accounts", href: "/treasury", icon: Landmark },
      { label: "Cash & Imprest", href: "/cash", icon: Wallet },
      { label: "Mobile Money", href: "/mobile-money", icon: Smartphone },
    ],
  },
  {
    label: "Payroll",
    items: [
      { label: "Employees", href: "/payroll/employees", icon: Users },
      { label: "Payroll Runs", href: "/payroll/runs", icon: FileText },
    ],
  },
  {
    label: "Assets & Inventory",
    items: [
      { label: "Fixed Assets", href: "/fixed-assets", icon: HardHat },
      { label: "Inventory", href: "/inventory", icon: Boxes },
      { label: "Warehouses", href: "/inventory/warehouses", icon: Landmark },
    ],
  },
  {
    label: "Reports",
    items: [
      { label: "Financial Reports", href: "/reports", icon: BarChart3 },
    ],
  },
  {
    label: "Documents",
    items: [
      { label: "All Documents", href: "/documents", icon: FolderOpen },
    ],
  },
]

const bottomNavigation: NavItem[] = [
  { label: "Settings", href: "/settings", icon: Settings },
  { label: "Help", href: "/help", icon: HelpCircle },
]

export function Sidebar() {
  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-card">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
          X
        </div>
        <span className="text-lg font-bold tracking-tight">Xenboox</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        <div className="space-y-6">
          {navigation.map((group) => (
            <div key={group.label}>
              <p className="mb-2 px-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {group.label}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <NavLink
                      to={item.href}
                      end={item.href === "/"}
                      className={({ isActive: active }) =>
                        cn(
                          "flex items-center gap-3 rounded-md px-6 py-2 text-sm font-medium transition-colors",
                          active
                            ? "bg-accent text-accent-foreground"
                            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        )
                      }
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1">{item.label}</span>
                      {item.badge && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {item.badge}
                        </Badge>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </nav>

      {/* Bottom navigation */}
      <div className="border-t py-4">
        <ul className="space-y-0.5">
          {bottomNavigation.map((item) => (
            <li key={item.href}>
              <NavLink
                to={item.href}
                className={({ isActive: active }) =>
                  cn(
                    "flex items-center gap-3 rounded-md px-6 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )
                }
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  )
}
