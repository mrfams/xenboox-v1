"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandGroup,
  CommandItem,
  CommandEmpty,
  CommandSeparator,
} from "@/components/ui"
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
  AlertCircle,
  Sparkles,
  Clock,
  ArrowRight,
  Search,
  Hash,
  Bot,
  Zap,
} from "lucide-react"

// ─── Navigation Items ─────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, group: "Pages" },
  { label: "AI Assistant", href: "/dashboard/chat", icon: MessageSquare, group: "Pages", shortcut: "/" },
  { label: "Chart of Accounts", href: "/dashboard/coa", icon: BookOpen, group: "Pages" },
  { label: "Journal Entries", href: "/dashboard/journal", icon: FileText, group: "Pages" },
  { label: "Purchase Orders", href: "/dashboard/ap/pos", icon: FileText, group: "Pages" },
  { label: "Bills", href: "/dashboard/ap/invoices", icon: CreditCard, group: "Pages" },
  { label: "Customers", href: "/dashboard/ar/customers", icon: Users, group: "Pages" },
  { label: "Invoices", href: "/dashboard/ar/invoices", icon: FileText, group: "Pages" },
  { label: "Bank Accounts", href: "/dashboard/treasury", icon: Landmark, group: "Pages" },
  { label: "Cash & Imprest", href: "/dashboard/cash", icon: Wallet, group: "Pages" },
  { label: "Mobile Money", href: "/dashboard/mobile-money", icon: Smartphone, group: "Pages" },
  { label: "Employees", href: "/dashboard/payroll", icon: Users, group: "Pages" },
  { label: "Fixed Assets", href: "/dashboard/fixed-assets", icon: HardHat, group: "Pages" },
  { label: "Inventory", href: "/dashboard/inventory", icon: Boxes, group: "Pages" },
  { label: "Financial Reports", href: "/dashboard/reports", icon: BarChart3, group: "Pages" },
  { label: "Documents", href: "/dashboard/documents", icon: FolderOpen, group: "Pages" },
  { label: "Audit Trail", href: "/dashboard/audit-trail", icon: Clock, group: "Pages" },
  { label: "Settings", href: "/dashboard/settings", icon: Settings, group: "Pages" },
  { label: "Help & Support", href: "/dashboard/help", icon: HelpCircle, group: "Pages" },
]

// ─── AI Commands ──────────────────────────────────────────────────────────────

const AI_COMMANDS = [
  {
    label: "Summarize this month",
    description: "Get an AI summary of this month's financial activity",
    icon: Sparkles,
    action: "summarize-month",
  },
  {
    label: "Reconcile bank transactions",
    description: "Auto-match bank transactions to journal entries",
    icon: Zap,
    action: "reconcile",
  },
  {
    label: "Generate financial report",
    description: "Create P&L, Balance Sheet, or Cash Flow statement",
    icon: BarChart3,
    action: "generate-report",
  },
  {
    label: "Analyze spending patterns",
    description: "AI analysis of spending trends and anomalies",
    icon: AlertCircle,
    action: "analyze-spending",
  },
  {
    label: "Create journal entry",
    description: "AI-assisted journal entry creation from description",
    icon: FileText,
    action: "create-journal",
  },
  {
    label: "Process invoices",
    description: "AI-powered invoice extraction and categorization",
    icon: CreditCard,
    action: "process-invoices",
  },
]

// ─── Keyboard Shortcuts Reference ─────────────────────────────────────────────

const SHORTCUTS = [
  { keys: ["Ctrl", "K"], description: "Open command palette" },
  { keys: ["1-5"], description: "Switch surfaces" },
  { keys: ["/"], description: "Toggle AI chat" },
  { keys: ["Esc"], description: "Close dialog" },
  { keys: ["A"], description: "Approve selected" },
  { keys: ["R"], description: "Reject selected" },
]

// ─── Recent Searches ──────────────────────────────────────────────────────────

const RECENT_SEARCHES_KEY = "xenboox_recent_searches"

function getRecentSearches(): string[] {
  if (typeof window === "undefined") return []
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function addRecentSearch(query: string) {
  if (typeof window === "undefined") return
  const recent = getRecentSearches().filter((s) => s !== query)
  recent.unshift(query)
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recent.slice(0, 5)))
}

