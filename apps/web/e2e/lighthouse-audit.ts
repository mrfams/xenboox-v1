#!/usr/bin/env node
// ─── Lighthouse Performance Audit ─────────────────────────────────────────
//
// Runs Lighthouse against all 5 dashboard surfaces (desktop + mobile).
// Outputs JSON reports to lighthouse-reports/ and prints a summary table.
//
// Usage:
//   npx tsx e2e/lighthouse-audit.ts [base-url]
//   npx tsx e2e/lighthouse-audit.ts https://xenboox.vercel.app

import { execSync } from "child_process";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";

const BASE_URL =
  process.argv[2] || process.env.BASE_URL || "https://xenboox.vercel.app";

const SURFACES = [
  { name: "Command Center", path: "/dashboard" },
  { name: "Activity Hub", path: "/dashboard/activity-hub" },
  { name: "Financial Pulse", path: "/dashboard/financial-pulse" },
  { name: "Ledger", path: "/dashboard/ledger" },
  { name: "Operations", path: "/dashboard/operations" },
];

const FORMATS = [
  {
    name: "Desktop",
    preset: "desktop",
    // Chrome desktop emulation
    chromeFlags: "--headless --no-sandbox",
  },
  {
    name: "Mobile",
    preset: "mobile",
    // Chrome mobile emulation
    chromeFlags: "--headless --no-sandbox",
  },
];

type LighthouseResult = {
  url: string;
  surface: string;
  format: string;
  scores: {
    performance: number;
    accessibility: number;
    bestPractices: number;
    seo: number;
  };
  metrics: {
    fcp: string;
    lcp: string;
    tbt: string;
    cls: string;
    si: string;
  };
  opportunities: string[];
};

function runLighthouse(
  url: string,
  format: (typeof FORMATS)[0],
): LighthouseResult | null {
  const reportDir = join(
    process.cwd(),
    "lighthouse-reports",
    format.name.toLowerCase(),
  );
  mkdirSync(reportDir, { recursive: true });

  const surface = SURFACES.find((s) => url.includes(s.path))?.name || "Unknown";
  const fileName = `${surface.toLowerCase().replace(/ /g, "-")}-${format.name.toLowerCase()}`;
  const jsonPath = join(reportDir, `${fileName}.json`);

  try {
    const cmd = [
      "npx",
      "lighthouse",
      `"${url}"`,
      `--preset=${format.preset}`,
      `--output=json`,
      `--output-path="${jsonPath}"`,
      `--chrome-flags="${format.chromeFlags}"`,
      `--quiet`,
      `--only-categories=performance,accessibility,best-practices,seo`,
    ].join(" ");

    execSync(cmd, {
      timeout: 120_000,
      stdio: "pipe",
      env: {
        ...process.env,
        CHROME_PATH: process.env.CHROME_PATH || "",
      },
    });

    const raw = JSON.parse(
      require("fs").readFileSync(jsonPath, "utf-8"),
    ) as Record<string, any>;

    const categories = raw.categories || {};
    const audits = raw.audits || {};

    return {
      url,
      surface,
      format: format.name,
      scores: {
        performance: Math.round(
          (categories.performance?.score || 0) * 100,
        ),
        accessibility: Math.round(
          (categories.accessibility?.score || 0) * 100,
        ),
        bestPractices: Math.round(
          (categories["best-practices"]?.score || 0) * 100,
        ),
        seo: Math.round((categories.seo?.score || 0) * 100),
      },
      metrics: {
        fcp: audits["first-contentful-paint"]?.displayValue || "N/A",
        lcp: audits["largest-contentful-paint"]?.displayValue || "N/A",
        tbt: audits["total-blocking-time"]?.displayValue || "N/A",
        cls: audits["cumulative-layout-shift"]?.displayValue || "N/A",
        si: audits["speed-index"]?.displayValue || "N/A",
      },
      opportunities: Object.values(audits)
        .filter(
          (a: any) =>
            a.details?.type === "opportunity" &&
            a.score !== null &&
            a.score < 1,
        )
        .map((a: any) => `${a.title} (${a.displayValue})`)
        .slice(0, 3),
    };
  } catch (err: any) {
    console.error(`  ⚠ Failed: ${err.message?.slice(0, 100)}`);
    return null;
  }
}

// ─── Main ──────────────────────────────────────────────────────────────────

