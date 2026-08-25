# Employee Works — Complete Audit Findings

> **AGENT INSTRUCTIONS:** Only mark a finding as ✅ DONE when it is **fully and completely fixed, verified, and working in production.** Partial fixes, TODOs, or "I started working on it" do NOT count. If you fix something, mark it ✅ DONE. If it's still broken or incomplete, leave it unmarked. Every finding must be verified before marking done — run typecheck, test, and visually confirm the fix works.
>
> All findings from 24 employees that scored below 10/10.
> Generated: August 23, 2026 (Updated: August 25, 2026)
>
> **Scope: WEB ONLY.** No mobile apps, no desktop apps, no PWA. The platform is a web-first AI-native accounting dashboard.
>
> **Status Key:** `⬜` = Not started | `🔧` = In progress | `✅` = Fully fixed and verified | `N/A` = Out of scope

---

## Employee #1: Product Manager — Score: 8.5/10

| #   | Finding                                                                                                                                                                          | Severity | Fix                                                                                    | Status |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------- | ------ |
| 1   | Blog posts still short                                                                                                                                                           | HIGH     | All 6 posts are 10-14 min reads (1,500-2,800w)                                         | ⬜     |
| 2   | Pricing missing trust signals ("No credit card", "Cancel anytime")                                                                                                               | HIGH     | Add trust badges and guarantee                                                         | ⬜     |
| 3   | About page is generic — no real people                                                                                                                                           | HIGH     | Add founder story, team photos, global context                                         | ⬜     |
| 4   | Blog post missing author card and related posts                                                                                                                                  | MEDIUM   | Add author card + "You might also like" section                                        | ⬜     |
| 5   | No sticky CTA on marketing pages                                                                                                                                                 | MEDIUM   | Floating CTA in marketing layout                                                       | ⬜     |
| 6   | Only 3 testimonials                                                                                                                                                              | MEDIUM   | Add 3-5 more for social proof                                                          | ⬜     |
| 7   | No "Most Popular" badge on pricing                                                                                                                                               | LOW      | Highlight recommended tier                                                             | ⬜     |
| 8   | No FAQ section on pricing                                                                                                                                                        | LOW      | Add common objections below pricing cards                                              | ⬜     |
| 9   | No competitor comparison on pricing                                                                                                                                              | LOW      | Add QuickBooks/Xero comparison table                                                   | ⬜     |
| 10  | Pricing page "Save 17%" badge math may be inaccurate — verify per-tier savings                                                                                                   | LOW      | Calculate actual savings per tier, show "Save 2 months" if simpler                     | ⬜     |
| 11  | Features page testimonials reference Lagos/São Paulo — verify real customers or use generic locations                                                                            | MEDIUM   | Replace with verified locations or use generic                                         | ⬜     |
| 12  | Dashboard Command Center has no getting-started checklist for new users with 0 data                                                                                              | MEDIUM   | Add onboarding checklist in ProactiveBriefing when no transactions exist               | ⬜     |
| 13  | Ledger journal entry drawer uses hardcoded `bg-slate-900/10` — breaks dark mode                                                                                                  | MEDIUM   | Replace with `bg-foreground/10` or design system token                                 | ⬜     |
| 14  | **Donor portal dashboard hardcodes "GMD" currency** — `formatCurrency()` uses `currency: "GMD"` instead of entity's currency                                                     | HIGH     | Read currency from project data or entity context, never hardcode                      | ⬜     |
| 15  | **Donor portal PDF download hardcodes `currency: "GMD"`** in `buildDonorReportPdf()` call                                                                                        | HIGH     | Pass project's currency or entity currency, not hardcoded GMD                          | ⬜     |
| 16  | **Help page mixes design systems** — uses `dark:bg-slate-950` and `dark:text-slate-100` (Tailwind slate) instead of the app's design tokens (`bg-background`, `text-foreground`) | MEDIUM   | Replace all hardcoded slate colors with design system tokens for dark mode consistency | ⬜     |
| 17  | **Help page "All systems operational" badge is static** — never checks actual system status                                                                                      | LOW      | Either wire to a real health endpoint or remove the badge                              | ⬜     |
| 18  | **Audit trail fetches ALL logs client-side** — `trpc.settings.getAuditLogs.useQuery({ limit: 200 })` fetches up to 200 logs, then filters/paginates client-side                  | MEDIUM   | Move search and surface filters to server-side query params                            | ⬜     |
| 19  | **Audit trail CSV export has CSV injection risk** — user-controlled fields (action, entityType) are not sanitized before CSV embedding                                           | MEDIUM   | Prefix cells starting with `=`, `+`, `-`, `@`, `\t`, `\r` with single quote            | ⬜     |
| 20  | **Auth pages (login, register, forgot-password, reset-password) have no SSR metadata** — each auth page lacks `title` and `description`                                          | LOW      | Add `export const metadata` with appropriate titles for each auth page                 | ⬜     |
| 21  | **Donor portal landing page uses `typeof window !== "undefined"` for search params** — should use Next.js `useSearchParams()` for SSR safety                                     | MEDIUM   | Wrap in Suspense boundary and use `useSearchParams()` hook                             | ⬜     |

---

## Employee #2: Product Critic — Score: 8/10

| #   | Finding                                                                                                                                                         | Severity | Fix                                                                                | Status |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------- | ------ |
| 1   | Sticky CTA missing on all marketing pages                                                                                                                       | HIGH     | Floating CTA in marketing layout                                                   | ⬜     |
| 2   | Pricing page lacks trust signals                                                                                                                                | HIGH     | Add "No credit card", "Cancel anytime", guarantee                                  | ⬜     |
| 3   | About page shows generic content                                                                                                                                | HIGH     | Real team photos, founder story, global context                                    | ⬜     |
| 4   | Blog posts need 1,500+ words                                                                                                                                    | MEDIUM   | Expand remaining content                                                           | ⬜     |
| 5   | Blog post missing author card, related posts                                                                                                                    | MEDIUM   | Add to template                                                                    | ⬜     |
| 6   | No JSON-LD on blog posts                                                                                                                                        | MEDIUM   | Article + Breadcrumb schemas added                                                 | ⬜     |
| 7   | No social share buttons on blog                                                                                                                                 | MEDIUM   | Add share bar                                                                      | ⬜     |
| 8   | No reading time estimate                                                                                                                                        | LOW      | Add to blog post header                                                            | ⬜     |
| 9   | No "Related posts" section                                                                                                                                      | LOW      | Add at bottom of blog posts                                                        | ⬜     |
| 10  | Operations page well-designed — Money Flow, Banking, Transactions, Compliance, People, AI Quick Actions                                                         | —        | Production-grade                                                                   | ⬜     |
| 11  | Financial Pulse has AI narrative with confidence scores, KPI sparklines, Scenario Planner, Budget vs Actual                                                     | —        | Production-grade                                                                   | ⬜     |
| 12  | Settings page has 21 sections in 5 groups — well-organized but could overwhelm new users                                                                        | MEDIUM   | Consider progressive disclosure: show 5 essential first, rest on "Advanced" toggle | ⬜     |
| 13  | No undo on journal entry creation in Ledger                                                                                                                     | MEDIUM   | Add undo toast or reverse entry button in journal detail drawer                    | ⬜     |
| 14  | **Verify-email page has no loading skeleton** — just a spinner for the full page, no card structure preview                                                     | LOW      | Add card skeleton during Suspense fallback                                         | ⬜     |
| 15  | **MFA challenge page backup code input uses `maxLength={10}`** — backup codes are typically 8 or 10 chars, verify this matches the backup code generation logic | LOW      | Confirm backup code format and adjust maxLength accordingly                        | ⬜     |

