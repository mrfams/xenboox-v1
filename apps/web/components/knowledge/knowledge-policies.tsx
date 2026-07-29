"use client";

import React from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Brain,
  ArrowRight,
  BookOpen,
  Users,
  DollarSign,
  FileText,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface PolicyQuestion {
  question: string;
  icon: React.ReactNode;
  category: string;
}

const POLICY_QUESTIONS: PolicyQuestion[] = [
  {
    question: "What is our travel policy?",
    icon: <BookOpen className="h-3.5 w-3.5" />,
    category: "Policies",
  },
  {
    question: "Who approves marketing spend?",
    icon: <Users className="h-3.5 w-3.5" />,
    category: "Approvals",
  },
  {
    question: "What is our refund policy?",
    icon: <DollarSign className="h-3.5 w-3.5" />,
    category: "Policies",
  },
  {
    question: "Find supplier onboarding process",
    icon: <FileText className="h-3.5 w-3.5" />,
    category: "Processes",
  },
  {
    question: "What is our expense policy?",
    icon: <DollarSign className="h-3.5 w-3.5" />,
    category: "Policies",
  },
  {
    question: "Who can approve overtime?",
    icon: <Users className="h-3.5 w-3.5" />,
    category: "Approvals",
  },
];

export function KnowledgePolicies() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const router = useRouter();

  const handleAsk = (question: string) => {
    router.push(`/dashboard/chat?initial=${encodeURIComponent(question)}`);
  };

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-signal-indigo" />
          <h3 className="text-sm font-medium">Ask Your Company Memory</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] text-muted-foreground">
            AI Understanding
          </span>
          <span className="text-[10px] font-bold tabular-nums text-balanced-green">
            96%
          </span>
        </div>
      </div>
      <div className="p-3">
        <div className="space-y-1">
          {POLICY_QUESTIONS.map((item, idx) => (
            <button
              key={idx}
              onClick={() => handleAsk(item.question)}
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
              className={cn(
                "group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all duration-200",
                hoveredIndex === idx
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/50",
              )}
            >
              <div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-lg transition-colors duration-200",
                  hoveredIndex === idx
                    ? "bg-primary/10 text-primary"
                    : "bg-accent text-muted-foreground",
                )}
              >
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{item.question}</p>
                <p className="text-[9px] text-muted-foreground/60 mt-0.5">
                  {item.category}
                </p>
              </div>
              <ArrowRight
                className={cn(
                  "h-3.5 w-3.5 shrink-0 transition-all duration-200",
                  hoveredIndex === idx
                    ? "translate-x-0.5 text-primary opacity-100"
                    : "opacity-0",
                )}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
