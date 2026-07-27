# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: marketing-pages.spec.ts >> Marketing Pages — Public Routes >> /privacy loads with correct title and no errors
- Location: e2e\marketing-pages.spec.ts:22:9

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 1
+ Received  + 3

- Array []
+ Array [
+   "Executing inline script violates the following Content Security Policy directive 'script-src 'self' https://cdn.jsdelivr.net 'nonce-gpJxiKKiiUjl72ti8j1lEw==''. Either the 'unsafe-inline' keyword, a hash ('sha256-n46vPwSWuMC0W703pBofImv82Z26xo4LXymv0E9caPk='), or a nonce ('nonce-...') is required to enable inline execution. The action has been blocked.",
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
                - heading "Privacy Policy" [level=1] [ref=e24]
                - paragraph [ref=e25]: "Last updated: July 1, 2026 · How Xenboox collects, uses, and protects your personal data."
            - generic [ref=e28]:
                - heading "1. Introduction" [level=2] [ref=e29]
                - paragraph [ref=e30]: Xenboox Limited ("Xenboox," "we," "us," "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.
                - heading "2. Information We Collect" [level=2] [ref=e31]
                - heading "2.1 Information You Provide" [level=3] [ref=e32]
                - list [ref=e33]:
                    - listitem [ref=e34]:
                        - strong [ref=e35]: "Account Information:"
                        - text: Name, email address, phone number, company details, and billing information when you create an account.
                    - listitem [ref=e36]:
                        - strong [ref=e37]: "Financial Data:"
                        - text: Transaction records, bank statements, invoices, receipts, and other financial documents you upload or connect.
                    - listitem [ref=e38]:
                        - strong [ref=e39]: "Profile Information:"
                        - text: Job title, role, entity associations, and preferences.
                - heading "2.2 Information Collected Automatically" [level=3] [ref=e40]
                - list [ref=e41]:
                    - listitem [ref=e42]:
                        - strong [ref=e43]: "Usage Data:"
                        - text: Pages visited, features used, session duration, and navigation patterns.
                    - listitem [ref=e44]:
                        - strong [ref=e45]: "Device Data:"
                        - text: IP address, browser type, operating system, and device identifiers.
                    - listitem [ref=e46]:
                        - strong [ref=e47]: "Cookies:"
                        - text: We use essential cookies for authentication and session management. See our
                        - link "Cookie Policy" [ref=e48] [cursor=pointer]:
                            - /url: /cookies
                        - text: .
                - heading "3. How We Use Your Information" [level=2] [ref=e49]
                - list [ref=e50]:
                    - listitem [ref=e51]: To provide, maintain, and improve the Xenboox platform
                    - listitem [ref=e52]: To process financial transactions and generate reports
                    - listitem [ref=e53]: To train and improve our AI agents (anonymized data only)
                    - listitem [ref=e54]: To communicate account updates, security alerts, and support
                    - listitem [ref=e55]: To comply with legal and regulatory obligations
                - heading "4. Data Sharing & Disclosure" [level=2] [ref=e56]
                - paragraph [ref=e57]: "We never sell your personal or financial data. We may share data with:"
                - list [ref=e58]:
                    - listitem [ref=e59]:
                        - strong [ref=e60]: "Service Providers:"
                        - text: Cloud infrastructure (AWS), email delivery (Resend), and monitoring (LangFuse) — all bound by data processing agreements.
                    - listitem [ref=e61]:
                        - strong [ref=e62]: "Regulatory Authorities:"
                        - text: When required by applicable law or valid legal process.
                    - listitem [ref=e63]:
                        - strong [ref=e64]: "With Your Consent:"
                        - text: When you explicitly authorize sharing (e.g., connecting a bank feed).
                - heading "5. Data Security" [level=2] [ref=e65]
                - paragraph [ref=e66]: We implement industry-standard security measures including encryption at rest (AES-256), encryption in transit (TLS 1.3), role-based access control, and full audit trails. Our infrastructure is SOC 2 compliant.
                - heading "6. Data Retention" [level=2] [ref=e67]
                - paragraph [ref=e68]: We retain your data for as long as your account is active or as needed to provide services. Upon account termination, we delete or anonymize your data within 90 days, except where legal retention requirements apply.
                - heading "7. Your Rights" [level=2] [ref=e69]
                - paragraph [ref=e70]: "Depending on your jurisdiction, you may have the right to:"
                - list [ref=e71]:
                    - listitem [ref=e72]: Access the personal data we hold about you
                    - listitem [ref=e73]: Correct inaccurate or incomplete data
                    - listitem [ref=e74]: Delete your data (subject to legal obligations)
                    - listitem [ref=e75]: Restrict or object to processing
                    - listitem [ref=e76]: Data portability
                    - listitem [ref=e77]: Withdraw consent at any time
                - heading "8. International Transfers" [level=2] [ref=e78]
                - paragraph [ref=e79]: Your data may be processed in countries where our infrastructure providers operate. We ensure appropriate safeguards are in place through standard contractual clauses and data processing agreements.
                - heading "9. Changes to This Policy" [level=2] [ref=e80]
                - paragraph [ref=e81]: We may update this policy from time to time. Material changes will be notified via email or platform notice. Continued use after changes constitutes acceptance.
                - heading "10. Contact" [level=2] [ref=e82]
                - paragraph [ref=e83]:
                    - text: For privacy-related inquiries, contact our Data Protection Officer at
                    - link "privacy@xenboox.com" [ref=e84] [cursor=pointer]:
                        - /url: mailto:privacy@xenboox.com
                    - text: "or write to:"
                - paragraph [ref=e85]:
                    - text: Xenboox Limited
                    - text: Data Protection Officer
                    - text: Accra, Ghana
        - contentinfo [ref=e86]:
            - generic [ref=e87]:
                - generic [ref=e88]:
                    - heading "Stay in the loop" [level=3] [ref=e89]
                    - paragraph [ref=e90]: Product updates, accounting tips, and African fintech insights. No spam, unsubscribe anytime.
                    - generic [ref=e91]:
                        - textbox "Enter your email" [ref=e92]
                        - button "Subscribe" [ref=e93] [cursor=pointer]
                - generic [ref=e94]:
                    - generic [ref=e95]:
                        - link "X Xenboox" [ref=e96] [cursor=pointer]:
                            - /url: /
                            - generic [ref=e97]: X
                            - generic [ref=e98]: Xenboox
                        - paragraph [ref=e99]: AI-native accounting platform built for African businesses. Automated journal entries, reconciliations, payroll, and financial reporting — powered by 19 specialized AI agents.
                        - generic [ref=e100]:
                            - link "X / Twitter" [ref=e101] [cursor=pointer]:
                                - /url: "#"
                                - img [ref=e102]
                            - link "LinkedIn" [ref=e104] [cursor=pointer]:
                                - /url: "#"
                                - img [ref=e105]
                            - link "GitHub" [ref=e107] [cursor=pointer]:
                                - /url: "#"
                                - img [ref=e108]
                            - link "YouTube" [ref=e110] [cursor=pointer]:
                                - /url: "#"
                                - img [ref=e111]
                    - generic [ref=e113]:
                        - heading "Product" [level=3] [ref=e114]
                        - list [ref=e115]:
                            - listitem [ref=e116]:
                                - link "Features" [ref=e117] [cursor=pointer]:
                                    - /url: /features
                            - listitem [ref=e118]:
                                - link "Pricing" [ref=e119] [cursor=pointer]:
                                    - /url: /pricing
                            - listitem [ref=e120]:
                                - link "Download" [ref=e121] [cursor=pointer]:
                                    - /url: /download
                            - listitem [ref=e122]:
                                - link "Documentation" [ref=e123] [cursor=pointer]:
                                    - /url: /docs
                            - listitem [ref=e124]:
                                - link "Changelog" [ref=e125] [cursor=pointer]:
                                    - /url: /docs
                            - listitem [ref=e126]:
                                - link "API Reference" [ref=e127] [cursor=pointer]:
                                    - /url: /docs
                    - generic [ref=e128]:
                        - heading "Company" [level=3] [ref=e129]
                        - list [ref=e130]:
                            - listitem [ref=e131]:
                                - link "About" [ref=e132] [cursor=pointer]:
                                    - /url: /about
                            - listitem [ref=e133]:
                                - link "Blog" [ref=e134] [cursor=pointer]:
                                    - /url: /blog
                            - listitem [ref=e135]:
                                - link "Careers" [ref=e136] [cursor=pointer]:
                                    - /url: /careers
                            - listitem [ref=e137]:
                                - link "Contact" [ref=e138] [cursor=pointer]:
                                    - /url: /contact
                            - listitem [ref=e139]:
                                - link "Press Kit" [ref=e140] [cursor=pointer]:
                                    - /url: /about
                    - generic [ref=e141]:
                        - heading "Legal" [level=3] [ref=e142]
                        - list [ref=e143]:
                            - listitem [ref=e144]:
                                - link "Privacy" [ref=e145] [cursor=pointer]:
                                    - /url: /privacy
                            - listitem [ref=e146]:
                                - link "Terms" [ref=e147] [cursor=pointer]:
                                    - /url: /terms
                            - listitem [ref=e148]:
                                - link "Cookies" [ref=e149] [cursor=pointer]:
                                    - /url: /cookies
                            - listitem [ref=e150]:
                                - link "Refund Policy" [ref=e151] [cursor=pointer]:
                                    - /url: /refund
                            - listitem [ref=e152]:
                                - link "SLA" [ref=e153] [cursor=pointer]:
                                    - /url: /sla
                - generic [ref=e154]:
                    - paragraph [ref=e155]: © 2026 Xenboox. All rights reserved.
                    - generic [ref=e156]:
                        - link "Privacy" [ref=e157] [cursor=pointer]:
                            - /url: /privacy
                        - link "Terms" [ref=e158] [cursor=pointer]:
                            - /url: /terms
                        - link "Cookies" [ref=e159] [cursor=pointer]:
                            - /url: /cookies
    - alert [ref=e160]
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