---

## Employee #3: UX Writer — Score: 8/10

| #   | Finding                                                                                                                           | Severity | Fix                                                                                      | Status |
| --- | --------------------------------------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------- | ------ |
| 1   | Help page search placeholder is excellent — "Search help topics… e.g. invoice, reconcile, security"                               | —        | Production-grade                                                                         | ⬜     |
| 2   | Auth pages have clear CTAs — "Sign up free", "Sign in", "Back to sign in"                                                         | —        | Production-grade                                                                         | ⬜     |
| 3   | MFA page copy is clear — "Enter the 6-digit code from your authenticator app"                                                     | —        | Production-grade                                                                         | ⬜     |
| 4   | Verify email success: "You can now access all features of Xenboox" — could be warmer                                              | MEDIUM   | Consider "Welcome aboard! You're all set."                                               | ⬜     |
| 5   | Verify email error: "Go to Settings to Resend" — unclear what settings                                                            | MEDIUM   | Specify "Go to Email Settings to Resend Verification"                                    | ⬜     |
| 6   | Donor portal error messages are good — "This login link has expired. Please request a new one."                                   | —        | Production-grade                                                                         | ⬜     |
| 7   | Dashboard help page empty state is clear — "No topics match… Try a different keyword, or ask the AI assistant directly"           | —        | Production-grade                                                                         | ⬜     |
| 8   | **Donor portal landing page** says "Ask your organization for their Xenboox entity ID" — donors won't know what an "entity ID" is | MEDIUM   | Rephrase to "Ask your organization for their Reference Code" or make it optional         | ⬜     |
| 9   | **Audit trail page** "Who did what, when, and why" — good subtitle but the "why" is rarely captured in logs                       | LOW      | Consider adding a "reason" field to audit log creation or remove "and why" from subtitle | ⬜     |

---

## Employee #4: Copywriter — Score: 8/10

| #   | Finding                                                                                                                  | Severity | Fix                                                                                                            | Status |
| --- | ------------------------------------------------------------------------------------------------------------------------ | -------- | -------------------------------------------------------------------------------------------------------------- | ------ |
| 1   | Pricing page copy is strong — "Start free with 1 agent. Upgrade when you need the full team."                            | —        | Production-grade                                                                                               | ⬜     |
| 2   | Features page headline "Accounting that thinks for itself" is excellent                                                  | —        | Production-grade                                                                                               | ⬜     |
| 3   | Help page headline "How can we help?" is clear and welcoming                                                             | —        | Production-grade                                                                                               | ⬜     |
| 4   | **Marketing page metadata still says "19 Agents, Zero Data Entry"** in the title tag                                     | HIGH     | This is user-facing marketing — acceptable as-is, but consider "AI Agents, Zero Data Entry" for broader appeal | ⬜     |
| 5   | **OpenGraph description says "19 AI agents handle invoicing"** — if we're positioning globally, the count might alienate | MEDIUM   | Test with "AI agents handle invoicing" vs "19 AI agents" for click-through rates                               | ⬜     |

---

## Employee #5: Design Critic — Score: 8/10

| #   | Finding                                                                                                              | Severity | Fix                                                                         | Status |
| --- | -------------------------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------- | ------ |
| 1   | Marketing pages use consistent design tokens — `bg-paper`, `bg-paper-2/60`, `text-foreground`                        | —        | Production-grade                                                            | ⬜     |
| 2   | Pricing cards have good hover states and "Most Popular" badge                                                        | —        | Production-grade                                                            | ⬜     |
| 3   | Features page animated counters are well-implemented with IntersectionObserver                                       | —        | Production-grade                                                            | ⬜     |
| 4   | **Help page uses hardcoded slate colors** instead of design tokens — `dark:bg-slate-950`, `dark:text-slate-100`      | MEDIUM   | Replace with `bg-background`, `text-foreground` etc. for theme consistency  | ⬜     |
| 5   | **Auth pages mobile logo uses hardcoded gradient** — `bg-gradient-to-br from-blue-600 to-indigo-600`                 | LOW      | Consider using design system primary color instead of hardcoded blue/indigo | ⬜     |
| 6   | **Donor portal uses hardcoded emerald colors** — `bg-emerald-50`, `text-emerald-600`, `text-emerald-700`             | LOW      | Use design system success/positive color tokens                             | ⬜     |
| 7   | **Donor portal header has no responsive breakpoint for mobile** — project count text might overflow on small screens | LOW      | Add `hidden sm:inline` or truncate on mobile                                | ⬜     |

---

## Employee #14: Brand Voice — Score: 8/10

| #   | Finding                                                                                                                                              | Severity | Fix                                                                    | Status |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------- | ------ |
| 1   | All marketing copy uses consistent voice — professional, confident, not salesy                                                                       | —        | Production-grade                                                       | ⬜     |
| 2   | Help page maintains brand voice — "Chat with the CFO agent — it knows your books"                                                                    | —        | Production-grade                                                       | ⬜     |
| 3   | **Pricing tier descriptions are inconsistent** — Free says "Start closing your books with AI", Starter says "Save 10+ hours/month with 19 AI agents" | MEDIUM   | Unify tone: all should lead with value, not mix "AI" and "hours saved" | ⬜     |
| 4   | **OpenGraph title uses "19 Agents" count** — brand voice doc says to use "AI agents" generically in professional contexts                            | MEDIUM   | Align OG title with brand voice guidelines                             | ⬜     |

---

## Employee #15: Product Designer — Score: 8/10

| #   | Finding                                                                                    | Severity | Fix                                                   | Status |
| --- | ------------------------------------------------------------------------------------------ | -------- | ----------------------------------------------------- | ------ |
| 1   | Donor portal is well-designed — clean, minimal, read-only appropriate                      | —        | Production-grade                                      | ⬜     |
| 2   | Help page two-column layout with sticky AI assistant is good UX                            | —        | Production-grade                                      | ⬜     |
| 3   | **Donor portal has no loading skeleton** — just a spinner on initial load                  | LOW      | Add skeleton cards matching project card layout       | ⬜     |
| 4   | **Donor portal project expansion has no transition animation** — content appears instantly | LOW      | Add `transition-all duration-200` to expanded section | ⬜     |
| 5   | **Audit trail expand/collapse has no smooth transition** — content jumps                   | LOW      | Add max-height transition for smooth expand/collapse  | ⬜     |

---

## Employee #6: Security Engineer — Score: 8.5/10

