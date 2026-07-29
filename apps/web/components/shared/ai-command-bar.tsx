"use client";

import React from "react";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import {
  MessageSquare,
  Mic,
  Paperclip,
  Send,
  Sparkles,
  X,
  Command,
} from "lucide-react";

interface AICommandBarProps {
  className?: string;
  compact?: boolean;
  placeholder?: string;
  suggestions?: string[];
}

const DEFAULT_SUGGESTIONS = [
  "Explain my cash position",
  "Find risky customers",
  "Prepare month-end close",
  "Create budget forecast",
];

export function AICommandBar({
  className,
  compact = false,
  placeholder = "Ask Xenboox AI...",
  suggestions = DEFAULT_SUGGESTIONS,
}: AICommandBarProps) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleSubmit = (value?: string) => {
    const text = value || query;
    if (!text.trim()) return;
    router.push(`/dashboard/chat?initial=${encodeURIComponent(text.trim())}`);
    setQuery("");
    setShowSuggestions(false);
  };

  const handleSuggestionClick = (suggestion: string) => {
    router.push(`/dashboard/chat?initial=${encodeURIComponent(suggestion)}`);
    setShowSuggestions(false);
  };

  // Keyboard shortcut: Cmd+Shift+K to focus
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (
        (e.metaKey || e.ctrlKey) &&
        e.shiftKey &&
        e.key.toLowerCase() === "k"
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  if (compact) {
    return (
      <div className={cn("relative", className)}>
        <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-1.5 shadow-sm">
          <Sparkles className="h-3.5 w-3.5 text-signal-indigo shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder={placeholder}
            className="flex-1 bg-transparent text-xs placeholder:text-muted-foreground/50 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          )}
          <button
            onClick={() => handleSubmit()}
            className={cn(
              "flex items-center justify-center rounded-md p-1 transition-colors",
              query
                ? "text-signal-indigo hover:bg-signal-indigo/10"
                : "text-muted-foreground/30",
            )}
          >
            <Send className="h-3 w-3" />
          </button>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border bg-muted px-1 py-0.5 text-[8px] text-muted-foreground">
            <Command className="h-2 w-2" />
            ⇧K
          </kbd>
        </div>

        {/* Suggestions dropdown */}
        {showSuggestions && (
          <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-lg border bg-card shadow-lg overflow-hidden">
            <div className="px-2 py-1.5 text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
              Try asking
            </div>
            {suggestions.map((s, idx) => (
              <button
                key={idx}
                onMouseDown={() => handleSuggestionClick(s)}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-left text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              >
                <Sparkles className="h-2.5 w-2.5 text-signal-indigo shrink-0" />
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Full version
  return (
    <div className={cn("relative", className)}>
      <div
        className={cn(
          "flex items-center gap-3 rounded-xl border bg-card px-4 py-3 shadow-sm transition-all duration-200",
          focused &&
            "ring-2 ring-signal-indigo/20 border-signal-indigo/30 shadow-md",
        )}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 shrink-0">
          <MessageSquare className="h-4 w-4 text-white" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            setFocused(true);
            setShowSuggestions(true);
          }}
          onBlur={() => {
            setFocused(false);
            setTimeout(() => setShowSuggestions(false), 200);
          }}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground/50 focus:outline-none"
        />
        <div className="flex items-center gap-1.5">
          <button
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent transition-colors"
            title="Voice input"
          >
            <Mic className="h-3.5 w-3.5" />
          </button>
          <button
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent transition-colors"
            title="Attach file"
          >
            <Paperclip className="h-3.5 w-3.5" />
          </button>
          {query && (
            <button
              onClick={() => setQuery("")}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            onClick={() => handleSubmit()}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
              query
                ? "bg-signal-indigo text-white hover:bg-indigo-700"
                : "bg-muted text-muted-foreground/30",
            )}
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Suggestions */}
      {showSuggestions && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-xl border bg-card shadow-lg p-2">
          <div className="px-2 py-1 text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
            Suggested
          </div>
          <div className="flex flex-wrap gap-1 mt-1">
            {suggestions.map((s, idx) => (
              <button
                key={idx}
                onMouseDown={() => handleSuggestionClick(s)}
                className="flex items-center gap-1 rounded-lg border bg-accent/30 px-2.5 py-1.5 text-[10px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              >
                <Sparkles className="h-2.5 w-2.5 text-signal-indigo shrink-0" />
                {s}
              </button>
            ))}
          </div>
          <div className="mt-1.5 border-t pt-1.5 text-[9px] text-muted-foreground/50 px-2">
            Press{" "}
            <kbd className="rounded border bg-muted px-1 py-0.5 text-[8px]">
              ⌘⇧K
            </kbd>{" "}
            to open anytime
          </div>
        </div>
      )}
    </div>
  );
}
