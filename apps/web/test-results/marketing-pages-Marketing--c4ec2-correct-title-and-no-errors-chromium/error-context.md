# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: marketing-pages.spec.ts >> Marketing Pages — Public Routes >> /docs loads with correct title and no errors
- Location: e2e\marketing-pages.spec.ts:22:9

# Error details

```
TimeoutError: page.goto: Timeout 30000ms exceeded.
Call log:
  - navigating to "https://xenboox.vercel.app/docs", waiting until "networkidle"

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
            - generic [ref=e18]:
                - generic [ref=e20]:
                    - generic [ref=e21]:
                        - link "X Xenboox" [ref=e22] [cursor=pointer]:
                            - /url: /
                            - generic [ref=e23]: X
                            - generic [ref=e24]: Xenboox
                        - generic [ref=e25]:
                            - generic [ref=e26]: /
                            - link "Docs" [ref=e27] [cursor=pointer]:
                                - /url: /docs
                    - generic [ref=e28]:
                        - button "Search documentation... ⌘ K" [ref=e30] [cursor=pointer]:
                            - img [ref=e31]
                            - generic [ref=e34]: Search documentation...
                            - generic [ref=e35]:
                                - generic [ref=e36]: ⌘
                                - text: K
                        - button "Toggle dark mode" [ref=e37] [cursor=pointer]:
                            - img [ref=e38]
                        - link "Get Started" [ref=e40] [cursor=pointer]:
                            - /url: /register
                - generic [ref=e43]:
                    - complementary [ref=e44]:
                        - generic [ref=e45]:
                            - button "Search documentation... ⌘ K" [ref=e47] [cursor=pointer]:
                                - img [ref=e48]
                                - generic [ref=e51]: Search documentation...
                                - generic [ref=e52]:
                                    - generic [ref=e53]: ⌘
                                    - text: K
                            - navigation [ref=e54]:
                                - generic [ref=e55]:
                                    - button "Documentation" [ref=e56] [cursor=pointer]:
                                        - generic [ref=e57]:
                                            - img [ref=e58]
                                            - text: Documentation
                                        - img [ref=e60]
                                    - generic [ref=e62]:
                                        - link "Getting Started" [ref=e63] [cursor=pointer]:
                                            - /url: /docs/getting-started
                                        - link "FAQ" [ref=e64] [cursor=pointer]:
                                            - /url: /docs/faq
                                - button "Modules" [ref=e66] [cursor=pointer]:
                                    - generic [ref=e67]:
                                        - img [ref=e68]
                                        - text: Modules
                                    - img [ref=e71]
                                - button "AI Agents" [ref=e74] [cursor=pointer]:
                                    - generic [ref=e75]:
                                        - img [ref=e76]
                                        - text: AI Agents
                                    - img [ref=e79]
                                - button "Infrastructure" [ref=e82] [cursor=pointer]:
                                    - generic [ref=e83]:
                                        - img [ref=e84]
                                        - text: Infrastructure
                                    - img [ref=e86]
                            - generic [ref=e88]:
                                - link "Home" [ref=e89] [cursor=pointer]:
                                    - /url: /
                                    - img [ref=e90]
                                    - text: Home
                                - link "Support" [ref=e94] [cursor=pointer]:
                                    - /url: /contact
                                    - img [ref=e95]
                                    - text: Support
                    - main [ref=e99]:
                        - generic [ref=e100]:
                            - generic [ref=e105]:
                                - paragraph [ref=e106]: Docs
                                - heading "Documentation" [level=1] [ref=e107]
                                - paragraph [ref=e108]: Everything you need to get started with Xenboox — from setting up your organization to building on our API.
                                - generic [ref=e109]:
                                    - link "Get Started Guide" [ref=e110] [cursor=pointer]:
                                        - /url: /docs/getting-started
                                        - text: Get Started Guide
                                        - img [ref=e111]
                                    - link "API Reference" [ref=e113] [cursor=pointer]:
                                        - /url: /docs/api
                            - generic [ref=e116]:
                                - img [ref=e117]
                                - textbox "Search documentation..." [ref=e120]
                            - generic [ref=e123]:
                                - link "Getting Started Set up your organization, connect your data, and run your first month-end close. 8 articles" [ref=e124] [cursor=pointer]:
                                    - /url: /docs/getting-started
                                    - img [ref=e126]
                                    - heading "Getting Started" [level=3] [ref=e128]
                                    - paragraph [ref=e129]: Set up your organization, connect your data, and run your first month-end close.
                                    - generic [ref=e130]:
                                        - generic [ref=e131]: 8 articles
                                        - img [ref=e132]
                                - link "Chart of Accounts Structure your accounts, import templates, and manage your COA hierarchy. 5 articles" [ref=e134] [cursor=pointer]:
                                    - /url: /docs/chart-of-accounts
                                    - img [ref=e136]
                                    - heading "Chart of Accounts" [level=3] [ref=e140]
                                    - paragraph [ref=e141]: Structure your accounts, import templates, and manage your COA hierarchy.
                                    - generic [ref=e142]:
                                        - generic [ref=e143]: 5 articles
                                        - img [ref=e144]
                                - link "Users & Roles Invite team members, assign roles, and manage entity-level access. 6 articles" [ref=e146] [cursor=pointer]:
                                    - /url: /docs/users-roles
                                    - img [ref=e148]
                                    - heading "Users & Roles" [level=3] [ref=e153]
                                    - paragraph [ref=e154]: Invite team members, assign roles, and manage entity-level access.
                                    - generic [ref=e155]:
                                        - generic [ref=e156]: 6 articles
                                        - img [ref=e157]
                                - link "Integrations Connect bank feeds, mobile money, import from QuickBooks or Xero. 7 articles" [ref=e159] [cursor=pointer]:
                                    - /url: /docs/integrations
                                    - img [ref=e161]
                                    - heading "Integrations" [level=3] [ref=e164]
                                    - paragraph [ref=e165]: Connect bank feeds, mobile money, import from QuickBooks or Xero.
                                    - generic [ref=e166]:
                                        - generic [ref=e167]: 7 articles
                                        - img [ref=e168]
                                - link "Security & Compliance Encryption, audit trails, entity isolation, and data retention policies. 4 articles" [ref=e170] [cursor=pointer]:
                                    - /url: /docs/security
                                    - img [ref=e172]
                                    - heading "Security & Compliance" [level=3] [ref=e174]
                                    - paragraph [ref=e175]: Encryption, audit trails, entity isolation, and data retention policies.
                                    - generic [ref=e176]:
                                        - generic [ref=e177]: 4 articles
                                        - img [ref=e178]
                                - link "AI Agent Guide How to work with the CFO Agent, understand confidence scores, and review AI actions. 6 articles" [ref=e180] [cursor=pointer]:
                                    - /url: /docs/ai-agent-guide
                                    - img [ref=e182]
                                    - heading "AI Agent Guide" [level=3] [ref=e184]
                                    - paragraph [ref=e185]: How to work with the CFO Agent, understand confidence scores, and review AI actions.
                                    - generic [ref=e186]:
                                        - generic [ref=e187]: 6 articles
                                        - img [ref=e188]
                                - link "Reports & Exports Generate financial statements, custom reports, and filing exports. 5 articles" [ref=e190] [cursor=pointer]:
                                    - /url: /docs/reports
                                    - img [ref=e192]
                                    - heading "Reports & Exports" [level=3] [ref=e195]
                                    - paragraph [ref=e196]: Generate financial statements, custom reports, and filing exports.
                                    - generic [ref=e197]:
                                        - generic [ref=e198]: 5 articles
                                        - img [ref=e199]
                                - link "API Reference Build integrations with our REST API — webhooks, endpoints, rate limits. 12 articles" [ref=e201] [cursor=pointer]:
                                    - /url: /docs/api
                                    - img [ref=e203]
                                    - heading "API Reference" [level=3] [ref=e205]
                                    - paragraph [ref=e206]: Build integrations with our REST API — webhooks, endpoints, rate limits.
                                    - generic [ref=e207]:
                                        - generic [ref=e208]: 12 articles
                                        - img [ref=e209]
                                - link "Billing & Plans Compare plans, manage your subscription, and view invoices. 3 articles" [ref=e211] [cursor=pointer]:
                                    - /url: /docs/billing
                                    - img [ref=e213]
                                    - heading "Billing & Plans" [level=3] [ref=e215]
                                    - paragraph [ref=e216]: Compare plans, manage your subscription, and view invoices.
                                    - generic [ref=e217]:
                                        - generic [ref=e218]: 3 articles
                                        - img [ref=e219]
                            - generic [ref=e222]:
                                - heading "Quick Links" [level=2] [ref=e224]
                                - generic [ref=e225]:
                                    - link "Getting Started Guide 15-minute setup" [ref=e226] [cursor=pointer]:
                                        - /url: /docs/getting-started
                                        - paragraph [ref=e227]: Getting Started Guide
                                        - paragraph [ref=e228]: 15-minute setup
                                    - link "API Quickstart First API call in 5 minutes" [ref=e229] [cursor=pointer]:
                                        - /url: /docs/api/quickstart
                                        - paragraph [ref=e230]: API Quickstart
                                        - paragraph [ref=e231]: First API call in 5 minutes
                                    - link "FAQ Common questions answered" [ref=e232] [cursor=pointer]:
                                        - /url: /docs/faq
                                        - paragraph [ref=e233]: FAQ
                                        - paragraph [ref=e234]: Common questions answered
                - generic [ref=e236]:
                    - generic [ref=e237]:
                        - generic [ref=e238]:
                            - generic [ref=e239]:
                                - generic [ref=e240]: X
                                - generic [ref=e241]: Xenboox
                            - paragraph [ref=e242]: AI-native accounting platform built for African businesses.
                        - generic [ref=e243]:
                            - heading "Product" [level=3] [ref=e244]
                            - list [ref=e245]:
                                - listitem [ref=e246]:
                                    - link "Features" [ref=e247] [cursor=pointer]:
                                        - /url: /features
                                - listitem [ref=e248]:
                                    - link "Pricing" [ref=e249] [cursor=pointer]:
                                        - /url: /pricing
                                - listitem [ref=e250]:
                                    - link "Download" [ref=e251] [cursor=pointer]:
                                        - /url: /download
                        - generic [ref=e252]:
                            - heading "Documentation" [level=3] [ref=e253]
                            - list [ref=e254]:
                                - listitem [ref=e255]:
                                    - link "Getting Started" [ref=e256] [cursor=pointer]:
                                        - /url: /docs/getting-started
                                - listitem [ref=e257]:
                                    - link "All Modules" [ref=e258] [cursor=pointer]:
                                        - /url: /docs/modules
                                - listitem [ref=e259]:
                                    - link "All Agents" [ref=e260] [cursor=pointer]:
                                        - /url: /docs/agents
                                - listitem [ref=e261]:
                                    - link "FAQ" [ref=e262] [cursor=pointer]:
                                        - /url: /docs/faq
                        - generic [ref=e263]:
                            - heading "Company" [level=3] [ref=e264]
                            - list [ref=e265]:
                                - listitem [ref=e266]:
                                    - link "About" [ref=e267] [cursor=pointer]:
                                        - /url: /about
                                - listitem [ref=e268]:
                                    - link "Contact" [ref=e269] [cursor=pointer]:
                                        - /url: /contact
                                - listitem [ref=e270]:
                                    - link "Privacy" [ref=e271] [cursor=pointer]:
                                        - /url: /privacy
                    - generic [ref=e272]: © 2026 Xenboox. All rights reserved.
        - contentinfo [ref=e273]:
            - generic [ref=e274]:
                - generic [ref=e275]:
                    - heading "Stay in the loop" [level=3] [ref=e276]
                    - paragraph [ref=e277]: Product updates, accounting tips, and African fintech insights. No spam, unsubscribe anytime.
                    - generic [ref=e278]:
                        - textbox "Enter your email" [ref=e279]
                        - button "Subscribe" [ref=e280] [cursor=pointer]
                - generic [ref=e281]:
                    - generic [ref=e282]:
                        - link "X Xenboox" [ref=e283] [cursor=pointer]:
                            - /url: /
                            - generic [ref=e284]: X
                            - generic [ref=e285]: Xenboox
                        - paragraph [ref=e286]: AI-native accounting platform built for African businesses. Automated journal entries, reconciliations, payroll, and financial reporting — powered by 19 specialized AI agents.
                        - generic [ref=e287]:
                            - link "X / Twitter" [ref=e288] [cursor=pointer]:
                                - /url: "#"
                                - img [ref=e289]
                            - link "LinkedIn" [ref=e291] [cursor=pointer]:
                                - /url: "#"
                                - img [ref=e292]
                            - link "GitHub" [ref=e294] [cursor=pointer]:
                                - /url: "#"
                                - img [ref=e295]
                            - link "YouTube" [ref=e297] [cursor=pointer]:
                                - /url: "#"
                                - img [ref=e298]
                    - generic [ref=e300]:
                        - heading "Product" [level=3] [ref=e301]
                        - list [ref=e302]:
                            - listitem [ref=e303]:
                                - link "Features" [ref=e304] [cursor=pointer]:
                                    - /url: /features
                            - listitem [ref=e305]:
                                - link "Pricing" [ref=e306] [cursor=pointer]:
                                    - /url: /pricing
                            - listitem [ref=e307]:
                                - link "Download" [ref=e308] [cursor=pointer]:
                                    - /url: /download
                            - listitem [ref=e309]:
                                - link "Documentation" [ref=e310] [cursor=pointer]:
                                    - /url: /docs
                            - listitem [ref=e311]:
                                - link "Changelog" [ref=e312] [cursor=pointer]:
                                    - /url: /docs
                            - listitem [ref=e313]:
                                - link "API Reference" [ref=e314] [cursor=pointer]:
                                    - /url: /docs
                    - generic [ref=e315]:
                        - heading "Company" [level=3] [ref=e316]
                        - list [ref=e317]:
                            - listitem [ref=e318]:
                                - link "About" [ref=e319] [cursor=pointer]:
                                    - /url: /about
                            - listitem [ref=e320]:
                                - link "Blog" [ref=e321] [cursor=pointer]:
                                    - /url: /blog
                            - listitem [ref=e322]:
                                - link "Careers" [ref=e323] [cursor=pointer]:
                                    - /url: /careers
                            - listitem [ref=e324]:
                                - link "Contact" [ref=e325] [cursor=pointer]:
                                    - /url: /contact
                            - listitem [ref=e326]:
                                - link "Press Kit" [ref=e327] [cursor=pointer]:
                                    - /url: /about
                    - generic [ref=e328]:
                        - heading "Legal" [level=3] [ref=e329]
                        - list [ref=e330]:
                            - listitem [ref=e331]:
                                - link "Privacy" [ref=e332] [cursor=pointer]:
                                    - /url: /privacy
                            - listitem [ref=e333]:
                                - link "Terms" [ref=e334] [cursor=pointer]:
                                    - /url: /terms
                            - listitem [ref=e335]:
                                - link "Cookies" [ref=e336] [cursor=pointer]:
                                    - /url: /cookies
                            - listitem [ref=e337]:
                                - link "Refund Policy" [ref=e338] [cursor=pointer]:
                                    - /url: /refund
                            - listitem [ref=e339]:
                                - link "SLA" [ref=e340] [cursor=pointer]:
                                    - /url: /sla
                - generic [ref=e341]:
                    - paragraph [ref=e342]: © 2026 Xenboox. All rights reserved.
                    - generic [ref=e343]:
                        - link "Privacy" [ref=e344] [cursor=pointer]:
                            - /url: /privacy
                        - link "Terms" [ref=e345] [cursor=pointer]:
                            - /url: /terms
                        - link "Cookies" [ref=e346] [cursor=pointer]:
                            - /url: /cookies
    - alert [ref=e347]
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
> 29 |       const response = await page.goto(path, {
     |                                   ^ TimeoutError: page.goto: Timeout 30000ms exceeded.
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
  43 |       ).toEqual([]);
  44 |
  45 |       // Should have a visible body
  46 |       await expect(page.locator("body")).toBeVisible();
  47 |     });
  48 |   }
  49 | });
  50 |
```
