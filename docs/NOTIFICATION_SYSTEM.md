# NOTIFICATION_SYSTEM.md — Notification Architecture & Delivery

> Design for Xenboox's multi-channel notification system.
> Covers email (Resend), in-app, and future push channels through a unified delivery pipeline.

---

## 1. Notification Types

| Type | Trigger | Urgency | Digest Eligible | Channels |
|------|---------|---------|----------------|----------|
| **close_complete** | Month-end close finishes | Medium | Yes | Email, In-app |
| **close_failed** | Close job errors out | High | No | Email, In-app |
| **overdue_invoice** | Invoice past due date | Medium | Yes | Email, In-app |
| **invoice_reminder** | N days before due | Low | Yes | Email |
| **budget_alert** | Budget utilization > threshold | Medium | Yes | In-app, Email |
| **budget_exceeded** | Budget fully consumed | High | No | Email, In-app |
| **agent_escalation** | Agent confidence < 0.4 | High | No | Email, In-app |
| **agent_flag** | Agent confidence 0.4–0.7 | Low | Yes | In-app |
| **system_alert** | Infrastructure issue | Critical | No | Email, SMS (future) |
| **recon_discrepancy** | Bank reconciliation mismatch | High | No | Email, In-app |
| **payroll_processed** | Payroll run completed | Low | Yes | Email, In-app |
| **report_ready** | Report generation done | Low | Yes | In-app, Email |

### Notification Priority Levels

```
CRITICAL → Delivered immediately, all channels, cannot be disabled
HIGH     → Delivered immediately, user can disable per type
MEDIUM   → Real-time by default, user can opt into digest
LOW      → Digest-only by default, real-time optional
```

---

## 2. Delivery Channels

### Channel Matrix

| Channel | Status | Library | Notes |
|---------|--------|---------|-------|
| In-app | ✅ Active | Custom toast + bell icon | Always delivered, no opt-out |
| Email | ✅ Active | Resend SDK | Templates in React Email |
| Push | 🔄 Future | Web Push API / FCM | Mobile app only |
| SMS | 🔄 Future | Twilio / Africa's Talking | Critical alerts only |

### Channel Router Logic

```typescript
// packages/notifications/channel-router.ts
type Notification = {
  type: string
  priority: "critical" | "high" | "medium" | "low"
  userId: string
  entityId: string
  title: string
  body: string
  data?: Record<string, unknown>
}

const CHANNEL_PRIORITY: Record<string, Set<Channel>> = {
  critical: new Set(["email", "in-app"]),
  high:     new Set(["email", "in-app"]),
  medium:   new Set(["email", "in-app"]),
  low:      new Set(["in-app"]),
}

export async function routeNotification(notif: Notification) {
  const prefs = await getUserPreferences(notif.userId)
  const channels = CHANNEL_PRIORITY[notif.priority]

  for (const channel of channels) {
    if (prefs.disabledChannels[notif.type]?.includes(channel)) continue
    if (prefs.digestEnabled[notif.type] && channel === "email") continue

    switch (channel) {
      case "email":
        await sendEmailNotification(notif)
        break
      case "in-app":
        await createInAppNotification(notif)
        break
    }
  }
}
```

### In-App Delivery

Notifications delivered via tRPC subscription (polling fallback):

```typescript
// Client-side hook
export function useNotifications() {
  const utils = trpc.useUtils()

  // Poll every 30s for unread count
  const { data: unreadCount } = trpc.notifications.unreadCount.useQuery(
    { entityId },
    { refetchInterval: 30_000 }
  )

  // List with cursor pagination
  const { data: notifications } = trpc.notifications.list.useInfiniteQuery(
    { entityId, limit: 20 },
    { getNextPageParam: (last) => last.nextCursor }
  )

  return { notifications, unreadCount }
}
```

---

## 3. User Preferences Schema

