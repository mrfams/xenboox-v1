const { chromium } = require("C:\\Users\\asano\\AppData\\Local\\pnpm\\global\\5\\node_modules\\playwright");

const URL = "https://xenboox.vercel.app";
const EMAIL = "demo@xenboox.com";
const PASSWORD = "demo1234";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ bypassCSP: true });
  const page = await context.newPage();

  const logs = [];
  page.on("console", (msg) => logs.push(`[${msg.type()}] ${msg.text()}`));
  page.on("pageerror", (err) => logs.push(`[PAGE_ERROR] ${err.message}`));
  page.on("requestfailed", (req) =>
    logs.push(`[REQUEST_FAILED] ${req.method()} ${req.url()} - ${req.failure()?.errorText}`)
  );

  const responses = [];
  page.on("response", (res) => responses.push({ url: res.url(), status: res.status() }));

  try {
    console.log("1. Navigating to login page...");
    await page.goto(`${URL}/login`, { waitUntil: "networkidle", timeout: 30000 });
    await page.screenshot({ path: "debug-01-login-page.png" });
    console.log(`   Title: ${await page.title()}`);
    console.log(`   URL: ${page.url()}`);

    const bodyText = await page.textContent("body");
    if (bodyText.toLowerCase().includes("error")) {
      console.log("   ERROR TEXT IN PAGE BODY!");
      const errorTexts = [];
      const els = await page.locator('[class*="error"], [role="alert"], .text-red, .text-destructive, [class*="destructive"]').all();
      for (const el of els) {
        errorTexts.push(await el.textContent());
      }
      console.log(`   Error elements: ${JSON.stringify(errorTexts)}`);
    }

    // Find inputs
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const emailCount = await emailInput.count();
    const passCount = await passwordInput.count();
    console.log(`2. Found ${emailCount} email inputs, ${passCount} password inputs`);

    if (emailCount > 0) await emailInput.first().fill(EMAIL);
    if (passCount > 0) await passwordInput.first().fill(PASSWORD);
    await page.screenshot({ path: "debug-02-filled.png" });

    // Find and click submit
    const submitBtn = page.locator('button[type="submit"]');
    const submitCount = await submitBtn.count();
    console.log(`3. Found ${submitCount} submit buttons`);

    if (submitCount > 0) {
      await submitBtn.first().click();
      await page.waitForTimeout(5000);
    }

    await page.screenshot({ path: "debug-03-after-submit.png" });
    console.log(`4. After submit URL: ${page.url()}`);

    // Check for visible error messages
    const pageText = await page.textContent("body");
    const errorMatch = pageText.match(/(Failed to establish|Invalid|error|session)[^.]*\.[^.]*\./gi);
    if (errorMatch) {
      console.log(`5. Error messages found: ${JSON.stringify(errorMatch)}`);
    }

    // Log auth-related responses
    console.log("\n=== AUTH RESPONSES ===");
    for (const r of responses) {
      if (r.url.includes("auth") || r.url.includes("callback") || r.status >= 400) {
        console.log(`   ${r.status} ${r.url.substring(0, 120)}`);
      }
    }

    console.log("\n=== CONSOLE LOGS ===");
    for (const l of logs) {
      console.log(`   ${l}`);
    }
  } catch (err) {
    console.log(`\n=== ERROR ===\n${err.message}`);
    await page.screenshot({ path: "debug-error.png" });
  } finally {
    await browser.close();
  }
})();
