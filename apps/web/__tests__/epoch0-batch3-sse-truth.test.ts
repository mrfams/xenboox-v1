// ─── Batch 3 / G2 "Truthful UI" — authored RED-first, Run Phase pending ─────
// Node N18: SSE run visibility + cross-tenant event scoping + runId uniqueness.

import { describe, it, expect } from "vitest";
import { readFileSync as _rfs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// vitest runs with cwd=apps/web; resolve repo-root-relative fixtures.
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const readFileSync = (p: string, enc: BufferEncoding = "utf8") =>
  _rfs(path.join(REPO_ROOT, p), enc);

describe("N18 agent-events SSE scoping", () => {
  const src = readFileSync("apps/web/app/api/agent-events/route.ts", "utf8");

  it("runs query scopes by entityId (writer-set column), no `as any` cast on the predicate", () => {
    expect(src).toContain("eq(opsLiveRuns.entityId, entityId)");
    expect(src).not.toContain("eq(opsLiveRuns.organizationId, entityId) as any");
  });

  it("run events are scoped through the run's entity via subquery", () => {
    expect(src).toContain("inArray(opsLiveRunEvents.runId, entityRunIds)");
    const eventsBlock = src.slice(src.indexOf("opsLiveRunEvents.findMany"));
    expect(eventsBlock).toContain("entityRunIds");
  });

  it("runId is now collision-proof (full taskId)", () => {
    const orch = readFileSync("packages/agents/core/orchestrator.ts", "utf8");
    expect(orch).toContain("RUN-${params.taskId.toUpperCase()}");
    expect(orch).not.toContain("taskId.slice(0, 6)");
  });

  it("schema declares runId unique — collisions previously failed inserts silently", () => {
    const schema = readFileSync("packages/db/schema/ops-live-runs.ts", "utf8");
    expect(schema).toMatch(/runId: text\("run_id"\)\.notNull\(\)\.unique\(\)/);
  });
});
