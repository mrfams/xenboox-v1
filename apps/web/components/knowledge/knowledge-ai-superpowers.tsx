"use client";

import React from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Zap,
  Search,
  ShieldCheck,
  FileText,
  Download,
  BarChart3,
  BookOpen,
  MessageSquare,
  Bot,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface SuperpowerAction {
  label: string;
  description: string;
  icon: React.ReactNode;
  prompt: string;
  gradient: string;
}

const SUPERPOWERS: SuperpowerAction[] = [
  {
    label: "Find Document",
    description: "Search across all company documents with AI",
    icon: <Search className="h-4 w-4" />,
    prompt: "Find a specific document in my company records",
    gradient: "from-blue-500/20 to-blue-600/10",
  },
  {
    label: "Review Approvals",
    description: "AI-reviewed decisions waiting for you",
    icon: <ShieldCheck className="h-4 w-4" />,
    prompt: "Show me all pending approvals that need my attention",
    gradient: "from-emerald-500/20 to-emerald-600/10",
  },
  {
    label: "Search Contracts",
    description: "Find terms, renewals, and obligations",
    icon: <FileText className="h-4 w-4" />,
    prompt: "Search all contracts in my business",
    gradient: "from-violet-500/20 to-violet-600/10",
  },
  {
    label: "Audit Trail",
    description: "Trace every document and decision",
    icon: <BarChart3 className="h-4 w-4" />,
    prompt: "Audit the document trail for a specific transaction",
    gradient: "from-amber-500/20 to-amber-600/10",
  },
  {
    label: "Generate Evidence",
    description: "Prepare audit-ready evidence packages",
    icon: <Download className="h-4 w-4" />,
    prompt: "Generate audit evidence package",
    gradient: "from-rose-500/20 to-rose-600/10",
  },
  {
    label: "Create Policy",
    description: "Document new company policies with AI",
    icon: <BookOpen className="h-4 w-4" />,
    prompt: "Create a new company policy",
    gradient: "from-cyan-500/20 to-cyan-600/10",
  },
  {
    label: "Process Uploads",
    description: "Auto-extract and categorize documents",
    icon: <Download className="h-4 w-4" />,
    prompt: "Process recent document uploads",
    gradient: "from-indigo-500/20 to-indigo-600/10",
  },
  {
    label: "Ask Memory",
    description: "Query everything Xenboox knows",
    icon: <MessageSquare className="h-4 w-4" />,
    prompt: "Ask about anything in my company memory",
    gradient: "from-purple-500/20 to-purple-600/10",
  },
];

export function KnowledgeAISuperpowers() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const router = useRouter();

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500">
          <Zap className="h-3 w-3 text-white" />
        </div>
        <h3 className="text-sm font-medium">AI Superpowers</h3>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3">
        {SUPERPOWERS.map((power, idx) => (
          <button
            key={power.label}
            onClick={() =>
              router.push(
                `/dashboard/chat?initial=${encodeURIComponent(power.prompt)}`,
              )
            }
            onMouseEnter={() => setHoveredIndex(idx)}
            onMouseLeave={() => setHoveredIndex(null)}
            className={cn(
              "group relative flex flex-col items-center gap-2 rounded-xl border border-transparent p-3 text-center transition-all duration-300",
              "hover:border-border hover:shadow-md",
              hoveredIndex === idx && "scale-[1.02]",
            )}
          >
            {/* Gradient background */}
            <div
              className={cn(
                "absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300",
                "bg-gradient-to-br",
                power.gradient,
                hoveredIndex === idx && "opacity-100",
              )}
            />

            {/* Icon */}
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-muted-foreground transition-all duration-300 group-hover:bg-primary/10 group-hover:text-primary">
              {power.icon}
            </div>

            {/* Label */}
            <div className="relative">
              <p className="text-[11px] font-semibold text-foreground">
                {power.label}
              </p>
              <p className="mt-0.5 text-[9px] text-muted-foreground leading-tight">
                {power.description}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
