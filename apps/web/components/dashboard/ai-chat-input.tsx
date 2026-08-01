"use client";

import { useState, useRef, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui";
import {
  ArrowRight,
  BookOpen,
  Wallet,
  FileText,
  Search,
  BarChart3,
  RefreshCw,
  Calendar,
} from "lucide-react";

type AIChatInputProps = {
  className?: string;
};

type Suggestion = {
  label: string;
  prompt: string;
  icon: typeof BookOpen;
};

const SUGGESTIONS: Suggestion[] = [
  {
    label: "Close July books",
    prompt: "Close the books for July 2025",
    icon: BookOpen,
  },
  {
    label: "Explain cash position",
    prompt: "Explain my current cash position",
    icon: Wallet,
  },
  {
    label: "Create payroll",
    prompt: "Create a new payroll run",
    icon: FileText,
  },
  {
    label: "Find duplicate expenses",
    prompt: "Scan for duplicate expenses this month",
    icon: Search,
  },
  {
    label: "Forecast next month",
    prompt: "Forecast cash flow for next month",
    icon: BarChart3,
  },
  {
    label: "Show unpaid invoices",
    prompt: "Show all unpaid invoices",
    icon: Calendar,
  },
];

export function AIChatInput({ className }: AIChatInputProps) {
  const router = useRouter();
  const [inputValue, setInputValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (value: string) => {
    const trimmed = value.trim();
    if (trimmed) {
      router.push(`/dashboard/chat?initial=${encodeURIComponent(trimmed)}`);
      setInputValue("");
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(inputValue);
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Prompt Header */}
      <p className="text-sm font-medium text-foreground">
        What would you like Xenboox to do today?
      </p>

      {/* Chat Input */}
      <div
        className={cn(
          "relative group rounded-2xl border-2 bg-card transition-all duration-300",
          isFocused
            ? "border-[#6366F1]/50 shadow-lg shadow-[#6366F1]/5"
            : "border-border/50 hover:border-border/80 hover:shadow-md",
        )}
      >
        <div className="relative flex items-center gap-3 px-4 py-3.5">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about your accounting..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-none"
          />

          <Button
            type="button"
            size="icon"
            onClick={() => handleSubmit(inputValue)}
            disabled={!inputValue.trim()}
            className={cn(
              "h-10 w-10 rounded-xl p-0 transition-all shrink-0",
              inputValue.trim()
                ? "bg-[#6366F1] hover:bg-[#6366F1]/90 text-white shadow-sm"
                : "bg-[#6366F1] text-white",
            )}
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Quick Action Pills */}
      <div className="scrollbar-hide flex items-center gap-2 overflow-x-auto py-0.5">
        {SUGGESTIONS.map((suggestion) => {
          const Icon = suggestion.icon;
          return (
            <button
              key={suggestion.label}
              type="button"
              onClick={() => handleSubmit(suggestion.prompt)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-border/50 bg-card/80 px-3 py-1.5",
                "text-xs text-muted-foreground transition-all duration-200",
                "hover:border-[#6366F1]/30 hover:text-[#6366F1] hover:bg-[#6366F1]/5 hover:shadow-sm",
                "active:scale-95",
              )}
            >
              <Icon className="h-3 w-3" />
              {suggestion.label}
            </button>
          );
        })}
        <button
          type="button"
          className="inline-flex shrink-0 items-center justify-center h-7 w-7 rounded-xl border border-border/50 bg-card/80 text-muted-foreground transition-all hover:bg-accent"
          title="Refresh suggestions"
        >
          <RefreshCw className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
