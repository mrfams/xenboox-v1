// ─── Batch 3 / N32: escalated reviewers see the actual document ─────────────

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const read = (p: string) => readFileSync(path.join(REPO_ROOT, p), "utf8");

describe("N32 document file viewer for escalated review", () => {
  const route = read("apps/web/app/api/documents/[id]/file/route.ts");
  const panel = read("apps/web/components/ingestion/ingestion-review-panel.tsx");

  it("the file route authenticates and verifies entity access before serving", () => {
    expect(route).toContain("const session = await auth()");
    expect(route).toContain("resolveEntityAccess(session.user.id, doc.entityId)");
    // cross-entity probes are indistinguishable from nonexistent documents
    const notFoundCount = (route.match(/404/g) || []).length;
    expect(notFoundCount).toBeGreaterThanOrEqual(3);
    expect(route).not.toContain("403");
  });

  it("serves the file inline with nosniff so reviewers see the real document", () => {
    expect(route).toContain("Content-Disposition");
    expect(route).toContain("inline; filename=");
    expect(route).toContain("GetObjectCommand");
    expect(route).toContain("X-Content-Type-Options");
    expect(route).toContain('"private, max-age=300"');
  });

  it("documents without a stored file return an honest 404", () => {
    expect(route).toContain("This document has no stored file");
    expect(route).toContain("File storage is not configured");
  });

  it("the review panel surfaces a View-document action next to the decision", () => {
    expect(panel).toContain('/api/documents/${documentId}/file');
    expect(panel).toContain("View document");
    expect(panel).toContain('target="_blank"');
  });
});
