# STREAMING_CHAT_ARCHITECTURE.md — Real-Time Chat & Streaming

> End-to-end architecture for the CFO Agent chat interface.
> Covers streaming protocol, database schema, UI components, agent delegation UX, error handling, and code patterns.

---

## 1. Chat Message Flow

### End-to-End Request Lifecycle

```
┌──────────┐      ┌────────────┐      ┌──────────────┐      ┌────────────┐
│  Browser  │─────▶│  Next.js   │─────▶│  CFO Agent   │─────▶│  Child     │
│  (React)  │      │  Route     │      │  (LangGraph) │      │  Agents    │
│           │◀─────│  Handler   │◀─────│              │◀─────│            │
└──────────┘  SSE  └────────────┘      └──────────────┘      └────────────┘
```

**Step-by-step:**

1. **User types message** in `ChatInput` component and hits Enter
2. **Client sends HTTP POST** to `/api/chat/stream` with `{ conversationId, message, entityId }`
3. **Route Handler authenticates** the session (Auth.js) and validates entity access
4. **User message persisted** to `chat_messages` table immediately (optimistic — user sees it instantly)
5. **Route Handler opens SSE stream** via `TransformStream` and returns a `ReadableStream` response
6. **CFO Agent invoked** via `graph.astreamEvents()` — receives user message + conversation history
7. **CFO Agent may delegate** to Controller, Treasury, Payroll Manager, or Compliance Agent
8. **Each token from the LLM** is pushed through the SSE stream to the browser
9. **Agent activity events** (tool calls, delegations, confidence) are interleaved with text tokens
10. **Stream ends** — final assistant message persisted to `chat_messages` with full content
11. **Agent activity logged** to `chat_agent_activity` and `agent_activity` tables

### Why Not tRPC for Streaming

tRPC mutations use HTTP request/response — they return a single value, not a stream. tRPC subscriptions exist but require WebSocket infrastructure that adds operational complexity on Vercel. For streaming, a dedicated SSE endpoint is simpler, more reliable, and native to Next.js App Router.

---

## 2. Streaming Protocol: SSE (Server-Sent Events)

### Decision: SSE over WebSocket and tRPC Subscriptions

| Criterion | SSE | WebSocket | tRPC Sub |
|-----------|-----|-----------|----------|
| Vercel support | Native (Route Handlers) | Requires adapter + edge config | Not supported natively |
| Connection limit | HTTP/2 multiplexing | 1 per domain (legacy) | N/A |
| Auto-reconnect | Built into `EventSource` | Manual implementation | N/A |
| Auth | Standard cookies/headers | Custom handshake | N/A |
| Direction | Server → Client | Bidirectional | Server → Client |
| Complexity | Low | High | Medium |
| Infrastructure | None extra | External service or Vercel WS | WebSocket server |

**SSE wins** because:
- Vercel Route Handlers support streaming responses natively via `ReadableStream`
- No infrastructure changes — runs on serverless functions
- Automatic reconnection in the browser via `EventSource`
- Cookies (Auth.js session) are sent automatically with SSE requests
- Chat is inherently one-directional during streaming (server pushes tokens)
- Bidirectional communication handled by a separate tRPC mutation for sending messages

### SSE Stream Format

All SSE events use a JSON payload in `data:` with a `type` discriminator:

```
event: token
data: {"type":"token","content":"Your cash position"}

event: token
data: {"type":"token","content":" is GMD 450,000."}

event: agent_activity
data: {"type":"agent_activity","agent":"controller-agent","status":"called","description":"Querying trial balance"}

event: agent_activity
data: {"type":"agent_activity","agent":"controller-agent","status":"completed","confidence":0.92,"duration_ms":3200}

event: delegation
data: {"type":"delegation","from":"cfo-agent","to":"controller-agent","reason":"Need trial balance data for period June 2026"}

event: done
data: {"type":"done","messageId":"uuid","confidence":0.91}

event: error
data: {"type":"error","code":"AGENT_TIMEOUT","message":"The agent took too long to respond. Please try again."}
```

### Long-Running Agent Tasks

Agent tasks that take minutes (month-end close, report generation) are **not streamed inline**. Instead:

