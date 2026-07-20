"use client";

import { useState, useRef, useCallback, type KeyboardEvent } from "react";
import { Send, Paperclip, X } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { cn } from "@/lib/utils";

type PendingAttachment = {
  file: File;
  preview?: string;
};

type SuggestedPrompt = {
  text: string;
  icon?: React.ElementType;
};

type ChatInputProps = {
  onSend: (message: string, attachments?: File[]) => void;
  disabled?: boolean;
  placeholder?: string;
  suggestions?: SuggestedPrompt[];
  className?: string;
};

const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/tiff",
  "image/webp",
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ChatInput({
  onSend,
  disabled = false,
  placeholder = "Ask your AI accountant anything...",
  suggestions,
  className,
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<
    PendingAttachment[]
  >([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if ((!trimmed && pendingAttachments.length === 0) || disabled) return;

    const files = pendingAttachments.map((a) => a.file);
    onSend(trimmed || "Attached files", files.length > 0 ? files : undefined);

    // Clean up previews
    pendingAttachments.forEach((a) => {
      if (a.preview) URL.revokeObjectURL(a.preview);
    });

    setValue("");
    setPendingAttachments([]);
    inputRef.current?.focus();
  }, [value, disabled, onSend, pendingAttachments]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const validFiles = files.filter((f) => ALLOWED_TYPES.includes(f.type));

    const newAttachments: PendingAttachment[] = validFiles.map((file) => ({
      file,
      preview: file.type.startsWith("image/")
        ? URL.createObjectURL(file)
        : undefined,
    }));

    setPendingAttachments((prev) => [...prev, ...newAttachments]);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeAttachment = (index: number) => {
    setPendingAttachments((prev) => {
      const removed = prev[index];
      if (removed?.preview) URL.revokeObjectURL(removed.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {/* Suggested Prompts */}
      {suggestions && suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map((suggestion) => {
            const Icon = suggestion.icon;
            return (
              <button
                key={suggestion.text}
                type="button"
                onClick={() => onSend(suggestion.text)}
                disabled={disabled}
                className="inline-flex items-center gap-1.5 rounded-lg border bg-background/80 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground disabled:opacity-50"
              >
                {Icon && <Icon className="h-3 w-3" />}
                {suggestion.text}
              </button>
            );
          })}
        </div>
      )}

      {/* Pending Attachments */}
      {pendingAttachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {pendingAttachments.map((att, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-xs"
            >
              {att.preview ? (
                <img
                  src={att.preview}
                  alt={att.file.name}
                  className="h-8 w-8 rounded object-cover"
                />
              ) : (
                <Paperclip className="h-4 w-4 text-muted-foreground" />
              )}
              <div className="flex flex-col">
                <span className="font-medium">{att.file.name}</span>
                <span className="text-muted-foreground">
                  {formatFileSize(att.file.size)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => removeAttachment(i)}
                className="ml-1 rounded-full p-0.5 hover:bg-muted"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input Row */}
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_TYPES.join(",")}
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        <Button
          variant="outline"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="shrink-0"
          title="Attach file"
        >
          <Paperclip className="h-4 w-4" />
        </Button>
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1"
          autoComplete="off"
        />
        <Button
          onClick={handleSend}
          disabled={
            disabled || (!value.trim() && pendingAttachments.length === 0)
          }
          size="icon"
          className="shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
