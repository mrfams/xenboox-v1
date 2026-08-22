import { rlsProtectedProcedure } from "@/lib/trpc/server";
import { formatCurrency } from "@/lib/utils";

/**
 * Generates a natural language briefing from real financial data and
 * pending items. Uses Haiku for speed. Cached for 5 minutes per entity.
 */
export const getAiBriefing = rlsProtectedProcedure.query(async ({ ctx }) => {
  const { entityId } = ctx;
  const now = new Date();
  const cacheKey = `briefing:${entityId}`;

  // Check Redis cache (5-minute TTL)
  try {
    const { Redis } = await import("@upstash/redis");
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL ?? "",
      token: process.env.UPSTASH_REDIS_REST_TOKEN ?? "",
    });
    const cached = await redis.get(cacheKey);
    if (cached) {
      return cached;
    }
  } catch {
    // Redis unavailable — proceed without cache
  }

  // Gather financial context
  const { dashboardRouter } = await import("./index");
  const dashboardData = await (dashboardRouter as any).getDashboardData.query({
    ctx: { entityId, userId: ctx.userId },
  });

  const { businessHealth, pendingApprovalsCount, deadlines } = dashboardData;
  const { cashBalance, runwayMonths } = businessHealth;

  // Gather pending items
  const { agentApprovals } = await import("@xenboox/db/schema");
  const { db } = await import("@xenboox/db");
  const { eq, count } = await import("drizzle-orm");

  const pendingItems = await db
    .select({ count: count() })
    .from(agentApprovals)
    .where(eq(agentApprovals.entityId, entityId));

  const pendingCount = pendingItems[0]?.count ?? 0;

  // Build context for AI
  const context = [
    `Current date: ${now.toLocaleDateString()}`,
    `Cash balance: ${cashBalance ?? "unknown"}`,
    `Runway: ${runwayMonths ? `${runwayMonths.toFixed(1)} months` : "unknown"}`,
    `Pending approvals: ${pendingCount}`,
    `Upcoming deadlines: ${deadlines.length}`,
    `Deadlines: ${deadlines.map((d: any) => d.label).join(", ") || "none"}`,
  ].join("\n");

  // Try AI generation
  try {
    const { ChatAnthropic } = await import("@langchain/anthropic");
    const model = new ChatAnthropic({
      model: "claude-3-5-haiku-20241022",
      temperature: 0.3,
      maxTokens: 300,
    });

    const systemPrompt = `You are a CFO AI assistant providing a proactive briefing.

Generate a concise, actionable briefing based on the financial context below.
Format:
- 2-3 sentences max
- Start with the most important thing
- Include specific numbers
- End with 1-2 recommended actions
- Use plain English, no jargon
- Be direct and confident

If everything is good, say so briefly and mention one thing to watch.`;

    const response = await model.invoke([
      { role: "system", content: systemPrompt },
      { role: "user", content: `Financial context:\n${context}` },
    ]);

    const text =
      typeof response.content === "string"
        ? response.content
        : response.content.map((c: any) => c.text).join("");

    const briefing = {
      text,
      confidence: 0.85,
      generatedAt: now.toISOString(),
      type: "ai" as const,
      actions: [
        pendingCount > 0
          ? { label: "Review pending items", href: "/dashboard/activity-hub" }
          : null,
        deadlines.length > 0
          ? { label: "Check deadlines", href: "/dashboard/operations" }
          : null,
        { label: "Open Command Center", href: "/dashboard" },
      ].filter(Boolean),
    };

    // Cache for 5 minutes
    try {
      const { Redis } = await import("@upstash/redis");
      const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL ?? "",
        token: process.env.UPSTASH_REDIS_REST_TOKEN ?? "",
      });
      await redis.set(cacheKey, briefing, { ex: 300 });
    } catch {
      // Redis unavailable — skip caching
    }

    return briefing;
  } catch (error) {
    // Fallback to assembled briefing
    const parts: string[] = [];

    if (cashBalance !== undefined) {
      parts.push(`Your cash position is ${formatCurrency(cashBalance)}`);
      if (runwayMonths !== null && runwayMonths !== undefined) {
        parts.push(`with ${runwayMonths.toFixed(1)} months runway`);
      }
      parts.push(".");
    }

    if (pendingCount > 0) {
      parts.push(
        `You have ${pendingCount} item${pendingCount > 1 ? "s" : ""} awaiting your approval.`,
      );
    }

    if (deadlines.length > 0) {
      parts.push(
        `${deadlines.length} deadline${deadlines.length > 1 ? "s" : ""} upcoming.`,
      );
    }

    if (parts.length === 0) {
      parts.push("All clear — nothing needs your attention right now.");
    }

    return {
      text: parts.join(" "),
      confidence: 0.5,
      generatedAt: now.toISOString(),
      type: "assembled" as const,
      actions: [{ label: "Open Command Center", href: "/dashboard" }],
    };
  }
});