1. User sends "start June close"
2. CFO Agent responds immediately: "I'll start the June close. This will take a few minutes."
3. CFO Agent triggers the close via Trigger.dev (async job)
4. Stream ends — response delivered in ~2-3 seconds
5. Trigger.dev job runs the full close orchestration
6. Job posts result to `chat_messages` as a new system message when done
7. Client receives the result via polling or a push notification (see §7 below)

This keeps the chat snappy and avoids Vercel's function timeout limits.

---

## 3. Chat Storage Schema

### New Tables (Drizzle Schema)

Add to `packages/db/schema/chat.ts`:

```typescript
import { pgTable, uuid, text, timestamp, integer, real, jsonb, pgEnum, index } from "drizzle-orm/pg-core"
import { entities, users } from "./organization"

// --- Enums ---

export const chatRoleEnum = pgEnum("chat_role", ["user", "assistant", "system"])

export const conversationStatusEnum = pgEnum("conversation_status", ["active", "archived", "pinned"])

export const messageStatusEnum = pgEnum("message_status", ["streaming", "completed", "failed", "cancelled"])

export const attachmentTypeEnum = pgEnum("attachment_type", [
  "image", "pdf", "spreadsheet", "csv", "document", "other"
])

// --- Conversations ---

export const conversations = pgTable("conversations", {
  id:            uuid("id").primaryKey().defaultRandom(),
  entityId:      uuid("entity_id").notNull().references(() => entities.id),
  userId:        uuid("user_id").notNull().references(() => users.id),
  title:         text("title"),                      // auto-generated from first message or user-set
  status:        conversationStatusEnum("status").notNull().default("active"),
  summary:       text("summary"),                    // AI-generated summary for sidebar display
  pinned:        integer("pinned").default(0),       // sort order, 0 = not pinned
  lastMessageAt: timestamp("last_message_at"),
  messageCount:  integer("message_count").default(0),
  metadata:      jsonb("metadata").default({}),      // model used, token counts, etc.
  createdAt:     timestamp("created_at").notNull().defaultNow(),
  updatedAt:     timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("conversations_entity_idx").on(table.entityId),
  index("conversations_user_idx").on(table.userId),
  index("conversations_entity_user_idx").on(table.entityId, table.userId),
  index("conversations_last_message_idx").on(table.lastMessageAt),
])

// --- Messages ---

export const chatMessages = pgTable("chat_messages", {
  id:              uuid("id").primaryKey().defaultRandom(),
  conversationId:  uuid("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  role:            chatRoleEnum("role").notNull(),
  content:         text("content"),                   // full text (populated on stream complete)
  status:          messageStatusEnum("status").notNull().default("completed"),
  parentMessageId: uuid("parent_message_id"),         // for threading / edits
  confidence:      real("confidence"),                // 0.0–1.0, null for user messages
  agentModel:      text("agent_model"),               // "claude-sonnet-4.6" or "claude-haiku-4.5"
  tokenCount:      integer("token_count"),            // prompt + completion tokens
  latencyMs:       integer("latency_ms"),             // time from request to stream end
  metadata:        jsonb("metadata").default({}),     // tool calls, raw LangGraph state
  createdAt:       timestamp("created_at").notNull().defaultNow(),
  updatedAt:       timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("chat_messages_conversation_idx").on(table.conversationId),
  index("chat_messages_created_idx").on(table.createdAt),
])

// --- Agent Activity per Message ---

export const chatAgentActivity = pgTable("chat_agent_activity", {
  id:              uuid("id").primaryKey().defaultRandom(),
  conversationId:  uuid("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  messageId:       uuid("message_id").notNull().references(() => chatMessages.id, { onDelete: "cascade" }),
  agentId:         text("agent_id").notNull(),        // "cfo-agent", "controller-agent", etc.
  tier:            integer("tier"),                   // 1, 2, or 3
  action:          text("action"),                    // "tool_call", "delegation", "response"
  input:           jsonb("input"),
  output:          jsonb("output"),
  confidence:      real("confidence"),
  durationMs:      integer("duration_ms"),
  langfuseTraceId: text("langfuse_trace_id"),
  createdAt:       timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("chat_agent_activity_conversation_idx").on(table.conversationId),
  index("chat_agent_activity_message_idx").on(table.messageId),
])

// --- File Attachments ---

export const chatAttachments = pgTable("chat_attachments", {
  id:              uuid("id").primaryKey().defaultRandom(),
  conversationId:  uuid("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  messageId:       uuid("message_id").references(() => chatMessages.id, { onDelete: "set null" }),
  documentId:      uuid("document_id"),               // link to existing documents table if processed
  fileName:        text("file_name").notNull(),
  fileType:        attachmentTypeEnum("file_type").notNull(),
  fileSize:        integer("file_size"),              // bytes
  storagePath:     text("storage_path").notNull(),    // R2 path
  mimeType:        text("mime_type"),
  thumbnailUrl:    text("thumbnail_url"),             // for image previews
  createdAt:       timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("chat_attachments_conversation_idx").on(table.conversationId),
  index("chat_attachments_message_idx").on(table.messageId),
])
```

