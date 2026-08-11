// @vitest-environment node
// ─── AI simulation page coverage guard ──────────────────────────────────────
//
// Every dashboard workflow page must render at least one AiSimulationTrigger —
// this test scans the actual page sources so coverage can never silently
// regress when a new page is added (or a trigger is accidentally removed).
//
// Two assertions:
//   1. Every page EXCEPT the documented exemptions below contains the string
//      `AiSimulationTrigger`.
//   2. Every `traceId="…"` used on any page resolves to a real trace in
//      lib/ai-ux/traces.ts — a typo'd trace id would render a broken trigger.

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { getAiUxTrace } from "@/lib/ai-ux/traces";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DASHBOARD_DIR = path.join(__dirname, "..", "app", "dashboard");

/**
 * Dashboard surfaces that are deliberately NOT workflow pages and are exempt
 * from the trigger requirement. Add a page here ONLY if it is genuinely not a
 * workflow surface — otherwise wire an AiSimulationTrigger and its trace.
 */
const EXPLICITLY_EXEMPT = new Map<string, string>([
  [
    "explore",
    "Discovery hub — the AI UX tab renders a Run button per catalog entry",
  ],
  ["documents/artifacts", "Artifact viewer surface, not a workflow"],
  ["", "Dashboard home / executive overview landing"],
]);

/** Recursively collect every page.tsx under the dashboard route tree. */
function pageFiles(): Array<{ route: string; file: string }> {
  const out: Array<{ route: string; file: string }> = [];
  const walk = (dir: string, route: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory())
        walk(full, route ? `${route}/${entry.name}` : entry.name);
      else if (entry.name === "page.tsx") out.push({ route, file: full });
    }
  };
  walk(DASHBOARD_DIR, "");
  return out;
}

describe("AI simulation page coverage", () => {
  it("every dashboard workflow page renders at least one AiSimulationTrigger", () => {
    const uncovered = pageFiles()
      .filter((p) => !EXPLICITLY_EXEMPT.has(p.route))
      .filter((p) => {
        const src = fs.readFileSync(p.file, "utf8");
        // Actual JSX usage, not a bare mention in a comment or docstring.
        return !/<AiSimulationTrigger\b/.test(src);
      })
      .map((p) => `/dashboard${p.route}`);

    expect(
      uncovered,
      [
        "Unwired dashboard pages — add an AiSimulationTrigger (with its trace)",
        "or move the page into EXPLICITLY_EXEMPT with a reason:",
        ...uncovered.map((r) => `  ${r}`),
      ].join("\n"),
    ).toEqual([]);
  });

  it("every traceId used on a page resolves to a real trace", () => {
    const missing: string[] = [];
    for (const page of pageFiles()) {
      const src = fs.readFileSync(page.file, "utf8");
      for (const match of src.matchAll(/traceId="([a-z0-9-]+)"/g)) {
        if (!getAiUxTrace(match[1])) {
          missing.push(`/dashboard${page.route} → ${match[1]}`);
        }
      }
    }
    expect(
      missing,
      `Pages referencing unknown trace ids:\n${missing.join("\n")}`,
    ).toEqual([]);
  });
});
