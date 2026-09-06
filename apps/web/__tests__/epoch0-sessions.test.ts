// ─── Batch 3 / N25: device/session management (verified same-session) ───────

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const read = (p: string) => readFileSync(path.join(REPO_ROOT, p), "utf8");

describe("N25 device/session management", () => {
  const auth = read("apps/web/server/routers/auth.ts");
  const section = read("apps/web/components/settings/sessions-section.tsx");

  it("listSessions returns the current user's live sessions with isCurrent", () => {
    expect(auth).toContain("listSessions: authProcedure.query");
    expect(auth).toContain("isCurrent: currentSid != null && r.sessionToken === currentSid");
    expect(auth).not.toContain("sessions: rows");
  });

  it("revokeSession is ownership-scoped and protects the current session", () => {
    expect(auth).toContain("input.sessionId");
    expect(auth).toContain("eq(sessions.userId, userId)");
    expect(auth).toContain("use sign out instead");
  });

  it("revokeOtherSessions keeps the current sid alive", () => {
    expect(auth).toContain("revokeOtherSessions: authProcedure.mutation");
    expect(auth).toContain("ne(sessions.sessionToken, currentSid)");
  });

  it("the pre-built UI is now wired to a real backend", () => {
    expect(section).toContain("trpc.auth.listSessions.useQuery");
    expect(section).toContain('revokeMutation.mutate({ sessionId })');
  });
});
