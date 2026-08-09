"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { trpc } from "@/lib/trpc/client";
import {
  useStreamingChat,
  type AgentActivityEvent,
  type ApprovalEvent,
  type DelegationEvent,
  type DocumentCreatedEvent,
  type DoneEvent,
} from "@/lib/hooks/use-streaming-chat";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface DashboardChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  status: "completed" | "error";
  activities: AgentActivityEvent[];
  delegations: DelegationEvent[];
  documents: DocumentCreatedEvent[];
  approvals: ApprovalEvent[];
  confidence?: number;
  durationMs?: number;
  createdAt: number;
}

interface UseDashboardChatOptions {
  entityId: string | null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────

/**
 * Owns the dashboard's inline chat session. While a conversation is active,
 * the dashboard swaps its overview cards for a full chat screen. Messages are
 * kept in local state (the API persists them per-conversation), so exiting
 * never loses data — the conversation shows up in the Recent Conversations
 * sidebar and in /dashboard/chat.
 */
export function useDashboardChat({ entityId }: UseDashboardChatOptions) {
  const utils = trpc.useUtils();

  const [messages, setMessages] = useState<DashboardChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversationTitle, setConversationTitle] = useState<string | null>(
    null,
  );
  const [isChatActive, setIsChatActive] = useState(false);

  // Refs mirror the streaming-session state so a completed message can be
  // committed with a snapshot of everything that happened while it streamed.
  const conversationIdRef = useRef<string | null>(null);
  const activitiesRef = useRef<AgentActivityEvent[]>([]);
  const delegationsRef = useRef<DelegationEvent[]>([]);
  const documentsRef = useRef<DocumentCreatedEvent[]>([]);
  const approvalsRef = useRef<ApprovalEvent[]>([]);

  const clearActivityRefs = useCallback(() => {
    activitiesRef.current = [];
    delegationsRef.current = [];
    documentsRef.current = [];
    approvalsRef.current = [];
  }, []);

  const commitAssistantMessage = useCallback(
    (fullResponse: string, meta: DoneEvent) => {
      setMessages((prev) => [
        ...prev,
        {
          id: meta.messageId,
          role: "assistant",
          content: fullResponse,
          status: "completed",
          activities: activitiesRef.current,
          delegations: delegationsRef.current,
          documents: documentsRef.current,
          approvals: approvalsRef.current,
          confidence: meta.confidence,
          durationMs: meta.durationMs,
          createdAt: Date.now(),
        },
      ]);
      clearActivityRefs();
    },
    [clearActivityRefs],
  );

  const handleStreamError = useCallback(
    (message: string) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-error-${Date.now()}`,
          role: "assistant",
          content: `Sorry, I ran into a problem: ${message}. Please try again.`,
          status: "error",
          activities: [],
          delegations: [],
          documents: [],
          approvals: [],
          createdAt: Date.now(),
        },
      ]);
      clearActivityRefs();
    },
    [clearActivityRefs],
  );

  const {
    sendMessage: streamMessage,
    cancelStream,
    isStreaming,
    streamedContent,
    agentActivities,
    delegations,
    documents,
    approvals,
  } = useStreamingChat({
    entityId: entityId ?? "",
    onConversationCreated: (id, title) => {
      conversationIdRef.current = id;
      setConversationId(id);
      setConversationTitle(title ?? null);
    },
    onAgentActivity: (activity) => {
      activitiesRef.current = [...activitiesRef.current, activity];
    },
    onDelegation: (delegation) => {
      delegationsRef.current = [...delegationsRef.current, delegation];
    },
    onDocumentCreated: (doc) => {
      documentsRef.current = [...documentsRef.current, doc];
    },
    onApprovalNeeded: (approval) => {
      approvalsRef.current = [...approvalsRef.current, approval];
    },
    onComplete: commitAssistantMessage,
    onError: handleStreamError,
  });

  const sendMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !entityId || isStreaming) return;

      setIsChatActive(true);
      setMessages((prev) => [
        ...prev,
        {
          id: `user-${Date.now()}`,
          role: "user",
          content: trimmed,
          status: "completed",
          activities: [],
          delegations: [],
          documents: [],
          approvals: [],
          createdAt: Date.now(),
        },
      ]);

      // Follow-ups reuse the same conversation so the thread stays together.
      void streamMessage(trimmed, conversationIdRef.current ?? undefined);
    },
    [entityId, isStreaming, streamMessage],
  );

  const newChat = useCallback(() => {
    conversationIdRef.current = null;
    clearActivityRefs();
    setConversationId(null);
    setConversationTitle(null);
    setMessages([]);
  }, [clearActivityRefs]);

  const exitChat = useCallback(() => {
    if (isStreaming) cancelStream();
    newChat();
    setIsChatActive(false);
    // Refresh the dashboard + conversation lists so a freshly-created
    // conversation shows up in the sidebar and in /dashboard/chat.
    void utils.dashboard.getDashboardData.invalidate();
    void utils.chat.listConversations.invalidate();
  }, [isStreaming, cancelStream, newChat, utils]);

  // Abort any in-flight stream if the page unmounts mid-response so we never
  // set state on an unmounted component.
  useEffect(() => () => cancelStream(), [cancelStream]);

  return {
    messages,
    conversationId,
    conversationTitle,
    isChatActive,
    isStreaming,
    streamedContent,
    agentActivities,
    delegations,
    documents,
    approvals,
    sendMessage,
    newChat,
    exitChat,
  };
}
