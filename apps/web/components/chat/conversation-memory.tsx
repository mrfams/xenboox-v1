/**
 * Conversation Memory — Show relevant past conversations for context.
 *
 * Features:
 * - Displays relevant past conversations
 * - Shows matched topics and excerpts
 * - Click to view full conversation
 */

"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useEntity } from "@/components/providers/entity-context";
import { Card, CardContent } from "@xenboox/ui";
import { Badge } from "@xenboox/ui";
import { Button } from "@xenboox/ui";
import {
  History,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Clock,
} from "lucide-react";
import { cn } from "@xenboox/ui";

// ─── Types ────────────────────────────────────────────────────────────────

interface RelevantConversation {
  conversation: {
    id: string;
    title: string;
    summary: string;
    topics: string[];
    messageCount: number;
    lastMessageAt: Date;
  };
  relevanceScore: number;
  matchedTopics: string[];
  excerpt: string;
}

// ─── Component ────────────────────────────────────────────────────────────

export function ConversationMemory({
  currentQuery,
  currentConversationId,
  onJumpToConversation,
}: {
  currentQuery: string;
  currentConversationId?: string;
  onJumpToConversation?: (conversationId: string) => void;
}) {
  const { entityId } = useEntity();
  const [isExpanded, setIsExpanded] = useState(false);

  // Search for relevant past conversations
  const { data: relevantConversations, isLoading } =
    trpc.chat.searchRelevantConversations.useQuery(
      {
        query: currentQuery,
        limit: 3,
        excludeConversationId: currentConversationId,
      },
      {
        enabled: !!entityId && currentQuery.length >= 5,
        staleTime: 2 * 60 * 1000, // 2 minutes
      },
    );

  // Don't show if no relevant conversations
  if (!relevantConversations || relevantConversations.length === 0) {
    return null;
  }

  return (
    <div className="mb-3">
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-3">
          {/* Header */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 w-full text-left"
          >
            <History className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium text-primary">
              {relevantConversations.length} relevant past conversation
              {relevantConversations.length !== 1 ? "s" : ""} found
            </span>
            {isExpanded ? (
              <ChevronUp className="h-3.5 w-3.5 ml-auto text-primary" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 ml-auto text-primary" />
            )}
          </button>

          {/* Expanded Content */}
          {isExpanded && (
            <div className="mt-3 space-y-2">
              {relevantConversations.map((item) => (
                <ConversationCard
                  key={item.conversation.id}
                  item={item}
                  onJump={() => onJumpToConversation?.(item.conversation.id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Conversation Card ────────────────────────────────────────────────────

function ConversationCard({
  item,
  onJump,
}: {
  item: RelevantConversation;
  onJump: () => void;
}) {
  const relevancePercent = Math.round(item.relevanceScore * 100);

  return (
    <div className="p-2 bg-background/50 rounded-lg border border-border/30">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium truncate">
              {item.conversation.title}
            </span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {relevancePercent}% match
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2">
            {item.excerpt}
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">
              {new Date(item.conversation.lastMessageAt).toLocaleDateString()}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {item.conversation.messageCount} messages
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onJump}
          className="h-6 text-xs"
        >
          View
        </Button>
      </div>

      {/* Matched Topics */}
      {item.matchedTopics.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {item.matchedTopics.slice(0, 3).map((topic) => (
            <Badge
              key={topic}
              variant="outline"
              className="text-[10px] px-1.5 py-0"
            >
              {topic}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
