// @vitest-environment node
// ─── Explore "copilot" flag ↔ reality guard ─────────────────────────────────
//
// The Explore → Pages tab marks pages with a sparkle badge when they carry the
// page-aware "Ask Xenboox" copilot (rendered by ModulePageShell /
// ModulePageCopilot). This test scans the actual dashboard page sources so the
// directory can never silently drift from reality — a flagged page with no
// copilot, or a copilot page missing its flag, both fail here.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, it, expect } from "vitest";

import { PAGES } from "@/lib/explore/pages-directory";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DASHBOARD_DIR = path.join(__dirname, "..", "app", "dashboard");

/** Pages that legitimately carry the copilot but are not in the directory. */
const EXPLICITLY_EXEMPT = new Set<string>([
  "explore", // the discovery hub itself — renders the copilot via its own shell
]);

function pageSources(): Map<string, string> {
  const out = new Map<string, string>();
  const walk = (dir: string, route: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory())
        walk(full, route ? `${route}/${entry.name}` : entry.name);
      else if (entry.name === "page.tsx")
        out.set(route, fs.readFileSync(full, "utf8"));
    }
  };
  walk(DASHBOARD_DIR, "");
  return out;
}

const HAS_COPILOT = /ModulePageShell|ModulePageCopilot|module-page-copilot/;

describe("Explore copilot flags match reality", () => {
  const sources = pageSources();

  it("every copilot-flagged directory page actually renders the copilot", () => {
    const flagged = PAGES.filter((p) => p.copilot);
    const broken = flagged
      .map((p) => p.href.replace(/^\/dashboard\/?/, "") || "dashboard")
      .filter((route) => !HAS_COPILOT.test(sources.get(route) ?? ""));
    expect(
      broken,
      `Copilot-flagged pages with no copilot in source:\n${broken
        .map((r) => `  /dashboard/${r}`)
        .join("\n")}`,
    ).toEqual([]);
  });

  it("every page that renders the copilot is flagged in the directory", () => {
    const flagged = new Set(
      PAGES.filter((p) => p.copilot).map(
        (p) => p.href.replace(/^\/dashboard\/?/, "") || "dashboard",
      ),
    );
    const unlisted = [...sources.entries()]
      .filter(([route]) => !EXPLICITLY_EXEMPT.has(route))
      .filter(([, src]) => HAS_COPILOT.test(src))
      .filter(([route]) => !flagged.has(route))
      .map(([route]) => `/dashboard/${route}`);

    expect(
      unlisted,
      `Pages rendering the copilot but missing the flag:\n${unlisted.join("\n")}`,
    ).toEqual([]);
  });
});
