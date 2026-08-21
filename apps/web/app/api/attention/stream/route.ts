import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { drainSseEvents } from "@/lib/sse/broadcast";
import {
  registerAttentionClient,
  unregisterAttentionClient,
  touchAttentionClient,
  type AttentionEvent,
} from "@/lib/sse/attention";

// ─── GET: SSE stream for attention signals ──────────────────────────────────
//
// The sidebar connects to this endpoint and receives real-time attention
// signal updates. When an agent escalates, a document is processed, or
// a report is ready, the sidebar lights up instantly.

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;
  const entityId = request.nextUrl.searchParams.get("entityId");

  if (!entityId) {
    return new Response("Missing entityId", { status: 400 });
  }

  const clientId = `attention-${userId}-${entityId}-${Date.now()}`;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      // Send initial connection event
      const connectEvent = JSON.stringify({
        type: "connected",
        clientId,
        timestamp: new Date().toISOString(),
      });
      controller.enqueue(encoder.encode(`data: ${connectEvent}\n\n`));

      // Register client
      registerAttentionClient({
        id: clientId,
        userId,
        entityId,
        controller,
        lastSeen: new Date(),
      });

      // Heartbeat every 15 seconds + drain Redis for cross-instance events
      const heartbeat = setInterval(async () => {
        try {
          // Send heartbeat
          const ping = JSON.stringify({ type: "heartbeat" });
          controller.enqueue(encoder.encode(`data: ${ping}\n\n`));

          // Touch client
          touchAttentionClient(clientId);

          // Drain any pending events from Redis (cross-instance delivery)
          const pendingEvents = await drainSseEvents(entityId);
          for (const eventStr of pendingEvents) {
            try {
              const event = JSON.parse(eventStr) as AttentionEvent;
              // Only forward attention-related events
              if (
                event.type === "attention_changed" ||
                event.type === "signal_added" ||
                event.type === "signal_removed" ||
                event.type === "signal_updated" ||
                event.type === "data_changed"
              ) {
                controller.enqueue(encoder.encode(`data: ${eventStr}\n\n`));
              }
            } catch {
              // Skip invalid events
            }
          }
        } catch {
          clearInterval(heartbeat);
          unregisterAttentionClient(clientId);
        }
      }, 15_000);

      // Cleanup on client disconnect
      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        unregisterAttentionClient(clientId);
        try {
          controller.close();
        } catch {
          // already closed
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
