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

describe("Launch integrity — no fabricated proof", () => {
  it("homepage sells capability proof, not invented customers", () => {
    const src = read("components/marketing/testimonials.tsx");
    expect(src).not.toMatch(/Fatoumata Ceesay/);
    expect(src).not.toMatch(/Musa Jallow/);
    expect(src).not.toMatch(/closed our first month in four days/);
    expect(src).toMatch(/Why teams switch/);
    expect(src).toMatch(/first cohort/);
  });

  it("case-studies page is honest early-access, not fake metrics", () => {
    const src = read("app/(marketing)/case-studies/page.tsx");
    expect(src).not.toMatch(/Seagull Logistics/);
    expect(src).not.toMatch(/GMD 1\.8M/);
    expect(src).not.toMatch(/in four days/);
    expect(src).toMatch(/first cohort/i);
  });

  it("compare page gives reasons, not fake switcher stories", () => {
    const src = read("app/(marketing)/compare/page.tsx");
    expect(src).not.toMatch(/Companies that switched/);
    expect(src).not.toMatch(/Seagull Logistics/);
    expect(src).toMatch(/Why teams switch/);
  });

  it("one-pager has no fake logos or unshipped claims", () => {
    const src = read("app/(marketing)/one-pager/page.tsx");
    expect(src).not.toMatch(/Seagull Logistics/);
    expect(src).not.toMatch(/SunuFresh/);
    expect(src).not.toMatch(/SOC 2 compliant/);
    expect(src).not.toMatch(/Avg\. Month-End Close/);
  });

  it("no fabricated percentages in conversion copy", () => {
    for (const f of [
      "components/marketing/how-it-works.tsx",
      "components/marketing/hero-home.tsx",
      "components/marketing/demo-video.tsx",
    ]) {
      const src = read(f);
      expect(src, f).not.toMatch(/99\.7%/);
      expect(src, f).not.toMatch(/Confidence: 98%/);
    }
  });
});

describe("Launch integrity — marketing matches the shipped product", () => {
  it("hero demo shows Tasks, Thought, and approvals — never agents", () => {
    const src = read("components/marketing/hero-home.tsx");
    expect(src).toMatch(/TasksPanel/);
    expect(src).toMatch(/Thought/);
    expect(src).not.toMatch(/Activity Hub/);
    expect(src).not.toMatch(/CFO Agent/);
    expect(src).not.toMatch(/Invoice Agent/);
    expect(src).not.toMatch(/<Bot/);
  });

  it("features page demos match the product too", () => {
    const src = read("app/(marketing)/features/page.tsx");
    expect(src).not.toMatch(/Activity Hub/);
    expect(src).not.toMatch(/Agent Monitor/);
    expect(src).not.toMatch(/Invoice Agent/);
    expect(src).not.toMatch(/CFO Agent/);
    expect(src).toMatch(/Thought/);
  });

  it("demo video section is honest product visual, not a fake player", () => {
    const src = read("components/marketing/demo-video.tsx");
    expect(src).not.toMatch(/YOUTUBE_EMBED/);
    expect(src).not.toMatch(/2:03/);
    expect(src).not.toMatch(/Video transcript/);
    expect(src).not.toMatch(/20\+ agents/);
  });
});

describe("Launch integrity — honest capability language", () => {
  const conversionFiles = [
    "components/marketing/hero-home.tsx",
    "components/marketing/how-it-works.tsx",
    "components/marketing/demo-video.tsx",
    "app/(marketing)/features/page.tsx",
    "app/(marketing)/pricing/page.tsx",
    "app/(marketing)/for-accountants/page.tsx",
    "app/(marketing)/compare/page.tsx",
    "app/(marketing)/compare/xero/page.tsx",
    "app/(marketing)/compare/quickbooks/page.tsx",
    "app/(marketing)/about/page.tsx",
    "app/(marketing)/one-pager/page.tsx",
    "app/(marketing)/careers/page.tsx",
  ];

  it("never sells confidence scores or agent counts", () => {
    for (const f of conversionFiles) {
      const src = read(f);
      expect(src, f).not.toMatch(/[Cc]onfidence-scored/);
      expect(src, f).not.toMatch(/Confidence: \d+%/);
    }
  });

  it("never claims unshipped compliance", () => {
    for (const f of conversionFiles) {
      const src = read(f);
      expect(src, f).not.toMatch(/SOC 2 complian/);
      expect(src, f).not.toMatch(/SOC 2 ready/);
    }
  });
});

describe("Launch hygiene — metadata and sitemap", () => {
  it("every conversion route has metadata with openGraph", () => {
    const layouts: Record<string, string> = {
      "app/(marketing)/pricing/layout.tsx": "Pricing",
      "app/(marketing)/features/layout.tsx": "Features",
      "app/(marketing)/about/layout.tsx": "About",
      "app/(marketing)/for-accountants/layout.tsx": "For Accountants",
      "app/(marketing)/compare/layout.tsx": "Compare",
      "app/(marketing)/compare/xero/layout.tsx": "Xero",
      "app/(marketing)/compare/quickbooks/layout.tsx": "QuickBooks",
    };
    for (const [file, hint] of Object.entries(layouts)) {
      expect(existsSync(join(root, file)), file).toBe(true);
      const src = read(file);
      expect(src).toContain("export const metadata");
      expect(src).toContain("openGraph");
      expect(src).toContain(hint);
    }
  });

  it("sitemap covers the conversion routes", () => {
    const src = read("app/sitemap.ts");
    for (const route of [
      "/features",
      "/pricing",
      "/about",
      "/for-accountants",
      "/compare",
      "/compare/xero",
      "/compare/quickbooks",
      "/case-studies",
    ]) {
      expect(src).toContain(`"${route}"`);
    }
  });

  it("footer links resolve to real pages", () => {
    const src = read("app/(marketing)/layout.tsx");
    expect(src).toContain('href: "/press"');
    expect(src).not.toContain('Press Kit", href: "/about"');
    expect(existsSync(join(root, "app/(marketing)/press/page.tsx"))).toBe(true);
  });
});
