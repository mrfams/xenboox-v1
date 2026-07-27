# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: marketing-pages.spec.ts >> Marketing Pages — Public Routes >> /pricing loads with correct title and no errors
- Location: e2e\marketing-pages.spec.ts:22:9

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 1
+ Received  + 3

- Array []
+ Array [
+   "Executing inline script violates the following Content Security Policy directive 'script-src 'self' https://cdn.jsdelivr.net 'nonce-lsLbd/RtxZ3DWTxbY6AF8Q==''. Either the 'unsafe-inline' keyword, a hash ('sha256-n46vPwSWuMC0W703pBofImv82Z26xo4LXymv0E9caPk='), or a nonce ('nonce-...') is required to enable inline execution. The action has been blocked.",
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
            - generic [ref=e20]:
                - generic [ref=e21]:
                    - img [ref=e22]
                    - text: Pricing
                - heading "Simple, transparent pricing" [level=1] [ref=e24]
                - paragraph [ref=e25]: Start free. Scale as you grow. No hidden fees.
                - generic [ref=e26]:
                    - generic [ref=e27]: Monthly
                    - switch [ref=e28] [cursor=pointer]
                    - generic [ref=e30]: Annual
                    - generic [ref=e31]: Save 17%
            - generic [ref=e35]:
                - generic [ref=e36]:
                    - generic [ref=e37]:
                        - generic [ref=e39]: S
                        - heading "Free" [level=3] [ref=e40]
                        - generic [ref=e41]:
                            - generic [ref=e42]: $0
                            - generic [ref=e43]: forever
                        - paragraph [ref=e44]: For solo founders and small businesses getting started.
                    - list [ref=e45]:
                        - listitem [ref=e46]:
                            - img [ref=e47]
                            - generic [ref=e50]: 1 entity
                        - listitem [ref=e51]:
                            - img [ref=e52]
                            - generic [ref=e55]: 1 AI agent (CFO)
                        - listitem [ref=e56]:
                            - img [ref=e57]
                            - generic [ref=e60]: Up to 50 journal entries/month
                        - listitem [ref=e61]:
                            - img [ref=e62]
                            - generic [ref=e65]: Chart of accounts
                        - listitem [ref=e66]:
                            - img [ref=e67]
                            - generic [ref=e70]: Basic reports (P&L, Balance Sheet)
                        - listitem [ref=e71]:
                            - img [ref=e72]
                            - generic [ref=e75]: Web app access
                        - listitem [ref=e76]:
                            - img [ref=e77]
                            - generic [ref=e80]: Community support
                    - link "Start Free" [ref=e81] [cursor=pointer]:
                        - /url: /register
                        - text: Start Free
                        - img [ref=e82]
                - generic [ref=e84]:
                    - generic [ref=e85]: Most Popular
                    - generic [ref=e86]:
                        - generic [ref=e88]: M
                        - heading "Starter" [level=3] [ref=e89]
                        - generic [ref=e90]:
                            - generic [ref=e91]: $29
                            - generic [ref=e92]: /month
                        - paragraph [ref=e93]: For growing businesses that need AI-powered automation.
                    - list [ref=e94]:
                        - listitem [ref=e95]:
                            - img [ref=e96]
                            - generic [ref=e99]: Up to 3 entities
                        - listitem [ref=e100]:
                            - img [ref=e101]
                            - generic [ref=e104]: All 19 AI agents
                        - listitem [ref=e105]:
                            - img [ref=e106]
                            - generic [ref=e109]: Unlimited journal entries
                        - listitem [ref=e110]:
                            - img [ref=e111]
                            - generic [ref=e114]: Full AP/AR module
                        - listitem [ref=e115]:
                            - img [ref=e116]
                            - generic [ref=e119]: Payroll processing
                        - listitem [ref=e120]:
                            - img [ref=e121]
                            - generic [ref=e124]: Treasury & bank reconciliation
                        - listitem [ref=e125]:
                            - img [ref=e126]
                            - generic [ref=e129]: Web + mobile apps
                        - listitem [ref=e130]:
                            - img [ref=e131]
                            - generic [ref=e134]: Email support
                    - link "Get Started" [ref=e135] [cursor=pointer]:
                        - /url: /register
                        - text: Get Started
                        - img [ref=e136]
                - generic [ref=e138]:
                    - generic [ref=e139]:
                        - generic [ref=e141]: L
                        - heading "Business" [level=3] [ref=e142]
                        - generic [ref=e143]:
                            - generic [ref=e144]: $79
                            - generic [ref=e145]: /month
                        - paragraph [ref=e146]: For established businesses with complex accounting needs.
                    - list [ref=e147]:
                        - listitem [ref=e148]:
                            - img [ref=e149]
                            - generic [ref=e152]: Up to 10 entities
                        - listitem [ref=e153]:
                            - img [ref=e154]
                            - generic [ref=e157]: All 19 AI agents
                        - listitem [ref=e158]:
                            - img [ref=e159]
                            - generic [ref=e162]: Unlimited everything
                        - listitem [ref=e163]:
                            - img [ref=e164]
                            - generic [ref=e167]: Multi-currency support
                        - listitem [ref=e168]:
                            - img [ref=e169]
                            - generic [ref=e172]: Fixed assets & depreciation
                        - listitem [ref=e173]:
                            - img [ref=e174]
                            - generic [ref=e177]: Inventory management
                        - listitem [ref=e178]:
                            - img [ref=e179]
                            - generic [ref=e182]: All 3 platforms
                        - listitem [ref=e183]:
                            - img [ref=e184]
                            - generic [ref=e187]: Priority support
                        - listitem [ref=e188]:
                            - img [ref=e189]
                            - generic [ref=e192]: Custom integrations
                    - link "Get Started" [ref=e193] [cursor=pointer]:
                        - /url: /register
                        - text: Get Started
                        - img [ref=e194]
                - generic [ref=e196]:
                    - generic [ref=e197]:
                        - generic [ref=e199]: E
                        - heading "Enterprise" [level=3] [ref=e200]
                        - generic [ref=e202]: Custom
                        - paragraph [ref=e203]: For organizations that need dedicated infrastructure and support.
                    - list [ref=e204]:
                        - listitem [ref=e205]:
                            - img [ref=e206]
                            - generic [ref=e209]: Unlimited entities
                        - listitem [ref=e210]:
                            - img [ref=e211]
                            - generic [ref=e214]: All 19 AI agents
                        - listitem [ref=e215]:
                            - img [ref=e216]
                            - generic [ref=e219]: Unlimited everything
                        - listitem [ref=e220]:
                            - img [ref=e221]
                            - generic [ref=e224]: SSO/SAML authentication
                        - listitem [ref=e225]:
                            - img [ref=e226]
                            - generic [ref=e229]: Custom AI agent training
                        - listitem [ref=e230]:
                            - img [ref=e231]
                            - generic [ref=e234]: On-premise option
                        - listitem [ref=e235]:
                            - img [ref=e236]
                            - generic [ref=e239]: Dedicated account manager
                        - listitem [ref=e240]:
                            - img [ref=e241]
                            - generic [ref=e244]: SLA guarantee
                        - listitem [ref=e245]:
                            - img [ref=e246]
                            - generic [ref=e249]: Custom reporting
                    - link "Contact Sales" [ref=e250] [cursor=pointer]:
                        - /url: /contact
                        - text: Contact Sales
                        - img [ref=e251]
            - generic [ref=e254]:
                - heading "Frequently Asked Questions" [level=2] [ref=e255]
                - generic [ref=e256]:
                    - group [ref=e257]:
                        - generic "Can I switch plans at any time?" [ref=e258] [cursor=pointer]:
                            - text: Can I switch plans at any time?
                            - img [ref=e259]
                    - group [ref=e261]:
                        - generic "Is my data secure?" [ref=e262] [cursor=pointer]:
                            - text: Is my data secure?
                            - img [ref=e263]
                    - group [ref=e265]:
                        - generic "Do you support my country's tax regulations?" [ref=e266] [cursor=pointer]:
                            - text: Do you support my country's tax regulations?
                            - img [ref=e267]
                    - group [ref=e269]:
                        - generic "Can I use Xenboox on my phone?" [ref=e270] [cursor=pointer]:
                            - text: Can I use Xenboox on my phone?
                            - img [ref=e271]
                    - group [ref=e273]:
                        - generic "What happens to my data if I cancel?" [ref=e274] [cursor=pointer]:
                            - text: What happens to my data if I cancel?
                            - img [ref=e275]
            - generic [ref=e278]:
                - heading "Ready to get started?" [level=2] [ref=e279]
                - paragraph [ref=e280]: Join thousands of businesses using Xenboox.
                - link "Start Free Trial" [ref=e281] [cursor=pointer]:
                    - /url: /register
                    - text: Start Free Trial
                    - img [ref=e282]
        - contentinfo [ref=e284]:
            - generic [ref=e285]:
                - generic [ref=e286]:
                    - heading "Stay in the loop" [level=3] [ref=e287]
                    - paragraph [ref=e288]: Product updates, accounting tips, and African fintech insights. No spam, unsubscribe anytime.
                    - generic [ref=e289]:
                        - textbox "Enter your email" [ref=e290]
                        - button "Subscribe" [ref=e291] [cursor=pointer]
                - generic [ref=e292]:
                    - generic [ref=e293]:
                        - link "X Xenboox" [ref=e294] [cursor=pointer]:
                            - /url: /
                            - generic [ref=e295]: X
                            - generic [ref=e296]: Xenboox
                        - paragraph [ref=e297]: AI-native accounting platform built for African businesses. Automated journal entries, reconciliations, payroll, and financial reporting — powered by 19 specialized AI agents.
                        - generic [ref=e298]:
                            - link "X / Twitter" [ref=e299] [cursor=pointer]:
                                - /url: "#"
                                - img [ref=e300]
                            - link "LinkedIn" [ref=e302] [cursor=pointer]:
                                - /url: "#"
                                - img [ref=e303]
                            - link "GitHub" [ref=e305] [cursor=pointer]:
                                - /url: "#"
                                - img [ref=e306]
                            - link "YouTube" [ref=e308] [cursor=pointer]:
                                - /url: "#"
                                - img [ref=e309]
                    - generic [ref=e311]:
                        - heading "Product" [level=3] [ref=e312]
                        - list [ref=e313]:
                            - listitem [ref=e314]:
                                - link "Features" [ref=e315] [cursor=pointer]:
                                    - /url: /features
                            - listitem [ref=e316]:
                                - link "Pricing" [ref=e317] [cursor=pointer]:
                                    - /url: /pricing
                            - listitem [ref=e318]:
                                - link "Download" [ref=e319] [cursor=pointer]:
                                    - /url: /download
                            - listitem [ref=e320]:
                                - link "Documentation" [ref=e321] [cursor=pointer]:
                                    - /url: /docs
                            - listitem [ref=e322]:
                                - link "Changelog" [ref=e323] [cursor=pointer]:
                                    - /url: /docs
                            - listitem [ref=e324]:
                                - link "API Reference" [ref=e325] [cursor=pointer]:
                                    - /url: /docs
                    - generic [ref=e326]:
                        - heading "Company" [level=3] [ref=e327]
                        - list [ref=e328]:
                            - listitem [ref=e329]:
                                - link "About" [ref=e330] [cursor=pointer]:
                                    - /url: /about
                            - listitem [ref=e331]:
                                - link "Blog" [ref=e332] [cursor=pointer]:
                                    - /url: /blog
                            - listitem [ref=e333]:
                                - link "Careers" [ref=e334] [cursor=pointer]:
                                    - /url: /careers
                            - listitem [ref=e335]:
                                - link "Contact" [ref=e336] [cursor=pointer]:
                                    - /url: /contact
                            - listitem [ref=e337]:
                                - link "Press Kit" [ref=e338] [cursor=pointer]:
                                    - /url: /about
                    - generic [ref=e339]:
                        - heading "Legal" [level=3] [ref=e340]
                        - list [ref=e341]:
                            - listitem [ref=e342]:
                                - link "Privacy" [ref=e343] [cursor=pointer]:
                                    - /url: /privacy
                            - listitem [ref=e344]:
                                - link "Terms" [ref=e345] [cursor=pointer]:
                                    - /url: /terms
                            - listitem [ref=e346]:
                                - link "Cookies" [ref=e347] [cursor=pointer]:
                                    - /url: /cookies
                            - listitem [ref=e348]:
                                - link "Refund Policy" [ref=e349] [cursor=pointer]:
                                    - /url: /refund
                            - listitem [ref=e350]:
                                - link "SLA" [ref=e351] [cursor=pointer]:
                                    - /url: /sla
                - generic [ref=e352]:
                    - paragraph [ref=e353]: © 2026 Xenboox. All rights reserved.
                    - generic [ref=e354]:
                        - link "Privacy" [ref=e355] [cursor=pointer]:
                            - /url: /privacy
                        - link "Terms" [ref=e356] [cursor=pointer]:
                            - /url: /terms
                        - link "Cookies" [ref=e357] [cursor=pointer]:
                            - /url: /cookies
    - alert [ref=e358]
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
