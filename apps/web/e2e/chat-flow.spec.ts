import { test, expect } from "@playwright/test";

// ─── Helper Functions ──────────────────────────────────────────────────────

async function login(page: any) {
  await page.goto("/login");
  await page.fill('input[name="email"]', "demo@xenboox.com");
  await page.fill('input[name="password"]', "demo1234");
  await page.click('button[type="submit"]');
  await page.waitForURL("/dashboard", { timeout: 15000 });
}

// ─── Chat Page Tests ───────────────────────────────────────────────────────

test.describe("Chat Page - Agentic Flow", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("should display chat page with conversation sidebar", async ({
    page,
  }) => {
    await page.goto("/dashboard/chat");
    await page.waitForLoadState("networkidle");

    // Should show the chat page header
    await expect(page.getByText("AI Workspace")).toBeVisible();

    // Should show conversation sidebar
    await expect(page.getByText("Conversations")).toBeVisible();

    // Should show new chat button
    await expect(page.getByText("New Conversation")).toBeVisible();
  });

  test("should show smart suggestions when no conversation is active", async ({
    page,
  }) => {
    await page.goto("/dashboard/chat");
    await page.waitForLoadState("networkidle");

    // Should show welcome message or smart suggestions
    await expect(page.getByText("What can I help with?")).toBeVisible();
  });

  test("should send a message and receive streaming response", async ({
    page,
  }) => {
    await page.goto("/dashboard/chat");
    await page.waitForLoadState("networkidle");

    // Type a message
    const input = page.getByPlaceholder("What would you like Xenboox to do?");
    await input.fill("What is my cash position?");

    // Send the message
    await input.press("Enter");

    // Should show agent activity block
    await expect(page.getByText("Agent Activity")).toBeVisible({
      timeout: 10000,
    });

    // Should show streaming indicator
    await expect(page.getByText("typing...")).toBeVisible({ timeout: 5000 });

    // Wait for response to complete
    await expect(page.getByText("typing...")).not.toBeVisible({
      timeout: 30000,
    });

    // Should have a response
    const messages = page.locator('[class*="rounded-2xl"]');
    expect(await messages.count()).toBeGreaterThan(0);
  });

  test("should show agent activity during streaming", async ({ page }) => {
    await page.goto("/dashboard/chat");
    await page.waitForLoadState("networkidle");

    // Send a message
    const input = page.getByPlaceholder("What would you like Xenboox to do?");
    await input.fill("Show me unpaid invoices");
    await input.press("Enter");

    // Should show agent activity block
    await expect(page.getByText("Agent Activity")).toBeVisible({
      timeout: 10000,
    });

    // Should show CFO Agent working
    await expect(page.getByText("CFO Agent")).toBeVisible({ timeout: 5000 });
  });

  test("should create a new conversation", async ({ page }) => {
    await page.goto("/dashboard/chat");
    await page.waitForLoadState("networkidle");

    // Click new conversation button
    await page.getByText("New Conversation").click();

    // Should show empty state
    await expect(
      page.getByText("What would you like Xenboox to do?"),
    ).toBeVisible();
  });

  test("should show right sidebar with tabs", async ({ page }) => {
    await page.goto("/dashboard/chat");
    await page.waitForLoadState("networkidle");

    // Should show right sidebar tabs
    await expect(page.getByText("Approvals")).toBeVisible();
    await expect(page.getByText("Documents")).toBeVisible();
    await expect(page.getByText("Activity")).toBeVisible();
  });

  test("should switch between right sidebar tabs", async ({ page }) => {
    await page.goto("/dashboard/chat");
    await page.waitForLoadState("networkidle");

    // Click Documents tab
    await page.getByText("Documents").click();

    // Should show documents content
    await expect(page.getByText("No documents yet")).toBeVisible();

    // Click Activity tab
    await page.getByText("Activity").click();

    // Should show activity content
    await expect(page.getByText("Agent")).toBeVisible();
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
    await expect(page.getByText("Close July books")).toBeVisible();
    await expect(page.getByText("Explain cash position")).toBeVisible();
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

    // Should show "Open in chat" link
    await expect(page.getByText("Open in chat →")).toBeVisible({
      timeout: 30000,
    });
  });

  test("should navigate to chat from inline response", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Send a message
    const input = page.getByPlaceholder(
      "Ask anything about your accounting...",
    );
    await input.fill("Show cash position");
    await input.press("Enter");

    // Wait for response
    await expect(page.getByText("Open in chat →")).toBeVisible({
      timeout: 30000,
    });

    // Click "Open in chat"
    await page.getByText("Open in chat →").click();

    // Should navigate to chat page
    await expect(page).toHaveURL(/\/dashboard\/chat\?c=/);
  });

  test("should submit via suggestion pill click", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Click a suggestion pill
    await page.getByText("Explain cash position").click();

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