### Entity Scoping

All chat tables are entity-scoped via `entityId` on `conversations`. Every query filters through the conversation's `entityId`. RLS policies enforce this at the database layer:

```sql
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY entity_isolation ON conversations
  USING (entity_id = current_setting('app.current_entity_id')::UUID);

-- chat_messages inherits isolation via conversation join
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY entity_isolation ON chat_messages
  USING (conversation_id IN (
    SELECT id FROM conversations
    WHERE entity_id = current_setting('app.current_entity_id')::UUID
  ));
```

---

## 4. UI Components

### Component Tree

```
ChatLayout
├── ConversationSidebar
│   ├── SidebarHeader (New Chat, Search)
│   ├── ConversationList
│   │   └── ConversationItem (title, timestamp, pinned icon)
│   └── SidebarFooter (settings)
└── ChatPanel
    ├── ChatHeader (conversation title, share, archive)
    ├── ChatMessageList
    │   └── ChatMessage (× N)
    │       ├── MessageContent (markdown rendered)
    │       ├── AgentActivityIndicator (when streaming)
    │       ├── DelegationIndicator (when delegating)
    │   │   └── DelegationTimeline (collapsible sub-agent calls)
    │   ├── MessageAttachments
    │   └── MessageActions (copy, bookmark, share)
    ├── ChatInput
    │   ├── AttachmentButton → FileUploadDialog
    │   ├── TextInput (auto-resize textarea)
    │   └── SendButton
    └── StreamingStatus (bottom bar: "CFO Agent is thinking...")
```

### Key Component Specifications

**`ChatMessageList`** — Auto-scrolls to bottom on new tokens. Uses `IntersectionObserver` for "scroll to bottom" button visibility. Renders messages in a virtual list for long conversations (100+ messages).

**`ChatMessage`** — Renders markdown via `react-markdown` with `remark-gfm`. Supports streaming by accepting a partial `content` string that grows over time. Shows a blinking cursor (`▌`) at the end when `status === "streaming"`.

**`AgentActivityIndicator`** — Displays below the assistant message while streaming. Shows animated dots with agent name: `"CFO Agent is working..."` or `"Consulting Controller Agent..."`.

**`DelegationTimeline`** — Collapsible accordion inside the assistant message. Each child agent call rendered as a row with agent name, duration, and confidence badge. Click to expand and see tool call details.

**`ChatInput`** — Auto-resizing `<textarea>` with max 12 lines. `Cmd+Enter` sends. Supports drag-and-drop file upload. Disabled state while assistant is streaming. Shows character count approaching limit.

**`MessageActions`** — Appears on hover (desktop) or long-press (mobile). Actions: Copy text, Bookmark (pin to saved), Share (generate link), View source (show agent activity).

**`ConversationSidebar`** — 300px wide, collapsible on mobile. Lists conversations sorted by `lastMessageAt` desc. Pinned conversations float to top. Search filters by title. Shows conversation count badge.

---

## 5. Agent Delegation UI

### Delegation Message Pattern

When CFO Agent delegates to a child agent, it emits a structured event before the text token. The UI renders this as a special block:

```
┌─────────────────────────────────────────────────────────┐
│  Let me check with the Controller Agent...              │
│                                                         │
│  ▼ Controller Agent                                     │
│    ├─ Querying trial balance for June 2026              │
│    ├─ Reviewing journal entries                         │
│    └─ ✅ Completed (confidence: 0.92)    [2.3s]        │
│                                                         │
│  Based on the trial balance, your total revenue for     │
│  June was GMD 2,450,000...                              │
└─────────────────────────────────────────────────────────┘
```

