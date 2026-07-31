"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

type SubPageTab = {
  label: string;
  href: string;
};

interface SubPageTabsProps {
  tabs: readonly SubPageTab[];
}

export function SubPageTabs({ tabs }: SubPageTabsProps) {
  const pathname = usePathname() ?? "/";

  return (
    <nav className="flex items-center gap-1 overflow-x-auto rounded-lg border bg-card p-1">
      {tabs.map((tab) => {
        const active =
          tab.href === pathname || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
