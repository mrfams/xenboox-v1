"use client";

import {
  useState,
  useRef,
  useEffect,
  useMemo,
  type KeyboardEvent,
} from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui";
import {
  Bot,
  User,
  Send,
  Sparkles,
  ArrowRight,
  Loader2,
  Mic,
  Paperclip,
} from "lucide-react";
import type { AIMode } from "./cfo-mode-switcher";

type Message = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  confidence?: number;
  timestamp?: Date;
};

type CFOMessageBubbleProps = {
  message: Message;
  isStreaming?: boolean;
};

type CFOSuggestedFollowupsProps = {
  followups: string[];
  onSelect: (text: string) => void;
};

type CFOConversationPanelProps = {
  mode: AIMode;
  messages: Message[];
  isStreaming: boolean;
  onSend: (message: string) => void;
  onStop?: () => void;
  suggestedFollowups?: string[];
  className?: string;
};

// ─── Message Bubble ─────────────────────────────────────────────────────

function CFOMessageBubble({ message, isStreaming }: CFOMessageBubbleProps) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";

  if (isSystem) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        <Sparkles className="h-3 w-3 text-attention-amber" />
        {message.content}
      </div>
    );
  }

  return (
    <div className={cn("flex items-start gap-3", isUser && "flex-row-reverse")}>
      {/* Avatar */}
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
          isUser
            ? "bg-muted/50 text-muted-foreground"
            : "bg-gradient-to-br from-signal-indigo to-blue-600 text-white shadow-sm",
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      {/* Content */}
      <div
        className={cn(
          "flex-1 min-w-0 max-w-[85%]",
          isUser && "flex justify-end",
        )}
      >
        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-sm leading-relaxed",
            isUser
              ? "bg-signal-indigo/10 text-foreground rounded-tr-md"
              : "bg-card border text-foreground/90 rounded-tl-md shadow-sm",
          )}
        >
          {message.content}
          {isStreaming && (
            <span className="inline-flex ml-0.5">
              <span className="h-3.5 w-1.5 bg-signal-indigo motion-safe:animate-pulse rounded-sm" />
            </span>
          )}
        </div>

        {/* Confidence */}
        {message.confidence != null && !isUser && (
          <div className="flex items-center gap-2 mt-1 px-1">
            <div className="h-1 w-12 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full",
                  message.confidence >= 0.9
                    ? "bg-balanced-green"
                    : message.confidence >= 0.7
                      ? "bg-attention-amber"
                      : "bg-error-clay",
                )}
                style={{ width: `${Math.round(message.confidence * 100)}%` }}
              />
            </div>
            <span className="text-[10px] tabular-nums text-muted-foreground/60">
              {(message.confidence * 100).toFixed(0)}% confidence
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Suggested Followups ────────────────────────────────────────────────

