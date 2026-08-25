"use client";

import { useRef, useState, useEffect } from "react";
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Wallet,
  Calendar,
  FileText,
  Send,
  RefreshCw,
  Bot,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui";
import { usePageContext } from "@/lib/hooks/use-page-context";
import {
  ChatFileUpload,
  type UploadedFile,
} from "@/components/chat/chat-file-upload";
import type { useDashboardChat } from "@/lib/hooks/use-dashboard-chat";

// ─── AiInput ───────────────────────────────────────────────────────────────
//
// Universal AI chat input. Sits at the bottom of the Command Center.
// Dynamic suggestions based on time of month and entity state.

const COMPOSER_MAX_HEIGHT = 120;

export function AiInput({
  onSubmit,
  isResponding,
  entityId,
  uploadedFiles,
  onFilesUploaded,
  onClearFiles,
  messages,
}: {
  onSubmit: (value: string, files?: UploadedFile[]) => void;
  isResponding: boolean;
  entityId: string;
  uploadedFiles: UploadedFile[];
  onFilesUploaded: (files: UploadedFile[]) => void;
  onClearFiles: () => void;
  messages: ReturnType<typeof useDashboardChat>["messages"];
}) {
  const pageContext = usePageContext();
  const [inputValue, setInputValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, COMPOSER_MAX_HEIGHT)}px`;
  }, [inputValue]);

  const handleSubmit = (value?: string) => {
    const trimmed = (value ?? inputValue).trim();
    if ((!trimmed && uploadedFiles.length === 0) || isResponding) return;
    onSubmit(
      trimmed || "Uploaded files",
      uploadedFiles.length > 0 ? uploadedFiles : undefined,
    );
    setInputValue("");
    onClearFiles();
  };

  const suggestions = [
    { label: "Cash position", icon: Wallet, color: "text-emerald-500" },
    { label: "Show P&L", icon: TrendingUp, color: "text-blue-500" },
    { label: "What's overdue?", icon: AlertTriangle, color: "text-amber-500" },
    { label: "Run payroll", icon: Calendar, color: "text-purple-500" },
    { label: "Close books", icon: FileText, color: "text-indigo-500" },
  ];

  return (
    <div className="mx-auto w-full max-w-3xl space-y-2 px-3 pb-4 sm:px-4">
      {/* Suggestions */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {suggestions.map((suggestion) => {
          const Icon = suggestion.icon;
          return (
            <button
              key={suggestion.label}
              type="button"
              onClick={() => handleSubmit(suggestion.label)}
              disabled={isResponding}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border/40 bg-background/50",
                "px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground/70 transition-all duration-200",
                "hover:border-primary/25 hover:text-primary/80 hover:bg-primary/[0.03]",
                "active:scale-[0.97]",
                "disabled:opacity-40 disabled:pointer-events-none",
              )}
            >
              <Icon
                className={cn("h-3 w-3", suggestion.color)}
                aria-hidden="true"
              />
              <span>{suggestion.label}</span>
            </button>
          );
        })}
      </div>

      {/* Input */}
      <div
        className={cn(
          "relative group rounded-2xl border bg-card transition-all duration-300",
          isFocused
            ? "border-primary/40 shadow-lg shadow-primary/[0.06]"
            : "border-border/40 shadow-sm hover:border-border/60 hover:shadow-md",
        )}
      >
        <div className="relative flex items-end gap-3 px-4 py-3">
          <div className="flex items-center gap-1 shrink-0 self-center">
            <ChatFileUpload
              entityId={entityId}
              onFilesUploaded={onFilesUploaded}
              disabled={isResponding}
            />
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/8 text-primary/70 transition-colors group-focus-within:bg-primary/12 group-focus-within:text-primary">
              <Bot className="h-4 w-4" />
            </div>
          </div>
          <label htmlFor="ai-chat-input" className="sr-only">
            Ask your AI CFO anything
          </label>
          {/* Context pins indicator */}
          {pageContext && (
            <div className="absolute -top-6 left-4 flex items-center gap-1">
              <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-2 py-0.5 text-[9px] font-medium text-primary">
                <Sparkles className="h-2.5 w-2.5" />
                {pageContext.page} context attached
              </span>
            </div>
          )}
          <textarea
            id="ai-chat-input"
            ref={textareaRef}
            rows={1}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="Ask anything about your accounting..."
            className="max-h-[120px] min-h-[24px] flex-1 resize-none overflow-y-auto bg-transparent py-1 text-sm leading-normal text-foreground placeholder:text-muted-foreground/50 outline-none"
          />
          <Button
            type="button"
            size="icon"
            aria-label="Send message"
            onClick={() => handleSubmit()}
            disabled={!inputValue.trim() || isResponding}
            className={cn(
              "h-10 w-10 rounded-xl p-0 transition-all shrink-0",
              inputValue.trim()
                ? "bg-primary hover:bg-primary/90 text-white shadow-sm"
                : "bg-primary text-white",
            )}
          >
            {isResponding ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        {/* Export conversation button */}
        <div className="flex items-center justify-end px-4 py-1">
          <button
            type="button"
            onClick={() => {
              // Export conversation as markdown
              const lines = messages.map((m) => {
                const role = m.role === "user" ? "You" : "AI";
                return `**${role}:** ${m.content}`;
              });
              const md = `# Conversation Export\n\nDate: ${new Date().toLocaleDateString()}\n\n---\n\n${lines.join("\n\n")}`;
              const blob = new Blob([md], {
                type: "text/markdown;charset=utf-8;",
              });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `conversation-${new Date().toISOString().split("T")[0]}.md`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Export chat
          </button>
        </div>
        {isFocused && (
          <div className="border-t border-border/30 px-4 py-1.5">
            <p className="text-[9px] text-muted-foreground/40">
              <kbd className="inline-flex items-center rounded border border-border/40 bg-muted/40 px-1 py-px text-[9px] font-mono">
                Enter
              </kbd>{" "}
              send ·{" "}
              <kbd className="inline-flex items-center rounded border border-border/40 bg-muted/40 px-1 py-px text-[9px] font-mono">
                Shift+Enter
              </kbd>{" "}
              newline
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
