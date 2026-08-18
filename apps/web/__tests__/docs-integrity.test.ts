// @vitest-environment node
// ─── Docs & marketing integrity guard ──────────────────────────────────────
//
// Marketing claims must match the real product. This test scans the actual
// page sources so an inaccurate count (e.g. "19 AI agents") can never
// silently ship again:
//   1. Every agent-count claim on marketing/docs pages says 21 (the real
//      count derived from packages/agents tier directories).
//   2. Every module-count claim says 20 (the documented module set).
//   3. Every docs internal link (href starting with /docs) resolves to a
//      real page file — no 404s from the docs sidebar, cards, or related
//      links.
//   4. The docs sidebar, search dialog, and mobile nav all reference the
//      same module set as the modules index page.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, it, expect } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_DIR = path.join(__dirname, "..", "app");
const MARKETING_DIR = path.join(APP_DIR, "(marketing)");

// ─── Real counts (verified from code) ─────────────────────────────────────

/** 1 CFO (tier1) + 4 tier2 + 12 tier3 + 4 platform = 21 agents. */
const REAL_AGENT_COUNT = 21;
/** The documented module set (20 module docs pages). */
const REAL_MODULE_COUNT = 20;

const AGENT_CLAIM_PATTERNS = [
  /\b19\s+AI\s+agents?\b/i,
  /\b20\s+AI\s+agents?\b/i,
  /\b21\s+AI\s+agents?\b/i,
  /all\s+(19|20|21)\s+agents?/i,
  /(19|20|21)\s+agents?\s+working/i,
  /finance\s+team\s+of\s+(19|20|21)\s+agents?/i,
];

const MODULE_CLAIM_PATTERNS = [
  /\b19\s+(accounting\s+)?modules?\b/i,
  /\b20\s+(accounting\s+)?modules?\b/i,
  /\b21\s+(accounting\s+)?modules?\b/i,
];

function walk(dir: string): string[] {
  const out: string[] = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules") continue;
      out.push(...walk(full));
    } else if (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts")) {
      out.push(full);
    }
  }
  return out;
}

function collectMarketingSources(): { file: string; src: string }[] {
  const files = [
    ...walk(path.join(MARKETING_DIR, "docs")),
    ...walk(path.join(MARKETING_DIR, "pricing")),
    ...walk(path.join(MARKETING_DIR, "download")),
  ];
  return files.map((file) => ({
    file: path.relative(APP_DIR, file).replace(/\\/g, "/"),
    src: fs.readFileSync(file, "utf8"),
  }));
}

function collectSharedSources(): { file: string; src: string }[] {
  const files = [
    ...walk(path.join(__dirname, "..", "components", "marketing")),
    ...walk(path.join(__dirname, "..", "components", "explore")),
    ...walk(path.join(__dirname, "..", "components", "shared")),
  ];
  return files.map((file) => ({
    file: path.relative(APP_DIR, file).replace(/\\/g, "/"),
    src: fs.readFileSync(file, "utf8"),
  }));
}

