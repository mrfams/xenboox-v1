"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@xenboox/ui";
import {
  FileText,
  Bot,
  BookOpen,
  Shield,
  Server,
  HelpCircle,
  Search,
  ArrowRight,
} from "lucide-react";

interface SearchItem {
  title: string;
  href: string;
  category: string;
  icon: React.ReactNode;
}

const searchItems: SearchItem[] = [
  {
    title: "Getting Started",
    href: "/docs/getting-started",
    category: "Getting Started",
    icon: <BookOpen className="h-4 w-4" />,
  },
  {
    title: "FAQ",
    href: "/docs/faq",
    category: "Getting Started",
    icon: <HelpCircle className="h-4 w-4" />,
  },
  {
    title: "Accounts Payable",
    href: "/docs/modules/ap",
    category: "Modules",
    icon: <FileText className="h-4 w-4" />,
  },
  {
    title: "Accounts Receivable",
    href: "/docs/modules/ar",
    category: "Modules",
    icon: <FileText className="h-4 w-4" />,
  },
  {
    title: "Payroll",
    href: "/docs/modules/payroll",
    category: "Modules",
    icon: <FileText className="h-4 w-4" />,
  },
  {
    title: "Treasury",
    href: "/docs/modules/treasury",
    category: "Modules",
    icon: <FileText className="h-4 w-4" />,
  },
  {
    title: "Cash",
    href: "/docs/modules/cash",
    category: "Modules",
    icon: <FileText className="h-4 w-4" />,
  },
  {
    title: "Mobile Money",
    href: "/docs/modules/mobile-money",
    category: "Modules",
    icon: <FileText className="h-4 w-4" />,
  },
  {
    title: "Inventory",
    href: "/docs/modules/inventory",
    category: "Modules",
    icon: <FileText className="h-4 w-4" />,
  },
  {
    title: "Fixed Assets",
    href: "/docs/modules/fixed-assets",
    category: "Modules",
    icon: <FileText className="h-4 w-4" />,
  },
  {
    title: "Chart of Accounts",
    href: "/docs/modules/coa",
    category: "Modules",
    icon: <FileText className="h-4 w-4" />,
  },
  {
    title: "Journal",
    href: "/docs/modules/journal",
    category: "Modules",
    icon: <FileText className="h-4 w-4" />,
  },
  {
    title: "Fiscal Periods",
    href: "/docs/modules/fiscal",
    category: "Modules",
    icon: <FileText className="h-4 w-4" />,
  },
  {
    title: "Reports",
    href: "/docs/modules/reports",
    category: "Modules",
    icon: <FileText className="h-4 w-4" />,
  },
  {
    title: "Documents",
    href: "/docs/modules/documents",
    category: "Modules",
    icon: <FileText className="h-4 w-4" />,
  },
  {
    title: "Chat",
    href: "/docs/modules/chat",
    category: "Modules",
    icon: <FileText className="h-4 w-4" />,
  },
  {
    title: "Multi-Currency",
    href: "/docs/modules/currency",
    category: "Modules",
    icon: <FileText className="h-4 w-4" />,
  },
  {
    title: "Organizations",
    href: "/docs/modules/organizations",
    category: "Modules",
    icon: <FileText className="h-4 w-4" />,
  },
  {
    title: "Settings",
    href: "/docs/modules/settings",
    category: "Modules",
    icon: <FileText className="h-4 w-4" />,
  },
  {
    title: "Analytics",
    href: "/docs/modules/analytics",
    category: "Modules",
    icon: <FileText className="h-4 w-4" />,
  },
  {
    title: "CFO Agent",
    href: "/docs/agents/cfo",
    category: "AI Agents",
    icon: <Bot className="h-4 w-4" />,
  },
  {
    title: "Controller Agent",
    href: "/docs/agents/controller",
    category: "AI Agents",
    icon: <Bot className="h-4 w-4" />,
  },
  {
    title: "Ledger Agent",
    href: "/docs/agents/ledger",
    category: "AI Agents",
    icon: <Bot className="h-4 w-4" />,
  },
  {
    title: "Treasury Agent",
    href: "/docs/agents/treasury",
    category: "AI Agents",
    icon: <Bot className="h-4 w-4" />,
  },
  {
    title: "Payroll Manager Agent",
    href: "/docs/agents/payroll",
    category: "AI Agents",
    icon: <Bot className="h-4 w-4" />,
  },
  {
    title: "Compliance Agent",
    href: "/docs/agents/compliance",
    category: "AI Agents",
    icon: <Bot className="h-4 w-4" />,
  },
  {
    title: "AP Agent",
    href: "/docs/agents/ap",
    category: "AI Agents",
    icon: <Bot className="h-4 w-4" />,
  },
  {
    title: "AR Agent",
    href: "/docs/agents/ar",
    category: "AI Agents",
    icon: <Bot className="h-4 w-4" />,
  },
  {
    title: "Inventory Agent",
    href: "/docs/agents/inventory",
    category: "AI Agents",
    icon: <Bot className="h-4 w-4" />,
  },
  {
    title: "Fixed Assets Agent",
    href: "/docs/agents/fixed-assets",
    category: "AI Agents",
    icon: <Bot className="h-4 w-4" />,
  },
  {
    title: "Cash Agent",
    href: "/docs/agents/cash",
    category: "AI Agents",
    icon: <Bot className="h-4 w-4" />,
  },
  {
    title: "Mobile Money Agent",
    href: "/docs/agents/mobile-money",
    category: "AI Agents",
    icon: <Bot className="h-4 w-4" />,
  },
  {
    title: "Reporting Agent",
    href: "/docs/agents/reporting",
    category: "AI Agents",
    icon: <Bot className="h-4 w-4" />,
  },
  {
    title: "Fiscal Agent",
    href: "/docs/agents/fiscal",
    category: "AI Agents",
    icon: <Bot className="h-4 w-4" />,
  },
  {
    title: "Document Agent",
    href: "/docs/agents/document",
    category: "AI Agents",
    icon: <Bot className="h-4 w-4" />,
  },
  {
    title: "Chat Agent",
    href: "/docs/agents/chat",
    category: "AI Agents",
    icon: <Bot className="h-4 w-4" />,
  },
  {
    title: "Analytics Agent",
    href: "/docs/agents/analytics",
    category: "AI Agents",
    icon: <Bot className="h-4 w-4" />,
  },
  {
    title: "Budget Agent",
    href: "/docs/agents/budget",
    category: "AI Agents",
    icon: <Bot className="h-4 w-4" />,
  },
  {
    title: "Audit Agent",
    href: "/docs/agents/audit",
    category: "AI Agents",
    icon: <Bot className="h-4 w-4" />,
  },
  {
    title: "Security",
    href: "/docs/security",
    category: "Infrastructure",
    icon: <Shield className="h-4 w-4" />,
  },
  {
    title: "DevOps & Infrastructure",
    href: "/docs/devsecops",
    category: "Infrastructure",
    icon: <Server className="h-4 w-4" />,
  },
];

