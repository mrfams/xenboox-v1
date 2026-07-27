# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: marketing-pages.spec.ts >> Marketing Pages — Public Routes >> /terms loads with correct title and no errors
- Location: e2e\marketing-pages.spec.ts:22:9

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 1
+ Received  + 3

- Array []
+ Array [
+   "Executing inline script violates the following Content Security Policy directive 'script-src 'self' https://cdn.jsdelivr.net 'nonce-vzVDDHZKLBpzNx4wg6qZ5A==''. Either the 'unsafe-inline' keyword, a hash ('sha256-n46vPwSWuMC0W703pBofImv82Z26xo4LXymv0E9caPk='), or a nonce ('nonce-...') is required to enable inline execution. The action has been blocked.",
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
                - heading "Terms of Service" [level=1] [ref=e24]
                - paragraph [ref=e25]: "Last updated: July 1, 2026 · The terms governing your use of the Xenboox platform."
            - generic [ref=e28]:
                - heading "1. Acceptance of Terms" [level=2] [ref=e29]
                - paragraph [ref=e30]: By accessing or using Xenboox ("the Platform"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Platform.
                - heading "2. Description of Service" [level=2] [ref=e31]
                - paragraph [ref=e32]: Xenboox provides an AI-native accounting platform including automated bookkeeping, financial reporting, payroll, tax compliance, and related services. The Platform uses artificial intelligence agents to assist with accounting tasks, but all final financial decisions remain the responsibility of the user and their qualified accountant.
                - heading "3. User Accounts" [level=2] [ref=e33]
                - heading "3.1 Account Registration" [level=3] [ref=e34]
                - paragraph [ref=e35]: You must provide accurate, current, and complete information during registration. You are responsible for maintaining the confidentiality of your login credentials.
                - heading "3.2 Account Responsibilities" [level=3] [ref=e36]
                - list [ref=e37]:
                    - listitem [ref=e38]: You are responsible for all activities under your account
                    - listitem [ref=e39]: You must notify us immediately of unauthorized access
                    - listitem [ref=e40]: You must ensure your entity has the legal capacity to enter into these terms
                - heading "4. AI Agent Limitations" [level=2] [ref=e41]
                - list [ref=e42]:
                    - listitem [ref=e43]: AI agents provide recommendations and automate routine tasks — they do not replace professional accounting judgment
                    - listitem [ref=e44]: Confidence scores indicate agent certainty but do not guarantee accuracy
                    - listitem [ref=e45]: Transactions above configured thresholds always require human approval
                    - listitem [ref=e46]: You retain full responsibility for the accuracy and completeness of your financial records
                - heading "5. Fees & Billing" [level=2] [ref=e47]
                - paragraph [ref=e48]:
                    - text: Fees are as described on our
                    - link "Pricing page" [ref=e49] [cursor=pointer]:
                        - /url: /pricing
                    - text: . All fees are billed in advance and are non-refundable except as specified in our
                    - link "Refund Policy" [ref=e50] [cursor=pointer]:
                        - /url: /refund
                    - text: . We may change fees with 30 days' notice.
                - heading "6. Data Ownership" [level=2] [ref=e51]
                - paragraph [ref=e52]: You retain full ownership of all financial data, documents, and information you upload to the Platform. We use your data only to provide the Service and may use anonymized, aggregated data for platform improvement.
                - heading "7. Acceptable Use" [level=2] [ref=e53]
                - paragraph [ref=e54]: "You agree not to:"
                - list [ref=e55]:
                    - listitem [ref=e56]: Use the Platform for any unlawful purpose
                    - listitem [ref=e57]: Attempt to bypass entity isolation or access another entity's data
                    - listitem [ref=e58]: Upload malicious code or attempt to compromise platform security
                    - listitem [ref=e59]: Use automated tools to scrape or extract data beyond API rate limits
                    - listitem [ref=e60]: Misrepresent AI agent outputs as human professional advice
                - heading "8. Limitation of Liability" [level=2] [ref=e61]
                - paragraph [ref=e62]: To the maximum extent permitted by law, Xenboox shall not be liable for indirect, incidental, special, or consequential damages arising from your use of the Platform. Our total liability is limited to the fees you paid in the 12 months preceding the claim.
                - heading "9. Termination" [level=2] [ref=e63]
                - paragraph [ref=e64]: Either party may terminate this agreement at any time. Upon termination, you may export your data within 90 days. After 90 days, your data will be permanently deleted.
                - heading "10. Governing Law" [level=2] [ref=e65]
                - paragraph [ref=e66]: These terms are governed by the laws of Ghana. Any disputes shall be resolved through binding arbitration in Accra, Ghana.
                - heading "11. Contact" [level=2] [ref=e67]
                - paragraph [ref=e68]:
                    - text: For questions about these terms, contact
                    - link "legal@xenboox.com" [ref=e69] [cursor=pointer]:
                        - /url: mailto:legal@xenboox.com
                    - text: .
        - contentinfo [ref=e70]:
            - generic [ref=e71]:
                - generic [ref=e72]:
                    - heading "Stay in the loop" [level=3] [ref=e73]
                    - paragraph [ref=e74]: Product updates, accounting tips, and African fintech insights. No spam, unsubscribe anytime.
                    - generic [ref=e75]:
                        - textbox "Enter your email" [ref=e76]
                        - button "Subscribe" [ref=e77] [cursor=pointer]
                - generic [ref=e78]:
                    - generic [ref=e79]:
                        - link "X Xenboox" [ref=e80] [cursor=pointer]:
                            - /url: /
                            - generic [ref=e81]: X
                            - generic [ref=e82]: Xenboox
                        - paragraph [ref=e83]: AI-native accounting platform built for African businesses. Automated journal entries, reconciliations, payroll, and financial reporting — powered by 19 specialized AI agents.
                        - generic [ref=e84]:
                            - link "X / Twitter" [ref=e85] [cursor=pointer]:
                                - /url: "#"
                                - img [ref=e86]
                            - link "LinkedIn" [ref=e88] [cursor=pointer]:
                                - /url: "#"
                                - img [ref=e89]
                            - link "GitHub" [ref=e91] [cursor=pointer]:
                                - /url: "#"
                                - img [ref=e92]
                            - link "YouTube" [ref=e94] [cursor=pointer]:
                                - /url: "#"
                                - img [ref=e95]
                    - generic [ref=e97]:
                        - heading "Product" [level=3] [ref=e98]
                        - list [ref=e99]:
                            - listitem [ref=e100]:
                                - link "Features" [ref=e101] [cursor=pointer]:
                                    - /url: /features
                            - listitem [ref=e102]:
                                - link "Pricing" [ref=e103] [cursor=pointer]:
                                    - /url: /pricing
                            - listitem [ref=e104]:
                                - link "Download" [ref=e105] [cursor=pointer]:
                                    - /url: /download
                            - listitem [ref=e106]:
                                - link "Documentation" [ref=e107] [cursor=pointer]:
                                    - /url: /docs
                            - listitem [ref=e108]:
                                - link "Changelog" [ref=e109] [cursor=pointer]:
                                    - /url: /docs
                            - listitem [ref=e110]:
                                - link "API Reference" [ref=e111] [cursor=pointer]:
                                    - /url: /docs
                    - generic [ref=e112]:
                        - heading "Company" [level=3] [ref=e113]
                        - list [ref=e114]:
                            - listitem [ref=e115]:
                                - link "About" [ref=e116] [cursor=pointer]:
                                    - /url: /about
                            - listitem [ref=e117]:
                                - link "Blog" [ref=e118] [cursor=pointer]:
                                    - /url: /blog
                            - listitem [ref=e119]:
                                - link "Careers" [ref=e120] [cursor=pointer]:
                                    - /url: /careers
                            - listitem [ref=e121]:
                                - link "Contact" [ref=e122] [cursor=pointer]:
                                    - /url: /contact
                            - listitem [ref=e123]:
                                - link "Press Kit" [ref=e124] [cursor=pointer]:
                                    - /url: /about
                    - generic [ref=e125]:
                        - heading "Legal" [level=3] [ref=e126]
                        - list [ref=e127]:
                            - listitem [ref=e128]:
                                - link "Privacy" [ref=e129] [cursor=pointer]:
                                    - /url: /privacy
                            - listitem [ref=e130]:
                                - link "Terms" [ref=e131] [cursor=pointer]:
                                    - /url: /terms
                            - listitem [ref=e132]:
                                - link "Cookies" [ref=e133] [cursor=pointer]:
                                    - /url: /cookies
                            - listitem [ref=e134]:
                                - link "Refund Policy" [ref=e135] [cursor=pointer]:
                                    - /url: /refund
                            - listitem [ref=e136]:
                                - link "SLA" [ref=e137] [cursor=pointer]:
                                    - /url: /sla
                - generic [ref=e138]:
                    - paragraph [ref=e139]: © 2026 Xenboox. All rights reserved.
                    - generic [ref=e140]:
                        - link "Privacy" [ref=e141] [cursor=pointer]:
                            - /url: /privacy
                        - link "Terms" [ref=e142] [cursor=pointer]:
                            - /url: /terms
                        - link "Cookies" [ref=e143] [cursor=pointer]:
                            - /url: /cookies
    - alert [ref=e144]
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