### Implementation

Delegation events are emitted as `agent_activity` SSE events with `action: "delegation_start"`. The UI maintains a local `delegationStack` in component state:

```typescript
type DelegationEvent = {
  type: "delegation_start" | "delegation_progress" | "delegation_end"
  agentId: string
  agentName: string        // "Controller Agent" (human-readable)
  description?: string     // "Querying trial balance..."
  confidence?: number
  durationMs?: number
  error?: string
}

// In ChatMessage component
const [delegations, setDelegations] = useState<DelegationEvent[]>([])

// On delegation_start → push to stack
// On delegation_progress → update last item's description
// On delegation_end → pop from stack, mark completed
```

### Confidence Score Display

Confidence scores are shown as color-coded badges next to the agent name:

| Range | Color | Badge |
|-------|-------|-------|
| ≥ 0.85 | Green | High confidence |
| 0.7–0.85 | Yellow | Moderate |
| 0.5–0.7 | Orange | Low — may need review |
| < 0.5 | Red | Escalating to human |

Badges are shown only when the user has "Show agent details" enabled (default: on). Toggle available in chat settings.

### Conversation History

When viewing older messages, agent activity is stored in `chat_agent_activity` and rendered as collapsible sections. The full delegation tree is reconstructed from stored activity records, not live events.

---

## 6. Error Handling

### Error Categories & Responses

| Error | Detection | User Experience | Recovery |
|-------|-----------|-----------------|----------|
| **Agent crash mid-response** | SSE stream closes without `done` event | Show "Response interrupted. [Retry]" button | Client stores partial content, retry sends original message |
| **LLM API timeout** | LangGraph timeout (60s default) | "The agent is taking longer than expected. Please try again." | Auto-retry once after 5s delay |
| **Response too long** | Token count > 8,000 | Stream continues normally — no user-visible issue | Agent is instructed to chunk long responses; LangGraph handles internally |
| **User sends while agent is processing** | Client checks `isStreaming` state | Input is disabled while streaming. If needed, add "Stop" button to cancel current stream | `AbortController` cancels the fetch, partial response saved as "cancelled" message |
| **Network drop** | SSE `onerror` fires | "Connection lost. Reconnecting..." (auto-reconnect via EventSource) | EventSource auto-reconnects; on reconnect, server resumes from last `id` |
| **Auth expiry mid-stream** | 401 during SSE | "Session expired. Please log in again." | Redirect to login, save draft message in localStorage |
| **Rate limiting** | 429 response | "Too many messages. Please wait a moment." | Exponential backoff, show cooldown timer |
| **File upload fails** | R2 upload error | "File upload failed. Please try again." | Retry upload, message sends without attachment |

### Stream Interruption Handling

```typescript
// Client-side: save partial response on interruption
function handleStreamError(partialContent: string, conversationId: string) {
  // Save what we have as a "failed" message
  if (partialContent.length > 0) {
    trpc.chat.savePartialMessage.mutate({
      conversationId,
      content: partialContent,
      status: "failed"
    })
  }
}

// On retry: include the failed message context
function retryMessage(conversationId: string, failedMessageId: string) {
  // The retry sends the original user message again
  // The failed partial is visible in chat as context
  sendMessage(conversationId, originalUserMessage)
}
```

### Optimistic UI with Rollback

User messages appear instantly (optimistic). If the initial POST fails:

1. User message shows with a red "Failed to send" indicator
2. User can click "Retry" or delete the message
3. Conversation list is not updated until the message is confirmed

---

## 7. Code Patterns

### 7a. Server-Side: SSE Route Handler with LangGraph