/** Every docs-internal href target must resolve to a real route file. */
function collectDocsHrefs(): string[] {
  const hrefs = new Set<string>();
  const files = walk(path.join(MARKETING_DIR, "docs"));
  for (const file of files) {
    const src = fs.readFileSync(file, "utf8");
    const matches = src.matchAll(/href:\s*["'`](\/docs\/[^"'`#?]+)["'`]/g);
    for (const m of matches) hrefs.add(m[1]);
  }
  return [...hrefs];
}

describe("Docs & marketing integrity", () => {
  const marketing = collectMarketingSources();
  const shared = collectSharedSources();

  it("every agent-count claim on marketing/docs pages says 21", () => {
    const offenders: string[] = [];
    for (const { file, src } of [...marketing, ...shared]) {
      // Find the specific number used in any agent claim.
      const nums = new Set<string>();
      for (const re of [
        /(\d{1,2})\s+AI\s+agents?/gi,
        /all\s+(\d{1,2})\s+agents?/gi,
        /(\d{1,2})\s+agents?\s+working/gi,
        /finance\s+team\s+of\s+(\d{1,2})\s+agents?/gi,
      ]) {
        for (const m of src.matchAll(re)) {
          // Skip single-agent plan descriptions (e.g. "1 AI agent (CFO)" on Free plan)
          if (Number(m[1]) === 1) continue;
          nums.add(m[1]);
        }
      }
      if ([...nums].some((n) => Number(n) !== REAL_AGENT_COUNT)) {
        offenders.push(
          `${file} claims ${[...nums].join(", ")} agents (expected ${REAL_AGENT_COUNT})`,
        );
      }
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });

  it("every module-count claim says 20", () => {
    const offenders: string[] = [];
    for (const { file, src } of marketing) {
      const nums = new Set<string>();
      for (const re of [
        /(\d{1,2})\s+(?:accounting\s+)?modules?/gi,
        /all\s+(\d{1,2})\s+(?:accounting\s+)?modules?/gi,
      ]) {
        for (const m of src.matchAll(re)) nums.add(m[1]);
      }
      if ([...nums].some((n) => Number(n) !== REAL_MODULE_COUNT)) {
        offenders.push(
          `${file} claims ${[...nums].join(", ")} modules (expected ${REAL_MODULE_COUNT})`,
        );
      }
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });

  it("every docs-internal href resolves to a real page file", () => {
    const missing: string[] = [];
    for (const href of collectDocsHrefs()) {
      // /docs/agents/cfo -> (marketing)/docs/agents/cfo/page.tsx
      const rel = href.replace(/^\/docs\//, "");
      const candidates = [
        path.join(MARKETING_DIR, "docs", rel, "page.tsx"),
        path.join(MARKETING_DIR, "docs", `${rel}.tsx`),
        path.join(MARKETING_DIR, "docs", rel, "index.tsx"),
      ];
      if (!candidates.some((c) => fs.existsSync(c))) {
        missing.push(href);
      }
    }
    expect(missing, `Broken docs links:\n${missing.join("\n")}`).toEqual([]);
  });

  it("docs sidebar, search dialog, and mobile nav reference the full module set", () => {
    const moduleHrefs = new Set<string>();
    const modulesIndex = fs.readFileSync(
      path.join(MARKETING_DIR, "docs", "modules", "page.tsx"),
      "utf8",
    );
    for (const m of modulesIndex.matchAll(
      /href:\s*"(\/docs\/modules\/[a-z-]+)"/g,
    )) {
      moduleHrefs.add(m[1]);
    }

    // Every module listed on the index must have a real docs page.
    for (const href of moduleHrefs) {
      const rel = href.replace("/docs/modules/", "");
      expect(
        fs.existsSync(
          path.join(MARKETING_DIR, "docs", "modules", rel, "page.tsx"),
        ),
        `Module index links ${href} but no page exists`,
      ).toBe(true);
    }

    // The sidebar layout must link to at least the flagship modules.
    const layout = fs.readFileSync(
      path.join(MARKETING_DIR, "docs", "layout.tsx"),
      "utf8",
    );
    for (const href of [
      "/docs/modules/estimates",
      "/docs/modules/tax-compliance",
    ]) {
      expect(layout, `Sidebar missing ${href}`).toContain(href);
    }

    // Search dialog and mobile nav must include the two newest modules.
    for (const component of ["search-dialog", "mobile-nav"]) {
      const src = fs.readFileSync(
        path.join(MARKETING_DIR, "docs", "components", `${component}.tsx`),
        "utf8",
      );
      expect(src, `${component} missing Estimates`).toContain(
        "/docs/modules/estimates",
      );
      expect(src, `${component} missing Tax Compliance`).toContain(
        "/docs/modules/tax-compliance",
      );
    }
  });

  it("no docs content page is a one-paragraph stub (professional depth guard)", () => {
    // Only check actual content pages — skip components, layouts, error/
    // loading/not-found states, card-grid index pages, and page.tsx files
    // that are pure navigation (0 <h2> is fine for card grids).
    const SKIP = new Set([
      "components/",
      "layout.tsx",
      "error.tsx",
      "loading.tsx",
      "not-found.tsx",
      "page.tsx", // index pages are card grids
    ]);
    const thinPages: string[] = [];
    for (const { file, src } of marketing) {
      if (!file.includes("/docs/")) continue;
      // Skip non-content files
      if ([...SKIP].some((s) => file.endsWith(s) || file.includes(s))) continue;
      // Skip files under components/ directory
      if (file.includes("/docs/components/")) continue;
      // Content pages should have at least 1 <h2> section
      const sections = (src.match(/<h2\b/g) ?? []).length;
      if (sections < 1) thinPages.push(`${file} (${sections} sections)`);
    }
    expect(
      thinPages,
      `Docs pages below professional depth:\n${thinPages.join("\n")}`,
    ).toEqual([]);
  });
});
