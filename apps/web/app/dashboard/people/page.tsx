"use client";

import { useEffect, useState } from "react";
import { Users, Boxes, Building2, PiggyBank, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { useEntity } from "@/lib/entity-context";
import { cn } from "@/lib/utils";
import { useSurfaceSync } from "@/lib/hooks/use-surface-sync";

import { PayrollView } from "@/components/people/payroll-view";
import { InventoryView } from "@/components/people/inventory-view";
import { AssetsView } from "@/components/people/assets-view";
import { BudgetView } from "@/components/people/budget-view";

type Tab = "payroll" | "inventory" | "assets" | "budget";

const TABS: { key: Tab; label: string; icon: LucideIcon }[] = [
  { key: "payroll", label: "Payroll", icon: Users },
  { key: "inventory", label: "Inventory", icon: Boxes },
  { key: "assets", label: "Fixed Assets", icon: Building2 },
  { key: "budget", label: "Budget", icon: PiggyBank },
];

export default function PeopleAssetsPage() {
  const { entityId } = useEntity();
  const [tab, setTab] = useState<Tab>("payroll");

  useSurfaceSync({ entityId, surfaces: ["people"] });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag?.match(/INPUT|TEXTAREA|SELECT/)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      switch (e.key) {
        case "1":
          e.preventDefault();
          setTab("payroll");
          break;
        case "2":
          e.preventDefault();
          setTab("inventory");
          break;
        case "3":
          e.preventDefault();
          setTab("assets");
          break;
        case "4":
          e.preventDefault();
          setTab("budget");
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex h-full flex-col p-4 pb-6 sm:p-6">
      <header className="mb-3">
        <h1 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground">
          <Wallet className="h-4 w-4 text-primary" aria-hidden="true" />
          People & Assets
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Workforce, stock, assets and budgets — AI drafts, you approve.
        </p>
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-1" role="tablist" aria-label="People views">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-controls={`people-panel-${t.key}`}
                  tabIndex={active ? 0 : -1}
                  onClick={() => setTab(t.key)}
                  onKeyDown={(e) => {
                    const idx = TABS.findIndex((x) => x.key === tab);
                    if (e.key === "ArrowRight") {
                      e.preventDefault();
                      const next = TABS[(idx + 1) % TABS.length]!;
                      setTab(next.key);
                    } else if (e.key === "ArrowLeft") {
                      e.preventDefault();
                      const prev = TABS[(idx - 1 + TABS.length) % TABS.length]!;
                      setTab(prev.key);
                    } else if (e.key === "Home") {
                      e.preventDefault();
                      setTab(TABS[0]!.key);
                    } else if (e.key === "End") {
                      e.preventDefault();
                      setTab(TABS[TABS.length - 1]!.key);
                    }
                  }}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all",
                    active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  {t.label}
                </button>
              );
            })}
          </div>
          <span className="hidden text-[10px] text-muted-foreground/50 sm:inline">1-4 switch tabs</span>
        </div>
      </header>
      <div className="flex-1 min-h-0 overflow-y-auto" role="tabpanel" id={`people-panel-${tab}`} aria-label={`${tab} view`}>
        {tab === "payroll" && <PayrollView />}
        {tab === "inventory" && <InventoryView />}
        {tab === "assets" && <AssetsView />}
        {tab === "budget" && <BudgetView />}
      </div>
    </div>
  );
}
