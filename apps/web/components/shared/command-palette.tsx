"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  MessageSquare,
  Wallet,
  BarChart3,
  Settings,
  Activity,
  FileText,
  HelpCircle,
  Search,
  Plus,
  ArrowRight,
  Clock,
  Sparkles,
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
  /** AI prompt to send to Command Center — preferred over href for actions */
  aiPrompt?: string;
  icon: LucideIcon;
  group: string;
  keywords?: string[];
  action?: () => void;
};

// ─── Navigation Items (5 AI-native surfaces) ────────────────────────────

const navigationItems: Omit<CommandItem, "id">[] = [
  {
    label: "Command Center",
    href: "/dashboard",
    icon: MessageSquare,
    group: "Pages",
    keywords: ["chat", "ai", "assistant", "ask", "command"],
  },
  {
    label: "Tasks",
    href: "/dashboard/tasks",
    icon: Activity,
    group: "Pages",
    keywords: ["activity", "approvals", "pending", "review", "tasks"],
  },
  {
    label: "Financial Pulse",
    href: "/dashboard/financial-pulse",
    icon: BarChart3,
    group: "Pages",
    keywords: ["financial", "pulse", "kpi", "narrative"],
  },
  {
    label: "Ledger",
    href: "/dashboard/ledger",
    icon: FileText,
    group: "Pages",
    keywords: ["ledger", "journal", "entries", "gl"],
  },
  {
    label: "Operations",
    href: "/dashboard/operations",
    icon: Wallet,
    group: "Pages",
    keywords: ["operations", "banking", "cash", "flow"],
  },
  {
    label: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
    group: "Pages",
    keywords: ["settings", "preferences", "config"],
  },
  {
    label: "Help Center",
    href: "/docs",
    icon: HelpCircle,
    group: "Pages",
    keywords: ["help", "support", "faq", "guide", "docs", "contact"],
  },
];

// ─── Quick Actions (AI-mediated) ────────────────────────────────────────

const quickActions: Omit<CommandItem, "id">[] = [
  {
    label: "Create Invoice",
    aiPrompt: "Create a new sales invoice",
    icon: Plus,
    group: "Quick Actions",
    keywords: ["create", "new", "invoice", "bill"],
  },
  {
    label: "Record Expense",
    aiPrompt: "Record a new expense",
    icon: Plus,
    group: "Quick Actions",
    keywords: ["create", "new", "expense", "cost"],
  },
  {
    label: "Add Customer",
    aiPrompt: "Add a new customer",
    icon: Plus,
    group: "Quick Actions",
    keywords: ["add", "new", "customer", "client"],
  },
  {
    label: "Add Vendor",
    aiPrompt: "Add a new vendor",
    icon: Plus,
    group: "Quick Actions",
    keywords: ["add", "new", "vendor", "supplier"],
  },
  {
    label: "Run Payroll",
    aiPrompt: "Run payroll for this period",
    icon: Sparkles,
    group: "Quick Actions",
    keywords: ["run", "payroll", "process", "salary"],
  },
  {
    label: "Generate Report",
    aiPrompt: "Generate a financial report",
    icon: BarChart3,
    group: "Quick Actions",
    keywords: ["generate", "report", "export"],
  },
  {
    label: "Reconcile Bank",
    aiPrompt: "Help me reconcile bank transactions",
    icon: Sparkles,
    group: "Quick Actions",
    keywords: ["reconcile", "bank", "match"],
  },
  {
    label: "Close Month-End",
    aiPrompt: "Close the books for this month",
    icon: Sparkles,
    group: "Quick Actions",
    keywords: ["close", "month", "period", "end"],
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
  const [recentItems, setRecentItems] = useState<CommandItem[]>([]);
  const [dynamicItems, setDynamicItems] = useState<CommandItem[]>([]);
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

  // Load dynamic data (invoices, customers, bank accounts)
  useEffect(() => {
    async function loadDynamicData() {
      try {
        const [invoices, customers, bankAccounts, docs] = await Promise.all([
          utils.ar.listInvoices.fetch({}).catch(() => []),
          utils.ar.listCustomers.fetch({}).catch(() => []),
          utils.treasury.listBankAccounts.fetch().catch(() => []),
          utils.document.listDocuments.fetch({}).catch(() => []),
        ]);

        const items: CommandItem[] = [
          ...(invoices ?? [])
            .slice(0, 5)
            .map((inv: Record<string, unknown>) => ({
              id: `invoice-${inv.id}`,
              label: `Invoice ${inv.invoiceNumber as string}`,
              description: `${(inv.status as string) ?? "pending"}`,
              aiPrompt: `Show me invoice ${inv.invoiceNumber as string}`,
              icon: FileText,
              group: "Invoices",
              keywords: ["invoice", inv.invoiceNumber as string],
            })),
          ...(customers ?? [])
            .slice(0, 5)
            .map((c: Record<string, unknown>) => ({
              id: `customer-${c.id}`,
              label: c.name as string,
              description: "Customer",
              aiPrompt: `Show me customer ${c.name as string}`,
              icon: LayoutDashboard,
              group: "Customers",
              keywords: ["customer", c.name as string],
            })),
          ...(bankAccounts ?? [])
            .slice(0, 5)
            .map((b: Record<string, unknown>) => ({
              id: `bank-${b.id}`,
              label: b.name as string,
              description: "Bank Account",
              aiPrompt: `Show me bank account ${b.name as string}`,
              icon: Wallet,
              group: "Bank Accounts",
              keywords: ["bank", "account", b.name as string],
            })),
          ...(docs ?? []).slice(0, 5).map((d: Record<string, unknown>) => ({
            id: `doc-${d.id}`,
            label: d.name as string,
            description: "Document",
            aiPrompt: `Show me document ${d.name as string}`,
            icon: FileText,
            group: "Documents",
            keywords: ["document", d.name as string],
          })),
        ];

        setDynamicItems(items);
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
    ...dynamicItems,
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

  // Navigate to Command Center with an AI prompt
  const navigateToAi = useCallback(
    (prompt: string) => {
      router.push(`/dashboard?prompt=${encodeURIComponent(prompt)}`);
      onOpenChange(false);
      setSearch("");
    },
    [router, onOpenChange],
  );

  // Handle item selection
  const handleSelect = useCallback(
    (item: CommandItem) => {
      if (item.action) {
        item.action();
      } else if (item.aiPrompt) {
        navigateToAi(item.aiPrompt);
      } else if (item.href) {
        saveRecentItem(item);
        router.push(item.href);
      }
      onOpenChange(false);
      setSearch("");
    },
    [router, onOpenChange, saveRecentItem, navigateToAi],
  );

  // Handle AI query
  const handleAiQuery = useCallback(() => {
    if (search.trim()) {
      navigateToAi(search.trim());
    }
  }, [search, navigateToAi]);

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
            {recentItems.map((item) => (
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
            ))}
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
            {navigationItems.map((item, idx) => {
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
            {quickActions.map((item, idx) => {
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
        {search &&
          Object.entries(groupedItems).map(([group, items]) => (
            <CommandGroup key={group} heading={group}>
              {items.slice(0, 5).map((item) => {
                const Icon = item.icon;
                return (
                  <CommandItem
                    key={item.id}
                    onSelect={() => handleSelect(item)}
                  >
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
          ))}

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