```typescript
// packages/db/schema/notifications.ts
import { pgTable, uuid, text, timestamp, jsonb, boolean, pgEnum } from "drizzle-orm/pg-core"
import { users } from "./organization"

export const notificationTypeEnum = pgEnum("notification_type", [
  "close_complete", "close_failed", "overdue_invoice", "invoice_reminder",
  "budget_alert", "budget_exceeded", "agent_escalation", "agent_flag",
  "system_alert", "recon_discrepancy", "payroll_processed", "report_ready",
])

export const deliveryChannelEnum = pgEnum("delivery_channel", [
  "email", "in-app", "push", "sms",
])

export const notificationPreferences = pgTable("notification_preferences", {
  id:          uuid("id").primaryKey().defaultRandom(),
  userId:      uuid("user_id").notNull().references(() => users.id),
  entityId:    uuid("entity_id"),
  preferences: jsonb("preferences").notNull().default({
    close_complete:     { channels: ["email", "in-app"], digest: false },
    overdue_invoice:    { channels: ["email", "in-app"], digest: true },
    invoice_reminder:   { channels: ["email"],          digest: true },
    budget_alert:       { channels: ["email", "in-app"], digest: true },
    budget_exceeded:    { channels: ["email", "in-app"], digest: false },
    agent_escalation:   { channels: ["email", "in-app"], digest: false },
    agent_flag:         { channels: ["in-app"],          digest: true },
    system_alert:       { channels: ["email", "in-app"], digest: false },
    recon_discrepancy:  { channels: ["email", "in-app"], digest: false },
    payroll_processed:  { channels: ["email"],           digest: true },
    report_ready:       { channels: ["in-app", "email"], digest: true },
  }),
  digestFrequency: text("digest_frequency").default("daily"), // daily | weekly | never
  digestTime:      text("digest_time").default("08:00"),
  quietHoursStart: text("quiet_hours_start"),  // "22:00" — no non-critical notifications
  quietHoursEnd:   text("quiet_hours_end"),    // "07:00"
  createdAt:       timestamp("created_at").notNull().defaultNow(),
  updatedAt:       timestamp("updated_at").notNull().defaultNow(),
})
```

Default preferences are set on user creation. Overrides per notification type, per channel.

---

## 4. Notifications Table

```typescript
// packages/db/schema/notifications.ts (continued)
export const notificationStatusEnum = pgEnum("notification_status", [
  "pending", "sent", "failed", "read", "archived",
])

export const notifications = pgTable("notifications", {
  id:          uuid("id").primaryKey().defaultRandom(),
  entityId:    uuid("entity_id").notNull(),
  userId:      uuid("user_id").notNull().references(() => users.id),
  type:        notificationTypeEnum("type").notNull(),
  priority:    text("priority").notNull(),  // critical | high | medium | low
  title:       text("title").notNull(),
  body:        text("body").notNull(),
  data:        jsonb("data").default({}),    // Payload for deep-linking
  channel:     deliveryChannelEnum("channel").notNull(),
  status:      notificationStatusEnum("status").notNull().default("pending"),
  readAt:      timestamp("read_at"),
  deliveredAt: timestamp("delivered_at"),
  failedAt:    timestamp("failed_at"),
  error:       text("error"),
  digestBatch: text("digest_batch"),         // UUID linking grouped digest notifications
  createdAt:   timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("notifications_user_idx").on(table.userId),
  index("notifications_entity_idx").on(table.entityId),
  index("notifications_status_idx").on(table.status),
  index("notifications_created_idx").on(table.createdAt),
  index("notifications_digest_batch_idx").on(table.digestBatch),
])
```

RLS scoped by entity:

```sql
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY entity_isolation ON notifications
  USING (entity_id = current_setting('app.current_entity_id')::UUID);
```

---

## 5. Digest vs Real-Time Decision

### Rules

1. **CRITICAL + HIGH** priority notifications → always real-time
2. **MEDIUM** priority → real-time by default, user can move to digest
3. **LOW** priority → digest by default, user can enable real-time
4. **Quiet hours** (22:00–07:00) → batch all non-critical into morning digest

### Digest Generation (Trigger.dev Job)

```typescript
// packages/notifications/digest-job.ts
import { task } from "@trigger.dev/sdk"
import { db } from "@xenboox/db"
import { notifications, notificationPreferences } from "@xenboox/db/schema"
import { and, eq, gte, lte, sql } from "drizzle-orm"

export const sendDailyDigest = task({
  id: "send-daily-digest",
  maxDuration: 120,
  cron: "0 8 * * *",  // Run daily at 08:00

  run: async () => {
    // Find all users with daily digest enabled
    const users = await db.query.notificationPreferences.findMany({
      where: eq(notificationPreferences.digestFrequency, "daily"),
    })

    for (const pref of users) {
      const digestNotifs = await db.query.notifications.findMany({
        where: and(
          eq(notifications.userId, pref.userId),
          eq(notifications.status, "pending"),
          gte(notifications.createdAt, sql`NOW() - INTERVAL '24 hours'`),
        ),
      })

      if (digestNotifs.length === 0) continue

      // Group by type
      const grouped = groupBy(digestNotifs, (n) => n.type)

      // Mark as batched
      const batchId = crypto.randomUUID()
      await db.update(notifications)
        .set({ digestBatch: batchId })
        .where(eq(notifications.userId, pref.userId))

      // Send single email with all notifications
      await sendDigestEmail(pref.userId, grouped)
    }
  },
})
```

