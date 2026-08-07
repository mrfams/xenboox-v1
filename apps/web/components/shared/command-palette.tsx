"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  MessageSquare,
  Wallet,
  Receipt,
  CreditCard,
  Users,
  BarChart3,
  BookOpen,
  Settings,
  Activity,
  FileText,
  RefreshCw,
  Search,
  Plus,
  ArrowRight,
  Clock,
  Sparkles,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { trpc } from "@/lib/trpc/client";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
} from "@/components/ui";

// ─── Types ──────────────────────────────────────────────────────────────

type CommandItem = {
  id: string;
  label: string;
  description?: string;
  href?: string;
  icon: LucideIcon;
  group: string;
  keywords?: string[];
  action?: () => void;
};

// ─── Navigation Items ───────────────────────────────────────────────────

const navigationItems: Omit<CommandItem, "id">[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    group: "Pages",
    keywords: ["home", "overview", "main"],
  },
  {
    label: "AI Workspace",
    href: "/dashboard/chat",
    icon: MessageSquare,
    group: "Pages",
    keywords: ["chat", "ai", "assistant", "ask"],
  },
  {
    label: "Transactions",
    href: "/dashboard/transactions",
    icon: BookOpen,
    group: "Pages",
    keywords: ["ledger", "entries", "journal"],
  },
  {
    label: "Banking",
    href: "/dashboard/banking",
    icon: Wallet,
    group: "Pages",
    keywords: ["bank", "accounts", "cash"],
  },
  {
    label: "Invoicing",
    href: "/dashboard/invoicing",
    icon: Receipt,
    group: "Pages",
    keywords: ["invoice", "sales", "billing"],
  },
  {
    label: "Bills",
    href: "/dashboard/bills",
    icon: CreditCard,
    group: "Pages",
    keywords: ["bill", "payable", "vendor"],
  },
  {
    label: "Expenses",
    href: "/dashboard/expenses",
    icon: Receipt,
    group: "Pages",
    keywords: ["expense", "cost", "spending"],
  },
  {
    label: "Customers",
    href: "/dashboard/customers",
    icon: Users,
    group: "Pages",
    keywords: ["customer", "client", "contact"],
  },
  {
    label: "Vendors",
    href: "/dashboard/vendors",
    icon: Users,
    group: "Pages",
    keywords: ["vendor", "supplier", "payee"],
  },
  {
    label: "Payroll",
    href: "/dashboard/payroll",
    icon: Users,
    group: "Pages",
    keywords: ["payroll", "salary", "employee", "wages"],
  },
  {
    label: "Reports",
    href: "/dashboard/reports",
    icon: BarChart3,
    group: "Pages",
    keywords: ["report", "analysis", "statements"],
  },
  {
    label: "General Ledger",
    href: "/dashboard/journal",
    icon: BookOpen,
    group: "Pages",
    keywords: ["gl", "ledger", "accounts"],
  },
  {
    label: "Chart of Accounts",
    href: "/dashboard/chart-of-accounts",
    icon: BookOpen,
    group: "Pages",
    keywords: ["coa", "accounts", "categories"],
  },
  {
    label: "Reconciliation",
    href: "/dashboard/reconciliation/center",
    icon: RefreshCw,
    group: "Pages",
    keywords: ["reconcile", "match", "bank"],
  },
  {
    label: "Documents",
    href: "/dashboard/documents",
    icon: FileText,
    group: "Pages",
    keywords: ["document", "files", "uploads"],
  },
  {
    label: "Inbox",
    href: "/dashboard/inbox",
    icon: MessageSquare,
    group: "Pages",
    keywords: ["inbox", "notifications", "alerts"],
  },
  {
    label: "Close Center",
    href: "/dashboard/close",
    icon: RefreshCw,
    group: "Pages",
    keywords: ["close", "period", "month-end"],
  },
  {
    label: "Agent Monitor",
    href: "/dashboard/agent-monitor",
    icon: Activity,
    group: "Pages",
    keywords: ["agent", "monitor", "ai", "status"],
  },
  {
    label: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
    group: "Pages",
    keywords: ["settings", "preferences", "config"],
  },
];

// ─── Quick Actions ──────────────────────────────────────────────────────