| #   | Finding                                                                                                        | Severity | Fix                                                                                                                                  | Status |
| --- | -------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| 1   | Login page has open-redirect protection — `isSafeRedirect()` validates all redirect params                     | —        | Production-grade                                                                                                                     | ⬜     |
| 2   | MFA challenge validates `mfaToken` before submission                                                           | —        | Production-grade                                                                                                                     | ⬜     |
| 3   | **Donor portal API endpoint** (`/api/donor-portal/request`) — verify rate limiting exists on POST              | HIGH     | Ensure rate limit on donor portal request endpoint (magic link generation)                                                           | ⬜     |
| 4   | **Donor portal projects API** — verify donor ID + entity ID are validated server-side, not just passed through | HIGH     | Server must verify donor belongs to entity, reject mismatched combinations                                                           | ⬜     |
| 5   | **Donor portal search params** — `donor`, `entity`, `name` passed as URL query params                          | MEDIUM   | Donor ID and entity ID in URL are acceptable for magic-link portals, but ensure no PII in `name` param (currently uses it in header) | ⬜     |
| 6   | **CSV export in audit trail** — potential CSV injection if malicious action names contain formulas             | MEDIUM   | Sanitize CSV cells: prefix `=`, `+`, `-`, `@` with single quote                                                                      | ⬜     |

---

## Employee #7: Engineering Critic — Score: 8/10

| #   | Finding                                                                                             | Severity | Fix                                                                               | Status |
| --- | --------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------- | ------ |
| 1   | tRPC client is used consistently across dashboard pages                                             | —        | Production-grade                                                                  | ⬜     |
| 2   | Entity scoping applied via `useEntity()` hook                                                       | —        | Production-grade                                                                  | ⬜     |
| 3   | **Donor portal uses `fetch()` instead of tRPC** — different error handling pattern than rest of app | MEDIUM   | Consider creating a tRPC procedure for donor portal or document why fetch is used | ⬜     |
| 4   | **Audit trail has client-side pagination** — fetches 200 logs, filters in browser                   | MEDIUM   | Move pagination to server-side query with cursor/offset params                    | ⬜     |
| 5   | **Donor portal polling interval** — 30s polling runs even when user is idle, wastes bandwidth       | LOW      | Consider exponential backoff or reduce to 60s when tab is visible                 | ⬜     |
| 6   | **Help page has no error boundary** — if `HelpAssistant` component throws, entire page crashes      | LOW      | Wrap HelpAssistant in error boundary with fallback UI                             | ⬜     |

---

## Employee #11: Software Architect — Score: 8/10

| #   | Finding                                                                                                       | Severity | Fix                                                                          | Status |
| --- | ------------------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------- | ------ |
| 1   | Donor portal is properly isolated from main dashboard — no sidebar, no nav to internal pages                  | —        | Production-grade architecture                                                | ⬜     |
| 2   | Auth flow is well-structured — login → MFA challenge → dashboard, with proper redirects                       | —        | Production-grade architecture                                                | ⬜     |
| 3   | **Donor portal currency should be entity-configurable** — currently hardcoded in frontend                     | HIGH     | Backend should return currency per project, frontend reads from API response | ⬜     |
| 4   | **Help page doesn't lazy-load HelpAssistant** — component is imported eagerly but only rendered in right rail | LOW      | Use `React.lazy()` with Suspense for the AI assistant component              | ⬜     |

---

## Employee #16: DevOps Engineer — Score: 8/10

| #   | Finding                                                                                                                                | Severity | Fix                                                                 | Status |
| --- | -------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------- | ------ |
| 1   | All pages use proper SSR/CSR split — marketing is SSR, dashboard is CSR with `"use client"`                                            | —        | Production-grade                                                    | ⬜     |
| 2   | **Donor portal is fully client-side rendered** — `"use client"` at top, no SSR benefits                                                | LOW      | Consider SSR for initial project load for better SEO and faster FCP | ⬜     |
| 3   | **Auth pages mix SSR and CSR** — login/register are SSR (good), verify-email/mfa-challenge are CSR (acceptable for dynamic token flow) | —        | Architecture is appropriate for each page's needs                   | ⬜     |

---

## Employee #17: Enterprise Readiness — Score: 8/10

| #   | Finding                                                                                                                      | Severity | Fix                                                             | Status |
| --- | ---------------------------------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------- | ------ |
| 1   | Pricing page has 30-day money-back guarantee — trust signal for enterprise                                                   | —        | Production-grade                                                | ⬜     |
| 2   | Help page has contact support email — support@xenboox.com                                                                    | —        | Production-grade                                                | ⬜     |
| 3   | **Donor portal has no rate limiting visible in frontend** — if API isn't rate-limited, donors could spam magic link requests | HIGH     | Verify server-side rate limiting on `/api/donor-portal/request` | ⬜     |
| 4   | **Audit trail export has no access control check** — any user with audit-trail access can export all logs                    | MEDIUM   | Verify CSV export respects the same query filters as the UI     | ⬜     |

---

## Employee #8: Marketing Critic — Score: 8/10

| #   | Finding                                                                                                        | Severity | Fix                                                                      | Status |
| --- | -------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------ | ------ |
| 1   | Pricing page has ROI calculator — excellent for conversion                                                     | —        | Production-grade                                                         | ⬜     |
| 2   | Pricing page has comparison teaser — drives feature comparison                                                 | —        | Production-grade                                                         | ⬜     |
| 3   | Features page has JSON-LD and Breadcrumb schema                                                                | —        | Production-grade                                                         | ⬜     |
| 4   | **OpenGraph title "19 Agents, Zero Data Entry"** — strong but count-specific                                   | MEDIUM   | A/B test with "AI Agents, Zero Data Entry" for broader appeal            | ⬜     |
| 5   | **Pricing page ProductJsonLd description** says "Full access to all 19 AI agents" — structured data with count | MEDIUM   | Align with marketing strategy — count in structured data is fine for SEO | ⬜     |

---

## Employee #9: Sales Representative — Score: 7.5/10

| #   | Finding                                                                                                | Severity | Fix                                                     | Status |
| --- | ------------------------------------------------------------------------------------------------------ | -------- | ------------------------------------------------------- | ------ |
| 1   | Pricing page has clear tiers with feature lists                                                        | —        | Production-grade                                        | ⬜     |
| 2   | Pricing has trust signals — no credit card, cancel anytime, money-back guarantee                       | —        | Production-grade                                        | ⬜     |
| 3   | **No demo booking CTA** — pricing page drives to /register but no "Talk to sales" option               | MEDIUM   | Add enterprise/demo CTA for Business tier               | ⬜     |
| 4   | **No social proof on pricing page** — no customer count, logos, or testimonials                        | MEDIUM   | Add "Trusted by X businesses" or customer logos section | ⬜     |
| 5   | **Features page testimonials are from 3 cities** — limited geographic diversity for global positioning | LOW      | Add testimonials from more regions if available         | ⬜     |

---

## Employee #20: Competitor Analyst — Score: 7.5/10

| #   | Finding                                                                                                         | Severity | Fix                                                                              | Status |
| --- | --------------------------------------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------- | ------ |
| 1   | Comparison teaser on pricing page exists but details not visible in code reviewed                               | MEDIUM   | Verify comparison table includes QuickBooks, Xero, FreshBooks                    | ⬜     |
| 2   | **No explicit competitor positioning on features page** — lists features but doesn't contrast with alternatives | LOW      | Consider a "Why Xenboox vs others" section or ensure comparison page covers this | ⬜     |

