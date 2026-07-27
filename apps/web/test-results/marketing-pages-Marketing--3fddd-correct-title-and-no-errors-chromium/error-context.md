# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: marketing-pages.spec.ts >> Marketing Pages — Public Routes >> /refund loads with correct title and no errors
- Location: e2e\marketing-pages.spec.ts:22:9

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 1
+ Received  + 3

- Array []
+ Array [
+   "Executing inline script violates the following Content Security Policy directive 'script-src 'self' https://cdn.jsdelivr.net 'nonce-BH7wM42RxYUu5K8Hz52RAA==''. Either the 'unsafe-inline' keyword, a hash ('sha256-n46vPwSWuMC0W703pBofImv82Z26xo4LXymv0E9caPk='), or a nonce ('nonce-...') is required to enable inline execution. The action has been blocked.",
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
                - paragraph [ref=e23]: Legal
                - heading "Refund Policy" [level=1] [ref=e24]
                - paragraph [ref=e25]: "Last updated: July 1, 2026 · Our policy on refunds, cancellations, and billing disputes."
            - generic [ref=e28]:
                - heading "1. Subscription Billing" [level=2] [ref=e29]
                - paragraph [ref=e30]:
                    - text: Xenboox operates on a subscription billing model as described on our
                    - link "Pricing page" [ref=e31] [cursor=pointer]:
                        - /url: /pricing
                    - text: . All fees are billed in advance on a monthly or annual basis depending on your chosen plan.
                - heading "2. Refund Eligibility" [level=2] [ref=e32]
                - heading "2.1 Monthly Plans" [level=3] [ref=e33]
                - paragraph [ref=e34]: Monthly subscriptions may be cancelled at any time. Upon cancellation, you will retain access to the Platform until the end of your current billing period. No partial refunds are provided for unused days within a billing period.
                - heading "2.2 Annual Plans" [level=3] [ref=e35]
                - paragraph [ref=e36]: Annual subscriptions may be cancelled within the first 14 days of the initial subscription for a full refund. After 14 days, annual subscriptions are non-refundable, but you will retain access for the remainder of the paid term.
                - heading "2.3 Enterprise & Firm Plans" [level=3] [ref=e37]
                - paragraph [ref=e38]: Custom enterprise agreements are governed by the terms specified in your signed contract. Please refer to your agreement for cancellation and refund terms.
                - heading "3. Service Credits" [level=2] [ref=e39]
                - paragraph [ref=e40]:
                    - text: In the event of prolonged service unavailability exceeding our
                    - link "Service Level Agreement" [ref=e41] [cursor=pointer]:
                        - /url: /sla
                    - text: ", you may be eligible for service credits rather than monetary refunds, calculated at 5% of monthly fees per full hour of downtime exceeding the SLA threshold."
                - heading "4. Billing Disputes" [level=2] [ref=e42]
                - paragraph [ref=e43]:
                    - text: If you believe you have been billed incorrectly, contact us at
                    - link "billing@xenboox.com" [ref=e44] [cursor=pointer]:
                        - /url: mailto:billing@xenboox.com
                    - text: within 30 days of the billing date. We will investigate and resolve the dispute promptly.
                - heading "5. Cancellation Process" [level=2] [ref=e45]
                - list [ref=e46]:
                    - listitem [ref=e47]: Log in to your Xenboox account and navigate to Settings → Billing
                    - listitem [ref=e48]: Select "Cancel Subscription" and follow the prompts
                    - listitem [ref=e49]: Confirm your cancellation via the email we send to your registered address
                    - listitem [ref=e50]: Your data will remain accessible for 90 days after cancellation (export period)
                - heading "6. Non-Refundable Items" [level=2] [ref=e51]
                - paragraph [ref=e52]: "The following are non-refundable:"
                - list [ref=e53]:
                    - listitem [ref=e54]: Setup fees (if applicable)
                    - listitem [ref=e55]: Usage overage charges
                    - listitem [ref=e56]: Third-party integration fees
                    - listitem [ref=e57]: Custom development work
                - heading "7. Contact" [level=2] [ref=e58]
                - paragraph [ref=e59]:
                    - text: For billing-related inquiries, contact
                    - link "billing@xenboox.com" [ref=e60] [cursor=pointer]:
                        - /url: mailto:billing@xenboox.com
                    - text: .
        - contentinfo [ref=e61]:
            - generic [ref=e62]:
                - generic [ref=e63]:
                    - heading "Stay in the loop" [level=3] [ref=e64]
                    - paragraph [ref=e65]: Product updates, accounting tips, and African fintech insights. No spam, unsubscribe anytime.
                    - generic [ref=e66]:
                        - textbox "Enter your email" [ref=e67]
                        - button "Subscribe" [ref=e68] [cursor=pointer]
                - generic [ref=e69]:
                    - generic [ref=e70]:
                        - link "X Xenboox" [ref=e71] [cursor=pointer]:
                            - /url: /
                            - generic [ref=e72]: X
                            - generic [ref=e73]: Xenboox
                        - paragraph [ref=e74]: AI-native accounting platform built for African businesses. Automated journal entries, reconciliations, payroll, and financial reporting — powered by 19 specialized AI agents.
                        - generic [ref=e75]:
                            - link "X / Twitter" [ref=e76] [cursor=pointer]:
                                - /url: "#"
                                - img [ref=e77]
                            - link "LinkedIn" [ref=e79] [cursor=pointer]:
                                - /url: "#"
                                - img [ref=e80]
                            - link "GitHub" [ref=e82] [cursor=pointer]:
                                - /url: "#"
                                - img [ref=e83]
                            - link "YouTube" [ref=e85] [cursor=pointer]:
                                - /url: "#"
                                - img [ref=e86]
                    - generic [ref=e88]:
                        - heading "Product" [level=3] [ref=e89]
                        - list [ref=e90]:
                            - listitem [ref=e91]:
                                - link "Features" [ref=e92] [cursor=pointer]:
                                    - /url: /features
                            - listitem [ref=e93]:
                                - link "Pricing" [ref=e94] [cursor=pointer]:
                                    - /url: /pricing
                            - listitem [ref=e95]:
                                - link "Download" [ref=e96] [cursor=pointer]:
                                    - /url: /download
                            - listitem [ref=e97]:
                                - link "Documentation" [ref=e98] [cursor=pointer]:
                                    - /url: /docs
                            - listitem [ref=e99]:
                                - link "Changelog" [ref=e100] [cursor=pointer]:
                                    - /url: /docs
                            - listitem [ref=e101]:
                                - link "API Reference" [ref=e102] [cursor=pointer]:
                                    - /url: /docs
                    - generic [ref=e103]:
                        - heading "Company" [level=3] [ref=e104]
                        - list [ref=e105]:
                            - listitem [ref=e106]:
                                - link "About" [ref=e107] [cursor=pointer]:
                                    - /url: /about
                            - listitem [ref=e108]:
                                - link "Blog" [ref=e109] [cursor=pointer]:
                                    - /url: /blog
                            - listitem [ref=e110]:
                                - link "Careers" [ref=e111] [cursor=pointer]:
                                    - /url: /careers
                            - listitem [ref=e112]:
                                - link "Contact" [ref=e113] [cursor=pointer]:
                                    - /url: /contact
                            - listitem [ref=e114]:
                                - link "Press Kit" [ref=e115] [cursor=pointer]:
                                    - /url: /about
                    - generic [ref=e116]:
                        - heading "Legal" [level=3] [ref=e117]
                        - list [ref=e118]:
                            - listitem [ref=e119]:
                                - link "Privacy" [ref=e120] [cursor=pointer]:
                                    - /url: /privacy
                            - listitem [ref=e121]:
                                - link "Terms" [ref=e122] [cursor=pointer]:
                                    - /url: /terms
                            - listitem [ref=e123]:
                                - link "Cookies" [ref=e124] [cursor=pointer]:
                                    - /url: /cookies
                            - listitem [ref=e125]:
                                - link "Refund Policy" [ref=e126] [cursor=pointer]:
                                    - /url: /refund
                            - listitem [ref=e127]:
                                - link "SLA" [ref=e128] [cursor=pointer]:
                                    - /url: /sla
                - generic [ref=e129]:
                    - paragraph [ref=e130]: © 2026 Xenboox. All rights reserved.
                    - generic [ref=e131]:
                        - link "Privacy" [ref=e132] [cursor=pointer]:
                            - /url: /privacy
                        - link "Terms" [ref=e133] [cursor=pointer]:
                            - /url: /terms
                        - link "Cookies" [ref=e134] [cursor=pointer]:
                            - /url: /cookies
    - alert [ref=e135]
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
