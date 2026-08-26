"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Square, FileText, X } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  ChatFileUpload,
  type UploadedFile,
} from "@/components/chat/chat-file-upload";

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
  entityId,
  uploadedFiles,
  onFilesUploaded,
  onRemoveFile,
  onClearFiles,
  className,
}: {
  onSubmit: (value: string, files?: UploadedFile[]) => void;
  busy?: boolean;
  onCancel?: () => void;
  placeholder?: string;
  suggestions?: string[];
  autoFocus?: boolean;
  entityId?: string;
  uploadedFiles?: UploadedFile[];
  onFilesUploaded?: (files: UploadedFile[]) => void;
  onRemoveFile?: (index: number) => void;
  onClearFiles?: () => void;
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
    const hasFiles = uploadedFiles && uploadedFiles.length > 0;
    if ((!trimmed && !hasFiles) || busy) return;
    onSubmit(
      trimmed ||
        `Shared ${uploadedFiles?.length} file${uploadedFiles?.length !== 1 ? "s" : ""}`,
      hasFiles ? uploadedFiles : undefined,
    );
    setValue("");
    onClearFiles?.();
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }
  };

  return (
    <div className={cn("w-full", className)}>
      {suggestions && suggestions.length > 0 && !value && !busy && (
        <div className="mb-1.5 flex flex-wrap gap-1">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setValue(s);
                inputRef.current?.focus();
              }}
              className="rounded-full border border-border/50 bg-card/60 px-2.5 py-0.5 text-[10px] text-muted-foreground transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Attached files — pill chips */}
      {uploadedFiles && uploadedFiles.length > 0 && (
        <div className="mb-1.5 flex flex-wrap gap-1.5">
          {uploadedFiles.map((file, idx) => (
            <div
              key={`${file.documentId}-${idx}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border/50 bg-muted/40 px-2 py-1 text-xs"
            >
              <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="max-w-[140px] truncate font-medium text-foreground">
                {file.name}
              </span>
              <button
                type="button"
                onClick={() => onRemoveFile?.(idx)}
                className="ml-1 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label={`Remove ${file.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div
        className={cn(
          "relative flex items-end gap-1.5 rounded-xl border border-border/50 bg-card px-2 py-1.5 shadow-sm transition-colors focus-within:border-primary/30",
          busy && "opacity-90",
        )}
      >
        {entityId && onFilesUploaded && (
          <ChatFileUpload
            entityId={entityId}
            onFilesUploaded={onFilesUploaded}
            disabled={busy}
          />
        )}
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
          className="max-h-36 min-h-[32px] flex-1 resize-none bg-transparent px-2 py-1 text-[13px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
        />
        {busy && onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            aria-label="Stop the agent"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive transition-colors hover:bg-destructive/20"
          >
            <Square className="h-3 w-3" />
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={!value.trim() || busy}
            aria-label="Send"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-30"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
