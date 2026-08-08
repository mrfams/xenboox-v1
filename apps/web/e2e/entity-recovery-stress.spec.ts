import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

import { test, expect } from "@playwright/test";
import bcrypt from "bcryptjs";
import { neon } from "@neondatabase/serverless";

/**
 * Read DATABASE_URL the same way the app does (root .env.local wins).
 */
function getDbUrl(): string {
  const candidates = [
    resolve(__dirname, "../../../.env.local"),
    resolve(__dirname, "../../.env.local"),
    resolve(__dirname, "../.env.local"),
    resolve(__dirname, ".env.local"),
  ];
  for (const p of candidates) {
    try {
      if (!existsSync(p)) continue;
      const env = readFileSync(p, "utf8");
      const line = env
        .split("\n")
        .find((l) => l.trim().startsWith("DATABASE_URL="));
      if (line) {
        return line
          .slice(line.indexOf("=") + 1)
          .trim()
          .replace(/^"|"$/g, "")
          .replace(/;$/, "");
      }
    } catch {
      // Ignore unreadable env files and try the next candidate.
    }
  }
  throw new Error("DATABASE_URL not found for E2E entity test");
}

/**
 * Creates a throwaway user with NO organization, NO entity, and NO access
 * rows — exactly the state of a brand-new signup who hasn't onboarded yet.
 * Returns the user id + a unique email.
 */
async function createNoEntityUser(): Promise<{ id: string; email: string }> {
  const sql = neon(getDbUrl());
  const email = `e2e-noentity-${Date.now()}@xenboox.test`;
  const passwordHash = await bcrypt.hash("demo1234", 10);
  const rows = await sql(
    `INSERT INTO users (name, email, email_verified, password_hash, auth_provider)
     VALUES ($1, $2, $3, $4, 'credentials')
     RETURNING id`,
    ["E2E No-Entity User", email, new Date().toISOString(), passwordHash],
  );
  return { id: rows[0].id, email };
}

/** Clean up the throwaway user + any rows referencing it. */
async function deleteUser(id: string): Promise<void> {
  const sql = neon(getDbUrl());
  await sql("DELETE FROM user_entity_access WHERE user_id = $1", [id]);
  await sql("DELETE FROM org_roles WHERE user_id = $1", [id]);
  await sql("DELETE FROM sessions WHERE user_id = $1", [id]);
  await sql("DELETE FROM users WHERE id = $1", [id]);
}

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

test.describe("No-entity user sees direct Create entity button", () => {
  test("header shows a Create entity button instead of a dropdown", async ({
    page,
  }) => {
    // Create a throwaway user with NO org and NO entity — brand-new signup state.
    const { id, email } = await createNoEntityUser();
    try {
      // Log in as the new user via the UI.
      await page.goto("/login", { waitUntil: "networkidle" });
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', "demo1234");
      await page.getByRole("button", { name: /sign in|log in/i }).click();
      await page.waitForURL("**/dashboard**", { timeout: 15000 });
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2500);

      // The header must show a direct "Create entity" entry point.
      const header = await page.locator("header").first().innerText();
      console.log("EMPTY-STATE HEADER:", header.slice(0, 150));
      expect(header).toContain("Create entity");
      expect(header).not.toContain("Select entity");

      // Clicking it must open the create dialog directly (no dropdown hop).
      await page
        .locator("header")
        .first()
        .getByText("Create entity", { exact: false })
        .first()
        .click();
      await page.waitForTimeout(1200);
      // The create dialog should be open directly — its name field is visible.
      await expect(page.locator("#entity-name")).toBeVisible({
        timeout: 5000,
      });
      const dialogText = await page.locator("body").innerText();
      expect(/create new entity/i.test(dialogText)).toBe(true);
    } finally {
      await deleteUser(id);
    }
  });
});
