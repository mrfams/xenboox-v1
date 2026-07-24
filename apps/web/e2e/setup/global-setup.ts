import { chromium, type Browser } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "https://xenboox.vercel.app";

async function globalSetup() {
  console.log(`\n🔍 Global Setup: Testing against ${BASE_URL}\n`);

  // Validate the base URL is reachable
  const browser: Browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    const response = await page.goto(BASE_URL, {
      waitUntil: "networkidle",
      timeout: 30000,
    });

    if (!response?.ok()) {
      console.error(`⚠️  Warning: Base URL returned ${response?.status()}`);
    } else {
      console.log(`✅ Base URL reachable (${response.status()})`);
    }
  } catch (err) {
    console.error(`❌ Cannot reach ${BASE_URL}: ${err}`);
    console.error("Tests may fail if the application is not running.");
  } finally {
    await browser.close();
  }

  console.log(""); // newline
}

export default globalSetup;