### Email Digest Template

```tsx
// packages/email/emails/daily-digest.tsx
import { Html, Body, Container, Heading, Text, Section, Row, Col } from "@react-email/components"

type DigestItem = {
  type: string
  count: number
  items: Array<{ title: string; body: string }>
}

export function DailyDigest({ items, userName }: { items: DigestItem[]; userName: string }) {
  return (
    <Html>
      <Body>
        <Container>
          <Heading>Your Xenboox Daily Digest</Heading>
          <Text>Hi {userName}, here's what happened yesterday:</Text>
          {items.map((group) => (
            <Section key={group.type}>
              <Heading as="h2">{group.type.replace("_", " ")} ({group.count})</Heading>
              {group.items.map((item, i) => (
                <Row key={i}>
                  <Col><Text>{item.title}</Text></Col>
                </Row>
              ))}
            </Section>
          ))}
        </Container>
      </Body>
    </Html>
  )
}
```

---

## 6. Email Templates (React Email)

All emails use `react-email` for type-safe, responsive templates rendered server-side via Resend.

### Close Complete

```tsx
// packages/email/emails/close-complete.tsx
import { Html, Body, Container, Heading, Text, Button, Section } from "@react-email/components"

type CloseCompleteProps = {
  entityName: string
  month: string
  year: number
  reportUrl: string
  summary: {
    revenue: string
    expenses: string
    netIncome: string
    totalAssets: string
  }
}

export function CloseCompleteEmail(props: CloseCompleteProps) {
  return (
    <Html>
      <Body>
        <Container>
          <Heading>Month-End Close Complete</Heading>
          <Text>{props.entityName} — {props.month} {props.year}</Text>
          <Section>
            <Text>Revenue: {props.summary.revenue}</Text>
            <Text>Expenses: {props.summary.expenses}</Text>
            <Text>Net Income: {props.summary.netIncome}</Text>
          </Section>
          <Button href={props.reportUrl}>View Full Report</Button>
        </Container>
      </Body>
    </Html>
  )
}
```

### Invoice Overdue Reminder

```tsx
// packages/email/emails/invoice-overdue.tsx
type InvoiceOverdueProps = {
  customerName: string
  invoiceNumber: string
  amount: string
  dueDate: string
  daysOverdue: number
  invoiceUrl: string
}

export function InvoiceOverdueEmail(props: InvoiceOverdueProps) {
  return (
    <Html>
      <Body>
        <Container>
          <Heading>Invoice Overdue</Heading>
          <Text>Invoice {props.invoiceNumber} from {props.customerName}</Text>
          <Text>Amount: {props.amount}</Text>
          <Text>Due: {props.dueDate} ({props.daysOverdue} days overdue)</Text>
          <Button href={props.invoiceUrl}>View Invoice</Button>
        </Container>
      </Body>
    </Html>
  )
}
```

### Agent Escalation

```tsx
// packages/email/emails/agent-escalation.tsx
type AgentEscalationProps = {
  agentName: string
  entityName: string
  taskDescription: string
  confidence: number
  reasoning: string
  reviewUrl: string
}

export function AgentEscalationEmail(props: AgentEscalationProps) {
  return (
    <Html>
      <Body>
        <Container>
          <Heading>Agent Requires Your Review</Heading>
          <Text>
            {props.agentName} has flagged a task requiring human review.
          </Text>
          <Section>
            <Text>Task: {props.taskDescription}</Text>
            <Text>Entity: {props.entityName}</Text>
            <Text>Confidence: {(props.confidence * 100).toFixed(0)}%</Text>
            <Text>Reasoning: {props.reasoning}</Text>
          </Section>
          <Button href={props.reviewUrl}>Review in Dashboard</Button>
        </Container>
      </Body>
    </Html>
  )
}
```

### Sending via Resend

