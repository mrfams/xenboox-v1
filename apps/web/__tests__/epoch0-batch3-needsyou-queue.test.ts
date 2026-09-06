// ─── Batch 3 / N19+N20: server-side needs-you queue + batch approve ─────────
// Authored RED-first; Run Phase pending.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

describe("N19 server-side needs-you queue", () => {
  const router = readFileSync("apps/web/server/routers/tasks.ts", "utf8");
  const page = readFileSync("apps/web/app/dashboard/tasks/page.tsx", "utf8");

  it("tasks.needsYou assembles the queue server-side", () => {
    expect(router).toContain("needsYou: rlsProtectedProcedure");
    expect(router).toContain("db.query.agentActivity.findMany");
    expect(router).toContain("db.query.notifications.findMany");
    expect(router).toContain("ne(agentActivity.status, \"resolved\")");
    expect(router).toContain("inArray(notifications.type, decisionTypes)");
  });

  it("the Tasks page no longer stitches three client queries", () => {
    expect(page).toContain("trpc.tasks.needsYou.useQuery");
    expect(page).not.toMatch(/trpc\.ingestion\.listAgentApprovals\.useQuery/);
    expect(page).not.toMatch(/trpc\.notifications\.list\.useQuery/);
  });

  it("the page renders an honest loading state before 'All clear'", () => {
    const needsYouSection = page.slice(
      page.indexOf('section === "needs-you"'),
      page.indexOf("All clear"),
    );
    expect(needsYouSection).toContain("needsYouLoading");
  });
});

describe("N20 batch approve with honest per-item results", () => {
  const page = readFileSync("apps/web/app/dashboard/tasks/page.tsx", "utf8");

  it("batch approve uses allSettled and reports failures separately", () => {
    expect(page).toContain("Promise.allSettled");
    expect(page).toContain("failed — try those again");
  });

  it("ingestion items needing document review are excluded from batch", () => {
    expect(page).toMatch(
      /category === "ingestion" && i\.documentId/,
    );
  });

  it("batch button is disabled while running or when the queue is empty", () => {
    expect(page).toContain("disabled={batchRunning || needsCount === 0}");
  });
});