---

## Employee #23: Lead Researcher — Score: 8/10

| #   | Finding                                                                              | Severity | Fix                                                                                                                              | Status |
| --- | ------------------------------------------------------------------------------------ | -------- | -------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 1   | Help page has clear topic taxonomy — Documentation + In-app guides                   | —        | Production-grade                                                                                                                 | ⬜     |
| 2   | Help page search has keyword matching across title, description, and keywords array  | —        | Production-grade                                                                                                                 | ⬜     |
| 3   | **Help page documentation links all point to `/docs/*`** — verify these routes exist | MEDIUM   | Ensure `/docs/quickstart`, `/docs/getting-started`, `/docs/modules`, `/docs/faq`, `/docs/security`, `/docs/webhooks` all resolve | ⬜     |

---

## Employee #12: Finance Analyst — Score: 7.5/10

| #   | Finding                                                                                                        | Severity | Fix                                                                                                | Status |
| --- | -------------------------------------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------- | ------ |
| 1   | Donor portal shows Grant Amount, Disbursed, Remaining — correct financial summary                              | —        | Production-grade                                                                                   | ⬜     |
| 2   | Budget vs Actual comparison in donor reports is well-structured                                                | —        | Production-grade                                                                                   | ⬜     |
| 3   | **Donor portal variance display** — red for positive variance (over budget), green for negative (under budget) | —        | Correct accounting convention                                                                      | ⬜     |
| 4   | **Donor portal progress bar uses `percentUsed > 80` as threshold** for amber color                             | LOW      | Verify this threshold aligns with grant management best practices (75% might be more conservative) | ⬜     |

---

## Employee #21: Data Analyst — Score: 7.5/10

| #   | Finding                                                                                    | Severity | Fix                                                                        | Status |
| --- | ------------------------------------------------------------------------------------------ | -------- | -------------------------------------------------------------------------- | ------ |
| 1   | Audit trail has search, surface filter, and CSV export                                     | —        | Production-grade                                                           | ⬜     |
| 2   | **Audit trail shows "Showing X of Y entries"** but Y is total from API, not filtered count | MEDIUM   | Change to "Showing X of Y total entries" or "X entries match your filters" | ⬜     |
| 3   | **Audit trail has no date range filter** — can only filter by surface, not time period     | MEDIUM   | Add date range picker (Today, This Week, This Month, Custom)               | ⬜     |

---

## Employee #10: Onboarding Specialist — Score: 7/10

| #   | Finding                                                                                           | Severity | Fix                                                                           | Status |
| --- | ------------------------------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------- | ------ |
| 1   | Auth flow is clear — login → register → forgot password → reset → verify email                    | —        | Production-grade                                                              | ⬜     |
| 2   | **No welcome email reference in code** — auth pages don't mention what happens after registration | MEDIUM   | Add a note on register page: "We'll send you a verification email"            | ⬜     |
| 3   | **Dashboard has no first-time user guidance** — new users land on Command Center with no context  | HIGH     | Add getting-started checklist or welcome banner for users with 0 transactions | ⬜     |
| 4   | **Donor portal onboarding** — donor must know their entity ID to access portal                    | MEDIUM   | Consider a "Find your organization" flow or make entity ID discoverable       | ⬜     |

---

## Employee #13: Customer Success Manager — Score: 7/10

| #   | Finding                                                                       | Severity | Fix                                                                                | Status |
| --- | ----------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------- | ------ |
| 1   | Help page has 3 support channels — docs, AI assistant, email                  | —        | Production-grade                                                                   | ⬜     |
| 2   | **No health scoring visible** — can't tell if users are engaging or churning  | HIGH     | Implement user health score based on login frequency, feature usage, approval rate | ⬜     |
| 3   | **No proactive outreach triggers** — no detection of declining usage patterns | HIGH     | Set up alerts when login frequency drops 50%+ or approvals go unreviewed 48h+      | ⬜     |

---

## Employee #18: COO — Score: 8/10

| #   | Finding                                                                                           | Severity | Fix                                                                   | Status |
| --- | ------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------- | ------ |
| 1   | Audit trail page has export capability — CSV download for compliance                              | —        | Production-grade                                                      | ⬜     |
| 2   | **Audit trail pagination is client-side** — doesn't scale beyond 200 entries                      | MEDIUM   | Implement server-side pagination with infinite scroll or page buttons | ⬜     |
| 3   | **Donor portal has no admin view** — no way for org admins to see who accessed their donor portal | MEDIUM   | Add admin audit log for donor portal access events                    | ⬜     |

---

## Employee #19: CEO/Founder — Score: 8/10

| #   | Finding                                                                             | Severity | Fix                                                                  | Status |
| --- | ----------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------- | ------ |
| 1   | Platform has clear positioning — AI-native accounting for businesses globally       | —        | Production-grade                                                     | ⬜     |
| 2   | **About page needs founder story** — currently generic, doesn't differentiate       | MEDIUM   | Add "Why we built Xenboox" section with founder narrative            | ⬜     |
| 3   | **No press/media page** — no way for journalists or analysts to learn about Xenboox | LOW      | Add /press or /about#media section with key facts and press contacts | ⬜     |

---

## Employee #24: Automation Specialist — Score: 8/10

| #   | Finding                                                                                  | Severity | Fix                                                                       | Status |
| --- | ---------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------- | ------ |
| 1   | Donor portal has 30s polling for live updates — reasonable for read-only portal          | —        | Production-grade                                                          | ⬜     |
| 2   | **Donor portal polling doesn't back off** — continues at 30s even if API returns errors  | LOW      | Implement exponential backoff: double interval on error, reset on success | ⬜     |
| 3   | **Help page AI assistant is a separate component** — verify it has proper error boundary | LOW      | Wrap in ErrorBoundary to prevent page crash on assistant failure          | ⬜     |

---

## 🔵 SECOND PASS — Employee #1: Product Manager (Re-audit)

