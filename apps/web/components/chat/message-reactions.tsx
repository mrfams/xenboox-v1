/**
 * Message Reactions — React to chat messages with emoji and thumbs.
 *
 * Features:
 * - Thumbs up/down quick reactions
 * - Emoji picker with common reactions
 * - Reaction counts
 * - Toggle reactions on/off
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
  ThumbsUp,
  ThumbsDown,
  SmilePlus,
  Heart,
  Lightbulb,
  CheckCircle,
  AlertCircle,
  Star,
} from "lucide-react";
import { cn } from "@xenboox/ui";

// ─── Types ────────────────────────────────────────────────────────────────

export interface Reaction {
  emoji: string;
  count: number;
  userReacted: boolean;
}

export interface MessageReactionsProps {
  /** Current reactions on the message */
  reactions: Reaction[];
  /** Callback when a reaction is toggled */
  onReact: (emoji: string) => void;
  /** Whether the current user is the message author (can see who reacted) */
  isAuthor?: boolean;
}

// ─── Common Emoji Reactions ───────────────────────────────────────────────

const QUICK_REACTIONS = [
  { emoji: "👍", label: "Thumbs up", icon: ThumbsUp },
  { emoji: "👎", label: "Thumbs down", icon: ThumbsDown },
  { emoji: "❤️", label: "Heart", icon: Heart },
  { emoji: "💡", label: "Idea", icon: Lightbulb },
  { emoji: "✅", label: "Done", icon: CheckCircle },
  { emoji: "⚠️", label: "Warning", icon: AlertCircle },
  { emoji: "⭐", label: "Star", icon: Star },
];

const EMOJI_PICKER_REACTIONS = [
  "👍",
  "👎",
  "❤️",
  "🔥",
  "🎉",
  "💯",
  "✅",
  "❌",
  "⚠️",
  "💡",
  "🚀",
  "👀",
  "🙏",
  "👏",
  "😊",
  "🤔",
  "💪",
  "📌",
  "⭐",
  "🎯",
];

// ─── Component ────────────────────────────────────────────────────────────

export function MessageReactions({
  reactions,
  onReact,
  isAuthor = false,
}: MessageReactionsProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Toggle emoji picker
  const toggleEmojiPicker = useCallback(() => {
    setShowEmojiPicker((prev) => !prev);
  }, []);

  // Handle emoji selection from picker
  const handleEmojiSelect = useCallback(
    (emoji: string) => {
      onReact(emoji);
      setShowEmojiPicker(false);
    },
    [onReact],
  );

  // Get existing reactions (non-zero count)
  const existingReactions = reactions.filter((r) => r.count > 0);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-1 flex-wrap">
        {/* Existing Reactions */}
        {existingReactions.map((reaction) => (
          <Tooltip key={reaction.emoji}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => onReact(reaction.emoji)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs transition-colors",
                  reaction.userReacted
                    ? "bg-primary/20 border border-primary/30 text-primary"
                    : "bg-muted border border-border/50 text-muted-foreground hover:bg-muted/80",
                )}
                aria-label={`${reaction.emoji} ${reaction.count} reactions`}
              >
                <span>{reaction.emoji}</span>
                <span className="font-medium">{reaction.count}</span>
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {reaction.count} reaction{reaction.count !== 1 ? "s" : ""}
              </p>
            </TooltipContent>
          </Tooltip>
        ))}

        {/* Add Reaction Button */}
        <div className="relative">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleEmojiPicker}
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Add reaction"
              >
                <SmilePlus className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Add reaction</p>
            </TooltipContent>
          </Tooltip>

          {/* Emoji Picker Dropdown */}
          {showEmojiPicker && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowEmojiPicker(false)}
              />
              <div className="absolute left-0 top-full mt-1 z-50 bg-background border border-border rounded-lg shadow-lg p-2">
                <div className="grid grid-cols-5 gap-1">
                  {EMOJI_PICKER_REACTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => handleEmojiSelect(emoji)}
                      className="h-8 w-8 flex items-center justify-center rounded hover:bg-muted transition-colors text-lg"
                      aria-label={`React with ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

// ─── Quick Reactions Bar (for hover) ──────────────────────────────────────

export function QuickReactionsBar({
  onReact,
}: {
  onReact: (emoji: string) => void;
}) {
  return (
    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
      {QUICK_REACTIONS.slice(0, 3).map((reaction) => {
        const Icon = reaction.icon;
        return (
          <Tooltip key={reaction.emoji}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onReact(reaction.emoji)}
                className="h-6 w-6 p-0"
                aria-label={reaction.label}
              >
                <Icon className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{reaction.label}</p>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
