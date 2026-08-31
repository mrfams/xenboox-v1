import { NextRequest } from "next/server";

import { streamModel } from "@xenboox/models";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { resolveEntityAccess } from "@/lib/auth/entity-access";
import { getRateLimiter } from "@/lib/security/rate-limiter";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 60;

// ─── Help knowledge base ───────────────────────────────────────────────────
// Mirrors the topic catalog on the Help Center page so the assistant can
// point users at the right module/docs instead of answering from thin air.
// Keep in sync with apps/web/app/dashboard/help/page.tsx TOPICS.

interface HelpKnowledge {
  topic: string;
  path: string;
  description: string;
  keywords: string[];
}

const KNOWLEDGE_BASE: HelpKnowledge[] = [
  {
    topic: "Quickstart",
    path: "/docs/quickstart",
    description:
      "Set up Xenboox and post your first transaction in minutes — create the organization, chart of accounts, and opening balances.",
    keywords: ["setup", "install", "first", "begin", "start", "onboard"],
  },
  {
    topic: "Getting Started",
    path: "/docs/getting-started",
    description:
      "Create your organization, chart of accounts, and opening balances.",
    keywords: ["organization", "entity", "setup", "coa", "accounts"],
  },
  {
    topic: "Module Guides",
    path: "/docs/modules",
    description:
      "Deep dives into AP, AR, Payroll, Treasury, Reports, and more.",
    keywords: ["module", "bills", "invoices", "payroll", "treasury", "reports"],
  },
  {
    topic: "Security & Compliance",
    path: "/docs/security",
    description:
      "Encryption, audit trails, tamper-evident logs, and data protection.",
    keywords: ["security", "encryption", "audit", "compliance", "privacy"],
  },
  {
    topic: "Webhooks & Integrations",
    path: "/docs/webhooks",
    description: "Connect Xenboox to your existing systems in real time.",
    keywords: ["webhook", "integration", "api", "sync", "connect"],
  },
  {
    topic: "Connect a bank account",
    path: "/dashboard/operations",
    description:
      "Link your bank, import statements, and let AI categorize transactions.",
    keywords: ["bank", "account", "import", "statement", "transaction"],
  },
  {
    topic: "Create an invoice",
    path: "/dashboard",
    description:
      "Bill customers, track payments, and convert quotes to invoices.",
    keywords: ["invoice", "bill customer", "sales", "receivables", "quote"],
  },
  {
    topic: "Run payroll",
    path: "/dashboard",
    description:
      "Process a pay run with gross pay, statutory deductions, and net pay.",
    keywords: ["payroll", "salary", "wages", "pay run", "employees"],
  },
  {
    topic: "Reconcile accounts",
    path: "/dashboard/operations",
    description: "Match bank lines to your books and keep balances in check.",
    keywords: ["reconcile", "match", "bank", "balance"],
  },
  {
    topic: "Review agent work",
    path: "/dashboard/activity-hub",
    description: "Approve or reject what the Xenboox agent workforce produces.",
    keywords: ["approve", "review", "activity", "pending", "queue", "agent"],
  },
  {
    topic: "Manage users & roles",
    path: "/dashboard/settings",
    description:
      "Invite teammates, set roles, and control access to your books.",
    keywords: ["users", "team", "roles", "permissions", "invite", "settings"],
  },
  {
    topic: "Automation",
    path: "/dashboard",
    description:
      "Automate bills, invoices, and payroll — ask the AI to set up recurring rules.",
    keywords: ["automation", "recurring", "schedule", "rules", "autopay"],
  },
  {
    topic: "AI Command Center",
    path: "/dashboard",
    description:
      "Chat with the CFO agent — ask questions about your books, and get agent-run workflows.",
    keywords: ["chat", "cfo", "agent", "ask", "command"],
  },
  {
    topic: "Bill-to-PO matching",
    path: "/dashboard",
    description:
      "Match supplier bills to open purchase orders with AI suggestions before approving.",
    keywords: ["bill", "po", "purchase order", "match", "supplier", "ap"],
  },
  {
    topic: "Scenario planning",
    path: "/dashboard/financial-pulse",
    description:
      "Project cash runway under what-if assumptions — revenue growth and expense cuts on your real cash data.",
    keywords: [
      "scenario",
      "what-if",
      "runway",
      "forecast",
      "projection",
      "cash",
    ],
  },
];

