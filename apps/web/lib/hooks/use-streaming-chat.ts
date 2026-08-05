"use client";

import { useState, useCallback, useRef } from "react";

// ─── Event Types ───────────────────────────────────────────────────────────

export interface AgentActivityEvent {
  type: "agent_activity";
  agent: string;
  status: "started" | "completed" | "failed";
  action: string;
  confidence?: number;
  durationMs?: number;
}

export interface DelegationEvent {
  type: "delegation";
  from: string;
  to: string;
  reason: string;
}

export interface DocumentCreatedEvent {
  type: "document_created";
  documentId: string;
  name: string;
  docType: string;
  url?: string;
}

export interface ApprovalEvent {
  type: "approval_needed";
  title: string;
  description: string;
  amount?: string;
}

export interface TokenEvent {
  type: "token";
  content: string;
}

export interface DoneEvent {
  type: "done";
  messageId: string;
  confidence: number;
  agentsInvolved: string[];
  durationMs?: number;
}

export interface ConversationEvent {
  type: "conversation";
  conversationId: string;
}

export interface ErrorEvent {
  type: "error";
  code?: string;
  message: string;
}

type SSEEvent =
  | ConversationEvent
  | AgentActivityEvent
  | DelegationEvent
  | DocumentCreatedEvent
  | ApprovalEvent
  | TokenEvent
  | DoneEvent
  | ErrorEvent;

// ─── Hook Options ──────────────────────────────────────────────────────────

interface UseStreamingChatOptions {
  entityId: string;
  onConversationCreated?: (conversationId: string) => void;
  onAgentActivity?: (activity: AgentActivityEvent) => void;
  onDelegation?: (delegation: DelegationEvent) => void;
  onDocumentCreated?: (doc: DocumentCreatedEvent) => void;
  onApprovalNeeded?: (approval: ApprovalEvent) => void;
  onToken?: (token: string) => void;
  onComplete?: (fullResponse: string, metadata: DoneEvent) => void;
  onError?: (error: string) => void;
}

// ─── Hook ──────────────────────────────────────────────────────────────────

export function useStreamingChat({
  entityId,
  onConversationCreated,
  onAgentActivity,
  onDelegation,
  onDocumentCreated,
  onApprovalNeeded,
  onToken,
  onComplete,
  onError,
}: UseStreamingChatOptions) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedContent, setStreamedContent] = useState("");
  const [agentActivities, setAgentActivities] = useState<AgentActivityEvent[]>(
    [],
  );
  const [delegations, setDelegations] = useState<DelegationEvent[]>([]);
  const [approvals, setApprovals] = useState<ApprovalEvent[]>([]);
  const [documents, setDocuments] = useState<DocumentCreatedEvent[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (
      message: string,
      conversationId?: string,
      files?: Array<{ documentId: string; name: string; type: string }>,
    ) => {
      if (isStreaming) return;

      setIsStreaming(true);
      setStreamedContent("");
      setAgentActivities([]);
      setDelegations([]);
      setApprovals([]);
      setDocuments([]);

      try {
        abortControllerRef.current = new AbortController();

        const response = await fetch("/api/chat/stream", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message,
            conversationId,
            entityId,
            files,
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error("Failed to send message");
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("No response body");
        }

        const decoder = new TextDecoder();
        let fullResponse = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data: SSEEvent = JSON.parse(line.slice(6));

                switch (data.type) {
                  case "conversation":
                    onConversationCreated?.(data.conversationId);
                    break;

                  case "agent_activity":
                    setAgentActivities((prev) => [...prev, data]);
                    onAgentActivity?.(data);
                    break;

                  case "delegation":
                    setDelegations((prev) => [...prev, data]);
                    onDelegation?.(data);
                    break;

                  case "document_created":
                    setDocuments((prev) => [...prev, data]);
                    onDocumentCreated?.(data);
                    break;

                  case "approval_needed":
                    setApprovals((prev) => [...prev, data]);
                    onApprovalNeeded?.(data);
                    break;

                  case "token":
                    if (data.content) {
                      fullResponse += data.content;
                      setStreamedContent(fullResponse);
                      onToken?.(data.content);
                    }
                    break;

                  case "done":
                    onComplete?.(fullResponse, data);
                    break;

                  case "error":
                    onError?.(data.message || "Unknown error");
                    break;
                }
              } catch {
                // Skip invalid JSON lines
              }
            }
          }
        }
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          // User cancelled
        } else {
          onError?.(
            error instanceof Error ? error.message : "Failed to send message",
          );
        }
      } finally {
        setIsStreaming(false);
        abortControllerRef.current = null;
      }
    },
    [
      entityId,
      isStreaming,
      onConversationCreated,
      onAgentActivity,
      onDelegation,
      onDocumentCreated,
      onApprovalNeeded,
      onToken,
      onComplete,
      onError,
    ],
  );

  const cancelStream = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
  }, []);

  return {
    sendMessage,
    cancelStream,
    isStreaming,
    streamedContent,
    agentActivities,
    delegations,
    approvals,
    documents,
  };
}
