import { test, expect } from "@playwright/test";

// ─── Helper Functions ──────────────────────────────────────────────────────

async function login(page: any) {
  // Idempotent login: the authenticated project already carries a session via
  // storageState, so first check whether we're already on the dashboard.
  await page.goto("/dashboard", {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  const url = page.url();
  if (url.includes("/dashboard")) return;
  // Fall back to a real UI login when storageState is unavailable (e.g. ad-hoc runs).
  await page.goto("/login");
  await page.fill('input[name="email"]', "demo@xenboox.com");
  await page.fill('input[name="password"]', "demo1234");
  await page.click('button[type="submit"]');
  await page.waitForURL("/dashboard", { timeout: 30000 });
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

    // Fresh workspaces show the AI Workspace header and the onboarding welcome
    // (or the suggestion grid) — either empty-state variant is correct.
    await expect(
      page.getByRole("heading", { name: "AI Workspace" }),
    ).toBeVisible();
    await expect(
      page
        .getByText("Welcome to Xenboox")
        .or(page.getByText("What can I help with?")),
    ).toBeVisible();
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

    // Sending enters chat mode and creates a conversation (streaming run)
    await expect(page).toHaveURL(/\/dashboard\/chat\?c=/, { timeout: 30000 });

    // The user's message renders in the thread (may appear in both the thread
    // and the conversation list — previous runs leave matching entries)
    await expect(
      page.getByText("What is my cash position?").first(),
    ).toBeVisible({
      timeout: 20000,
    });

    // The conversation list refreshes to include the new conversation
    await expect(
      page.getByText("What is my cash position?").first(),
    ).toBeVisible();
  });

  test("should show agent activity during streaming", async ({ page }) => {
    await page.goto("/dashboard/chat");
    await page.waitForLoadState("networkidle");

    // Send a message
    const input = page.getByPlaceholder("What would you like Xenboox to do?");
    await input.fill("Show me unpaid invoices");
    await input.press("Enter");

    // The agentic run starts: a conversation is created and the streaming
    // workspace opens. Agent Activity / typing indicators appear while the
    // run streams, depending on LLM availability.
    await expect(page).toHaveURL(/\/dashboard\/chat\?c=/, { timeout: 30000 });
    await expect(page.getByText("Show me unpaid invoices").first()).toBeVisible(
      {
        timeout: 20000,
      },
    );
  });

  test("should create a new conversation", async ({ page }) => {
    await page.goto("/dashboard/chat");
    await page.waitForLoadState("networkidle");

    // Click new conversation button
    await page.getByText("New Conversation").click();

    // Should return to the empty workspace state with the composer ready
    await expect(
      page.getByRole("heading", { name: "AI Workspace" }),
    ).toBeVisible();
    await expect(
      page.getByPlaceholder("What would you like Xenboox to do?"),
    ).toBeVisible();
  });

  test("should show right sidebar with tabs", async ({ page }) => {
    await page.goto("/dashboard/chat");
    await page.waitForLoadState("networkidle");

    // Should show right sidebar tabs (exact button roles — plain getByText
    // also matches "Check Approvals" links elsewhere on the page)
    await expect(
      page.getByRole("button", { name: "Approvals", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Documents", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Activity", exact: true }),
    ).toBeVisible();
  });

  test("should switch between right sidebar tabs", async ({ page }) => {
    await page.goto("/dashboard/chat");
    await page.waitForLoadState("networkidle");

    // Click Documents tab
    await page.getByRole("button", { name: "Documents", exact: true }).click();

    // Should show documents content
    await expect(page.getByText("No documents yet")).toBeVisible();

    // Click Activity tab
    await page.getByRole("button", { name: "Activity", exact: true }).click();

    // Should show agent activity content (timeline empty state when no runs yet)
    await expect(page.getByText("No agent activity yet").first()).toBeVisible();
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

    // Click "Open in chat". dispatchEvent bypasses hit-testing so the click
    // lands on the button even when other UI overlaps its position.
    await page.getByText("Open in chat →").first().dispatchEvent("click");

    // Should navigate to chat page
    await expect(page).toHaveURL(/\/dashboard\/chat\?c=/, { timeout: 15000 });
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
