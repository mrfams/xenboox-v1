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
  X,
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
  onStop,
  entityId,
  uploadedFiles,
  onFilesUploaded,
  onClearFiles,
  onRemoveFile,
  messages,
}: {
  onSubmit: (value: string, files?: UploadedFile[]) => void;
  isResponding: boolean;
  onStop?: () => void;
  entityId: string;
  uploadedFiles: UploadedFile[];
  onFilesUploaded: (files: UploadedFile[]) => void;
  onClearFiles: () => void;
  onRemoveFile?: (index: number) => void;
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
      trimmed ||
        `Shared ${uploadedFiles.length} file${uploadedFiles.length !== 1 ? "s" : ""}`,
      uploadedFiles.length > 0 ? uploadedFiles : undefined,
    );
    setInputValue("");
    onClearFiles();
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const suggestions = [
    { label: "Cash position", icon: Wallet, color: "text-balanced-green" },
    { label: "Show P&L", icon: TrendingUp, color: "text-primary" },
    {
      label: "What's overdue?",
      icon: AlertTriangle,
      color: "text-attention-amber",
    },
    { label: "Run payroll", icon: Calendar, color: "text-signal-indigo" },
    { label: "Close books", icon: FileText, color: "text-signal-indigo" },
  ];

  const handleRemoveFile = (index: number) => {
    if (onRemoveFile) onRemoveFile(index);
    else {
      // fallback: clear all if no per-file handler
      onClearFiles();
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-2 px-3 pb-3 sm:px-4">
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
                "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border/40 bg-background/50",
                "px-2.5 py-1 text-[11px] font-medium text-muted-foreground/70 transition-all duration-200",
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

      {/* Attached files — ChatGPT/Claude style chips */}
      {uploadedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {uploadedFiles.map((file, index) => (
            <div
              key={`${file.documentId}-${index}`}
              className="group inline-flex items-center gap-2 rounded-lg border border-border/50 bg-muted/40 px-2.5 py-1.5 text-xs"
            >
              <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="max-w-[140px] truncate font-medium text-foreground">
                {file.name}
              </span>
              <button
                type="button"
                onClick={() => handleRemoveFile(index)}
                className="ml-1 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                aria-label={`Remove ${file.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <div
        className={cn(
          "relative group rounded-2xl border transition-all duration-200",
          isFocused
            ? "border-primary/50 bg-card shadow-xl shadow-primary/[0.04] ring-2 ring-primary/15"
            : "border-border/60 bg-muted/30 shadow-lg shadow-black/[0.06]",
        )}
      >
        <div className="relative flex items-center gap-2.5 px-4 py-2.5">
          <div className="flex items-center shrink-0 self-center">
            <ChatFileUpload
              entityId={entityId}
              onFilesUploaded={onFilesUploaded}
              disabled={isResponding}
            />
          </div>
          <label htmlFor="ai-chat-input" className="sr-only">
            Ask your AI CFO anything
          </label>
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
            className="max-h-[120px] min-h-[48px] flex-1 resize-none overflow-y-auto bg-transparent px-1 pt-[15px] pb-[11px] text-[15px] leading-5 text-foreground placeholder:text-muted-foreground/50 outline-none"
          />
          <Button
            type="button"
            size="icon"
            aria-label={isResponding ? "Stop generation" : "Send message"}
            onClick={() => {
              if (isResponding && onStop) {
                onStop();
              } else {
                handleSubmit();
              }
            }}
            disabled={
              !isResponding && !inputValue.trim() && uploadedFiles.length === 0
            }
            className={cn(
              "h-9 w-9 rounded-xl p-0 transition-all shrink-0 shadow-sm",
              isResponding
                ? "bg-error-clay hover:bg-error-clay/90 text-white"
                : inputValue.trim() || uploadedFiles.length > 0
                  ? "bg-primary hover:bg-primary/90 text-white shadow"
                  : "bg-muted/80 text-muted-foreground/70",
            )}
          >
            {isResponding ? (
              <span className="h-3 w-3 rounded-sm bg-white" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
