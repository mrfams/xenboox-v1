"use client";

import { useState, useEffect, useRef } from "react";
import {
  Bot,
  Activity,
  AlertTriangle,
  Zap,
  RefreshCw,
  Wifi,
  WifiOff,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  useRealtimeAgentEvents,
  type AgentEvent,
  type TimelineEntry,
} from "@/lib/hooks/use-realtime-agent-events";

// ─── Timeline Event Item ────────────────────────────────────────────────

interface TimelineEventItemProps {
  entry: TimelineEntry;
  isLast: boolean;
  isNew?: boolean;
}

function TimelineEventItem({ entry, isLast, isNew }: TimelineEventItemProps) {
  const typeColors: Record<string, { dot: string; bg: string }> = {
    info: { dot: "bg-blue-500", bg: "bg-blue-50" },
    success: { dot: "bg-emerald-500", bg: "bg-emerald-50" },
    warning: { dot: "bg-amber-500", bg: "bg-amber-50" },
    error: { dot: "bg-red-500", bg: "bg-red-50" },
  };

  const colors = typeColors[entry.type] || typeColors.info;

  return (
    <div
      className={cn(
        "flex gap-3 relative transition-all duration-300",
        isNew && "animate-slide-in",
      )}
    >
      {/* Timeline line */}
      {!isLast && (
        <div className="absolute left-[7px] top-4 bottom-0 w-px bg-border/50" />
      )}

      {/* Dot with pulse for new events */}
      <div className="relative">
        <div
          className={cn(
            "h-[15px] w-[15px] rounded-full shrink-0 mt-0.5 z-10",
            colors.dot,
            isNew && "animate-pulse-ring",
          )}
        />
        {isNew && (
          <div
            className={cn(
              "absolute inset-0 rounded-full animate-ping opacity-30",
              colors.dot,
            )}
          />
        )}
      </div>

      {/* Content */}
      <div
        className={cn(
          "flex-1 pb-3 rounded-lg p-2 -mt-1 transition-colors duration-300",
          isNew && colors.bg,
        )}
      >
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground font-mono">
            {entry.time}
          </span>
          {entry.agentName && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Bot className="h-3 w-3" />
              {entry.agentName}
            </span>
          )}
        </div>
        <p className="text-xs text-foreground mt-0.5">{entry.message}</p>
      </div>
    </div>
  );
}

// ─── Live Stats Bar ─────────────────────────────────────────────────────

interface LiveStatsBarProps {
  activeRunCount: number;
  isConnected: boolean;
  eventCount: number;
  onRefresh?: () => void;
}

