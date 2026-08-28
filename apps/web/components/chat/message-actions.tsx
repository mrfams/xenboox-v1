/**
 * Message Actions — Hover actions for chat messages.
 *
 * Features:
 * - Copy message content to clipboard
 * - Share message via link or download
 * - Regenerate assistant response
 * - Pin/unpin important messages
 */

"use client";

import { useState, useCallback } from "react";
import { Button } from "@xenboox/ui";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@xenboox/ui";
import {
  Copy,
  Check,
  Share2,
  RefreshCw,
  Pin,
  PinOff,
  Download,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@xenboox/ui";

// ─── Types ────────────────────────────────────────────────────────────────

export interface MessageActionsProps {
  /** The message content to copy/share */
  content: string;
  /** Message ID for pinning */
  messageId: string;
  /** Message role for conditional actions */
  role: "user" | "assistant";
  /** Whether the message is pinned */
  isPinned?: boolean;
  /** Callback when pin/unpin is clicked */
  onPin?: (messageId: string) => void;
  /** Callback when regenerate is clicked (assistant messages only) */
  onRegenerate?: (messageId: string) => void;
  /** Whether regeneration is in progress */
  isRegenerating?: boolean;
  /** Optional metadata for sharing */
  metadata?: {
    sender?: string;
    timestamp?: Date;
    conversationId?: string;
  };
  /** Optional className override */
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────

export function MessageActions({
  content,
  messageId,
  role,
  isPinned = false,
  onPin,
  onRegenerate,
  isRegenerating = false,
  metadata,
  className,
}: MessageActionsProps) {
  const [copied, setCopied] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);

  // Copy to clipboard
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  }, [content]);

  // Share via download as text file
  const handleShareDownload = useCallback(() => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `message-${messageId.slice(0, 8)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowShareMenu(false);
  }, [content, messageId]);

  // Share via clipboard (for pasting into email, etc.)
  const handleShareClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
      setShowShareMenu(false);
    } catch (error) {
      console.error("Failed to share:", error);
    }
  }, [content]);

  // Pin/unpin message
  const handlePin = useCallback(() => {
    onPin?.(messageId);
  }, [messageId, onPin]);

  // Regenerate response
  const handleRegenerate = useCallback(() => {
    onRegenerate?.(messageId);
  }, [messageId, onRegenerate]);

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className={cn(
          "mt-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity",
          className,
        )}
        role="toolbar"
        aria-label="Message actions"
      >
        {/* Copy */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-6 w-6 p-0"
              aria-label={copied ? "Copied" : "Copy message"}
            >
              {copied ? (
                <Check className="h-3 w-3 text-green-500" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{copied ? "Copied!" : "Copy"}</p>
          </TooltipContent>
        </Tooltip>

        {/* Share */}
        <div className="relative">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowShareMenu(!showShareMenu)}
                className="h-6 w-6 p-0"
                aria-label="Share message"
              >
                <Share2 className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Share</p>
            </TooltipContent>
          </Tooltip>

          {/* Share Dropdown */}
          {showShareMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowShareMenu(false)}
              />
              <div className="absolute right-0 top-full mt-1 z-50 bg-background border border-border rounded-lg shadow-lg py-1 min-w-[160px]">
                <button
                  type="button"
                  onClick={handleShareClipboard}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent transition-colors"
                >
                  <Copy className="h-4 w-4" />
                  Copy to clipboard
                </button>
                <button
                  type="button"
                  onClick={handleShareDownload}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Download as text
                </button>
              </div>
            </>
          )}
        </div>

        {/* Regenerate (assistant messages only) */}
        {role === "assistant" && onRegenerate && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRegenerate}
                disabled={isRegenerating}
                className="h-6 w-6 p-0"
                aria-label="Regenerate response"
              >
                <RefreshCw
                  className={cn("h-3 w-3", isRegenerating && "animate-spin")}
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isRegenerating ? "Regenerating..." : "Regenerate"}</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Pin/Unpin */}
        {onPin && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePin}
                className={cn(
                  "h-6 w-6 p-0",
                  isPinned && "text-amber-500 hover:text-amber-600",
                )}
                aria-label={isPinned ? "Unpin message" : "Pin message"}
              >
                {isPinned ? (
                  <PinOff className="h-3 w-3" />
                ) : (
                  <Pin className="h-3 w-3" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isPinned ? "Unpin" : "Pin"}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}

// ─── Pinned Messages Panel ────────────────────────────────────────────────

export interface PinnedMessage {
  id: string;
  content: string;
  role: "user" | "assistant";
  pinnedAt: Date;
  sender?: string;
}

export function PinnedMessagesPanel({
  messages,
  onUnpin,
  onJumpTo,
}: {
  messages: PinnedMessage[];
  onUnpin: (messageId: string) => void;
  onJumpTo: (messageId: string) => void;
}) {
  if (messages.length === 0) {
    return null;
  }

  return (
    <div className="border-b bg-muted/30">
      <div className="px-4 py-2">
        <div className="flex items-center gap-2 mb-2">
          <Pin className="h-3.5 w-3.5 text-amber-500" />
          <span className="text-xs font-medium text-muted-foreground">
            Pinned Messages ({messages.length})
          </span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className="flex-shrink-0 max-w-[200px] p-2 bg-background border border-border/50 rounded-lg cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => onJumpTo(msg.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  onJumpTo(msg.id);
                }
              }}
            >
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-[10px] text-muted-foreground truncate">
                  {msg.sender ?? (msg.role === "assistant" ? "AI" : "You")}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onUnpin(msg.id);
                  }}
                  className="h-4 w-4 p-0 opacity-50 hover:opacity-100"
                  aria-label="Unpin message"
                >
                  <PinOff className="h-2.5 w-2.5" />
                </Button>
              </div>
              <p className="text-xs text-foreground line-clamp-2">
                {msg.content}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
