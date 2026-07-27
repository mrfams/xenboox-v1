# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: marketing-pages.spec.ts >> Marketing Pages — Public Routes >> /about loads with correct title and no errors
- Location: e2e\marketing-pages.spec.ts:22:9

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 1
+ Received  + 3

- Array []
+ Array [
+   "Executing inline script violates the following Content Security Policy directive 'script-src 'self' https://cdn.jsdelivr.net 'nonce-Mcvmmwjq3aNzOs8BSg0+oQ==''. Either the 'unsafe-inline' keyword, a hash ('sha256-n46vPwSWuMC0W703pBofImv82Z26xo4LXymv0E9caPk='), or a nonce ('nonce-...') is required to enable inline execution. The action has been blocked.",
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
                    - text: About Xenboox
                - heading "We're building the future of accounting for African businesses" [level=1] [ref=e26]:
                    - text: We're building the
                    - text: future of accounting
                    - text: for African businesses
                - paragraph [ref=e27]: AI-native, multi-currency, multi-platform, and accessible to everyone. We're a small team tackling a massive problem — and we're just getting started.
            - generic [ref=e30]:
                - generic [ref=e31]:
                    - generic [ref=e32]:
                        - generic [ref=e33]:
                            - img [ref=e34]
                            - text: Our Mission
                        - heading "Accounting software hasn't kept pace with how Africa does business" [level=2] [ref=e38]
                        - generic [ref=e39]:
                            - paragraph [ref=e40]: Multi-currency transactions, mobile money, varying tax regimes, and unreliable connectivity are the norm — not the exception. Yet most accounting software was built for a different world.
                            - paragraph [ref=e41]: Xenboox changes that. We've built an AI-native platform where 19 specialized agents handle the heavy lifting — from journal entries to payroll to financial reports.
                    - generic [ref=e42]:
                        - generic [ref=e43]:
                            - generic [ref=e44]: "19"
                            - generic [ref=e45]: AI Agents
                        - generic [ref=e46]:
                            - generic [ref=e47]: 20+
                            - generic [ref=e48]: Modules
                        - generic [ref=e49]:
                            - generic [ref=e50]: "3"
                            - generic [ref=e51]: Platforms
                        - generic [ref=e52]:
                            - generic [ref=e53]: 60+
                            - generic [ref=e54]: DB Tables
                - generic [ref=e55]:
                    - generic [ref=e56]:
                        - generic [ref=e57]:
                            - img [ref=e58]
                            - text: What We Believe
                        - heading "Our core values" [level=2] [ref=e60]
                    - generic [ref=e61]:
                        - generic [ref=e63]:
                            - img [ref=e65]
                            - generic [ref=e68]:
                                - generic [ref=e69]:
                                    - heading "AI-First, Not AI-Added" [level=3] [ref=e70]
                                    - generic [ref=e71]: "19"
                                - paragraph [ref=e72]: We didn't bolt AI onto legacy accounting software. Xenboox was built from the ground up with 19 specialized AI agents at its core, purpose-built for African financial workflows.
                        - generic [ref=e74]:
                            - img [ref=e76]
                            - generic [ref=e79]:
                                - generic [ref=e80]:
                                    - heading "Built for Africa" [level=3] [ref=e81]
                                    - generic [ref=e82]: 5+
                                - paragraph [ref=e83]: African businesses face unique challenges — multi-currency, mobile money, varying tax regimes across jurisdictions. We solve for these from day one, not as an afterthought.
                        - generic [ref=e85]:
                            - img [ref=e87]
                            - generic [ref=e89]:
                                - generic [ref=e90]:
                                    - heading "Security Without Compromise" [level=3] [ref=e91]
                                    - generic [ref=e92]: 99.9%
                                - paragraph [ref=e93]: Row-level security, AES-256 encryption, full audit trails. Enterprise-grade security available to every business — not just the big ones.
                        - generic [ref=e95]:
                            - img [ref=e97]
                            - generic [ref=e102]:
                                - generic [ref=e103]:
                                    - heading "Radical Transparency" [level=3] [ref=e104]
                                    - generic [ref=e105]: 100%
                                - paragraph [ref=e106]: Every AI decision is logged with confidence scores. If an agent isn't sure, it asks — it never guesses. You always know what happened and why.
            - generic [ref=e109]:
                - generic [ref=e110]:
                    - generic [ref=e111]:
                        - img [ref=e112]
                        - text: Our Journey
                    - heading "From idea to platform" [level=2] [ref=e115]
                    - generic [ref=e118]:
                        - generic [ref=e122]:
                            - generic [ref=e123]:
                                - generic [ref=e124]: 2025 Q1
                                - generic [ref=e125]: Founded
                            - paragraph [ref=e126]: Started with a vision to modernize accounting for African businesses.
                        - generic [ref=e130]:
                            - generic [ref=e131]:
                                - generic [ref=e132]: 2025 Q3
                                - generic [ref=e133]: Alpha Launch
                            - paragraph [ref=e134]: First 19 AI agents operational. Double-entry ledger, AP/AR, payroll.
                        - generic [ref=e138]:
                            - generic [ref=e139]:
                                - generic [ref=e140]: 2026 Q1
                                - generic [ref=e141]: Public Beta
                            - paragraph [ref=e142]: Web, mobile, and desktop apps available. 60+ database tables, 20 modules.
                        - generic [ref=e146]:
                            - generic [ref=e147]:
                                - generic [ref=e148]: 2026 H2
                                - generic [ref=e149]: Production Launch
                            - paragraph [ref=e150]: Full launch with enterprise features, multi-entity support, and SLA guarantees.
                        - generic [ref=e154]:
                            - generic [ref=e155]:
                                - generic [ref=e156]: "2027"
                                - generic [ref=e157]: Pan-African Expansion
                            - paragraph [ref=e158]: Expanding to 10+ African markets with localized tax and compliance.
                - generic [ref=e159]:
                    - img [ref=e160]
                    - blockquote [ref=e163]: “We believe that every business — regardless of size or location — deserves access to world-class accounting tools.
                    - generic [ref=e164]:
                        - generic [ref=e165]: The Xenboox Team
                        - generic [ref=e166]: Building the future, one journal entry at a time
            - generic [ref=e168]:
                - heading "Join us on this journey" [level=2] [ref=e169]
                - paragraph [ref=e170]: We're building the future of accounting for Africa. Come along.
                - generic [ref=e171]:
                    - link "Get Started Free" [ref=e172] [cursor=pointer]:
                        - /url: /register
                        - generic [ref=e174]:
                            - text: Get Started Free
                            - img [ref=e175]
                    - link "View Open Positions" [ref=e177] [cursor=pointer]:
                        - /url: /careers
        - contentinfo [ref=e178]:
            - generic [ref=e179]:
                - generic [ref=e180]:
                    - heading "Stay in the loop" [level=3] [ref=e181]
                    - paragraph [ref=e182]: Product updates, accounting tips, and African fintech insights. No spam, unsubscribe anytime.
                    - generic [ref=e183]:
                        - textbox "Enter your email" [ref=e184]
                        - button "Subscribe" [ref=e185] [cursor=pointer]
                - generic [ref=e186]:
                    - generic [ref=e187]:
                        - link "X Xenboox" [ref=e188] [cursor=pointer]:
                            - /url: /
                            - generic [ref=e189]: X
                            - generic [ref=e190]: Xenboox
                        - paragraph [ref=e191]: AI-native accounting platform built for African businesses. Automated journal entries, reconciliations, payroll, and financial reporting — powered by 19 specialized AI agents.
                        - generic [ref=e192]:
                            - link "X / Twitter" [ref=e193] [cursor=pointer]:
                                - /url: "#"
                                - img [ref=e194]
                            - link "LinkedIn" [ref=e196] [cursor=pointer]:
                                - /url: "#"
                                - img [ref=e197]
                            - link "GitHub" [ref=e199] [cursor=pointer]:
                                - /url: "#"
                                - img [ref=e200]
                            - link "YouTube" [ref=e202] [cursor=pointer]:
                                - /url: "#"
                                - img [ref=e203]
                    - generic [ref=e205]:
                        - heading "Product" [level=3] [ref=e206]
                        - list [ref=e207]:
                            - listitem [ref=e208]:
                                - link "Features" [ref=e209] [cursor=pointer]:
                                    - /url: /features
                            - listitem [ref=e210]:
                                - link "Pricing" [ref=e211] [cursor=pointer]:
                                    - /url: /pricing
                            - listitem [ref=e212]:
                                - link "Download" [ref=e213] [cursor=pointer]:
                                    - /url: /download
                            - listitem [ref=e214]:
                                - link "Documentation" [ref=e215] [cursor=pointer]:
                                    - /url: /docs
                            - listitem [ref=e216]:
                                - link "Changelog" [ref=e217] [cursor=pointer]:
                                    - /url: /docs
                            - listitem [ref=e218]:
                                - link "API Reference" [ref=e219] [cursor=pointer]:
                                    - /url: /docs
                    - generic [ref=e220]:
                        - heading "Company" [level=3] [ref=e221]
                        - list [ref=e222]:
                            - listitem [ref=e223]:
                                - link "About" [ref=e224] [cursor=pointer]:
                                    - /url: /about
                            - listitem [ref=e225]:
                                - link "Blog" [ref=e226] [cursor=pointer]:
                                    - /url: /blog
                            - listitem [ref=e227]:
                                - link "Careers" [ref=e228] [cursor=pointer]:
                                    - /url: /careers
                            - listitem [ref=e229]:
                                - link "Contact" [ref=e230] [cursor=pointer]:
                                    - /url: /contact
                            - listitem [ref=e231]:
                                - link "Press Kit" [ref=e232] [cursor=pointer]:
                                    - /url: /about
                    - generic [ref=e233]:
                        - heading "Legal" [level=3] [ref=e234]
                        - list [ref=e235]:
                            - listitem [ref=e236]:
                                - link "Privacy" [ref=e237] [cursor=pointer]:
                                    - /url: /privacy
                            - listitem [ref=e238]:
                                - link "Terms" [ref=e239] [cursor=pointer]:
                                    - /url: /terms
                            - listitem [ref=e240]:
                                - link "Cookies" [ref=e241] [cursor=pointer]:
                                    - /url: /cookies
                            - listitem [ref=e242]:
                                - link "Refund Policy" [ref=e243] [cursor=pointer]:
                                    - /url: /refund
                            - listitem [ref=e244]:
                                - link "SLA" [ref=e245] [cursor=pointer]:
                                    - /url: /sla
                - generic [ref=e246]:
                    - paragraph [ref=e247]: © 2026 Xenboox. All rights reserved.
                    - generic [ref=e248]:
                        - link "Privacy" [ref=e249] [cursor=pointer]:
                            - /url: /privacy
                        - link "Terms" [ref=e250] [cursor=pointer]:
                            - /url: /terms
                        - link "Cookies" [ref=e251] [cursor=pointer]:
                            - /url: /cookies
    - alert [ref=e252]
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