```typescript
// packages/email/send.ts
import { Resend } from "resend"
import { render } from "@react-email/components"
import { CloseCompleteEmail } from "./emails/close-complete"

const resend = new Resend(process.env.RESEND_API_KEY)

type SendEmailParams = {
  to: string | string[]
  subject: string
  template: React.ReactElement
}

export async function sendEmail({ to, subject, template }: SendEmailParams) {
  const { data, error } = await resend.emails.send({
    from: "Xenboox <notifications@xenboox.com>",
    to: Array.isArray(to) ? to : [to],
    subject,
    html: render(template),
  })

  if (error) throw error
  return data
}
```

---

## 7. CFO Agent Escalation → Human

When an agent's confidence falls below 0.4, it escalates through the hierarchy. The final escalation to a human follows this flow:

```
Tier 3 Agent (confidence < 0.4)
    → Tier 2 Supervisor (Controller/Treasury/etc)
        → Tier 1 CFO Agent
            → Human (Finance Director / Org Owner)
```

### Escalation Handler

```typescript
// packages/agents/core/escalation.ts
import { db } from "@xenboox/db"
import { notifications } from "@xenboox/db/schema"
import { sendEmail } from "@xenboox/email/send"
import { AgentEscalationEmail } from "@xenboox/email/emails/agent-escalation"

type Escalation = {
  agentId: string
  entityId: string
  taskDescription: string
  confidence: number
  reasoning: string
  context: Record<string, unknown>
}

export async function escalateToHuman(escalation: Escalation) {
  // 1. Find the finance director / org owner for this entity
  const approvers = await db.query.userEntityAccess.findMany({
    where: and(
      eq(userEntityAccess.entityId, escalation.entityId),
      inArray(userEntityAccess.role, ["finance_director", "org_admin", "org_owner"]),
    ),
    with: { user: true },
  })

  // 2. Create in-app notifications for all approvers
  for (const approver of approvers) {
    await db.insert(notifications).values({
      entityId: escalation.entityId,
      userId: approver.userId,
      type: "agent_escalation",
      priority: "high",
      title: `${escalation.agentId} needs review`,
      body: escalation.reasoning,
      data: escalation.context as Record<string, unknown>,
      channel: "in-app",
      status: "sent",
      deliveredAt: new Date(),
    })
  }

  // 3. Send email to primary approver
  const primary = approvers[0]
  if (primary?.user.email) {
    await sendEmail({
      to: primary.user.email,
      subject: `[Xenboox] ${escalation.agentId} requires your review`,
      template: AgentEscalationEmail({
        agentName: escalation.agentId,
        entityName: escalation.entityId,
        taskDescription: escalation.taskDescription,
        confidence: escalation.confidence,
        reasoning: escalation.reasoning,
        reviewUrl: `${process.env.NEXT_PUBLIC_APP_URL}/entity/${escalation.entityId}/escalations/${escalation.agentId}`,
      }),
    })
  }

  // 4. Log to LangFuse
  await langfuse.trace({
    name: "escalation-to-human",
    metadata: {
      agentId: escalation.agentId,
      entityId: escalation.entityId,
      confidence: escalation.confidence,
      approversNotified: approvers.length,
    },
    input: escalation.taskDescription,
    output: escalation.reasoning,
  })
}
```

---

## 8. Rate Limiting

### Per-User Limits

| Granularity | Limit | Enforcement |
|-------------|-------|-------------|
| Same notification type | 1 per 5 min per user | Prevents duplicate alerts |
| Email total | 20 per hour per user | Resend API limit compliance |
| In-app total | No limit | Database is the bottleneck |
| Agent escalation | 3 per hour per entity | Prevents escalation storms |

### Rate Limiter Implementation

```typescript
// packages/notifications/rate-limiter.ts
import { db } from "@xenboox/db"
import { notifications } from "@xenboox/db/schema"
import { and, eq, gte, sql } from "drizzle-orm"

type RateLimitRule = {
  type: string
  windowMs: number
  maxCount: number
  scope: "user" | "entity" | "global"
}

const RATE_LIMITS: RateLimitRule[] = [
  { type: "agent_escalation", windowMs: 300_000, maxCount: 1, scope: "user" },
  { type: "overdue_invoice",  windowMs: 300_000, maxCount: 1, scope: "user" },
  { type: "email_total",      windowMs: 3_600_000, maxCount: 20, scope: "user" },
  { type: "agent_escalation", windowMs: 3_600_000, maxCount: 3, scope: "entity" },
]

export async function checkRateLimit(
  userId: string,
  entityId: string,
  type: string,
): Promise<{ allowed: boolean; retryAfterMs: number }> {
  const rules = RATE_LIMITS.filter((r) => r.type === type || r.type === "email_total")

  for (const rule of rules) {
    const scopeId = rule.scope === "user" ? userId : entityId
    const column = rule.scope === "user" ? notifications.userId : notifications.entityId

    const count = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(
        and(
          eq(column, scopeId),
          eq(notifications.type, type === "email_total" ? notifications.type : type as any),
          gte(notifications.createdAt, sql`NOW() - INTERVAL '${sql.raw(String(rule.windowMs / 1000))} seconds'`),
        ),
      )

    if (count[0].count >= rule.maxCount) {
      return { allowed: false, retryAfterMs: rule.windowMs }
    }
  }

  return { allowed: true, retryAfterMs: 0 }
}
```