| #    | Finding                                                                                                                                                                                                                                 | Severity                                         | Fix                                                                                                                                                  | Status                                                                                                         |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| S1-1 | **Donor portal `formatCurrency` hardcodes GMD** — `formatCurrency()` function at line ~60 uses `currency: "GMD"`. Every amount in the portal displays in Dalasi regardless of the entity's actual currency                              | HIGH                                             | Read currency from the project data returned by the API. If project has no currency field, default to entity's base currency. Never hardcode.        | ⬜                                                                                                             |
| S1-2 | **Donor portal PDF download hardcodes `currency: "GMD"`** — `buildDonorReportPdf()` call passes hardcoded GMD. Every downloaded PDF will show amounts in Dalasi                                                                         | HIGH                                             | Pass the project's reporting currency or entity's base currency to the PDF builder                                                                   | ⬜                                                                                                             |
| S1-3 | **Help page uses hardcoded Tailwind slate colors** for dark mode — `dark:bg-slate-950`, `dark:text-slate-100`, `dark:border-slate-800` etc. throughout. This means dark mode styling is disconnected from the app's design token system | MEDIUM                                           | Replace `dark:bg-slate-950` → `dark:bg-background`, `dark:text-slate-100` → `dark:text-foreground`, etc. to match the rest of the app's theme system | ⬜                                                                                                             |
| S1-4 | **Help page "All systems operational" badge is purely decorative** — the green dot and text are static HTML, not connected to any health endpoint or monitoring system                                                                  | LOW                                              | Either wire to a real `/api/health` check or remove the misleading badge. "All systems operational" without verification is false assurance          | ⬜                                                                                                             |
| S1-5 | **Audit trail fetches ALL logs at once** — `getAuditLogs.useQuery({ limit: 200, offset: 0 })` loads up to 200 entries, then client-side filtering with `useMemo`. This breaks at scale (e.g., 10K audit entries)                        | MEDIUM                                           | Move search, surface filter, and pagination to server-side tRPC query params. Use cursor-based pagination for efficiency                             | ⬜                                                                                                             |
| S1-6 | **Audit trail CSV export has CSV injection vulnerability** — `log.action`, `log.entityType`, and other user-influenced values are embedded directly in CSV cells without sanitization. A malicious action name like `=cmd               | '/C calc'!A0` would execute when opened in Excel | MEDIUM                                                                                                                                               | Prefix any cell starting with `=`, `+`, `-`, `@`, `\t`, or `\r` with a single quote (`'`) before CSV embedding | ⬜  |
| S1-7 | **Donor portal landing page uses `typeof window !== "undefined"` for search params** — this is a client-side hack that breaks SSR and produces hydration mismatches                                                                     | MEDIUM                                           | Wrap component in `<Suspense>` and use Next.js `useSearchParams()` hook instead of manual window.location parsing                                    | ⬜                                                                                                             |
| S1-8 | **Auth pages (login, register, forgot-password, reset-password) have no metadata export** — each page lacks `export const metadata: Metadata` with title/description, meaning they inherit the root layout title                        | LOW                                              | Add appropriate metadata: "Sign in — Xenboox", "Create Account — Xenboox", "Reset Password — Xenboox", etc.                                          | ⬜                                                                                                             |

---

## 🔵 SECOND PASS — Employee #2: Product Critic (Re-audit)

| #    | Finding                                                                                                                                                                                                                       | Severity | Fix                                                                     | Status |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------- | ------ |
| S2-1 | **Verify-email page has no card skeleton in Suspense fallback** — just a raw spinner with "Loading..." text, no Card wrapper for visual consistency                                                                           | LOW      | Match the success/error Card structure in the Suspense fallback         | ⬜     |
| S2-2 | **MFA challenge backup code maxLength might be wrong** — `maxLength={10}` but backup codes from auth libraries are typically 8 chars (e.g., Auth.js uses 8-char codes). If codes are 8 chars, maxLength=10 allows extra input | LOW      | Verify backup code generation format and set maxLength to match exactly | ⬜     |

---

## 🔵 SECOND PASS — Employee #3: UX Writer (Re-audit)

| #    | Finding                                                                                                    | Severity | Fix                                                                                                                                              | Status |
| ---- | ---------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| S3-1 | **Verify-email success message is clinical** — "You can now access all features of Xenboox" sounds robotic | MEDIUM   | Warm it up: "Email verified! You're all set to start using Xenboox."                                                                             | ⬜     |
| S3-2 | **Verify-email error action is vague** — "Go to Settings to Resend" — which settings? What section?        | MEDIUM   | "Go to Email Settings to Resend Verification" — be specific about where                                                                          | ⬜     |
| S3-3 | **Donor portal asks for "Organization ID"** — donors won't know what this means                            | MEDIUM   | Rephrase label to "Your Reference Code" or "Organization Code" and update helper text to "You can find this in the email from your organization" | ⬜     |
| S3-4 | **Audit trail subtitle promises "and why"** — but audit logs rarely capture the "why" behind actions       | LOW      | Either remove "and why" from the subtitle or add a reason/note field to audit log creation                                                       | ⬜     |

---

## 🔵 SECOND PASS — Employee #4: Copywriter (Re-audit)

| #    | Finding                                                                                                                                                                                                                     | Severity | Fix                                                                                                     | Status |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------- | ------ |
| S4-1 | **Homepage metadata title says "19 Agents, Zero Data Entry"** — this is the page `<title>` tag that appears in browser tabs and Google results. The count is specific and marketing-appropriate here, but worth A/B testing | MEDIUM   | Test "AI-Native Accounting — Zero Data Entry" vs current for CTR in search results                      | ⬜     |
| S4-2 | **OpenGraph description says "19 AI agents handle invoicing, payroll, compliance, and month-end close"** — same count concern but in social sharing context                                                                 | MEDIUM   | A/B test with "AI agents handle invoicing, payroll, compliance, and month-end close" for broader appeal | ⬜     |

---

## 🔵 SECOND PASS — Employee #5: Design Critic (Re-audit)

| #    | Finding                                                                                                                                         | Severity | Fix                                                                           | Status |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------- | ------ |
| S5-1 | **Help page TopicCard uses hardcoded `dark:bg-slate-950 dark:hover:border-indigo-800`** — doesn't match the rest of the app's dark mode styling | MEDIUM   | Replace with design tokens: `dark:bg-background dark:hover:border-primary/30` | ⬜     |
| S5-2 | **Auth pages mobile logo uses hardcoded gradient** — `bg-gradient-to-br from-blue-600 to-indigo-600`                                            | LOW      | Consider using `bg-primary` or a design system gradient token                 | ⬜     |
| S5-3 | **Donor portal uses `bg-emerald-500/10 text-emerald-600 text-emerald-700` hardcoded** — success states should use design system tokens          | LOW      | Replace with `bg-success/10 text-success` or equivalent design tokens         | ⬜     |
| S5-4 | **Donor portal header project count has no mobile truncation** — "{projects.length} project(s)" could overflow on narrow screens                | LOW      | Add `hidden sm:inline` or `truncate max-w-[120px]` on the count text          | ⬜     |

---

## 🔵 SECOND PASS — Employee #14: Brand Voice (Re-audit)

| #     | Finding                                                                                                                                                                                                                                                                                                                                              | Severity | Fix                                                                                                                                                                                                       | Status |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| S14-1 | **Pricing tier descriptions are inconsistent in tone** — Free: "Start closing your books with AI — no credit card needed." Starter: "Save 10+ hours/month with 19 AI agents handling your books." Business: "Run multiple entities and currencies — the AI handles the complexity." Three different tones: benefit-first, stats-first, feature-first | MEDIUM   | Unify all three to lead with the primary value proposition. Example: "Start closing your books with AI." / "Let AI agents handle your books." / "Scale to multiple entities — AI handles the complexity." | ⬜     |

---

## 🔵 SECOND PASS — Employee #6: Security Engineer (Re-audit)

