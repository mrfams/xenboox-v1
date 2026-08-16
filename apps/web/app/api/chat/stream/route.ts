import { and, eq, inArray, sql } from "drizzle-orm";
import { NextRequest } from "next/server";
import {
  conversations,
  chatMessages,
  documents,
  journalEntries,
  salesInvoices,
  invoicesAp,
  chartOfAccounts,
  customers,
  suppliers,
} from "@xenboox/db/schema";
import { processChatInput, type PipelineStepEvent } from "@xenboox/agents";
import { redactPii } from "@xenboox/agents/core/security/injection-defense";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getRateLimiter } from "@/lib/security/rate-limiter";
import { generateConversationTitle } from "@/lib/chat/conversation-title";
import { generateConversationSummary } from "@/lib/chat/conversation-summary";
import { logger } from "@/lib/logger";
import { generateChatArtifacts } from "@/lib/chat/artifact-service";
import {
  buildPageContextBlock,
  type PageContextPayload,
} from "@/lib/chat/page-context";
import type { PinnedContext } from "@/lib/chat/mention-types";

export const runtime = "nodejs";
// §17.6 — chat routes run full agent pipelines (LLM + tool calls) and can
// exceed the default function budget on first turn; 300s is the Vercel Pro
// ceiling, sufficient for a multi-step agent response.
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const userId = session.user?.id;
  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = await req.json();
  const { message, conversationId, entityId, files, pageContext, pinned } =
    body as {
      message?: string;
      conversationId?: string;
      entityId?: string;
      files?: Array<{ documentId: string; name: string; type: string }>;
      pageContext?: PageContextPayload;
      pinned?: PinnedContext[];
    };

  if (!message || !entityId) {
    return new Response(JSON.stringify({ error: "Missing required fields" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Get entity info for the pipeline
  const entity = await db.query.entities.findFirst({
    where: (entities: any, { eq }: any) => eq(entities.id, entityId),
    columns: { id: true, name: true, currency: true, organizationId: true },
  });

  if (!entity) {
    return new Response(JSON.stringify({ error: "Entity not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Rate limit: 30 chat messages per minute per user (in-memory fallback when
  // no Upstash Redis is configured — deterministic per-instance)
  const rate = await getRateLimiter().checkChatStreamRateLimit(
    `chat:${userId}`,
  );
  if (!rate.success) {
    return new Response(
      JSON.stringify({
        error:
          "Rate limit exceeded. Please wait a moment before sending another message.",
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(
            Math.max(1, rate.reset - Math.floor(Date.now() / 1000)),
          ),
          "X-RateLimit-Limit": rate.limit.toString(),
          "X-RateLimit-Remaining": "0",
        },
      },
    );
  }

  // One-line snippet for the /chat panel, derived from this message. Computed
  // once and reused by the create insert and the exchange update below.
  const summary = generateConversationSummary(message) ?? undefined;

  // Create or get conversation. New conversations get a short, readable name
  // derived from the first message (not the raw 80-char fragment) plus the
  // summary.
  let convId = conversationId;
  if (!convId) {
    const [conv] = await db
      .insert(conversations)
      .values({
        entityId,
        userId: session.user.id!,
        title: generateConversationTitle(message),
        summary,
      })
      .returning();
    convId = conv.id;
  }

  // Build file context if files were attached — entity-scoped: only documents
  // that belong to this entity are loaded, so a crafted documentId can never
  // leak another entity's file into the prompt. Each attached document
  // contributes its name/type plus a bounded, whitespace-collapsed excerpt of
  // its AI-extracted text so the agent can genuinely answer about it.
  let fileContext = "";
  if (files && Array.isArray(files) && files.length > 0) {
    const ids = files
      .map((f) => f?.documentId)
      .filter((id): id is string => typeof id === "string" && id.length > 0);
    const owned =
      ids.length > 0
        ? await db.query.documents.findMany({
            where: and(
              eq(documents.entityId, entityId),
              inArray(documents.id, ids),
            ),
            columns: {
              id: true,
              name: true,
              type: true,
              ocrText: true,
            },
          })
        : [];
    const ownedById = new Map(owned.map((d) => [d.id, d]));
    const descriptions = files
      .map((f: any) => {
        const doc = f?.documentId ? ownedById.get(f.documentId) : undefined;
        if (!doc) return null;
        // §22.2 — PII discipline: OCR text is untrusted document content that
        // may carry bank numbers, tax IDs, phones, SSNs. Scrubbed deterministically
        // BEFORE it enters the prompt — never rely on the model to self-redact.
        const excerpt = redactPii(
          (doc.ocrText ?? "")
            .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 1500),
        ).text;
        const line = `[Attached document: ${doc.name} (${doc.type})]`;
        return excerpt
          ? `${line} Extracted text: "${excerpt}"`
          : `${line} No extracted text available yet.`;
      })
      .filter(Boolean);
    if (descriptions.length > 0) {
      fileContext = `\n\nUser attached document(s) for you to work on. Answer about these documents, not unrelated data:\n${descriptions.join("\n")}`;
    }
  }

  // Build page context so the agent answers about the page the user is on
  // (module copilot). Bounded + sanitized by the builder; omitted entirely
  // when the client sent nothing.
  const pageContextBlock = buildPageContextBlock(pageContext);

  // Resolve '@'-mentioned context pins — every id is re-validated against the
  // entity here (the client label is display-only; the record is loaded fresh
  // and entity-scoped, so a forged pin can never leak another entity's data
  // into the prompt). Unresolvable pins are dropped silently.
  let pinnedContextBlock = "";
  const resolvedPins: PinnedContext[] = [];
  if (pinned && Array.isArray(pinned) && pinned.length > 0) {
    const byKind = new Map<string, string[]>();
    for (const p of pinned) {
      if (!p?.kind || !p?.id) continue;
      const list = byKind.get(p.kind) ?? [];
      list.push(p.id);
      byKind.set(p.kind, list);
    }
    const lines: string[] = [];
    for (const [kind, ids] of byKind) {
      const owned = ids.filter((id) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          id,
        ),
      );
      if (owned.length === 0) continue;
      switch (kind) {
        case "document": {
          const rows = await db.query.documents.findMany({
            where: and(
              eq(documents.entityId, entityId),
              inArray(documents.id, owned),
            ),
            columns: { id: true, name: true, type: true, ocrText: true },
          });
          for (const r of rows) {
            const excerpt = redactPii(
              (r.ocrText ?? "")
                .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
                .replace(/\s+/g, " ")
                .trim()
                .slice(0, 1200),
            ).text;
            lines.push(
              `• Document: ${r.name} (${r.type})${excerpt ? ` — excerpt: "${excerpt}"` : ""}`,
            );
            resolvedPins.push({ kind, id: r.id, label: r.name });
          }
          break;
        }
        case "transaction": {
          const rows = await db.query.journalEntries.findMany({
            where: and(
              eq(journalEntries.entityId, entityId),
              inArray(journalEntries.id, owned),
            ),
            columns: {
              id: true,
              description: true,
              date: true,
              status: true,
              reference: true,
            },
          });
          for (const r of rows) {
            lines.push(
              `• Transaction (${r.date}, ${r.status}): ${r.description}${r.reference ? ` [ref: ${r.reference}]` : ""}`,
            );
            resolvedPins.push({ kind, id: r.id, label: r.description });
          }
          break;
        }
        case "invoice": {
          const rows = await db.query.salesInvoices.findMany({
            where: and(
              eq(salesInvoices.entityId, entityId),
              inArray(salesInvoices.id, owned),
            ),
            columns: {
              id: true,
              invoiceNumber: true,
              invoiceDate: true,
              status: true,
              totalAmount: true,
              currency: true,
            },
          });
          for (const r of rows) {
            lines.push(
              `• Invoice ${r.invoiceNumber} (${r.invoiceDate}, ${r.status}): ${r.currency} ${r.totalAmount}`,
            );
            resolvedPins.push({ kind, id: r.id, label: r.invoiceNumber });
          }
          break;
        }
        case "bill": {
          const rows = await db.query.invoicesAp.findMany({
            where: and(
              eq(invoicesAp.entityId, entityId),
              inArray(invoicesAp.id, owned),
            ),
            columns: {
              id: true,
              invoiceNumber: true,
              invoiceDate: true,
              status: true,
              totalAmount: true,
              currency: true,
            },
          });
          for (const r of rows) {
            lines.push(
              `• Bill ${r.invoiceNumber} (${r.invoiceDate}, ${r.status}): ${r.currency} ${r.totalAmount}`,
            );
            resolvedPins.push({ kind, id: r.id, label: r.invoiceNumber });
          }
          break;
        }
        case "account": {
          const rows = await db.query.chartOfAccounts.findMany({
            where: and(
              eq(chartOfAccounts.entityId, entityId),
              inArray(chartOfAccounts.id, owned),
            ),
            columns: { id: true, code: true, name: true, type: true },
          });
          for (const r of rows) {
            lines.push(`• Account: ${r.code} · ${r.name} (${r.type})`);
            resolvedPins.push({
              kind,
              id: r.id,
              label: `${r.code} · ${r.name}`,
            });
          }
          break;
        }
        case "customer": {
          const rows = await db.query.customers.findMany({
            where: and(
              eq(customers.entityId, entityId),
              inArray(customers.id, owned),
            ),
            columns: {
              id: true,
              name: true,
              contactEmail: true,
              paymentTerms: true,
            },
          });
          for (const r of rows) {
            lines.push(
              `• Customer: ${r.name}${r.contactEmail ? ` (${r.contactEmail})` : ""}${r.paymentTerms ? ` · terms ${r.paymentTerms}` : ""}`,
            );
            resolvedPins.push({ kind, id: r.id, label: r.name });
          }
          break;
        }
        case "supplier": {
          const rows = await db.query.suppliers.findMany({
            where: and(
              eq(suppliers.entityId, entityId),
              inArray(suppliers.id, owned),
            ),
            columns: {
              id: true,
              name: true,
              contactEmail: true,
              paymentTerms: true,
            },
          });
          for (const r of rows) {
            lines.push(
              `• Supplier: ${r.name}${r.contactEmail ? ` (${r.contactEmail})` : ""}${r.paymentTerms ? ` · terms ${r.paymentTerms}` : ""}`,
            );
            resolvedPins.push({ kind, id: r.id, label: r.name });
          }
          break;
        }
      }
    }
    if (lines.length > 0) {
      pinnedContextBlock = `\n\nUser pinned these records with '@' — anchor your reasoning to them and refer to them by name:\n${lines.join("\n")}`;
    }
  }

  // Save user message — resolved pins persist on the row's metadata so the
  // history renderer can show what the user anchored to this message.
  await db
    .insert(chatMessages)
    .values({
      conversationId: convId,
      role: "user",
      content: message,
      status: "completed",
      metadata: resolvedPins.length > 0 ? { pinned: resolvedPins } : {},
    })
    .returning();

  // Insert a pending assistant message row (status: streaming) so the UI can
  // render a typing indicator tied to a real DB row, survive reconnects, and
  // be marked completed/failed when the pipeline finishes.
  const [pendingAssistant] = await db
    .insert(chatMessages)
    .values({
      conversationId: convId,
      role: "assistant",
      content: "",
      status: "streaming",
    })
    .returning();

  // Keep the conversation panel accurate. The stream route is also used by
  // the dashboard inline chat, so a conversation started (or continued) here
  // must surface in /dashboard/chat with a real timestamp and message count
  // — otherwise it sinks to the bottom of the panel with "0 messages".
  const [convRow] = await db
    .select({
      title: conversations.title,
    })
    .from(conversations)
    .where(eq(conversations.id, convId))
    .limit(1);

  // The name shown to the client (and persisted above). Follow-ups keep the
  // existing title; a conversation created without one falls back to a
  // generated name from this message.
  const conversationTitle =
    convRow?.title ?? generateConversationTitle(message);

  // Bump the message count with an atomic SQL increment rather than a
  // read-modify-write: two tabs streaming to the same thread concurrently
  // could otherwise both read the same count and lose an increment.
  // The summary is refreshed from the latest user message so the /chat
  // panel shows where the thread is now.
  await db
    .update(conversations)
    .set({
      lastMessageAt: new Date(),
      messageCount: sql`coalesce(${conversations.messageCount}, 0) + 2`,
      summary,
      updatedAt: new Date(),
    })
    .where(eq(conversations.id, convId));

  // Create streaming response
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // Tracks a client disconnect (user exits the dashboard chat / navigates
      // away). We stop streaming to the closed connection immediately, but
      // still let the pipeline finish so the conversation is saved whole for
      // later use in /dashboard/chat.
      let aborted = req.signal.aborted;
      const onAbort = () => {
        aborted = true;
        try {
          controller.close();
        } catch {
          // already closed
        }
      };
      req.signal.addEventListener("abort", onAbort, { once: true });

      const enqueue = (payload: unknown) => {
        if (aborted) return;
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(payload)}\n\n`),
          );
        } catch {
          // connection already closed — ignore
        }
      };

      try {
        // Send conversation ID first (with its name for immediate display)
        enqueue({
          type: "conversation",
          conversationId: convId,
          title: conversationTitle,
        });

        // Emit thinking indicator
        enqueue({
          type: "agent_activity",
          agent: "CFO Agent",
          status: "started",
          action: "Processing your request",
        });

        // Thinking reveal — the first reasoning line lands immediately, then
        // the real pipeline steps stream in as they complete.
        enqueue({
          type: "thinking",
          agent: "CFO Agent",
          step: "input_intake",
          label: "Input Intake",
          text: "Reading your request and loading the entity context…",
        });

        // Invoke the real CFO pipeline — page context rides the same seam as
        // file context, so the agent knows what the user is looking at.
        const fullMessage =
          message +
          fileContext +
          (pageContextBlock ? `\n\n${pageContextBlock}` : "") +
          pinnedContextBlock;

        // Stream tool events as they happen
        const toolEvents: Array<{
          type: string;
          toolName?: string;
          args?: Record<string, unknown>;
          success?: boolean;
          data?: unknown;
        }> = [];

        const pipelineResult = await processChatInput({
          userId,
          orgId: entity.organizationId,
          entityId,
          entityName: entity.name,
          currency: entity.currency || "GMD",
          message: fullMessage,
          conversationId: convId,
          channel: "web_chat",
          onToolCall: (toolName, args) => {
            const event = { type: "tool_call", toolName, args };
            toolEvents.push(event);
            enqueue({
              type: "tool_call",
              toolName,
              args,
              timestamp: new Date().toISOString(),
            });
          },
          onToolResult: (toolName, success, data) => {
            const event = { type: "tool_result", toolName, success, data };
            toolEvents.push(event);
            enqueue({
              type: "tool_result",
              toolName,
              success,
              data: success ? data : undefined,
              timestamp: new Date().toISOString(),
            });
          },
          // Thinking reveal — every real pipeline step (intent classification,
          // dispatch, confidence gate, …) streams as a reasoning line.
          onStep: (step: PipelineStepEvent) => {
            enqueue({
              type: "thinking",
              agent: "CFO Agent",
              step: step.step,
              label: step.label,
              text: step.note,
              durationMs: step.durationMs,
            });
          },
        });

        // If the user asked for a document/file, generate it from real ledger
        // data while the response streams. The resulting artifact is presented
        // in the conversation as a clickable card (ChatGPT/Claude style).
        // Gated on the pipeline actually accepting the request — a rejected
        // or refused turn must not produce a file from the same data.
        const artifactsPromise =
          pipelineResult.decision === "rejected"
            ? Promise.resolve([])
            : generateChatArtifacts({
                entityId,
                entityName: entity.name,
                currency: entity.currency || "GMD",
                userId,
                message,
              });

        // Emit agent activity event
        enqueue({
          type: "agent_activity",
          agent: "CFO Agent",
          status: "completed",
          action: "Response generated",
          confidence: Math.round(pipelineResult.confidence * 100),
          durationMs: pipelineResult.durationMs,
        });

        // Emit delegation events if agents were involved
        if (pipelineResult.agentId && pipelineResult.agentId !== "cfo") {
          enqueue({
            type: "delegation",
            from: "CFO Agent",
            to: pipelineResult.agentId,
            reason: `Delegated to ${pipelineResult.agentId} for specialized processing`,
          });
        }

        // Emit approval needed if escalation
        if (
          pipelineResult.escalationItems &&
          pipelineResult.escalationItems.length > 0
        ) {
          for (const item of pipelineResult.escalationItems) {
            enqueue({
              type: "approval_needed",
              title: item.what || "Approval Required",
              description:
                item.why ||
                item.recommendedAction ||
                "This action requires your approval",
              amount: item.amount
                ? `GMD ${item.amount.toLocaleString()}`
                : undefined,
            });
          }
        }

        // Stream the response text token-by-token for natural feel
        const response = pipelineResult.response;
        const words = response.split(/(\s+)/);
        for (const word of words) {
          if (aborted) break;
          enqueue({ type: "token", content: word });
          // Small delay for natural streaming feel
          await new Promise((resolve) => setTimeout(resolve, 15));
        }

        // Present generated documents in the conversation once the text is out.
        const artifacts = await artifactsPromise;
        for (const artifact of artifacts) {
          enqueue({
            type: "document_created",
            artifactId: artifact.artifactId,
            name: artifact.name,
            docType: artifact.docType,
            mimeType: artifact.mimeType,
            sizeBytes: artifact.sizeBytes,
          });
        }

        // Save complete AI response with tool calls and citations — even when
        // the client left mid-stream, so the conversation is fully usable
        // later in /dashboard/chat.
        const toolCallsForMessage = toolEvents
          .filter(
            (
              e,
            ): e is {
              type: "tool_result";
              toolName: string;
              success: boolean;
              args?: Record<string, unknown>;
              data?: unknown;
            } => e.type === "tool_result" && !!e.toolName && !!e.success,
          )
          .map((e) => ({
            toolName: e.toolName,
            args: e.args ?? {},
            success: e.success,
            result: e.data,
          }));

        // Complete the pending assistant message with the real response
        await db
          .update(chatMessages)
          .set({
            content: response,
            status: "completed",
            confidence: pipelineResult.confidence,
            agentModel: `cfo-pipeline-v1 (${pipelineResult.agentId})`,
            toolCalls:
              toolCallsForMessage.length > 0 ? toolCallsForMessage : undefined,
            metadata: {
              durationMs: pipelineResult.durationMs,
              decision: pipelineResult.decision,
              agentsInvolved: [pipelineResult.agentId],
              toolCallsCount: toolCallsForMessage.length,
              // Persist generated documents so they reappear when the
              // conversation is reopened from history.
              artifacts,
            },
          })
          .where(eq(chatMessages.id, pendingAssistant.id));

        // Emit done event
        enqueue({
          type: "done",
          messageId: pendingAssistant.id,
          confidence: Math.round(pipelineResult.confidence * 100),
          agentsInvolved: [pipelineResult.agentId],
          durationMs: pipelineResult.durationMs,
        });

        try {
          controller.close();
        } catch {
          // already closed by the abort handler
        }
      } catch (error) {
        logger.error({ err: error }, "Chat streaming error");
        if (aborted) {
          // The user left before the pipeline finished — mark the pending
          // message as cancelled instead of a scary "failed".
          await db
            .update(chatMessages)
            .set({
              content:
                "⏹️ Response cancelled — you exited this conversation before Xenboox finished.",
              status: "cancelled",
            })
            .where(eq(chatMessages.id, pendingAssistant.id))
            .catch(() => {});
        } else {
          // Mark the pending assistant message as failed so it never shows as
          // completed in history
          await db
            .update(chatMessages)
            .set({
              content:
                error instanceof Error
                  ? `⚠️ Request failed: ${error.message}`
                  : "⚠️ Request failed",
              status: "failed",
            })
            .where(eq(chatMessages.id, pendingAssistant.id))
            .catch(() => {});

          enqueue({
            type: "error",
            code: "PIPELINE_ERROR",
            message:
              error instanceof Error
                ? error.message
                : "Failed to process request",
          });
        }
        try {
          controller.close();
        } catch {
          // already closed
        }
      } finally {
        req.signal.removeEventListener("abort", onAbort);
      }
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