// ─── Command Palette Component ────────────────────────────────────────────────

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const router = useRouter()

  // Load recent searches on mount
  useEffect(() => {
    setRecentSearches(getRecentSearches())
  }, [])

  // Ctrl+K / Cmd+K keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const handleSelect = useCallback(
    (value: string) => {
      // Check if it's a navigation item
      const navItem = NAV_ITEMS.find((item) => item.label === value)
      if (navItem) {
        addRecentSearch(value)
        setRecentSearches(getRecentSearches())
        setOpen(false)
        router.push(navItem.href)
        return
      }

      // Check if it's an AI command
      const aiCommand = AI_COMMANDS.find((cmd) => cmd.label === value)
      if (aiCommand) {
        addRecentSearch(value)
        setRecentSearches(getRecentSearches())
        setOpen(false)
        // Route to AI chat with the command
        router.push(`/dashboard/chat?command=${aiCommand.action}`)
        return
      }

      // Check if it's a recent search
      if (recentSearches.includes(value)) {
        setOpen(false)
        router.push(`/dashboard/chat?q=${encodeURIComponent(value)}`)
        return
      }
    },
    [router, recentSearches]
  )

  const filteredNav = NAV_ITEMS.filter((item) =>
    item.label.toLowerCase().includes(query.toLowerCase())
  )

  const filteredAI = AI_COMMANDS.filter(
    (cmd) =>
      cmd.label.toLowerCase().includes(query.toLowerCase()) ||
      cmd.description.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Search pages, commands, or ask AI..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          <div className="flex flex-col items-center gap-2 py-6">
            <Search className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              No results for &quot;{query}&quot;
            </p>
            <p className="text-xs text-muted-foreground">
              Try searching for a page or AI command
            </p>
          </div>
        </CommandEmpty>

        {/* Recent Searches */}
        {!query && recentSearches.length > 0 && (
          <CommandGroup heading="Recent">
            {recentSearches.map((search) => (
              <CommandItem
                key={search}
                value={search}
                onSelect={handleSelect}
                className="cursor-pointer"
              >
                <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>{search}</span>
                <ArrowRight className="ml-auto h-3 w-3 text-muted-foreground" />
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {!query && recentSearches.length > 0 && <CommandSeparator />}

        {/* AI Commands */}
        <CommandGroup heading="AI Commands">
          {filteredAI.map((cmd) => (
            <CommandItem
              key={cmd.label}
              value={cmd.label}
              onSelect={handleSelect}
              className="cursor-pointer"
            >
              <div className="mr-2 flex h-6 w-6 items-center justify-center rounded bg-primary/10">
                <cmd.icon className="h-3 w-3 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{cmd.label}</p>
                <p className="text-xs text-muted-foreground">{cmd.description}</p>
              </div>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        {/* Pages */}
        <CommandGroup heading="Pages">
          {filteredNav.map((item) => (
            <CommandItem
              key={item.label}
              value={item.label}
              onSelect={handleSelect}
              className="cursor-pointer"
            >
              <item.icon className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>{item.label}</span>
              {item.shortcut && (
                <kbd className="ml-auto rounded border bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                  {item.shortcut}
                </kbd>
              )}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        {/* Keyboard Shortcuts */}
        <CommandGroup heading="Keyboard Shortcuts">
          {SHORTCUTS.map((shortcut) => (
            <CommandItem
              key={shortcut.description}
              value={`shortcut-${shortcut.description}`}
              disabled
              className="cursor-default opacity-60"
            >
              <Hash className="mr-2 h-4 w-4 text-muted-foreground" />
              <span className="flex-1">{shortcut.description}</span>
              <div className="flex gap-1">
                {shortcut.keys.map((key) => (
                  <kbd
                    key={key}
                    className="rounded border bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground"
                  >
                    {key}
                  </kbd>
                ))}
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}

// ─── Search Trigger Button ────────────────────────────────────────────────────

export function SearchTrigger({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted"
      aria-label="Open command palette (Ctrl+K)"
    >
      <Search className="h-4 w-4" />
      <span className="hidden md:inline">Search...</span>
      <kbd className="hidden rounded border bg-background px-1.5 py-0.5 text-[10px] font-mono md:inline">
        Ctrl+K
      </kbd>
    </button>
  )
}
