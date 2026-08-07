"use client";

import React from "react";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  MessageSquare,
  Mic,
  Paperclip,
  Send,
  Sparkles,
  X,
  Command,
  LayoutDashboard,
  BookOpen,
  Landmark,
  Receipt,
  CreditCard,
  Users,
  BarChart3,
  Activity,
  Settings,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { filterNavPages, type NavPage } from "@/lib/nav";

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

const GROUP_ICONS: Record<string, LucideIcon> = {
  Overview: LayoutDashboard,
  Accounting: BookOpen,
  "Banking & Cash": Landmark,
  Sales: Receipt,
  Purchasing: CreditCard,
  "People & Pay": Users,
  Reporting: BarChart3,
  Automation: Activity,
  Settings,
};

export function AICommandBar({
  className,
  compact = false,
  placeholder = "Ask Xenboox AI...",
  suggestions = DEFAULT_SUGGESTIONS,
}: AICommandBarProps) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
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

  // Keyboard shortcut: Cmd+K / Ctrl+K to focus and open
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setShowSuggestions(true);
        setFocused(true);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  if (compact) {
    const pages = filterNavPages(query);
    const trimmedQuery = query.trim();
    const actions: Array<
      { kind: "page"; page: NavPage } | { kind: "chat"; query: string }
    > = [
      ...pages.map((page) => ({ kind: "page" as const, page })),
      ...(trimmedQuery ? [{ kind: "chat" as const, query: trimmedQuery }] : []),
    ];

    const selectAction = (action: (typeof actions)[number]) => {
      if (action.kind === "page") {
        router.push(action.page.href);
      } else {
        router.push(
          `/dashboard/chat?initial=${encodeURIComponent(action.query)}`,
        );
      }
      setQuery("");
      setShowSuggestions(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % Math.max(actions.length, 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex(
          (i) =>
            (i - 1 + Math.max(actions.length, 1)) % Math.max(actions.length, 1),
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (actions.length > 0) {
          selectAction(actions[activeIndex % actions.length]);
        } else {
          handleSubmit();
        }
      } else if (e.key === "Escape") {
        setShowSuggestions(false);
        inputRef.current?.blur();
      }
    };

    return (
      <div className={cn("relative", className)}>
        <div className="flex h-12 items-center gap-2 rounded-xl border border-border/60 bg-card pl-2 pr-2.5 shadow-sm transition-all duration-200 focus-within:border-primary/50 focus-within:shadow-[0_0_0_3px_rgba(99,102,241,0.12)]">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-signal-indigo/10">
            <Sparkles className="h-4 w-4 text-signal-indigo" />
          </span>
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded={showSuggestions}
            aria-controls="ai-command-palette"
            aria-label="Search or jump to a page"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <span className="hidden sm:block h-4 w-px bg-border" />
          <kbd className="hidden sm:inline-flex items-center gap-1 rounded-md border border-border/70 bg-muted/40 px-1.5 py-1 text-[10px] font-medium text-muted-foreground">
            <Command className="h-3 w-3" />
            <span>K</span>
          </kbd>
        </div>

        {/* Dropdown */}
        {showSuggestions && (
          <div
            id="ai-command-palette"
            className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-xl border bg-card shadow-lg shadow-black/5 overflow-hidden py-1 max-h-[min(24rem,60vh)]"
          >
            {trimmedQuery ? (
              actions.length === 0 ? (
                <div className="px-3 py-2 text-xs text-muted-foreground">
                  No matching pages. Press Enter to ask Xenboox AI.
                </div>
              ) : (
                <div>
                  <div className="px-3 pt-2 pb-1 text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                    Go to
                  </div>
                  {actions.map((action, idx) => {
                    const Icon =
                      action.kind === "page"
                        ? (GROUP_ICONS[action.page.group] ?? LayoutDashboard)
                        : Sparkles;
                    return (
                      <button
                        key={
                          action.kind === "page"
                            ? action.page.href
                            : "chat-fallback"
                        }
                        onMouseDown={() => selectAction(action)}
                        onMouseEnter={() => setActiveIndex(idx)}
                        className={cn(
                          "flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors",
                          idx === activeIndex
                            ? "bg-accent text-foreground"
                            : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                        )}
                      >
                        <Icon className="h-3.5 w-3.5 text-signal-indigo shrink-0" />
                        <span className="flex-1 truncate">
                          {action.kind === "page"
                            ? action.page.label
                            : `Ask Xenboox: "${action.query}"`}
                        </span>
                        {action.kind === "page" && (
                          <span className="text-[9px] text-muted-foreground/60">
                            {action.page.group}
                          </span>
                        )}
                        {idx === activeIndex && (
                          <span className="text-[9px] text-muted-foreground">
                            ↵
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )
            ) : (
              <div>
                <div className="px-3 pt-2 pb-1 text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                  Try asking
                </div>
                {suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    onMouseDown={() => handleSuggestionClick(s)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-signal-indigo shrink-0" />
                    {s}
                  </button>
                ))}
              </div>
            )}
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
              ⌘K
            </kbd>{" "}
            to open anytime
          </div>
        </div>
      )}
    </div>
  );
}
