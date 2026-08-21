"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Bot, Loader2, Send, Sparkles, X, ArrowRight } from "lucide-react";

import { useEntity } from "@/lib/entity-context";
import { cn } from "@/lib/utils";

interface HelpMessage {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "How do I create an invoice?",
  "How do I reconcile my bank account?",
  "How do I run payroll?",
  "How do I set up automation for recurring bills?",
];

// ─── In-app Help Assistant ────────────────────────────────────────────────
// A product-aware "how do I…" guide. Streams guided answers from /api/help/assist
// (entity-scoped, rate-limited, grounded in the help topic catalog). Stays
// self-contained on the Help Center page — the full agent pipeline lives in
// the AI Command Center (/dashboard/chat).
export function HelpAssistant() {
  const { entityId } = useEntity();
  const [messages, setMessages] = useState<HelpMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamed, setStreamed] = useState("");
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const ask = async (question: string) => {
    const q = question.trim();
    if (!q || isStreaming) return;

    setMessages((prev) => [...prev, { role: "user", content: q }]);
    setInput("");
    setError(null);
    setStreamed("");
    setIsStreaming(true);

    try {
      abortRef.current = new AbortController();
      const res = await fetch("/api/help/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, entityId }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          body?.error ?? "Couldn't reach the help assistant right now.",
        );
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let full = "";
      let assistantReply = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.event === "token" && data.content) {
              full += data.content;
              assistantReply = full;
              setStreamed(full);
            } else if (data.event === "error") {
              throw new Error(data.message);
            }
          } catch {
            // skip malformed lines
          }
        }
      }

      if (assistantReply.trim()) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: assistantReply },
        ]);
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setIsStreaming(false);
      setStreamed("");
      abortRef.current = null;
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 text-white">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Help Assistant
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Ask “how do I…” — get guided steps
            </p>
          </div>
        </div>
        <Sparkles className="h-4 w-4 text-indigo-500" />
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 && !streamed && (
          <div className="space-y-4">
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 dark:border-indigo-500/20 dark:bg-indigo-500/5">
              <p className="text-sm text-slate-700 dark:text-slate-300">
                Hi! I know Xenboox inside-out. Ask me how to do anything — like
                creating an invoice, running payroll, or reconciling your bank
                account.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => ask(s)}
                  disabled={isStreaming}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-indigo-700 dark:hover:text-indigo-400"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={cn(
              "max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed",
              m.role === "user"
                ? "ml-auto bg-indigo-600 text-white"
                : "border border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300",
            )}
          >
            {m.role === "assistant" ? (
              <div className="space-y-2">
                <div className="whitespace-pre-wrap">{m.content}</div>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  Ask the CFO agent for deeper help
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            ) : (
              m.content
            )}
          </div>
        ))}

        {streamed && (
          <div className="max-w-[85%] rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm leading-relaxed text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            <div className="mb-1.5 flex items-center gap-1.5 text-[11px] text-slate-400">
              <Loader2 className="h-3 w-3 animate-spin" />
              Help Assistant is typing…
            </div>
            <div className="whitespace-pre-wrap">{streamed}</div>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-2 inline-flex items-center gap-0.5 text-xs underline"
            >
              Dismiss <X className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-slate-200 p-3 dark:border-slate-800">
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:focus-within:border-indigo-600 dark:focus-within:ring-indigo-500/20">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void ask(input);
              }
            }}
            placeholder="Ask how to do something…"
            className="flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100"
          />
          <button
            onClick={() => void ask(input)}
            disabled={!input.trim() || isStreaming}
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white transition-colors hover:bg-indigo-700 disabled:opacity-40"
            aria-label="Ask the help assistant"
          >
            {isStreaming ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
        <p className="mt-1.5 text-center text-[10px] text-slate-400 dark:text-slate-500">
          Product-aware guidance grounded in the Help Center. For your actual
          books, use the AI Command Center.
        </p>
      </div>
    </div>
  );
}