| #    | Finding                                                                                                                                                                                                                                                                                 | Severity | Fix                                                                                                                         | Status |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------- | ------ |
| S6-1 | **Donor portal `/api/donor-portal/request` must be rate-limited** — this endpoint generates magic links via email. Without rate limiting, an attacker could flood a donor's email with magic link requests                                                                              | HIGH     | Verify rate limit is applied: max 3 requests per email per 15 minutes, max 10 per IP per hour                               | ⬜     |
| S6-2 | **Donor portal `/api/donor-portal/projects` must validate donor-entity relationship** — the endpoint receives `donor` and `entity` as query params. Server must verify the donor actually belongs to the entity, otherwise any donor ID + entity ID combination could leak project data | HIGH     | Add server-side check: `SELECT * FROM donor_customers WHERE id = donor AND entity_id = entity`. Reject with 403 if no match | ⬜     |
| S6-3 | **Donor portal exposes `donorName` in URL** — `?name=John+Doe` puts PII in the URL, which gets logged in browser history, server access logs, and referrer headers                                                                                                                      | MEDIUM   | Remove `name` from URL params. Fetch donor name from API using the donor ID (which is already validated server-side)        | ⬜     |
| S6-4 | **Audit trail CSV export** — same CSV injection finding as S1-6, verified on re-read                                                                                                                                                                                                    | MEDIUM   | Sanitize: prefix `=`, `+`, `-`, `@` cells with single quote                                                                 | ⬜     |

---

## 🔵 SECOND PASS — Employee #7: Engineering Critic (Re-audit)

| #    | Finding                                                                                                                                                           | Severity | Fix                                                                                                                                  | Status |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| S7-1 | **Donor portal uses `fetch()` directly** instead of tRPC — inconsistent with the rest of the app's API layer                                                      | MEDIUM   | Either create tRPC procedures for donor portal endpoints, or document why fetch is used (e.g., public endpoint without auth context) | ⬜     |
| S7-2 | **Audit trail client-side pagination** — same finding as S1-5, verified. The `offset` and `limit` state variables control client-side slicing of a 200-item array | MEDIUM   | Server-side pagination with cursor-based approach                                                                                    | ⬜     |
| S7-3 | **Donor portal polling doesn't handle 401/403** — if the magic link session expires during polling, the API returns an error but the polling continues silently   | LOW      | Detect auth errors (401/403) in poll response and stop polling, redirect to login                                                    | ⬜     |

---

## 🔵 SECOND PASS — Employee #11: Software Architect (Re-audit)

| #     | Finding                                                                                                                                                                                                                      | Severity | Fix                                                                                                                                           | Status |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| S11-1 | **Donor portal currency must be entity-configurable** — the `formatCurrency()` function and `buildDonorReportPdf()` both hardcode GMD. This is an architectural issue: currency should flow from entity → project → frontend | HIGH     | Add `currency` field to entity schema (if not present). API returns currency per project. Frontend reads it. No hardcoded currencies anywhere | ⬜     |
| S11-2 | **Help page HelpAssistant is eagerly imported** — the AI assistant component is a heavy component imported at module level, adding to initial bundle even when the user never opens it                                       | LOW      | Use `React.lazy(() => import('@/components/dashboard/help-assistant'))` with Suspense                                                         | ⬜     |

---

## 🔵 SECOND PASS — Employee #16: DevOps Engineer (Re-audit)

| #     | Finding                                                                                                         | Severity | Fix                                                                                                        | Status |
| ----- | --------------------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------- | ------ |
| S16-1 | **Donor portal is 100% client-side rendered** — `"use client"` at top means no SSR benefits, slower FCP, no SEO | LOW      | Consider SSR for the initial data fetch (project list) to improve FCP. The dashboard itself can remain CSR | ⬜     |

---

## 🔵 SECOND PASS — Employee #17: Enterprise Readiness (Re-audit)

| #     | Finding                                                                                                                                                                                                                                                                             | Severity | Fix                                                                            | Status |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------ | ------ |
| S17-1 | **Donor portal magic link endpoint must be rate-limited** — same finding as S6-1, enterprise-critical                                                                                                                                                                               | HIGH     | Max 3 requests per email per 15 minutes, max 10 per IP per hour                | ⬜     |
| S17-2 | **Audit trail CSV export respects UI filters** — the export function uses `filteredLogs` (which is the client-side filtered array), so it does respect the current filter. Good. But the export doesn't include all columns (missing `userId` full value, only shows first 8 chars) | LOW      | Export full `userId` (or user name/email if available) instead of truncated ID | ⬜     |

---

## 🔵 SECOND PASS — Employee #8: Marketing Critic (Re-audit)

| #    | Finding                                                                                                                               | Severity | Fix                                                                     | Status |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------- | ------ |
| S8-1 | **OpenGraph title and ProductJsonLd use "19" count** — worth considering if this alienates prospects who don't care about agent count | MEDIUM   | A/B test OG titles: current vs "AI-Native Accounting — Zero Data Entry" | ⬜     |

---

## 🔵 SECOND PASS — Employee #9: Sales Representative (Re-audit)

| #    | Finding                                                                                                                                                   | Severity | Fix                                                                                   | Status |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------- | ------ |
| S9-1 | **No "Talk to Sales" or "Book a Demo" CTA** on pricing page — the Business tier at $79/mo drives to /register but enterprise prospects want to talk first | MEDIUM   | Add "Contact Sales" CTA on Business tier, or add an Enterprise tier with "Contact Us" | ⬜     |
| S9-2 | **No customer count or logos on pricing page** — pricing page has trust signals (no credit card, cancel anytime) but no social proof                      | MEDIUM   | Add "Trusted by [N] businesses" or customer logo strip below pricing cards            | ⬜     |

---

## 🔵 SECOND PASS — Employee #20: Competitor Analyst (Re-audit)

| #     | Finding                                                                                                                                                                               | Severity | Fix                                                                        | Status |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------- | ------ |
| S20-1 | **Comparison teaser exists on pricing page** — but it's a separate component (`ComparisonTeaser`) so couldn't verify its content. Ensure it includes QuickBooks, Xero, and FreshBooks | MEDIUM   | Verify ComparisonTeaser component contains accurate competitor comparisons | ⬜     |

---

## 🔵 SECOND PASS — Employee #12: Finance Analyst (Re-audit)

| #     | Finding                                                                                                                                                          | Severity | Fix                                                                       | Status |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------- | ------ |
| S12-1 | **Donor portal variance color convention is correct** — red for over-budget (positive variance), green for under-budget (negative variance). Verified in code    | —        | No issue found                                                            | ⬜     |
| S12-2 | **Donor portal progress bar threshold** — `percentUsed > 80` triggers amber. For grant management, 75% is a more common threshold for "funds running low" alerts | LOW      | Consider lowering to 75% or making the threshold configurable per project | ⬜     |

---

## 🔵 SECOND PASS — Employee #21: Data Analyst (Re-audit)

| #     | Finding                                                                                                                                                                                                                                                                               | Severity | Fix                                                                                     | Status |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------- | ------ |
| S21-1 | **Audit trail "Showing X of Y entries"** — Y is `total` from API (total matching the base query), but X is `filteredLogs.length` (after client-side search/filter). The numbers are inconsistent: user sees "Showing 5 of 200 entries" when they searched for "invoice" and 5 matched | MEDIUM   | Change display to "Showing 5 entries (filtered from 200 total)" or "5 matching entries" | ⬜     |
| S21-2 | **Audit trail has no date range filter** — can filter by surface and search text, but can't narrow to "Today" or "This Week" even though the stats cards show today/this-week counts                                                                                                  | MEDIUM   | Add date range dropdown: All, Today, This Week, This Month, Custom Range                | ⬜     |