function LiveStatsBar({
  activeRunCount,
  isConnected,
  eventCount,
  onRefresh,
}: LiveStatsBarProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-accent/30 border-b border-border/50">
      <div className="flex items-center gap-4">
        {/* Connection status */}
        <div className="flex items-center gap-1.5">
          {isConnected ? (
            <Wifi className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <WifiOff className="h-3.5 w-3.5 text-red-500" />
          )}
          <span className="text-[10px] text-muted-foreground">
            {isConnected ? "Live" : "Reconnecting..."}
          </span>
        </div>

        {/* Active runs */}
        {activeRunCount > 0 && (
          <div className="flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-primary animate-pulse" />
            <span className="text-[10px] font-medium text-primary">
              {activeRunCount} active
            </span>
          </div>
        )}

        {/* Event count */}
        <div className="flex items-center gap-1.5">
          <Activity className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground">
            {eventCount} events
          </span>
        </div>
      </div>

      {/* Refresh button */}
      {onRefresh && (
        <button
          type="button"
          onClick={onRefresh}
          className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

// ─── Empty State ────────────────────────────────────────────────────────

function EmptyTimeline() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Activity className="h-12 w-12 text-muted-foreground/30 mb-3" />
      <p className="text-sm font-medium text-foreground">
        No agent activity yet
      </p>
      <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
        Timeline events will appear here as agents process tasks
      </p>
    </div>
  );
}

// ─── Main AgentTimeline Component ───────────────────────────────────────

export interface AgentTimelineProps {
  entityId: string;
  maxEntries?: number;
  showStats?: boolean;
  showHeader?: boolean;
  className?: string;
  onEvent?: (event: AgentEvent) => void;
}

export function AgentTimeline({
  entityId,
  maxEntries = 50,
  showStats = true,
  showHeader = true,
  className,
  onEvent,
}: AgentTimelineProps) {
  const {
    isConnected,
    timeline: rawTimeline,
    activeRunCount,
    lastEvent,
    clearTimeline,
  } = useRealtimeAgentEvents({
    entityId,
    enabled: true,
    onEvent,
  });

  // Track new events for animation
  const [newEventIds, setNewEventIds] = useState<Set<string>>(new Set());
  const prevTimelineRef = useRef<TimelineEntry[]>([]);

  // Detect new events and animate them
  useEffect(() => {
    const prevIds = new Set(prevTimelineRef.current.map((e) => e.id));
    const newIds = new Set(
      rawTimeline.filter((e) => !prevIds.has(e.id)).map((e) => e.id),
    );

    if (newIds.size > 0) {
      setNewEventIds((prev) => new Set([...prev, ...newIds]));

      // Remove animation after 2 seconds
      setTimeout(() => {
        setNewEventIds((prev) => {
          const next = new Set(prev);
          for (const id of newIds) {
            next.delete(id);
          }
          return next;
        });
      }, 2000);
    }

    prevTimelineRef.current = rawTimeline;
  }, [rawTimeline]);

  // Limit entries
  const timeline = rawTimeline.slice(-maxEntries);

  return (
    <div
      className={cn(
        "rounded-xl border border-border/50 bg-card overflow-hidden",
        className,
      )}
    >
      {/* Header */}
      {showHeader && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">
              Agent Timeline
            </h3>
          </div>
          <button
            type="button"
            onClick={clearTimeline}
            className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear
          </button>
        </div>
      )}

      {/* Stats bar */}
      {showStats && (
        <LiveStatsBar
          activeRunCount={activeRunCount}
          isConnected={isConnected}
          eventCount={timeline.length}
          onRefresh={clearTimeline}
        />
      )}

      {/* Timeline content */}
      <div className="p-4 max-h-[400px] overflow-y-auto scrollbar-thin">
        {timeline.length === 0 ? (
          <EmptyTimeline />
        ) : (
          <div className="space-y-0">
            {timeline.map((entry, idx) => (
              <TimelineEventItem
                key={entry.id}
                entry={entry}
                isLast={idx === timeline.length - 1}
                isNew={newEventIds.has(entry.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* New event indicator */}
      {lastEvent && !isConnected && (
        <div className="px-4 py-2 border-t border-border/50 bg-amber-50 flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
          <span className="text-[10px] text-amber-700">
            Connection lost. Reconnecting...
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Compact Timeline (for sidebar) ─────────────────────────────────────

export function CompactAgentTimeline({
  entityId,
  maxEntries = 5,
}: {
  entityId: string;
  maxEntries?: number;
}) {
  const { isConnected, timeline, activeRunCount } = useRealtimeAgentEvents({
    entityId,
    enabled: true,
  });

  const recentTimeline = timeline.slice(-maxEntries);

  return (
    <div className="space-y-2">
      {/* Status indicator */}
      <div className="flex items-center gap-2 mb-3">
        <div
          className={cn(
            "h-2 w-2 rounded-full",
            isConnected ? "bg-emerald-500" : "bg-red-500",
          )}
        />
        <span className="text-[10px] text-muted-foreground">
          {isConnected ? "Live" : "Offline"}
        </span>
        {activeRunCount > 0 && (
          <span className="ml-auto flex items-center gap-1 text-[10px] text-primary">
            <Zap className="h-3 w-3" />
            {activeRunCount}
          </span>
        )}
      </div>

      {/* Recent events */}
      {recentTimeline.length === 0 ? (
        <p className="text-[10px] text-muted-foreground text-center py-2">
          No recent activity
        </p>
      ) : (
        <div className="space-y-2">
          {recentTimeline.map((entry) => (
            <div key={entry.id} className="flex items-start gap-2 text-[10px]">
              <div
                className={cn(
                  "h-1.5 w-1.5 rounded-full mt-1 shrink-0",
                  entry.type === "info" && "bg-blue-500",
                  entry.type === "success" && "bg-emerald-500",
                  entry.type === "warning" && "bg-amber-500",
                  entry.type === "error" && "bg-red-500",
                )}
              />
              <div className="min-w-0">
                <p className="text-foreground truncate">{entry.message}</p>
                <p className="text-muted-foreground">{entry.time}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
