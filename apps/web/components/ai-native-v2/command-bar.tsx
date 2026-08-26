"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Command, Square } from "lucide-react";

import { cn } from "@/lib/utils";

// ─── CommandBar ───────────────────────────────────────────────────────────
//
// The single input that drives everything: natural language in, agent work
// out. Suggestion chips are intent previews — what the agent will do, not
// marketing copy.

export function CommandBar({
  onSubmit,
  busy,
  onCancel,
  placeholder = "Tell your finance team what to do…",
  suggestions,
  autoFocus,
  className,
}: {
  onSubmit: (value: string) => void;
  busy?: boolean;
  onCancel?: () => void;
  placeholder?: string;
  suggestions?: string[];
  autoFocus?: boolean;
  className?: string;
}) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // ⌘K / Ctrl+K focuses the bar from anywhere on the surface.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed || busy) return;
    onSubmit(trimmed);
    setValue("");
  };

  return (
    <div className={cn("w-full", className)}>
      {suggestions && suggestions.length > 0 && !value && !busy && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setValue(s);
                inputRef.current?.focus();
              }}
              className="rounded-full border border-border/50 bg-card/60 px-3 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div
        className={cn(
          "relative flex items-end gap-2 rounded-xl border border-border/60 bg-card p-2 shadow-sm transition-colors focus-within:border-primary/40",
          busy && "opacity-90",
        )}
      >
        <label htmlFor="v2-command-input" className="sr-only">
          Ask your finance team
        </label>
        <textarea
          id="v2-command-input"
          ref={inputRef}
          rows={1}
          value={value}
          autoFocus={autoFocus}
          disabled={busy && !onCancel}
          onChange={(e) => {
            setValue(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={placeholder}
          className="max-h-40 min-h-[36px] flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
        />
        {busy && onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            aria-label="Stop the agent"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive transition-colors hover:bg-destructive/20"
          >
            <Square className="h-3.5 w-3.5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={!value.trim() || busy}
            aria-label="Send"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-30"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        )}
      </div>

      <p className="mt-1.5 hidden items-center gap-1 px-1 text-[10px] text-muted-foreground/50 sm:flex">
        <kbd className="inline-flex items-center gap-0.5 rounded border border-border/50 bg-muted/40 px-1 py-px font-mono text-[9px]">
          <Command className="h-2.5 w-2.5" aria-hidden="true" />K
        </kbd>
        focus · Enter send · Shift+Enter newline
      </p>
    </div>
  );
}
