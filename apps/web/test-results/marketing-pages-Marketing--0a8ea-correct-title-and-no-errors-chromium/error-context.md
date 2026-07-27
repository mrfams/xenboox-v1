# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: marketing-pages.spec.ts >> Marketing Pages — Public Routes >> /blog loads with correct title and no errors
- Location: e2e\marketing-pages.spec.ts:22:9

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 1
+ Received  + 5

- Array []
+ Array [
+   "Executing inline script violates the following Content Security Policy directive 'script-src 'self' https://cdn.jsdelivr.net 'nonce-2IRzEFGXeCEs/NIhljHToQ==''. Either the 'unsafe-inline' keyword, a hash ('sha256-n46vPwSWuMC0W703pBofImv82Z26xo4LXymv0E9caPk='), or a nonce ('nonce-...') is required to enable inline execution. The action has been blocked.",
+   "Error: An error occurred in the Server Components render. The specific message is omitted in production builds to avoid leaking sensitive details. A digest property is included on this error instance which may provide additional details about the nature of the error.",
+   "Error: An error occurred in the Server Components render. The specific message is omitted in production builds to avoid leaking sensitive details. A digest property is included on this error instance which may provide additional details about the nature of the error.",
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
            - generic [ref=e19]:
                - heading "Something went wrong" [level=2] [ref=e20]
                - paragraph [ref=e21]: We encountered an unexpected error. Please try again.
                - generic [ref=e22]:
                    - button "Try again" [ref=e23] [cursor=pointer]
                    - link "Go Home" [ref=e24] [cursor=pointer]:
                        - /url: /
        - contentinfo [ref=e25]:
            - generic [ref=e26]:
                - generic [ref=e27]:
                    - heading "Stay in the loop" [level=3] [ref=e28]
                    - paragraph [ref=e29]: Product updates, accounting tips, and African fintech insights. No spam, unsubscribe anytime.
                    - generic [ref=e30]:
                        - textbox "Enter your email" [ref=e31]
                        - button "Subscribe" [ref=e32] [cursor=pointer]
                - generic [ref=e33]:
                    - generic [ref=e34]:
                        - link "X Xenboox" [ref=e35] [cursor=pointer]:
                            - /url: /
                            - generic [ref=e36]: X
                            - generic [ref=e37]: Xenboox
                        - paragraph [ref=e38]: AI-native accounting platform built for African businesses. Automated journal entries, reconciliations, payroll, and financial reporting — powered by 19 specialized AI agents.
                        - generic [ref=e39]:
                            - link "X / Twitter" [ref=e40] [cursor=pointer]:
                                - /url: "#"
                                - img [ref=e41]
                            - link "LinkedIn" [ref=e43] [cursor=pointer]:
                                - /url: "#"
                                - img [ref=e44]
                            - link "GitHub" [ref=e46] [cursor=pointer]:
                                - /url: "#"
                                - img [ref=e47]
                            - link "YouTube" [ref=e49] [cursor=pointer]:
                                - /url: "#"
                                - img [ref=e50]
                    - generic [ref=e52]:
                        - heading "Product" [level=3] [ref=e53]
                        - list [ref=e54]:
                            - listitem [ref=e55]:
                                - link "Features" [ref=e56] [cursor=pointer]:
                                    - /url: /features
                            - listitem [ref=e57]:
                                - link "Pricing" [ref=e58] [cursor=pointer]:
                                    - /url: /pricing
                            - listitem [ref=e59]:
                                - link "Download" [ref=e60] [cursor=pointer]:
                                    - /url: /download
                            - listitem [ref=e61]:
                                - link "Documentation" [ref=e62] [cursor=pointer]:
                                    - /url: /docs
                            - listitem [ref=e63]:
                                - link "Changelog" [ref=e64] [cursor=pointer]:
                                    - /url: /docs
                            - listitem [ref=e65]:
                                - link "API Reference" [ref=e66] [cursor=pointer]:
                                    - /url: /docs
                    - generic [ref=e67]:
                        - heading "Company" [level=3] [ref=e68]
                        - list [ref=e69]:
                            - listitem [ref=e70]:
                                - link "About" [ref=e71] [cursor=pointer]:
                                    - /url: /about
                            - listitem [ref=e72]:
                                - link "Blog" [ref=e73] [cursor=pointer]:
                                    - /url: /blog
                            - listitem [ref=e74]:
                                - link "Careers" [ref=e75] [cursor=pointer]:
                                    - /url: /careers
                            - listitem [ref=e76]:
                                - link "Contact" [ref=e77] [cursor=pointer]:
                                    - /url: /contact
                            - listitem [ref=e78]:
                                - link "Press Kit" [ref=e79] [cursor=pointer]:
                                    - /url: /about
                    - generic [ref=e80]:
                        - heading "Legal" [level=3] [ref=e81]
                        - list [ref=e82]:
                            - listitem [ref=e83]:
                                - link "Privacy" [ref=e84] [cursor=pointer]:
                                    - /url: /privacy
                            - listitem [ref=e85]:
                                - link "Terms" [ref=e86] [cursor=pointer]:
                                    - /url: /terms
                            - listitem [ref=e87]:
                                - link "Cookies" [ref=e88] [cursor=pointer]:
                                    - /url: /cookies
                            - listitem [ref=e89]:
                                - link "Refund Policy" [ref=e90] [cursor=pointer]:
                                    - /url: /refund
                            - listitem [ref=e91]:
                                - link "SLA" [ref=e92] [cursor=pointer]:
                                    - /url: /sla
                - generic [ref=e93]:
                    - paragraph [ref=e94]: © 2026 Xenboox. All rights reserved.
                    - generic [ref=e95]:
                        - link "Privacy" [ref=e96] [cursor=pointer]:
                            - /url: /privacy
                        - link "Terms" [ref=e97] [cursor=pointer]:
                            - /url: /terms
                        - link "Cookies" [ref=e98] [cursor=pointer]:
                            - /url: /cookies
    - alert [ref=e99]
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
