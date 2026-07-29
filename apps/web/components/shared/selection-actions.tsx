"use client";

import React from "react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Brain, Send, FileText, Search, X, BarChart3 } from "lucide-react";
import { useRouter } from "next/navigation";

interface SelectionAction {
  label: string;
  icon: React.ReactNode;
  prompt: string;
}

interface SelectionActionsProps {
  selectedCount: number;
  selectedLabel?: string;
  actions?: SelectionAction[];
  onAction?: (prompt: string) => void;
  onClear?: () => void;
  className?: string;
}

const DEFAULT_ACTIONS: SelectionAction[] = [
  {
    label: "Explain",
    icon: <Brain className="h-3.5 w-3.5" />,
    prompt: "Explain the selected items",
  },
  {
    label: "Categorize",
    icon: <FileText className="h-3.5 w-3.5" />,
    prompt: "Categorize the selected items",
  },
  {
    label: "Find duplicates",
    icon: <Search className="h-3.5 w-3.5" />,
    prompt: "Find duplicates among the selected items",
  },
  {
    label: "Analyze",
    icon: <BarChart3 className="h-3.5 w-3.5" />,
    prompt: "Analyze the selected items",
  },
  {
    label: "Export",
    icon: <Send className="h-3.5 w-3.5" />,
    prompt: "Export the selected items",
  },
];

export function SelectionActions({
  selectedCount,
  selectedLabel = "selected",
  actions = DEFAULT_ACTIONS,
  onAction,
  onClear,
  className,
}: SelectionActionsProps) {
  const [visible, setVisible] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (selectedCount > 0) {
      setVisible(true);
    } else {
      setVisible(false);
    }
  }, [selectedCount]);

  if (!visible || selectedCount === 0) return null;

  const handleAction = (prompt: string) => {
    if (onAction) {
      onAction(prompt);
    } else {
      router.push(
        `/dashboard/chat?initial=${encodeURIComponent(prompt + " (" + selectedCount + " " + selectedLabel + ")")}`,
      );
    }
  };

  return (
    <div
      className={cn(
        "fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300",
        className,
      )}
    >
      <div className="flex items-center gap-2 rounded-xl border bg-card px-3 py-2 shadow-lg">
        <span className="shrink-0 text-xs font-medium text-muted-foreground mr-1">
          {selectedCount} {selectedLabel}
        </span>
        <div className="flex items-center gap-1">
          {actions.map((action) => (
            <button
              key={action.label}
              onClick={() => handleAction(action.prompt)}
              className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-medium text-foreground transition-colors hover:bg-accent hover:text-signal-indigo"
            >
              <span className="text-muted-foreground">{action.icon}</span>
              {action.label}
            </button>
          ))}
        </div>
        {onClear && (
          <button
            onClick={onClear}
            className="ml-1 flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-accent"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