const quickActions: Omit<CommandItem, "id">[] = [
  {
    label: "Create Invoice",
    href: "/dashboard/invoicing",
    icon: Plus,
    group: "Quick Actions",
    keywords: ["create", "new", "invoice", "bill"],
  },
  {
    label: "Create Expense",
    href: "/dashboard/expenses",
    icon: Plus,
    group: "Quick Actions",
    keywords: ["create", "new", "expense"],
  },
  {
    label: "Run Payroll",
    href: "/dashboard/payroll",
    icon: Zap,
    group: "Quick Actions",
    keywords: ["run", "payroll", "process"],
  },
  {
    label: "Reconcile Bank",
    href: "/dashboard/reconciliation/center",
    icon: RefreshCw,
    group: "Quick Actions",
    keywords: ["reconcile", "bank", "match"],
  },
  {
    label: "Generate Report",
    href: "/dashboard/reports",
    icon: BarChart3,
    group: "Quick Actions",
    keywords: ["generate", "report", "export"],
  },
  {
    label: "Add Customer",
    href: "/dashboard/customers",
    icon: Plus,
    group: "Quick Actions",
    keywords: ["add", "new", "customer", "client"],
  },
  {
    label: "Add Vendor",
    href: "/dashboard/vendors",
    icon: Plus,
    group: "Quick Actions",
    keywords: ["add", "new", "vendor", "supplier"],
  },
  {
    label: "Upload Document",
    href: "/dashboard/documents",
    icon: Plus,
    group: "Quick Actions",
    keywords: ["upload", "document", "file"],
  },
  {
    label: "Close Month",
    href: "/dashboard/close",
    icon: RefreshCw,
    group: "Quick Actions",
    keywords: ["close", "month", "period"],
  },
  {
    label: "Ask AI Assistant",
    href: "/dashboard/chat",
    icon: MessageSquare,
    group: "Quick Actions",
    keywords: ["ask", "ai", "help", "assistant"],
  },
];