function buildSystemPrompt(entityName: string): string {
  const catalog = KNOWLEDGE_BASE.map(
    (k) => `- ${k.topic} — ${k.description} (${k.path})`,
  ).join("\n");

  return `You are the Xenboox Help Assistant for ${entityName} — a friendly, product-aware support guide for the Xenboox accounting platform.

Your job: answer "how do I…" questions with clear, guided, step-by-step instructions. You know exactly how Xenboox works and where every feature lives.

Rules:
- Answer ONLY about Xenboox and accounting workflows inside it. Never invent features that don't exist.
- When the user's question maps to a known topic, give 2–4 concrete steps, then point them to the exact page: "Go to <path>" (use the real dashboard or docs path).
- If the question is about their financial data (balances, invoices, reports), gently explain WHERE in Xenboox they'd find the answer rather than fabricating numbers.
- If you genuinely don't know, say so and suggest asking the CFO agent in the AI Command Center (/dashboard).
- Keep answers concise (under ~180 words), scannable, and friendly. Use short numbered steps where helpful.

Known help topics you can point users to:
${catalog}

You can also mention these surfaces: /dashboard/activity-hub (Activity Hub), /dashboard/financial-pulse (Financial Pulse), /dashboard/ledger (Ledger), /dashboard/operations (Operations), /docs/faq.`;
}

function sse(event: string, data?: Record<string, unknown>): string {
  return `data: ${JSON.stringify({ event, ...(data ?? {}) })}\n\n`;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = await req.json();
  const { question, entityId } = body as {
    question?: string;
    entityId?: string;
  };

  if (!question || !entityId) {
    return new Response(JSON.stringify({ error: "Missing required fields" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (question.length > 2000) {
    return new Response(
      JSON.stringify({ error: "Question is too long (max 2000 chars)" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  // Verify user has access to this entity
  const entityAccess = await resolveEntityAccess(session.user.id!, entityId);
  if (!entityAccess) {
    return new Response(JSON.stringify({ error: "Access denied to this entity" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const entity = await db.query.entities.findFirst({
    where: (entities: any, { eq }: any) => eq(entities.id, entityId),
    columns: { id: true, name: true },
  });
  if (!entity) {
    return new Response(JSON.stringify({ error: "Entity not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Rate limit: 20 help questions per minute per user (lighter than the main
  // chat — help answers are guidance, not full agent pipelines).
  const rate = await getRateLimiter().checkChatStreamRateLimit(
    `help:${session.user.id}`,
  );
  if (!rate.success) {
    return new Response(
      JSON.stringify({
        error:
          "You're asking a lot of questions — please wait a moment before asking another.",
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(
            Math.max(1, rate.reset - Math.floor(Date.now() / 1000)),
          ),
        },
      },
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const push = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          // client disconnected
        }
      };

      push(sse("start", {}));

      try {
        const result = await streamModel({
          agentName: "cfo",
          taskType: "chat_response",
          entityId,
          systemPrompt: buildSystemPrompt(entity.name ?? "your company"),
          messages: [
            {
              role: "user",
              content: question,
            },
          ],
          maxTokens: 600,
          temperature: 0.3,
          onToken: (token) => {
            push(sse("token", { content: token }));
          },
        });

        push(sse("done", { confidence: 1 }));
        logger.info(
          { userId: session.user!.id, entityId, chars: result.content.length },
          "help.assist",
        );
      } catch (error) {
        logger.error({ err: error }, "help.assist.failed");
        push(
          sse("error", {
            message:
              "Sorry, I couldn't answer that right now. Please try again in a moment.",
          }),
        );
      } finally {
        try {
          controller.close();
        } catch {
          // already closed
        }
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