function CFOSuggestedFollowups({
  followups,
  onSelect,
}: CFOSuggestedFollowupsProps) {
  return (
    <div className="flex flex-wrap gap-2 pt-2">
      {followups.map((text) => (
        <button
          key={text}
          type="button"
          onClick={() => onSelect(text)}
          className="inline-flex items-center gap-1 rounded-xl border bg-card/60 px-3 py-1.5 text-xs text-muted-foreground transition-all hover:border-signal-indigo/30 hover:text-signal-indigo hover:bg-signal-indigo/5 hover:shadow-sm active:scale-95"
        >
          {text}
          <ArrowRight className="h-3 w-3" />
        </button>
      ))}
    </div>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────

function CFOEmptyState({
  mode,
  onSend,
}: {
  mode: AIMode;
  onSend: (text: string) => void;
}) {
  const modeLabel =
    mode === "cfo" ? "CFO" : mode.charAt(0).toUpperCase() + mode.slice(1);
  const greetings: Record<AIMode, string[]> = {
    cfo: [
      "Give me today's financial briefing",
      "What's my cash position?",
      "Any anomalies I should know about?",
    ],
    accountant: [
      "Show me the trial balance",
      "List outstanding invoices",
      "Prepare month-end checklist",
    ],
    analyst: [
      "Compare revenue vs last quarter",
      "Analyze expense trends",
      "Find cost reduction opportunities",
    ],
    tax: [
      "Estimate this quarter's tax",
      "Prepare VAT return",
      "What deductions am I missing?",
    ],
    auditor: [
      "Run compliance check",
      "Review recent journal entries",
      "Flag suspicious transactions",
    ],
    controller: [
      "Review close readiness",
      "Check reconciliation status",
      "Verify intercompany balances",
    ],
  };

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6 max-w-lg mx-auto">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-signal-indigo/20 to-blue-500/10 mb-5 shadow-sm">
        <Bot className="h-8 w-8 text-signal-indigo" />
      </div>
      <h2 className="text-xl font-bold text-foreground">
        Ask Your AI {modeLabel}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
        Your finance team is online and ready to help. Ask a question, request a
        report, or delegate a task.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {greetings[mode].map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => onSend(prompt)}
            className="inline-flex items-center gap-1.5 rounded-xl border bg-card/60 px-3.5 py-2 text-xs text-muted-foreground transition-all hover:border-signal-indigo/30 hover:text-signal-indigo hover:bg-signal-indigo/5 hover:shadow-sm active:scale-95"
          >
            <Sparkles className="h-3 w-3" />
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main Conversation Panel ────────────────────────────────────────────

export function CFOConversationPanel({
  mode,
  messages,
  isStreaming,
  onSend,
  onStop,
  suggestedFollowups = [],
  className,
}: CFOConversationPanelProps) {
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, suggestedFollowups]);

  // Focus input when not streaming
  useEffect(() => {
    if (!isStreaming) inputRef.current?.focus();
  }, [isStreaming]);

  const handleSubmit = (value?: string) => {
    const text = (value ?? inputValue).trim();
    if (!text || isStreaming) return;
    onSend(text);
    setInputValue("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const hasMessages = messages.length > 1; // more than just initial system message

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 lg:px-6">
        {!hasMessages ? (
          <CFOEmptyState mode={mode} onSend={onSend} />
        ) : (
          <div className="mx-auto max-w-3xl space-y-5">
            {messages.map((msg) => (
              <CFOMessageBubble
                key={msg.id}
                message={msg}
                isStreaming={
                  isStreaming &&
                  msg.id === messages[messages.length - 1]?.id &&
                  msg.role === "assistant"
                }
              />
            ))}

            {/* Suggested followups */}
            {suggestedFollowups.length > 0 && !isStreaming && (
              <CFOSuggestedFollowups
                followups={suggestedFollowups}
                onSelect={(text) => handleSubmit(text)}
              />
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="shrink-0 border-t bg-gradient-to-t from-background via-background to-transparent px-4 py-4 lg:px-6">
        <div className="mx-auto max-w-3xl">
          <div className="relative group rounded-2xl border-2 bg-card transition-all duration-300 focus-within:border-signal-indigo/50 focus-within:shadow-lg focus-within:shadow-signal-indigo/5">
            {/* Gradient glow */}
            <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-signal-indigo/20 via-purple-500/20 to-signal-indigo/20 opacity-0 blur-sm transition-opacity duration-500 focus-within:opacity-100 pointer-events-none" />

            <div className="relative flex items-center gap-2 px-4 py-3">
              <button
                type="button"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/50 transition-all"
                title="Attach file"
              >
                <Paperclip className="h-4 w-4" />
              </button>

              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  isStreaming ? "AI is thinking..." : "Ask anything..."
                }
                disabled={isStreaming}
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-none disabled:opacity-50"
              />

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/50 transition-all"
                  title="Voice input"
                >
                  <Mic className="h-4 w-4" />
                </button>

                {isStreaming && onStop ? (
                  <Button
                    type="button"
                    size="sm"
                    onClick={onStop}
                    className="h-8 w-8 rounded-lg p-0 bg-error-clay hover:bg-error-clay/90 text-white"
                    title="Stop generating"
                  >
                    <Loader2 className="h-4 w-4 motion-safe:animate-spin" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleSubmit()}
                    disabled={!inputValue.trim()}
                    className={cn(
                      "h-8 w-8 rounded-lg p-0 transition-all",
                      inputValue.trim()
                        ? "bg-signal-indigo hover:bg-signal-indigo-hover text-white shadow-sm"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          <p className="mt-1.5 text-center text-[10px] text-muted-foreground/40">
            AI can make mistakes. Verify important financial information.
          </p>
        </div>
      </div>
    </div>
  );
}
