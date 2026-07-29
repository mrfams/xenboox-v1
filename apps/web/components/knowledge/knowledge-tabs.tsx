"use client";

import React from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Search, Lightbulb, ListChecks } from "lucide-react";

type KnowledgeTabId = "search" | "insights" | "actions";

interface KnowledgeTab {
  id: KnowledgeTabId;
  label: string;
  icon: React.ReactNode;
  count?: number;
}

const DEFAULT_TABS: KnowledgeTab[] = [
  {
    id: "search",
    label: "Search Everything",
    icon: <Search className="h-3.5 w-3.5" />,
  },
  {
    id: "insights",
    label: "AI Insights",
    icon: <Lightbulb className="h-3.5 w-3.5" />,
    count: 6,
  },
  {
    id: "actions",
    label: "Pending Actions",
    icon: <ListChecks className="h-3.5 w-3.5" />,
    count: 12,
  },
];

interface KnowledgeTabsProps {
  tabs?: KnowledgeTab[];
  defaultTab?: KnowledgeTabId;
  onTabChange?: (tab: KnowledgeTabId) => void;
  className?: string;
}

export function KnowledgeTabs({
  tabs = DEFAULT_TABS,
  defaultTab = "search",
  onTabChange,
  className,
}: KnowledgeTabsProps) {
  const [activeTab, setActiveTab] = useState<KnowledgeTabId>(defaultTab);

  const handleTabClick = (tabId: KnowledgeTabId) => {
    setActiveTab(tabId);
    onTabChange?.(tabId);
  };

  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-xl border bg-card p-1 shadow-sm",
        className,
      )}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => handleTabClick(tab.id)}
          data-active={activeTab === tab.id ? "true" : "false"}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-200",
            activeTab === tab.id
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
          )}
        >
          {tab.icon}
          <span>{tab.label}</span>
          {tab.count !== undefined && (
            <span
              className={cn(
                "ml-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold",
                activeTab === tab.id
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
