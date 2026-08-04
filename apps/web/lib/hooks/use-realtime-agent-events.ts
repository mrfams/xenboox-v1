"use client";

import { useState, useCallback, useEffect, useRef } from "react";

export type AgentEventType =
  | "connected"
  | "ping"
  | "run_started"
  | "run_progress"
  | "run_step_completed"
  | "run_completed"
  | "run_failed"
  | "run_waiting"
  | "agent_health_changed"
  | "task_created"
  | "task_completed"
  | "approval_needed";

export interface AgentEvent {
  type: AgentEventType;
  timestamp: string;
  // Run events
  runId?: string;
  agentName?: string;
  progress?: number;
  currentStep?: string;
  stepNumber?: number;
  stepName?: string;
  durationMs?: number;
  error?: string;
  reason?: string;
  // Task events
  taskId?: string;
  title?: string;
  description?: string;
  // Health events
  status?: string;
  healthScore?: number;
}

export interface TimelineEntry {
  id: string;
  time: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  agentName?: string;
  runId?: string;
}

interface UseRealtimeAgentEventsOptions {
  entityId: string;
  enabled?: boolean;
  onEvent?: (event: AgentEvent) => void;
  onRunStarted?: (runId: string, agentName: string) => void;
  onRunProgress?: (
    runId: string,
    progress: number,
    currentStep: string,
  ) => void;
  onRunCompleted?: (runId: string, durationMs: number) => void;
  onRunFailed?: (runId: string, error: string) => void;
  onApprovalNeeded?: (
    taskId: string,
    title: string,
    description: string,
  ) => void;
}

export function useRealtimeAgentEvents({
  entityId,
  enabled = true,
  onEvent,
  onRunStarted,
  onRunProgress,
  onRunCompleted,
  onRunFailed,
  onApprovalNeeded,
}: UseRealtimeAgentEventsOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [activeRunCount, setActiveRunCount] = useState(0);
  const [lastEvent, setLastEvent] = useState<AgentEvent | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  // Callbacks ref to avoid re-renders
  const callbacksRef = useRef({
    onEvent,
    onRunStarted,
    onRunProgress,
    onRunCompleted,
    onRunFailed,
    onApprovalNeeded,
  });

  useEffect(() => {
    callbacksRef.current = {
      onEvent,
      onRunStarted,
      onRunProgress,
      onRunCompleted,
      onRunFailed,
      onApprovalNeeded,
    };
  }, [
    onEvent,
    onRunStarted,
    onRunProgress,
    onRunCompleted,
    onRunFailed,
    onApprovalNeeded,
  ]);

  const connect = useCallback(() => {
    if (!enabled || !entityId) return;

    // Disconnect existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const url = new URL("/api/agent-events", window.location.origin);
    url.searchParams.set("entityId", entityId);

    const eventSource = new EventSource(url.toString());
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
      reconnectAttemptsRef.current = 0;
    };

    eventSource.onmessage = (event) => {
      try {
        const data: AgentEvent = JSON.parse(event.data);

        // Skip ping events for state updates
        if (data.type === "ping") return;

        // Track event
        setEvents((prev) => [...prev.slice(-99), data]); // Keep last 100 events
        setLastEvent(data);

        // Add to timeline
        const timelineEntry: TimelineEntry = {
          id: `${data.runId || data.taskId || "event"}-${Date.now()}`,
          time: new Date(data.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
          message: getEventMessage(data),
          type: getEventType(data.type),
          agentName: data.agentName,
          runId: data.runId,
        };
        setTimeline((prev) => [...prev.slice(-49), timelineEntry]); // Keep last 50 entries

        // Update active run count
        if (data.type === "run_started") {
          setActiveRunCount((prev) => prev + 1);
        } else if (
          data.type === "run_completed" ||
          data.type === "run_failed"
        ) {
          setActiveRunCount((prev) => Math.max(0, prev - 1));
        }

        // Call specific callbacks
        if (data.type === "run_started" && data.runId && data.agentName) {
          callbacksRef.current.onRunStarted?.(data.runId, data.agentName);
        } else if (
          data.type === "run_progress" &&
          data.runId &&
          data.progress !== undefined &&
          data.currentStep
        ) {
          callbacksRef.current.onRunProgress?.(
            data.runId,
            data.progress,
            data.currentStep,
          );
        } else if (
          data.type === "run_completed" &&
          data.runId &&
          data.durationMs !== undefined
        ) {
          callbacksRef.current.onRunCompleted?.(data.runId, data.durationMs);
        } else if (data.type === "run_failed" && data.runId && data.error) {
          callbacksRef.current.onRunFailed?.(data.runId, data.error);
        } else if (
          data.type === "approval_needed" &&
          data.taskId &&
          data.title &&
          data.description
        ) {
          callbacksRef.current.onApprovalNeeded?.(
            data.taskId,
            data.title,
            data.description,
          );
        }

        // Call general callback
        callbacksRef.current.onEvent?.(data);
      } catch {
        // Ignore parse errors
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      eventSource.close();

      // Reconnect with exponential backoff
      const attempt = reconnectAttemptsRef.current;
      const delay = Math.min(1000 * Math.pow(2, attempt), 30000);

      reconnectTimeoutRef.current = setTimeout(() => {
        reconnectAttemptsRef.current++;
        connect();
      }, delay);
    };
  }, [entityId, enabled]);

  // Connect on mount
  useEffect(() => {
    if (enabled) {
      connect();
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect, enabled]);

  // Clear timeline
  const clearTimeline = useCallback(() => {
    setTimeline([]);
    setEvents([]);
  }, []);

  return {
    isConnected,
    events,
    timeline,
    activeRunCount,
    lastEvent,
    clearTimeline,
  };
}

// Helper functions
function getEventMessage(event: AgentEvent): string {
  switch (event.type) {
    case "run_started":
      return `${event.agentName || "Agent"} started processing`;
    case "run_progress":
      return `${event.currentStep || "Processing"} (${event.progress || 0}%)`;
    case "run_step_completed":
      return `Completed: ${event.stepName || `Step ${event.stepNumber}`}`;
    case "run_completed":
      return `Completed in ${formatDuration(event.durationMs || 0)}`;
    case "run_failed":
      return `Failed: ${event.error || "Unknown error"}`;
    case "run_waiting":
      return `Waiting: ${event.reason || "Awaiting input"}`;
    case "agent_health_changed":
      return `${event.agentName} status: ${event.status}`;
    case "task_created":
      return `New task: ${event.title}`;
    case "task_completed":
      return `Task completed: ${event.title}`;
    case "approval_needed":
      return `Approval needed: ${event.title}`;
    default:
      return "Event received";
  }
}

function getEventType(type: AgentEventType): TimelineEntry["type"] {
  switch (type) {
    case "run_started":
    case "run_progress":
    case "run_step_completed":
      return "info";
    case "run_completed":
    case "task_completed":
      return "success";
    case "run_waiting":
    case "approval_needed":
    case "agent_health_changed":
      return "warning";
    case "run_failed":
      return "error";
    default:
      return "info";
  }
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
}