```typescript
// apps/web/app/api/chat/stream/route.ts
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { chatMessages, conversations, chatAgentActivity } from "@xenboox/db/schema/chat"
import { eq } from "drizzle-orm"
import { createCfoAgentGraph } from "@xenboox/agents/tier1/cfo-agent/graph"
import { LangChainAdapter } from "ai" // Vercel AI SDK — optional, see note below

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { conversationId, message, entityId } = await req.json()

  // Validate entity access
  const conversation = await db.query.conversations.findFirst({
    where: eq(conversations.id, conversationId)
  })
  if (!conversation || conversation.entityId !== entityId) {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  // Persist user message immediately
  const userMessage = await db.insert(chatMessages).values({
    conversationId,
    role: "user",
    content: message,
    status: "completed"
  }).returning()

  // Update conversation timestamp
  await db.update(conversations)
    .set({ lastMessageAt: new Date(), updatedAt: new Date() })
    .where(eq(conversations.id, conversationId))

  // Load conversation history for LangGraph
  const history = await db.query.chatMessages.findMany({
    where: eq(chatMessages.conversationId, conversationId),
    orderBy: (messages, { asc }) => [asc(messages.createdAt)],
    limit: 50
  })

  const encoder = new TextEncoder()
  const stream = new TransformStream()
  const writer = stream.writable.getWriter()

  // Run agent in background — write to SSE stream
  const agentGraph = createCfoAgentGraph()

  ;(async () => {
    try {
      const eventStream = await agentGraph.astreamEvents(
        {
          messages: history.map(m => ({
            role: m.role,
            content: m.content ?? ""
          })),
          entityId,
          userId: session.user.id,
          conversationId,
        },
        { version: "v2" }
      )

      let fullContent = ""
      const startTime = Date.now()

      for await (const event of eventStream) {
        // LLM token events
        if (event.event === "on_chat_model_stream" && event.data?.chunk?.content) {
          const token = typeof event.data.chunk.content === "string"
            ? event.data.chunk.content
            : ""
          if (token) {
            fullContent += token
            await writer.write(
              encoder.encode(`event: token\ndata: ${JSON.stringify({ type: "token", content: token })}\n\n`)
            )
          }
        }

        // Tool call / agent activity events
        if (event.event === "on_tool_start") {
          await writer.write(
            encoder.encode(`event: agent_activity\ndata: ${JSON.stringify({
              type: "agent_activity",
              agent: event.name,
              status: "called",
              description: `Running ${event.name}...`
            })}\n\n`)
          )
        }

        if (event.event === "on_tool_end") {
          await writer.write(
            encoder.encode(`event: agent_activity\ndata: ${JSON.stringify({
              type: "agent_activity",
              agent: event.name,
              status: "completed",
              output: event.data?.output
            })}\n\n`)
          )
        }

        // Delegation events (CFO → child agent)
        if (event.event === "on_chain_start" && event.name?.includes("-agent")) {
          await writer.write(
            encoder.encode(`event: delegation\ndata: ${JSON.stringify({
              type: "delegation",
              from: "cfo-agent",
              to: event.name,
              reason: event.data?.input?.reason ?? "Processing request"
            })}\n\n`)
          )
        }
      }

      // Persist final assistant message
      const assistantMessage = await db.insert(chatMessages).values({
        conversationId,
        role: "assistant",
        content: fullContent,
        status: "completed",
        latencyMs: Date.now() - startTime,
        agentModel: "claude-sonnet-4.6",
        metadata: { tokenCount: fullContent.split(" ").length * 1.3 } // rough estimate
      }).returning()

      // Send done event
      await writer.write(
        encoder.encode(`event: done\ndata: ${JSON.stringify({
          type: "done",
          messageId: assistantMessage.id,
          confidence: 0.91
        })}\n\n`)
      )

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      await writer.write(
        encoder.encode(`event: error\ndata: ${JSON.stringify({
          type: "error",
          code: "AGENT_ERROR",
          message: "Something went wrong. Please try again."
        })}\n\n`)
      )

      // Log full error to LangFuse
      console.error("[ChatStream] Agent error:", error)

    } finally {
      await writer.close()
    }
  })()

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",  // Disable nginx buffering
    }
  })
}
```

> **Note:** This example uses raw `astreamEvents` from LangGraph. If using the Vercel AI SDK's `streamText` or `StreamingTextResponse`, the pattern simplifies to `LangChainAdapter.toDataStreamResponse()`. Choose based on whether you need LangGraph's full event stream (for delegation visibility) or just text tokens.

### 7b. Client-Side: SSE Consumption Hook

