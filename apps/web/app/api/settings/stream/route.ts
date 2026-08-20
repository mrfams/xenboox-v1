import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import {
  registerClient,
  unregisterClient,
  touchClient,
} from "@/lib/settings-sse";

// ─── GET: SSE stream ─────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;
  const clientId = `${userId}-${Date.now()}`;

  // Create SSE stream
  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection event
      const data = JSON.stringify({
        type: "connected",
        clientId,
        timestamp: new Date().toISOString(),
      });
      controller.enqueue(`data: ${data}\n\n`);

      // Register client
      registerClient({
        id: clientId,
        userId,
        controller,
        lastSeen: new Date(),
      });

      // Send heartbeat every 15 seconds
      const heartbeat = setInterval(() => {
        try {
          const ping = JSON.stringify({ type: "heartbeat" });
          controller.enqueue(`data: ${ping}\n\n`);

          // Update last seen
          touchClient(clientId);
        } catch {
          clearInterval(heartbeat);
          unregisterClient(clientId);
        }
      }, 15_000);

      // Cleanup on close
      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        unregisterClient(clientId);
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
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Disable nginx buffering
    },
  });
}
