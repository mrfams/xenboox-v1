"use client";

import { useEffect, useRef, useCallback, useState } from "react";

// ─── Types ─────────────────────────────────────────────────────────────────

export type AttentionSSEEvent = {
  type:
    | "connected"
    | "heartbeat"
    | "attention_changed"
    | "signal_added"
    | "signal_removed"
    | "signal_updated"
    | "data_changed";
  entityId?: string;
  surface?: string;
  tone?: "action" | "new";
  delta?: number;
  count?: number;
  message?: string;
  timestamp?: string;
};

interface UseAttentionSSEOptions {
  entityId: string | null;
  enabled?: boolean;
  onAttentionChanged?: (event: AttentionSSEEvent) => void;
  onDataChanged?: (event: AttentionSSEEvent) => void;
}

// ─── Hook ──────────────────────────────────────────────────────────────────

/**
 * Connects to the attention SSE endpoint and provides real-time updates.
 * When an agent escalates, a document is processed, or a report is ready,
 * the callback fires immediately — no polling delay.
 *
 * Falls back gracefully: if SSE disconnects, the existing tRPC polling
 * in useAttentionSignals keeps the sidebar accurate.
 */
export function useAttentionSSE({
  entityId,
  enabled = true,
  onAttentionChanged,
  onDataChanged,
}: UseAttentionSSEOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const reconnectAttempts = useRef(0);

  const connect = useCallback(() => {
    if (!entityId || !enabled) return;

    // Clean up existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    const url = `/api/attention/stream?entityId=${encodeURIComponent(entityId)}`;
    const eventSource = new EventSource(url);

    eventSource.onopen = () => {
      setIsConnected(true);
      reconnectAttempts.current = 0;
    };

    eventSource.onmessage = (event) => {
      try {
        const data: AttentionSSEEvent = JSON.parse(event.data);

        switch (data.type) {
          case "connected":
            // Initial connection confirmed
            break;

          case "heartbeat":
            // Keep-alive, no action needed
            break;

          case "attention_changed":
          case "signal_added":
          case "signal_removed":
          case "signal_updated":
            onAttentionChanged?.(data);
            break;

          case "data_changed":
            onDataChanged?.(data);
            break;
        }
      } catch {
        // Skip invalid JSON
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      eventSource.close();
      eventSourceRef.current = null;

      // Exponential backoff reconnection: 1s, 2s, 4s, 8s, max 30s
      const delay = Math.min(
        1000 * Math.pow(2, reconnectAttempts.current),
        30_000,
      );
      reconnectAttempts.current++;

      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, delay);
    };

    eventSourceRef.current = eventSource;
  }, [entityId, enabled, onAttentionChanged, onDataChanged]);

  // Connect on mount / entityId change
  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setIsConnected(false);
    };
  }, [connect]);

  return {
    isConnected,
  };
}
