import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

import { describe, it, expect } from "vitest";

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
  if (!existsSync(p)) throw new Error(`Missing file for UX check: ${rel}`);
  return readFileSync(p, "utf-8");
}

function exists(rel: string): boolean {
  return existsSync(join(root, rel));
}

const DELETED_ROUTES = [
  "auto-approve",
  "knowledge",
  "help",
  "qbr",
  "donor-reporting",
  "people",
  "referrals",
];

describe("Phase C — absorbed routes are gone", () => {
  it("deleted route directories do not exist", () => {
    for (const route of DELETED_ROUTES) {
      expect(
        exists(`app/dashboard/${route}/page.tsx`),
        `${route} page should be deleted`,
      ).toBe(false);
    }
  });

  it("orphaned route-only components are gone", () => {
    expect(exists("components/dashboard/qbr-report.tsx")).toBe(false);
    expect(exists("components/approvals/auto-approve-rules.tsx")).toBe(false);
    expect(exists("components/knowledge/knowledge-search.tsx")).toBe(false);
    expect(exists("components/knowledge/document-processor.tsx")).toBe(false);
    expect(exists("components/people/payroll-view.tsx")).toBe(false);
    expect(exists("components/people/inventory-view.tsx")).toBe(false);
    expect(exists("components/people/assets-view.tsx")).toBe(false);
    expect(exists("components/people/budget-view.tsx")).toBe(false);
  });

  it("every deleted route redirects where its job now lives", () => {
    const src = read("next.config.ts");
    const expected: Record<string, string> = {
      "/dashboard/auto-approve": "/dashboard/tasks",
      "/dashboard/knowledge": "/dashboard",
      "/dashboard/help": "/docs",
      "/dashboard/qbr": "/dashboard/financial-pulse",
      "/dashboard/donor-reporting": "/dashboard/financial-pulse",
      "/dashboard/people": "/dashboard/operations",
      "/dashboard/referrals": "/dashboard/settings",
    };
    for (const [source, destination] of Object.entries(expected)) {
      expect(src).toContain(`source: "${source}"`);
      expect(src).toContain(`destination: "${destination}"`);
    }
  });
});

describe("Phase C — no user-facing links to deleted routes", () => {
  const userFacingFiles = [
    "components/layout/sidebar.tsx",
    "components/layout/ai-sidebar.tsx",
    "components/layout/mobile-bottom-nav.tsx",
    "components/layout/top-nav.tsx",
    "components/layout/chat-panel.tsx",
    "components/notifications/notification-bell.tsx",
    "components/shared/command-palette.tsx",
    "components/shared/module-tabs.ts",
    "components/shared/keyboard-shortcuts.tsx",
    "lib/nav.ts",
    "lib/notifications.ts",
    "lib/hooks/use-surface-shortcuts.ts",
    "lib/role-config.ts",
    "app/dashboard/layout.tsx",
  ];

  for (const route of DELETED_ROUTES) {
    it(`nothing links to /dashboard/${route}`, () => {
      for (const file of userFacingFiles) {
        if (!exists(file)) continue;
        const src = read(file);
        expect(
          src.includes(`/dashboard/${route}`),
          `${file} still links to /dashboard/${route}`,
        ).toBe(false);
      }
    });
  }

  it("help surfaces point at /docs", () => {
    expect(read("components/layout/sidebar.tsx")).toContain('href="/docs"');
    expect(read("components/shared/command-palette.tsx")).toContain(
      'href: "/docs"',
    );
    expect(read("lib/nav.ts")).toContain('href: "/docs"');
  });

  it("mobile nav and shortcuts cover exactly the 5 surfaces", () => {
    const mobile = read("components/layout/mobile-bottom-nav.tsx");
    expect(mobile).not.toContain("/dashboard/people");
    const shortcuts = read("lib/hooks/use-surface-shortcuts.ts");
    expect(shortcuts).not.toContain("/dashboard/people");
    expect(shortcuts).toContain("/dashboard/operations");
  });
});

describe("Phase C — jobs preserved, not lost", () => {
  it("Tasks approvals offer Make automatic via chat", () => {
    const src = read("app/dashboard/tasks/page.tsx");
    expect(src).toContain("Make automatic");
    expect(src).toContain("suggest an auto-approve rule");
  });

  it("referrals live as a Settings tab", () => {
    const src = read("app/dashboard/settings/page.tsx");
    expect(src).toContain("referrals");
    expect(src).toContain("ReferralDashboard");
    expect(src).toContain("Invite friends and earn rewards");
  });

  it("knowledge graph survives as unlinked debug", () => {
    expect(exists("app/dashboard/knowledge-graph/page.tsx")).toBe(true);
    const hidden = read("app/dashboard/hidden/page.tsx");
    expect(hidden).toContain("/dashboard/knowledge-graph");
    const sidebar = read("components/layout/sidebar.tsx");
    expect(sidebar).not.toContain("/dashboard/knowledge-graph");
  });

  it("grant-tracking future is logged, not forgotten", () => {
    const spec = readFileSync(join(root, "../../toAINative.md"), "utf-8");
    expect(spec).toContain("grant");
    expect(spec.toLowerCase()).toContain("future");
  });
});