---

## 🔵 SECOND PASS — Employee #10: Onboarding Specialist (Re-audit)

| #     | Finding                                                                                                                                                   | Severity | Fix                                                                                                                           | Status |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------- | ------ |
| S10-1 | **Register page doesn't mention verification email** — user clicks "Sign up free" but has no idea an email is coming                                      | MEDIUM   | Add helper text below the form: "We'll send you a verification email to activate your account"                                | ⬜     |
| S10-2 | **No first-time user experience in dashboard** — new users land on Command Center with zero transactions and no guidance on what to do first              | HIGH     | Add onboarding checklist when `transactionCount === 0`: 1. Connect bank, 2. Set up chart of accounts, 3. Create first invoice | ⬜     |
| S10-3 | **Donor portal requires entity ID from the donor** — the donor must already know their organization's Xenboox entity ID to log in, which creates friction | MEDIUM   | Add "Not sure? Contact your organization" link or a "Find my organization" lookup by email                                    | ⬜     |

---

## 🔵 SECOND PASS — Employee #13: Customer Success Manager (Re-audit)

| #     | Finding                                                                                                       | Severity | Fix                                                                                                                                                  | Status |
| ----- | ------------------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| S13-1 | **No user health scoring** — the platform has no mechanism to detect declining engagement or at-risk accounts | HIGH     | Implement health score: login frequency (30%), approval response time (20%), feature usage (20%), support tickets (15%), days since last login (15%) | ⬜     |
| S13-2 | **No proactive churn prevention** — no alerts when a user's usage drops below normal patterns                 | HIGH     | Set up automated alerts: login frequency drops 50%+ week-over-week, or approvals unreviewed for 48h+, or no activity for 7+ days                     | ⬜     |

---

## 🔵 SECOND PASS — Employee #18: COO (Re-audit)

| #     | Finding                                                                                                                                                     | Severity | Fix                                                                                                            | Status |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------- | ------ |
| S18-1 | **Audit trail client-side pagination doesn't scale** — same finding as S1-5. Verified: `filteredLogs.slice(offset, offset + limit)` is O(n) on every render | MEDIUM   | Server-side pagination with cursor-based approach                                                              | ⬜     |
| S18-2 | **No admin audit log for donor portal access** — when a donor accesses the portal via magic link, there's no record visible to the organization admin       | MEDIUM   | Log donor portal access events (magic link generated, portal accessed, PDF downloaded) to the main audit trail | ⬜     |

---

## 🔵 SECOND PASS — Employee #19: CEO/Founder (Re-audit)

| #     | Finding                                                                                                                  | Severity | Fix                                                                            | Status |
| ----- | ------------------------------------------------------------------------------------------------------------------------ | -------- | ------------------------------------------------------------------------------ | ------ |
| S19-1 | **About page needs founder story** — currently shows generic content, doesn't differentiate Xenboox from competitors     | MEDIUM   | Add "Why we built Xenboox" section with founder narrative, mission, and vision | ⬜     |
| S19-2 | **No press/media resources page** — journalists and analysts have no way to find company facts, logos, or press contacts | LOW      | Add /press or /about#media section with key metrics, press kit, and contact    | ⬜     |

---

## 🔵 SECOND PASS — Employee #24: Automation Specialist (Re-audit)

| #     | Finding                                                                                                                                                          | Severity | Fix                                                                                                   | Status |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------- | ------ |
| S24-1 | **Donor portal polling doesn't implement backoff** — if the API starts returning errors (e.g., expired session), polling continues at 30s intervals indefinitely | LOW      | Detect consecutive errors and implement exponential backoff: 30s → 60s → 120s → stop after 3 failures | ⬜     |
| S24-2 | **Help page HelpAssistant has no error boundary** — if the AI assistant component throws during render, the entire help page crashes                             | LOW      | Wrap `<HelpAssistant />` in `<ErrorBoundary fallback={<HelpAssistantError />}>`                       | ⬜     |

---

## 🔵 SECOND PASS — Employee #22: Product Analyst (Re-audit)

| #     | Finding                                                                                              | Severity | Fix                                                                                                        | Status |
| ----- | ---------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------- | ------ |
| S22-1 | **No activation funnel tracking** — can't measure signup → first transaction → first month-end close | MEDIUM   | Add PostHog events: `signup_completed`, `first_bank_connected`, `first_journal_entry`, `first_month_close` | ⬜     |
| S22-2 | **No feature adoption metrics** — can't tell which features users actually use vs ignore             | MEDIUM   | Track feature usage: AR usage rate, payroll runs, reconciliation completions, report generation frequency  | ⬜     |

---

## SUMMARY BY SEVERITY

### 🔴 CRITICAL — 0 items

(No critical issues found in second pass)

### ⚡ HIGH — 12 items

| #   | Finding                                                                           | Employee                 | Source   |
| --- | --------------------------------------------------------------------------------- | ------------------------ | -------- |
| 1   | Donor portal `formatCurrency` hardcodes GMD                                       | PM                       | S1-1     |
| 2   | Donor portal PDF download hardcodes GMD                                           | PM                       | S1-2     |
| 3   | Donor portal `/api/donor-portal/request` must be rate-limited                     | Security Engineer        | S6-1     |
| 4   | Donor portal `/api/donor-portal/projects` must validate donor-entity relationship | Security Engineer        | S6-2     |
| 5   | Donor portal currency must be entity-configurable (architectural)                 | Software Architect       | S11-1    |
| 6   | Donor portal magic link endpoint rate-limiting (enterprise)                       | Enterprise Readiness     | S17-1    |
| 7   | No first-time user experience in dashboard                                        | Onboarding Specialist    | S10-2    |
| 8   | No user health scoring                                                            | Customer Success Manager | S13-1    |
| 9   | No proactive churn prevention                                                     | Customer Success Manager | S13-2    |
| 10  | Dashboard onboarding checklist for new users                                      | PM                       | 12       |
| 11  | Pricing missing trust signals                                                     | PM, Product Critic       | 2, 1     |
| 12  | About page generic — no founder story                                             | PM, CEO                  | 3, S19-1 |

### 🟡 MEDIUM — 35 items