console.log(`\n🔍 Lighthouse Audit — ${BASE_URL}\n`);
console.log(`Surfaces: ${SURFACES.length} × Formats: ${FORMATS.length} = ${SURFACES.length * FORMATS.length} scans\n`);

const results: LighthouseResult[] = [];
let scanNum = 0;
const total = SURFACES.length * FORMATS.length;

for (const format of FORMATS) {
  console.log(`\n── ${format.name} ──────────────────────────────`);

  for (const surface of SURFACES) {
    scanNum++;
    const url = `${BASE_URL}${surface.path}`;
    console.log(`\n  [${scanNum}/${total}] ${surface.name} (${url})`);

    const result = runLighthouse(url, format);
    if (result) {
      results.push(result);
      console.log(
        `    Performance: ${result.scores.performance} | A11y: ${result.scores.accessibility} | BP: ${result.scores.bestPractices} | SEO: ${result.scores.seo}`,
      );
      console.log(
        `    FCP: ${result.metrics.fcp} | LCP: ${result.metrics.lcp} | TBT: ${result.metrics.tbt} | CLS: ${result.metrics.cls} | SI: ${result.metrics.si}`,
      );
      if (result.opportunities.length > 0) {
        console.log(`    Opportunities: ${result.opportunities.join("; ")}`);
      }
    }
  }
}

// ─── Summary ───────────────────────────────────────────────────────────────

if (results.length === 0) {
  console.log("\n❌ No results collected. Check if Chrome is available.\n");
  process.exit(1);
}

console.log(`\n\n${"═".repeat(80)}`);
console.log(`  LIGHTHOUSE AUDIT SUMMARY — ${results.length} scans completed`);
console.log(`${"═".repeat(80)}\n`);

// Desktop summary
const desktop = results.filter((r) => r.format === "Desktop");
const mobile = results.filter((r) => r.format === "Mobile");

function printSummary(label: string, subset: LighthouseResult[]) {
  if (subset.length === 0) return;

  console.log(`\n  ${label}:\n`);
  console.log(
    `  ${"Surface".padEnd(20)} ${"Perf".padStart(5)} ${"A11y".padStart(5)} ${"BP".padStart(5)} ${"SEO".padStart(5)}  ${"FCP".padEnd(12)} ${"LCP".padEnd(12)} ${"TBT".padEnd(12)} ${"CLS".padEnd(8)}`,
  );
  console.log(`  ${"─".repeat(95)}`);

  for (const r of subset) {
    console.log(
      `  ${r.surface.padEnd(20)} ${String(r.scores.performance).padStart(5)} ${String(r.scores.accessibility).padStart(5)} ${String(r.scores.bestPractices).padStart(5)} ${String(r.scores.seo).padStart(5)}  ${r.metrics.fcp.padEnd(12)} ${r.metrics.lcp.padEnd(12)} ${r.metrics.tbt.padEnd(12)} ${r.metrics.cls.padEnd(8)}`,
    );
  }

  // Averages
  const avgPerf = Math.round(
    subset.reduce((s, r) => s + r.scores.performance, 0) / subset.length,
  );
  const avgA11y = Math.round(
    subset.reduce((s, r) => s + r.scores.accessibility, 0) / subset.length,
  );
  const avgBp = Math.round(
    subset.reduce((s, r) => s + r.scores.bestPractices, 0) / subset.length,
  );
  const avgSeo = Math.round(
    subset.reduce((s, r) => s + r.scores.seo, 0) / subset.length,
  );

  console.log(`  ${"─".repeat(95)}`);
  console.log(
    `  ${"AVERAGE".padEnd(20)} ${String(avgPerf).padStart(5)} ${String(avgA11y).padStart(5)} ${String(avgBp).padStart(5)} ${String(avgSeo).padStart(5)}`,
  );
}

printSummary("📊 Desktop", desktop);
printSummary("📱 Mobile", mobile);

// Save full results
const outputDir = join(process.cwd(), "lighthouse-reports");
mkdirSync(outputDir, { recursive: true });
writeFileSync(
  join(outputDir, "summary.json"),
  JSON.stringify({ baseUrl: BASE_URL, timestamp: new Date().toISOString(), results }, null, 2),
);
console.log(`\n  📁 Full reports saved to lighthouse-reports/`);
console.log(`  📁 Summary: lighthouse-reports/summary.json\n`);