```typescript
// apps/web/lib/hooks/use-chat-stream.ts
"use client"

import { useCallback, useRef, useState } from "react"

type StreamEvent =
  | { type: "token"; content: string }
  | { type: "agent_activity"; agent: string; status: string; description?: string; confidence?: number; duration_ms?: number }
  | { type: "delegation"; from: string; to: string; reason: string }
  | { type: "done"; messageId: string; confidence: number }
  | { type: "error"; code: string; message: string }

type UseChatStreamOptions = {
  conversationId: string
  entityId: string
  onToken?: (token: string) => void
  onAgentActivity?: (activity: StreamEvent & { type: "agent_activity" }) => void
  onDelegation?: (delegation: StreamEvent & { type: "delegation" }) => void
  onDone?: (messageId: string, confidence: number) => void
  onError?: (code: string, message: string) => void
}

export function useChatStream(options: UseChatStreamOptions) {
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamedContent, setStreamedContent] = useState("")
  const abortControllerRef = useRef<AbortController | null>(null)

  const sendMessage = useCallback(async (message: string) => {
    if (isStreaming) return

    setIsStreaming(true)
    setStreamedContent("")
    abortControllerRef.current = new AbortController()

    try {
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: options.conversationId,
          message,
          entityId: options.entityId
        }),
        signal: abortControllerRef.current.signal
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error("No response body")

      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() ?? ""

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            var eventType = line.slice(7).trim()
          }
          if (line.startsWith("data: ")) {
            const data = JSON.parse(line.slice(6)) as StreamEvent

            switch (data.type) {
              case "token":
                setStreamedContent(prev => prev + data.content)
                options.onToken?.(data.content)
                break
              case "agent_activity":
                options.onAgentActivity?.(data as any)
                break
              case "delegation":
                options.onDelegation?.(data as any)
                break
              case "done":
                options.onDone?.(data.messageId, data.confidence)
                break
              case "error":
                options.onError?.(data.code, data.message)
                break
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        // User cancelled — save partial content
        options.onError?.("CANCELLED", "Response cancelled")
      } else {
        options.onError?.("NETWORK_ERROR", "Connection lost. Please try again.")
      }
    } finally {
      setIsStreaming(false)
    }
  }, [options.conversationId, options.entityId, isStreaming])

  const stopStream = useCallback(() => {
    abortControllerRef.current?.abort()
  }, [])

  return { sendMessage, stopStream, isStreaming, streamedContent }
}
```

### 7c. React Streaming Text Component

```typescript
// apps/web/components/chat/streaming-text.tsx
"use client"

import { useEffect, useRef } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

type StreamingTextProps = {
  content: string
  isStreaming: boolean
  className?: string
}

export function StreamingText({ content, isStreaming, className }: StreamingTextProps) {
  const contentRef = useRef<HTMLDivElement>(null)

  // Auto-scroll within the message as tokens arrive
  useEffect(() => {
    if (isStreaming && contentRef.current) {
      contentRef.current.scrollIntoView({ behavior: "smooth", block: "end" })
    }
  }, [content, isStreaming])

  return (
    <div ref={contentRef} className={className}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
      {isStreaming && (
        <span className="inline-block w-2 h-4 ml-0.5 bg-current animate-pulse align-text-bottom">
          ▌
        </span>
      )}
    </div>
  )
}
```

### 7d. Agent Activity Indicator

```typescript
// apps/web/components/chat/agent-activity-indicator.tsx
"use client"

type AgentActivity = {
  agent: string
  status: "called" | "completed"
  description?: string
  confidence?: number
  duration_ms?: number
}

const AGENT_DISPLAY_NAMES: Record<string, string> = {
  "cfo-agent": "CFO Agent",
  "controller-agent": "Controller Agent",
  "treasury-agent": "Treasury Agent",
  "payroll-manager-agent": "Payroll Manager",
  "compliance-agent": "Compliance Agent",
  "ledger-agent": "Ledger Agent",
  "reporting-agent": "Reporting Agent",
  "analytics-agent": "Analytics Agent",
  "document-agent": "Document Agent",
}

export function AgentActivityIndicator({ activities }: { activities: AgentActivity[] }) {
  if (activities.length === 0) return null

  const activeCalls = activities.filter(a => a.status === "called")
  const currentAgent = activeCalls[activeCalls.length - 1]

  if (!currentAgent) return null

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground py-2 px-3 rounded-lg bg-muted/50">
      <div className="flex gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse [animation-delay:150ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse [animation-delay:300ms]" />
      </div>
      <span>
        {AGENT_DISPLAY_NAMES[currentAgent.agent] ?? currentAgent.agent}
        {" is working..."}
      </span>
      {currentAgent.description && (
        <span className="text-xs opacity-70">
          — {currentAgent.description}
        </span>
      )}
    </div>
  )
}
```