### Email Batching

To avoid flooding users during bulk operations (e.g., 50 overdue invoices discovered at once):

```typescript
// Batch overdue invoice notifications into a single email
export async function sendBulkInvoiceNotifications(invoices: Invoice[], entityId: string) {
  const users = await getEntityFinanceUsers(entityId)

  for (const user of users) {
    // Check rate limit
    const { allowed } = await checkRateLimit(user.id, entityId, "email_total")
    if (!allowed) continue

    // Send one email with all overdue invoices listed
    await sendEmail({
      to: user.email,
      subject: `${invoices.length} invoices require attention`,
      template: BulkInvoiceDigestEmail({
        userName: user.name,
        overdueCount: invoices.length,
        totalAmount: formatCurrency(invoices.reduce((s, i) => s + i.amount, 0)),
        invoices: invoices.map(i => ({
          number: i.invoiceNumber,
          customer: i.customerName,
          amount: formatCurrency(i.amount),
          dueDate: i.dueDate,
        })),
      }),
    })
  }
}
```

---

## 9. Notification Template Registry

```typescript
// packages/notifications/templates.ts
import { z } from "zod"

// Every notification type has a schema for its data payload
export const notificationSchemas = {
  close_complete: z.object({
    month: z.number(),
    year: z.number(),
    reportUrl: z.string().url(),
    summary: z.object({
      revenue: z.string(),
      expenses: z.string(),
      netIncome: z.string(),
    }),
  }),
  overdue_invoice: z.object({
    invoiceId: z.string().uuid(),
    customerName: z.string(),
    invoiceNumber: z.string(),
    amount: z.string(),
    dueDate: z.string(),
    daysOverdue: z.number(),
  }),
  agent_escalation: z.object({
    agentId: z.string(),
    taskDescription: z.string(),
    confidence: z.number().min(0).max(1),
    reasoning: z.string(),
  }),
  system_alert: z.object({
    severity: z.enum(["warning", "error", "critical"]),
    service: z.string(),
    message: z.string(),
    action: z.string().optional(),
  }),
} as const

// Each template has a title + body pattern
type TemplateDef = {
  title: (data: Record<string, unknown>) => string
  body: (data: Record<string, unknown>) => string
}

export const notificationTemplates: Record<string, TemplateDef> = {
  close_complete: {
    title: () => "Month-End Close Complete",
    body: (d) => `${d.month}/${d.year} close finished. Revenue: ${d.summary.revenue}`,
  },
  overdue_invoice: {
    title: () => "Invoice Overdue",
    body: (d) => `Invoice ${d.invoiceNumber} from ${d.customerName} is ${d.daysOverdue} days overdue`,
  },
  agent_escalation: {
    title: (d) => `${d.agentId} Needs Review`,
    body: (d) => `Confidence: ${(d.confidence * 100).toFixed(0)}%. ${d.reasoning}`,
  },
}
```

---

## 10. Notification Flow (End-to-End)

```
1. Event occurs (close completes, invoice overdue, agent escalates)
        │
2. Notification created in database (status: pending)
        │
3. routeNotification() evaluates:
   ├── User preferences: is this type/channel enabled?
   ├── Rate limit check: within limits?
   └── Channel dispatch
        │
4. For each channel:
   ├── In-App: INSERT into notifications table → client polls/delivers
   ├── Email: Send via Resend with React Email template
   └── Push: (future) via Web Push / FCM
        │
5. On success → status: sent, deliveredAt: now
   On failure → status: failed, error recorded, retry queue
        │
6. User reads → status: read, readAt: now
        │
7. Auto-archive after 90 days
```

---

*Last updated: July 2026*
*Reference: ARCHITECTURE.md §7 (File Upload), docs/STREAMING_CHAT_ARCHITECTURE.md §9 (Push Notifications)*
