// Visible-browser login debug against production.
// Runs YOUR Chrome (headless: false) so the user can watch.
// Captures console errors, page errors, failed requests, and the final URL.
import { chromium } from "playwright-core";
import fs from "node:fs";

const LOG = [];
const log = (m) => {
  console.log(m);
  LOG.push(m);
};

const BASE = process.env.DEBUG_URL || "https://xenboox.vercel.app";
const EMAIL = process.env.DEBUG_EMAIL || "demo@xenboox.com";
const PASSWORD = process.env.DEBUG_PASSWORD || "demo1234";

const browser = await chromium.launch({
  channel: "chrome",
  headless: false,
  args: ["--start-maximized"],
});
const ctx = await browser.newContext({ viewport: null });
const page = await ctx.newPage();

page.on("console", (msg) => {
  if (msg.type() === "error" || msg.type() === "warning")
    LOG.push(`[console.${msg.type()}] ${msg.text().slice(0, 500)}`);
});
page.on("pageerror", (err) => LOG.push(`[pageerror] ${String(err).slice(0, 500)}`));
page.on("requestfailed", (req) =>
  LOG.push(`[requestfailed] ${req.method()} ${req.url().slice(0, 200)} — ${req.failure()?.errorText}`),
);
page.on("response", (res) => {
  if (res.status() >= 400)
    LOG.push(`[http ${res.status()}] ${res.request().method()} ${res.url().slice(0, 200)}`);
});

try {
  log(`STEP: goto ${BASE}/login`);
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 45000 });
  log(`URL after load: ${page.url()}`);

  // Visible login form fields (per repo e2e specs)
  const email = page.locator('input[type="email"]').first();
  await email.waitFor({ state: "visible", timeout: 20000 });
  log("STEP: filling credentials");
  await email.fill(EMAIL);
  await page.locator('input[type="password"]').first().fill(PASSWORD);
  await page.locator('button[type="submit"]').first().click();
  log("STEP: submitted — waiting for navigation…");

  await page
    .waitForURL(/dashboard|welcome|onboarding/, { timeout: 25000 })
    .then(() => log(`SUCCESS: navigated to ${page.url()}`))
    .catch(async () => log(`NO NAVIGATION after 25s — still at ${page.url()}`));

  // Capture any visible error message on the page
  const errText = await page
    .locator('[role="alert"], .text-destructive, .text-red-500, [data-sonner-toast]')
    .allTextContents()
    .catch(() => []);
  if (errText.length) log(`VISIBLE ERRORS: ${errText.join(" | ").slice(0, 600)}`);

  log("Keeping browser open 45s for inspection…");
  await page.waitForTimeout(45000);
} catch (e) {
  log(`SCRIPT ERROR: ${e.message}`);
} finally {
  fs.writeFileSync("findings/login-debug.log", LOG.join("\n"));
  await browser.close();
  log("DONE");
}
