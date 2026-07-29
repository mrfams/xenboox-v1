"use client";

import React from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  X,
  Zap,
  FileText,
  ShieldCheck,
  Search,
  Download,
  BarChart3,
  BookOpen,
  MessageSquare,
} from "lucide-react";
import { useRouter } from "next/navigation";

type QuickAction = {
  label: string;
  icon: React.ReactNode;
  prompt: string;
};

const ACTIONS: QuickAction[] = [
  {
    label: "Find Document",
    icon: <Search className="h-4 w-4" />,
    prompt: "Find a specific document in my company records",
  },
  {
    label: "Review Approvals",
    icon: <ShieldCheck className="h-4 w-4" />,
    prompt: "Show me all pending approvals that need my attention",
  },
  {
    label: "Process Uploads",
    icon: <Download className="h-4 w-4" />,
    prompt: "Process recent document uploads",
  },
  {
    label: "Search Contracts",
    icon: <FileText className="h-4 w-4" />,
    prompt: "Search all contracts in my business",
  },
  {
    label: "Generate Evidence",
    icon: <BarChart3 className="h-4 w-4" />,
    prompt: "Generate audit evidence package",
  },
  {
    label: "Create Policy",
    icon: <BookOpen className="h-4 w-4" />,
    prompt: "Create a new company policy",
  },
  {
    label: "Audit Document Trail",
    icon: <Search className="h-4 w-4" />,
    prompt: "Audit the document trail for a specific transaction",
  },
  {
    label: "Ask Company Memory",
    icon: <MessageSquare className="h-4 w-4" />,
    prompt: "Ask about anything in my company memory",
  },
];

export function KnowledgeQuickActions() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      {open && (
        <div className="mb-2 flex flex-col items-end gap-1.5">
          {ACTIONS.map((action) => (
            <button
              key={action.label}
              onClick={() => {
                router.push(
                  `/dashboard/chat?initial=${encodeURIComponent(action.prompt)}`,
                );
                setOpen(false);
              }}
              className="group flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-xs font-medium text-foreground shadow-md transition-all duration-200 hover:bg-indigo-50 hover:text-indigo-600 hover:shadow-lg dark:hover:bg-indigo-950/50"
            >
              <span className="text-muted-foreground group-hover:text-indigo-500">
                {action.icon}
              </span>
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      )}

      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl",
          open
            ? "bg-red-500 text-white hover:bg-red-600"
            : "bg-gradient-to-br from-indigo-500 to-indigo-600 text-white hover:from-indigo-600 hover:to-indigo-700",
        )}
      >
        {open ? <X className="h-5 w-5" /> : <Zap className="h-5 w-5" />}
      </button>
    </div>
  );
}
