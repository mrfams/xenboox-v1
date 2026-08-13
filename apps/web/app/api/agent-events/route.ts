import { NextRequest } from "next/server";
import { eq, and, desc, gte, gt, asc } from "drizzle-orm";
import {
  opsLiveRuns,
  opsLiveRunEvents,
} from "@xenboox/db/schema/ops-live-runs";
import { notifications } from "@xenboox/db/schema/notifications";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { publishSseEvent, drainSseEvents } from "@/lib/sse/broadcast";

// Local connections for this instance (still needed for controller references)
const activeConnections = new Map<
  string,
  Set<ReadableStreamDefaultController>
>();

// Local broadcast (for same-instance fast path)
function broadcastToEntity(entityId: string, event: AgentEvent) {
  const connections = activeConnections.get(entityId);
  if (!connections) return;

  const encoder = new TextEncoder();
  const data = `data: ${JSON.stringify(event)}\n\n`;

  for (const controller of connections) {
    try {
      controller.enqueue(encoder.encode(data));
    } catch {
      connections.delete(controller);
    }
  }
}

export type AgentEvent =
  | { type: "run_started"; runId: string; agentName: string; timestamp: string }
  | {
      type: "run_progress";
      runId: string;
      progress: number;
      currentStep: string;
      timestamp: string;
    }
  | {
      type: "run_step_completed";
      runId: string;
      stepNumber: number;
      stepName: string;
      timestamp: string;
    }
  | {
      type: "run_completed";
      runId: string;
      durationMs: number;
      timestamp: string;
    }
  | { type: "run_failed"; runId: string; error: string; timestamp: string }
  | { type: "run_waiting"; runId: string; reason: string; timestamp: string }
  | {
      type: "agent_health_changed";
      agentName: string;
      status: string;
      healthScore: number;
      timestamp: string;
    }
  | {
      type: "task_created";
      taskId: string;
      title: string;
      agentName: string;
      timestamp: string;
    }
  | { type: "task_completed"; taskId: string; title: string; timestamp: string }
  | {
      type: "approval_needed";
      taskId: string;
      title: string;
      description: string;
      timestamp: string;
    }
  | {
      type: "notification_created";
      notification: {
        id: string;
        type: string;
        priority: string;
        title: string;
        body: string;
        data: string | null;
        createdAt: Date | string;
      };
      timestamp: string;
    };

// Polling interval for database changes (in milliseconds)
const POLL_INTERVAL = 3000;

// How far back a freshly connected client looks for unread notifications.
// Mirrors the run-event lookback so a notification that landed seconds before
// the tab opened still shows up instead of silently missing.
const NOTIF_LOOKBACK_MS = 10_000;

// Track last seen timestamps for change detection
const lastSeenTimestamps = new Map<string, Date>();

