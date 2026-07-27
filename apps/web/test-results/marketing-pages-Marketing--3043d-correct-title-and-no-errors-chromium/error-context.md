# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: marketing-pages.spec.ts >> Marketing Pages — Public Routes >> /cookies loads with correct title and no errors
- Location: e2e\marketing-pages.spec.ts:22:9

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 1
+ Received  + 3

- Array []
+ Array [
+   "Executing inline script violates the following Content Security Policy directive 'script-src 'self' https://cdn.jsdelivr.net 'nonce-R50Vf+VUIOQUxqwZ2dlzWQ==''. Either the 'unsafe-inline' keyword, a hash ('sha256-n46vPwSWuMC0W703pBofImv82Z26xo4LXymv0E9caPk='), or a nonce ('nonce-...') is required to enable inline execution. The action has been blocked.",
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
                - heading "Cookie Policy" [level=1] [ref=e24]
                - paragraph [ref=e25]: "Last updated: July 1, 2026 · How Xenboox uses cookies and similar tracking technologies."
            - generic [ref=e28]:
                - heading "1. What Are Cookies" [level=2] [ref=e29]
                - paragraph [ref=e30]: Cookies are small text files stored on your device by your web browser. They help websites function properly, remember preferences, and understand how users interact with the platform.
                - heading "2. How We Use Cookies" [level=2] [ref=e31]
                - paragraph [ref=e32]: "Xenboox uses cookies strictly for essential platform operations:"
                - heading "2.1 Essential Cookies" [level=3] [ref=e33]
                - table [ref=e34]:
                    - rowgroup [ref=e35]:
                        - row "Cookie Purpose Duration" [ref=e36]:
                            - columnheader "Cookie" [ref=e37]
                            - columnheader "Purpose" [ref=e38]
                            - columnheader "Duration" [ref=e39]
                    - rowgroup [ref=e40]:
                        - row "next-auth.session-token Authentication session Session / persistent" [ref=e41]:
                            - cell "next-auth.session-token" [ref=e42]
                            - cell "Authentication session" [ref=e43]
                            - cell "Session / persistent" [ref=e44]
                        - row "__Secure-next-auth.callback-url OAuth callback routing Session" [ref=e45]:
                            - cell "__Secure-next-auth.callback-url" [ref=e46]
                            - cell "OAuth callback routing" [ref=e47]
                            - cell "Session" [ref=e48]
                        - row "csrf-token Cross-site request forgery protection Session" [ref=e49]:
                            - cell "csrf-token" [ref=e50]
                            - cell "Cross-site request forgery protection" [ref=e51]
                            - cell "Session" [ref=e52]
                - heading "2.2 Analytics & Preferences" [level=3] [ref=e53]
                - paragraph [ref=e54]: With your consent, we may use analytics cookies to understand platform usage patterns. You can manage your preferences at any time through your account settings.
                - heading "3. Third-Party Cookies" [level=2] [ref=e55]
                - paragraph [ref=e56]: We do not use third-party advertising or tracking cookies. Our infrastructure providers (Vercel, Neon, AWS) may set essential cookies for load balancing and CDN functionality.
                - heading "4. Managing Cookies" [level=2] [ref=e57]
                - paragraph [ref=e58]: Most browsers allow you to control cookies through settings. However, disabling essential cookies will prevent Xenboox from functioning properly — authentication, session management, and security features all require cookies.
                - heading "5. Changes to This Policy" [level=2] [ref=e59]
                - paragraph [ref=e60]: We may update this policy as our platform evolves. Material changes will be communicated via email or platform notification.
                - heading "6. Contact" [level=2] [ref=e61]
                - paragraph [ref=e62]:
                    - text: For questions about our cookie usage, please contact
                    - link "privacy@xenboox.com" [ref=e63] [cursor=pointer]:
                        - /url: mailto:privacy@xenboox.com
                    - text: .
        - contentinfo [ref=e64]:
            - generic [ref=e65]:
                - generic [ref=e66]:
                    - heading "Stay in the loop" [level=3] [ref=e67]
                    - paragraph [ref=e68]: Product updates, accounting tips, and African fintech insights. No spam, unsubscribe anytime.
                    - generic [ref=e69]:
                        - textbox "Enter your email" [ref=e70]
                        - button "Subscribe" [ref=e71] [cursor=pointer]
                - generic [ref=e72]:
                    - generic [ref=e73]:
                        - link "X Xenboox" [ref=e74] [cursor=pointer]:
                            - /url: /
                            - generic [ref=e75]: X
                            - generic [ref=e76]: Xenboox
                        - paragraph [ref=e77]: AI-native accounting platform built for African businesses. Automated journal entries, reconciliations, payroll, and financial reporting — powered by 19 specialized AI agents.
                        - generic [ref=e78]:
                            - link "X / Twitter" [ref=e79] [cursor=pointer]:
                                - /url: "#"
                                - img [ref=e80]
                            - link "LinkedIn" [ref=e82] [cursor=pointer]:
                                - /url: "#"
                                - img [ref=e83]
                            - link "GitHub" [ref=e85] [cursor=pointer]:
                                - /url: "#"
                                - img [ref=e86]
                            - link "YouTube" [ref=e88] [cursor=pointer]:
                                - /url: "#"
                                - img [ref=e89]
                    - generic [ref=e91]:
                        - heading "Product" [level=3] [ref=e92]
                        - list [ref=e93]:
                            - listitem [ref=e94]:
                                - link "Features" [ref=e95] [cursor=pointer]:
                                    - /url: /features
                            - listitem [ref=e96]:
                                - link "Pricing" [ref=e97] [cursor=pointer]:
                                    - /url: /pricing
                            - listitem [ref=e98]:
                                - link "Download" [ref=e99] [cursor=pointer]:
                                    - /url: /download
                            - listitem [ref=e100]:
                                - link "Documentation" [ref=e101] [cursor=pointer]:
                                    - /url: /docs
                            - listitem [ref=e102]:
                                - link "Changelog" [ref=e103] [cursor=pointer]:
                                    - /url: /docs
                            - listitem [ref=e104]:
                                - link "API Reference" [ref=e105] [cursor=pointer]:
                                    - /url: /docs
                    - generic [ref=e106]:
                        - heading "Company" [level=3] [ref=e107]
                        - list [ref=e108]:
                            - listitem [ref=e109]:
                                - link "About" [ref=e110] [cursor=pointer]:
                                    - /url: /about
                            - listitem [ref=e111]:
                                - link "Blog" [ref=e112] [cursor=pointer]:
                                    - /url: /blog
                            - listitem [ref=e113]:
                                - link "Careers" [ref=e114] [cursor=pointer]:
                                    - /url: /careers
                            - listitem [ref=e115]:
                                - link "Contact" [ref=e116] [cursor=pointer]:
                                    - /url: /contact
                            - listitem [ref=e117]:
                                - link "Press Kit" [ref=e118] [cursor=pointer]:
                                    - /url: /about
                    - generic [ref=e119]:
                        - heading "Legal" [level=3] [ref=e120]
                        - list [ref=e121]:
                            - listitem [ref=e122]:
                                - link "Privacy" [ref=e123] [cursor=pointer]:
                                    - /url: /privacy
                            - listitem [ref=e124]:
                                - link "Terms" [ref=e125] [cursor=pointer]:
                                    - /url: /terms
                            - listitem [ref=e126]:
                                - link "Cookies" [ref=e127] [cursor=pointer]:
                                    - /url: /cookies
                            - listitem [ref=e128]:
                                - link "Refund Policy" [ref=e129] [cursor=pointer]:
                                    - /url: /refund
                            - listitem [ref=e130]:
                                - link "SLA" [ref=e131] [cursor=pointer]:
                                    - /url: /sla
                - generic [ref=e132]:
                    - paragraph [ref=e133]: © 2026 Xenboox. All rights reserved.
                    - generic [ref=e134]:
                        - link "Privacy" [ref=e135] [cursor=pointer]:
                            - /url: /privacy
                        - link "Terms" [ref=e136] [cursor=pointer]:
                            - /url: /terms
                        - link "Cookies" [ref=e137] [cursor=pointer]:
                            - /url: /cookies
    - alert [ref=e138]
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
