const { chromium } = require("C:\\Users\\asano\\AppData\\Local\\pnpm\\global\\5\\node_modules\\playwright");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ bypassCSP: true });
  const page = await context.newPage();

  page.on("console", (msg) => console.log(`[CONSOLE ${msg.type()}] ${msg.text()}`));
  page.on("pageerror", (err) => console.log(`[PAGE_ERR] ${err.message}`));

  const authResponses = [];
  page.on("response", async (res) => {
    const url = res.url();
    if (url.includes("auth") || url.includes("callback") || url.includes("trpc/auth")) {
      const headers = res.headers();
      authResponses.push({
        status: res.status(),
        url: url.substring(0, 120),
        location: headers["location"] || headers["Location"] || null,
        contentType: headers["content-type"] || null,
      });
      // Try to read body
      if (res.status() >= 400 || url.includes("callback")) {
        try {
          const text = await res.text();
          authResponses[authResponses.length - 1].body = text.substring(0, 500);
        } catch {}
      }
    }
  });

  try {
    // Go to login page
    console.log("\n=== STEP 1: Loading login page ===");
    await page.goto("https://xenboox.vercel.app/login", { waitUntil: "networkidle", timeout: 30000 });
    console.log(`URL: ${page.url()}`);

    // Fill credentials
    console.log("\n=== STEP 2: Filling credentials ===");
    await page.locator('input[type="email"]').first().fill("demo@xenboox.com");
    await page.locator('input[type="password"]').first().fill("demo1234");

    // Submit - DON'T await navigation, capture the POST response
    console.log("\n=== STEP 3: Clicking submit ===");

    // Wait for any auth-related responses
    const responsePromise = new Promise((resolve) => {
      const handler = async (res) => {
        if (res.url().includes("/api/auth/callback/credentials")) {
          const headers = res.headers();
          resolve({ status: res.status(), location: headers["location"] || headers["Location"] || "none", url: res.url() });
        }
      };
      page.on("response", handler);
      setTimeout(() => { page.removeListener("response", handler); resolve(null); }, 10000);
    });

    await page.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(5000);

    const callbackResult = await responsePromise;
    if (callbackResult) {
      console.log(`Auth callback: ${callbackResult.status} → Location: ${callbackResult.location}`);
    } else {
      console.log("No auth callback response captured");
    }

    console.log(`Current URL after submit: ${page.url()}`);

    // Print all captured auth responses
    console.log("\n=== ALL AUTH RESPONSES ===");
    for (const r of authResponses) {
      console.log(`${r.status} ${r.url.substring(0, 100)}`);
      if (r.location) console.log(`  Location: ${r.location}`);
      if (r.body) console.log(`  Body: ${r.body}`);
    }

    await page.screenshot({ path: "debug-final.png" });
    console.log("\nScreenshot saved to debug-final.png");
  } catch (err) {
    console.log(`\nERROR: ${err.message}`);
    await page.screenshot({ path: "debug-error.png" });
  } finally {
    await browser.close();
  }
})();
