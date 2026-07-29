"use client";

import { cn } from "@/lib/utils";
import { Brain, Layout, Table2 } from "lucide-react";

export type ViewMode = "ai" | "workspace" | "data";

interface ViewSwitcherProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
  className?: string;
}

const VIEWS: { value: ViewMode; label: string; icon: React.ReactNode }[] = [
  { value: "ai", label: "AI View", icon: <Brain className="h-3.5 w-3.5" /> },
  {
    value: "workspace",
    label: "Workspace",
    icon: <Layout className="h-3.5 w-3.5" />,
  },
  {
    value: "data",
    label: "Data View",
    icon: <Table2 className="h-3.5 w-3.5" />,
  },
];

export function ViewSwitcher({
  value,
  onChange,
  className,
}: ViewSwitcherProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-lg border bg-card p-0.5",
        className,
      )}
    >
      {VIEWS.map((view) => (
        <button
          key={view.value}
          onClick={() => onChange(view.value)}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all duration-200",
            value === view.value
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-accent",
          )}
        >
          {view.icon}
          {view.label}
        </button>
      ))}
    </div>
  );
}

// ─── Data View Filter Bar ────────────────────────────────────────────────

interface FilterBarProps {
  searchPlaceholder?: string;
  className?: string;
}

export function FilterBar({
  searchPlaceholder = "Filter records...",
  className,
}: FilterBarProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <input
        type="text"
        placeholder={searchPlaceholder}
        className="h-8 flex-1 rounded-md border bg-background px-2.5 text-xs placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-signal-indigo/30 max-w-[240px]"
      />
      <select className="h-8 rounded-md border bg-background px-2 text-[10px] text-muted-foreground focus:outline-none focus:ring-1 focus:ring-signal-indigo/30">
        <option>All statuses</option>
        <option>Active</option>
        <option>Pending</option>
        <option>Completed</option>
      </select>
      <select className="h-8 rounded-md border bg-background px-2 text-[10px] text-muted-foreground focus:outline-none focus:ring-1 focus:ring-signal-indigo/30">
        <option>Sort by date</option>
        <option>Sort by amount</option>
        <option>Sort by name</option>
      </select>
      <span className="text-[9px] text-muted-foreground ml-auto">
        24 records
      </span>
    </div>
  );
}
