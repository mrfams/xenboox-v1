# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: marketing-pages.spec.ts >> Marketing Pages — Public Routes >> /features loads with correct title and no errors
- Location: e2e\marketing-pages.spec.ts:22:9

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 1
+ Received  + 3

- Array []
+ Array [
+   "Executing inline script violates the following Content Security Policy directive 'script-src 'self' https://cdn.jsdelivr.net 'nonce-LduKJTgRMXwI1VGuwnBC8g==''. Either the 'unsafe-inline' keyword, a hash ('sha256-n46vPwSWuMC0W703pBofImv82Z26xo4LXymv0E9caPk='), or a nonce ('nonce-...') is required to enable inline execution. The action has been blocked.",
+ ]
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
    - generic [ref=e2]:
        - banner [ref=e3]:
            - generic [ref=e4]:
                - link "X Xenboox" [ref=e5] [cursor=pointer]:
                    - /url: /
                    - generic [ref=e6]: X
                    - generic [ref=e7]: Xenboox
                - navigation [ref=e8]:
                    - link "Features" [ref=e9] [cursor=pointer]:
                        - /url: /features
                    - link "Pricing" [ref=e10] [cursor=pointer]:
                        - /url: /pricing
                    - link "Documentation" [ref=e11] [cursor=pointer]:
                        - /url: /docs
                    - link "Download" [ref=e12] [cursor=pointer]:
                        - /url: /download
                    - link "Contact" [ref=e13] [cursor=pointer]:
                        - /url: /contact
                - generic [ref=e14]:
                    - link "Log in" [ref=e15] [cursor=pointer]:
                        - /url: /login
                    - link "Sign Up Free" [ref=e16] [cursor=pointer]:
                        - /url: /register
        - main [ref=e17]:
            - generic [ref=e22]:
                - generic [ref=e23]:
                    - img [ref=e24]
                    - text: Platform
                - heading "Everything you need to run your finance function" [level=1] [ref=e26]:
                    - text: Everything you need to
                    - text: run your finance function
                - paragraph [ref=e27]: Xenboox combines 19 specialized AI agents with a complete double-entry accounting platform. From journal entries to consolidated reporting - no gaps, no compromises.
            - generic [ref=e31]:
                - generic [ref=e32]:
                    - img [ref=e34]
                    - heading "AI Agent Workforce" [level=3] [ref=e37]
                    - paragraph [ref=e38]: From journal entry validation to payroll processing, each agent is trained on domain-specific rules and African tax regulations.
                - generic [ref=e39]:
                    - img [ref=e41]
                    - heading "Complete General Ledger" [level=3] [ref=e43]
                    - paragraph [ref=e44]: Automated journal entries, trial balance, and period-end closing workflows with multi-currency support.
                - generic [ref=e45]:
                    - img [ref=e47]
                    - heading "Payables & Receivables" [level=3] [ref=e50]
                    - paragraph [ref=e51]: Manage the complete lifecycle of payables and receivables - from purchase orders to payments.
                - generic [ref=e52]:
                    - img [ref=e54]
                    - heading "Treasury Management" [level=3] [ref=e56]
                    - paragraph [ref=e57]: Track accounts, reconcile transactions, and manage cash flow across multiple accounts in real time.
                - generic [ref=e58]:
                    - img [ref=e60]
                    - heading "Payroll Processing" [level=3] [ref=e63]
                    - paragraph [ref=e64]: Full payroll with Gambia PAYE tax bands, SSNIT contributions, and configurable deductions.
                - generic [ref=e65]:
                    - img [ref=e67]
                    - heading "Financial Reporting" [level=3] [ref=e69]
                    - paragraph [ref=e70]: Trial balance, P&L, balance sheet, cash flow - generated automatically from your ledger data.
                - generic [ref=e71]:
                    - img [ref=e73]
                    - heading "Document Management" [level=3] [ref=e76]
                    - paragraph [ref=e77]: Upload, classify, and extract data from documents automatically. Powered by Cloudflare R2.
                - generic [ref=e78]:
                    - img [ref=e80]
                    - heading "Enterprise Security" [level=3] [ref=e82]
                    - paragraph [ref=e83]: Row-level security, AES-256 encryption, rate limiting, and comprehensive audit logging.
                - generic [ref=e84]:
                    - img [ref=e86]
                    - heading "Offline-First Desktop" [level=3] [ref=e91]
                    - paragraph [ref=e92]: Tauri desktop app with local SQLite caching. Work offline and sync when reconnected.
                - generic [ref=e93]:
                    - img [ref=e95]
                    - heading "Multi-Entity Support" [level=3] [ref=e100]
                    - paragraph [ref=e101]: Manage multiple entities from a single account with role-based access control for teams.
                - generic [ref=e102]:
                    - img [ref=e104]
                    - heading "Multi-Currency" [level=3] [ref=e107]
                    - paragraph [ref=e108]: Handle transactions in multiple currencies with automatic exchange rate synchronization.
                - generic [ref=e109]:
                    - img [ref=e111]
                    - heading "Real-Time Processing" [level=3] [ref=e113]
                    - paragraph [ref=e114]: SSE token streaming, Trigger.dev background jobs, and live dashboard updates.
        - contentinfo [ref=e115]:
            - generic [ref=e116]:
                - generic [ref=e117]:
                    - heading "Stay in the loop" [level=3] [ref=e118]
                    - paragraph [ref=e119]: Product updates, accounting tips, and African fintech insights. No spam, unsubscribe anytime.
                    - generic [ref=e120]:
                        - textbox "Enter your email" [ref=e121]
                        - button "Subscribe" [ref=e122] [cursor=pointer]
                - generic [ref=e123]:
                    - generic [ref=e124]:
                        - link "X Xenboox" [ref=e125] [cursor=pointer]:
                            - /url: /
                            - generic [ref=e126]: X
                            - generic [ref=e127]: Xenboox
                        - paragraph [ref=e128]: AI-native accounting platform built for African businesses. Automated journal entries, reconciliations, payroll, and financial reporting — powered by 19 specialized AI agents.
                        - generic [ref=e129]:
                            - link "X / Twitter" [ref=e130] [cursor=pointer]:
                                - /url: "#"
                                - img [ref=e131]
                            - link "LinkedIn" [ref=e133] [cursor=pointer]:
                                - /url: "#"
                                - img [ref=e134]
                            - link "GitHub" [ref=e136] [cursor=pointer]:
                                - /url: "#"
                                - img [ref=e137]
                            - link "YouTube" [ref=e139] [cursor=pointer]:
                                - /url: "#"
                                - img [ref=e140]
                    - generic [ref=e142]:
                        - heading "Product" [level=3] [ref=e143]
                        - list [ref=e144]:
                            - listitem [ref=e145]:
                                - link "Features" [ref=e146] [cursor=pointer]:
                                    - /url: /features
                            - listitem [ref=e147]:
                                - link "Pricing" [ref=e148] [cursor=pointer]:
                                    - /url: /pricing
                            - listitem [ref=e149]:
                                - link "Download" [ref=e150] [cursor=pointer]:
                                    - /url: /download
                            - listitem [ref=e151]:
                                - link "Documentation" [ref=e152] [cursor=pointer]:
                                    - /url: /docs
                            - listitem [ref=e153]:
                                - link "Changelog" [ref=e154] [cursor=pointer]:
                                    - /url: /docs
                            - listitem [ref=e155]:
                                - link "API Reference" [ref=e156] [cursor=pointer]:
                                    - /url: /docs
                    - generic [ref=e157]:
                        - heading "Company" [level=3] [ref=e158]
                        - list [ref=e159]:
                            - listitem [ref=e160]:
                                - link "About" [ref=e161] [cursor=pointer]:
                                    - /url: /about
                            - listitem [ref=e162]:
                                - link "Blog" [ref=e163] [cursor=pointer]:
                                    - /url: /blog
                            - listitem [ref=e164]:
                                - link "Careers" [ref=e165] [cursor=pointer]:
                                    - /url: /careers
                            - listitem [ref=e166]:
                                - link "Contact" [ref=e167] [cursor=pointer]:
                                    - /url: /contact
                            - listitem [ref=e168]:
                                - link "Press Kit" [ref=e169] [cursor=pointer]:
                                    - /url: /about
                    - generic [ref=e170]:
                        - heading "Legal" [level=3] [ref=e171]
                        - list [ref=e172]:
                            - listitem [ref=e173]:
                                - link "Privacy" [ref=e174] [cursor=pointer]:
                                    - /url: /privacy
                            - listitem [ref=e175]:
                                - link "Terms" [ref=e176] [cursor=pointer]:
                                    - /url: /terms
                            - listitem [ref=e177]:
                                - link "Cookies" [ref=e178] [cursor=pointer]:
                                    - /url: /cookies
                            - listitem [ref=e179]:
                                - link "Refund Policy" [ref=e180] [cursor=pointer]:
                                    - /url: /refund
                            - listitem [ref=e181]:
                                - link "SLA" [ref=e182] [cursor=pointer]:
                                    - /url: /sla
                - generic [ref=e183]:
                    - paragraph [ref=e184]: © 2026 Xenboox. All rights reserved.
                    - generic [ref=e185]:
                        - link "Privacy" [ref=e186] [cursor=pointer]:
                            - /url: /privacy
                        - link "Terms" [ref=e187] [cursor=pointer]:
                            - /url: /terms
                        - link "Cookies" [ref=e188] [cursor=pointer]:
                            - /url: /cookies
    - alert [ref=e189]
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  |
  3  | const BASE_URL = process.env.BASE_URL || "https://xenboox.vercel.app";
  4  |
  5  | test.describe("Marketing Pages — Public Routes", () => {
  6  |   const publicPages = [
  7  |     { path: "/", title: /Xenboox|AI.native accounting/i },
  8  |     { path: "/features", title: /Features|Xenboox/i },
  9  |     { path: "/pricing", title: /Pricing|Xenboox/i },
  10 |     { path: "/about", title: /About|Xenboox/i },
  11 |     { path: "/blog", title: /Blog|Xenboox/i },
  12 |     { path: "/contact", title: /Contact|Xenboox/i },
  13 |     { path: "/privacy", title: /Privacy|Xenboox/i },
  14 |     { path: "/terms", title: /Terms|Xenboox/i },
  15 |     { path: "/cookies", title: /Cookies|Xenboox/i },
  16 |     { path: "/refund", title: /Refund|Xenboox/i },
  17 |     { path: "/sla", title: /SLA|Xenboox/i },
  18 |     { path: "/docs", title: /Docs|Xenboox/i },
  19 |   ];
  20 |
  21 |   for (const { path, title } of publicPages) {
  22 |     test(`${path} loads with correct title and no errors`, async ({ page }) => {
  23 |       const errors: string[] = [];
  24 |       page.on("pageerror", (err) => errors.push(err.message));
  25 |       page.on("console", (msg) => {
  26 |         if (msg.type() === "error") errors.push(msg.text());
  27 |       });
  28 |
  29 |       const response = await page.goto(path, {
  30 |         waitUntil: "networkidle",
  31 |         timeout: 30000,
  32 |       });
  33 |
  34 |       // Should return 200
  35 |       expect(response?.status()).toBe(200);
  36 |
  37 |       // Should have the correct title
  38 |       await expect(page).toHaveTitle(title);
  39 |
  40 |       // Should not have JavaScript errors
  41 |       expect(
  42 |         errors.filter((e) => !e.includes("Failed to load resource")),
> 43 |       ).toEqual([]);
     |         ^ Error: expect(received).toEqual(expected) // deep equality
  44 |
  45 |       // Should have a visible body
  46 |       await expect(page.locator("body")).toBeVisible();
  47 |     });
  48 |   }
  49 | });
  50 |
```