### 7e. Complete Chat Page Integration

```typescript
// apps/web/app/(dashboard)/chat/page.tsx
"use client"

import { useState } from "react"
import { useChatStream } from "@/lib/hooks/use-chat-stream"
import { StreamingText } from "@/components/chat/streaming-text"
import { AgentActivityIndicator } from "@/components/chat/agent-activity-indicator"

export default function ChatPage() {
  const [messages, setMessages] = useState<Array<{
    id: string; role: "user" | "assistant"; content: string
  }>>([])
  const [activities, setActivities] = useState<any[]>([])

  const { sendMessage, stopStream, isStreaming, streamedContent } = useChatStream({
    conversationId: "conv-123",
    entityId: "entity-456",
    onToken: () => {},
    onAgentActivity: (activity) => {
      setActivities(prev => [...prev, activity])
    },
    onDone: (messageId, confidence) => {
      setMessages(prev => [...prev, {
        id: messageId,
        role: "assistant",
        content: streamedContent
      }])
      setActivities([])
    },
    onError: (code, message) => {
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: `⚠️ ${message}`
      }])
      setActivities([])
    }
  })

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(msg => (
          <div key={msg.id} className={msg.role === "user" ? "text-right" : ""}>
            <StreamingText content={msg.content} isStreaming={false} />
          </div>
        ))}
        {isStreaming && (
          <div>
            <StreamingText content={streamedContent} isStreaming={true} />
            <AgentActivityIndicator activities={activities} />
          </div>
        )}
      </div>
      <ChatInput
        onSend={(msg) => {
          setMessages(prev => [...prev, {
            id: `user-${Date.now()}`,
            role: "user",
            content: msg
          }])
          sendMessage(msg)
        }}
        disabled={isStreaming}
        onStop={stopStream}
      />
    </div>
  )
}
```

---

## 8. Conversation Initialization

### First Message Flow

When a user opens the chat for the first time or starts a new conversation:

1. Client calls `trpc.chat.createConversation.mutate({ entityId })` → returns `conversationId`
2. Client renders empty chat with a suggested prompt: "Ask me about your financial position..."
3. User sends first message → triggers the full streaming flow above
4. Title auto-generated from first 80 chars of user's message (or by CFO Agent summarizing it)

### Conversation Resumption

On page load:
1. Fetch latest conversations via `trpc.chat.listConversations.query({ entityId })`
2. Load selected conversation's messages via `trpc.chat.getMessages.query({ conversationId })`
3. Messages rendered statically (no streaming state) — only the latest assistant message shows streaming if `status === "streaming"`

---

## 9. Push Notifications for Async Tasks

For long-running tasks (month-end close, report generation) that complete after the stream ends:

```typescript
// When Trigger.dev job completes:
import { db } from "@xenboox/db"
import { chatMessages } from "@xenboox/db/schema/chat"

// Insert a system message into the conversation
await db.insert(chatMessages).values({
  conversationId: longRunningTask.conversationId,
  role: "system",
  content: JSON.stringify({
    type: "task_complete",
    task: "month_end_close",
    period: "2026-06",
    summary: "June close completed. All departments confirmed.",
    reportUrl: "/reports/june-2026"
  }),
  status: "completed"
})

// Client polls for new messages every 30s when conversation is open
// Or: use Vercel Pusher/Ably for real-time if needed
```

---

## 10. Security Considerations

| Concern | Mitigation |
|---------|------------|
| SSE keeps connection open | Set max stream duration to 120s; auto-close after |
| User could send XSS via chat input | Render all assistant content via `react-markdown` (sanitizes HTML) |
| File uploads in chat | Max 10MB, validate MIME type, strip EXIF from images |
| Conversation data leakage | RLS enforced at DB level; every query filtered by `entityId` |
| Prompt injection | CFO Agent system prompt includes hard boundaries; user input is placed in `HumanMessage` role only |
| Streaming partial content | If stream is interrupted, partial content is stored with `status: "failed"` — never shown as complete |

---

*Last updated: July 2026*
*Reference: ARCHITECTURE.md §6 (Agent Architecture), DATABASE.md §11 (Audit & Activity), docs/agents/cfo-agent.md*