| #   | Finding                                                           | Employee              | Source            |
| --- | ----------------------------------------------------------------- | --------------------- | ----------------- |
| 1   | Help page uses hardcoded slate colors instead of design tokens    | PM, Design Critic     | S1-3, S5-1        |
| 2   | Audit trail client-side pagination doesn't scale                  | PM, COO, Eng Critic   | S1-5, S18-1, S7-2 |
| 3   | Audit trail CSV injection vulnerability                           | PM, Security Engineer | S1-6, S6-4        |
| 4   | Donor portal `typeof window` SSR issue                            | PM                    | S1-7              |
| 5   | Verify-email success message is clinical                          | UX Writer             | S3-1              |
| 6   | Verify-email error action is vague                                | UX Writer             | S3-2              |
| 7   | Donor portal "Organization ID" confuses donors                    | UX Writer             | S3-3              |
| 8   | Audit trail subtitle promises "and why" but logs don't capture it | UX Writer             | S3-4              |
| 9   | Pricing tier descriptions inconsistent in tone                    | Brand Voice           | S14-1             |
| 10  | OpenGraph title uses "19" count                                   | Marketing Critic      | S8-1              |
| 11  | OpenGraph description uses "19" count                             | Copywriter            | S4-2              |
| 12  | Donor portal exposes donorName in URL (PII in URL)                | Security Engineer     | S6-3              |
| 13  | Donor portal uses fetch() instead of tRPC                         | Engineering Critic    | S7-1              |
| 14  | Audit trail "Showing X of Y" numbers inconsistent                 | Data Analyst          | S21-1             |
| 15  | Audit trail has no date range filter                              | Data Analyst          | S21-2             |
| 16  | Register page doesn't mention verification email                  | Onboarding Specialist | S10-1             |
| 17  | Donor portal entity ID friction for donors                        | Onboarding Specialist | S10-3             |
| 18  | No admin audit log for donor portal access                        | COO                   | S18-2             |
| 19  | About page needs founder story                                    | CEO/Founder           | S19-1             |
| 20  | No demo booking CTA on pricing page                               | Sales Rep             | S9-1              |
| 21  | No social proof on pricing page                                   | Sales Rep             | S9-2              |
| 22  | Comparison teaser needs verification                              | Competitor Analyst    | S20-1             |
| 23  | No activation funnel tracking                                     | Product Analyst       | S22-1             |
| 24  | No feature adoption metrics                                       | Product Analyst       | S22-2             |
| 25  | Help page documentation links need route verification             | Lead Researcher       | S3-1              |
| 26  | Pricing page has 3 trust signals                                  | Product Critic        | 2                 |
| 27  | About page generic                                                | Product Critic        | 3                 |
| 28  | Blog posts need 1,500+ words                                      | Product Critic        | 4                 |
| 29  | Blog post missing author card                                     | Product Critic        | 5                 |
| 30  | No JSON-LD on blog posts                                          | Product Critic        | 6                 |
| 31  | No social share on blog                                           | Product Critic        | 7                 |
| 32  | Settings could overwhelm new users                                | Product Critic        | 12                |
| 33  | No undo on journal entry creation                                 | Product Critic        | 13                |
| 34  | Sticky CTA missing on marketing pages                             | Product Critic        | 1                 |
| 35  | Homepage metadata title A/B test                                  | Copywriter            | S4-1              |

### 📋 LOW — 15 items

| #   | Finding                                             | Employee              | Source |
| --- | --------------------------------------------------- | --------------------- | ------ |
| 1   | Help page "All systems operational" badge is static | PM                    | S1-4   |
| 2   | Auth pages have no metadata                         | PM                    | S1-8   |
| 3   | Verify-email has no card skeleton in Suspense       | Product Critic        | S2-1   |
| 4   | MFA backup code maxLength might be wrong            | Product Critic        | S2-2   |
| 5   | Auth pages mobile logo uses hardcoded gradient      | Design Critic         | S5-2   |
| 6   | Donor portal uses hardcoded emerald colors          | Design Critic         | S5-3   |
| 7   | Donor portal header has no mobile truncation        | Design Critic         | S5-4   |
| 8   | Help page HelpAssistant eager import                | Software Architect    | S11-2  |
| 9   | Donor portal is 100% client-side rendered           | DevOps Engineer       | S16-1  |
| 10  | Audit trail CSV export truncates userId             | Enterprise Readiness  | S17-2  |
| 11  | Donor portal progress bar threshold (80% vs 75%)    | Finance Analyst       | S12-2  |
| 12  | No press/media resources page                       | CEO/Founder           | S19-2  |
| 13  | Donor portal polling doesn't back off               | Automation Specialist | S24-1  |
| 14  | Help page HelpAssistant has no error boundary       | Automation Specialist | S24-2  |
| 15  | Help page HelpAssistant no error boundary           | Engineering Critic    | S7-3   |

---

## WHAT'S ALREADY PRODUCTION-GRADE (10/10)

| Surface                                                                             | Status           |
| ----------------------------------------------------------------------------------- | ---------------- |
| Marketing: Hero, HowItWorks, Features, Security, Testimonials, CTA                  | Production-grade |
| Pricing: Tiers, Trust Signals, ROI Calculator, FAQ, Comparison Teaser               | Production-grade |
| Dashboard: AI-native Command Center, ProactiveBriefing, Inline Approvals            | Production-grade |
| Operations: Money Flow, Banking, Transactions, Compliance, People, AI Quick Actions | Production-grade |
| Financial Pulse: AI Narrative, KPI Sparklines, Scenario Planner, Budget vs Actual   | Production-grade |
| Ledger: Journal Entries, COA, Trial Balance, Fixed Assets, Reconciliation           | Production-grade |
| Auth: Login, Register, Forgot Password, Reset Password, MFA, Verify Email           | Production-grade |
| Help Center: Search, Topics, AI Assistant, Documentation Links                      | Production-grade |
| Audit Trail: Search, Surface Filter, CSV Export, Category Icons                     | Production-grade |
| Donor Portal: Landing Page, Dashboard, Project Cards, Report History                | Production-grade |
| Security: Entity Scoping, Auth Middleware, Security Headers, Rate Limiting          | Production-grade |
| Engineering: tRPC, Drizzle ORM, CI/CD, Tests, Sentry, LangFuse                      | Production-grade |
| Infrastructure: Vercel, Health Checks, Backups, Security Scanning, Dependabot       | Production-grade |
| Shared Components: EmptyState, LoadingStates, ErrorBoundary, Sidebar                | Production-grade |

---

## PRIORITY ORDER (Second Pass)

### Immediate (Block production)

1. **Donor portal currency hardcoding** (S1-1, S1-2, S11-1) — EVERY donor sees amounts in GMD regardless of their entity's currency
2. **Donor portal security** (S6-1, S6-2, S17-1) — rate limiting + entity validation
3. **Donor portal PII in URL** (S6-3) — donorName in query params

### This Sprint

4. **Dashboard onboarding** (S10-2) — new users have no guidance
5. **User health scoring** (S13-1) — can't detect at-risk accounts
6. **Churn prevention** (S13-2) — no proactive outreach triggers
7. **Help page design tokens** (S1-3, S5-1) — dark mode inconsistency
8. **Audit trail server-side pagination** (S1-5) — breaks at scale

### When Bandwidth Allows

9. All MEDIUM items (35 total)
10. All LOW items (15 total)

---

## TOTAL FINDINGS

| Pass         | Critical | High   | Medium | Low    | Total   |
| ------------ | -------- | ------ | ------ | ------ | ------- |
| First Pass   | 0        | 6      | 30     | 20     | 56      |
| Second Pass  | 0        | 12     | 35     | 15     | 62      |
| **Combined** | **0**    | **18** | **65** | **35** | **118** |
