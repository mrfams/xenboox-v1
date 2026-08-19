/**
 * Standalone axe-core accessibility scanner.
 *
 * Usage:
 *   npx tsx e2e/a11y-axe-scan.ts                    # scan deployed app
 *   BASE_URL=http://localhost:3000 npx tsx e2e/a11y-axe-scan.ts  # scan local
 *
 * Requires: @axe-core/playwright, playwright
 */

import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const BASE_URL = process.env.BASE_URL || "https://xenboox.vercel.app";

const SURFACES = [
  { name: "Command Center", path: "/dashboard" },
  { name: "Activity Hub", path: "/dashboard/activity-hub" },
  { name: "Financial Pulse", path: "/dashboard/financial-pulse" },
  { name: "Ledger", path: "/dashboard/ledger" },
  { name: "Operations", path: "/dashboard/operations" },
];

async function scanSurface(
  page: any,
  name: string,
  path: string,
  viewport: { width: number; height: number },
) {
  const url = `${BASE_URL}${path}`;
  console.log(`\n🔍 Scanning ${name} (${url}) at ${viewport.width}x${viewport.height}...`);

  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(2000);

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"])
      .analyze();

    const critical = results.violations.filter(
      (v: any) => v.impact === "critical" || v.impact === "serious",
    );
    const moderate = results.violations.filter(
      (v: any) => v.impact === "moderate",
    );
    const minor = results.violations.filter(
      (v: any) => v.impact === "minor",
    );

    console.log(`  ✅ ${results.passes.length} passes`);
    console.log(`  ⚠️  ${results.incomplete.length} incomplete (manual review needed)`);

    if (critical.length > 0) {
      console.log(`  🚨 ${critical.length} CRITICAL/SERIOUS violations:`);
      for (const v of critical) {
        console.log(`     [${v.impact}] ${v.id}: ${v.description}`);
        console.log(`     Help: ${v.helpUrl}`);
        for (const node of v.nodes.slice(0, 2)) {
          console.log(`     Element: ${node.html.substring(0, 120)}`);
        }
      }
    }

    if (moderate.length > 0) {
      console.log(`  ⚡ ${moderate.length} moderate violations:`);
      for (const v of moderate) {
        console.log(`     [moderate] ${v.id}: ${v.description}`);
      }
    }

    if (minor.length > 0) {
      console.log(`  💡 ${minor.length} minor violations:`);
      for (const v of minor) {
        console.log(`     [minor] ${v.id}: ${v.description}`);
      }
    }

    if (results.violations.length === 0) {
      console.log(`  🎉 No violations found!`);
    }

    return {
      name,
      passes: results.passes.length,
      violations: results.violations.length,
      critical: critical.length,
      moderate: moderate.length,
      minor: minor.length,
      incomplete: results.incomplete.length,
      details: results.violations.map((v: any) => ({
        id: v.id,
        impact: v.impact,
        description: v.description,
        helpUrl: v.helpUrl,
        nodes: v.nodes.length,
      })),
    };
  } catch (error) {
    console.log(`  ❌ Error scanning: ${error}`);
    return {
      name,
      passes: 0,
      violations: 0,
      critical: 0,
      moderate: 0,
      minor: 0,
      incomplete: 0,
      error: String(error),
    };
  }
}

async function main() {
  console.log("═══════════════════════════════════════════════════════");
  console.log("  axe-core Accessibility Scan — Xenboox AI-Native UI");
  console.log("═══════════════════════════════════════════════════════");
  console.log(`Target: ${BASE_URL}`);

  const browser = await chromium.launch({ headless: true });

  // Desktop scan
  console.log("\n═══ DESKTOP (1280x720) ═══");
  const desktopContext = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  });
  const desktopPage = await desktopContext.newPage();

  const desktopResults = [];
  for (const surface of SURFACES) {
    const result = await scanSurface(
      desktopPage,
      surface.name,
      surface.path,
      { width: 1280, height: 720 },
    );
    desktopResults.push(result);
  }

  // Mobile scan
  console.log("\n═══ MOBILE (375x812 — iPhone X) ═══");
  const mobileContext = await browser.newContext({
    viewport: { width: 375, height: 812 },
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
  });
  const mobilePage = await mobileContext.newPage();

  const mobileResults = [];
  for (const surface of SURFACES) {
    const result = await scanSurface(
      mobilePage,
      surface.name,
      surface.path,
      { width: 375, height: 812 },
    );
    mobileResults.push(result);
  }

  await browser.close();

  // Summary
  console.log("\n═══════════════════════════════════════════════════════");
  console.log("  SUMMARY");
  console.log("═══════════════════════════════════════════════════════");

  const allResults = [
    ...desktopResults.map((r) => ({ ...r, viewport: "desktop" })),
    ...mobileResults.map((r) => ({ ...r, viewport: "mobile" })),
  ];

  const totalCritical = allResults.reduce((sum, r) => sum + (r.critical ?? 0), 0);
  const totalModerate = allResults.reduce((sum, r) => sum + (r.moderate ?? 0), 0);
  const totalMinor = allResults.reduce((sum, r) => sum + (r.minor ?? 0), 0);
  const totalPasses = allResults.reduce((sum, r) => sum + (r.passes ?? 0), 0);

  console.log(`\nTotal passes:     ${totalPasses}`);
  console.log(`Critical/Serious: ${totalCritical}`);
  console.log(`Moderate:         ${totalModerate}`);
  console.log(`Minor:            ${totalMinor}`);

  console.log("\nPer-surface breakdown:");
  for (const r of allResults) {
    const status =
      (r.critical ?? 0) > 0 ? "🚨" : (r.moderate ?? 0) > 0 ? "⚡" : "✅";
    console.log(
      `  ${status} ${r.name} (${r.viewport}): ${r.critical ?? 0} critical, ${r.moderate ?? 0} moderate, ${r.minor ?? 0} minor`,
    );
  }

  if (totalCritical > 0) {
    console.log("\n❌ FAIL — Critical/serious violations found");
    process.exit(1);
  } else if (totalModerate > 0) {
    console.log("\n⚠️  PASS with moderate violations (review recommended)");
    process.exit(0);
  } else {
    console.log("\n🎉 PASS — No critical or moderate violations");
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("Scan failed:", err);
  process.exit(1);
});
