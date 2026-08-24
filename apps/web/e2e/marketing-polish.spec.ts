import { test, expect } from "@playwright/test";

test.describe("Marketing Polish — Demo Video + Comparison + Badge", () => {
  test("homepage: demo video poster + opens modal + transcript", async ({
    page,
  }) => {
    const response = await page.goto("/", {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    expect(response?.status()).toBe(200);

    const playButton = page.getByRole("button", {
      name: /play 2-minute demo/i,
    });
    await expect(playButton).toBeVisible({ timeout: 10_000 });
    await expect(playButton).toHaveAttribute(
      "aria-label",
      /play 2-minute demo/i,
    );

    // Poster shows duration badge
    await expect(page.locator("text=2:03").first()).toBeVisible();

    // Open modal
    await playButton.click();
    const dialog = page.getByRole("dialog", { name: /demo video/i });
    await expect(dialog).toBeVisible({ timeout: 5_000 });
    const iframe = dialog.locator('iframe[title*="Xenboox demo"]');
    await expect(iframe).toBeVisible();
    await expect(iframe).toHaveAttribute("src", /youtube\.com\/embed/);

    // Close via Esc and via close button both work (test close button)
    await page
      .getByRole("button", { name: /close video/i })
      .first()
      .click();
    await expect(dialog).toBeHidden({ timeout: 5_000 });

    // Re-open and close with Escape
    await playButton.click();
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden({ timeout: 5_000 });

    // Transcript is present
    await expect(
      page.locator("summary", { hasText: /video transcript/i }),
    ).toBeVisible();
    await expect(page.locator("text=See Xenboox in action")).toBeVisible();
  });

  test("homepage: VideoObject JSON-LD present", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded", timeout: 30_000 });
    const scripts = page.locator('script[type="application/ld+json"]');
    const count = await scripts.count();
    let found = false;
    for (let i = 0; i < count; i++) {
      const text = await scripts.nth(i).textContent();
      if (
        text?.includes('"@type":"VideoObject"') ||
        text?.includes("VideoObject")
      ) {
        found = true;
        expect(text).toMatch(/PT2M/);
        break;
      }
    }
    expect(found, "VideoObject JSON-LD should exist on homepage").toBeTruthy();
  });

  test("pricing: Most Popular badge + comparison teaser", async ({ page }) => {
    const response = await page.goto("/pricing", {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    expect(response?.status()).toBe(200);

    const badge = page.getByLabel("Most popular plan");
    await expect(badge).toBeVisible({ timeout: 10_000 });
    await expect(badge).toContainText(/most popular/i);

    // Comparison teaser
    await expect(
      page.getByRole("heading", { name: /how we compare/i }),
    ).toBeVisible();
    // Table headers
    await expect(
      page.locator("th", { hasText: "Feature" }).first(),
    ).toBeVisible();
    await expect(
      page.locator("th", { hasText: "Xenboox" }).first(),
    ).toBeVisible();
    await expect(
      page.locator("th", { hasText: "QuickBooks" }).first(),
    ).toBeVisible();
    await expect(page.locator("th", { hasText: "Xero" }).first()).toBeVisible();

    // Links to full compare pages
    await expect(
      page.getByRole("link", { name: /vs quickbooks/i }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /vs xero/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /view all/i })).toBeVisible();

    // Navigate via teaser link works
    await page
      .getByRole("link", { name: /vs quickbooks/i })
      .first()
      .click();
    await page.waitForLoadState("domcontentloaded");
    await expect(page).toHaveURL(/\/compare\/quickbooks/);
    await expect(page.locator("h1", { hasText: /QuickBooks/i })).toBeVisible();
  });

  test("compare: index cards + deep pages load", async ({ page }) => {
    let res = await page.goto("/compare", {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    expect(res?.status()).toBe(200);
    await expect(
      page.getByRole("heading", { name: /compare xenboox/i }),
    ).toBeVisible();
    await expect(
      page
        .getByRole("link", { name: /compare xenboox vs quickbooks/i })
        .first(),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /compare xenboox vs xero/i }).first(),
    ).toBeVisible();

    res = await page.goto("/compare/xero", {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    expect(res?.status()).toBe(200);
    await expect(
      page.locator("h1", { hasText: /Xenboox vs Xero/i }),
    ).toBeVisible();
    await expect(page.locator("table")).toBeVisible();

    res = await page.goto("/one-pager", {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    expect(res?.status()).toBe(200);
    await expect(
      page.locator("h1", { hasText: /xenboox/i }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /download.*one-pager/i }),
    ).toBeVisible();
  });
});
