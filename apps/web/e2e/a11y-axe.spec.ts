import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// ─── axe-core Accessibility Scan ──────────────────────────────────────────
//
// WCAG 2.1 AA automated scan across all 5 AI-native surfaces.
// Catches dynamic issues that static tests miss: color contrast failures,
// missing ARIA attributes, incomplete labels, keyboard traps, etc.

const SURFACES = [
  { name: "Command Center", path: "/dashboard" },
  { name: "Activity Hub", path: "/dashboard/activity-hub" },
  { name: "Financial Pulse", path: "/dashboard/financial-pulse" },
  { name: "Ledger", path: "/dashboard/ledger" },
  { name: "Operations", path: "/dashboard/operations" },
];

for (const surface of SURFACES) {
  test.describe(`A11y axe-core: ${surface.name}`, () => {
    test(`should have no critical or serious violations on ${surface.name}`, async ({
      page,
    }) => {
      await page.goto(surface.path, { waitUntil: "networkidle" });

      // Wait for any loading skeletons to resolve
      await page.waitForTimeout(2000);

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"])
        .analyze();

      // Filter out critical and serious violations
      const critical = results.violations.filter(
        (v) => v.impact === "critical" || v.impact === "serious",
      );

      // Log all violations for debugging
      if (results.violations.length > 0) {
        console.log(
          `\n=== axe-core violations on ${surface.name} ===`,
        );
        for (const violation of results.violations) {
          console.log(
            `  [${violation.impact}] ${violation.id}: ${violation.description}`,
          );
          console.log(`    Help: ${violation.helpUrl}`);
          for (const node of violation.nodes.slice(0, 3)) {
            console.log(`    Element: ${node.html.substring(0, 100)}`);
          }
          if (violation.nodes.length > 3) {
            console.log(`    ... and ${violation.nodes.length - 3} more`);
          }
        }
      }

      // Report summary
      console.log(
        `\n=== ${surface.name} Summary: ${results.violations.length} violations, ${results.passes.length} passes, ${results.incomplete.length} incomplete ===`,
      );

      // Fail on critical/serious violations
      expect(
        critical,
        `Found ${critical.length} critical/serious violations on ${surface.name}`,
      ).toHaveLength(0);
    });
  });
}

// ─── Navigation Flow Scan ─────────────────────────────────────────────────
//
// Scan each surface after navigating from another surface to catch
// issues that only appear after client-side navigation.

test.describe("A11y axe-core: Navigation flow", () => {
  test("should have no critical violations after navigating between surfaces", async ({
    page,
  }) => {
    // Start at Command Center
    await page.goto("/dashboard", { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);

    const allViolations: string[] = [];

    for (const surface of SURFACES) {
      await page.goto(surface.path, { waitUntil: "networkidle" });
      await page.waitForTimeout(1000);

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();

      const critical = results.violations.filter(
        (v) => v.impact === "critical" || v.impact === "serious",
      );

      for (const v of critical) {
        allViolations.push(`${surface.name}: [${v.impact}] ${v.id}`);
      }
    }

    if (allViolations.length > 0) {
      console.log("\n=== Critical violations across all surfaces ===");
      for (const v of allViolations) {
        console.log(`  ${v}`);
      }
    }

    expect(
      allViolations,
      `Found ${allViolations.length} critical violations across surfaces`,
    ).toHaveLength(0);
  });
});

// ─── Mobile Scan ──────────────────────────────────────────────────────────
//
// Scan surfaces at mobile viewport to catch mobile-specific issues.

test.describe("A11y axe-core: Mobile viewport", () => {
  test.use({ viewport: { width: 375, height: 812 } }); // iPhone X

  for (const surface of SURFACES) {
    test(`should have no critical violations on ${surface.name} (mobile)`, async ({
      page,
    }) => {
      await page.goto(surface.path, { waitUntil: "networkidle" });
      await page.waitForTimeout(2000);

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();

      const critical = results.violations.filter(
        (v) => v.impact === "critical" || v.impact === "serious",
      );

      console.log(
        `\n=== ${surface.name} (mobile): ${critical.length} critical violations ===`,
      );

      expect(
        critical,
        `Found ${critical.length} critical violations on ${surface.name} (mobile)`,
      ).toHaveLength(0);
    });
  }
});
