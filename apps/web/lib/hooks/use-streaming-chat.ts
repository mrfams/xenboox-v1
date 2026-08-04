"use client";

import { useState, useCallback, useRef } from "react";

interface StreamMessage {
  type: "conversation" | "chunk" | "done" | "error";
  conversationId?: string;
  content?: string;
  message?: string;
}

interface UseStreamingChatOptions {
  entityId: string;
  onConversationCreated?: (conversationId: string) => void;
  onChunk?: (content: string) => void;
  onComplete?: (fullResponse: string) => void;
  onError?: (error: string) => void;
}

export function useStreamingChat({
  entityId,
  onConversationCreated,
  onChunk,
  onComplete,
  onError,
}: UseStreamingChatOptions) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedContent, setStreamedContent] = useState("");
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (message: string, conversationId?: string) => {
      if (isStreaming) return;

      setIsStreaming(true);
      setStreamedContent("");

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
                const data: StreamMessage = JSON.parse(line.slice(6));

                switch (data.type) {
                  case "conversation":
                    if (data.conversationId) {
                      onConversationCreated?.(data.conversationId);
                    }
                    break;
                  case "chunk":
                    if (data.content) {
                      fullResponse += data.content;
                      setStreamedContent(fullResponse);
                      onChunk?.(data.content);
                    }
                    break;
                  case "done":
                    onComplete?.(fullResponse);
                    break;
                  case "error":
                    onError?.(data.message || "Unknown error");
                    break;
                }
              } catch (e) {
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
      onChunk,
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
  };
}
