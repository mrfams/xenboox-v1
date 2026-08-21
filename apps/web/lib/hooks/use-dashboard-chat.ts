"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { trpc } from "@/lib/trpc/client";
import { parseChatArtifacts } from "@/lib/chat/artifact-types";
import type { PageContextPayload } from "@/lib/chat/page-context";
import {
  useStreamingChat,
  type AgentActivityEvent,
  type ApprovalEvent,
  type DelegationEvent,
  type DocumentCreatedEvent,
  type DoneEvent,
  type NeedsInputEvent,
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

// ─── Pure mapping (exported for tests) ─────────────────────────────────────

/**
 * Maps a persisted chat message row into the dashboard's in-memory message
 * shape. Historical rows carry no live agent-activity/delegation/approval
 * events, so those arrays start empty; generated documents are rehydrated
 * from the message metadata so the inline viewer can open them again.
 */
export function mapHistoryRowToMessage(row: {
  id: string;
  role: string;
  content: string | null;
  status: string;
  confidence: number | null;
  latencyMs: number | null;
  metadata?: unknown;
  createdAt: Date | string;
}): DashboardChatMessage {
  return {
    id: row.id,
    role: row.role === "user" ? "user" : "assistant",
    content: row.content ?? "",
    status: row.status === "failed" ? "error" : "completed",
    activities: [],
    delegations: [],
    documents: parseChatArtifacts(row.metadata).map(
      (a): DocumentCreatedEvent => ({
        type: "document_created",
        artifactId: a.artifactId,
        name: a.name,
        docType: a.docType,
        mimeType: a.mimeType ?? "application/octet-stream",
        sizeBytes: a.sizeBytes,
        url: a.url,
      }),
    ),
    approvals: [],
    confidence: row.confidence ?? undefined,
    durationMs: row.latencyMs ?? undefined,
    createdAt: new Date(row.createdAt).getTime(),
  };
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
  const [pendingInput, setPendingInput] = useState<NeedsInputEvent | null>(
    null,
  );
  // Guards against a stale response overwriting a newer load when the user
  // clicks two different conversations in quick succession.
  const loadRequestRef = useRef(0);

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
    thinkingEvents,
    delegations,
    documents,
    approvals,
    toolTraces,
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
    onNeedsInput: (input) => {
      setPendingInput(input);
    },
    onComplete: commitAssistantMessage,
    onError: handleStreamError,
  });

  const sendMessage = useCallback(
    (text: string, pageContext?: PageContextPayload) => {
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
      void streamMessage(
        trimmed,
        conversationIdRef.current ?? undefined,
        undefined,
        pageContext,
      );
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

  /**
   * Resume a past conversation inline on the dashboard. Loads the persisted
   * thread from the chat router, swaps the overview for the chat screen, and
   * points follow-ups at the same conversation so the thread keeps growing
   * here instead of forcing a jump to /dashboard/chat.
   */
  const loadConversation = useCallback(
    async (conversationId: string, title?: string | null) => {
      if (!entityId) return;
      const requestId = ++loadRequestRef.current;
      try {
        const rows =
          (await utils.chat.getMessages.fetch({ conversationId })) ?? [];
        // A newer click may have superseded this one while we were fetching.
        if (requestId !== loadRequestRef.current) return;
        const history: DashboardChatMessage[] = rows.map(
          mapHistoryRowToMessage,
        );

        conversationIdRef.current = conversationId;
        setConversationId(conversationId);
        setConversationTitle(title ?? null);
        setMessages(history);
        setIsChatActive(true);
      } catch {
        // The sidebar list already came from the dashboard router, so a
        // failure here is unexpected — keep the overview rather than leave a
        // blank chat screen.
      }
    },
    [entityId, utils],
  );

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
    thinkingEvents,
    delegations,
    documents,
    approvals,
    toolTraces,
    pendingInput,
    sendMessage,
    newChat,
    exitChat,
    loadConversation,
  };
}
