"use client";

import { useState, useRef, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui";
import {
  ArrowRight,
  Sparkles,
  TrendingUp,
  FileText,
  AlertTriangle,
  BarChart3,
  DollarSign,
  Users,
  Bot,
} from "lucide-react";

type AIChatInputProps = {
  className?: string;
};

type Suggestion = {
  label: string;
  prompt: string;
  icon: typeof Sparkles;
};

const SUGGESTIONS: Suggestion[] = [
  {
    label: "Forecast cash",
    prompt: "Forecast my cash flow for the next 3 months",
    icon: TrendingUp,
  },
  {
    label: "Explain profit",
    prompt: "Why is my profit lower this month compared to last?",
    icon: BarChart3,
  },
  {
    label: "Prepare VAT",
    prompt: "Prepare my VAT return for this quarter",
    icon: FileText,
  },
  {
    label: "Review expenses",
    prompt: "Review my expenses and find cost savings opportunities",
    icon: DollarSign,
  },
  {
    label: "Anomaly check",
    prompt: "Check for anomalies in recent transactions",
    icon: AlertTriangle,
  },
  {
    label: "Hire analysis",
    prompt: "Can I afford to hire two more engineers next month?",
    icon: Users,
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
      {/* Chat Input */}
      <div
        className={cn(
          "relative group rounded-2xl border-2 bg-card transition-all duration-300",
          isFocused
            ? "border-signal-indigo/50 shadow-lg shadow-signal-indigo/5"
            : "border-muted/40 hover:border-muted/60 hover:shadow-md",
        )}
      >
        {/* Gradient glow on focus */}
        <div
          className={cn(
            "absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-signal-indigo/20 via-purple-500/20 to-signal-indigo/20 opacity-0 blur-sm transition-opacity duration-500",
            isFocused && "opacity-100",
          )}
        />

        <div className="relative flex items-center gap-3 px-4 py-3.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-signal-indigo/10">
            <Sparkles className="h-4 w-4 text-signal-indigo" />
          </div>

          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={handleKeyDown}
            placeholder="Ask your AI accountant anything..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-none"
          />

          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => handleSubmit(inputValue)}
              disabled={!inputValue.trim()}
              className={cn(
                "h-8 w-8 rounded-lg p-0 transition-all",
                inputValue.trim()
                  ? "bg-signal-indigo hover:bg-signal-indigo-hover text-white shadow-sm"
                  : "bg-muted text-muted-foreground",
              )}
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Suggested Prompts */}
      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((suggestion) => {
          const Icon = suggestion.icon;
          return (
            <button
              key={suggestion.label}
              type="button"
              onClick={() => handleSubmit(suggestion.prompt)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl border bg-card/80 px-3 py-1.5",
                "text-xs text-muted-foreground transition-all duration-200",
                "hover:border-signal-indigo/30 hover:text-signal-indigo hover:bg-signal-indigo/5 hover:shadow-sm",
                "active:scale-95",
              )}
            >
              <Icon className="h-3 w-3" />
              {suggestion.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
