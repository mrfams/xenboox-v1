"use client";

import { useState } from "react";
import {
  Plus,
  FileText,
  Upload,
  Search,
  Bot,
  Zap,
  ArrowRight,
  X,
  Sparkles,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { usePermission } from "@/lib/permissions";

// ─── Quick Actions ─────────────────────────────────────────────────────────
//
// Floating quick actions in the sidebar. Common actions accessible
// from anywhere: create invoice, upload document, ask AI, etc.

type QuickAction = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  onClick?: () => void;
  color: string;
  shortcut?: string;
  permission?: { module: string; action: string };
};

const DEFAULT_ACTIONS: QuickAction[] = [
  {
    id: "create-invoice",
    label: "Create Invoice",
    icon: FileText,
    href: "/dashboard/operations/invoices",
    color: "text-emerald-500",
    shortcut: "Ctrl+I",
    permission: { module: "accounts_receivable", action: "create" },
  },
  {
    id: "upload-document",
    label: "Upload Document",
    icon: Upload,
    href: "/dashboard/ingestion",
    color: "text-blue-500",
    shortcut: "Ctrl+U",
    permission: { module: "document_management", action: "create" },
  },
  {
    id: "ask-ai",
    label: "Ask AI",
    icon: Bot,
    href: "/dashboard",
    color: "text-primary",
    shortcut: "Ctrl+K",
  },
  {
    id: "search",
    label: "Search",
    icon: Search,
    href: "/dashboard/ledger",
    color: "text-muted-foreground",
    shortcut: "Ctrl+/",
  },
];

export function QuickActions() {
  const [isExpanded, setIsExpanded] = useState(false);
  const { hasPermission } = usePermission();

  const visibleActions = DEFAULT_ACTIONS.filter((action) => {
    if (!action.permission) return true;
    return hasPermission(action.permission.module, action.permission.action);
  });

  if (visibleActions.length === 0) return null;

  return (
    <div className="relative">
      {/* Expand button */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "w-full flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
          isExpanded
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:text-foreground hover:bg-accent",
        )}
        aria-label="Quick actions"
      >
        <Zap className="h-4 w-4" />
        <span>Quick Actions</span>
        <ArrowRight
          className={cn(
            "h-3 w-3 ml-auto transition-transform",
            isExpanded && "rotate-90",
          )}
        />
      </button>

      {/* Expanded actions */}
      {isExpanded && (
        <div className="mt-1 space-y-1 pl-2">
          {visibleActions.map((action) => {
            const Icon = action.icon;
            return (
              <a
                key={action.id}
                href={action.href}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors group"
              >
                <Icon className={cn("h-3.5 w-3.5", action.color)} />
                <span>{action.label}</span>
                {action.shortcut && (
                  <span className="ml-auto text-[9px] text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity">
                    {action.shortcut}
                  </span>
                )}
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
