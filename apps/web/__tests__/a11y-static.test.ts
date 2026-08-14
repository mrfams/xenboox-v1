import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

// Vitest runs with cwd = apps/web. Resolve robustly whether cwd is the app
// dir or the repo root.
const REPO = join(process.cwd(), "..");
const root = existsSync(join(process.cwd(), "app"))
  ? process.cwd()
  : existsSync(join(REPO, "apps/web/app"))
    ? join(REPO, "apps/web")
    : process.cwd();

function read(rel: string): string {
  const p = join(root, rel);
  if (!existsSync(p)) throw new Error(`Missing file for a11y check: ${rel}`);
  return readFileSync(p, "utf-8");
}

describe("A11y — skip links (§13.2)", () => {
  it("dashboard layout has a skip-to-content link targeting #main-content", () => {
    const layout = read("app/dashboard/layout.tsx");
    expect(layout).toMatch(/Skip to content/);
    expect(layout).toMatch(/href="#main-content"/);
    expect(layout).toMatch(/<main\s+id="main-content"/);
  });

  it("marketing layout has a skip-to-content link targeting #main-content", () => {
    const layout = read("app/(marketing)/layout.tsx");
    expect(layout).toMatch(/Skip to content/);
    expect(layout).toMatch(/href="#main-content"/);
    expect(layout).toMatch(/<main[^>]*id="main-content"/s);
  });
});

describe("A11y — aria-current (§13.2)", () => {
  it("sidebar marks the active nav item with aria-current=page", () => {
    const sidebar = read("components/layout/sidebar.tsx");
    expect(sidebar).toMatch(
      /aria-current=\{isActive\(item\) \? "page" : undefined\}/,
    );
  });
});

describe("A11y — table headers scope + captions (§13.2)", () => {
  const tableComponents = [
    "components/shared/data-view-table.tsx",
    "components/documents/artifact-list.tsx",
    "components/audit/activity-log-view.tsx",
    "components/layout/chat-panel.tsx",
    "components/marketing/hero-home.tsx",
    "components/onboarding/onboarding-liveness.tsx",
    "components/settings/taxes-section.tsx",
    "components/workspace/rich-responses.tsx",
    "components/workspace/rich-message-renderer.tsx",
  ];

  for (const rel of tableComponents) {
    it(`${rel} marks every <th> with scope="col"`, () => {
      const src = read(rel);
      // Every <th ...> opening tag must carry scope="col"
      const thTags = src.match(/<th\b[^>]*>/g) ?? [];
      expect(thTags.length).toBeGreaterThan(0);
      for (const tag of thTags) {
        expect(tag).toContain('scope="col"');
      }
    });
  }

  it("data-view-table supports an sr-only caption", () => {
    const src = read("components/shared/data-view-table.tsx");
    expect(src).toMatch(/caption\?: string/);
    expect(src).toMatch(/<caption className="sr-only">\{caption\}<\/caption>/);
  });
});

describe("A11y — reduced motion (§13.2)", () => {
  it("globals.css honors prefers-reduced-motion", () => {
    const css = read("app/globals.css");
    expect(css).toMatch(/prefers-reduced-motion: reduce/);
    expect(css).toMatch(/animation-duration: 0\.01ms/);
  });
});
