"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import { AgentActivityItem } from "./agent-activity-item";
import { AgentThoughtStream, type ThoughtStep } from "./agent-thought-stream";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
} from "@/components/ui";
import { Skeleton } from "@/components/shared/loading";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Activity,
  Bot,
  RefreshCw,
  ChevronDown,
  AlertTriangle,
} from "lucide-react";

const POLL_INTERVAL_MS = 3000;
const MAX_VISIBLE_ITEMS = 50;
const ACTIVE_THRESHOLD_MS = 30000; // Consider an activity "active" if within 30s

type AgentActivityFeedProps = {
  limit?: number;
  showHeader?: boolean;
  compact?: boolean;
  className?: string;
};

export function AgentActivityFeed({
  limit = 25,
  showHeader = true,
  compact = false,
  className,
}: AgentActivityFeedProps) {
  const feedRef = useRef<HTMLDivElement>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);

  const { data: activities, isLoading } =
    trpc.ingestion.listRecentActivity.useQuery(
      { limit },
      {
        refetchInterval: POLL_INTERVAL_MS,
        refetchIntervalInBackground: false,
        staleTime: 1000,
      },
    );

  // Track initial load
  useEffect(() => {
    if (!isLoading && activities) {
      // Small delay to show loading state
      const timer = setTimeout(() => setInitialLoading(false), 600);
      return () => clearTimeout(timer);
    }
  }, [isLoading, activities]);

  // Auto-scroll when new items arrive
  useEffect(() => {
    if (autoScroll && feedRef.current && activities && activities.length > 0) {
      feedRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [activities, autoScroll]);

  // Detect if user has scrolled up
  const handleScroll = useCallback(() => {
    if (!feedRef.current) return;
    const { scrollTop } = feedRef.current;
    // If scrolled more than 50px from top, disable auto-scroll
    setAutoScroll(scrollTop < 50);
  }, []);

  // Separate active (running) vs completed activities
  const { activeActivities, completedActivities, recentFailedCount } =
    useMemo(() => {
      if (!activities) {
        return {
          activeActivities: [],
          completedActivities: [],
          recentFailedCount: 0,
        };
      }

      const now = Date.now();
      const active: typeof activities = [];
      const completed: typeof activities = [];

      for (const a of activities) {
        const createdAt = new Date(a.createdAt as string).getTime();
        const isRecent = now - createdAt < ACTIVE_THRESHOLD_MS;

        if (
          a.status === "running" ||
          a.status === "processing" ||
          a.status === "pending"
        ) {
          active.push(a);
        } else if (
          isRecent &&
          (a.status === "running" || a.status === "processing")
        ) {
          active.push(a);
        } else {
          completed.push(a);
        }
      }

      const recentFailed = completed.filter(
        (a) => a.status === "failed" || a.status === "error",
      );

      return {
        activeActivities: active,
        completedActivities: completed.slice(0, MAX_VISIBLE_ITEMS),
        recentFailedCount: recentFailed.length,
      };
    }, [activities]);

  // Build thought steps for active agents
  const activeThoughtSteps = useMemo(() => {
    const agentMap = new Map<string, ThoughtStep[]>();
    for (const a of activeActivities) {
      if (!agentMap.has(a.agent)) {
        agentMap.set(a.agent, []);
      }
      agentMap.get(a.agent)!.push({
        id: a.id,
        action: a.action,
        detail: a.description ?? undefined,
        status:
          a.status === "running" || a.status === "processing"
            ? "running"
            : "completed",
        confidence: a.confidence ?? undefined,
        timestamp: new Date(a.createdAt as string).toLocaleTimeString(),
      });
    }
    return agentMap;
  }, [activeActivities]);

  const totalActivitiesCount = activities?.length ?? 0;

  if (initialLoading) {
    return (
      <Card className={cn(className)}>
        {showHeader && (
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Agent Activity
              </CardTitle>
            </div>
          </CardHeader>
        )}
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(className)}>
      {showHeader && (
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Bot className="h-4 w-4 text-primary" />
                Agent Workforce
              </CardTitle>
              {activeActivities.length > 0 && (
                <Badge
                  variant="secondary"
                  className="text-[10px] animate-pulse bg-primary/10 text-primary border-primary/20"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-primary mr-1 inline-block animate-ping" />
                  {activeActivities.length} active
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {recentFailedCount > 0 && (
                <Badge variant="destructive" className="text-[10px]">
                  <AlertTriangle className="h-3 w-3 mr-0.5" />
                  {recentFailedCount} failed
                </Badge>
              )}
              <Badge
                variant="outline"
                className="text-[10px] text-muted-foreground"
              >
                <RefreshCw className="h-3 w-3 mr-0.5" />
                Live
              </Badge>
            </div>
          </div>
        </CardHeader>
      )}

      <CardContent className={cn(!showHeader && "pt-0")}>
        {!activities || totalActivitiesCount === 0 ? (
          <EmptyState
            icon={<Activity className="h-8 w-8" />}
            title="No agent activity yet"
            description="Agent actions will appear here as your AI workforce processes documents and transactions. Try uploading a document or sending an invoice."
            className="py-8"
          />
        ) : (
          <div
            ref={feedRef}
            onScroll={handleScroll}
            className={cn(
              "space-y-3 overflow-y-auto scrollbar-thin",
              compact ? "max-h-[300px]" : "max-h-[500px]",
            )}
          >
            {/* Active agents thinking section */}
            {activeActivities.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                  Now Processing
                </div>

                <div className="space-y-2">
                  {/* Thought stream for each active agent */}
                  {Array.from(activeThoughtSteps.entries()).map(
                    ([agent, steps]) => (
                      <AgentThoughtStream
                        key={agent}
                        agent={agent}
                        thoughtSteps={steps}
                        isActive={true}
                      />
                    ),
                  )}
                </div>

                {/* Separator */}
                <div className="relative my-3">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-dashed border-muted-300/50" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-card px-2 text-[10px] text-muted-foreground/50">
                      Recent Activity
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Completed activities list */}
            <div className="space-y-1.5">
              {completedActivities.length === 0 &&
              activeActivities.length > 0 ? (
                <div className="text-center py-6 text-xs text-muted-foreground">
                  Waiting for activity updates...
                </div>
              ) : (
                completedActivities.map((a, index) => (
                  <AgentActivityItem
                    key={a.id}
                    activity={a}
                    isLatest={index === 0}
                  />
                ))
              )}
            </div>

            {/* Auto-scroll indicator */}
            {!autoScroll && (
              <button
                onClick={() => {
                  setAutoScroll(true);
                  feedRef.current?.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="sticky bottom-0 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full border bg-background px-3 py-1 text-[10px] text-muted-foreground shadow-sm hover:bg-accent transition-colors"
              >
                <ChevronDown className="h-3 w-3" />
                New activity below
              </button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
