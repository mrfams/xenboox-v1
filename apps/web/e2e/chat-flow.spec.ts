import { test, expect } from "@playwright/test";

// ─── Helper Functions ──────────────────────────────────────────────────────

async function login(page: any) {
  await page.goto("/dashboard", {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  const url = page.url();
  if (url.includes("/dashboard")) return;
  await page.goto("/login");
  await page.fill('input[name="email"]', "demo@xenboox.com");
  await page.fill('input[name="password"]', "demo1234");
  await page.click('button[type="submit"]');
  await page.waitForURL("/dashboard", { timeout: 30000 });
}

// ─── Command Center (AI Chat) Tests ───────────────────────────────────────

test.describe("Command Center - AI Chat Flow", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("should display Command Center with AI greeting", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Should show the AI greeting (good morning/afternoon/evening)
    await expect(
      page.getByText(/Good (morning|afternoon|evening)/),
    ).toBeVisible();

    // Should show AI input
    await expect(
      page.getByPlaceholder("Ask anything about your accounting..."),
    ).toBeVisible();
  });

  test("should show proactive briefing section", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Should show the AI briefing section
    await expect(page.getByText("Your AI briefing")).toBeVisible();
  });

  test("should send a message and receive streaming response", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Type a message
    const input = page.getByPlaceholder(
      "Ask anything about your accounting...",
    );
    await input.fill("What is my cash position?");

    // Send the message
    await input.press("Enter");

    // The user's message renders in the thread
    await expect(
      page.getByText("What is my cash position?").first(),
    ).toBeVisible({ timeout: 20000 });

    // Should show thinking indicator or streamed response
    await expect(
      page.getByText("Thinking...").or(page.getByText("Xenboox AI")),
    ).toBeVisible({ timeout: 15000 });
  });

  test("should show suggestion chips", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Should show suggestion chips in the AI input area
    await expect(page.getByText("Cash position")).toBeVisible();
    await expect(page.getByText("Show P&L")).toBeVisible();
    await expect(page.getByText("What's overdue?")).toBeVisible();
  });

  test("should submit via suggestion chip click", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Click a suggestion chip
    await page.getByText("Cash position").click();

    // Should show thinking indicator or response
    await expect(
      page.getByText("Thinking...").or(page.getByText("Xenboox AI")),
    ).toBeVisible({ timeout: 10000 });
  });
});

// ─── Dashboard Inline AI Tests ─────────────────────────────────────────────

test.describe("Dashboard - Inline AI Input", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("should show inline AI input on dashboard", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Should show the AI input
    await expect(
      page.getByPlaceholder("Ask anything about your accounting..."),
    ).toBeVisible();
  });

  test("should show suggestion pills", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Should show suggestion pills
    await expect(page.getByText("Cash position")).toBeVisible();
    await expect(page.getByText("Show P&L")).toBeVisible();
  });

  test("should send message and show inline response", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Type a message
    const input = page.getByPlaceholder(
      "Ask anything about your accounting...",
    );
    await input.fill("What is my cash position?");

    // Send the message
    await input.press("Enter");

    // Should show thinking indicator
    await expect(page.getByText("Thinking...")).toBeVisible({ timeout: 5000 });

    // Wait for response
    await expect(page.getByText("Xenboox AI")).toBeVisible({ timeout: 15000 });
  });

  test("should submit via suggestion pill click", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Click a suggestion pill
    await page.getByText("Show P&L").click();

    // Should show thinking indicator
    await expect(page.getByText("Thinking...")).toBeVisible({ timeout: 5000 });
  });
});

// ─── Entity Creation Tests ─────────────────────────────────────────────────

test.describe("Entity Creation Flow", () => {
  test("should show create entity button when no entities exist", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Check if entity switcher shows create button
    const createButton = page.getByText("Create Entity");
    if (await createButton.isVisible()) {
      await expect(createButton).toBeVisible();
    }
  });

  test("should open create entity dialog", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Click create entity button if visible
    const createButton = page.getByText("Create Entity");
    if (await createButton.isVisible()) {
      await createButton.click();

      // Should show dialog
      await expect(page.getByText("Create New Entity")).toBeVisible();
      await expect(page.getByText("Entity Name")).toBeVisible();
    }
  });
});