// ─── Command Palette Component ──────────────────────────────────────────

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [commands, setCommands] = useState<CommandItem[]>([]);
  const [recentItems, setRecentItems] = useState<CommandItem[]>([]);
  const utils = trpc.useUtils();

  // Load recent items from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("commandPaletteRecent");
      if (stored) {
        setRecentItems(JSON.parse(stored));
      }
    } catch {
      // Ignore
    }
  }, []);

  // Save recent items to localStorage
  const saveRecentItem = useCallback((item: CommandItem) => {
    setRecentItems((prev) => {
      const filtered = prev.filter((r) => r.id !== item.id);
      const updated = [item, ...filtered].slice(0, 5);
      try {
        localStorage.setItem("commandPaletteRecent", JSON.stringify(updated));
      } catch {
        // Ignore
      }
      return updated;
    });
  }, []);

  // Load dynamic data (invoices, customers, etc.)
  useEffect(() => {
    async function loadDynamicData() {
      try {
        const [invoices, customers, bankAccounts, docs] = await Promise.all([
          utils.ar.listInvoices.fetch({}).catch(() => []),
          utils.ar.listCustomers.fetch({}).catch(() => []),
          utils.treasury.listBankAccounts.fetch().catch(() => []),
          utils.document.listDocuments.fetch({}).catch(() => []),
        ]);

        const dynamicItems: CommandItem[] = [
          ...(invoices ?? [])
            .slice(0, 10)
            .map((inv: Record<string, unknown>) => ({
              id: `invoice-${inv.id}`,
              label: `Invoice ${inv.invoiceNumber as string}`,
              description: `${(inv.status as string) ?? "pending"}`,
              href: `/dashboard/invoicing`,
              icon: Receipt,
              group: "Invoices",
              keywords: ["invoice", inv.invoiceNumber as string],
            })),
          ...(customers ?? [])
            .slice(0, 10)
            .map((c: Record<string, unknown>) => ({
              id: `customer-${c.id}`,
              label: c.name as string,
              description: "Customer",
              href: `/dashboard/customers`,
              icon: Users,
              group: "Customers",
              keywords: ["customer", c.name as string],
            })),
          ...(bankAccounts ?? [])
            .slice(0, 5)
            .map((b: Record<string, unknown>) => ({
              id: `bank-${b.id}`,
              label: b.name as string,
              description: "Bank Account",
              href: `/dashboard/banking`,
              icon: Wallet,
              group: "Bank Accounts",
              keywords: ["bank", "account", b.name as string],
            })),
          ...(docs ?? []).slice(0, 5).map((d: Record<string, unknown>) => ({
            id: `doc-${d.id}`,
            label: d.name as string,
            description: "Document",
            href: `/dashboard/documents`,
            icon: FileText,
            group: "Documents",
            keywords: ["document", d.name as string],
          })),
        ];

        setCommands(dynamicItems);
      } catch {
        // Silent
      }
    }

    if (open) {
      loadDynamicData();
    }
  }, [open, utils]);

  // Combine all items
  const allItems: CommandItem[] = [
    ...navigationItems.map((item, idx) => ({ ...item, id: `nav-${idx}` })),
    ...quickActions.map((item, idx) => ({ ...item, id: `action-${idx}` })),
    ...commands,
  ];

  // Filter items based on search
  const filteredItems = search
    ? allItems.filter((item) => {
        const searchLower = search.toLowerCase();
        const labelMatch = item.label.toLowerCase().includes(searchLower);
        const descMatch = item.description?.toLowerCase().includes(searchLower);
        const keywordMatch = item.keywords?.some((kw) =>
          kw.toLowerCase().includes(searchLower),
        );
        return labelMatch || descMatch || keywordMatch;
      })
    : allItems;

  // Group filtered items
  const groupedItems = filteredItems.reduce(
    (acc, item) => {
      if (!acc[item.group]) {
        acc[item.group] = [];
      }
      acc[item.group].push(item);
      return acc;
    },
    {} as Record<string, CommandItem[]>,
  );

  // Handle item selection
  const handleSelect = useCallback(
    (item: CommandItem) => {
      if (item.action) {
        item.action();
      } else if (item.href) {
        saveRecentItem(item);
        router.push(item.href);
      }
      onOpenChange(false);
      setSearch("");
    },
    [router, onOpenChange, saveRecentItem],
  );

  // Handle AI query
  const handleAiQuery = useCallback(() => {
    if (search.trim()) {
      router.push(
        `/dashboard/chat?initial=${encodeURIComponent(search.trim())}`,
      );
      onOpenChange(false);
      setSearch("");
    }
  }, [search, router, onOpenChange]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search pages, actions, or ask AI..."
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>
          <div className="flex flex-col items-center justify-center py-6">
            <Search className="h-8 w-8 text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">No results found</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Try searching for something else
            </p>
          </div>
        </CommandEmpty>

        {/* Recent Items */}
        {!search && recentItems.length > 0 && (
          <CommandGroup heading="Recent">
            {recentItems.map((item) => {
              const ____Icon = item.icon;
              return (
                <CommandItem
                  key={`recent-${item.id}`}
                  onSelect={() => handleSelect(item)}
                >
                  <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="flex-1">{item.label}</span>
                  {item.description && (
                    <span className="text-xs text-muted-foreground mr-2">
                      {item.description}
                    </span>
                  )}
                  <CommandShortcut>↵</CommandShortcut>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        {/* AI Query */}
        {search.trim() && (
          <CommandGroup heading="AI">
            <CommandItem onSelect={handleAiQuery}>
              <Sparkles className="mr-2 h-4 w-4 text-primary" />
              <span className="flex-1">Ask AI about &quot;{search}&quot;</span>
              <CommandShortcut>
                <ArrowRight className="h-3 w-3" />
              </CommandShortcut>
            </CommandItem>
          </CommandGroup>
        )}

        {/* Navigation */}
        {!search && (
          <CommandGroup heading="Pages">
            {navigationItems.slice(0, 8).map((item, idx) => {
              const Icon = item.icon;
              return (
                <CommandItem
                  key={`nav-${idx}`}
                  onSelect={() => handleSelect({ ...item, id: `nav-${idx}` })}
                >
                  <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="flex-1">{item.label}</span>
                  <CommandShortcut>↵</CommandShortcut>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        {/* Quick Actions */}
        {!search && (
          <CommandGroup heading="Quick Actions">
            {quickActions.slice(0, 6).map((item, idx) => {
              const Icon = item.icon;
              return (
                <CommandItem
                  key={`action-${idx}`}
                  onSelect={() =>
                    handleSelect({ ...item, id: `action-${idx}` })
                  }
                >
                  <Icon className="mr-2 h-4 w-4 text-primary" />
                  <span className="flex-1">{item.label}</span>
                  <CommandShortcut>↵</CommandShortcut>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        {/* Dynamic Search Results */}
        {search && groupedItems["Invoices"] && (
          <CommandGroup heading="Invoices">
            {groupedItems["Invoices"].slice(0, 5).map((item) => {
              const Icon = item.icon;
              return (
                <CommandItem key={item.id} onSelect={() => handleSelect(item)}>
                  <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="flex-1">{item.label}</span>
                  {item.description && (
                    <span className="text-xs text-muted-foreground mr-2">
                      {item.description}
                    </span>
                  )}
                  <CommandShortcut>↵</CommandShortcut>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        {search && groupedItems["Customers"] && (
          <CommandGroup heading="Customers">
            {groupedItems["Customers"].slice(0, 5).map((item) => {
              const Icon = item.icon;
              return (
                <CommandItem key={item.id} onSelect={() => handleSelect(item)}>
                  <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="flex-1">{item.label}</span>
                  {item.description && (
                    <span className="text-xs text-muted-foreground mr-2">
                      {item.description}
                    </span>
                  )}
                  <CommandShortcut>↵</CommandShortcut>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        {search && groupedItems["Bank Accounts"] && (
          <CommandGroup heading="Bank Accounts">
            {groupedItems["Bank Accounts"].slice(0, 5).map((item) => {
              const Icon = item.icon;
              return (
                <CommandItem key={item.id} onSelect={() => handleSelect(item)}>
                  <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="flex-1">{item.label}</span>
                  {item.description && (
                    <span className="text-xs text-muted-foreground mr-2">
                      {item.description}
                    </span>
                  )}
                  <CommandShortcut>↵</CommandShortcut>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        {search && groupedItems["Documents"] && (
          <CommandGroup heading="Documents">
            {groupedItems["Documents"].slice(0, 5).map((item) => {
              const Icon = item.icon;
              return (
                <CommandItem key={item.id} onSelect={() => handleSelect(item)}>
                  <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="flex-1">{item.label}</span>
                  {item.description && (
                    <span className="text-xs text-muted-foreground mr-2">
                      {item.description}
                    </span>
                  )}
                  <CommandShortcut>↵</CommandShortcut>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        {/* Filtered Pages */}
        {search && groupedItems["Pages"] && (
          <CommandGroup heading="Pages">
            {groupedItems["Pages"].slice(0, 10).map((item) => {
              const Icon = item.icon;
              return (
                <CommandItem key={item.id} onSelect={() => handleSelect(item)}>
                  <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="flex-1">{item.label}</span>
                  {item.description && (
                    <span className="text-xs text-muted-foreground mr-2">
                      {item.description}
                    </span>
                  )}
                  <CommandShortcut>↵</CommandShortcut>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        {/* Filtered Quick Actions */}
        {search && groupedItems["Quick Actions"] && (
          <CommandGroup heading="Quick Actions">
            {groupedItems["Quick Actions"].slice(0, 5).map((item) => {
              const Icon = item.icon;
              return (
                <CommandItem key={item.id} onSelect={() => handleSelect(item)}>
                  <Icon className="mr-2 h-4 w-4 text-primary" />
                  <span className="flex-1">{item.label}</span>
                  <CommandShortcut>↵</CommandShortcut>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        {/* Footer hint */}
        <div className="border-t px-4 py-2 text-[10px] text-muted-foreground/50">
          <kbd className="rounded border bg-muted px-1 py-0.5 text-[8px]">
            ⌘K
          </kbd>{" "}
          to open •{" "}
          <kbd className="rounded border bg-muted px-1 py-0.5 text-[8px]">
            ↵
          </kbd>{" "}
          to select •{" "}
          <kbd className="rounded border bg-muted px-1 py-0.5 text-[8px]">
            esc
          </kbd>{" "}
          to close
        </div>
      </CommandList>
    </CommandDialog>
  );
}
