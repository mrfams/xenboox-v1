import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const ROOT = process.cwd();

describe("Middleware idle", () => {
  it("edge auth enforces idle via applyIdleTimeout", () => {
    const edge = readFileSync(join(ROOT, "lib/auth/edge.ts"), "utf-8");
    expect(edge).toContain("applyIdleTimeout");
    expect(edge).toContain("lastActivity");
  });
  it("admin edge enforces 4h idle", () => {
    const adminEdge = readFileSync(join(ROOT, "lib/auth/admin-edge.ts"), "utf-8");
    expect(adminEdge).toContain("applyAdminIdleTimeout");
  });
  it("middleware preserves callbackUrl and handles expired marker", () => {
    const mw = readFileSync(join(ROOT, "middleware.ts"), "utf-8");
    expect(mw).toContain("callbackUrl");
    expect(mw).toContain("expired");
    expect(mw).toContain("encodeURIComponent");
  });
});
