"use client";

import { useState, useMemo } from "react";
import {
  MessageSquare,
  Plus,
  Search,
  Trash2,
  Clock,
  X,
  ChevronLeft,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";

// ─── Conversation Sidebar ──────────────────────────────────────────────────
//
// Shows recent conversations in the Command Center.
// Users can search, switch, delete, and start new conversations.

function formatTimeAgo(date: Date | string): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return then.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function ConversationSidebar({
  isOpen,
  onClose,
  currentConversationId,
  onSelectConversation,
  onNewChat,
}: {
  isOpen: boolean;
  onClose: () => void;
  currentConversationId: string | null;
  onSelectConversation: (id: string, title?: string | null) => void;
  onNewChat: () => void;
}) {
  const [search, setSearch] = useState("");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { data: conversations, isLoading } =
    trpc.chat.listConversations.useQuery(undefined, { enabled: isOpen });

  const deleteConversation = trpc.chat.deleteConversation.useMutation({
    onSuccess: () => {
      // Refetch conversations
    },
  });

  // Filter conversations by search
  const filteredConversations = useMemo(() => {
    if (!conversations) return [];
    if (!search.trim()) return conversations;
    const q = search.toLowerCase();
    return conversations.filter(
      (c) =>
        c.title?.toLowerCase().includes(q) ||
        c.summary?.toLowerCase().includes(q),
    );
  }, [conversations, search]);

  // Group conversations by date
  const groupedConversations = useMemo(() => {
    const now = new Date();
    const today: typeof filteredConversations = [];
    const yesterday: typeof filteredConversations = [];
    const thisWeek: typeof filteredConversations = [];
    const older: typeof filteredConversations = [];

    for (const conv of filteredConversations) {
      const date = new Date(conv.lastMessageAt ?? conv.createdAt);
      const diffDays = Math.floor(
        (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (diffDays === 0) today.push(conv);
      else if (diffDays === 1) yesterday.push(conv);
      else if (diffDays < 7) thisWeek.push(conv);
      else older.push(conv);
    }

    return [
      { label: "Today", items: today },
      { label: "Yesterday", items: yesterday },
      { label: "This Week", items: thisWeek },
      { label: "Older", items: older },
    ].filter((g) => g.items.length > 0);
  }, [filteredConversations]);

  const handleDelete = async (id: string) => {
    try {
      await deleteConversation.mutateAsync({ conversationId: id });
    } catch {
      // Silently fail — conversation may already be deleted
    } finally {
      setDeleteConfirmId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="flex h-full w-72 flex-col border-r border-border bg-card"
        role="complementary"
        aria-label="Conversations"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">
            Conversations
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            aria-label="Close sidebar"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="px-3 pt-3">
          <button
            type="button"
            onClick={onNewChat}
            className="flex w-full items-center gap-2 rounded-lg border border-dashed border-border/60 bg-background/50 px-3 py-2.5 text-xs font-medium text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/[0.02] transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            New Chat
          </button>
        </div>

        {/* Search */}
        <div className="px-3 pt-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations..."
              className="w-full rounded-lg border border-border/50 bg-background pl-8 pr-8 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/10"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <MessageSquare className="h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="text-xs text-muted-foreground">
                {search ? "No matching conversations" : "No conversations yet"}
              </p>
              {!search && (
                <button
                  type="button"
                  onClick={onNewChat}
                  className="mt-2 text-xs text-primary hover:text-primary/80"
                >
                  Start your first chat
                </button>
              )}
            </div>
          ) : (
            groupedConversations.map((group) => (
              <div key={group.label} className="mb-3">
                <p className="px-2 py-1 text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {group.items.map((conv) => {
                    const isActive = conv.id === currentConversationId;
                    const isHovered = conv.id === hoveredId;

                    return (
                      <button
                        key={conv.id}
                        type="button"
                        onClick={() =>
                          onSelectConversation(conv.id, conv.title)
                        }
                        onMouseEnter={() => setHoveredId(conv.id)}
                        onMouseLeave={() => setHoveredId(null)}
                        className={cn(
                          "flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left transition-colors",
                          isActive
                            ? "bg-primary/10 text-primary"
                            : "text-foreground hover:bg-muted/50",
                        )}
                      >
                        <MessageSquare
                          className={cn(
                            "h-4 w-4 shrink-0 mt-0.5",
                            isActive
                              ? "text-primary"
                              : "text-muted-foreground/40",
                          )}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">
                            {conv.title || "Untitled conversation"}
                          </p>
                          {conv.summary && (
                            <p className="text-[10px] text-muted-foreground/60 truncate mt-0.5">
                              {conv.summary}
                            </p>
                          )}
                          <div className="flex items-center gap-1 mt-1">
                            <Clock className="h-2.5 w-2.5 text-muted-foreground/40" />
                            <span className="text-[9px] text-muted-foreground/40">
                              {formatTimeAgo(
                                conv.lastMessageAt ?? conv.createdAt,
                              )}
                            </span>
                          </div>
                        </div>
                        {/* Delete button — shown on hover */}
                        {isHovered && !isActive && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirmId(conv.id);
                            }}
                            className="shrink-0 rounded p-1 text-muted-foreground/40 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                            aria-label={`Delete conversation: ${conv.title || "Untitled"}`}
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-4 py-2">
          <p className="text-[9px] text-muted-foreground/40 text-center">
            {filteredConversations.length} conversation
            {filteredConversations.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteConfirmId && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/50"
            onClick={() => setDeleteConfirmId(null)}
          />
          <div className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm">
            <div className="rounded-xl border bg-card p-6 shadow-lg">
              <h3 className="text-sm font-semibold text-foreground mb-2">
                Delete Conversation
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                Are you sure you want to delete this conversation? This action
                cannot be undone.
              </p>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmId(null)}
                  className="rounded-lg border border-border/50 bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(deleteConfirmId)}
                  disabled={deleteConversation.isPending}
                  className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {deleteConversation.isPending ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