const categories = Array.from(new Set(searchItems.map((i) => i.category)));

export function SearchDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runSearch = (item: SearchItem) => {
    setOpen(false);
    router.push(item.href);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative flex w-full items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2 text-sm text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="hidden sm:inline text-xs sm:text-sm">
          Search documentation...
        </span>
        <kbd className="ml-auto hidden sm:inline-flex items-center gap-0.5 rounded border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground">
          <span>⌘</span>K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search documentation..." />
        <CommandList>
          <CommandEmpty>
            <div className="flex flex-col items-center gap-2 py-4">
              <Search className="h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No results found</p>
              <p className="text-xs text-muted-foreground/60">
                Try &ldquo;payroll&rdquo;, &ldquo;agent&rdquo;, or
                &ldquo;journal&rdquo;
              </p>
            </div>
          </CommandEmpty>
          {categories.map((category) => {
            const items = searchItems.filter((i) => i.category === category);
            return (
              <CommandGroup key={category} heading={category}>
                {items.map((item) => (
                  <CommandItem
                    key={item.href}
                    onSelect={() => runSearch(item)}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      {item.icon}
                      <span>{item.title}</span>
                    </div>
                    <ArrowRight className="h-3 w-3 text-muted-foreground/50" />
                  </CommandItem>
                ))}
              </CommandGroup>
            );
          })}
        </CommandList>
      </CommandDialog>
    </>
  );
}
