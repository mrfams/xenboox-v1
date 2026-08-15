import fs from "fs";
import path from "path";

import { test as setup, expect } from "@playwright/test";

const TEST_EMAIL = process.env.TEST_EMAIL || "demo@xenboox.com";
const TEST_PASSWORD = process.env.TEST_PASSWORD || "demo1234";
const STATE_DIR = path.join(__dirname, "..", ".auth");
const STATE_FILE = path.join(STATE_DIR, "user.json");

// Authenticate ONCE via the real UI flow and persist the session so every
// authenticated spec reuses the same storageState instead of hammering the
// brute-force login rate limiter (5 attempts / 60s shared bucket locally).
setup("authenticate as demo user", async ({ page }) => {
  await page.goto("/login", { waitUntil: "domcontentloaded", timeout: 60000 });
  await expect(page.locator('input[name="email"]')).toBeVisible({
    timeout: 15000,
  });
  await page.fill('input[name="email"]', TEST_EMAIL);
  await page.fill('input[name="password"]', TEST_PASSWORD);
  await page.click('button[type="submit"]');

  // Wait for navigation to the dashboard (production build serves fast;
  // dev builds may take longer to compile the route on first hit).
  await page.waitForURL("**/dashboard**", { timeout: 60000 });

  // Ensure the entity context resolved before snapshotting — otherwise the
  // storage state would lack the entity selection for downstream tests.
  await page.waitForTimeout(3000);
  const entityId = await page.evaluate(() =>
    typeof localStorage !== "undefined"
      ? localStorage.getItem("currentEntityId")
      : null,
  );
  expect(entityId).toBeTruthy();

  fs.mkdirSync(STATE_DIR, { recursive: true });
  await page.context().storageState({ path: STATE_FILE });
});