async function getEntityEvents(
  entityId: string,
  since: Date,
): Promise<AgentEvent[]> {
  const events: AgentEvent[] = [];

  // Get recent live runs for this entity's organization
  const recentRuns = await db.query.opsLiveRuns.findMany({
    where: and(
      eq(opsLiveRuns.organizationId, entityId) as any,
      gte(opsLiveRuns.startedAt, since),
    ),
    orderBy: [desc(opsLiveRuns.startedAt)],
    limit: 20,
  });

  for (const run of recentRuns) {
    if (run.startedAt >= since) {
      events.push({
        type: "run_started",
        runId: run.runId,
        agentName: run.agentDisplayName,
        timestamp: run.startedAt.toISOString(),
      });
    }

    if (run.status === "in_progress" && run.startedAt >= since) {
      events.push({
        type: "run_progress",
        runId: run.runId,
        progress: run.progress,
        currentStep: run.currentStep || "Processing...",
        timestamp: run.startedAt.toISOString(),
      });
    }

    if (run.completedAt && run.completedAt >= since) {
      events.push({
        type: "run_completed",
        runId: run.runId,
        durationMs: run.durationMs,
        timestamp: run.completedAt.toISOString(),
      });
    }

    if (run.status === "failed" && run.startedAt >= since) {
      events.push({
        type: "run_failed",
        runId: run.runId,
        error: run.error || "Unknown error",
        timestamp: run.startedAt.toISOString(),
      });
    }

    if (run.status === "waiting" && run.startedAt >= since) {
      events.push({
        type: "run_waiting",
        runId: run.runId,
        reason: "Waiting for input or approval",
        timestamp: run.startedAt.toISOString(),
      });
    }
  }

  // Get recent run events
  const recentRunEvents = await db.query.opsLiveRunEvents.findMany({
    where: gte(opsLiveRunEvents.createdAt, since),
    orderBy: [desc(opsLiveRunEvents.createdAt)],
    limit: 50,
  });

  for (const event of recentRunEvents) {
    if (event.eventType === "step_completed") {
      events.push({
        type: "run_step_completed",
        runId: event.runId,
        stepNumber: (event.metadata as any)?.stepNumber || 0,
        stepName: event.message || "Step completed",
        timestamp: event.createdAt.toISOString(),
      });
    }
  }

  return events;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Get entityId from query params or use a default
  const { searchParams } = new URL(req.url);
  const entityId = searchParams.get("entityId") || session.user.id || "default";
  // Auth gate above guarantees session.user exists; id is typed optional by
  // next-auth, so assert it like the rest of the codebase does.
  const userId = session.user.id!;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Add connection to active set
      if (!activeConnections.has(entityId)) {
        activeConnections.set(entityId, new Set());
      }
      activeConnections.get(entityId)!.add(controller);

      // Send initial connection event
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ type: "connected", timestamp: new Date().toISOString() })}\n\n`,
        ),
      );

      // Set up polling for database changes
      const lastSeen =
        lastSeenTimestamps.get(entityId) || new Date(Date.now() - 10000);

      // Unread notifications — a per-CONNECTION cursor (not the entity-global
      // lastSeenTimestamps map above) so a user only ever receives rows that
      // arrived after THIS tab connected, and users sharing an entity never
      // bleed each other's notifications into the stream.
      let lastNotifSeen = new Date(Date.now() - NOTIF_LOOKBACK_MS);

      const pollNotifications = async () => {
        try {
          const fresh = await db.query.notifications.findMany({
            where: and(
              eq(notifications.userId, userId),
              eq(notifications.entityId, entityId),
              eq(notifications.read, false),
              gt(notifications.createdAt, lastNotifSeen),
            ),
            orderBy: [asc(notifications.createdAt)],
            limit: 20,
          });

          if (fresh.length > 0) {
            for (const n of fresh) {
              const event = {
                type: "notification_created" as const,
                notification: {
                  id: n.id,
                  type: n.type,
                  priority: n.priority,
                  title: n.title,
                  body: n.body,
                  data: n.data,
                  createdAt: n.createdAt,
                },
                timestamp: new Date().toISOString(),
              };
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
              );
            }
            // Advance the cursor to the newest row we emitted so the next poll
            // only sees rows that arrived after these.
            lastNotifSeen = new Date(fresh[fresh.length - 1].createdAt);
          }
        } catch (e) {
          // Notification polling must never break the run-event stream — the
          // 30s client poll reconciles any missed rows.
          logger.error({ err: e }, "SSE notification polling error");
        }
      };

      const pollForChanges = async () => {
        try {
          const newEvents = await getEntityEvents(entityId, lastSeen);

          if (newEvents.length > 0) {
            for (const event of newEvents) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
              );
            }

            const latestEvent = newEvents[newEvents.length - 1];
            if (latestEvent) {
              lastSeenTimestamps.set(entityId, new Date(latestEvent.timestamp));
            }
          }

          // Drain Redis-backed cross-instance events
          const redisEvents = await drainSseEvents(entityId);
          for (const raw of redisEvents) {
            try {
              const event = JSON.parse(raw) as AgentEvent;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
              );
            } catch {
              // malformed event, skip
            }
          }

          await pollNotifications();

          // Send keepalive ping
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "ping", timestamp: new Date().toISOString() })}\n\n`,
            ),
          );
        } catch (e) {
          logger.error({ err: e }, "SSE polling error");
        }
      };

      // Start polling
      const intervalId = setInterval(pollForChanges, POLL_INTERVAL);

      // Do initial poll
      pollForChanges();

      // Heartbeat to detect stale connections
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          // Connection is dead, clean up
          clearInterval(intervalId);
          clearInterval(heartbeatInterval);
          activeConnections.get(entityId)?.delete(controller);
          if (activeConnections.get(entityId)?.size === 0) {
            activeConnections.delete(entityId);
          }
        }
      }, 30000);

      // Cleanup on close
      req.signal.addEventListener("abort", () => {
        clearInterval(intervalId);
        clearInterval(heartbeatInterval);
        activeConnections.get(entityId)?.delete(controller);
        if (activeConnections.get(entityId)?.size === 0) {
          activeConnections.delete(entityId);
        }
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

// POST endpoint to manually trigger events (for testing or admin operations)
// Note: This endpoint is restricted to admin users only
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only allow admin users to broadcast events
  // In production, add proper role-based access control
  const user = session.user as { role?: string };
  if (user.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { entityId, event } = body;

  if (!entityId || !event) {
    return Response.json(
      { error: "Missing entityId or event" },
      { status: 400 },
    );
  }

  // Validate event structure
  const validEventTypes = [
    "run_started",
    "run_progress",
    "run_step_completed",
    "run_completed",
    "run_failed",
    "run_waiting",
    "agent_health_changed",
    "task_created",
    "task_completed",
    "approval_needed",
    "notification_created",
  ];
  if (!event.type || !validEventTypes.includes(event.type)) {
    return Response.json({ error: "Invalid event type" }, { status: 400 });
  }

  // Publish to Redis for cross-instance delivery (§16.1)
  // Also broadcast locally for same-instance fast path.
  await publishSseEvent(entityId, event);
  broadcastToEntity(entityId, event);

  return Response.json({ success: true });
}
