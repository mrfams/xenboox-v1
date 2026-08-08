import { test, expect } from "@playwright/test";

test.describe("Entity recovery from stale localStorage id", () => {
  test("stale entityId heals to a real entity — no 403 storm", async ({
    page,
  }) => {
    const badResponses: string[] = [];
    page.on("response", (res) => {
      const url = res.url();
      if (url.includes("/api/trpc/") && res.status() >= 400) {
        badResponses.push(
          `HTTP ${res.status()} ${url.split("/api/trpc/")[1]?.slice(0, 70)}`,
        );
      }
    });

    // Simulate a user whose localStorage points to a deleted/ghost entity
    await page.addInitScript(() => {
      localStorage.setItem(
        "currentEntityId",
        "00000000-0000-0000-0000-000000000000",
      );
      localStorage.setItem("currentEntityRole", "owner");
    });

    await page.goto("/dashboard", { waitUntil: "networkidle" });
    await page.waitForTimeout(3500);

    // The switcher must NOT remain on the ghost id — it should show a real
    // entity name (whatever the user can access) instead of "Select entity".
    const header = await page.locator("header").first().innerText();
    console.log("HEADER:", header.slice(0, 120));
    expect(header).not.toContain("Select entity");
    expect(header).not.toContain("Loading");
    expect(header.length).toBeGreaterThan(3);

    // No 403s from entity-scoped queries (the ghost id must be rejected early)
    console.log("BAD RESPONSES:", badResponses.slice(0, 5));
    expect(badResponses).toHaveLength(0);
  });

  test("create entity works even when localStorage had a stale id", async ({
    page,
  }) => {
    const badResponses: string[] = [];
    page.on("response", (res) => {
      const url = res.url();
      if (url.includes("/api/trpc/") && res.status() >= 400) {
        badResponses.push(
          `HTTP ${res.status()} ${url.split("/api/trpc/")[1]?.slice(0, 70)}`,
        );
      }
    });

    await page.addInitScript(() => {
      localStorage.setItem(
        "currentEntityId",
        "00000000-0000-0000-0000-000000000000",
      );
      localStorage.setItem("currentEntityRole", "owner");
    });

    await page.goto("/dashboard", { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);

    // Open switcher → Create new entity → fill → submit. The trigger is the
    // first visible button in the header (entity switcher); on desktop the
    // mobile-menu button next to it is hidden.
    await page.locator("header button:visible").first().click();
    await page.waitForTimeout(600);
    await page.getByText("Create new entity").first().click();
    await page.waitForTimeout(1200);

    const name = `HealTest ${Date.now() % 100000}`;
    await page.locator("#entity-name").first().fill(name);
    await page.waitForTimeout(200);
    await page.locator('button:has-text("Create Entity")').last().click();
    await page.waitForTimeout(4500);

    const bodyText = await page.locator("body").innerText();
    console.log("CREATED VISIBLE:", bodyText.includes(name));
    console.log("BAD RESPONSES:", badResponses.slice(0, 5));

    expect(bodyText.includes(name)).toBe(true);
    expect(badResponses).toHaveLength(0);
  });
});
