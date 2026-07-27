# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: marketing-pages.spec.ts >> Marketing Pages — Public Routes >> /sla loads with correct title and no errors
- Location: e2e\marketing-pages.spec.ts:22:9

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 1
+ Received  + 3

- Array []
+ Array [
+   "Executing inline script violates the following Content Security Policy directive 'script-src 'self' https://cdn.jsdelivr.net 'nonce-GmLEzntbQWe6kO5mrZibGw==''. Either the 'unsafe-inline' keyword, a hash ('sha256-n46vPwSWuMC0W703pBofImv82Z26xo4LXymv0E9caPk='), or a nonce ('nonce-...') is required to enable inline execution. The action has been blocked.",
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
                - heading "Service Level Agreement" [level=1] [ref=e24]
                - paragraph [ref=e25]: "Last updated: July 1, 2026 · Our commitment to platform availability and performance."
            - generic [ref=e28]:
                - heading "1. Service Commitment" [level=2] [ref=e29]
                - paragraph [ref=e30]:
                    - text: Xenboox commits to a platform uptime of
                    - strong [ref=e31]: 99.9%
                    - text: measured monthly, excluding scheduled maintenance and force majeure events.
                - heading "2. Definitions" [level=2] [ref=e32]
                - list [ref=e33]:
                    - listitem [ref=e34]:
                        - strong [ref=e35]: "Uptime:"
                        - text: The percentage of time during a calendar month that the Xenboox platform is accessible via the web application and API.
                    - listitem [ref=e36]:
                        - strong [ref=e37]: "Downtime:"
                        - text: Periods during which the platform is unavailable for authorized users, excluding planned maintenance.
                    - listitem [ref=e38]:
                        - strong [ref=e39]: "Scheduled Maintenance:"
                        - text: Pre-announced maintenance windows, typically outside business hours (UTC±0 22:00–06:00) with at least 48 hours notice.
                - heading "3. Uptime Calculation" [level=2] [ref=e40]
                - paragraph [ref=e41]:
                    - text: "Uptime is calculated as:"
                    - code [ref=e42]: (Total minutes in month − Downtime minutes) ÷ Total minutes in month × 100
                - heading "4. Service Credits" [level=2] [ref=e43]
                - table [ref=e44]:
                    - rowgroup [ref=e45]:
                        - row "Monthly Uptime Service Credit" [ref=e46]:
                            - columnheader "Monthly Uptime" [ref=e47]
                            - columnheader "Service Credit" [ref=e48]
                    - rowgroup [ref=e49]:
                        - row "99.0% – 99.9% 5% of monthly fee" [ref=e50]:
                            - cell "99.0% – 99.9%" [ref=e51]
                            - cell "5% of monthly fee" [ref=e52]
                        - row "95.0% – 98.9% 10% of monthly fee" [ref=e53]:
                            - cell "95.0% – 98.9%" [ref=e54]
                            - cell "10% of monthly fee" [ref=e55]
                        - row "Below 95.0% 25% of monthly fee" [ref=e56]:
                            - cell "Below 95.0%" [ref=e57]
                            - cell "25% of monthly fee" [ref=e58]
                - heading "5. Exclusions" [level=2] [ref=e59]
                - paragraph [ref=e60]: "The SLA does not apply to:"
                - list [ref=e61]:
                    - listitem [ref=e62]: Downtime caused by user-side network or infrastructure issues
                    - listitem [ref=e63]: Third-party service provider outages (bank feeds, mobile money APIs, cloud providers)
                    - listitem [ref=e64]: Beta features or features explicitly labeled as "preview" or "experimental"
                    - listitem [ref=e65]: Actions taken in response to security incidents or legal requirements
                    - listitem [ref=e66]: Force majeure events including natural disasters, civil unrest, or widespread internet disruption
                - heading "6. Requesting Credits" [level=2] [ref=e67]
                - paragraph [ref=e68]:
                    - text: To request service credits, contact
                    - link "support@xenboox.com" [ref=e69] [cursor=pointer]:
                        - /url: mailto:support@xenboox.com
                    - text: "within 30 days of the incident with:"
                - list [ref=e70]:
                    - listitem [ref=e71]: Date and time range of the downtime
                    - listitem [ref=e72]: Description of the impact
                    - listitem [ref=e73]: Any supporting evidence (error logs, screenshots)
                - paragraph [ref=e74]: We will acknowledge receipt within 2 business days and resolve the claim within 10 business days.
                - heading "7. Support Response Times" [level=2] [ref=e75]
                - table [ref=e76]:
                    - rowgroup [ref=e77]:
                        - row "Severity Definition Response Time" [ref=e78]:
                            - columnheader "Severity" [ref=e79]
                            - columnheader "Definition" [ref=e80]
                            - columnheader "Response Time" [ref=e81]
                    - rowgroup [ref=e82]:
                        - row "Critical Platform unavailable or data loss 1 hour" [ref=e83]:
                            - cell "Critical" [ref=e84]
                            - cell "Platform unavailable or data loss" [ref=e85]
                            - cell "1 hour" [ref=e86]
                        - row "High Major feature unavailable 4 hours" [ref=e87]:
                            - cell "High" [ref=e88]
                            - cell "Major feature unavailable" [ref=e89]
                            - cell "4 hours" [ref=e90]
                        - row "Normal Minor feature issue, non-urgent 1 business day" [ref=e91]:
                            - cell "Normal" [ref=e92]
                            - cell "Minor feature issue, non-urgent" [ref=e93]
                            - cell "1 business day" [ref=e94]
                - heading "8. Monitoring & Reporting" [level=2] [ref=e95]
                - paragraph [ref=e96]:
                    - text: Platform uptime is monitored continuously. Monthly uptime reports are published on our
                    - link "status page" [ref=e97] [cursor=pointer]:
                        - /url: https://status.xenboox.com
                    - text: .
        - contentinfo [ref=e98]:
            - generic [ref=e99]:
                - generic [ref=e100]:
                    - heading "Stay in the loop" [level=3] [ref=e101]
                    - paragraph [ref=e102]: Product updates, accounting tips, and African fintech insights. No spam, unsubscribe anytime.
                    - generic [ref=e103]:
                        - textbox "Enter your email" [ref=e104]
                        - button "Subscribe" [ref=e105] [cursor=pointer]
                - generic [ref=e106]:
                    - generic [ref=e107]:
                        - link "X Xenboox" [ref=e108] [cursor=pointer]:
                            - /url: /
                            - generic [ref=e109]: X
                            - generic [ref=e110]: Xenboox
                        - paragraph [ref=e111]: AI-native accounting platform built for African businesses. Automated journal entries, reconciliations, payroll, and financial reporting — powered by 19 specialized AI agents.
                        - generic [ref=e112]:
                            - link "X / Twitter" [ref=e113] [cursor=pointer]:
                                - /url: "#"
                                - img [ref=e114]
                            - link "LinkedIn" [ref=e116] [cursor=pointer]:
                                - /url: "#"
                                - img [ref=e117]
                            - link "GitHub" [ref=e119] [cursor=pointer]:
                                - /url: "#"
                                - img [ref=e120]
                            - link "YouTube" [ref=e122] [cursor=pointer]:
                                - /url: "#"
                                - img [ref=e123]
                    - generic [ref=e125]:
                        - heading "Product" [level=3] [ref=e126]
                        - list [ref=e127]:
                            - listitem [ref=e128]:
                                - link "Features" [ref=e129] [cursor=pointer]:
                                    - /url: /features
                            - listitem [ref=e130]:
                                - link "Pricing" [ref=e131] [cursor=pointer]:
                                    - /url: /pricing
                            - listitem [ref=e132]:
                                - link "Download" [ref=e133] [cursor=pointer]:
                                    - /url: /download
                            - listitem [ref=e134]:
                                - link "Documentation" [ref=e135] [cursor=pointer]:
                                    - /url: /docs
                            - listitem [ref=e136]:
                                - link "Changelog" [ref=e137] [cursor=pointer]:
                                    - /url: /docs
                            - listitem [ref=e138]:
                                - link "API Reference" [ref=e139] [cursor=pointer]:
                                    - /url: /docs
                    - generic [ref=e140]:
                        - heading "Company" [level=3] [ref=e141]
                        - list [ref=e142]:
                            - listitem [ref=e143]:
                                - link "About" [ref=e144] [cursor=pointer]:
                                    - /url: /about
                            - listitem [ref=e145]:
                                - link "Blog" [ref=e146] [cursor=pointer]:
                                    - /url: /blog
                            - listitem [ref=e147]:
                                - link "Careers" [ref=e148] [cursor=pointer]:
                                    - /url: /careers
                            - listitem [ref=e149]:
                                - link "Contact" [ref=e150] [cursor=pointer]:
                                    - /url: /contact
                            - listitem [ref=e151]:
                                - link "Press Kit" [ref=e152] [cursor=pointer]:
                                    - /url: /about
                    - generic [ref=e153]:
                        - heading "Legal" [level=3] [ref=e154]
                        - list [ref=e155]:
                            - listitem [ref=e156]:
                                - link "Privacy" [ref=e157] [cursor=pointer]:
                                    - /url: /privacy
                            - listitem [ref=e158]:
                                - link "Terms" [ref=e159] [cursor=pointer]:
                                    - /url: /terms
                            - listitem [ref=e160]:
                                - link "Cookies" [ref=e161] [cursor=pointer]:
                                    - /url: /cookies
                            - listitem [ref=e162]:
                                - link "Refund Policy" [ref=e163] [cursor=pointer]:
                                    - /url: /refund
                            - listitem [ref=e164]:
                                - link "SLA" [ref=e165] [cursor=pointer]:
                                    - /url: /sla
                - generic [ref=e166]:
                    - paragraph [ref=e167]: © 2026 Xenboox. All rights reserved.
                    - generic [ref=e168]:
                        - link "Privacy" [ref=e169] [cursor=pointer]:
                            - /url: /privacy
                        - link "Terms" [ref=e170] [cursor=pointer]:
                            - /url: /terms
                        - link "Cookies" [ref=e171] [cursor=pointer]:
                            - /url: /cookies
    - alert [ref=e172]
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
