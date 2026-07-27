const { chromium } = require("C:\\Users\\asano\\AppData\\Local\\pnpm\\global\\5\\node_modules\\playwright");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ bypassCSP: true });
  const page = await context.newPage();

  page.on("console", (msg) => console.log(`[CONSOLE] ${msg.text()}`));
  page.on("pageerror", (err) => console.log(`[PAGE_ERROR] ${err.message}`));
  page.on("requestfailed", (req) => console.log(`[REQ_FAIL] ${req.method()} ${req.url().substring(0,120)} - ${req.failure()?.errorText}`));

  const responses = [];
  page.on("response", (res) => responses.push({ status: res.status(), url: res.url(), headers: { location: res.headers()["location"] || res.headers()["Location"] || "" } }));

  try {
    console.log("1. Loading login page...");
    const resp = await page.goto("https://xenboox.vercel.app/login", { waitUntil: "load", timeout: 30000 });
    console.log(`   Status: ${resp?.status()}, URL: ${page.url()}`);

    // Wait for page to fully render
    await page.waitForTimeout(2000);

    console.log("2. Filling in credentials...");
    await page.fill('input[type="email"]', "demo@xenboox.com");
    await page.fill('input[type="password"]', "demo1234");

    console.log("3. Clicking submit...");
    // Capture any navigation
    const navPromise = page.waitForNavigation({ timeout: 15000 }).catch(() => null);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    const nav = await navPromise;
    console.log(`   Navigation: ${nav ? nav.url() : "none (stayed on same page)"}`);
    console.log(`   Current URL: ${page.url()}`);

    // Wait a bit more for AJAX
    await page.waitForTimeout(3000);
    console.log(`   Final URL: ${page.url()}`);

    // Print auth callback responses
    console.log("\n=== KEY RESPONSES ===");
    for (const r of responses) {
      const u = r.url;
      if (u.includes("callback/credentials")) {
        console.log(`${r.status} ${u.substring(0,100)}`);
        if (r.headers.location) console.log(`  → Location: ${r.headers.location}`);
      }
    }
    
    // Print responses by status
    console.log("\n=== STATUS CODE SUMMARY ===");
    const byStatus = {};
    for (const r of responses) {
      byStatus[r.status] = (byStatus[r.status] || 0) + 1;
    }
    for (const [s, c] of Object.entries(byStatus)) {
      console.log(`  ${s}: ${c} requests`);
    }

    console.log("\n=== ALL NON-200 RESPONSES ===");
    for (const r of responses) {
      if (r.status !== 200) {
        console.log(`${r.status} ${r.url.substring(0,120)}`);
        if (r.headers.location) console.log(`  → ${r.headers.location}`);
      }
    }

    // Print visible error on page
    const errorText = await page.locator('[class*="error"], [role="alert"], .text-red-500, .text-destructive, .text-red').textContent().catch(() => "");
    if (errorText.trim()) {
      console.log(`\n=== VISIBLE ERROR ===\n${errorText.trim()}`);
    }

    await page.screenshot({ path: "debug-final.png" });
    console.log("\nScreenshot saved");
  } catch(err) {
    console.log(`\nERROR: ${err.message}`);
    await page.screenshot({ path: "debug-error.png" });
  } finally {
    await browser.close();
  }
})();
