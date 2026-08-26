"use client";

import { Suspense, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ArrowLeftRight,
  FileText,
  CreditCard,
  Building2,
  Users,
  Landmark,
  type LucideIcon,
} from "lucide-react";

import { ModulePageShell } from "@/components/module/module-page-shell";
import {
  OverviewView,
  type OperationsTab,
} from "@/components/operations/overview-view";
import { InvoicesView } from "@/components/operations/invoices-view";
import { BillsView } from "@/components/finance/bills-view";
import { CustomersView } from "@/components/operations/customers-view";
import { VendorsView } from "@/components/operations/vendors-view";
import { BankingView } from "@/components/operations/banking-view";
import { cn } from "@/lib/utils";

// ─── Operations ───────────────────────────────────────────────────────────
//
// Money in, money out. AI handles it, you approve.
// Tabbed like the Ledger surface: Overview · Invoices · Bills · People ·
// Banking. The active tab mirrors to ?tab= so deep links work.

const TABS: { key: OperationsTab; label: string; icon: LucideIcon }[] = [
  { key: "overview", label: "Overview", icon: ArrowLeftRight },
  { key: "invoices", label: "Invoices", icon: FileText },
  { key: "bills", label: "Bills", icon: CreditCard },
  { key: "customers", label: "Customers", icon: Users },
  { key: "vendors", label: "Vendors", icon: Building2 },
  { key: "banking", label: "Banking", icon: Landmark },
];

function isOperationsTab(
  value: string | null | undefined,
): value is OperationsTab {
  return TABS.some((t) => t.key === value);
}

// ─── Keyboard-Navigable Tab List ──────────────────────────────────────────

function OperationsTabList({
  activeTab,
  onTabChange,
}: {
  activeTab: OperationsTab;
  onTabChange: (key: OperationsTab) => void;
}) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const tabIndex = TABS.findIndex((t) => t.key === activeTab);

  const focusTab = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(index, TABS.length - 1));
    tabRefs.current[clamped]?.focus();
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowRight":
          e.preventDefault();
          focusTab(tabIndex + 1);
          break;
        case "ArrowLeft":
          e.preventDefault();
          focusTab(tabIndex - 1);
          break;
        case "Home":
          e.preventDefault();
          focusTab(0);
          break;
        case "End":
          e.preventDefault();
          focusTab(TABS.length - 1);
          break;
      }
    },
    [tabIndex, focusTab],
  );

  return (
    <div
      role="tablist"
      aria-label="Operations sections"
      className="flex items-center gap-1 overflow-x-auto border-b border-border/50 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {TABS.map((tab, i) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.key;

        return (
          <button
            key={tab.key}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`operations-tab-${tab.key}`}
            aria-selected={isActive}
            aria-controls={`operations-panel-${tab.key}`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onTabChange(tab.key)}
            onKeyDown={handleKeyDown}
            className={cn(
              "flex items-center gap-1.5 border-b-2 -mb-px px-3 py-2.5 text-xs font-medium transition-colors whitespace-nowrap",
              isActive
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function OperationsPage() {
  return (
    <Suspense>
      <OperationsInner />
    </Suspense>
  );
}

function OperationsInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // ── Active tab synced to ?tab= for deep links ─────────────────────────
  const tabParam = searchParams?.get("tab");
  const activeTab: OperationsTab = isOperationsTab(tabParam)
    ? tabParam
    : "overview";

  const handleTabChange = useCallback(
    (key: OperationsTab) => {
      const url = new URL(window.location.href);
      if (key === "overview") {
        url.searchParams.delete("tab");
      } else {
        url.searchParams.set("tab", key);
      }
      router.replace(url.pathname + url.search, { scroll: false });
    },
    [router],
  );

  // Only the active view mounts, keeping queries light per tab.
  const panels: Record<OperationsTab, React.ReactNode> = {
    overview: <OverviewView onNavigateTab={handleTabChange} />,
    invoices: <InvoicesView />,
    bills: <BillsView />,
    customers: <CustomersView />,
    vendors: <VendorsView />,
    banking: <BankingView />,
  };

  return (
    <ModulePageShell
      title="Operations"
      description="Money in, money out. AI handles it, you approve."
      icon={ArrowLeftRight}
      disableAiCopilot={false}
      aiSuggestions={[
        { label: "Show overdue invoices", prompt: "Show overdue invoices" },
        {
          label: "What bills need paying?",
          prompt: "What bills need paying?",
        },
        { label: "Run payroll", prompt: "Run payroll" },
      ]}
    >
      <div className="p-3 pb-20 sm:p-6 md:pb-6">
        {/* Keyboard-navigable tab list */}
        <OperationsTabList
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />

        {/* Tab panel */}
        <div
          role="tabpanel"
          id={`operations-panel-${activeTab}`}
          aria-labelledby={`operations-tab-${activeTab}`}
          tabIndex={0}
          className="pt-4 focus:outline-none"
        >
          {panels[activeTab]}
        </div>
      </div>
    </ModulePageShell>
  );
}
