# E2E Testing Strategy

> End-to-end testing with Playwright for critical user flows.

---

## Tool: Playwright

Playwright provides cross-browser testing with automatic waiting, network interception, and visual comparison.

---

## Critical Flows to Test

### Authentication

- [ ] Login with email/password
- [ ] Login with Google OAuth
- [ ] Session persistence across page reloads
- [ ] Logout clears session

### Onboarding (7-step wizard — aha moment after bank connection)

- [x] Welcome screen appears for new users
- [x] Chart of accounts setup completes
- [x] Bank connection flow works
- [x] Aha Moment auto-generates first insight (confidence badge, cash runway)
- [x] Team invite step functions
- [x] AI preferences save correctly
- [x] Completion → dashboard

### Financial Operations

- [x] Create invoice with line items (comprehensive-suite)
- [x] Send invoice email (comprehensive-suite)
- [x] Record payment against invoice (flows)
- [x] Create bill and mark as paid (flows)
- [x] Bank transaction categorization (stress)

### Banking

- [x] View transaction list (stress)
- [x] Filter by status (reconciled/unreconciled) (stress)
- [x] Search transactions (stress)
- [x] Batch categorize selected transactions (stress)

### Reports

- [x] Generate P&L report (flows)
- [x] Generate Balance Sheet (flows)
- [x] Export report as PDF (flows)
- [x] Export report as CSV (flows)

### Marketing Polish (new — Aug 2026)

- [x] Homepage demo video poster → modal with iframe + transcript + VideoObject JSON-LD (marketing-polish)
- [x] Pricing: Most Popular badge (a11y) + ComparisonTeaser table (marketing-polish)
- [x] Compare index + /compare/quickbooks + /compare/xero + /one-pager load (marketing-polish, marketing-pages)
- [x] Onboarding 7-step flow + Aha insight (confidence badge, runway) (onboarding-aha)

---

## Test Structure

```typescript
// e2e/auth.spec.ts
import { test, expect } from "@playwright/test";

test("user can login with email", async ({ page }) => {
  await page.goto("/login");
  await page.fill('[name="email"]', "test@example.com");
  await page.fill('[name="password"]", "password123");
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL("/dashboard");
});
```

---

## CI Integration

```yaml
# .github/workflows/ci.yml — job: e2e
- name: Run Playwright (anon marketing + compare)
  run: pnpm --filter=@xenboox/web test:e2e --project=anon-chromium
```

## How to Run Locally

```bash
pnpm dev # Next.js on :3000 in one terminal
pnpm --filter=@xenboox/web test:e2e --project=anon-chromium
pnpm --filter=@xenboox/web test:e2e --project=chromium # needs TEST_EMAIL/PASSWORD + storageState
pnpm --filter=@xenboox/web test:e2e:report
```

---

_Last updated: August 2026_
